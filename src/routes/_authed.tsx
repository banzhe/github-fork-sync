import { Outlet, createFileRoute, redirect } from '@tanstack/solid-router'

import { getAuthState } from '~/server/auth'
import { unwrap } from '~/utils/response'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async () => {
    const { authenticated } = unwrap(await getAuthState())
    if (!authenticated) throw redirect({ to: '/login' })
  },
  component: Outlet,
})
