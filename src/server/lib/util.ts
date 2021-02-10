
export function memoizeUnary<T extends (arg: any) => any>(fn: T): T {
  const cache = new Map()
  const memoized: any = (arg: any) => {
    if (!cache.has(arg)) {
      const result = fn(arg)
      cache.set(arg, result)
      return result
    }
    return cache.get(arg)
  }
  return memoized
}
