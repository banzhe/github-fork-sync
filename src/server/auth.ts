import { createMiddleware, createServerFn } from '@tanstack/solid-start'

import { fail, ok } from '~/utils/response'

import {
  checkPassword,
  createSession,
  destroySession,
  isAuthenticated,
  isPasswordSet,
} from './session'

export const MIN_PASSWORD_LENGTH = 6

/**
 * 用于需要登录的 server function. middleware 无法直接返回统一结构, 未登录时抛错;
 * 页面层面的拦截由 `_authed` 布局路由负责.
 */
export const authMiddleware = createMiddleware({ type: 'function' }).server(({ next }) => {
  if (!isAuthenticated()) throw new Error('Unauthorized')
  return next()
})

export const getAuthState = createServerFn({ method: 'GET' }).handler(() =>
  ok({ initialized: isPasswordSet(), authenticated: isAuthenticated() }),
)

export const login = createServerFn({ method: 'POST' })
  .validator((data: { password: string }) => {
    if (typeof data?.password !== 'string') throw new Error('Invalid input')
    return { password: data.password }
  })
  .handler(async ({ data }) => {
    if (!isPasswordSet() && data.password.length < MIN_PASSWORD_LENGTH) {
      return fail('BAD_REQUEST', `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
    }
    if (!(await checkPassword(data.password))) {
      return fail('INVALID_PASSWORD', 'Incorrect password.')
    }
    createSession()
    return ok()
  })

export const logout = createServerFn({ method: 'POST' }).handler(() => {
  destroySession()
  return ok()
})
