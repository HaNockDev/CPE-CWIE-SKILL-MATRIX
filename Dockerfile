# Hugging Face Spaces (Docker SDK) — enable "Persistent storage" so /data survives restarts
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY public ./public
ENV NODE_ENV=production PORT=7860
RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 7860
CMD ["node", "server/index.js"]
