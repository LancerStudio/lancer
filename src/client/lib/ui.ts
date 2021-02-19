
type TextInputProps = {
  hasError?: boolean
  noBorder?: boolean
  noRounded?: boolean
}
export const textInputClass = ({ noBorder, hasError, noRounded }: TextInputProps = {}) => {
  let color =
    hasError ? 'text-red-900 border-red-300 focus:border-red-500 focus:ring-red-500 placeholder-red-300' :
    `text-gray-900 ${noBorder ? 'border-transparent' : 'border-gray-400'} focus:border-gray-600 focus:ring-gray-600 placeholder-gray-500`

  return `
    bg-gray-50 border appearance-none relative block w-full px-3 py-2 focus:outline-none focus:z-10
    ${color}
    ${noRounded ? '' : 'rounded-md'}
  `
}

type SelectProps = {
  noBorder?: boolean
}
export const selectClass = ({ noBorder }: SelectProps = {}) => {
  return `block pl-3 pr-10 py-2 text-base bg-gray-50 ${noBorder ? 'border-transparent' : 'border-gray-300'} focus:outline-none focus:ring-gray-600 focus:border-gray-600 rounded-md`
}
