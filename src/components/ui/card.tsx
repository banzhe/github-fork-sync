import type { Component, ComponentProps } from 'solid-js'
import { splitProps } from 'solid-js'

import { cn } from '~/lib/utils'

const Card: Component<ComponentProps<'div'>> = (props) => {
  const [local, others] = splitProps(props, ['class'])
  return (
    <div
      class={cn(
        'overflow-hidden rounded-lg bg-card text-card-foreground ring ring-border',
        local.class,
      )}
      {...others}
    />
  )
}

const CardHeader: Component<ComponentProps<'div'>> = (props) => {
  const [local, others] = splitProps(props, ['class'])
  return <div class={cn('flex flex-col gap-1 p-4', local.class)} {...others} />
}

const CardTitle: Component<ComponentProps<'h3'>> = (props) => {
  const [local, others] = splitProps(props, ['class'])
  return <h3 class={cn('text-base leading-tight font-semibold', local.class)} {...others} />
}

const CardDescription: Component<ComponentProps<'p'>> = (props) => {
  const [local, others] = splitProps(props, ['class'])
  return <p class={cn('text-sm text-muted-foreground', local.class)} {...others} />
}

const CardContent: Component<ComponentProps<'div'>> = (props) => {
  const [local, others] = splitProps(props, ['class'])
  return <div class={cn('p-4 pt-0', local.class)} {...others} />
}

const CardFooter: Component<ComponentProps<'div'>> = (props) => {
  const [local, others] = splitProps(props, ['class'])
  return (
    <div
      class={cn('flex items-center gap-2 border-t bg-elevated px-4 py-3', local.class)}
      {...others}
    />
  )
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
