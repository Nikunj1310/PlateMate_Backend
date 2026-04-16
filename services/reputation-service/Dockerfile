FROM node:20-alpine
WORKDIR /app/services/reputation-service
COPY services/reputation-service/package*.json ./
RUN npm install --production
WORKDIR /app
COPY . .
WORKDIR /app/services/reputation-service
EXPOSE 3004
CMD ["node", "index.js"]
