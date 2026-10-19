import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const forks = sqliteTable(
  'forks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    owner: text('owner').notNull(),
    repo: text('repo').notNull(),
    branch: text('branch').notNull().default('main'),
    upstream: text('upstream').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex('forks_owner_repo_branch_idx').on(t.owner, t.repo, t.branch)],
)

export type Fork = typeof forks.$inferSelect
export type NewFork = typeof forks.$inferInsert
