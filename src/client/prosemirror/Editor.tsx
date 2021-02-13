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
  multiline: boolean
  submitButton?: boolean
}
export function Editor(props: Options) {
  const viewRef = useRef<EditorView<any>>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(props.onChange)
  const [lastContent, setLastContent] = useState(props.content)

  useEffect(() => {
    if (props.content !== lastContent) {
      console.log("UPDATE FROM OUTSIDE", props.content)
      viewRef.current?.updateState(createState(props.content))
      setLastContent(props.content)
    }
  }, [props.content])

  useEffect(() => {
    onChangeRef.current = props.onChange
  }, [props.onChange])


  function createState(content: string) {
    const temp = document.createElement('div')
    temp.innerHTML = content
    return EditorState.create({
      doc: DOMParser.fromSchema(schemaLongform).parse(temp),
      plugins: setup({
        schema: schemaLongform,
        multiline: props.multiline,
        submitButton: !!props.submitButton,
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
    setLastContent(temp.innerHTML)
    onChangeRef.current(temp.innerHTML)
  }, 230)

  useEffect(() => {
    if (editorRef.current && !viewRef.current) {
      const editorElem = editorRef.current

      ;(viewRef as any).current = new EditorView(editorElem, {
        editable() {
          // TODO: For some reason you can still delete one character when disabled
          return editorElem.dataset.disabled !== 'true'
        },
        state: createState(props.content),
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
      viewRef.current?.destroy()
    }
  }, [])

  return <div ref={editorRef} className={props.className}></div>
}
