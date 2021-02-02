import { createContext, useContext, useState } from 'react'
import { Notification, Props as NotificationProps } from '../notification'

type ToastProps = {
  id: number
  close: () => void
}
type Toast = (props: ToastProps) => React.ReactNode

type ToastStack = {
  id: number
  toast: Toast
}[]

const ToastContext = createContext({
  toasts: [] as ToastStack,
  addToast(_toast: Toast): void { throw new Error('No <ToastProvider> provided') },
  removeToast(_id: number): void { throw new Error('No <ToastProvider> provided') },
})

export function useToasts() {
  const ctx = useContext(ToastContext)
  return {
    ...ctx,
    quickToast(type: NotificationProps['type'], text: string) {
      ctx.addToast(({ id, close }) =>
        <Notification
          key={id}
          closeToast={close}
          type={type}
          title={text}
          timed
        />
      )

    },
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [idCounter, setIdCounter] = useState(100)
  const [stack, setStack] = useState<ToastStack>([])

  const context = {
    toasts: stack,
    addToast(toast: Toast) {
      const newStack = stack.concat({ id: idCounter, toast })
      setStack(newStack)
      setIdCounter(idCounter + 1)
    },
    removeToast(id: number) {
      setStack(stack.filter(item => item.id !== id))
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
