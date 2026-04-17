FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/messaging-service/package*.json ./services/messaging-service/
RUN npm install --production
COPY . .
WORKDIR /app/services/messaging-service
RUN npm install --production
WORKDIR /app
EXPOSE 3005
CMD ["node", "services/messaging-service/index.js"]
