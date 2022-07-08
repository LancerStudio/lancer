import { Node } from '../lib/posthtml.js'

type Options = {
  rootPath: string
}
export function ReplaceRootPathsPlugin(options: Options) {
  return async function interpolatePlugin(tree: any) {
    let rootPath = options.rootPath || '/'
    if (rootPath[0] !== '/') {
      // Normalize 'abc' to '/abc'
      rootPath = '/' + rootPath
    }
    if (rootPath[rootPath.length - 1] === '/') {
      // Normalize '/abc/' to '/abc'
      rootPath = rootPath.slice(0, rootPath.length - 1)
    }
    if (options.rootPath !== '/') {
      replaceRootPaths(rootPath, tree)
    }
  }
}

async function replaceRootPaths(rootPath: string, nodes: Node[]) {
  for (let node of nodes) {
    if (typeof node === 'string') continue

    if (
      (node.tag === 'a' || node.tag === 'link') &&
      typeof node.attrs?.href === 'string' &&
      node.attrs.href[0] === '/'
    ) {
      node.attrs.href = rootPath + node.attrs.href
    }
    else if (
      (node.tag === 'img' || node.tag === 'script') &&
      typeof node.attrs?.src === 'string' &&
      node.attrs.src[0] === '/'
    ) {
      node.attrs.src = rootPath + node.attrs.src
    }

    if (node.content && node.content.length) {
      replaceRootPaths(rootPath, node.content)
    }
  }
}
