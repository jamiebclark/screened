FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-engines

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn db:generate
RUN yarn build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma needs its config, schema, migrations, and generated client.
# Only install prisma (not full dev deps) to keep the image lean.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src/generated ./src/generated
# Pin the CLI to the exact @prisma/client version this image was built against.
# An unpinned `yarn add prisma` resolves to whatever npm tags `latest`, which
# drifted to a v8 prerelease that renames `migrate` to `migration` — the CMD
# below then fails, and because it is &&-chained the server never starts.
RUN PRISMA_VERSION="$(node -p "require('./package.json').dependencies['@prisma/client'].replace(/^\D*/,'')")" && \
    yarn add "prisma@${PRISMA_VERSION}" --exact --ignore-engines && yarn cache clean && \
    chown -R nextjs:nodejs node_modules

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node server.js"]
