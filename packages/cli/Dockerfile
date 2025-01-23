FROM ghcr.io/puppeteer/puppeteer:21.2.1@sha256:46314c20ce7e5997175241c93a1a707e1e9df84b38625fb229675c9e3b075147

COPY ./dist /app

ENV NODE_OPTIONS=--enable-source-maps PUPPETEER_CACHE_DIR="/home/pptruser/.cache/puppeteer"

RUN mkdir "/site"
WORKDIR "/site"

CMD ["node", "/app/index.js"]
