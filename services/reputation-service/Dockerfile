FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
WORKDIR /app/services/reputation-service
RUN npm install --production
EXPOSE 3004
WORKDIR /app
CMD ["node", "services/reputation-service/index.js"]
