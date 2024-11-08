# Telegram Gift App Backend

## Tech

- Node.js
- TypeScript
- MongoDB + Mongoose
- Nestjs + Fastify + TS-rest (for frontend sdk)
- GrammY
- S3 compatible storage

## Deploy

Prepared to deploy on DigitalOcean App Platform.

## Setup

```bash
npm install
```

## Env

```bash
cp .env.template .env
```

Params:

**ENV** - local, dev, prod

**PORT**

**SERVER_URL** - url to build webhook url

**TG_BOT_TOKEN** - telegram bot token

**TG_MINI_APP_URL** - url to build mini app urls

**CRYPTO_BOT_TOKEN** - crypto bot token

**CRYPTO_BOT_API_URL** - crypto bot api url

**MONGO_URL** - mongo url

**MONGO_DB** - mongo db name

**STORE_INIT_STATE**=[{"name":"cake","price":0.01,"currency":"TON","amount":500,"id":1},{"name":"star-green","price":0.01,"currency":"ETH","amount":3000,"id":2},{"name":"star-blue","price":1,"currency":"USDT","amount":5000,"id":3},{"name":"star-red","price":0.01,"currency":"JET","amount":10000,"id":4},{"name":"sold-out","price":0.00001,"currency":"JET","amount":0,"id":5}]

**BOT_MAIN_IMAGE_BIG** - url to image for start message

**BOT_MAIN_IMAGE_INLINE** - url to image for inline message

**FILE_STORAGE_PATH** - path to store files

**DO_SPACES_KEY** - DigitalOcean Spaces key

**DO_SPACES_SECRET** - DigitalOcean Spaces secret

**DO_SPACE_ENDPOINT** - DigitalOcean Spaces endpoint

**DO_SPACE_BUCKET** - DigitalOcean Spaces bucket

**CDN_URL** - url to store user photos

**NO_PHOTO_PLACEHOLDER_URL** - url to placeholder image

## Test

MongoDB start using testcontainers.

```bash
npm run test
```

## Run

MongoDB must be running.

```bash
npm run start:prod
```

## Build SDK for frontend

sdk/package/package.json must be updated with repository settings.

```bash
npm run build:sdk
```

# Warnings

- Telegram initData validation can not be imported from **@telegram-apps/init-data-node** because it is not compatible with ESM.

- No routines for overbooking.

- checkSignature for crypto bot webhook doesn't work as expected from the docs.
