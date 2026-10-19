import type { PolymorphicProps } from '@kobalte/core/polymorphic'
import * as TextFieldPrimitive from '@kobalte/core/text-field'
import type { ValidComponent } from 'solid-js'
import { splitProps } from 'solid-js'

import { cn } from '~/lib/utils'

type TextFieldRootProps<T extends ValidComponent = 'div'> =
  TextFieldPrimitive.TextFieldRootProps<T> & { class?: string | undefined }

const TextField = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, TextFieldRootProps<T>>,
) => {
  const [local, others] = splitProps(props as TextFieldRootProps, ['class'])
  return <TextFieldPrimitive.Root class={cn('flex flex-col gap-1.5', local.class)} {...others} />
}

type TextFieldInputProps<T extends ValidComponent = 'input'> =
  TextFieldPrimitive.TextFieldInputProps<T> & { class?: string | undefined }

const TextFieldInput = <T extends ValidComponent = 'input'>(
  props: PolymorphicProps<T, TextFieldInputProps<T>>,
) => {
  const [local, others] = splitProps(props as TextFieldInputProps, ['class'])
  return (
    <TextFieldPrimitive.Input
      class={cn(
        'flex h-9 w-full rounded-lg bg-card px-3 text-sm ring ring-input transition-shadow placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[invalid]:ring-destructive',
        local.class,
      )}
      {...others}
    />
  )
}

type TextFieldLabelProps<T extends ValidComponent = 'label'> =
  TextFieldPrimitive.TextFieldLabelProps<T> & { class?: string | undefined }

const TextFieldLabel = <T extends ValidComponent = 'label'>(
  props: PolymorphicProps<T, TextFieldLabelProps<T>>,
) => {
  const [local, others] = splitProps(props as TextFieldLabelProps, ['class'])
  return <TextFieldPrimitive.Label class={cn('text-sm font-medium', local.class)} {...others} />
}

type TextFieldDescriptionProps<T extends ValidComponent = 'div'> =
  TextFieldPrimitive.TextFieldDescriptionProps<T> & { class?: string | undefined }

const TextFieldDescription = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, TextFieldDescriptionProps<T>>,
) => {
  const [local, others] = splitProps(props as TextFieldDescriptionProps, ['class'])
  return (
    <TextFieldPrimitive.Description
      class={cn('text-xs text-muted-foreground', local.class)}
      {...others}
    />
  )
}

type TextFieldErrorMessageProps<T extends ValidComponent = 'div'> =
  TextFieldPrimitive.TextFieldErrorMessageProps<T> & { class?: string | undefined }

const TextFieldErrorMessage = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, TextFieldErrorMessageProps<T>>,
) => {
  const [local, others] = splitProps(props as TextFieldErrorMessageProps, ['class'])
  return (
    <TextFieldPrimitive.ErrorMessage
      class={cn('text-xs font-medium text-destructive', local.class)}
      {...others}
    />
  )
}

export { TextField, TextFieldDescription, TextFieldErrorMessage, TextFieldInput, TextFieldLabel }
