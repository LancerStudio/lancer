<p align="center">
  <img width="256" height="256" src="public/logo-sq.png">
</p>

# Lancer

Lancer is a radically simple tool for building content-focused websites. It helps you:

- Start a **working** new project with zero configuration
- Provide your non-techical clients & colleagues an easy-to-use UI for editing content and uploading files
- Serve dynamically resized images
- Produce an extremely low-touch, maintainable codebase.

Lancer DOES NOT cater to fully-JS-rendered apps. If you're building a full-fledged web app, I suggest using Lancer for your landing, marketing, about, etc. pages, and something like Ruby on Rails or Next.js for your heavy application code on an `app.example.com` subdomain.

## WARNING

Lancer is in ALPHA. It works well for what it does, but many useful features are still missing.

## Getting Started

To start a project from scratch:

```bash
$ mkdir my-proj && cd my-proj
$ npm init -y
$ npm install freelance
$ npx lancer init all
$ npm run dev
```

Now visit [http://localhost:7272](http://localhost:7272).

If `lancer dev` didn't work, you need to add `./node_modules/.bin` to the beginning of your `PATH`.

## Workflow Overview

- Create your project: (see [Getting Started](#user-content-getting-started))
- Write html/css/js; specify and populate data; drag files & images into `data/files`
- Push code to a host like DigitalOcean
- Push data and files to production: `lancer push https://example.com`
- All done!

## Basics

Lancer requires your content to be in a `client/` folder. Take the following example:

```txt
client/
  product/
    index.html
    pricing.html
  _layout.html
  index.html
  index.js
  about-us.html
```

Any `.html` file in `client/` is accessible via the root path. For example:

- `/about-us` in the browser maps to `client/about-us.html`
- `/product/pricing` maps to `client/product/pricing.html`
- Both `/` and `/index.html` in the browser map to `client/index.html`
- Both `/product` and `/product/index.html` in the browser map to `client/product/index.html`

However, not everything is public. Files that start with an underscore cannot be accessed directly by the browser. JavaScript and CSS files cannot be accessed either unless they are specifically bundled by a tag (see next section).

Applying this logic to the example:

- `index.js` cannot be accessed unless a page has `<script bundle="/index.js"></script>`
- `_layout.html` cannot be accessed because it starts with an underscore.


### Bundling JS & CSS

JavaScript and CSS files in `client/` are not immediately accessible for security. However, you can put them on a page using the special attribute `bundle` on script tags and link tags:

```html
<script bundle="/js/my-file.js"></script>
<link rel="stylesheet" type="text/css" bundle="/styles/my-file.css">
```

Note how the script tag uses `bundle=` instead of `src=`, and the link tag uses `bundle=` instead of `href=`. This is how Lancer detects an asset *bundle* instead of a simple asset *file*.

JavaScript is bundled using [esbuild](https://esbuild.github.io), while CSS is bundled using [PostCSS](https://postcss.org).

### Static Content

Simply create a `client/public/` folder in your project. Any file in that folder will be publically accessible by the browser. This is good for small files like favicons.

HOWEVER, you will want to put the majority of your files in the `data/files/` directory. This directory IS NOT committed to git, to your benefit. You can use this to develop locally and push it to your server.

## HTML

Lancer gives you foundational layout and asset bundling functionality.

If you need to update content dynamically, you should probably use JavaScript to do so.

### Basic Logic

See docs for [posthtml-expressions](https://github.com/posthtml/posthtml-expressions).

### Dynamic Image Resizing

For any image file in your `data/files` directory, you can request a resized version of that image quite easily. Great for image galleries or responsive image definitions.

For example, to create a gallery preview image definition, you can put this in your `site.config.js`:

```js
module.exports = {
  name: 'My App',
  // ...

  //
  // See resize options here: https://sharp.pixelplumbing.com/api-resize#resize
  //
  imagePreviews: sharp => ({
    myGalleryDef: {
      width: 360,
      height: 240,
      fit: sharp.fit.outside,
    },
  })
}
```

Now, assuming you have an image file in `data/files/my-page/my-image.jpg`, you can request a smaller size like so:

```html
<img src="/files/my-page/my-image.jpg?preview=myGalleryDef" />
```

And that's it! Lancer will generate and cache the image for you in `data/cache`.

## CSS

Lancer uses [PostCSS](https://postcss.org) and recommends using Tailwind CSS with it.

### Importing Files

[@import statements](https://github.com/postcss/postcss-import) will automatically inline file content. Example:

```css
@import "common/layout.css";
@import "common/buttons.css";
```

## Internationalization (i18n)

Not only does Lancer support i18n out of the box, it also gives you and your client a super-easy way to edit translations (after you sign in).

To start, just use the `<t>` tag in your html. For example:

```
<t>home.header.title</t>
```

The server will render this on the page, and make it editable if you're signed in. Simply **alt-click** the text and a textarea will appear on the screen.

`hreflang` attributes are added according to [Google's recommendations](https://developers.google.com/search/docs/advanced/crawling/localized-versions)

## Deploying to Production

See [Deploying to Production](./deploying-to-production.md)

## Developing

```
$ npm install
$ npm test  # or npm test-watch
$ npm link  # for running locally in your own project
$ npm build
```

## Roadmap

- Dynamic routes
- Structured content (lists, etc.)
- Database import/export UI
- Secrets manager

## Internal Notes

- [SQLite is not a toy database](https://antonz.org/sqlite-is-not-a-toy-database/)
- [Scaling sqlite3 to 4m queries per second on a single server](https://blog.expensify.com/2018/01/08/scaling-sqlite-to-4m-qps-on-a-single-server/)
- [How Browser Language Redirect Affects Google Indexing](https://wpml.org/documentation/getting-started-guide/language-setup/automatic-redirect-based-on-browser-language/how-browser-language-redirect-affects-google-indexing/)
