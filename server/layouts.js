var fs = require('fs-extra')
var fm = require('html-frontmatter')
var Path = require('path')

exports.reshapePlugin = function (options) {
  return function layouts (ast, ctx) {
    if ( ! ctx.frontMatter || ! ctx.frontMatter.layout ) {
      // Nothing to do
      return ast
    }
    var result = interpolateContentBlocks(ast, options, ctx, ctx.frontMatter.layout)
    return unwrapBlocks(result)
  }
}

function interpolateContentBlocks (tree, options, ctx, layoutFile) {

  if ( layoutFile[0] !== '_' ) {
    // TODO: BETTER ERROR MESSAGE
    throw new ctx.PluginError({
      message: "Layout file names must start with an underscore ("+layoutFile+")",
      plugin: 'freelance-layouts',
      location: tree[0].location,
      filename: '/src/' + layoutFile,
    })
  }

  // Get the layout file contents and parse it
  var layoutPath = Path.resolve(options.root, layoutFile)
  console.log("Loading layout", layoutPath)
  var layoutHtml = fs.readFileSync(layoutPath, options.encoding || 'utf8')
  var frontMatter = fm(layoutHtml)
  var parsedLayout = ctx.parser(layoutHtml, { filename: layoutPath })

  var layoutTree = parsedLayout

  // add dependency if applicable
  if (ctx.dependencies) {
    ctx.dependencies.push({
      file: layoutPath,
      parent: ctx.filename
    })
  }

  // Divide contents by blocks
  var layoutBlockNodes = getNodes('block', layoutTree, ctx)
  var topLevelContent = []

  tree.forEach(function (node) {
    if (node.type === 'tag' && node.name === 'content-for') {

      var blockName = node.attrs && node.attrs.name && node.attrs.name[0].content.toLowerCase()

      if ( ! blockName ) {
        throw new ctx.PluginError({
          message: "content-for tag has no 'name' attribute",
          plugin: 'freelance-layouts',
          location: node.location,
        })
      }

      if ( ! layoutBlockNodes[blockName] ) {
        throw new ctx.PluginError({
          message: 'Block "'+blockName+'" doesn\'t exist in the layout template',
          plugin: 'freelance-layouts',
          location: node.location,
        })
      }

      // merge the contents of the current node into the layout
      var layoutBlockNode = layoutBlockNodes[blockName]

      layoutBlockNode.content = mergeContent(
        node.content,
        layoutBlockNode.content,
        getBlockType(node)
      )
    }
    else {
      topLevelContent.push(node)
    }
  })

  // merge top-level content into layout content block
  var mainContent = layoutBlockNodes['content']
  mainContent.content = mergeContent(
    topLevelContent,
    mainContent.content,
    'replace'
  )

  if ( frontMatter && frontMatter.layout ) {
    // layout has a parent we need to apply
    return interpolateContentBlocks(layoutTree, options, ctx, frontMatter.layout)
  }
  else {
    return layoutTree
  }
}


function mergeExtendsAndLayout (layoutBlockNodes, templateTree, ctx) {
  // collect all <block> elements in template
  var templateContentNodes = getNodes('content-for', templateTree, ctx)

  for (let layoutBlockName in layoutBlockNodes) {
    // match template block to layout block, if a match exists
    var layoutBlockNode = layoutBlockNodes[layoutBlockName]
    var templateBlockNode = templateContentNodes[layoutBlockName]
    if (!templateBlockNode) { continue }

    // merge the content of the template block into the layout block
    layoutBlockNode.content = mergeContent(
      templateBlockNode.content,
      layoutBlockNode.content,
      getBlockType(templateBlockNode)
    )

    // remove the template block now that it has been merged
    delete templateContentNodes[layoutBlockName]
  }

  // if there's a block left over after this, it means it exists in the template
  // but not in the layout template, so we throw an error
  for (let templateBlockName in templateContentNodes) {
    throw new ctx.PluginError({
      message: 'Block "'+templateBlockName+'" doesn\'t exist in the layout template',
      plugin: 'freelance-layouts',
      location: templateContentNodes[templateBlockName].location
    })
  }
}


function mergeContent (templateContent = [], layoutContent = [], blockType) {
  switch (blockType) {
    case 'replace':
      layoutContent = templateContent
      break
    case 'prepend':
      layoutContent = templateContent.concat(layoutContent)
      break
    case 'append':
      layoutContent = layoutContent.concat(templateContent)
      break
  }

  return layoutContent
}

function getBlockType (blockNode) {
  // grab the contents of the 'type' attribute
  var blockType = (blockNode.attrs && blockNode.attrs.type)
    ? blockNode.attrs.type[0].content.toLowerCase()
    : ''

  // default block type is 'replace'
  if (['replace', 'prepend', 'append'].indexOf(blockType) === -1) {
    return 'replace'
  }

  return blockType
}


function getNodes (type, tree = [], ctx) {
  let result = {}
  walk(tree, ctx)
  return result

  function walk (tree, ctx) {
    return tree.map((node) => {
      // recursive walk
      if (node.type === 'tag' && node.content) {
        walk(node.content, ctx)
      }

      // if it's not what we're looking for, move on
      if (node.name !== 'block') return node

      // if the block has no "name" attr, throw an error
      if (!node.attrs || !node.attrs.name) {
        throw new ctx.PluginError({
          message: "'"+type+"' element is missing a 'name' attribute",
          plugin: 'freelance-layouts',
          location: node.location
        })
      }

      // if it has a name, add it to our result object
      result[node.attrs.name[0].content] = node
      return node
    }, {})
  }
}

function unwrapBlocks (tree) {
  return tree.reduce((m, node) => {
    if (node.type === 'tag' && node.content) {
      node.content = unwrapBlocks(node.content)
    }
    if (node.name !== 'block') { m.push(node); return m }
    if (node.content) { m = m.concat(node.content) }
    return m
  }, [])
}
