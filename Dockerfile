FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV OPCUA_PORT=4334
ENV OPCUA_RESOURCE_PATH=/opcua

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 4334

CMD ["node", "index.js"]
