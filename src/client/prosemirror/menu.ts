import {wrapItem, Dropdown, DropdownSubmenu, liftItem, icons, MenuItem, MenuItemSpec} from "prosemirror-menu"
import {undo, redo} from "prosemirror-history"
import {EditorState} from "prosemirror-state"
import {toggleMark} from "prosemirror-commands"
import {wrapInList} from "prosemirror-schema-list"
import {Schema, MarkType, NodeType} from "prosemirror-model"

// Helpers to create specific types of items

// function canInsert(state, nodeType) {
//   let $from = state.selection.$from
//   for (let d = $from.depth; d >= 0; d--) {
//     let index = $from.index(d)
//     if ($from.node(d).canReplaceWith(index, index, nodeType)) return true
//   }
//   return false
// }

// function insertImageItem(nodeType) {
//   return new MenuItem({
//     title: "Insert image",
//     label: "Image",
//     enable(state) { return canInsert(state, nodeType) },
//     run(state, _, view) {
//       let {from, to} = state.selection, attrs = null
//       if (state.selection instanceof NodeSelection && state.selection.node.type == nodeType)
//         attrs = state.selection.node.attrs
//       openPrompt({
//         title: "Insert image",
//         fields: {
//           src: new TextField({label: "Location", required: true, value: attrs && attrs.src}),
//           title: new TextField({label: "Title", value: attrs && attrs.title}),
//           alt: new TextField({label: "Description",
//                               value: attrs ? attrs.alt : state.doc.textBetween(from, to, " ")})
//         },
//         callback(attrs) {
//           view.dispatch(view.state.tr.replaceSelectionWith(nodeType.createAndFill(attrs)))
//           view.focus()
//         }
//       })
//     }
//   })
// }

function cmdItem(cmd: (state: EditorState) => boolean, options: any) {
  let passedOptions: MenuItemSpec = {
    label: options.title,
    run: cmd
  }
  for (let prop in options) passedOptions[prop  as keyof MenuItemSpec] = options[prop]
  if ((!options.enable || options.enable === true) && !options.select)
    passedOptions[options.enable ? "enable" : "select"] = (state: EditorState) => cmd(state)

  return new MenuItem(passedOptions)
}

function markActive(state: EditorState, type: MarkType): boolean {
  let {from, $from, to, empty} = state.selection
  if (empty) return !!type.isInSet(state.storedMarks || $from.marks())
  else return state.doc.rangeHasMark(from, to, type)
}

function markItem(markType: MarkType, options: any) {
  let passedOptions: Record<string,any> = {
    active(state: EditorState) { return markActive(state, markType) },
    enable: true
  }
  for (let prop in options) passedOptions[prop] = options[prop]
  return cmdItem(toggleMark(markType), passedOptions)
}

function linkItem(markType: MarkType) {
  return new MenuItem({
    title: "Add or remove link",
    icon: icons.link,
    active(state) { return markActive(state, markType) },
    enable(state) { return !state.selection.empty },
    run(state, dispatch, view) {
      console.log('Link item', view)
      if (markActive(state, markType)) {
        toggleMark(markType)(state, dispatch)
        return true
      }
      return
      // openPrompt({
      //   title: "Create a link",
      //   fields: {
      //     href: new TextField({
      //       label: "Link target",
      //       required: true
      //     }),
      //     title: new TextField({label: "Title"})
      //   },
      //   callback(attrs) {
      //     toggleMark(markType, attrs)(view.state, view.dispatch)
      //     view.focus()
      //   }
      // })
    }
  })
}

function wrapListItem(nodeType: NodeType, options: any) {
  return cmdItem(wrapInList(nodeType, options.attrs), options)
}

