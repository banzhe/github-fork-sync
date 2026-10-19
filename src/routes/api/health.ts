import { createFileRoute } from '@tanstack/solid-router'
import { sql } from 'drizzle-orm'

import { getDb } from '~/db'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () => {
        getDb().run(sql`select 1`)
        return Response.json({ status: 'ok' })
      },
    },
  },
})
