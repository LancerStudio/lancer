
declare module 'mithril-machine-tools' {
  import { Component, ClassComponent, FactoryComponent } from 'mithril'

  class LiveComponent extends ClassComponent {}
  export const Static: Component<(Live: LiveComponent) => Vnode>

  type LiminalParams = {
    entry?: string | string[]
    exit?: string | string[]
    absent?: string | string[]
    present?: string | string[]
    blocking?: boolean
  }
  export const Liminal: ((params: LiminalParams) => Component)

  type InlineParams = FactoryComponent<any>
  export const Inline: Component<InlineParams>
}
