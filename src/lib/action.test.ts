import { describe, expect, it } from 'vite-plus/test'

import { createAction } from './action'
import { fail, ok } from './response'

describe('createAction', () => {
  it('returns the result and tracks pending while the call runs', async () => {
    let release!: () => void
    const action = createAction(
      (value: number) =>
        new Promise<ReturnType<typeof ok<number>>>((resolve) => {
          release = () => resolve(ok(value * 2))
        }),
    )

    const running = action.run(21)
    expect(action.pending()).toBe(true)
    release()

    expect(await running).toEqual({ ok: true, data: 42 })
    expect(action.pending()).toBe(false)
    expect(action.error()).toBeUndefined()
  })

  it('exposes the message of a failed result', async () => {
    const action = createAction(() => Promise.resolve(fail('NOT_FOUND', 'Fork not found.')))

    expect(await action.run()).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } })
    expect(action.error()).toBe('Fork not found.')
  })

  it('turns a thrown error into an INTERNAL failure', async () => {
    const action = createAction(() => Promise.reject(new Error('Network down')))

    expect(await action.run()).toMatchObject({ ok: false, error: { code: 'INTERNAL' } })
    expect(action.error()).toBe('Something went wrong. Try again.')
    expect(action.pending()).toBe(false)
  })

  it('clears the previous error on the next run', async () => {
    let succeed = false
    const action = createAction(() =>
      Promise.resolve(succeed ? ok() : fail('GITHUB_ERROR', 'Bad credentials.')),
    )

    await action.run()
    succeed = true
    await action.run()

    expect(action.error()).toBeUndefined()
  })
})
