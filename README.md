<p align="center">
  <img width="256" height="256" src="public/logo-sq.png">
</p>

# Lancer

Lancer is a radically simple tool for building content-focused websites. It helps you:

- Start a **working** new project with zero configuration
- Provide your non-techical clients & colleagues an easy-to-use UI for editing content and uploading files
- Serve dynamically resized images
- Produce an extremely low-touch, maintainable codebase.
- [And much, much more](https://lancer.studio/docs)

## Getting Started

To start a project from scratch:

```bash
$ mkdir my-proj && cd my-proj
$ npm init -y
$ npm install @lancer/studio
$ npx lancer init all
$ npm run dev
```

Now visit [http://localhost:7272](http://localhost:7272).

## Docs

[View the documentation](https://lancer.studio/docs).

## Deploying to Production

See [Deploying to Production](./deploying-to-production.md)

## Developing

```
$ npm install
$ npm test  # or npm test-watch
$ npm link  # for running locally in your own project
$ npm build
```

## Internal Notes

- [SQLite is not a toy database](https://antonz.org/sqlite-is-not-a-toy-database/)
- [Scaling sqlite3 to 4m queries per second on a single server](https://blog.expensify.com/2018/01/08/scaling-sqlite-to-4m-qps-on-a-single-server/)
- [How Browser Language Redirect Affects Google Indexing](https://wpml.org/documentation/getting-started-guide/language-setup/automatic-redirect-based-on-browser-language/how-browser-language-redirect-affects-google-indexing/)
- [You might not need a static site](https://www.browserlondon.com/blog/2020/04/20/issues-with-jamstack-you-might-need-backend/)
