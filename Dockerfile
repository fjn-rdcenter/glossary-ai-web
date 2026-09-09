ARG TS_WEBAPP_BUILD_VARIANT

# ==========================================
# VARIANT 1: BUILD WITHOUT PROXY
# ==========================================
FROM node:20.12.2-alpine3.19 AS build_without_proxy

ONBUILD WORKDIR /app
ONBUILD COPY package*.json ./
ONBUILD RUN yarn install --frozen-lockfile
ONBUILD COPY . .

ONBUILD ENV NEXT_TELEMETRY_DISABLED 1
ONBUILD RUN yarn build

# ==========================================
# VARIANT 2: BUILD WITH PROXY
# ==========================================

FROM node:20.12.2-alpine3.19 AS build_with_proxy

ARG TS_WEBAPP_PROXY_CONNECTION_STRING

ONBUILD WORKDIR /app
ONBUILD COPY package*.json ./

ONBUILD RUN yarn config set proxy ${TS_WEBAPP_PROXY_CONNECTION_STRING}
ONBUILD RUN yarn config set https-proxy ${TS_WEBAPP_PROXY_CONNECTION_STRING}
ONBUILD RUN yarn config set "strict-ssl" false
ONBUILD RUN yarn install --frozen-lockfile

ONBUILD COPY . .

ONBUILD ENV NEXT_TELEMETRY_DISABLED 1
ONBUILD RUN yarn build

FROM ${TS_WEBAPP_BUILD_VARIANT} AS source_stage

FROM node:20.12.2-alpine3.19 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=source_stage /app/public ./public

COPY --from=source_stage --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --from=source_stage --chown=nextjs:nodejs /app/.next/standalone ./

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]