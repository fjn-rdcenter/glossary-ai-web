ARG GLOSSARYAI_WEBAPP_BUILD_VARIANT=build_without_proxy

# ==========================================
# VARIANT 1: BUILD WITHOUT PROXY
# ==========================================
FROM node:20.12.2-alpine3.19 AS build_without_proxy

RUN npm install --global corepack@0.31.0 && corepack enable

ONBUILD WORKDIR /app
ONBUILD COPY package.json yarn.lock .yarnrc.yml ./
ONBUILD RUN yarn install --immutable
ONBUILD COPY . .

ONBUILD ENV NEXT_TELEMETRY_DISABLED=1
ONBUILD RUN yarn build

# ==========================================
# VARIANT 2: BUILD WITH PROXY
# ==========================================

FROM node:20.12.2-alpine3.19 AS build_with_proxy

ARG GLOSSARYAI_WEBAPP_PROXY_CONNECTION_STRING

RUN npm config set proxy "${GLOSSARYAI_WEBAPP_PROXY_CONNECTION_STRING}" \
    && npm config set https-proxy "${GLOSSARYAI_WEBAPP_PROXY_CONNECTION_STRING}" \
    && npm config set strict-ssl false \
    && npm install --global corepack@0.31.0 \
    && corepack enable

ONBUILD WORKDIR /app
ONBUILD COPY package.json yarn.lock .yarnrc.yml ./

ONBUILD RUN NODE_TLS_REJECT_UNAUTHORIZED=0 HTTP_PROXY="${GLOSSARYAI_WEBAPP_PROXY_CONNECTION_STRING}" HTTPS_PROXY="${GLOSSARYAI_WEBAPP_PROXY_CONNECTION_STRING}" yarn config set httpProxy "${GLOSSARYAI_WEBAPP_PROXY_CONNECTION_STRING}" >/dev/null
ONBUILD RUN yarn config set httpsProxy "${GLOSSARYAI_WEBAPP_PROXY_CONNECTION_STRING}" >/dev/null
ONBUILD RUN yarn config set enableStrictSsl false
ONBUILD RUN yarn config set httpRetry 8
ONBUILD RUN yarn config set httpTimeout 120000
ONBUILD RUN yarn config set networkConcurrency 8
ONBUILD RUN yarn install --immutable

ONBUILD COPY . .

ONBUILD ENV NEXT_TELEMETRY_DISABLED=1
ONBUILD RUN yarn build

FROM ${GLOSSARYAI_WEBAPP_BUILD_VARIANT} AS source_stage

FROM node:20.12.2-alpine3.19 AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=source_stage --chown=nextjs:nodejs /app/.next/standalone ./

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
