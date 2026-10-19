import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'solid-js'
import { splitProps } from 'solid-js'

import { cn } from '~/lib/utils'

const spinnerVariants = cva('shrink-0 animate-spin text-muted-foreground', {
  variants: {
    size: {
      sm: 'size-4',
      default: 'size-5',
      lg: 'size-6',
    },
  },
  defaultVariants: {
    size: 'default',
  },
})

type SpinnerProps = ComponentProps<'svg'> & VariantProps<typeof spinnerVariants>

/** 加载指示器: 浅色圆环上转动的一段弧, 颜色跟随 currentColor. */
const Spinner = (props: SpinnerProps) => {
  const [local, others] = splitProps(props, ['class', 'size'])
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
      class={cn(spinnerVariants({ size: local.size }), local.class)}
      {...others}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
      />
    </svg>
  )
}

export type { SpinnerProps }
export { Spinner, spinnerVariants }
