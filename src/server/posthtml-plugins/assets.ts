import { Node } from '../lib/posthtml.js'
import { resolveAsset } from '../render.js'

type Options = {
  file: string
  publicAssetPaths: Record<string,string>
}
export function ReplaceAssetPathsPlugin(options: Options) {
  return async function interpolatePlugin(tree: any) {
    return replaceAssetPaths(options, tree)
  }
}

async function replaceAssetPaths(options: Options, nodes: Node[]) {
  let {publicAssetPaths, file} = options

  for (let node of nodes) {
    if (typeof node === 'string') continue

    if (node.tag === 'link' && typeof node.attrs?.href === 'string') {
      node.attrs.href = publicAssetPaths[resolveAsset(node.attrs.href, file)] || node.attrs.href
    }
    else if (node.tag === 'script' && typeof node.attrs?.src === 'string') {
      node.attrs.src = publicAssetPaths[resolveAsset(node.attrs.src, file)] || node.attrs.src
    }

    if (node.content && node.content.length) {
      replaceAssetPaths(options, node.content)
    }
  }
}
