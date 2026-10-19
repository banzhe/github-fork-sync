/**
 * server function 统一的返回结构. 前后端共用, 不要在这里引入仅服务端可用的模块.
 *
 * 成功: { ok: true, data }
 * 失败: { ok: false, error: { code, message } }
 */

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'INVALID_PASSWORD'
  | 'NOT_FOUND'
  | 'GITHUB_TOKEN_MISSING'
  | 'GITHUB_ERROR'
  | 'INTERNAL'

export type ApiSuccess<T> = { ok: true; data: T }
export type ApiFailure = { ok: false; error: { code: ApiErrorCode; message: string } }
export type ApiResult<T = null> = ApiSuccess<T> | ApiFailure

export function ok(): ApiSuccess<null>
export function ok<T>(data: T): ApiSuccess<T>
export function ok<T>(data?: T): ApiSuccess<T | null> {
  return { ok: true, data: data ?? null }
}

export function fail(code: ApiErrorCode, message: string): ApiFailure {
  return { ok: false, error: { code, message } }
}

export class ApiError extends Error {
  readonly code: ApiErrorCode

  constructor(error: ApiFailure['error']) {
    super(error.message)
    this.name = 'ApiError'
    this.code = error.code
  }
}

/** 取出 data, 失败时抛出 ApiError. 适合 loader / beforeLoad 等直接交给路由处理错误的场景. */
export function unwrap<T>(result: ApiResult<T>): T {
  if (!result.ok) throw new ApiError(result.error)
  return result.data
}
