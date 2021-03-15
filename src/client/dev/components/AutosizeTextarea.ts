import m from 'mithril'
import autosize from 'autosize'
import { cc } from '../lib/mithril-helpers'

type Attrs = {
  [property: string]: any;
}
export const AutosizeTextarea = cc<Attrs>(function () {
  this.oncreate(vnode => autosize(vnode.dom))
  return (attrs) => m('textarea', { ...attrs, rows: 1 })
})
