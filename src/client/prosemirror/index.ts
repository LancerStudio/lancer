import {keymap} from "prosemirror-keymap"
import {history} from "prosemirror-history"
import {baseKeymap} from "prosemirror-commands"
import {Plugin} from "prosemirror-state"
import {dropCursor} from "prosemirror-dropcursor"
import {gapCursor} from "prosemirror-gapcursor"
import {menuBar} from "prosemirror-menu"
import {Schema} from "prosemirror-model"

import {buildMenuItems} from "./menu"
import {buildKeymap} from "./keymap"
import {buildInputRules} from "./inputrules"


export {buildMenuItems, buildKeymap, buildInputRules}

// !! This module exports helper functions for deriving a set of basic
// menu items, input rules, or key bindings from a schema. These
// values need to know about the schema for two reasons—they need
// access to specific instances of node and mark types, and they need
// to know which of the node and mark types that they know about are
// actually present in the schema.
//
// The `exampleSetup` plugin ties these together into a plugin that
// will automatically enable this basic functionality in an editor.

// :: (Object) → [Plugin]
// A convenience plugin that bundles together a simple menu with basic
// key bindings, input rules, and styling for the example schema.
// Probably only useful for quickly setting up a passable
// editor—you'll need more control over your settings in most
// real-world situations.
//
type Options = {
  schema: Schema
  floatingMenu?: boolean
  submitButton?: boolean
}
export function setup(options: Options) {
  let plugins = [
    // new Plugin({
    //   props: {
    //     handleKeyDown(_view, e) {
    //       if (e.key == "Enter" && e.metaKey && options.submitButton !== false) {
    //         e.preventDefault()
    //       }
    //     }
    //   }
    // }),
    buildInputRules(options.schema),
    keymap(buildKeymap(options.schema)),
    keymap(baseKeymap),
    dropCursor(),
    gapCursor(),
    menuBar({
      floating: options.floatingMenu !== false,
      content: buildMenuItems(
        options.schema,
        {
          submitButton: options.submitButton !== false,
        }
      ).fullMenu,
    }),
    history(),
  ]

  return plugins.concat(new Plugin({
    props: {
      attributes: {class: "prose dark:prose-dark"}
    }
  }))
}
