import fs from 'fs'
import path from 'path'
import langs from 'langs'
import matchHelper from 'posthtml-match-helper'
import { RequestHandler } from "express"
import { contentDir, PostHtmlCtx, siteConfig } from "./config.js"
import { memoizeUnary } from "./lib/util.js"

declare global {
  namespace Express {
    interface Request {
      locale?: string
    }
  }
}


type PostHtmlOptions = {
  ctx: PostHtmlCtx
}
export function posthtmlPlugin({ ctx: { user, site, plainPath, locale, cache } }: PostHtmlOptions) {
  return function interpolateI18n(tree: any) {
    if (!locale) throw new Error('i18n_no_locale_set')

    const tset = new TranslationSet(
      cache,
      locale,
      site.locales[0],
    )

    tree.match(matchHelper('t'), function(node: any) {
      node.attrs = node.attrs || {}

      const rich = node.attrs.rich == null ? false : true
      const multiline = node.attrs.multiline == null ? false : true
      delete node.attrs.rich
      delete node.attrs.multiline

      node.tag = node.tag || (multiline ? 'div' : 'span')

      const t = tset.get(node.content[0].trim())

      node.content = tree.parser(t?.value || `<u style="cursor: pointer">${name}</u>`)
      if (user) {
        node.attrs.onclick = `Lancer.onTranslationClick(event)`
        node.attrs['data-t-name'] = name
        node.attrs['data-t-locale'] = locale
        node.attrs['data-t-multiline'] = multiline
        node.attrs['data-t-rich'] = rich
      }
      return node
    })

    let lancerHead = user ? [
      //
      // Defer loading lancer css
      // https://web.dev/defer-non-critical-css/
      //
      `<link rel="preload" href="/lancer-scoped.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
      <noscript><link rel="stylesheet" href="/lancer-scoped.css"></noscript>`,

      //
      // Defer loading lancer js
      //
      `<script defer src="/lancer.js"></script>`,
    ] : []

    if (site.locales.length >= 2) {
      lancerHead = site.locales.filter(loc => loc !== locale).map(loc =>
        `<link rel="alternate" hreflang="${loc}" href="/${loc}${plainPath}" />`
      ).concat(lancerHead)
    }

    tree.match(matchHelper('meta[lancer]'), function() {
      return {
        tag: false,
        content: tree.parser(lancerHead.join('\n'))
      }
    })
  }
}

class TranslationSet {
  constructor(
    public cache: PostHtmlCtx['cache'],
    public locale: string,
    public fallback?: string,
  ) {}

  get(keypath: string) {
    const key = path.basename(keypath)
      // LAST TIME: CHECK FOR FILE AND FALL BACK
    let localeFile = path.join(contentDir, 'translations', path.dirname(key))
    if (fs.existsSync(localeFile)) {
    }
    return 'todo' as any
  }
}


export function addLocale(urlPath: string, currentLocale: string) {
  const site = siteConfig()
  return site.locales.length < 2 ? urlPath : path.join('/', currentLocale, urlPath)
}

export function ensureLocale(): RequestHandler {
  return (req, res, next) => {
    const site = siteConfig()
    if (
      site.locales.length === 1 ||
      req.path.startsWith('/files/')
    ) {
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

type Lang = {
  name: string
  local: string
  '1': string
  '2': string
  '2T': string
  '2B': string
  '3': string
}
function _getLang(lang: string): Lang | null {
  if (lang.length === 2) {
    return langs.where('1', lang)
  }
  if (lang.length === 3) {
    return langs.where('2', lang) || langs.where('2T', lang) || langs.where('2B', lang) || langs.where('3', lang)
  }
  return langs.where('name', lang) || langs.where('local', lang)
}

export const getLang = memoizeUnary(_getLang)
