import '../_test-helper.js'
import o from 'ospec'
import endent from 'endent'
import express from 'express'
import supertest from 'supertest'
import router from '../../dist/server/index.js'

o.spec('POST requests', () => {
  const app = express()
  app.use(router)

  o('GET is blank', async () => {
    const res = await supertest(app)
      .get('/form')
    o(res.status).equals(200)
    o(res.text.trim()).equals(endent.default`
      <form>
        <input type="text" value="">
      </form>
    `)
  })

  o('POST runs backend code', async () => {
    const res = await supertest(app)
      .post('/form')
      .send('foo=abc')
    o(res.status).equals(200)
    o(res.text.trim()).equals(endent.default`
      <form>
        <input type="text" value="abc">
      </form>
    `)
  })

  o('cannot POST plain html', async () => {
    const res = await supertest(app)
      .post('/no-ssr')
    o(res.status).equals(404)
  })
})
