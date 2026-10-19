import { eq, lt } from 'drizzle-orm'

import { getDb, schema, type NewSession } from '..'

export const sessionsRepo = {
  find(id: string) {
    return getDb().select().from(schema.sessions).where(eq(schema.sessions.id, id)).get()
  },

  insert(session: NewSession) {
    getDb().insert(schema.sessions).values(session).run()
  },

  delete(id: string) {
    getDb().delete(schema.sessions).where(eq(schema.sessions.id, id)).run()
  },

  deleteExpired(now = new Date()) {
    getDb().delete(schema.sessions).where(lt(schema.sessions.expiresAt, now)).run()
  },
}
