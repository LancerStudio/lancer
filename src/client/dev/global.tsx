import { createNanoEvents } from "nanoevents";
import { EditTranslation } from "./screens/EditTranslation";
import { AnimatedNav } from './lib/navigation'

const emitter = createNanoEvents()

export const Lancer = {
  emitter,
  editTranslation(name: string, locale: string, mode: 'plaintext' | 'inline' | 'block') {
    emitter.emit('navigate', (nav: AnimatedNav) =>
      <EditTranslation name={name} locale={locale} mode={mode} onClose={() => nav.close()} />
    )
  }
}

;(window as any).Lancer = Lancer
