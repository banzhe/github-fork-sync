import { createSignal } from 'solid-js'

import { fail, type ApiResult } from './response'

const FALLBACK_MESSAGE = 'Something went wrong. Try again.'

/**
 * 前端调用 server function 的统一封装, 记录进行中状态和错误信息.
 *
 * - `fn` 返回失败结果时, `error()` 是它的 message.
 * - `fn` 抛错时 (网络错误等) 转成 INTERNAL 失败结果, `error()` 是通用提示.
 * - 成功后的后续操作 (刷新、跳转) 写在 `fn` 里, `pending()` 会一直持续到它们完成.
 */
export function createAction<Args extends unknown[], T>(
  fn: (...args: Args) => Promise<ApiResult<T>>,
) {
  const [pending, setPending] = createSignal(false)
  const [error, setError] = createSignal<string>()

  const run = async (...args: Args): Promise<ApiResult<T>> => {
    setPending(true)
    setError(undefined)
    try {
      const result = await fn(...args)
      if (!result.ok) setError(result.error.message)
      return result
    } catch {
      setError(FALLBACK_MESSAGE)
      return fail('INTERNAL', FALLBACK_MESSAGE)
    } finally {
      setPending(false)
    }
  }

  return { run, pending, error }
}
