FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
WORKDIR /app/services/messaging-service
RUN npm install --production
EXPOSE 3005
WORKDIR /app
CMD ["node", "services/messaging-service/index.js"]
