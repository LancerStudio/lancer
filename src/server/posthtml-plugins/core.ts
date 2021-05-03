import vm from 'vm'
import { resolveInterpolations } from "./interpolate"


type Options = {
  locals: object
}
export function LancerCorePlugin({ locals }: Options) {
  return function interpolatePlugin(tree: any) {
    return resolveInterpolations({ ctx: vm.createContext(locals) }, tree)
  }
}

