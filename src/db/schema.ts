import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const FORK_STATUSES = ['unchecked', 'up_to_date', 'conflict', 'error'] as const
export type ForkStatus = (typeof FORK_STATUSES)[number]

export const SYNC_TYPES = ['fast-forward', 'merge', 'discard'] as const
export type SyncType = (typeof SYNC_TYPES)[number]

/** 用户选中需要同步的 fork. branch 是 fork 上要同步的分支. */
export const forks = sqliteTable(
  'forks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    owner: text('owner').notNull(),
    repo: text('repo').notNull(),
    branch: text('branch').notNull().default('main'),
    /** 上游仓库, 格式 owner/repo. */
    upstream: text('upstream').notNull(),
    /** 最近一次检测时与之比较的上游分支. 通常与 branch 同名, 上游没有同名分支时是上游默认分支. */
    upstreamBranch: text('upstream_branch'),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    /** 最近一次检测的结果. conflict 表示合并上游有冲突, 等待用户选择处理方式. */
    status: text('status', { enum: FORK_STATUSES }).notNull().default('unchecked'),
    /** 相对上游的领先/落后提交数, 来自最近一次检测. */
    aheadBy: integer('ahead_by'),
    behindBy: integer('behind_by'),
    lastError: text('last_error'),
    lastCheckedAt: integer('last_checked_at', { mode: 'timestamp' }),
    lastSyncType: text('last_sync_type', { enum: SYNC_TYPES }),
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
