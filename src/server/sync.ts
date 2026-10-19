/**
 * fork 的检测与同步, 仅在服务端使用.
 *
 * 检测流程:
 * 1. GraphQL 批量取 fork 分支和上游同名分支的 head SHA, SHA 相同说明已是最新.
 * 2. SHA 不同时用 REST compare 取 ahead/behind.
 * 3. 落后上游时调用 merge-upstream 同步. 有冲突时不处理, 标记为 conflict 等用户选择.
 *
 * GitHub 请求都通过 `./github` 模块, 测试时 mock 这个模块即可.
 * 导出的函数返回统一的 ApiResult, server function 直接返回它们的结果.
 */

import { forksRepo } from '~/db/repositories'
import type { Fork } from '~/db/schema'
import { fail, ok } from '~/lib/response'
import { errorMessage } from '~/lib/utils'

import {
  githubCredentials,
  type BranchHeads,
  type ForkCandidate,
  type GitHubClient,
} from './github'

export type CheckOutcome = 'up_to_date' | 'synced' | 'conflict' | 'error' | 'skipped'
export type CheckSummary = Record<CheckOutcome, number>

const MISSING_TOKEN = 'Add a GitHub token first.'

/** fork 列表缓存时长. 列表请求要几秒, 缓存后再次打开选择对话框不用等. */
export const FORK_CANDIDATES_TTL = 10 * 60 * 1000

/** 按客户端缓存: token 不变时 client() 返回同一个实例, 更换或移除 token 后缓存自然失效. */
let candidatesCache: { github: GitHubClient; expiresAt: number; forks: ForkCandidate[] } | undefined

/** token 能访问到的所有 fork, 用于选择要同步的仓库. 结果缓存 10 分钟, 失败不缓存. */
export async function listForkCandidates() {
  const github = githubCredentials.client()
  if (!github) return fail('GITHUB_TOKEN_MISSING', MISSING_TOKEN)
  if (candidatesCache?.github === github && candidatesCache.expiresAt > Date.now()) {
    return ok(candidatesCache.forks)
  }
  try {
    const forks = await github.listForks()
    candidatesCache = { github, expiresAt: Date.now() + FORK_CANDIDATES_TTL, forks }
    return ok(forks)
  } catch (error) {
    return fail('GITHUB_ERROR', errorMessage(error))
  }
}

/** 检测并同步 fork. 不传 ids 时处理所有已选的 fork. */
export async function checkForks(ids?: number[]) {
  const github = githubCredentials.client()
  if (!github) return fail('GITHUB_TOKEN_MISSING', MISSING_TOKEN)

  const forks = ids ? forksRepo.findMany(ids) : forksRepo.list()
  const outcomes = await runChecks(github, forks)
  const summary: CheckSummary = { up_to_date: 0, synced: 0, conflict: 0, error: 0, skipped: 0 }
  for (const outcome of outcomes.values()) summary[outcome]++
  return ok(summary)
}

/** 冲突时的处理方式之一: 丢弃 fork 独有的提交, 让分支与上游一致. */
export async function discardForkCommits(id: number) {
  const github = githubCredentials.client()
  if (!github) return fail('GITHUB_TOKEN_MISSING', MISSING_TOKEN)
  const fork = forksRepo.find(id)
  if (!fork) return fail('NOT_FOUND', 'Fork not found.')
  if (busy.has(fork.id)) {
    return fail('GITHUB_ERROR', 'This fork is being checked. Try again in a moment.')
  }

  busy.add(fork.id)
  try {
    const [heads] = await github.getBranchHeads([fork])
    if (heads instanceof Error) throw heads
    if (!heads?.upstream) throw new Error(`Can't read the branches of ${fork.upstream}.`)

    await github.resetBranch(fork, heads.upstream)
    const now = new Date()
    forksRepo.update(fork.id, {
      status: 'up_to_date',
      aheadBy: 0,
      behindBy: 0,
      lastError: null,
      lastCheckedAt: now,
      lastSyncType: 'discard',
      lastSyncedAt: now,
    })
    return ok()
  } catch (error) {
    return fail('GITHUB_ERROR', errorMessage(error))
  } finally {
    busy.delete(fork.id)
  }
}

