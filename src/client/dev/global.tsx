import React from 'react'
import './lib/long-press'
import { createNanoEvents } from "nanoevents";
import { EditTranslation } from "./screens/EditTranslation";
import { AnimatedNav } from './lib/navigation'

const emitter = createNanoEvents()

export const Lancer = {
  emitter,
  onTranslationClick(e: MouseEvent) {
    if (e.altKey){
      e.preventDefault()
      if (document.body.classList.contains('Lancer__select-none')) {
        // We're coming from a long press
        document.getSelection()?.removeAllRanges()
      }

      const d = (e.currentTarget as any).dataset
      Lancer.editTranslation(d.tName, d.tLocale, { link: 'tLink' in d, multiline: 'tMultiline' in d, rich: 'tRich' in d })

      setTimeout(() => {
        document.body.classList.remove('Lancer__select-none')
      }, 500)
    }
  },
  editTranslation(name: string, locale: string, opts: { link: boolean, multiline: boolean, rich: boolean }) {
    emitter.emit('navigate', (nav: AnimatedNav) =>
      <EditTranslation name={name} locale={locale} onClose={() => nav.close()} {...opts} />
    )
  },
}

;(window as any).Lancer = Lancer

for (let elem of document.querySelectorAll('[data-t-name]')) {
  // Support long press for mobile
  elem.addEventListener('long-press', () => {
    document.body.classList.add('Lancer__select-none')
    //
    // Simulate alt key to avoid duplicating logic
    //
    elem.dispatchEvent(new MouseEvent('click', {
      altKey: true,
      bubbles: false,
      cancelable: true,
    }))
  })
}
