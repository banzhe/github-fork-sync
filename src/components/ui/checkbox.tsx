import * as CheckboxPrimitive from '@kobalte/core/checkbox'
import type { PolymorphicProps } from '@kobalte/core/polymorphic'
import type { ValidComponent } from 'solid-js'
import { splitProps } from 'solid-js'

import { cn } from '~/lib/utils'

const Checkbox = CheckboxPrimitive.Root
const CheckboxDescription = CheckboxPrimitive.Description

type CheckboxControlProps<T extends ValidComponent = 'div'> =
  CheckboxPrimitive.CheckboxControlProps<T> & { class?: string | undefined }

const CheckboxControl = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, CheckboxControlProps<T>>,
) => {
  const [local, others] = splitProps(props as CheckboxControlProps, ['class'])
  return (
    <>
      <CheckboxPrimitive.Input class="peer" />
      <CheckboxPrimitive.Control
        class={cn(
          'flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm bg-card ring ring-input transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring data-[checked]:bg-primary data-[checked]:text-primary-foreground data-[checked]:ring-primary-edge data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
          local.class,
        )}
        {...others}
      >
        <CheckboxPrimitive.Indicator>
          <svg
            class="size-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Control>
    </>
  )
}

type CheckboxLabelProps<T extends ValidComponent = 'label'> =
  CheckboxPrimitive.CheckboxLabelProps<T> & { class?: string | undefined }

const CheckboxLabel = <T extends ValidComponent = 'label'>(
  props: PolymorphicProps<T, CheckboxLabelProps<T>>,
) => {
  const [local, others] = splitProps(props as CheckboxLabelProps, ['class'])
  return <CheckboxPrimitive.Label class={cn('text-sm font-medium', local.class)} {...others} />
}

export { Checkbox, CheckboxControl, CheckboxDescription, CheckboxLabel }
