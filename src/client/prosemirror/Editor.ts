import m from 'mithril'
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {DOMParser, DOMSerializer, Node} from "prosemirror-model"
import {setup} from "./index"
import {schemaLongform} from "./schema"
import { debounce } from "../dev/lib/util"
import { cc } from '../dev/lib/mithril-helpers'
import { uniques } from '../dev/lib/streams'

type Attrs = {
  content: string
  onChange: (content: string) => void
  class?: string
  multiline: boolean
  submitButton?: boolean
}
export const Editor = cc<Attrs>(function(attrs) {

  let editorView = null as null | EditorView<any>

  const lastContent$ = attrs.map(a => a.content)

  lastContent$.map(uniques()).map(content => {
    console.log("UPDATE FROM OUTSIDE", content)
    editorView?.updateState(createState(content))
  })

  function createState(content: string) {
    const temp = document.createElement('div')
    temp.innerHTML = content
    return EditorState.create({
      doc: DOMParser.fromSchema(schemaLongform).parse(temp),
      plugins: setup({
        schema: schemaLongform,
        multiline: attrs().multiline,
        submitButton: !!attrs().submitButton,
      })
    })
  }

  const syncInput = debounce(doc => {
    const content = doc.toJSON()
    const temp = document.createElement('div')
    let contentNode = Node.fromJSON(schemaLongform, content)
    // Types don't seem to be correct
    // @ts-ignore
    DOMSerializer.fromSchema(schemaLongform).serializeFragment(contentNode.content, {}, temp)
    lastContent$(temp.innerHTML)
    attrs().onChange(temp.innerHTML)
  }, 230)

  this.oncreate(vnode => {
    const editorElem = vnode.dom as HTMLElement

    editorView = new EditorView(editorElem, {
      editable() {
        // TODO: For some reason you can still delete one character when disabled
        return editorElem.dataset.disabled !== 'true'
      },
      state: createState(attrs().content),
      dispatchTransaction(tx) {
        if (!editorView) return
        const { state } = editorView.state.applyTransaction(tx)
        editorView.updateState(state)
        if (tx.docChanged) {
          syncInput(tx.doc)
        }
      },
    })

    this.onremove.unsub = () => editorView?.destroy()
  })

  return () => m('div', { class: attrs().class })
})
