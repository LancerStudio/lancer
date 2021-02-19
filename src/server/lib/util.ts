import {createHash} from 'crypto'

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

export function makeGravatarUrl(email: string, opts: { size?: number, type?: string }) {
  const hash = createHash("md5").update(email).digest("hex")
  const qs = [
    opts.size && `s=${opts.size}`,
    opts.type && `d=${opts.type}`,
  ].filter(x => x).join('&')
  return `https://secure.gravatar.com/avatar/${hash}${qs ? '?'+qs : ''}`
}
