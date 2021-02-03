import { env, PostHtmlCtx, SiteConfig } from "./config"
import { TranslationModel } from "./models/translation"

var matchHelper = require('posthtml-match-helper')

type PostHtmlOptions = {
  site: SiteConfig
  ctx: PostHtmlCtx
  Translation: TranslationModel
}
export function posthtmlPlugin({ Translation, site, ctx: { locale } }: PostHtmlOptions) {
  return function interpolateI18n(tree: any) {
    if (!locale) throw new Error('no_locale_set')

    tree.match(matchHelper('t'), function(node: any) {
      node.tag = 'span'
      node.attrs = node.attrs || {}

      const name = node.content[0].trim()
      const mode = node.attrs.rich ? 'inline' : 'plaintext'
      const t = Translation.get(name, locale, { fallback: site.locales[0] })

      node.content = tree.parser(t?.value || `<u style="cursor: pointer">${name}</u>`)
      if (env.development) {
        node.attrs.ondblclick = `Lancer.editTranslation('${name}', '${locale}', '${mode}')`
        node.attrs['data-t-name'] = name
        node.attrs['data-t-locale'] = locale
      }
      return node
    })
  }
}
