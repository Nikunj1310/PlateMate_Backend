FROM node:20-alpine
WORKDIR /app/services/user-location-service
COPY services/user-location-service/package*.json ./
RUN npm install --production
WORKDIR /app
COPY . .
WORKDIR /app/services/user-location-service
EXPOSE 3001
CMD ["node", "index.js"]
