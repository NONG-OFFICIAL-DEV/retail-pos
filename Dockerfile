# Stage 1: Build
FROM node:20 AS build-stage
WORKDIR /app

ARG VITE_APP_MODE
ARG VITE_APP_API_BASE_URL
ARG VITE_APP_I18N_LOCALE
ARG VITE_APP_I18N_FALLBACK_LOCALE
ARG VITE_APP_API_BASE_AI_URL

ENV VITE_APP_MODE=$VITE_APP_MODE
ENV VITE_APP_API_BASE_URL=$VITE_APP_API_BASE_URL
ENV VITE_APP_I18N_LOCALE=$VITE_APP_I18N_LOCALE
ENV VITE_APP_I18N_FALLBACK_LOCALE=$VITE_APP_I18N_FALLBACK_LOCALE
ENV VITE_APP_API_BASE_AI_URL=$VITE_APP_API_BASE_AI_URL

# Receive token as build arg
ARG GITHUB_TOKEN

# Setup registry auth
RUN echo "@nong-official-dev:registry=https://npm.pkg.github.com" > .npmrc && \
    echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc
    
COPY package*.json ./
RUN npm install

# Remove token after install
RUN rm -f .npmrc

COPY . .
RUN npm run build

# Stage 2: Serve with Caddy
FROM caddy:2-alpine
COPY --from=build-stage /app/dist /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile
