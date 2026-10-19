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

/** 应用级键值配置, 例如登录密码的哈希. */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

/** 登录会话. id 存的是会话 token 的 SHA-256, 不存明文 token. */
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
