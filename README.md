# Freelance.js

Freelance.js is a set of tools designed to make it quick to get started on and complete client freelance projects. Freelance.js is optimized for mostly-static content. It does NOT cater to fully-JS-rendered apps.

## Getting Started

To start a project from scratch:

```bash
$ mkdir my-proj && cd my-proj
$ npm init -y
$ npm install freelance
$ mkdir src
$ echo 'It works!' > src/index.html
$ lance dev
```

Now visit [http://localhost:8080](http://localhost:8080).

If `lance dev` didn't work, you need to add `./node_modules/.bin` to the beginning of your path.

## Basics

Lance supports two folders: `src/` and `static/`. Take the following example:


```txt
src/
  js/
    app.js
  product/
    index.html
    pricing.html
  _layout.html
  index.html
  about-us.html
static/
  logo.png
```

Any `.html` file in `src/` is accessible via the root path. For example:

- `/about-us` in the browser maps to `src/about-us.html`
- `/product/pricing` maps to `src/product/pricing.html`
- Both `/` and `/index.html` in the browser map to `src/index.html`
- Both `/product` and `/product/index.html` in the browser map to `src/product/index.html`

However, there are protections. Files that start with an underscore cannot be accessed directly by the browser. JavaScript and CSS files cannot be accessed either unless they are specifically bundled by a tag (see next section).

Applying this to the example:

- `js/app.js` cannot be accessed unless a page has `<script bundle="/js/app.js"></script>`
- `_layout.html` cannot be accessed because it starts with an underscore.


### Bundling JS & CSS

JavaScript and CSS files in `src/` are not immediately accessible. However, you can put them on a page using the special attribute `bundle` on script tags and link tags:

```html
<script bundle="/js/family-pic.js"></script>
<link rel="stylesheet" type="text/css" bundle="/styles/app.css">
```

Note how the script tag uses `bundle=` instead of `src=`, and the link tag uses `bundle=` instead of `href=`. This is how Freelance.js detects an asset *bundle* instead of a simple asset *file*.

JavaScript is bundled using Browserify, and CSS is bundled using PostCSS.

### Static Content

Simply create a `static/` folder (NOT `src/static/`) in your project. Any file in that folder will be publically accessible by the browser. This is good for things like small images, pdfs, etc.

## HTML

Freelance.js gives you foundational layout and asset bundling functionality.

If you need to update content dynamically, you should probably use JavaScript to do so.

### Layouts

Take the following `src/_layout.html` file:

```html
<html>
<head>
  <block name='title'>
    <title>Default Title</title>
  </block>
</head>

<body>
  <div class="content">
    <block name="content"></block>
  </div>
  <footer>
    <block name="footer">footer content</block>
  </footer>
</body>
</html>
```

Notice how there are three `<block>` tags in that file. The one with `name="content"` is required in a layout, whereas the other two are optional.

To use a layout, reference it at the top of your file. Take the following `src/index.html` as an example:

```html
<!--
layout: _layout.html
-->
<content-for name="title">
  <title>Home | The Website</title>
</content-for>

<h1>Welcome to my Client's Website!</h1>

<p>Lorem ipsum blah so dah</p>

<content-for name="footer">
  Footer stuff
</content-for>
```

Although there are only two `<content-for>` tags, all three `<block>` tags from the layout get filled. This is because any content NOT in a `<content-for>` tag gets inserted into the `name="content"` block automatically.

Tips:

- `<content-for>` tags only work at the top-level of the file.
- Layout file names are required to start with an underscore.
- `<block>` tags do not work within the following tags: `title`, `style`, `script`, `iframe`, `xmp`, `noscript`, `noframes`, `noembed`.

## CSS

Freelance.js uses [CSS Next](http://cssnext.io/), a tool for converting future standards into cross-browser CSS. The keyword is **standards**. Unlike SASS or LESS, the features CSS Next makes available to you will eventually be built into all browsers.

If you haven't already, you should take a quick look at the [features page](http://cssnext.io/features/), which will show you the syntax for said features. For example, nesting selectors [by the spec](http://tabatkins.github.io/specs/css-nesting/) looks a bit different coming from LESS or SASS:

```css
.my-thing {
  color: black;
  /* WRONG */
  .hidden { visibility: none; }
  /* RIGHT */
  & .hidden { visibility: none; }
}
```

### Importing Files

[@import statements](https://github.com/postcss/postcss-import) will automatically inline file content. Example:

```css
@import "common/layout.css";
@import "common/buttons.css";
```
