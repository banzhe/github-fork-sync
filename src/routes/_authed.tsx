import { Outlet, createFileRoute, redirect } from '@tanstack/solid-router'

import { unwrap } from '~/lib/response'
import { getAuthState } from '~/server/auth'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async () => {
    const { authenticated } = unwrap(await getAuthState())
    if (!authenticated) throw redirect({ to: '/login' })
  },
  component: Outlet,
})
