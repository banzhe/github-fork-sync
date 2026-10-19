import { cva, type VariantProps } from 'class-variance-authority'
import type { Component, ComponentProps } from 'solid-js'
import { splitProps } from 'solid-js'

import { cn } from '~/lib/utils'

const badgeVariants = cva(
  'inline-flex h-5 items-center rounded-sm px-1.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        secondary: 'bg-secondary text-secondary-foreground ring ring-border',
        accent: 'bg-accent text-accent-foreground',
        success: 'bg-success text-success-foreground',
        destructive: 'bg-destructive/10 text-destructive',
        outline: 'text-foreground ring ring-border',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>

const Badge: Component<BadgeProps> = (props) => {
  const [local, others] = splitProps(props, ['class', 'variant'])
  return <span class={cn(badgeVariants({ variant: local.variant }), local.class)} {...others} />
}

export type { BadgeProps }
export { Badge, badgeVariants }
