import { DB } from "../lib/db";
import argon2 from 'argon2'

const table = 'lancer_users'
const auth_table = 'lancer_auth_connection'

export type UserRow = {
  id: number
  name: string
  password_temporary: 0 | 1
  type: 'client' | 'dev'
}

export class UserModel {
  constructor(private db: DB) {}

  get(id: number) {
    return this.db.get<UserRow>(`
      SELECT id, name, type, password_temporary, created_at, updated_at FROM ${table} WHERE id = ?
    `, id)
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
    const user_id = +result.lastInsertRowid

    this.db.run(`
      INSERT INTO ${auth_table} (user_id, type, value, created_at)
      VALUES (:user_id, 'email', :email, :created_at)
    `, {
      user_id,
      email,
      created_at: now,
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
