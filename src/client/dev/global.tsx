import { createNanoEvents } from "nanoevents";
import { EditTranslation } from "./screens/EditTranslation";
import { AnimatedNav } from './lib/navigation'

const emitter = createNanoEvents()

export const Lancer = {
  emitter,
  editTranslation(name: string, locale: string, opts: { multiline: boolean, rich: boolean }) {
    emitter.emit('navigate', (nav: AnimatedNav) =>
      <EditTranslation name={name} locale={locale} onClose={() => nav.close()} {...opts} />
    )
  }
}

;(window as any).Lancer = Lancer
