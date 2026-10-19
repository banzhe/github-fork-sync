import { createServerFn } from '@tanstack/solid-start'

import { forksRepo } from '~/db/repositories'
import { ok } from '~/utils/response'

import { authMiddleware } from './auth'

export const listForks = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(() => ok(forksRepo.list()))
