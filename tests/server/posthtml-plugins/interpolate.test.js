import '../../_test-helper.js'
import o from 'ospec'
import {render} from '../../../dist/server/render.js'

o.spec('interpolate', () => {

  let makeCtx = (locals, site) => ({
    // req: {},
    site: { locals, locales: ['en'], ...site },
    user: null,
    cache: {},
    locale: 'en',
    reqPath: '/',
    filename: 'interpolate-test.html',
  })

  const renderHtml = (...args) => render(...args).then(result => result.html)

  o('basic interpolation', async () => {
    const result = await renderHtml(`<p class="{{x}}">a{{z}}c</p>`, makeCtx({ x: '/a/b/c', y: 'aria-label="hm"', z: 'b' }))
    o(result).equals(`<p class="/a/b/c">abc</p>`)
  })

  o('throws on missing reference', async () => {
    try {
      await renderHtml(`<p>{{idontexist}}</p>`, makeCtx())
      o(false).equals('should not get here')
    }
    catch(err) {
      o(err.message).equals('idontexist is not defined')
    }
  })

  o('locals for optional references', async () => {
    const result = await renderHtml(`<p>{{locals.x}}</p>`, makeCtx())
    o(result).equals(`<p></p>`)
  })

  o('locals reference', async () => {
    const result = await renderHtml(`<p>{{locals.x}}</p>`, makeCtx({ x: 99 }))
    o(result).equals(`<p>99</p>`)
  })

  o('full attribute interpolation', async () => {
    const result = await renderHtml(`<p {{x}}></p>`, makeCtx({ x: 'aria-label="test"' }))
    o(result).equals(`<p aria-label="test"></p>`)
  })

  o('omits falsey attribute names', async () => {
    const result = await renderHtml(`<p {{false}} {{undefined}} {{null}} {{0}}="10"></p>`, makeCtx())
    o(result).equals(`<p></p>`)
  })

  o('omits most falsey values from text interpolation', async () => {
    const result = await renderHtml(`<p>a{{false}}{{undefined}}{{null}}{{0}}{{''}}b</p>`, makeCtx())
    o(result).equals(`<p>a0b</p>`)
  })

  o('toString attribute', async () => {
    const result = await renderHtml(`<p class="{{obj}}"></p>`, makeCtx({ obj: { x: 10, toString(){return this.x} } }))
    o(result).equals('<p class="10"></p>')
  })

  o('toString text', async () => {
    const result = await renderHtml(`<p>{{obj}}</p>`, makeCtx({ obj: { x: 10, toString(){return this.x} } }))
    o(result).equals('<p>10</p>')
  })

  o('standalone if', async () => {
    const result = await renderHtml(`<if cond="true">yes</if><if cond="0">no</if>`, makeCtx())
    o(result).equals(`yes`)
  })

  o('if-else', async () => {
    const renderChain = (a,b) => renderHtml(`<if cond="${a}">A</if>\n\n<else>B</else>`, makeCtx())

    o(await renderChain('1+1', 'true')).equals('A')
    o(await renderChain('null', 'true')).equals('B')
  })

  o('if-else-if-else', async () => {
    const renderChain = (a,b) => renderHtml(
      `<if cond="${a}">A</if><else-if cond="${b}">B</else-if><else>C</else>`,
      makeCtx()
    )

    o(await renderChain('1+1', 'true')).equals('A')
    o(await renderChain('null', 'true')).equals('B')
    o(await renderChain(`''`, 'undefined')).equals('C')
  })

  o('nested layout page attributes', async () => {
    const result = await renderHtml(`<page layout="/_nested-page-attrs.html" title="CCC">`, makeCtx())
    o(result).equals(
`<!doctype HTML>
<title>CCC | BBB | AAA</title>
`
    )
  })

  o('scope tag', async () => {
    const result = await renderHtml(`<scope locals="{ x: 100, y: y+1 }"><p>{{x}},{{locals.y}}</p></scope>`, makeCtx({ x: 10, y: 20 }))
    o(result).equals(`<p>100,21</p>`)
  })

  o('include', async () => {
    const result = await renderHtml(`<include src="_x.html" locals="{ x: 100 }">`, makeCtx({ x: 10 }))
    o(result).equals(`<p>x:100</p>\n`)
  })

  o('nested include', async () => {
    const result = await renderHtml(`<include src="_x-nested.html" locals="{ x: 100 }">`, makeCtx({ x: 10 }))
    o(result).equals(`<p>x-parent1:100</p><p>x:111</p>\n<p>x-parent2:100</p>\n`)
  })

  o('template include', async () => {
    const result = await renderHtml(
      `<template type="foo">_x.html</template>`,
      makeCtx({ x: 11 }, {
        templateTypes: {
          foo(content, _attrs, config) {
            config.recurse = true
            return `<include src="${content}">`
          }
        }
      })
    )
    o(result).equals('<p>x:11</p>\n')
  })

  o('template no include', async () => {
    const result = await renderHtml(
      `<template type="foo">_x.html</template>`,
      makeCtx({ x: 11 }, {
        templateTypes: {
          foo(content) {
            return `<include src="${content}">`
          }
        }
      })
    )
    o(result).equals(`<include src="_x.html">`)
  })

  o('if-tags work without content', async () => {
    o(await renderHtml(`a<if cond="true"></if>b`, makeCtx())).equals('ab')

    o(await renderHtml(`a<if cond="true"></if><else></else>b`, makeCtx())).equals('ab')
    o(await renderHtml(`a<if cond="false"></if><else></else>b`, makeCtx())).equals('ab')

    o(await renderHtml(`a<if cond="true"></if><else-if cond="true"></else-if><else></else>b`, makeCtx())).equals('ab')
    o(await renderHtml(`a<if cond="false"></if><else-if cond="true"></else-if><else></else>b`, makeCtx())).equals('ab')
    o(await renderHtml(`a<if cond="true"></if><else-if cond="false"></else-if><else></else>b`, makeCtx())).equals('ab')
    o(await renderHtml(`a<if cond="false"></if><else-if cond="false"></else-if><else></else>b`, makeCtx())).equals('ab')

    o(await renderHtml(`a<if cond="false"></if><else-if cond="true">x</else-if><else></else>b`, makeCtx())).equals('axb')
  })

  o('for-tag works without content', async () => {
    o(await renderHtml(`a<for let="_ of [10,20,30]"></for>b`, makeCtx())).equals('ab')
  })

  o('scope-tag works without content', async () => {
    o(await renderHtml(`a<scope locals="{}"></scope>b`, makeCtx())).equals('ab')
  })

  o('if-for', async () => {
    const result = await renderHtml(`a<if cond="true"><for let="x of xs">{{x}}</for></if>b`, makeCtx({ xs: [10,20] }))
    o(result).equals('a1020b')
  })

  o('server script scope', async () => {
    const result = await renderHtml(
      `<script server>let x = 100; var y = 200; z = 300</script>{{x}},{{y}},{{z}}`,
      makeCtx({ x: 10, y: 20, z: 30 })
    )
    o(result).equals('10,20,30')
  })

  o('server script locals', async () => {
    const result = await renderHtml(
      `<script server>locals.y = locals.x + 1</script>{{x}},{{y}}`,
      makeCtx({ x: 10, y: 20 })
    )
    o(result).equals('10,11')
  })
})
