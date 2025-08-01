FROM node:20-alpine AS build
WORKDIR /app
COPY client/package*.json ./
RUN npm ci || npm install
COPY client/. .
ARG VITE_API_URL
RUN echo "VITE_API_URL=${VITE_API_URL:-http://server:8080}" > .env.production
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
