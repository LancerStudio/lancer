import { createContext, useContext, useState } from 'react'
import { Notification, Props as NotificationProps } from '../dev/notification'

type ToastProps = {
  id: number
  close: () => void
}
type Toast = (props: ToastProps) => React.ReactNode

type ToastStack = {
  id: number
  key?: string
  toast: Toast
}[]

type QuickToastOptions = {
  key?: string
  timed?: number | boolean
}

const ToastContext = createContext({
  toasts: [] as ToastStack,
  addToast: (() => {}) as ((toast: Toast) => void) & ((key: string | undefined, toast: Toast) => void),
  removeToast(_id: number): void { throw new Error('No <ToastProvider> provided') },
})

export function useToasts() {
  const ctx = useContext(ToastContext)
  return {
    ...ctx,
    quickToast(type: NotificationProps['type'], text: string, { timed=true, key }: QuickToastOptions = {}) {
      ctx.addToast(key, ({ id, close }) =>
        <Notification
          key={id}
          closeToast={close}
          type={type}
          title={text}
          timed={timed}
        />
      )

    },
  }
}

let idCounter = 100
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<ToastStack>([])

  const context = {
    toasts: stack,
    addToast(a: string | Toast | undefined, b?: Toast) {
      const [key, toast] = !a || typeof a === 'string' ? [a, b!] as const : [undefined, a] as const
      setStack(stack =>
        (key ? stack.filter(t => t.key !== key) : stack)
          .concat({ id: idCounter, key, toast })
      )
      idCounter += 1
    },
    removeToast(id: number) {
      setStack(stack => stack.filter(item => item.id !== id))
    },
  }

  return <ToastContext.Provider value={context}>
    {children}
  </ToastContext.Provider>
}

export function ToastContainer() {
  const { toasts, removeToast } = useToasts()
  return (
    <div
      className="fixed inset-0 flex flex-col items-end justify-start pointer-events-none"
      style={{ zIndex: 120 }}
    >
      {toasts.map(({ id, toast }) =>
        toast({ id, close: () => removeToast(id) })
      )}
    </div>
  )
}
