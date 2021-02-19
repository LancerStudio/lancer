import { useEffect, useState } from "react";
import { debounce } from "./util";


export function useKeyValueState<Value>(initialState: Record<string, Value> = {}) {
  const [state, setState] = useState(initialState)

  return [
    state,
    (key: string | number, value: Value) => {
      setState(state => ({
        ...state,
        [key]: value
      }))
    },
    (key: string | number, values: Partial<Value>) => {
      setState(state => ({
        ...state,
        [key]: {
          ...state[key],
          ...values,
        } as any
      }))
    }
  ] as const
}

export function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    const debouncedHandleResize = debounce(handleResize, 300)
    window.addEventListener('resize', debouncedHandleResize)
    return () => {
      window.removeEventListener('resize', debouncedHandleResize)
    }
  }, [])

  return width
}
