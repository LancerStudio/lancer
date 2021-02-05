import { useEffect, useState } from "react"

export const usePromise = <T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  { invoke = false, deps = [] as any[], lingerLoading = false } = {}
) => {
  let unmounted = false
  const [data, setData] = useState<T>()
  const [isLoading, setLoading] = useState(invoke)
  const [lastUpdated, setLastUpdated] = useState<number>()
  const [error, setError] = useState<any>(null)

  const call = (...args: Args) => {
    /*
    Using isValid guard, in order to prevent the cleanup warning.
    */
    setLoading(true)
    setError(null)

    return fn(...args)
      .then(result => {
        if (!unmounted) {
          setData(result)
          setLastUpdated(Date.now())
        }
        return result
      }, err => {
        if (!unmounted) {
          setError(err)
          if (lingerLoading) setLoading(false)
        }
        throw err
      })
      .finally(() => {
        if (!unmounted && !lingerLoading) {
          setLoading(false)
        }
      })
  }

  if (invoke) {
    useEffect(() => {
      (call as any)()
      /**
        When component will be unmounted, `unmounted` will become false and state setter
        functions will not be envoked on unmounted component.
      */
      return () => { unmounted = true }
    }, deps)
  }

  return {
    call,
    data,
    isLoading,
    lastUpdated,
    error,
    clearError() {
      setError(null)
    },
    clearLoading() {
      setLoading(false)
    },
    set(value: T) {
      setData(value)
    },
    update(values: Partial<T>) {
      setData({ ...data, ...values } as any)
    }
  }
}
