FROM node:22.14.0-alpine3.21 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json ./
COPY src/ ./src/
RUN npm run build

FROM node:22.14.0-alpine3.21 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22.14.0-alpine3.21 AS final
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const https = require('https'); const req = https.request({ host: 'localhost', port: 5000, path: '/health', method: 'GET', rejectUnauthorized: false }, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();"

CMD ["node", "dist/server.js"]
