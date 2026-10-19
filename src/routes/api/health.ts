import { createFileRoute } from '@tanstack/solid-router'

import { pingDb } from '~/db'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () => {
        pingDb()
        return Response.json({ status: 'ok' })
      },
    },
  },
})
