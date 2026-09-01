FROM node:22.14.0-alpine

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production

RUN npm install --global pnpm@11.20.0

COPY . .

RUN pnpm install --frozen-lockfile
RUN DATABASE_URL=postgresql://localhost:5432/prisma_generate pnpm --filter @lwill/database run generate
RUN pnpm build

ENV PORT=8080

EXPOSE 8080

CMD ["pnpm", "--filter", "web", "start"]
