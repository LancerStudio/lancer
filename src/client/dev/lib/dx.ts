import m from 'mithril'

export function dx<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  {
    //
    // Whether to persist the "loading" state after the promise resolves.
    // Useful for doing another async actions / page redirect after-the-fact.
    //
    lingerLoading = false
  } = {}
) {

  const state = {
    data: undefined as T | undefined,
    loading: false,
    lastLoaded: null as null | Number,
    error: null as null | Error,
    clearError() {
      state.error = null
      m.redraw()
    },
    clearLoading() {
      state.loading = false
      m.redraw()
    },
    set(data: T) {
      state.data = data
      m.redraw()
    },
    merge(values: Partial<T>) {
      Object.assign(state.data, values)
    },

    call(...args: Args) {
      state.loading = true
      state.error = null
      return fn(...args)
        .then(
          result => {
            state.data = result
            state.lastLoaded = Date.now()
            return result
          },
          err => {
            state.error = err
            if (lingerLoading) {
              state.loading = false
            }
            throw err
        })
        .finally(() => {
          if (!lingerLoading) {
            state.loading = false
          }
          m.redraw()
        })
    }
  }

  return state
}