const customIcons = {
  strong: {
    width: 24,
    height: 24,
    path: `M15.6 11.8c1-.7 1.6-1.8 1.6-2.8a4 4 0 00-4-4H7v14h7c2.1 0 3.7-1.7 3.7-3.8 0-1.5-.8-2.8-2.1-3.4zM10 7.5h3a1.5 1.5 0 110 3h-3v-3zm3.5 9H10v-3h3.5a1.5 1.5 0 110 3z`
  },
  em: {
    width: 24,
    height: 24,
    path: `M10 5v3h2.2l-3.4 8H6v3h8v-3h-2.2l3.4-8H18V5h-8z`
  },
  undo: {
    width: 24,
    height: 24,
    path: `M12.5 8c-2.6 0-5 1-6.9 2.6L2 7v9h9l-3.6-3.6A8 8 0 0120 16l2.4-.8a10.5 10.5 0 00-10-7.2z`
  },
  redo: {
    width: 24,
    height: 24,
    path: `M18.4 10.6a10.5 10.5 0 00-16.9 4.6L4 16a8 8 0 0112.7-3.6L13 16h9V7l-3.6 3.6z`
  },
  blockquote: {
    width: 24,
    height: 24,
    path: `M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z`
  },
  submit: {
    width: 24,
    height: 28,
    path: `M0.4,18.4c0,0-0.1,0-0.1-0.1c-0.2-0.2-0.3-0.6-0.2-1L3.4,10L0,2.5c-0.1-0.3,0-0.6,0.2-0.8s0.6-0.3,0.8-0.2l18.4,7.7 C19.8,9.3,20,9.6,20,9.9c0,0.3-0.2,0.6-0.5,0.7L1.2,18.6C0.9,18.7,0.6,18.7,0.4,18.4z`
  },
}

