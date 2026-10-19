import * as ButtonPrimitive from '@kobalte/core/button'
import type { PolymorphicProps } from '@kobalte/core/polymorphic'
import { cva, type VariantProps } from 'class-variance-authority'
import type { JSX, ValidComponent } from 'solid-js'
import { splitProps } from 'solid-js'

import { cn } from '~/lib/utils'

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg text-sm font-medium whitespace-nowrap ring transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs ring-primary-edge hover:bg-primary/90',
        secondary: 'bg-card text-foreground shadow-xs ring-input hover:bg-muted',
        accent: 'bg-accent text-accent-foreground ring-transparent hover:bg-accent/80',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs ring-destructive-edge hover:bg-destructive/90',
        outline: 'bg-transparent text-foreground ring-input hover:bg-muted',
        ghost: 'text-foreground ring-transparent hover:bg-muted',
        link: 'text-primary underline-offset-4 ring-transparent hover:underline',
      },
      size: {
        default: 'h-9 px-3',
        sm: 'h-7 px-2 text-xs',
        lg: 'h-10 px-4',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonProps<T extends ValidComponent = 'button'> = ButtonPrimitive.ButtonRootProps<T> &
  VariantProps<typeof buttonVariants> & {
    class?: string | undefined
    children?: JSX.Element
  }

const Button = <T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, ButtonProps<T>>,
) => {
  const [local, others] = splitProps(props as ButtonProps, ['variant', 'size', 'class'])
  return (
    <ButtonPrimitive.Root
      class={cn(buttonVariants({ variant: local.variant, size: local.size }), local.class)}
      {...others}
    />
  )
}

export type { ButtonProps }
export { Button, buttonVariants }
