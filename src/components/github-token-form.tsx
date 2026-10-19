import { createSignal } from 'solid-js'

import { Button } from '~/components/ui/button'
import {
  TextField,
  TextFieldDescription,
  TextFieldErrorMessage,
  TextFieldInput,
  TextFieldLabel,
} from '~/components/ui/text-field'
import { createAction } from '~/lib/action'
import { saveGitHubToken } from '~/server/github-account'

const NEW_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new'

/** 创建 fine-grained token 时需要的权限说明. */
export function TokenPermissions() {
  return (
    <div class="flex flex-col gap-2 rounded-lg bg-elevated p-3 text-muted-foreground ring ring-border">
      <p>
        Create a{' '}
        <a
          class="text-primary hover:underline"
          href={NEW_TOKEN_URL}
          target="_blank"
          rel="noreferrer"
        >
          fine-grained personal access token
        </a>{' '}
        with access to the forks you want to sync, and these repository permissions:
      </p>
      <ul class="flex list-disc flex-col gap-1 pl-5">
        <li>
          <span class="font-medium text-foreground">Contents</span>: Read and write
        </li>
        <li>
          <span class="font-medium text-foreground">Workflows</span>: Read and write (needed when
          upstream changes files in <code class="font-mono text-xs">.github/workflows</code>)
        </li>
      </ul>
    </div>
  )
}

export function GitHubTokenForm(props: { submitLabel: string; onSaved: () => void }) {
  const [token, setToken] = createSignal('')
  const { run, pending, error } = createAction(async () => {
    const result = await saveGitHubToken({ data: { token: token() } })
    if (result.ok) {
      setToken('')
      props.onSaved()
    }
    return result
  })

  const onSubmit = (e: SubmitEvent) => {
    e.preventDefault()
    void run()
  }

  return (
    <form class="flex flex-col gap-4" onSubmit={onSubmit}>
      <TokenPermissions />
      <TextField
        value={token()}
        onChange={setToken}
        validationState={error() ? 'invalid' : 'valid'}
        required
      >
        <TextFieldLabel>Token</TextFieldLabel>
        <TextFieldInput
          type="password"
          name="token"
          autocomplete="off"
          placeholder="github_pat_…"
          class="font-mono"
        />
        <TextFieldDescription>Stored in this app's database on the server.</TextFieldDescription>
        <TextFieldErrorMessage>{error()}</TextFieldErrorMessage>
      </TextField>
      <Button type="submit" class="self-end" disabled={pending() || token().trim() === ''}>
        {pending() ? 'Checking token…' : props.submitLabel}
      </Button>
    </form>
  )
}
