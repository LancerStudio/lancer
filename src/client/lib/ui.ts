
type TextInputProps = {
  hasError?: boolean
  noRounded?: boolean
}
export const textInputClass = ({ hasError, noRounded }: TextInputProps = {}) => {
  let color =
    hasError ? 'text-red-900 border-red-300 focus:border-red-500 focus:ring-red-500 placeholder-red-300' :
    'text-gray-900 focus:border-gray-600 focus:ring-gray-600 placeholder-gray-500 border-transparent'

  return `
    bg-gray-50 border appearance-none relative block w-full px-3 py-2 rounded-t-md focus:outline-none focus:z-10
    ${color}
    ${noRounded ? '' : 'rounded-md'}
  `
}
