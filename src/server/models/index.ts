import { SqliteError } from 'better-sqlite3'
import path from 'path'
import { dataDir } from '../config.js'
import { connect } from '../lib/db.js'
import { KvModel } from './kv.js'
import { TranslationModel } from './translation.js'
import { UserModel } from './user.js'

export const db = connect(path.join(dataDir, 'site.db'))

export const Kv = new KvModel(db)
export const User = new UserModel(db)
export const Translation = new TranslationModel(db)

export const knownKeys = {
  'use_case': 'known.use_case',
  'onboarded': 'known.onboarded',
}

export {
  KvModel,
  UserModel,
  TranslationModel,
}

export function isUniqueConstraint(err: Error) {
  return err instanceof SqliteError && err.code === 'SQLITE_CONSTRAINT_UNIQUE'
}
