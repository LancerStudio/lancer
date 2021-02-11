import { createNanoEvents } from "nanoevents";
import { EditTranslation } from "./screens/EditTranslation";
import { AnimatedNav } from './lib/navigation'

const emitter = createNanoEvents()

export const Lancer = {
  emitter,
  onTranslationClick(e: MouseEvent) {
    if (e.altKey){
      e.preventDefault()
      const d = (e.currentTarget as any).dataset
      Lancer.editTranslation(d.tName, d.tLocale, { link: 'tLink' in d, multiline: 'tMultiline' in d, rich: 'tRich' in d })
    }
  },
  editTranslation(name: string, locale: string, opts: { link: boolean, multiline: boolean, rich: boolean }) {
    emitter.emit('navigate', (nav: AnimatedNav) =>
      <EditTranslation name={name} locale={locale} onClose={() => nav.close()} {...opts} />
    )
  },
  copyToClipboard(text: string) {
    var input = document.createElement('input')
    input.setAttribute('value', text)
    document.body.appendChild(input)
    input.select()
    var result = document.execCommand('copy')
    document.body.removeChild(input)
    return result
  },
}

;(window as any).Lancer = Lancer
