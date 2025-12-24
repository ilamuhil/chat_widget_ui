import type { SVGProps } from 'react'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'children'> & {
  title?: string
}

export function IconEmail(props: IconProps) {
  const { title, ...rest } = props
  return (
    <svg viewBox='0 0 24 24' width='16' height='16' aria-hidden={title ? undefined : true} {...rest}>
      {title ? <title>{title}</title> : null}
      <path
        fill='currentColor'
        d='M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4.12l-8 4.88l-8-4.88V6l8 4.88L20 6v2.12Z'
      />
    </svg>
  )
}

export function IconFullscreen(props: IconProps) {
  const { title, ...rest } = props
  return (
    <svg viewBox='0 0 24 24' width='16' height='16' aria-hidden={title ? undefined : true} {...rest}>
      {title ? <title>{title}</title> : null}
      <path
        fill='currentColor'
        d='M8 3H5a2 2 0 0 0-2 2v3a1 1 0 1 0 2 0V5h3a1 1 0 1 0 0-2Zm11 0h-3a1 1 0 1 0 0 2h3v3a1 1 0 1 0 2 0V5a2 2 0 0 0-2-2ZM5 16a1 1 0 0 0-2 0v3a2 2 0 0 0 2 2h3a1 1 0 1 0 0-2H5v-3Zm16 0a1 1 0 1 0-2 0v3h-3a1 1 0 1 0 0 2h3a2 2 0 0 0 2-2v-3Z'
      />
    </svg>
  )
}

export function IconClose(props: IconProps) {
  const { title, ...rest } = props
  return (
    <svg viewBox='0 0 24 24' width='16' height='16' aria-hidden={title ? undefined : true} {...rest}>
      {title ? <title>{title}</title> : null}
      <path
        fill='currentColor'
        d='M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59L7.11 5.7A1 1 0 1 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z'
      />
    </svg>
  )
}

export function IconPaperclip(props: IconProps) {
  const { title, ...rest } = props
  return (
    <svg viewBox='0 0 24 24' width='16' height='16' aria-hidden={title ? undefined : true} {...rest}>
      {title ? <title>{title}</title> : null}
      <path
        fill='currentColor'
        d='M16.5 6.5l-7.78 7.78a2.5 2.5 0 1 0 3.54 3.54l8.13-8.13a4 4 0 0 0-5.66-5.66L7.6 10.17a5.5 5.5 0 0 0 7.78 7.78l6.01-6.01a1 1 0 0 0-1.41-1.41l-6.01 6.01a3.5 3.5 0 1 1-4.95-4.95l6.13-6.13a2 2 0 0 1 2.83 2.83l-8.13 8.13a.5.5 0 0 1-.71-.71l7.78-7.78a1 1 0 0 0-1.42-1.42Z'
      />
    </svg>
  )
}

export function IconSend(props: IconProps) {
  const { title, ...rest } = props
  return (
    <svg viewBox='0 0 24 24' width='16' height='16' aria-hidden={title ? undefined : true} {...rest}>
      {title ? <title>{title}</title> : null}
      <path
        fill='currentColor'
        d='M3.4 20.2l18.1-8.1c.7-.3.7-1.4 0-1.7L3.4 2.3c-.7-.3-1.5.4-1.2 1.2L4.6 10l8.8 2l-8.8 2l-2.4 6.5c-.3.8.5 1.5 1.2 1.2Z'
      />
    </svg>
  )
}


