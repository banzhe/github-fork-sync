/** GitHub API 的 HTTP / GraphQL 请求. 模块内部使用, 不从 index 导出. */

const API_URL = 'https://api.github.com'

export type GitHubErrorKind =
  /** 不是 fine-grained token. */
  | 'invalid_token'
  /** token 无效、过期或权限不足 (401 / 403). */
  | 'unauthorized'
  | 'request_failed'

/** GitHub 相关的错误. message 可以直接展示给用户. */
export class GitHubError extends Error {
  readonly kind: GitHubErrorKind

  constructor(kind: GitHubErrorKind, message: string) {
    super(message)
    this.name = 'GitHubError'
    this.kind = kind
  }
}

const PERMISSION_HINT =
  'Check that the token has not expired and has the Contents and Workflows permissions.'

/** 把非 2xx 响应转成 GitHubError. 409 等需要调用方特殊处理的状态码由调用方先判断. */
export function toError(status: number, message: string) {
  if (status === 401 || status === 403) {
    return new GitHubError('unauthorized', `${message.replace(/\.?$/, '.')} ${PERMISSION_HINT}`)
  }
  return new GitHubError('request_failed', message)
}

type HttpResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string }

/** 发送 REST 请求, 不抛出 HTTP 错误, 由调用方决定如何处理状态码. */
export async function send<T>(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<HttpResult<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'github-fork-sync',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const error: { message?: string } = await res.json().catch(() => ({}))
    return { ok: false, status: res.status, message: error.message ?? res.statusText }
  }
  const data: T = await res.json()
  return { ok: true, data }
}

/** 发送 REST 请求, 非 2xx 时抛出 GitHubError. */
export async function request<T>(token: string, method: string, path: string, body?: unknown) {
  const res = await send<T>(token, method, path, body)
  if (!res.ok) throw toError(res.status, res.message)
  return res.data
}

type GraphQLResponse<T> = { data?: T | null; errors?: { message: string }[] }

/** 部分节点出错 (例如仓库不存在) 时 GraphQL 仍会返回 data, 只有拿不到 data 时才抛错. */
export async function graphql<T>(token: string, query: string, variables: Record<string, unknown>) {
  const res = await request<GraphQLResponse<T>>(token, 'POST', '/graphql', { query, variables })
  if (!res.data) {
    throw new GitHubError('request_failed', res.errors?.[0]?.message ?? 'GraphQL request failed')
  }
  return res.data
}

/** 分支名可能含 `/`, 保留它, 其余字符按 URL 编码. */
export const encodeRef = (ref: string) => encodeURIComponent(ref).replaceAll('%2F', '/')
