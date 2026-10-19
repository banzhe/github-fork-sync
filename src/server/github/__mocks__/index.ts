/**
 * `~/server/github` 的 mock. 测试文件里 `vi.mock('~/server/github')` 后自动使用这个文件.
 *
 * - `github` 是假的 GitHubClient, 每个方法都是 vi.fn, 用例里设置返回值并断言调用.
 * - `githubCredentials.client()` 默认返回 `github`; 调用 `setGitHubConnected(false)` 模拟未配置 token.
 * - 每个用例前调用 `resetGitHubMock()` 恢复默认状态.
 */

import { vi } from 'vite-plus/test'

import type { GitHubClient } from '../client'

export { GitHubError } from '../http'
export type { BranchHeads, ForkCandidate, GitHubClient } from '../client'

export const github = {
  getViewer: vi.fn<GitHubClient['getViewer']>(),
  listForks: vi.fn<GitHubClient['listForks']>(),
  getBranchHeads: vi.fn<GitHubClient['getBranchHeads']>(),
  compareWithUpstream: vi.fn<GitHubClient['compareWithUpstream']>(),
  mergeUpstream: vi.fn<GitHubClient['mergeUpstream']>(),
  resetBranch: vi.fn<GitHubClient['resetBranch']>(),
}

let connected = true
/**
 * 和真实模块一样, token 不变时 client() 返回同一个实例. 实例共享 `github` 上的 vi.fn,
 * 换 token (`changeGitHubToken()` 或 `resetGitHubMock()`) 后是新实例, 按客户端的缓存随之失效.
 */
let client = { ...github }

export const githubCredentials = {
  account: vi.fn(() => (connected ? { login: 'octocat' } : null)),
  client: vi.fn(() => (connected ? (client as unknown as GitHubClient) : null)),
}

export function setGitHubConnected(value: boolean) {
  connected = value
}

export function changeGitHubToken() {
  client = { ...github }
}

export function resetGitHubMock() {
  connected = true
  changeGitHubToken()
  for (const fn of Object.values(github)) fn.mockReset()
  for (const fn of Object.values(githubCredentials)) fn.mockClear()
}
