const o = require('ospec')
const db = require('../../dist/server/lib/db').connect(':memory:')
const { TranslationModel } = require('../../dist/server/models/translation')

o.spec('TranslationModel', () => {

  o('get and set', () => {
    const tr = new TranslationModel(db)
    o( tr.get('mykey', 'en') ).deepEquals(null)

    o( tr.set('mykey', 'en', 'myvalue', null) ).equals(true)

    o( tr.get('mykey', 'en') ).deepEquals({
      locale: 'en',
      name: 'mykey',
      value: 'myvalue',
      version: 1,
      meta: {},
    })

    o( tr.set('mykey', 'en', 'newval', 1, { x: true }) ).equals(true)

    o( tr.get('mykey', 'en') ).deepEquals({
      locale: 'en',
      name: 'mykey',
      value: 'newval',
      version: 2,
      meta: { x: true },
    })
  })

  o('version control', () => {
    const tr = new TranslationModel(db)
    o( tr.get('conflict_1', 'en') ).deepEquals(null)

    o( tr.set('conflict_1', 'en', 'myvalue', null) ).equals(true)
    o( tr.set('conflict_1', 'en', 'myvalue', null) ).equals(false)
  })

  o('fallbacks', () => {
    const tr = new TranslationModel(db)
    tr.set('k1', 'en', 'v1_english', null)
    tr.set('k1', 'es', 'v1_spanish', null)
    tr.set('k1', 'fr', 'v1_french', null)

    tr.set('k2', 'en', 'v2_english', null)

    tr.set('k3', 'es', 'v3_spanish', null)

    o( tr.get('k2', 'en', { fallback: 'es' }).value ).equals('v2_english')
    o( tr.get('k3', 'en', { fallback: 'es' }).value ).equals('v3_spanish')

    o( tr.get('k1', 'zh', { fallback: ['fr', 'es'] }).value ).equals('v1_french')
    o( tr.get('k1', 'zh', { fallback: ['pt', 'es'] }).value ).equals('v1_spanish')
  })

  o('localesFor', () => {
    const tr = new TranslationModel(db)

    o( tr.localesFor('k4') ).deepEquals([])

    tr.set('k4', 'es', 'v1_spanish', null)
    tr.set('k4', 'fr', 'v1_french', null)
    tr.set('k4', 'fr', 'v1_french', 1)

    o( tr.localesFor('k4') ).deepEquals(['es', 'fr'])
  })
})