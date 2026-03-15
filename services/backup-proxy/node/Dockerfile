FROM node:20-alpine AS deps
WORKDIR /app

ARG PNPM_VERSION=8.15.8
RUN corepack enable && corepack prepare "pnpm@${PNPM_VERSION}" --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=128

COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./package.json
COPY .env.example ./.env.example

EXPOSE 3001

CMD ["node", "src/index.js"]
