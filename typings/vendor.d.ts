
declare module 'express/node_modules/path-to-regexp/index.js';
declare module 'langs';
declare module 'n-readlines';
declare module 'postcss-import';
declare module 'postcss-prefix-selector';
declare module 'posthtml/lib/api.js';
declare module 'posthtml-match-helper';
declare module 'tailwindcss';

declare module 'url-join' {
  const f: (a: string, b: string) => string
  export default f
}

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
