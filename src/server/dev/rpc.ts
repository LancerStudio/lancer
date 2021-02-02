import * as z from 'zod'

export {z} // Re-export for convenience

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
