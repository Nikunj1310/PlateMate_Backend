FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
WORKDIR /app/services/user-location-service
RUN npm install --production
EXPOSE 3001
WORKDIR /app
CMD ["node", "services/user-location-service/index.js"]
