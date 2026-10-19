import { createServerFn } from '@tanstack/solid-start'
import { desc } from 'drizzle-orm'

import { getDb, schema } from '~/db'

export const listForks = createServerFn({ method: 'GET' }).handler(() =>
  getDb().select().from(schema.forks).orderBy(desc(schema.forks.createdAt)).all(),
)
