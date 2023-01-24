import '../../_test-helper.js'
import o from 'ospec'
import fs from 'fs'
import path from 'path'
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
  const renderHtmlFile = (file, ctx) => {
    const src = path.join(process.env.LANCER_SOURCE_DIR, file)
    return render(fs.readFileSync(src), {
      ...ctx,
      filename: src,
    }).then(result => result.html)
  }

  o('layout include', async () => {
    const ctx = makeCtx({})
    ctx.location = new URL(`file://abc/xyz/123`)

    const result = await renderHtml(`<page layout="/_include-test-layout.html">content`, ctx)
    o(result).equals(`<!DOCTYPE html>
<title>Include Test Layout</title>
<div>
  --include-test-1: /xyz/123--

  content
</div>
`)
  })

  o('simple page alt layout', async () => {
    const result = await renderHtmlFile('client/simple-page-alt-layout.html', makeCtx())
    o(result).equals(
`<!doctype HTML>
<title>BBB | Alt</title>
<p>AA-1</p>

<p>BB</p>

<p>AA-2</p>
`
    )
  })

  o('nested layout page attributes', async () => {
    const result = await renderHtml(`<page layout="/_nested-page-attrs.html" title="CCC">`, makeCtx())
    o(result).equals(
`<!doctype HTML>
<title>CCC | BBB | AAA</title>
`
    )
  })
})