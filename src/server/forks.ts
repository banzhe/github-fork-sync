import { createServerFn } from '@tanstack/solid-start'

import { forksRepo, type ForkKey } from '~/db/repositories'
import { ok } from '~/lib/response'

import { authMiddleware } from './auth'
import { checkForks as runChecks, discardForkCommits, listForkCandidates } from './sync'

export const listForks = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(() => ok(forksRepo.list()))

/** token 能访问到的所有 fork, 用于选择要同步的仓库. */
export const getForkCandidates = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(() => listForkCandidates())

const isString = (value: unknown): value is string => typeof value === 'string' && value !== ''

export const saveForkSelection = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((data: { forks: ForkKey[] }) => {
    if (!Array.isArray(data?.forks)) throw new Error('Invalid input')
    const forks = data.forks.map((fork) => {
      if (![fork?.owner, fork?.repo, fork?.branch, fork?.upstream].every(isString)) {
        throw new Error('Invalid input')
      }
      return { owner: fork.owner, repo: fork.repo, branch: fork.branch, upstream: fork.upstream }
    })
    return { forks }
  })
  .handler(({ data }) => {
    forksRepo.replaceSelection(data.forks)
    return ok()
  })

/** 检测并同步 fork. 不传 ids 时处理所有已选的 fork. */
export const checkForks = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((data: { ids?: number[] }) => {
    const ids = data?.ids
    if (ids !== undefined && !(Array.isArray(ids) && ids.every(Number.isInteger))) {
      throw new Error('Invalid input')
    }
    return { ids }
  })
  .handler(({ data }) => runChecks(data.ids))

/** 冲突时的处理方式之一: 丢弃 fork 独有的提交, 让分支与上游一致. */
export const discardFork = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((data: { id: number }) => {
    if (!Number.isInteger(data?.id)) throw new Error('Invalid input')
    return { id: data.id }
  })
  .handler(({ data }) => discardForkCommits(data.id))
