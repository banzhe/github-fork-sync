import { eq } from 'drizzle-orm'

import { getDb, schema } from '..'

export const settingsRepo = {
  get(key: string) {
    return getDb().select().from(schema.settings).where(eq(schema.settings.key, key)).get()?.value
  },

  /** key 已存在时不覆盖. */
  insertIfAbsent(key: string, value: string) {
    getDb().insert(schema.settings).values({ key, value }).onConflictDoNothing().run()
  },
}
