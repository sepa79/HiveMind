FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HIVEMIND_DATA_ROOT=/data
RUN apk upgrade --no-cache \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-* \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg \
    && mkdir -p /data && chown node:node /data
COPY --from=deps /app/node_modules ./node_modules
COPY assets ./assets
COPY ai-rulesets ./ai-rulesets
COPY hivemind-api ./hivemind-api
COPY hivemind-mcp ./hivemind-mcp
COPY scripts/opensearch-init.mjs ./scripts/opensearch-init.mjs
COPY package.json ./
USER node
EXPOSE 4010 4011
CMD ["node", "hivemind-api/src/server.mjs"]
