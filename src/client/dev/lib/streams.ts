import Stream from 'mithril/stream'

export function uniques<T>() {
  let first = true
  let previous: T | undefined
  return (value: T) => {
    if (first) {
      first = false
      previous = value
      return value
    }
    else if (value === previous) {
      return Stream.SKIP
    }
    else {
      previous = value
      return value
    }
  }
}
