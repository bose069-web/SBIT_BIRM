# Versión web de Kampus: Expo la exporta como web estática y nginx la sirve.
# Las EXPO_PUBLIC_* se incrustan al construir, por eso son argumentos de build y no variables de entorno.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG EXPO_PUBLIC_BACKEND=memory
ARG EXPO_PUBLIC_SUPABASE_URL=
ARG EXPO_PUBLIC_SUPABASE_KEY=
ENV EXPO_PUBLIC_BACKEND=$EXPO_PUBLIC_BACKEND \
    EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL \
    EXPO_PUBLIC_SUPABASE_KEY=$EXPO_PUBLIC_SUPABASE_KEY
RUN npx expo export --platform web --output-dir dist

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -q --spider http://127.0.0.1/ || exit 1
