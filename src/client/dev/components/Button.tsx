
type Props = {
  title: string

  href?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | null
  block?: boolean
  color?: 'primary' | 'secondary'
  onClick?: () => void
  loading?: boolean
  disabled?: boolean
  className?: string
  formSubmit?: boolean
}
export function Button({ href, loading=false, disabled=false, size='md', color, title, onClick, formSubmit, block=true, className='' }: Props) {
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

  const Tag = href ? 'a' : 'button'

  return (
    <Tag
      href={href}
      type={
        href ? undefined :
        formSubmit ? 'submit' :
        'button'
      }
      className={`${className} ${btnColor} ${dims} ${loading ? 'Loading' : ''} ${
        block ? 'block' : 'inline-flex items-center'
      } relative border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
      onClick={onClick}
    >
      {title}
    </Tag>
  )
}
