FROM node:20
WORKDIR /app
COPY . .
RUN corepack enable && \
    corepack install --global pnpm@latest
RUN pnpm install --frozen-lockfile
RUN pnpm build
ENV NODE_ENV=production
EXPOSE 6001
CMD ["pnpm", "runserver"]
