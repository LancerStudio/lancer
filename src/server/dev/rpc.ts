import * as z from 'zod'
import { Request } from 'express'

export {z} // Re-export for convenience

export type RpcContext = {
  req: Request
  /** ASSUMPTION: Only used when rpc requires auth */
  user: Exclude<Request['user'], null>
}

export const ok = <T>(data: T) => ({ type: 'success', data } as const)
export const bad = <C extends string, D>(code: C, data: D) => ({ type: 'error', code, data } as const)


export function rpc<
  Params extends z.Schema<any>,
  Proc extends (params: z.TypeOf<Params>, ctx?: any) => Promise<any>,
>(params: Params, proc: Proc): Proc
{
  const safeProc: any = (argsFromClient: any, ctx: any) => {
    const result = params.safeParse(argsFromClient)
    if (result.success) {
      return proc(result.data, ctx)
    }
    else {
      throw result.error
    }
  }
  return safeProc
}

//
// Rpcs require auth by default.
// For those that don't (such as signing in),
// invoke this directly on the function.
//
export function allowAnonymous(rpcFn: Function) {
  ;(rpcFn as any).allowAnonymous = true
}
