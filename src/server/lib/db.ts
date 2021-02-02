import * as Semver from './semver'

export type DB = ReturnType<typeof connect>

type ConnectOptions = {
  migrate?: boolean
}
export function connect(dbPath: string, options: ConnectOptions={}) {
  const migrate = options.migrate === undefined ? true : options.migrate

  const db = require('better-sqlite3')(dbPath, {
    // verbose: console.log
  })

  runStatements(db, SETUP)

  const meta = kv(`SELECT name, value FROM lance_kvs WHERE name IN ('migration')`) as {
    migration: string
    site_version: string
  }

  if (migrate) {
    for (let [version, statements] of Object.entries(MIGRATIONS)) {
      if ( Semver.gt(version, meta.migration) )
      runTransaction(db, () => {
        runStatements(db, statements)
        db.prepare(`UPDATE lance_kvs SET value = ? WHERE name = 'migration'`).run(version)
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
  
  return {
    kv,
    get,
    run,
    pluck,
    query,
  }
}

function runStatements(db: any, statements: string[]) {
  statements.forEach(sql => {
    db.prepare(sql).run()
  })
}

function runTransaction(db: any, f: () => void) {
  db.transaction(() => {
    f()
  })()
}

const SETUP = [
  `CREATE TABLE IF NOT EXISTS lance_kvs (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      value TEXT
    )
  `,
  `CREATE UNIQUE INDEX IF NOT EXISTS lance_kvs_name ON lance_kvs (name)`,
  `INSERT OR IGNORE INTO lance_kvs (name, value)
  VALUES
    ('migration', '0.0.0'),
    ('site_version', '1.0.0')
  `
]

const MIGRATIONS = {
  '1.0.0': [
    `CREATE TABLE lance_translations (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        locale TEXT NOT NULL,
        version INTEGER NOT NULL,
        meta TEXT NOT NULL DEFAULT '{}'
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS lance_translations_name ON lance_translations (locale, name, version)`,
  ]
}

