import * as DialogPrimitive from '@kobalte/core/dialog'
import type { PolymorphicProps } from '@kobalte/core/polymorphic'
import type { Component, ComponentProps, JSX, ValidComponent } from 'solid-js'
import { splitProps } from 'solid-js'

import { cn } from '~/lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal: Component<DialogPrimitive.DialogPortalProps> = (props) => {
  const [local, others] = splitProps(props, ['children'])
  return (
    <DialogPrimitive.Portal {...others}>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">{local.children}</div>
    </DialogPrimitive.Portal>
  )
}

type DialogOverlayProps<T extends ValidComponent = 'div'> =
  DialogPrimitive.DialogOverlayProps<T> & { class?: string | undefined }

const DialogOverlay = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, DialogOverlayProps<T>>,
) => {
  const [local, others] = splitProps(props as DialogOverlayProps, ['class'])
  return (
    <DialogPrimitive.Overlay
      class={cn(
        'fixed inset-0 z-50 bg-black/40 data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:animate-in data-[expanded]:fade-in-0',
        local.class,
      )}
      {...others}
    />
  )
}

type DialogContentProps<T extends ValidComponent = 'div'> =
  DialogPrimitive.DialogContentProps<T> & {
    class?: string | undefined
    children?: JSX.Element
  }

const DialogContent = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, DialogContentProps<T>>,
) => {
  const [local, others] = splitProps(props as DialogContentProps, ['class', 'children'])
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        class={cn(
          'relative z-50 grid w-full max-w-lg gap-4 rounded-xl bg-popover p-5 text-popover-foreground shadow-lg ring ring-border duration-150 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95 data-[expanded]:animate-in data-[expanded]:fade-in-0 data-[expanded]:zoom-in-95',
          local.class,
        )}
        {...others}
      >
        {local.children}
        <DialogPrimitive.CloseButton class="absolute top-4 right-4 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <svg
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
          <span class="sr-only">Close</span>
        </DialogPrimitive.CloseButton>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

const DialogHeader: Component<ComponentProps<'div'>> = (props) => {
  const [local, others] = splitProps(props, ['class'])
  return <div class={cn('flex flex-col gap-1 text-left', local.class)} {...others} />
}

const DialogFooter: Component<ComponentProps<'div'>> = (props) => {
  const [local, others] = splitProps(props, ['class'])
  return (
    <div
      class={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', local.class)}
      {...others}
    />
  )
}

type DialogTitleProps<T extends ValidComponent = 'h2'> = DialogPrimitive.DialogTitleProps<T> & {
  class?: string | undefined
}

const DialogTitle = <T extends ValidComponent = 'h2'>(
  props: PolymorphicProps<T, DialogTitleProps<T>>,
) => {
  const [local, others] = splitProps(props as DialogTitleProps, ['class'])
  return <DialogPrimitive.Title class={cn('text-base font-semibold', local.class)} {...others} />
}

type DialogDescriptionProps<T extends ValidComponent = 'p'> =
  DialogPrimitive.DialogDescriptionProps<T> & { class?: string | undefined }

const DialogDescription = <T extends ValidComponent = 'p'>(
  props: PolymorphicProps<T, DialogDescriptionProps<T>>,
) => {
  const [local, others] = splitProps(props as DialogDescriptionProps, ['class'])
  return (
    <DialogPrimitive.Description
      class={cn('text-sm text-muted-foreground', local.class)}
      {...others}
    />
  )
}

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}
