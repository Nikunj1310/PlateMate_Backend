FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/reputation-service/package*.json ./services/reputation-service/
RUN npm install --production
WORKDIR /app/services/reputation-service
RUN npm install --production
WORKDIR /app
COPY . .
EXPOSE 3004
CMD ["node", "services/reputation-service/index.js"]
