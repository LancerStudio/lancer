const o = require('ospec')
const db = require('../dist/server/db').connect(':memory:')

o.spec('db', () => {

  o('initial setup', () => {
    o( db.get('SELECT COUNT(*) AS result FROM lance_kvs').result ).deepEquals(2)
  })

  o('v1_0_0', () => {
    o( db.get('SELECT COUNT(*) AS result FROM lance_translations').result ).deepEquals(0)
  })
})