FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
COPY scripts ./scripts
COPY data ./data
COPY public ./public
ARG SITE_URL=
ARG WHATSAPP_NUMBER=
ENV SITE_URL=${SITE_URL} WHATSAPP_NUMBER=${WHATSAPP_NUMBER}
RUN node scripts/check.mjs && node scripts/build.mjs

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD wget -q -O /dev/null http://127.0.0.1:8080/health.txt || exit 1
