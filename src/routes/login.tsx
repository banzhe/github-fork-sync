import { createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/solid-router'
import { createSignal, Show } from 'solid-js'

import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import {
  TextField,
  TextFieldDescription,
  TextFieldErrorMessage,
  TextFieldInput,
  TextFieldLabel,
} from '~/components/ui/text-field'
import { getAuthState, login, MIN_PASSWORD_LENGTH } from '~/server/auth'
import { unwrap } from '~/utils/response'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const state = unwrap(await getAuthState())
    if (state.authenticated) throw redirect({ to: '/' })
    return state
  },
  loader: ({ context }) => ({ initialized: context.initialized }),
  head: () => ({ meta: [{ title: 'Sign in · GitHub Fork Sync' }] }),
  component: Login,
})

function Login() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const [password, setPassword] = createSignal('')
  const [error, setError] = createSignal<string>()
  const [pending, setPending] = createSignal(false)

  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    setPending(true)
    setError(undefined)
    try {
      const result = await login({ data: { password: password() } })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      await router.invalidate()
      await navigate({ to: '/' })
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main class="flex min-h-screen items-center justify-center px-4 py-10">
      <div class="flex w-full max-w-sm flex-col gap-6">
        <div class="flex items-center justify-center gap-2">
          <span class="size-2.5 rounded-sm bg-brand" />
          <span class="font-medium">GitHub Fork Sync</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{data().initialized ? 'Sign in' : 'Set a password'}</CardTitle>
            <CardDescription>
              {data().initialized
                ? 'Enter your password to continue.'
                : 'This is the first sign-in. The password you enter becomes the password for this app.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form class="flex flex-col gap-4" onSubmit={onSubmit}>
              <TextField
                value={password()}
                onChange={setPassword}
                validationState={error() ? 'invalid' : 'valid'}
                required
              >
                <TextFieldLabel>Password</TextFieldLabel>
                <TextFieldInput
                  type="password"
                  name="password"
                  autocomplete={data().initialized ? 'current-password' : 'new-password'}
                  autofocus
                />
                <Show when={!data().initialized && !error()}>
                  <TextFieldDescription>
                    At least {MIN_PASSWORD_LENGTH} characters.
                  </TextFieldDescription>
                </Show>
                <TextFieldErrorMessage>{error()}</TextFieldErrorMessage>
              </TextField>
              <Button type="submit" class="w-full" disabled={pending() || password() === ''}>
                {pending()
                  ? 'Signing in…'
                  : data().initialized
                    ? 'Sign in'
                    : 'Set password and sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
