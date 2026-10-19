import { desc, eq, inArray } from 'drizzle-orm'

import { repoName } from '~/lib/utils'

import { getDb, schema, type NewFork } from '..'

export type ForkKey = Pick<NewFork, 'owner' | 'repo' | 'branch' | 'upstream'>
type ForkUpdate = Partial<Omit<NewFork, 'id' | 'owner' | 'repo' | 'createdAt'>>

export const forksRepo = {
  /** 按创建时间倒序. */
  list() {
    return getDb().select().from(schema.forks).orderBy(desc(schema.forks.createdAt)).all()
  },

  find(id: number) {
    return getDb().select().from(schema.forks).where(eq(schema.forks.id, id)).get()
  },

  findMany(ids: number[]) {
    if (ids.length === 0) return []
    return getDb().select().from(schema.forks).where(inArray(schema.forks.id, ids)).all()
  },

  /**
   * 用新的选择替换已选的 fork: 新增没选过的, 删除不再选中的, 已有的保留检测状态.
   * 以 owner/repo 判断是否是同一个 fork.
   */
  replaceSelection(selection: ForkKey[]) {
    const db = getDb()
    db.transaction((tx) => {
      const existing = tx.select().from(schema.forks).all()
      const selected = new Set(selection.map(repoName))
      const removed = existing
        .filter((fork) => !selected.has(repoName(fork)))
        .map((fork) => fork.id)
      if (removed.length > 0) {
        tx.delete(schema.forks).where(inArray(schema.forks.id, removed)).run()
      }

      const kept = new Set(existing.map(repoName))
      const added = selection.filter((fork) => !kept.has(repoName(fork)))
      if (added.length > 0) {
        tx.insert(schema.forks).values(added).onConflictDoNothing().run()
      }
    })
  },

  update(id: number, values: ForkUpdate) {
    getDb().update(schema.forks).set(values).where(eq(schema.forks.id, id)).run()
  },
}
