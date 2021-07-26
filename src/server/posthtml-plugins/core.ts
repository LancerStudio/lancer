import vm from 'vm'
import { SiteConfig } from '../config.js'
import { resolveInterpolations } from './interpolate.js'


type Options = {
  site: SiteConfig
  locals: object
  includeRoot: string
}
export function LancerCorePlugin({ locals, site, includeRoot }: Options) {
  return async function interpolatePlugin(tree: any) {
    const newTree = await resolveInterpolations({ ctx: vm.createContext(locals), site, includeRoot }, tree)
    return newTree
  }
}

