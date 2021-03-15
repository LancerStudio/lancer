import m from 'mithril'

type Attrs = {
  title: string

  href?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | null
  block?: boolean
  color?: 'primary' | 'secondary'
  onclick?: () => void
  loading?: boolean
  disabled?: boolean
  class?: string
  formSubmit?: boolean
}
export function Button({ href, loading=false, disabled=false, size='md', color, title, onclick, formSubmit, block=true, class: className='' }: Attrs) {
  const dims =
    // size === 'lg' ? 'py-2 px-4 text-sm font-medium' :
    size === 'md' ? 'py-2 px-4 text-sm font-medium' :
    size === 'sm' ? 'py-1 px-3 text-sm font-medium' :
    // size === 'xs' ? 'py-2 px-4 text-sm font-medium' :
    ''

  let btnColor
  if (color === 'primary') {
    btnColor = disabled
      ? 'text-gray-200 bg-gray-400 cursor-not-allowed'
      : 'text-gray-100 bg-gray-800 hover:bg-gray-900'
  }
  else if (color === 'secondary') {
    btnColor = disabled
      ? 'text-gray-200 bg-gray-400 cursor-not-allowed'
      : 'text-gray-50 bg-gray-500'
  }
  else {
    btnColor = disabled
      ? 'text-gray-200 bg-gray-400 cursor-not-allowed'
      : 'bg-gray-400'
  }

  const tag = href ? 'a' : 'button'

  return (
    m(tag, {
      href,
      onclick,
      type:
        href ? undefined :
        formSubmit ? 'submit' :
        'button'
      ,
      class:
        `${className} ${btnColor} ${dims} ${loading ? 'Loading' : ''} ${
          block ? 'block' : 'inline-flex items-center'
        } relative border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`
      ,
    }, title)
  )
}
