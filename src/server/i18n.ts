import { RequestHandler } from "express"
import { env, PostHtmlCtx, siteConfig } from "./config"
import { TranslationModel } from "./models/translation"

declare global {
  namespace Express {
    interface Request {
      locale?: string
    }
  }
}


var matchHelper = require('posthtml-match-helper')

type PostHtmlOptions = {
  ctx: PostHtmlCtx
  Translation: TranslationModel
}
export function posthtmlPlugin({ Translation, ctx: { site, reqPath, locale } }: PostHtmlOptions) {
  return function interpolateI18n(tree: any) {
    if (!locale) throw new Error('i18n_no_locale_set')

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
        node.attrs.onclick = `Lancer.onTranslationClick(event)`
        node.attrs['data-t-name'] = name
        node.attrs['data-t-locale'] = locale
        node.attrs['data-t-multiline'] = multiline
        node.attrs['data-t-rich'] = rich
      }
      return node
    })

    if (site.locales.length >= 2) {
      tree.match(matchHelper('meta[lancer]'), function() {
        return {
          tag: false,
          content: tree.parser(
            site.locales.filter(loc => loc !== locale).map(loc =>
              `<link rel="alternate" hreflang="${loc}" href="/${loc}${reqPath}" />`
            )
          )
        }
      })
    }
  }
}


export function ensureLocale(): RequestHandler {
  return (req, res, next) => {
    const site = siteConfig()
    if (site.locales.length === 1) {
      return next()
    }
    const locale = req.path.split('/')[1]
    if (!locale || !site.locales.includes(locale)) {
      const defaultLocale = site.locales[0]
      return res.redirect(`/${defaultLocale}${req.path}`)
    }
    req.locale = locale
    return next()
  }
}
