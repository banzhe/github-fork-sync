import { describe, expect, it } from 'vite-plus/test'

import { forksRepo } from './forks'

const fork = (repo: string) => ({
  owner: 'octocat',
  repo,
  branch: 'main',
  upstream: `upstream/${repo}`,
})

describe('forksRepo.replaceSelection', () => {
  it('adds new forks and removes forks that are no longer selected', () => {
    forksRepo.replaceSelection([fork('a'), fork('b')])
    forksRepo.replaceSelection([fork('b'), fork('c')])

    expect(forksRepo.list().map((row) => row.repo)).toEqual(expect.arrayContaining(['b', 'c']))
    expect(forksRepo.list()).toHaveLength(2)
  })

  it('keeps the check state of forks that stay selected', () => {
    forksRepo.replaceSelection([fork('a')])
    const [a] = forksRepo.list()
    forksRepo.update(a.id, { status: 'conflict', aheadBy: 1, behindBy: 2 })

    forksRepo.replaceSelection([fork('a'), fork('b')])

    expect(forksRepo.find(a.id)).toMatchObject({ status: 'conflict', aheadBy: 1, behindBy: 2 })
    expect(forksRepo.list().find((row) => row.repo === 'b')).toMatchObject({
      status: 'unchecked',
    })
  })

  it('clears the selection when given an empty list', () => {
    forksRepo.replaceSelection([fork('a')])
    forksRepo.replaceSelection([])

    expect(forksRepo.list()).toEqual([])
  })
})
