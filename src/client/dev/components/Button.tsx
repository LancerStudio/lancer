
type Props = {
  title: string

  size?: 'xs' | 'sm' | 'md' | 'lg' | null
  color?: 'primary' | 'secondary'
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  className?: string
}
export function Button({ loading=false, disabled=false, size='md', color, title, onClick, className }: Props) {
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
      ? 'bg-gray-300 cursor-not-allowed'
      : 'bg-primary-600 hover:bg-primary-700 dark:hover:bg-primary-500'
  }
  else if (color === 'secondary') {
    textColor = 'text-blue-100 dark:text-blue-200'
    btnColor = disabled
      ? 'bg-gray-300 cursor-not-allowed'
      : 'bg-blue-400 dark:bg-blue-700 hover:bg-blue-500 dark:hover:bg-blue-600'
  }
  else {
    textColor = 'text-gray-900'
    btnColor = disabled
      ? 'bg-gray-300 cursor-not-allowed'
      : 'bg-gray-300'
  }

  return (
    <button
      className={`${className} ${textColor} ${btnColor} ${dims} ${loading ? 'Loading' : ''} relative inline-flex items-center border border-transparent rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
      onClick={onClick}
    >
      {title}
    </button>
  )
}
