import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { forksRepo } from '~/db/repositories'
import type { BranchHeads } from '~/server/github'
import {
  changeGitHubToken,
  github,
  GitHubError,
  resetGitHubMock,
  setGitHubConnected,
} from '~/server/github/__mocks__'

import { checkForks, discardForkCommits, FORK_CANDIDATES_TTL, listForkCandidates } from './sync'

vi.mock('~/server/github')

const FORK_SHA = 'f'.repeat(40)
const UPSTREAM_SHA = 'u'.repeat(40)

/** 选中一个 fork 并返回数据库中的记录. */
function addFork(repo = 'demo', branch = 'main') {
  forksRepo.replaceSelection([
    ...forksRepo.list(),
    { owner: 'octocat', repo, branch, upstream: `upstream/${repo}` },
  ])
  return forksRepo.list().find((fork) => fork.repo === repo)!
}

function heads(overrides: Partial<BranchHeads> = {}): BranchHeads {
  return {
    fork: FORK_SHA,
    upstreamRepo: 'upstream/demo',
    upstreamBranch: 'main',
    upstream: UPSTREAM_SHA,
    ...overrides,
  }
}

beforeEach(() => {
  resetGitHubMock()
})

describe('without a GitHub token', () => {
  beforeEach(() => setGitHubConnected(false))

  it('reports the missing token instead of calling GitHub', async () => {
    const fork = addFork()

    for (const result of [
      await listForkCandidates(),
      await checkForks(),
      await discardForkCommits(fork.id),
    ]) {
      expect(result).toEqual({
        ok: false,
        error: { code: 'GITHUB_TOKEN_MISSING', message: expect.any(String) },
      })
    }
    expect(github.getBranchHeads).not.toHaveBeenCalled()
  })
})

describe('listForkCandidates', () => {
  const candidates = [
    {
      owner: 'octocat',
      repo: 'demo',
      defaultBranch: 'main',
      upstream: 'up/demo',
      private: false,
    },
  ]

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the forks the token can see', async () => {
    github.listForks.mockResolvedValue(candidates)

    expect(await listForkCandidates()).toEqual({ ok: true, data: candidates })
  })

  it('reuses the list for 10 minutes, then asks GitHub again', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    github.listForks.mockResolvedValue(candidates)

    await listForkCandidates()
    vi.advanceTimersByTime(FORK_CANDIDATES_TTL - 1)
    expect(await listForkCandidates()).toEqual({ ok: true, data: candidates })
    expect(github.listForks).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    await listForkCandidates()
    expect(github.listForks).toHaveBeenCalledTimes(2)
  })

  it('does not cache errors', async () => {
    github.listForks.mockRejectedValueOnce(new GitHubError('request_failed', 'Server error'))
    github.listForks.mockResolvedValueOnce(candidates)

    expect(await listForkCandidates()).toMatchObject({ ok: false })
    expect(await listForkCandidates()).toEqual({ ok: true, data: candidates })
    expect(github.listForks).toHaveBeenCalledTimes(2)
  })

  it('asks GitHub again after the token changes', async () => {
    github.listForks.mockResolvedValue(candidates)

    await listForkCandidates()
    changeGitHubToken()
    await listForkCandidates()

    expect(github.listForks).toHaveBeenCalledTimes(2)
  })

  it('turns GitHub errors into GITHUB_ERROR', async () => {
    github.listForks.mockRejectedValue(new GitHubError('unauthorized', 'Bad credentials.'))

    expect(await listForkCandidates()).toEqual({
      ok: false,
      error: { code: 'GITHUB_ERROR', message: 'Bad credentials.' },
    })
  })
})

