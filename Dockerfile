FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY assets ./assets
COPY ai-rulesets ./ai-rulesets
COPY hivemind-api ./hivemind-api
COPY scripts/opensearch-init.mjs ./scripts/opensearch-init.mjs
COPY package.json ./
EXPOSE 4010
CMD ["node", "hivemind-api/src/server.mjs"]
