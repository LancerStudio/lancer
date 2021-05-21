import '../../_test-helper.js'
import o from 'ospec'
import {render} from '../../../dist/server/render.js'

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

  o('throws on missing reference', async () => {
    try {
      await render(`<p>{{idontexist}}</p>`, makeCtx())
      o(false).equals('should not get here')
    }
    catch(err) {
      o(err.message).equals('idontexist is not defined')
    }
  })

  o('locals for optional references', async () => {
    const result = await render(`<p>{{locals.x}}</p>`, makeCtx())
    o(result).equals(`<p></p>`)
  })

  o('locals reference', async () => {
    const result = await render(`<p>{{locals.x}}</p>`, makeCtx({ x: 99 }))
    o(result).equals(`<p>99</p>`)
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

  o('nested layout page attributes', async () => {
    const result = await render(`<page layout="_nested-page-attrs.html" title="CCC">`, makeCtx())
    o(result).equals(
`<!doctype HTML>
<title>CCC | BBB | AAA</title>
`
    )
  })

  o('scope tag', async () => {
    const result = await render(`<scope locals="{ x: 100, y: y+1 }"><p>{{x}},{{locals.y}}</p></scope>`, makeCtx({ x: 10, y: 20 }))
    o(result).equals(`<p>100,21</p>`)
  })

  o('include', async () => {
    const result = await render(`<include src="_x.html" locals="{ x: 100 }">`, makeCtx({ x: 10 }))
    o(result).equals(`<p>x:100</p>\n`)
  })

  o('nested include', async () => {
    const result = await render(`<include src="_x-nested.html" locals="{ x: 100 }">`, makeCtx({ x: 10 }))
    o(result).equals(`<p>x-parent1:100</p><p>x:111</p>\n<p>x-parent2:100</p>\n`)
  })

  o('if-tags work without content', async () => {
    o(await render(`a<if cond="true"></if>b`, makeCtx())).equals('ab')

    o(await render(`a<if cond="true"></if><else></else>b`, makeCtx())).equals('ab')
    o(await render(`a<if cond="false"></if><else></else>b`, makeCtx())).equals('ab')

    o(await render(`a<if cond="true"></if><else-if cond="true"></else-if><else></else>b`, makeCtx())).equals('ab')
    o(await render(`a<if cond="false"></if><else-if cond="true"></else-if><else></else>b`, makeCtx())).equals('ab')
    o(await render(`a<if cond="true"></if><else-if cond="false"></else-if><else></else>b`, makeCtx())).equals('ab')
    o(await render(`a<if cond="false"></if><else-if cond="false"></else-if><else></else>b`, makeCtx())).equals('ab')

    o(await render(`a<if cond="false"></if><else-if cond="true">x</else-if><else></else>b`, makeCtx())).equals('axb')
  })

  o('for-tag works without content', async () => {
    o(await render(`a<for let="_ of [10,20,30]"></for>b`, makeCtx())).equals('ab')
  })

  o('scope-tag works without content', async () => {
    o(await render(`a<scope locals="{}"></scope>b`, makeCtx())).equals('ab')
  })

  o('server script scope', async () => {
    const result = await render(
      `<script type="server">let x = 100; var y = 200; z = 300</script>{{x}},{{y}},{{z}}`,
      makeCtx({ x: 10, y: 20, z: 30 })
    )
    o(result).equals('10,20,30')
  })

  o('server script locals', async () => {
    const result = await render(
      `<script type="server">locals.y = locals.x + 1</script>{{x}},{{y}}`,
      makeCtx({ x: 10, y: 20 })
    )
    o(result).equals('10,11')
  })
})
