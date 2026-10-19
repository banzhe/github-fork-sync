import { createSignal, Match, Show, Switch } from 'solid-js'

import { Badge } from '~/components/ui/badge'
import { Button, buttonVariants } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import type { Fork } from '~/db/schema'
import { createAction } from '~/lib/action'
import { formatRelative } from '~/lib/time'
import { plural } from '~/lib/utils'
import { discardFork } from '~/server/forks'

const SYNC_LABELS = {
  'fast-forward': 'fast-forward',
  merge: 'merge commit',
  discard: 'discarded fork commits',
} as const

export function ForkRow(props: {
  fork: Fork
  checking: boolean
  onCheck: () => void
  onChanged: () => void
}) {
  const [confirmOpen, setConfirmOpen] = createSignal(false)

  const upstreamOwner = () => props.fork.upstream.split('/')[0]
  const aheadText = () => plural(props.fork.aheadBy ?? 0, 'commit')
  const forkUrl = () =>
    `https://github.com/${props.fork.owner}/${props.fork.repo}/tree/${props.fork.branch}`
  /** GitHub 网页上的 compare 页面, 可以在这里开 PR 把上游合并进 fork 并解决冲突. */
  const pullRequestUrl = () =>
    `https://github.com/${props.fork.owner}/${props.fork.repo}/compare/${props.fork.branch}...${upstreamOwner()}:${props.fork.upstreamBranch ?? props.fork.branch}?expand=1`

  const discard = createAction(async () => {
    const result = await discardFork({ data: { id: props.fork.id } })
    if (result.ok) {
      setConfirmOpen(false)
      props.onChanged()
    }
    return result
  })

  return (
    <li class="flex flex-col gap-3 px-3 py-3">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-0.5">
          <a
            class="truncate font-medium hover:underline"
            href={forkUrl()}
            target="_blank"
            rel="noreferrer"
          >
            {props.fork.owner}/{props.fork.repo}
          </a>
          <span class="truncate text-xs text-muted-foreground">
            <span class="font-mono">{props.fork.branch}</span> from {props.fork.upstream}
            <Show
              when={props.fork.upstreamBranch && props.fork.upstreamBranch !== props.fork.branch}
            >
              <span class="font-mono">:{props.fork.upstreamBranch}</span>
            </Show>
          </span>
          <Show when={props.fork.status === 'error' && props.fork.lastError}>
            <span class="text-xs text-destructive">{props.fork.lastError}</span>
          </Show>
          <span class="text-xs text-muted-foreground">
            <Show when={props.fork.lastCheckedAt} fallback="Never checked">
              {(checkedAt) => <>Checked {formatRelative(checkedAt())}</>}
            </Show>
            <Show when={props.fork.lastSyncedAt}>
              {(syncedAt) => (
                <>
                  {' · '}Synced {formatRelative(syncedAt())}
                  <Show when={props.fork.lastSyncType}>
                    {(type) => <> via {SYNC_LABELS[type()]}</>}
                  </Show>
                </>
              )}
            </Show>
          </span>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <Show when={props.fork.status === 'up_to_date' && (props.fork.aheadBy ?? 0) > 0}>
            <Badge variant="outline">{props.fork.aheadBy} ahead</Badge>
          </Show>
          <Switch>
            <Match when={props.checking}>
              <Badge variant="secondary">Checking…</Badge>
            </Match>
            <Match when={props.fork.status === 'up_to_date'}>
              <Badge variant="success">Up to date</Badge>
            </Match>
            <Match when={props.fork.status === 'conflict'}>
              <Badge variant="warning">Conflict</Badge>
            </Match>
            <Match when={props.fork.status === 'error'}>
              <Badge variant="destructive">Error</Badge>
            </Match>
            <Match when={props.fork.status === 'unchecked'}>
              <Badge variant="secondary">Not checked</Badge>
            </Match>
          </Switch>
          <Button
            variant="ghost"
            size="sm"
            disabled={props.checking}
            onClick={() => props.onCheck()}
          >
            Check
          </Button>
        </div>
      </div>

      <Show when={props.fork.status === 'conflict'}>
        <div class="flex flex-col gap-3 rounded-lg bg-warning/40 p-3 ring ring-border">
          <p>
            This branch is {plural(props.fork.behindBy ?? 0, 'commit')} behind and {aheadText()}{' '}
            ahead of upstream. Merging upstream causes conflicts, so it wasn't synced. Choose how to
            handle it:
          </p>
          <div class="flex flex-wrap gap-2">
            <a
              class={buttonVariants({ variant: 'secondary', size: 'sm' })}
              href={pullRequestUrl()}
              target="_blank"
              rel="noreferrer"
            >
              Open pull request
            </a>
            <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
              Discard {aheadText()}
            </Button>
          </div>
          <p class="text-xs text-muted-foreground">
            Open a pull request to merge upstream into the fork and resolve the conflicts on GitHub,
            then click Check. Discarding resets the branch to upstream.
          </p>
        </div>
      </Show>

      <Dialog open={confirmOpen()} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard {aheadText()}?</DialogTitle>
            <DialogDescription>
              The <span class="font-mono">{props.fork.branch}</span> branch of {props.fork.owner}/
              {props.fork.repo} will be reset to match {props.fork.upstream}. Commits that only
              exist on the fork are removed from this branch. This can't be undone here.
            </DialogDescription>
          </DialogHeader>
          <Show when={discard.error()}>
            <p class="text-xs font-medium text-destructive">{discard.error()}</p>
          </Show>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={discard.pending()}
              onClick={() => void discard.run()}
            >
              {discard.pending() ? 'Discarding…' : 'Discard commits'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  )
}
