# AGENTS.md

## Stack

- TanStack Start + SolidJS: file-based routes in `src/routes/`, SSR, Nitro node-server output.
- Vite+ (`vp`): dev server and build, with built-in oxlint, oxfmt and type checking. Config is in `vite.config.ts`.
- Tailwind CSS v4 + Kobalte. Components are organized shadcn-style in `src/components/ui/` (`cva` for variants, `cn` from `src/lib/utils.ts`).
- SQLite (better-sqlite3) + Drizzle ORM. The schema is in `src/db/schema.ts` and migrations in `drizzle/`. Migrations run automatically the first time the server accesses the database. `DATABASE_URL` sets the database file (default `./data/app.db`).
- Changesets for versioning. Docker image published to GHCR; health check at `/api/health`.

## Commands

| Command                       | Purpose                                       |
| ----------------------------- | --------------------------------------------- |
| `vp install`                  | Install dependencies                          |
| `pnpm dev`                    | Dev server at http://localhost:29176          |
| `vp check` / `vp check --fix` | Format + lint + type check / auto-fix         |
| `vp test`                     | Run tests (Vitest)                            |
| `vp build`                    | Production build to `.output/`                |
| `pnpm start`                  | Run the production build                      |
| `pnpm db:generate`            | Generate a migration after editing the schema |
| `pnpm db:studio`              | Open Drizzle Studio                           |
| `pnpm changeset`              | Record a change for the next release          |

## Conventions

- Use pnpm (pinned via `packageManager`) and `vp` (Vite+). Run `vp check --fix` instead of hand-formatting; it also sorts Tailwind classes.
- Solid lint rules are on: never destructure props, use `<For>` for lists and `<Show>` for conditionals.
- Never edit `src/routeTree.gen.ts`; it is generated.
- Dev server port is `29176`. Stop it before adding or removing dependencies; on Windows it locks the `better-sqlite3` native module and the install fails.
- Database access goes only through the repositories in `src/db/repositories/`.
- Server functions return the shared shape from `src/lib/response.ts`. Components call them through `createAction` from `src/lib/action.ts` (pending state, error message, thrown errors become a failed result) instead of their own try/catch.
- All GitHub API calls and the GitHub token go through `src/server/github/`. Keep server function handlers thin and put logic in testable modules such as `src/server/sync.ts`.

## Tests

- Vitest via `vp test`; import from `vite-plus/test`. Test files are `src/**/*.test.ts`.
- `src/test/setup.ts` gives each test file its own temporary SQLite database and empties the tables before each test.
- Never call GitHub in tests. Add `vi.mock('~/server/github')` to use `src/server/github/__mocks__/index.ts`, then set return values on its `github` fake client (`resetGitHubMock()` in `beforeEach`, `setGitHubConnected(false)` for "no token").
- Pages that need sign-in go under the `_authed` route; protected server functions use `authMiddleware`.
- The local testing password is always `123456`.
- `vp build` prints a warning about `output.codeSplitting.groups[0].name`. It comes from Nitro, not this repo; ignore it.

## Component style: Kumo

Match the visual style of Cloudflare's [Kumo](https://github.com/cloudflare/kumo) ([docs](https://kumo-ui.com)). Before adding or changing a component, look at its Kumo counterpart. Kumo is React + Base UI; here components stay Kobalte + `cva` + `cn` in `src/components/ui/`.

- Colors: only the semantic tokens in `src/styles.css`. Add new tokens to both `:root` and `.dark`.
- Neutral gray page (`bg-background`), white surfaces (`bg-card`), secondary areas `bg-elevated`. Blue `primary`; orange `brand` only as an accent.
- 1px `ring` instead of borders (`ring-border`, controls `ring-input`). Radius: `rounded-lg` for controls and cards, `rounded-sm` for badges, `rounded-xl` for dialogs. No pill buttons.
- Subtle shadows (`shadow-xs`, dialogs `shadow-lg`), no lift or bounce hover effects.
- Inter, `text-sm`; controls `h-9` (small `h-7`); weights `font-medium` / `font-semibold`.
- Check every component in dark mode.

## Verify before reporting done

After any code or config change, spawn a subagent (the `verify` agent if available) to verify the work before telling the user it is done. Tell it which files changed and the expected behavior. It only verifies and reports; fix any failures, then verify again.

1. If dependencies changed: `pnpm install --frozen-lockfile`.
2. `vp check` passes with no warnings.
3. `vp test` passes.
4. `vp build` succeeds.
5. With `pnpm dev` running, `GET /api/health` returns `{"status":"ok"}`. Open the changed pages in a browser: no console errors, and the changed behavior works. For UI changes, check light and dark mode.
6. Stop any server the subagent started, and report each step as passed or failed.
