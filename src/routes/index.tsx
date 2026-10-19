import { createFileRoute } from '@tanstack/solid-router'
import { createSignal, For, Show } from 'solid-js'

import { Badge } from '~/components/ui/badge'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Switch, SwitchControl, SwitchLabel, SwitchThumb } from '~/components/ui/switch'
import { TextField, TextFieldInput, TextFieldLabel } from '~/components/ui/text-field'
import { listForks } from '~/server/forks'

export const Route = createFileRoute('/')({
  loader: () => listForks(),
  component: Home,
})

function Home() {
  const forks = Route.useLoaderData()
  const [dark, setDark] = createSignal(false)

  const toggleDark = (value: boolean) => {
    setDark(value)
    document.documentElement.classList.toggle('dark', value)
  }

  return (
    <div class="min-h-screen">
      <header class="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div class="mx-auto flex h-12 max-w-3xl items-center justify-between px-4">
          <div class="flex items-center gap-2">
            <span class="size-2.5 rounded-sm bg-brand" />
            <span class="font-medium">GitHub Fork Sync</span>
          </div>
          <span class="font-mono text-xs text-muted-foreground">v0.0.0</span>
        </div>
      </header>

      <main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
        <section class="flex flex-col gap-2">
          <div class="flex flex-wrap gap-1.5">
            <Badge>Solid</Badge>
            <Badge variant="secondary">TanStack Start</Badge>
            <Badge variant="accent">Kobalte</Badge>
            <Badge variant="success">Drizzle</Badge>
          </div>
          <h1 class="text-2xl font-semibold tracking-tight">GitHub Fork Sync</h1>
          <p class="text-muted-foreground">Keep your forks in sync with upstream.</p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Registered forks</CardTitle>
            <CardDescription>Stored in SQLite (Drizzle ORM).</CardDescription>
          </CardHeader>
          <CardContent>
            <Show
              when={forks().length > 0}
              fallback={
                <p class="rounded-lg bg-elevated px-3 py-6 text-center text-muted-foreground ring ring-border">
                  No forks yet.
                </p>
              }
            >
              <ul class="divide-y overflow-hidden rounded-lg ring ring-border">
                <For each={forks()}>
                  {(fork) => (
                    <li class="flex items-center justify-between px-3 py-2.5 hover:bg-elevated">
                      <span class="font-medium">
                        {fork.owner}/{fork.repo}
                      </span>
                      <Badge variant="outline" class="font-mono">
                        {fork.branch}
                      </Badge>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </CardContent>
          <CardFooter class="justify-between">
            <Switch class="flex items-center gap-2" checked={dark()} onChange={toggleDark}>
              <SwitchControl>
                <SwitchThumb />
              </SwitchControl>
              <SwitchLabel>Dark mode</SwitchLabel>
            </Switch>
            <Dialog>
              <DialogTrigger as={Button}>Add fork</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add fork</DialogTitle>
                  <DialogDescription>
                    Enter the repository details (demo only, saving is not wired up yet).
                  </DialogDescription>
                </DialogHeader>
                <TextField>
                  <TextFieldLabel>Repository</TextFieldLabel>
                  <TextFieldInput placeholder="owner/repo" />
                </TextField>
                <DialogFooter>
                  <Button>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
