
type Props = {
  title: string

  size?: 'xs' | 'sm' | 'md' | 'lg' | null
  block?: boolean
  color?: 'primary' | 'secondary'
  onClick?: () => void
  loading?: boolean
  disabled?: boolean
  className?: string
  formSubmit?: boolean
}
export function Button({ loading=false, disabled=false, size='md', color, title, onClick, formSubmit, block=true, className='' }: Props) {
  const dims =
    // size === 'lg' ? 'py-2 px-4 text-sm font-medium' :
    size === 'md' ? 'py-2 px-4 text-sm font-medium' :
    // size === 'sm' ? 'py-2 px-4 text-sm font-medium' :
    // size === 'xs' ? 'py-2 px-4 text-sm font-medium' :
    ''

  let textColor, btnColor
  if (color === 'primary') {
    textColor = 'text-white'
    btnColor = disabled
      ? 'bg-gray-400 cursor-not-allowed'
      : 'text-gray-100 bg-gray-800 hover:bg-gray-900'
  }
  else if (color === 'secondary') {
    textColor = 'text-blue-100 '
    btnColor = disabled
      ? 'bg-gray-400 cursor-not-allowed'
      : 'bg-blue-400'
  }
  else {
    textColor = 'text-gray-900'
    btnColor = disabled
      ? 'bg-gray-400 cursor-not-allowed'
      : 'bg-gray-400'
  }

  return (
    <button
      type={formSubmit ? 'submit' : 'button'}
      className={`${className} ${textColor} ${btnColor} ${dims} ${loading ? 'Loading' : ''} ${
        block ? 'block' : 'inline-flex items-center'
      } relative border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
      onClick={onClick}
    >
      {title}
    </button>
  )
}
