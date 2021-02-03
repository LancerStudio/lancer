
type Props = {
  className?: string
}
export function Loader({ className }: Props) {
  return <div
    className={`Loading Loading--custom-color ${className}`}
  ></div>
}
