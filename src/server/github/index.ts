/**
 * 所有 GitHub 操作都通过这个模块, 其他代码不直接请求 GitHub API, 也不读写 token.
 * 仅在服务端使用; 前端只能 import 这里的类型.
 */

export { GitHubClient, type BranchHeads, type ForkCandidate } from './client'
export { githubCredentials } from './credentials'
export { GitHubError } from './http'
