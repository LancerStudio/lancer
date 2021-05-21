import { DB } from '../lib/db.js';

const table = 'lancer_translations'

type TranslationRow = {
  locale: string
  name: string
  value: string
  version: number
  meta: string
  created_at: number
}
type TranslationObj = _<Assign<TranslationRow, {
  meta: TranslationMeta
}>>

type TranslationMeta = {
  rich?: boolean
  multiline?: boolean
  /** If true, value is stored as HREF + LINK_DELIMINATOR + TEXT */
  link?: boolean
}

export class TranslationModel {
  constructor(private db: DB) {}

  get(name: string, locale: string, options: {
    fallback?: string | string[]
  }={}) {
    let result = this._get(name, locale)

    if (!result && options.fallback) {
      const locales = Array.isArray(options.fallback) ? options.fallback.slice() : [options.fallback]
      while (!result && locales.length > 0) {
        result = this._get(name, locales.shift()!)
      }
    }
    return result
  }

  private _get(name: string, locale: string): TranslationObj | null {
    const row = this.db.get<TranslationRow>(`
      SELECT locale, name, value, version, meta FROM ${table}
      WHERE locale = ? AND name = ?
      ORDER BY version DESC
      LIMIT 1
    `, locale, name)
    return row && {
      ...row,
      meta: JSON.parse(row.meta) as TranslationMeta,
    }
  }

  // set(name: string, locale: string, value: string, currentVersion: number | null, meta: Meta = {}) {
  set(row: PartialBy<TranslationObj, 'version' | 'meta' | 'created_at'>) {
    try {
      this.db.run(`
        INSERT INTO ${table} (locale, name, value, version, meta, created_at)
        VALUES (:locale, :name, :value, :version, :meta, :created_at)
      `, {
        ...row,
        version: Math.max(row.version || 0, 0) + 1,
        meta: JSON.stringify(row.meta || {}),
        created_at: Math.floor((row.created_at || Date.now()) / 1000)
      })
      return true
    }
    catch (err) {
      // console.log("[Translation.set]", err)
      return false
    }
  }

  localesFor(name: string) {
    return this.db.pluck<string>(`
      SELECT locale FROM ${table}
      WHERE name = ?
      GROUP BY locale
    `, name)
  }
}
