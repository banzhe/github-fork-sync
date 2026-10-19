import { eq } from 'drizzle-orm'

import { getDb, schema } from '..'

export const settingsRepo = {
  get(key: string) {
    return getDb().select().from(schema.settings).where(eq(schema.settings.key, key)).get()?.value
  },

  set(key: string, value: string) {
    getDb()
      .insert(schema.settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value } })
      .run()
  },

  delete(key: string) {
    getDb().delete(schema.settings).where(eq(schema.settings.key, key)).run()
  },

  /** key 已存在时不覆盖. */
  insertIfAbsent(key: string, value: string) {
    getDb().insert(schema.settings).values({ key, value }).onConflictDoNothing().run()
  },
}
