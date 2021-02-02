import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {DOMParser, DOMSerializer, Node} from "prosemirror-model"
import {setup} from "./index"
import {schemaLongform} from "./schema"
import { debounce } from "../dev/lib/util"
import { useEffect, useRef, useState } from "react"

type Options = {
  content: string
  onChange: (content: string) => void
  className?: string
  submitButton?: boolean
}
export function Editor(options: Options) {
  const viewRef = useRef<EditorView<any>>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const [lastContent, setLastContent] = useState(options.content)

  useEffect(() => {
    if (options.content !== lastContent) {
      console.log("UPDATE FROM OUTSIDE", options.content)
      viewRef.current?.updateState(createState(options.content))
      setLastContent(options.content)
    }
  }, [options.content])

  // window.e = editorElem
  // const inputElem = editorElem.previousElementSibling



  function createState(content: string) {
    const temp = document.createElement('div')
    temp.innerHTML = content
    return EditorState.create({
      doc: DOMParser.fromSchema(schemaLongform).parse(temp),
      plugins: setup({
        schema: schemaLongform,
        submitButton: !!options.submitButton,
      })
    })
  }

  const syncInput = debounce(doc => {
    const content = doc.toJSON()
    const temp = document.createElement('div')
    let contentNode = Node.fromJSON(schemaLongform, content)
    DOMSerializer.fromSchema(schemaLongform).serializeFragment(contentNode.content, {}, temp)
    setLastContent(temp.innerHTML)
    options.onChange(temp.innerHTML)
  }, 230)

  useEffect(() => {
    console.log('...',editorRef.current, viewRef.current)
    if (editorRef.current && !viewRef.current) {
      const editorElem = editorRef.current

      ;(viewRef as any).current = new EditorView(editorElem, {
        editable() {
          // TODO: For some reason you can still delete one character when disabled
          return editorElem.dataset.disabled !== 'true'
        },
        state: createState(options.content),
        dispatchTransaction(tx) {
          if (!viewRef.current) return
          const { state } = viewRef.current.state.applyTransaction(tx)
          viewRef.current.updateState(state)
          if (tx.docChanged) {
            syncInput(tx.doc)
          }
        },
      })
    }
    return () => {}
  }, [editorRef.current])

  useEffect(() => {
    return () => {
      console.log("DESTROY")
      viewRef.current?.destroy()
    }
  }, [])

  return <div ref={editorRef} className={options.className}></div>
}
