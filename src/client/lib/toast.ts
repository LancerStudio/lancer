import m, { Vnode } from 'mithril'
import { Notification, Props as NotificationProps } from './notification'
import { Liminal } from 'mithril-machine-tools'
import { InlineComponent } from '../dev/lib/mithril-helpers'

type ToastProps = {
  id: number
  close: () => void
}
type Toast = (props: ToastProps) => Vnode<any>

type ToastStack = {
  id: number
  key?: string
  toast: Toast
}[]

type QuickToastOptions = {
  key?: string
  timed?: number | boolean
}

let stack = [] as ToastStack
let idCounter = 100

function addToast(a: string | Toast | undefined, b?: Toast) {
  const [key, toast] = !a || typeof a === 'string' ? [a, b!] as const : [undefined, a] as const
  stack = (key ? stack.filter(t => t.key !== key) : stack).concat({ id: idCounter, key, toast })
  idCounter += 1
}

function removeToast(id: number) {
  stack = stack.filter(item => item.id !== id)
}

export function quickToast(type: NotificationProps['type'], text: string, { timed=true, key }: QuickToastOptions = {}) {
  addToast(key, ({ id, close }) =>
    m(Animated, { key: id },
      InlineComponent(() => {
        if (timed) {
          setTimeout(close, 3000)
        }
        return () => m(Notification, {
          type,
          title: text,
          closeToast: close,
        })
      })
    )
  )
}


export function ToastContainer() {
  return m('div.fixed.inset-0.flex.flex-col.items-end.justify-start.pointer-events-none', {
    style: "z-index: 120",
  },
    stack.map(({ id, toast }) =>
      toast({ id, close: () => { removeToast(id); m.redraw() } })
    ),
  )
}

const Animated = Liminal({
  entry: "translate-y-0 opacity-0".split(' '),
  present: "transform transition ease-out duration-300 opacity-100 translate-y-0 translate-x-0".split(' '),
  absent: "transform transition ease-in duration-300 opacity-0 translate-y-2 sm:translate-y-0 sm:translate-x-2".split(' '),
})
