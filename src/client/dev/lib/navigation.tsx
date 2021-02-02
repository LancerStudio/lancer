import { ReactNode, useEffect, useState } from "react"
import { Lancer } from "../global"

export type AnimatedNav = {
  close: () => void
}

type Screen = {
  component: (navigation?: AnimatedNav) => ReactNode
}

export function useNavigation() {
  const [stack, setStack] = useState<Screen[]>([])

  useEffect(() => {
    return Lancer.emitter.on('navigate', (screen: Screen['component']) => {
      api.push(screen)
    })
  }, [setStack])

  const api = {
    current: stack[stack.length-1],
    push: (component: Screen['component']) => {
      setStack(stack.concat([{ component }]))
    },
    goBack: () => {
      setStack(stack.slice(0, stack.length - 1))
    },
    clear: () => {
      setStack([])
    }
  }
  return api
}
