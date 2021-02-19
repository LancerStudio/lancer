const o = require('ospec')
const db = require('../../dist/server/lib/db').connect(':memory:')
const { KvModel } = require('../../dist/server/models/kv')

o.spec('KvModel', () => {

  o('get and set', () => {
    const tr = new KvModel(db)
    o( tr.get('k_1') ).deepEquals(null)

    o( tr.upsert('k_1', 'v_1') ).equals(true)

    o( tr.get('k_1') ).equals('v_1')
  })
})
