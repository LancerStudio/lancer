
type Procs = typeof import('../../../server/dev/procs')

export const Rpc = makeRpcClient<Procs>('/lancer/rpc')
export type ProcTypes = UnPromisifiedObject<ReturnTypeObject<Procs>>

type NoContextWithUnexpected<F> =
  F extends (params: infer T, ctx?: any) => infer U
  ? (params: T) => U
  : never

export function makeRpcClient<T>(endpoint: string) {
  return new Proxy({}, {
    get(_, proc: string) {
      return rpc.bind(null, `${endpoint}/${proc}`, proc)
    }
  }) as { [Proc in keyof T]: NoContextWithUnexpected<T[Proc]> }
}

async function rpc(endpoint: string, proc: string, arg: any) {
  console.log(`[rpc] ${proc}(${JSON.stringify(arg)})`)
  return window.fetch(endpoint, {
    method: 'POST',
    // credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify(arg)
  })
    .then(async res => {
      const data = await res.json()
      if (res.status === 200) {
        return data
      }
      else {
        console.error(`[rpc][${proc}]`, data)
        throw new Error(`[rpc][${res.status}][${data.error}] ${data.message}`)
      }
    })
}
