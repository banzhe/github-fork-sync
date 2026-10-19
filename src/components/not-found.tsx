import { Link } from '@tanstack/solid-router'

import { buttonVariants } from '~/components/ui/button'

/** 路由默认的 404 页面. */
export function NotFound() {
  return (
    <main class="flex min-h-screen items-center justify-center px-4 py-10">
      <div class="flex max-w-sm flex-col items-center gap-4 text-center">
        <p class="text-sm font-medium text-muted-foreground">404</p>
        <div class="flex flex-col gap-1.5">
          <h1 class="text-lg font-semibold">Page not found</h1>
          <p class="text-sm text-muted-foreground">
            The page you're looking for doesn't exist or has moved.
          </p>
        </div>
        <Link to="/" class={buttonVariants({ variant: 'secondary' })}>
          Back to home
        </Link>
      </div>
    </main>
  )
}
