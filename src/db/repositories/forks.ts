import { desc } from 'drizzle-orm'

import { getDb, schema } from '..'

export const forksRepo = {
  /** 按创建时间倒序. */
  list() {
    return getDb().select().from(schema.forks).orderBy(desc(schema.forks.createdAt)).all()
  },
}
