# Build: generates dist/ (SEO pages per language and per project, sitemap, robots)
FROM node:22-alpine AS build
WORKDIR /app
COPY scripts/build.mjs scripts/build.mjs
COPY src src
RUN node scripts/build.mjs

# Serve
FROM nginx:alpine
COPY deploy/app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