describe('checkForks', () => {
  it('marks a fork up to date when both heads match, without comparing', async () => {
    const fork = addFork()
    github.getBranchHeads.mockResolvedValue([heads({ upstream: FORK_SHA })])

    const result = await checkForks()

    expect(result).toMatchObject({ ok: true, data: { up_to_date: 1, synced: 0 } })
    expect(github.compareWithUpstream).not.toHaveBeenCalled()
    expect(github.mergeUpstream).not.toHaveBeenCalled()
    expect(forksRepo.find(fork.id)).toMatchObject({
      status: 'up_to_date',
      aheadBy: 0,
      behindBy: 0,
      upstreamBranch: 'main',
      lastError: null,
      lastCheckedAt: expect.any(Date),
    })
  })

  it('does not sync a fork that is only ahead of upstream', async () => {
    const fork = addFork()
    github.getBranchHeads.mockResolvedValue([heads()])
    github.compareWithUpstream.mockResolvedValue({ aheadBy: 2, behindBy: 0 })

    const result = await checkForks()

    expect(result).toMatchObject({ ok: true, data: { up_to_date: 1 } })
    expect(github.mergeUpstream).not.toHaveBeenCalled()
    expect(forksRepo.find(fork.id)).toMatchObject({ status: 'up_to_date', aheadBy: 2 })
  })

  it('fast-forwards a fork that is behind upstream', async () => {
    const fork = addFork()
    github.getBranchHeads.mockResolvedValue([heads()])
    github.compareWithUpstream.mockResolvedValue({ aheadBy: 0, behindBy: 5 })
    github.mergeUpstream.mockResolvedValue({ type: 'fast-forward' })

    const result = await checkForks()

    expect(result).toMatchObject({ ok: true, data: { synced: 1 } })
    expect(github.compareWithUpstream).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'octocat', repo: 'demo', branch: 'main' }),
      { owner: 'upstream', branch: 'main' },
    )
    expect(github.mergeUpstream).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'octocat', repo: 'demo', branch: 'main' }),
    )
    expect(forksRepo.find(fork.id)).toMatchObject({
      status: 'up_to_date',
      aheadBy: 0,
      behindBy: 0,
      lastSyncType: 'fast-forward',
      lastSyncedAt: expect.any(Date),
    })
  })

  it('merges upstream into a diverged fork when there is no conflict', async () => {
    const fork = addFork()
    github.getBranchHeads.mockResolvedValue([heads()])
    github.compareWithUpstream.mockResolvedValue({ aheadBy: 2, behindBy: 3 })
    github.mergeUpstream.mockResolvedValue({ type: 'merge' })

    const result = await checkForks()

    expect(result).toMatchObject({ ok: true, data: { synced: 1 } })
    // 合并提交让 fork 多领先一个提交.
    expect(forksRepo.find(fork.id)).toMatchObject({
      status: 'up_to_date',
      aheadBy: 3,
      behindBy: 0,
      lastSyncType: 'merge',
    })
  })

  it('leaves a conflicting fork for the user to resolve', async () => {
    const fork = addFork()
    github.getBranchHeads.mockResolvedValue([heads()])
    github.compareWithUpstream.mockResolvedValue({ aheadBy: 2, behindBy: 3 })
    github.mergeUpstream.mockResolvedValue({ type: 'conflict' })

    const result = await checkForks()

    expect(result).toMatchObject({ ok: true, data: { conflict: 1, synced: 0 } })
    expect(github.resetBranch).not.toHaveBeenCalled()
    expect(forksRepo.find(fork.id)).toMatchObject({
      status: 'conflict',
      aheadBy: 2,
      behindBy: 3,
      lastSyncType: null,
      lastSyncedAt: null,
    })
  })

  it('compares with the upstream default branch when upstream has no branch of the same name', async () => {
    const fork = addFork('renamed', 'master')
    github.getBranchHeads.mockResolvedValue([
      heads({ upstreamRepo: 'upstream/renamed', upstreamBranch: 'main' }),
    ])
    github.compareWithUpstream.mockResolvedValue({ aheadBy: 0, behindBy: 1 })
    github.mergeUpstream.mockResolvedValue({ type: 'fast-forward' })

    await checkForks()

    expect(github.compareWithUpstream).toHaveBeenCalledWith(
      expect.objectContaining({ branch: 'master' }),
      { owner: 'upstream', branch: 'main' },
    )
    expect(forksRepo.find(fork.id)).toMatchObject({ branch: 'master', upstreamBranch: 'main' })
  })

  it('records per-fork errors and keeps checking the other forks', async () => {
    const missing = addFork('missing')
    const noBranch = addFork('no-branch')
    const failing = addFork('failing')
    const healthy = addFork('healthy')
    github.getBranchHeads.mockImplementation((targets) =>
      Promise.resolve(
        targets.map((target) => {
          if (target.repo === 'missing') return new Error("Can't access octocat/missing.")
          if (target.repo === 'no-branch') return heads({ fork: null })
          return heads()
        }),
      ),
    )
    github.compareWithUpstream.mockImplementation((fork) =>
      fork.repo === 'failing'
        ? Promise.reject(new GitHubError('request_failed', 'Server error'))
        : Promise.resolve({ aheadBy: 1, behindBy: 0 }),
    )

    const result = await checkForks()

    expect(result).toMatchObject({ ok: true, data: { error: 3, up_to_date: 1 } })
    expect(forksRepo.find(missing.id)).toMatchObject({
      status: 'error',
      lastError: "Can't access octocat/missing.",
    })
    expect(forksRepo.find(noBranch.id)).toMatchObject({
      status: 'error',
      lastError: "Branch main doesn't exist on the fork.",
    })
    expect(forksRepo.find(failing.id)).toMatchObject({ status: 'error', lastError: 'Server error' })
    expect(forksRepo.find(healthy.id)).toMatchObject({ status: 'up_to_date', lastError: null })
  })

  it('marks every fork as failed when the batch request fails', async () => {
    const a = addFork('a')
    const b = addFork('b')
    github.getBranchHeads.mockRejectedValue(new GitHubError('unauthorized', 'Bad credentials.'))

    const result = await checkForks()

    expect(result).toMatchObject({ ok: true, data: { error: 2 } })
    for (const fork of [a, b]) {
      expect(forksRepo.find(fork.id)).toMatchObject({
        status: 'error',
        lastError: 'Bad credentials.',
      })
    }
  })

  it('only checks the given forks', async () => {
    const a = addFork('a')
    addFork('b')
    github.getBranchHeads.mockResolvedValue([heads({ upstream: FORK_SHA })])

    await checkForks([a.id])

    expect(github.getBranchHeads).toHaveBeenCalledWith([expect.objectContaining({ repo: 'a' })])
  })

  it('skips forks that are already being checked', async () => {
    const fork = addFork()
    let release!: () => void
    github.getBranchHeads.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve([heads({ upstream: FORK_SHA })])
        }),
    )

    const first = checkForks([fork.id])
    const second = await checkForks([fork.id])
    release()

    expect(second).toMatchObject({ ok: true, data: { skipped: 1 } })
    expect(await first).toMatchObject({ ok: true, data: { up_to_date: 1 } })
    expect(github.getBranchHeads).toHaveBeenCalledTimes(1)
  })
})

