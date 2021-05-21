import { DB } from '../lib/db.js';

const table = 'lancer_kvs'

export class KvModel {
  constructor(private db: DB) {}

  get(name: string) {
    return this.db.pluck<string>(`
      SELECT value FROM ${table} WHERE name = ?
    `, name)[0] || null
  }

  upsert(name: string, value: string) {
    try {
      this.db.run(`
        INSERT OR REPLACE INTO ${table} (name, value)
        VALUES (?, ?)
      `, name, value)
      return true
    }
    catch (err) {
      // console.log("[Translation.set]", err)
      return false
    }
  }
}