/** 正在检测或同步的 fork, 避免同一个 fork 被并发处理. */
const busy = new Set<number>()

const CONCURRENCY = 4

/** 检测并同步给定的 fork, 返回每个 fork 的结果. */
async function runChecks(github: GitHubClient, forks: Fork[]) {
  const targets = forks.filter((fork) => !busy.has(fork.id))
  const outcomes = new Map<number, CheckOutcome>(forks.map((fork) => [fork.id, 'skipped']))
  if (targets.length === 0) return outcomes
  for (const fork of targets) busy.add(fork.id)

  try {
    // 批量请求失败时每个 fork 都记为这个错误.
    const heads = await github.getBranchHeads(targets).catch((error: unknown) => {
      const failure = error instanceof Error ? error : new Error(errorMessage(error))
      return targets.map(() => failure)
    })

    let next = 0
    const worker = async () => {
      while (next < targets.length) {
        const i = next++
        const fork = targets[i]
        outcomes.set(fork.id, await checkFork(github, fork, heads[i]))
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker))
    return outcomes
  } finally {
    for (const fork of targets) busy.delete(fork.id)
  }
}

async function checkFork(github: GitHubClient, fork: Fork, heads: BranchHeads | Error) {
  const lastCheckedAt = new Date()
  try {
    const { outcome, ...values } = await syncBranch(github, fork, heads)
    forksRepo.update(fork.id, { ...values, lastError: null, lastCheckedAt })
    return outcome
  } catch (error) {
    forksRepo.update(fork.id, { status: 'error', lastError: errorMessage(error), lastCheckedAt })
    return 'error'
  }
}

type ForkValues = Parameters<typeof forksRepo.update>[1]

/** 比较 fork 和上游, 落后时同步. 返回结果和要写入的状态, 出错时抛出. */
async function syncBranch(
  github: GitHubClient,
  fork: Fork,
  heads: BranchHeads | Error,
): Promise<ForkValues & { outcome: CheckOutcome }> {
  if (heads instanceof Error) throw heads
  if (!heads.upstreamRepo) throw new Error(`${fork.owner}/${fork.repo} is no longer a fork.`)
  if (!heads.fork) throw new Error(`Branch ${fork.branch} doesn't exist on the fork.`)
  if (!heads.upstream || !heads.upstreamBranch) {
    throw new Error(`Can't read the branches of ${heads.upstreamRepo}.`)
  }

  const upstream = { upstream: heads.upstreamRepo, upstreamBranch: heads.upstreamBranch }
  // head SHA 相同时不用再请求 compare.
  const { aheadBy, behindBy } =
    heads.fork === heads.upstream
      ? { aheadBy: 0, behindBy: 0 }
      : await github.compareWithUpstream(fork, {
          owner: heads.upstreamRepo.split('/')[0],
          branch: heads.upstreamBranch,
        })
  if (behindBy === 0) {
    return { outcome: 'up_to_date', ...upstream, status: 'up_to_date', aheadBy, behindBy }
  }

  const result = await github.mergeUpstream(fork)
  if (result.type === 'conflict') {
    return { outcome: 'conflict', ...upstream, status: 'conflict', aheadBy, behindBy }
  }
  if (result.type === 'none') {
    return { outcome: 'up_to_date', ...upstream, status: 'up_to_date', aheadBy, behindBy: 0 }
  }
  return {
    outcome: 'synced',
    ...upstream,
    status: 'up_to_date',
    // merge 会在 fork 上多出一个合并提交.
    aheadBy: result.type === 'merge' ? aheadBy + 1 : aheadBy,
    behindBy: 0,
    lastSyncType: result.type,
    lastSyncedAt: new Date(),
  }
}
