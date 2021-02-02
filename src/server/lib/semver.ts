
export function compare(a: string, b: string) {
  const as = a.split('.')
  const bs = b.split('.')
  if (as[0]! > bs[0]!) return ['a', 'major'] as const
  if (as[0]! < bs[0]!) return ['b', 'major'] as const

  if (as[1]! > bs[1]!) return ['a', 'minor'] as const
  if (as[1]! < bs[1]!) return ['b', 'minor'] as const

  if (as[2]! > bs[2]!) return ['a', 'patch'] as const
  if (as[2]! < bs[2]!) return ['b', 'patch'] as const

  return ['equal'] as const
}

export function gt(a: string, b: string) {
  const result = compare(a, b)
  return result[0] === 'a'
}
