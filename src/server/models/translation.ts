import { DB } from "../lib/db";

const table = 'lance_translations'

type Meta = {
  mode?: 'plaintext' | 'inline' | 'block'
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

  private _get(name: string, locale: string) {
    const row = this.db.get<{ locale: string, name: string, value: string, version: number, meta: string }>(`
      SELECT locale, name, value, version, meta FROM ${table}
      WHERE locale = ? AND name = ?
      ORDER BY version DESC
      LIMIT 1
    `, locale, name)
    return row && {
      ...row,
      meta: JSON.parse(row.meta) as Meta,
    }
  }

  set(name: string, locale: string, value: string, currentVersion: number | null, meta: Meta = {}) {
    currentVersion = Math.max(currentVersion || 0, 0)
    try {
      this.db.run(`
        INSERT INTO ${table} (locale, name, value, version, meta)
        VALUES (:locale, :name, :value, :version, :meta)
      `, { locale, name, value, version: currentVersion +1, meta: JSON.stringify(meta) })
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