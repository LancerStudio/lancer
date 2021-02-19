import { useState } from "react";


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