describe('discardForkCommits', () => {
  it('returns NOT_FOUND for an unknown fork', async () => {
    expect(await discardForkCommits(999)).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    })
  })

  it('resets the branch to the upstream head', async () => {
    const fork = addFork()
    forksRepo.update(fork.id, { status: 'conflict', aheadBy: 2, behindBy: 3 })
    github.getBranchHeads.mockResolvedValue([heads()])
    github.resetBranch.mockResolvedValue()

    const result = await discardForkCommits(fork.id)

    expect(result).toEqual({ ok: true, data: null })
    expect(github.resetBranch).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'octocat', repo: 'demo', branch: 'main' }),
      UPSTREAM_SHA,
    )
    expect(forksRepo.find(fork.id)).toMatchObject({
      status: 'up_to_date',
      aheadBy: 0,
      behindBy: 0,
      lastSyncType: 'discard',
      lastSyncedAt: expect.any(Date),
    })
  })

  it('keeps the conflict when GitHub rejects the reset', async () => {
    const fork = addFork()
    forksRepo.update(fork.id, { status: 'conflict', aheadBy: 2, behindBy: 3 })
    github.getBranchHeads.mockResolvedValue([heads()])
    github.resetBranch.mockRejectedValue(
      new GitHubError('unauthorized', 'Resource not accessible.'),
    )

    const result = await discardForkCommits(fork.id)

    expect(result).toEqual({
      ok: false,
      error: { code: 'GITHUB_ERROR', message: 'Resource not accessible.' },
    })
    expect(forksRepo.find(fork.id)).toMatchObject({ status: 'conflict', aheadBy: 2 })
  })
})
