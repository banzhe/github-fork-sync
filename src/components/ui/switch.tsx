import type { PolymorphicProps } from '@kobalte/core/polymorphic'
import * as SwitchPrimitive from '@kobalte/core/switch'
import type { JSX, ValidComponent } from 'solid-js'
import { splitProps } from 'solid-js'

import { cn } from '~/lib/utils'

const Switch = SwitchPrimitive.Root
const SwitchDescription = SwitchPrimitive.Description
const SwitchErrorMessage = SwitchPrimitive.ErrorMessage

type SwitchControlProps<T extends ValidComponent = 'input'> =
  SwitchPrimitive.SwitchControlProps<T> & {
    class?: string | undefined
    children?: JSX.Element
  }

const SwitchControl = <T extends ValidComponent = 'input'>(
  props: PolymorphicProps<T, SwitchControlProps<T>>,
) => {
  const [local, others] = splitProps(props as SwitchControlProps, ['class', 'children'])
  return (
    <>
      <SwitchPrimitive.Input class="peer" />
      <SwitchPrimitive.Control
        class={cn(
          'inline-flex h-4.5 w-9 shrink-0 cursor-pointer items-center rounded-[5px] bg-muted ring ring-input transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring data-[checked]:bg-primary data-[checked]:ring-primary-edge data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
          local.class,
        )}
        {...others}
      >
        {local.children}
      </SwitchPrimitive.Control>
    </>
  )
}

type SwitchThumbProps<T extends ValidComponent = 'div'> = SwitchPrimitive.SwitchThumbProps<T> & {
  class?: string | undefined
}

const SwitchThumb = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, SwitchThumbProps<T>>,
) => {
  const [local, others] = splitProps(props as SwitchThumbProps, ['class'])
  return (
    <SwitchPrimitive.Thumb
      class={cn(
        'pointer-events-none block h-4.5 w-4.5 translate-x-0 rounded-[5px] bg-card shadow-thumb transition-transform duration-150 data-[checked]:translate-x-[18px] data-[checked]:bg-white',
        local.class,
      )}
      {...others}
    />
  )
}

type SwitchLabelProps<T extends ValidComponent = 'label'> = SwitchPrimitive.SwitchLabelProps<T> & {
  class?: string | undefined
}

const SwitchLabel = <T extends ValidComponent = 'label'>(
  props: PolymorphicProps<T, SwitchLabelProps<T>>,
) => {
  const [local, others] = splitProps(props as SwitchLabelProps, ['class'])
  return <SwitchPrimitive.Label class={cn('text-sm font-medium', local.class)} {...others} />
}

export { Switch, SwitchControl, SwitchDescription, SwitchErrorMessage, SwitchLabel, SwitchThumb }
