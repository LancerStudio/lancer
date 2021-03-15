import m from 'mithril'

type Props = {
  class?: string
}
export function Loader({ class: className }: Props = {}) {
  return m(`.Loading.Loading--custom-color`, { class: className })
}
