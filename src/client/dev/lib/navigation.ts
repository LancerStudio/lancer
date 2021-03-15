import m, { Vnode } from 'mithril'

export type AnimatedNav = {
  close: () => void
}

type Screen = {
  component: (navigation: AnimatedNav) => Vnode<any>
}

export function createNavigation() {
  let stack = [] as Screen[]

  const handle = {
    get current() {
      return stack[stack.length-1]
    },
    push: (component: Screen['component']) => {
      stack.push({ component })
      m.redraw()
    },
    goBack: () => {
      stack.pop()
      m.redraw()
    },
    clear: () => {
      stack = []
      m.redraw()
    }
  }
  return handle
}

export const navigation = createNavigation()
