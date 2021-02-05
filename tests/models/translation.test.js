const o = require('ospec')
const db = require('../../dist/server/lib/db').connect(':memory:')
const { TranslationModel } = require('../../dist/server/models/translation')

o.spec('TranslationModel', () => {

  o('get and set', () => {
    const tr = new TranslationModel(db)
    o( tr.get('mykey', 'en') ).deepEquals(null)

    o( tr.set({ name: 'mykey', locale: 'en', value: 'myvalue' }) ).equals(true)

    o( tr.get('mykey', 'en') ).deepEquals({
      locale: 'en',
      name: 'mykey',
      value: 'myvalue',
      version: 1,
      meta: {},
    })

    o( tr.set({ name: 'mykey', locale: 'en', value: 'NEW', version: 1, meta: { x: true } }) ).equals(true)

    o( tr.get('mykey', 'en') ).deepEquals({
      locale: 'en',
      name: 'mykey',
      value: 'NEW',
      version: 2,
      meta: { x: true },
    })
  })

  o('version control', () => {
    const tr = new TranslationModel(db)
    o( tr.get('conflict_1', 'en') ).deepEquals(null)

    o( tr.set({ name: 'conflict_1', locale: 'en', value: 'myvalue' }) ).equals(true)
    o( tr.set({ name: 'conflict_1', locale: 'en', value: 'myvalue' }) ).equals(false)
  })

  o('fallbacks', () => {
    const tr = new TranslationModel(db)
    tr.set({ name: 'k1', locale: 'en', value: 'v1_english' })
    tr.set({ name: 'k1', locale: 'es', value: 'v1_spanish' })
    tr.set({ name: 'k1', locale: 'fr', value: 'v1_french' })

    tr.set({ name: 'k2', locale: 'en', value: 'v2_english' })

    tr.set({ name: 'k3', locale: 'es', value: 'v3_spanish' })

    o( tr.get('k2', 'en', { fallback: 'es' }).value ).equals('v2_english')
    o( tr.get('k3', 'en', { fallback: 'es' }).value ).equals('v3_spanish')

    o( tr.get('k1', 'zh', { fallback: ['fr', 'es'] }).value ).equals('v1_french')
    o( tr.get('k1', 'zh', { fallback: ['pt', 'es'] }).value ).equals('v1_spanish')
  })

  o('localesFor', () => {
    const tr = new TranslationModel(db)

    o( tr.localesFor('k4') ).deepEquals([])

    tr.set({ name: 'k4', locale: 'es', value: 'v1_spanish' })
    tr.set({ name: 'k4', locale: 'fr', value: 'v1_french' })
    tr.set({ name: 'k4', locale: 'fr', value: 'v1_french', version: 1 })

    o( tr.localesFor('k4') ).deepEquals(['es', 'fr'])
  })
})