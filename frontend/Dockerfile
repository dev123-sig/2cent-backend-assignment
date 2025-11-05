# syntax=docker/dockerfile:1

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Accept Vite envs at build time
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}
RUN echo "Building with VITE_API_URL=${VITE_API_URL} VITE_WS_URL=${VITE_WS_URL}" && npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm i -g serve@14.2.1
COPY --from=build /app/dist ./dist

EXPOSE 5173
# Serve static build
CMD ["serve", "-s", "dist", "-l", "5173"]
