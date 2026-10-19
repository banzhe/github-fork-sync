import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

import * as schema from './schema'

let db: BetterSQLite3Database<typeof schema> | undefined

/** 仅在服务端调用. 首次调用时打开数据库并执行迁移. */
export function getDb() {
  if (db) return db

  const file = resolve(process.env.DATABASE_URL ?? './data/app.db')
  mkdirSync(dirname(file), { recursive: true })

  const sqlite = new Database(file)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: resolve(process.env.MIGRATIONS_DIR ?? './drizzle') })
  return db
}

export { schema }
