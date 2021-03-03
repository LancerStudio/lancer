# Deploying to Production

Lancer uses a simple server model. All you need with Lancer is:

- A domain
- A server with node.js and a file system

This means you don't need anything of the following, which are required by modern app / serverless hosting:

- A service for uploading files (S3, Google Cloud Storage, etc.)
- A service for hosting your database (Heroku postgres, Amazon DynamoDB, serverless-capable db hosting, etc.)
- A service for caching (memcache, redis, etc.)

Avoiding all these saves you time and money.

Depending on your setup, you can even host multiple Lancer websites on the same box, saving even more time and money.

## Render.com

- After signing up, click `New Web Service`
- Connect and select your git repo
- Fill out name
- Open the `Advanced` section
- Click `Add Environment Variables`
  - Set key `SESSION_SECRET` with a value from runing `lancer secret`
  - Set key `LANCER_DATA_DIR` with value `/var/lancer-data`
  - Set key `LANCER_BUILD_DIR` with value `build`
- Click `Add Disk`
  - Name it something like "Lancer Data"
  - Enter `/var/lancer-data`
  - Pick your starting GB size depending on the needs of your project (you can increase it later)
- Click `Create Web Service`

After your app deploys, push your local data to production:

- `lancer files:push my-app.onrender.com`

Next, create a user for you and your client:

- Click the `>_Shell` tab
- Run `lancer users:create dev alice@example.com --name Alice`
- Copy your temporary password
- Visit https://my-app.onrender.com/lancer/sign-in
- Sign in with your temporary password
- Set a new password

### Custom domain

- Click `Settings`
- Scroll to bottom and click `Add Custom Domain`
- Follow instructions
- Wait for Render to generate SSL certificates for you
  - This could take a while, even after the UI says it's complete

## Digital Ocean (CapRover)

### CapRover Setup

If you've already installed CapRover, you can skip to [project setup](#project-setup)

- [One-click install CapRover](https://marketplace.digitalocean.com/apps/caprover?action=deploy&refcode=6410aa23d3f3)
  - Don't run the `docker` command (one-click already does this), but do everything else in [CapRover Setup](https://caprover.com/docs/get-started.html#caprover-setup)
- After setup, visit your CapRover dashboard
- Navigate to `Apps` in the sidebar
- Check the `Has Persistent Data` checkbox
- Create a new app

### App Config Setup

- Sign into CapRover
- Navigate to `Apps` in the sidebar and click on your app
- Navigate to the `App Configs` tab
- Add some environment variables:
  - Key `SESSION_SECRET` with a value from running `lancer secret` locally
  - Key `LANCER_DATA_DIR` with value `/usr/data/lancer`
- Scroll down to `Persistent Directories`
- Enter `/usr/data/lancer` for `Path in App` and something like `my-app-lancer-data` for `Label`

In your local terminal, create a file named `captain-definition` in the root of your project (if you aren't using yarn, replace `yarn` with `npm` and remove `yarn.lock`):

```json
{
 "schemaVersion": 2,
 "dockerfileLines": [
    "FROM node:14.15.5-alpine",
    "RUN apk update && apk upgrade && apk add --no-cache git",
    "RUN mkdir -p /usr/src/app && mkdir -p /usr/data/lancer",
    "WORKDIR /usr/src/app",
    "COPY package.json yarn.lock /usr/src/app/",
    "RUN apk add --no-cache --virtual .gyp python make g++ && yarn && yarn cache clean --force && apk del .gyp",
    "COPY . /usr/src/app/",
    "RUN yarn build",
    "ENV NODE_ENV production",
    "ENV PORT 80",
    "EXPOSE 80",
    "CMD [ \"yarn\", \"start\" ]"
  ]
}
```

Add this new file to git, commit, and then run `caprover deploy`.

Go back to your CapRover app dashboard:
- Navigate to the `HTTP Settings` tab
- It should tell you your app's subdomain. Click it to check if the deploy worked.
- In the `HTTP Settings` tab, click `Enable HTTPS`
  - This will generate a certificate for you
  - Once done, check if it worked
  - If it worked, scroll down and click the `Force HTTPS...` checkbox
- Optional: Connect a separate domain to your project in the same `HTTP Settings` tab

Once your site is running, you can push up your local data:

- `lancer files:push example.com`
