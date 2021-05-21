import argon2 from 'argon2'
import { DB } from '../lib/db.js';
import { makeGravatarUrl } from '../lib/util.js';

const table = 'lancer_users'
const auth_table = 'lancer_auth_connections'

export type UserRow = {
  id: number
  name: string
  password_temporary: 0 | 1
  type: 'client' | 'dev'
}

export type UserWithPrimaryEmail = UserRow & {
  email: string
  gravatar_url: string
}

export class UserModel {
  constructor(private db: DB) {}

  any() {
    return !!this.db.get(`SELECT id FROM ${table} LIMIT 1`)
  }

  allWithPrimaryEmail() {
    return this.db.query<UserWithPrimaryEmail>(`
      SELECT ${table}.id, name, value AS email, ${table}.type, password_temporary, ${table}.created_at, ${table}.updated_at
      FROM ${table}
      JOIN ${auth_table} ON user_id = ${table}.id
      WHERE is_primary = 1
    `).map(attachGravatar)
  }

  get(id: number) {
    return this.db.get<UserRow>(`
      SELECT id, name, type, password_temporary, created_at, updated_at FROM ${table} WHERE id = ?
    `, id)
  }

  getWithPrimaryEmail(id: number) {
    const user = this.db.get<UserWithPrimaryEmail>(`
      SELECT ${table}.id, name, value AS email, ${table}.type, password_temporary, ${table}.created_at, ${table}.updated_at
      FROM ${table}, ${auth_table}
      WHERE ${table}.id = ? AND is_primary = 1
    `, id)
    return user && attachGravatar(user)
  }

  findByEmail(email: string) {
    return this.db.get<UserRow>(`
      SELECT ${table}.id, name, ${table}.type, password_temporary, ${table}.created_at, updated_at
      FROM ${table}, ${auth_table}
      WHERE ${auth_table}.type = 'email' AND value = ?
    `, email)
  }

  async create(email: string, password: string, attrs: {
    name: string
    type: UserRow['type']
    password_temporary?: UserRow['password_temporary']
  }) {
    const password_hash = await argon2.hash(password)
    const now = this.db.now()

    let user_id: number = 0

    this.db.runTransaction(() => {
      const result = this.db.run(`
        INSERT INTO ${table} (name, type, password_hash, password_temporary, created_at, updated_at)
        VALUES (:name, :type, :password_hash, :password_temporary, :created_at, :updated_at)
      `, {
        password_temporary: 0,
        ...attrs,
        password_hash,
        created_at: now,
        updated_at: now,
      })
      user_id = +result.lastInsertRowid

      this.db.run(`
        INSERT INTO ${auth_table} (user_id, type, value, created_at, is_primary)
        VALUES (:user_id, 'email', :email, :created_at, 1)
      `, {
        user_id,
        email,
        created_at: now,
      })
    })

    return user_id
  }

  async verify(id: number, password: string) {
    const password_hash = this.db.getPluck<string>(`SELECT password_hash FROM ${table} WHERE id = ?`, id)
    return !!password_hash && await argon2.verify(password_hash, password)
  }

  async updatePassword(id: number, newPassword: string, options: { isTemp?: boolean } = {}) {
    const password_hash = await argon2.hash(newPassword)
    const updated_at = this.db.now()
    this.db.run(`
      UPDATE ${table} SET
        password_hash = :password_hash,
        updated_at = :updated_at,
        password_temporary = :password_temporary
      WHERE id = :id
    `, { password_hash, id, updated_at, password_temporary: options.isTemp ? 1 : 0 })
  }
}

function attachGravatar(user: UserWithPrimaryEmail) {
  user.gravatar_url = makeGravatarUrl(user.email, { type: 'identicon' })
  return user
}
