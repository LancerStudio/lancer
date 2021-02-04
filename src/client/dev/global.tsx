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
      Lancer.editTranslation(d.tName, d.tLocale, { multiline: 'tMultiline' in d, rich: 'tRich' in d })
    }
  },
  editTranslation(name: string, locale: string, opts: { multiline: boolean, rich: boolean }) {
    emitter.emit('navigate', (nav: AnimatedNav) =>
      <EditTranslation name={name} locale={locale} onClose={() => nav.close()} {...opts} />
    )
  }
}

;(window as any).Lancer = Lancer
