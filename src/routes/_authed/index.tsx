import { createFileRoute, useNavigate, useRouter } from '@tanstack/solid-router'
import { createSignal, For, Show } from 'solid-js'

import { ChooseForksDialog } from '~/components/choose-forks-dialog'
import { ForkRow } from '~/components/fork-row'
import { GitHubTokenForm } from '~/components/github-token-form'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Switch, SwitchControl, SwitchLabel, SwitchThumb } from '~/components/ui/switch'
import { createAction } from '~/lib/action'
import { unwrap } from '~/lib/response'
import { plural } from '~/lib/utils'
import { logout } from '~/server/auth'
import { checkForks, listForks } from '~/server/forks'
import { getGitHubAccount, removeGitHubToken } from '~/server/github-account'
import type { CheckSummary } from '~/server/sync'

export const Route = createFileRoute('/_authed/')({
  loader: async () => {
    const [account, forks] = await Promise.all([getGitHubAccount(), listForks()])
    return { account: unwrap(account), forks: unwrap(forks) }
  },
  component: Home,
})

function summaryText(summary: CheckSummary) {
  const parts = [`${summary.synced} synced`, `${summary.up_to_date} up to date`]
  if (summary.conflict > 0) parts.push(`${summary.conflict} with conflicts`)
  if (summary.error > 0) parts.push(`${summary.error} failed`)
  return parts.join(' · ')
}

function Home() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const [dark, setDark] = createSignal(false)
  const [tokenOpen, setTokenOpen] = createSignal(false)
  const [chooseOpen, setChooseOpen] = createSignal(false)
  const [checkingIds, setCheckingIds] = createSignal(new Set<number>())
  const [summary, setSummary] = createSignal<string>()

  const reload = () => router.invalidate()

  const signOut = async () => {
    await logout()
    await router.invalidate()
    await navigate({ to: '/login' })
  }

  const toggleDark = (value: boolean) => {
    setDark(value)
    document.documentElement.classList.toggle('dark', value)
  }

  const disconnect = async () => {
    await removeGitHubToken()
    setTokenOpen(false)
    await reload()
  }

  /** ids 为空时检测全部已选的 fork. 检测中状态按 fork 记录在 checkingIds, 不用 pending(). */
  const check = createAction(async (ids?: number[]) => {
    const targets = ids ?? data().forks.map((fork) => fork.id)
    setCheckingIds((prev) => new Set([...prev, ...targets]))
    if (!ids) setSummary(undefined)
    try {
      const result = await checkForks({ data: { ids } })
      if (result.ok && !ids) setSummary(summaryText(result.data))
      return result
    } finally {
      await reload()
      setCheckingIds((prev) => new Set([...prev].filter((id) => !targets.includes(id))))
    }
  })

  const checkingAll = () => data().forks.some((fork) => checkingIds().has(fork.id))

  return (
    <div class="min-h-screen">
      <header class="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div class="mx-auto flex h-12 max-w-3xl items-center justify-between px-4">
          <div class="flex items-center gap-2">
            <span class="size-2.5 rounded-sm bg-brand" />
            <span class="font-medium">GitHub Fork Sync</span>
          </div>
          <div class="flex items-center gap-3">
            <Switch class="flex items-center gap-2" checked={dark()} onChange={toggleDark}>
              <SwitchControl>
                <SwitchThumb />
              </SwitchControl>
              <SwitchLabel class="text-xs text-muted-foreground">Dark</SwitchLabel>
            </Switch>
            <Show when={data().account}>
              {(account) => (
                <Button variant="ghost" size="sm" onClick={() => setTokenOpen(true)}>
                  @{account().login}
                </Button>
              )}
            </Show>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
        <section class="flex flex-col gap-1">
          <h1 class="text-2xl font-semibold tracking-tight">Forks</h1>
          <p class="text-muted-foreground">
            Forks that are behind upstream are synced automatically. Forks with merge conflicts wait
            for you to choose what to do.
          </p>
        </section>

        <Show
          when={data().account}
          fallback={
            <Card>
              <CardHeader>
                <CardTitle>Connect GitHub</CardTitle>
                <CardDescription>
                  Add a token so the app can check and sync your forks.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GitHubTokenForm submitLabel="Connect" onSaved={() => void reload()} />
              </CardContent>
            </Card>
          }
        >
          <Card>
            <CardHeader class="flex-row items-start justify-between gap-4">
              <div class="flex flex-col gap-1">
                <CardTitle>Selected repositories</CardTitle>
                <CardDescription>
                  {data().forks.length === 0
                    ? 'Choose the forks you want to keep in sync.'
                    : `${plural(data().forks.length, 'fork')} selected.`}
                </CardDescription>
              </div>
              <Button variant="secondary" onClick={() => setChooseOpen(true)}>
                Choose repositories
              </Button>
            </CardHeader>
            <CardContent>
              <Show
                when={data().forks.length > 0}
                fallback={
                  <p class="rounded-lg bg-elevated px-3 py-6 text-center text-muted-foreground ring ring-border">
                    No repositories selected.
                  </p>
                }
              >
                <ul class="divide-y overflow-hidden rounded-lg ring ring-border">
                  <For each={data().forks}>
                    {(fork) => (
                      <ForkRow
                        fork={fork}
                        checking={checkingIds().has(fork.id)}
                        onCheck={() => void check.run([fork.id])}
                        onChanged={() => void reload()}
                      />
                    )}
                  </For>
                </ul>
              </Show>
            </CardContent>
            <Show when={data().forks.length > 0}>
              <CardFooter class="justify-between">
                <span class="text-muted-foreground">
                  <Show when={check.error()} fallback={summary()}>
                    <span class="text-destructive">{check.error()}</span>
                  </Show>
                </span>
                <Button disabled={checkingAll()} onClick={() => void check.run()}>
                  {checkingAll() ? 'Checking…' : 'Check for updates'}
                </Button>
              </CardFooter>
            </Show>
          </Card>

          <ChooseForksDialog
            open={chooseOpen()}
            onOpenChange={setChooseOpen}
            selected={data().forks}
            onSaved={() => void reload()}
          />

          <Dialog open={tokenOpen()} onOpenChange={setTokenOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>GitHub token</DialogTitle>
                <DialogDescription>
                  Connected as @{data().account?.login}. Replace the token, or disconnect to remove
                  it from this app.
                </DialogDescription>
              </DialogHeader>
              <GitHubTokenForm
                submitLabel="Replace token"
                onSaved={() => {
                  setTokenOpen(false)
                  void reload()
                }}
              />
              <div class="flex justify-start border-t pt-4">
                <Button variant="ghost" class="text-destructive" onClick={() => void disconnect()}>
                  Disconnect
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </Show>
      </main>
    </div>
  )
}
