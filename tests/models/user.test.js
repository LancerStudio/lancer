const { SqliteError } = require('better-sqlite3')
const o = require('ospec')
const db = require('../../dist/server/lib/db').connect(':memory:')
const { UserModel } = require('../../dist/server/models/user')

o.spec('UserModel', () => {
  let User

  o.beforeEach(() => {
    User = new UserModel(db)
  })

  o('create and get', async () => {
    const id = await User.create('alice@example.com', 'abc123', {
      name: 'Alice',
      type: 'client',
    })
    const user = User.get(id)

    o( user.type ).equals('client')
    o( user.name ).equals('Alice')
    o( user.password_temporary ).equals(0)

    o( typeof user.id ).equals('number')
    o( typeof user.created_at ).equals('number')
    o( typeof user.updated_at ).equals('number')

    o( User.findByEmail('alice@example.com') ).deepEquals(user)

    o( User.allWithPrimaryEmail()[0].email ).equals('alice@example.com')
    o( User.getWithPrimaryEmail(id).email ).equals('alice@example.com')
  })

  o('email uniqueness', async () => {
    const email = 'unique@example.com'
    await User.create(email, 'abc123', {
      name: 'Unique',
      type: 'client',
    })
    try {
      await User.create(email, 'abc123', {
        name: 'Unique',
        type: 'client',
      })
    }
    catch(err) {
      o(err instanceof SqliteError).equals(true)
      o(err.code).equals('SQLITE_CONSTRAINT_UNIQUE')
      const rows = db.query(`SELECT name FROM lancer_users WHERE name = ?`, 'Unique')
      o(rows.length).equals(1)
    }
  })

  o('password', async () => {
    const id = await User.create('bob@example.com', 'abc123', {
      name: 'Bob',
      type: 'dev',
    })

    o( await User.verify(id, 'wrong') ).equals(false)
    o( await User.verify(id, 'abc123') ).equals(true)
  })

  o('change temp password', async () => {
    const id = await User.create('carly@example.com', 'temp', {
      name: 'Carly',
      type: 'client',
      password_temporary: 1
    })

    o( User.get(id).password_temporary ).equals(1)

    o( await User.verify(id, 'wrong') ).equals(false)
    o( await User.verify(id, 'temp') ).equals(true)

    o( User.get(id).password_temporary ).equals(1)

    await User.updatePassword(id, 'new_temp_pass')
    o( await User.verify(id, 'temp') ).equals(false)
    o( await User.verify(id, 'new_temp_pass') ).equals(true)

    o( User.get(id).password_temporary ).equals(0)
  })

  o('reset password', async () => {
    const id = await User.create('dan@example.com', 'realpass', {
      name: 'Darly',
      type: 'client',
    })

    o( User.get(id).password_temporary ).equals(0)

    await User.updatePassword(id, 'temp2', { isTemp: true })
    o( await User.verify(id, 'realpass') ).equals(false)
    o( await User.verify(id, 'temp2') ).equals(true)

    o( User.get(id).password_temporary ).equals(1)
  })
})
