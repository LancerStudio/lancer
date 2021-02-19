import * as Semver from './semver'
import sqlite3 from 'better-sqlite3'

export type DB = ReturnType<typeof connect>

type ConnectOptions = {
  migrate?: boolean
}
export function connect(dbPath: string, options: ConnectOptions={}) {
  const migrate = options.migrate === undefined ? true : options.migrate

  const db = sqlite3(dbPath, {
    // verbose: console.log
  })

  runStatements(db, SETUP)

  const meta = kv(`SELECT name, value FROM lancer_kvs WHERE name IN ('migration')`) as {
    migration: string
    site_version: string
  }

  if (migrate) {
    for (let [version, statements] of Object.entries(MIGRATIONS)) {
      if ( Semver.gt(version, meta.migration) )
      runTransaction(() => {
        runStatements(db, statements)
        db.prepare(`UPDATE lancer_kvs SET value = ? WHERE name = 'migration'`).run(version)
      })
    }
  }

  //
  // Interface
  //
  function query<T=any>(sql: string, ...args: any[]): T[] {
    return db.prepare(sql).all(...args)
  }

  function pluck<T>(sql: string, ...args: any[]): T[] {
    return db.prepare(sql).pluck().all(...args)
  }

  function get<T=any>(sql: string, ...args: any[]): T | null {
    return db.prepare(sql).get(...args) || null
  }

  function getPluck<T>(sql: string, ...args: any[]): T | null {
    const rows = pluck<T>(sql, ...args)
    return rows[0] || null
  }

  function kv(sql: string, ...args: any[]){
    const result: Record<string,any> = {}
    query(sql, ...args).forEach(row => {
      result[row.name] = row.value
    })
    return result
  }

  function run(sql: string, ...args: any[]) {
    return db.prepare(sql).run(...args)
  }

  function runTransaction(f: () => void) {
    db.transaction(() => {
      f()
    })()
  }

  function now() {
    return Math.floor(Date.now() / 1000)
  }

  return {
    kv,
    get,
    now,
    run,
    pluck,
    query,
    getPluck,
    runTransaction,
    connection: db,
  }
}

function runStatements(db: any, statements: string) {
  statements.split(';;').map(s => s.trim()).forEach(sql => {
    db.prepare(sql).run()
  })
}

const SETUP = `
  -- Uniquely "if not exists" because this query always runs.
  CREATE TABLE IF NOT EXISTS lancer_kvs (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    value TEXT
  );;

  CREATE UNIQUE INDEX IF NOT EXISTS lancer_kvs_name ON lancer_kvs (name);;

  INSERT OR IGNORE INTO lancer_kvs (name, value)
    VALUES
      ('migration', '0.0.0')
`

const MIGRATIONS = {
  '1.0.0': `
      CREATE TABLE lancer_translations (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        locale TEXT NOT NULL,
        version INTEGER NOT NULL,
        site_version INTEGER NOT NULL DEFAULT 1,
        meta TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL
      );;

      CREATE UNIQUE INDEX lancer_translations_name ON lancer_translations (locale, name, site_version, version);;

      CREATE TABLE lancer_sessions (
        sid PRIMARY KEY,
        expired,
        sess
      )
  `,
  '1.1.0': `
      CREATE TABLE lancer_users (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT,
        password_temporary INTEGER DEFAULT 0,
        type TEXT NOT NULL,
        meta TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );;

      CREATE TABLE lancer_auth_connection (
        id INTEGER PRIMARY KEY NOT NULL,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        meta TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL
      );;

      CREATE UNIQUE INDEX lancer_auth_values ON lancer_auth_connection (type, value)
    `,

    '1.1.1': `
      ALTER TABLE lancer_auth_connection RENAME TO lancer_auth_connections;;
      ALTER TABLE lancer_auth_connections ADD COLUMN is_primary INTEGER NOT NULL DEFAULT 0;;

      -- ATOW users can only have one email address
      UPDATE lancer_auth_connections SET is_primary = 1
    `,
}
