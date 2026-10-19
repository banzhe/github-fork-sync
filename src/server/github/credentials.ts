import { settingsRepo } from '~/db/repositories'

import { GitHubClient } from './client'
import { GitHubError } from './http'

const TOKEN_KEY = 'github_token'
const LOGIN_KEY = 'github_login'

export const FINE_GRAINED_TOKEN_PREFIX = 'github_pat_'

let cached: { token: string; client: GitHubClient } | undefined

/** 保存在 settings 表中的 GitHub token 和对应账号. */
export const githubCredentials = {
  /** 已连接的账号, 未配置 token 时为 null. 不包含 token. */
  account() {
    const login = settingsRepo.get(LOGIN_KEY)
    return login === undefined ? null : { login }
  },

  /**
   * 已保存 token 的客户端, 未配置 token 时为 null.
   * token 不变时返回同一个实例, 所以可以用实例作为按 token 缓存的 key.
   */
  client() {
    const token = settingsRepo.get(TOKEN_KEY)
    if (token === undefined) return null
    if (cached?.token !== token) cached = { token, client: new GitHubClient(token) }
    return cached.client
  },

  /** 校验 token 并保存. 不是 fine-grained token 或 GitHub 拒绝时抛出 GitHubError. */
  async connect(token: string) {
    if (!token.startsWith(FINE_GRAINED_TOKEN_PREFIX)) {
      throw new GitHubError(
        'invalid_token',
        `Only fine-grained personal access tokens are supported. They start with "${FINE_GRAINED_TOKEN_PREFIX}".`,
      )
    }
    let login: string
    try {
      ;({ login } = await new GitHubClient(token).getViewer())
    } catch (error) {
      if (error instanceof GitHubError && error.kind === 'unauthorized') {
        throw new GitHubError('unauthorized', 'GitHub rejected this token. Check that it is valid.')
      }
      throw error
    }
    settingsRepo.set(TOKEN_KEY, token)
    settingsRepo.set(LOGIN_KEY, login)
    return { login }
  },

  disconnect() {
    settingsRepo.delete(TOKEN_KEY)
    settingsRepo.delete(LOGIN_KEY)
  },
}
