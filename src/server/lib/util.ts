import fs from 'fs'
import {BinaryLike, createHash} from 'crypto'

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

export function checksumFile(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('md5')
    const stream = fs.createReadStream(file)
    stream.on('error', err => reject(err))
    stream.on('data', chunk => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
  });
}

export function checksumString(str: string) {
  return createHash('md5').update(str).digest('hex')
}

export function hashContent(buffer: BinaryLike) {
  return createHash('md5').update(buffer).digest('hex').substring(0, 10)
}

export function notNullish<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

export function mapValues<K extends string, T, U>(obj: Record<K, T>, f: (x: T) => U) {
    return Object.keys(obj).reduce((ret, key) => {
        const k = key as K;
        ret[k] = f(obj[k]);
        return ret
    }, {} as Record<K, U>)
}
