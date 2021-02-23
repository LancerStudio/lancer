const o = require('ospec')
const db = require('../dist/server/lib/db').connect(':memory:')

o.spec('db', () => {

  o('initial setup', () => {
    o( db.get('SELECT COUNT(*) AS result FROM lancer_kvs').result ).deepEquals(1)
  })

  o('v1_0_0', () => {
    o( db.get('SELECT COUNT(*) AS result FROM lancer_translations').result ).deepEquals(0)
  })
})