// :: (Schema) → Object
// Given a schema, look for default mark and node types in it and
// return an object with relevant menu items relating to those marks:
//
// **`toggleStrong`**`: MenuItem`
//   : A menu item to toggle the [strong mark](#schema-basic.StrongMark).
//
// **`toggleEm`**`: MenuItem`
//   : A menu item to toggle the [emphasis mark](#schema-basic.EmMark).
//
// **`toggleCode`**`: MenuItem`
//   : A menu item to toggle the [code font mark](#schema-basic.CodeMark).
//
// **`toggleLink`**`: MenuItem`
//   : A menu item to toggle the [link mark](#schema-basic.LinkMark).
//
// **`insertImage`**`: MenuItem`
//   : A menu item to insert an [image](#schema-basic.Image).
//
// **`wrapBulletList`**`: MenuItem`
//   : A menu item to wrap the selection in a [bullet list](#schema-list.BulletList).
//
// **`wrapOrderedList`**`: MenuItem`
//   : A menu item to wrap the selection in an [ordered list](#schema-list.OrderedList).
//
// **`wrapBlockQuote`**`: MenuItem`
//   : A menu item to wrap the selection in a [block quote](#schema-basic.BlockQuote).
//
// **`makeParagraph`**`: MenuItem`
//   : A menu item to set the current textblock to be a normal
//     [paragraph](#schema-basic.Paragraph).
//
// **`makeCodeBlock`**`: MenuItem`
//   : A menu item to set the current textblock to be a
//     [code block](#schema-basic.CodeBlock).
//
// **`makeHead[N]`**`: MenuItem`
//   : Where _N_ is 1 to 6. Menu items to set the current textblock to
//     be a [heading](#schema-basic.Heading) of level _N_.
//
// **`insertHorizontalRule`**`: MenuItem`
//   : A menu item to insert a horizontal rule.
//
// The return value also contains some prefabricated menu elements and
// menus, that you can use instead of composing your own menu from
// scratch:
//
// **`insertMenu`**`: Dropdown`
//   : A dropdown containing the `insertImage` and
//     `insertHorizontalRule` items.
//
// **`typeMenu`**`: Dropdown`
//   : A dropdown containing the items for making the current
//     textblock a paragraph, code block, or heading.
//
// **`fullMenu`**`: [[MenuElement]]`
//   : An array of arrays of menu elements for use as the full menu
//     for, for example the [menu bar](https://github.com/prosemirror/prosemirror-menu#user-content-menubar).
type Options = {
  submitButton?: boolean
}
export function buildMenuItems(schema: Schema<any>, options: Options) {
  let r: any = {}, type
  if (type = schema.marks.strong)
    r.toggleStrong = markItem(type, {title: "Toggle strong style", icon: customIcons.strong})
  if (type = schema.marks.em)
    r.toggleEm = markItem(type, {title: "Toggle emphasis", icon: customIcons.em})
  if (type = schema.marks.code)
    r.toggleCode = markItem(type, {title: "Toggle code font", icon: icons.code})
  if (type = schema.marks.link)
    r.toggleLink = linkItem(type)

  // if (type = schema.nodes.image)
  //   r.insertImage = insertImageItem(type)
  if (type = schema.nodes.bullet_list)
    r.wrapBulletList = wrapListItem(type, {
      title: "Wrap in bullet list",
      icon: icons.bulletList
    })
  if (type = schema.nodes.ordered_list)
    r.wrapOrderedList = wrapListItem(type, {
      title: "Wrap in ordered list",
      icon: icons.orderedList
    })
  if (type = schema.nodes.blockquote)
    r.wrapBlockQuote = wrapItem(type, {
      title: "Wrap in block quote",
      icon: customIcons.blockquote
    })

  r.undo = new MenuItem({
    title: "Undo last change",
    run: undo,
    enable: state => undo(state),
    icon: customIcons.undo
  })

  r.redo = new MenuItem({
    title: "Redo last undone change",
    run: redo,
    enable: state => redo(state),
    icon: customIcons.redo
  })

  r.submit = new MenuItem({
    title: "Submit",
    run(_state, _dispatch) {
      console.log("TODO")
    },
    enable: (state) => {
      return state.doc.textBetween(0, state.doc.content.size).trim().length > 0
    },
    icon: customIcons.submit,
    class: 'prosemirror-send-icon'
  })
  // if (type = schema.nodes.paragraph)
  //   r.makeParagraph = blockTypeItem(type, {
  //     title: "Change to paragraph",
  //     label: "Plain"
  //   })
  // if (type = schema.nodes.code_block)
  //   r.makeCodeBlock = blockTypeItem(type, {
  //     title: "Change to code block",
  //     label: "Code"
  //   })
  // if (type = schema.nodes.heading)
  //   for (let i = 1; i <= 10; i++)
  //     r["makeHead" + i] = blockTypeItem(type, {
  //       title: "Change to heading " + i,
  //       label: "Level " + i,
  //       attrs: {level: i}
  //     })
  // if (type = schema.nodes.horizontal_rule) {
  //   let hr = type
  //   r.insertHorizontalRule = new MenuItem({
  //     title: "Insert horizontal rule",
  //     label: "Horizontal rule",
  //     enable(state) { return canInsert(state, hr) },
  //     run(state, dispatch) { dispatch(state.tr.replaceSelectionWith(hr.create())) }
  //   })
  // }

  let cut = <T>(arr: T[]) => arr.filter(x => x)
  // r.insertMenu = new Dropdown(cut([r.insertImage, r.insertHorizontalRule]), {label: "Insert"})
  r.typeMenu = new Dropdown(cut([r.makeParagraph, r.makeCodeBlock, r.makeHead1 && new DropdownSubmenu(cut([
    r.makeHead1, r.makeHead2, r.makeHead3, r.makeHead4, r.makeHead5, r.makeHead6
  ]), {label: "Heading"})]), {label: "Type..."})

  // r.inlineMenu = [cut([r.toggleStrong, r.toggleEm, r.toggleCode, r.toggleLink])]
  // r.blockMenu = [cut([r.wrapBulletList, r.wrapOrderedList, r.wrapBlockQuote, joinUpItem, liftItem])]
  // r.fullMenu = r.inlineMenu.concat([[r.insertMenu, r.typeMenu]], [[r.undo, r.redo]], r.blockMenu)
  // r.fullMenu = [].concat(r.inlineMenu.concat(r.blockMenu), [[r.undo, r.redo]])
  r.fullMenu = [
    cut([r.toggleStrong, r.toggleEm, r.wrapBlockQuote, liftItem]),
    [r.undo, r.redo].concat(options.submitButton ? [r.submit] : [])
  ]

  return r
}
