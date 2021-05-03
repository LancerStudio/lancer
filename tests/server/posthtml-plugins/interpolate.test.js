require('../../_test-helper')
const o = require('ospec')
const {render} = require('../../../dist/server/render')

o.spec('interpolate', () => {

  let makeCtx = (locals) => ({
    // req: {},
    site: { locals, locales: ['en'] },
    user: null,
    cache: {},
    locale: 'en',
    reqPath: '/',
    filename: 'interpolate-test.html',
  })

  o('basic interpolation', async () => {
    const result = await render(`<p class="{{x}}">a{{z}}c</p>`, makeCtx({ x: '/a/b/c', y: 'aria-label="hm"', z: 'b' }))
    o(result).equals(`<p class="/a/b/c">abc</p>`)
  })

  o('full attribute interpolation', async () => {
    const result = await render(`<p {{x}}></p>`, makeCtx({ x: 'aria-label="test"' }))
    o(result).equals(`<p aria-label="test"></p>`)
  })

  o('omits falsey attribute names', async () => {
    const result = await render(`<p {{false}} {{undefined}} {{null}} {{0}}="10"></p>`, makeCtx())
    o(result).equals(`<p></p>`)
  })

  o('omits most falsey values from text interpolation', async () => {
    const result = await render(`<p>a{{false}}{{undefined}}{{null}}{{0}}{{''}}b</p>`, makeCtx())
    o(result).equals(`<p>a0b</p>`)
  })

  o('standalone if', async () => {
    const result = await render(`<if cond="true">yes</if><if cond="0">no</if>`, makeCtx())
    o(result).equals(`yes`)
  })

  o('if-else', async () => {
    const makeChain = (a,b) => `<if cond="${a}">A</if><else-if cond="${b}">B</else-if><else>C</else>`
    o(await render(makeChain('1+1', 'true'), makeCtx())).equals('A')
    o(await render(makeChain('null', 'true'), makeCtx())).equals('B')
    o(await render(makeChain(`''`, 'undefined'), makeCtx())).equals('C')
  })
})
