FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/food-inventory-service/package*.json ./services/food-inventory-service/
RUN npm install --production
WORKDIR /app/services/food-inventory-service
RUN npm install --production
WORKDIR /app
COPY . .
EXPOSE 3002
CMD ["node", "services/food-inventory-service/index.js"]
