/**
 * 每个测试文件使用独立的临时 SQLite 数据库, 每个用例开始前清空业务表.
 */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeEach } from 'vite-plus/test'

import { closeDb, getDb, schema } from '~/db'

const dir = mkdtempSync(join(tmpdir(), 'fork-sync-test-'))
process.env.DATABASE_URL = join(dir, 'app.db')

beforeEach(() => {
  const db = getDb()
  db.delete(schema.forks).run()
  db.delete(schema.settings).run()
})

afterAll(() => {
  closeDb()
  rmSync(dir, { recursive: true, force: true })
})
