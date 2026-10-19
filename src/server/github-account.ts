import { createServerFn } from '@tanstack/solid-start'

import { fail, ok } from '~/lib/response'
import { errorMessage } from '~/lib/utils'

import { authMiddleware } from './auth'
import { GitHubError, githubCredentials } from './github'

/** 已连接的 GitHub 账号, 未配置 token 时为 null. 不会返回 token 本身. */
export const getGitHubAccount = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(() => ok(githubCredentials.account()))

export const saveGitHubToken = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((data: { token: string }) => {
    if (typeof data?.token !== 'string') throw new Error('Invalid input')
    return { token: data.token.trim() }
  })
  .handler(async ({ data }) => {
    try {
      return ok(await githubCredentials.connect(data.token))
    } catch (error) {
      if (error instanceof GitHubError && error.kind === 'invalid_token') {
        return fail('BAD_REQUEST', error.message)
      }
      return fail('GITHUB_ERROR', errorMessage(error))
    }
  })

export const removeGitHubToken = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .handler(() => {
    githubCredentials.disconnect()
    return ok()
  })
