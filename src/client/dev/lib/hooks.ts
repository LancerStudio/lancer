import { useState } from "react";


export function useKeyValueState<Value>(initialState: Record<string, Value> = {}) {
  const [state, setState] = useState(initialState)

  return [
    state,
    (key: string, value: Value) => {
      setState({
        ...state,
        [key]: value
      })
    },
    (key: string, values: Partial<Value>) => {
      setState({
        ...state,
        [key]: {
          ...state[key],
          ...values,
        } as any
      })
    }
  ] as const
}
