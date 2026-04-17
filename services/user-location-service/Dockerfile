FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/user-location-service/package*.json ./services/user-location-service/
RUN npm install --production
COPY . .
WORKDIR /app/services/user-location-service
RUN npm install --production
WORKDIR /app
EXPOSE 3001
CMD ["node", "services/user-location-service/index.js"]
