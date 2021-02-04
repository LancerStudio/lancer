import { env, PostHtmlCtx } from "./config"
import { TranslationModel } from "./models/translation"

var matchHelper = require('posthtml-match-helper')

type PostHtmlOptions = {
  ctx: PostHtmlCtx
  Translation: TranslationModel
}
export function posthtmlPlugin({ Translation, ctx: { site, locale } }: PostHtmlOptions) {
  return function interpolateI18n(tree: any) {
    if (!locale) throw new Error('no_locale_set')

    tree.match(matchHelper('t'), function(node: any) {
      node.attrs = node.attrs || {}

      const rich = node.attrs.rich == null ? false : true
      const multiline = node.attrs.multiline == null ? false : true
      delete node.attrs.rich
      delete node.attrs.multiline

      node.tag = multiline ? 'div' : 'span'

      const name = node.content[0].trim()
      const t = Translation.get(name, locale, { fallback: site.locales[0] })

      node.content = tree.parser(t?.value || `<u style="cursor: pointer">${name}</u>`)
      if (env.development) {
        node.attrs.ondblclick = `Lancer.editTranslation('${name}', '${locale}', { multiline: ${multiline}, rich: ${rich} })`
        node.attrs['data-t-name'] = name
        node.attrs['data-t-locale'] = locale
      }
      return node
    })
  }
}
