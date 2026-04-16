FROM node:20-alpine
WORKDIR /app/services/messaging-service
COPY services/messaging-service/package*.json ./
RUN npm install --production
WORKDIR /app
COPY . .
WORKDIR /app/services/messaging-service
EXPOSE 3005
CMD ["node", "index.js"]
