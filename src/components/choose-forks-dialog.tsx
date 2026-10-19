import { createMemo, createSignal, For, Match, Show, Switch } from 'solid-js'

import { Button } from '~/components/ui/button'
import { Checkbox, CheckboxControl, CheckboxLabel } from '~/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Spinner } from '~/components/ui/spinner'
import { TextField, TextFieldInput } from '~/components/ui/text-field'
import type { Fork } from '~/db/schema'
import { createAction } from '~/lib/action'
import { repoName } from '~/lib/utils'
import { getForkCandidates, saveForkSelection } from '~/server/forks'
import type { ForkCandidate } from '~/server/github'

export function ChooseForksDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selected: Fork[]
  onSaved: () => void
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent class="max-w-xl">
        <DialogHeader>
          <DialogTitle>Choose repositories</DialogTitle>
          <DialogDescription>
            Pick the forks to keep in sync. Each fork's default branch is synced with the branch of
            the same name upstream.
          </DialogDescription>
        </DialogHeader>
        <ForkPicker
          initialSelected={props.selected}
          onSaved={() => {
            props.onSaved()
            props.onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

/** 对话框内容只在打开时挂载, 所以每次打开都会重新加载列表并从已保存的选择开始. */
function ForkPicker(props: { initialSelected: Fork[]; onSaved: () => void }) {
  const [candidates, setCandidates] = createSignal<ForkCandidate[]>()
  const [selection, setSelection] = createSignal(new Set(props.initialSelected.map(repoName)))
  const [query, setQuery] = createSignal('')

  const load = createAction(async () => {
    setCandidates(undefined)
    const result = await getForkCandidates()
    if (result.ok) setCandidates(result.data)
    return result
  })
  void load.run()

  const filtered = createMemo(() => {
    const q = query().trim().toLowerCase()
    const list = candidates() ?? []
    if (!q) return list
    return list.filter((fork) => `${repoName(fork)} ${fork.upstream}`.toLowerCase().includes(q))
  })

  const chosen = createMemo(() =>
    (candidates() ?? []).filter((fork) => selection().has(repoName(fork))),
  )

  const setChecked = (forks: ForkCandidate[], checked: boolean) => {
    const next = new Set(selection())
    for (const fork of forks) {
      if (checked) next.add(repoName(fork))
      else next.delete(repoName(fork))
    }
    setSelection(next)
  }

  const save = createAction(async () => {
    const forks = chosen().map((fork) => ({
      owner: fork.owner,
      repo: fork.repo,
      branch: fork.defaultBranch,
      upstream: fork.upstream,
    }))
    const result = await saveForkSelection({ data: { forks } })
    if (result.ok) props.onSaved()
    return result
  })

  return (
    <>
      <Switch>
        <Match when={load.error()}>
          <div class="flex flex-col items-center gap-3 rounded-lg bg-elevated px-3 py-6 text-center ring ring-border">
            <p class="text-destructive">{load.error()}</p>
            <Button variant="secondary" size="sm" onClick={() => void load.run()}>
              Retry
            </Button>
          </div>
        </Match>
        <Match when={!candidates()}>
          <div class="flex flex-col items-center gap-2 rounded-lg bg-elevated px-3 py-8 text-muted-foreground ring ring-border">
            <Spinner />
            <p>Loading forks…</p>
          </div>
        </Match>
        <Match when={candidates()?.length === 0}>
          <p class="rounded-lg bg-elevated px-3 py-6 text-center text-muted-foreground ring ring-border">
            The token can't see any forks. Check its repository access.
          </p>
        </Match>
        <Match when={candidates()}>
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <TextField class="flex-1" value={query()} onChange={setQuery}>
                <TextFieldInput placeholder="Filter repositories" aria-label="Filter" />
              </TextField>
              <Button variant="ghost" size="sm" onClick={() => setChecked(filtered(), true)}>
                Select all
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setChecked(filtered(), false)}>
                Clear
              </Button>
            </div>
            <ul class="max-h-80 divide-y overflow-y-auto rounded-lg ring ring-border">
              <For
                each={filtered()}
                fallback={<li class="px-3 py-6 text-center text-muted-foreground">No matches.</li>}
              >
                {(fork) => (
                  <li class="hover:bg-elevated">
                    <Checkbox
                      class="flex items-center gap-3 px-3 py-2.5"
                      checked={selection().has(repoName(fork))}
                      onChange={(checked) => setChecked([fork], checked)}
                    >
                      <CheckboxControl />
                      <CheckboxLabel class="flex min-w-0 flex-1 cursor-pointer flex-col">
                        <span class="truncate">{repoName(fork)}</span>
                        <span class="truncate text-xs font-normal text-muted-foreground">
                          from {fork.upstream} · {fork.defaultBranch}
                          {fork.private ? ' · private' : ''}
                        </span>
                      </CheckboxLabel>
                    </Checkbox>
                  </li>
                )}
              </For>
            </ul>
          </div>
        </Match>
      </Switch>

      <Show when={save.error()}>
        <p class="text-xs font-medium text-destructive">{save.error()}</p>
      </Show>
      <DialogFooter class="sm:items-center sm:justify-between">
        <span class="text-muted-foreground">{chosen().length} selected</span>
        <Button onClick={() => void save.run()} disabled={save.pending() || !candidates()}>
          {save.pending() ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </>
  )
}
