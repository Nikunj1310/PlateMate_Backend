FROM node:20-alpine
WORKDIR /app/services/food-inventory-service
COPY services/food-inventory-service/package*.json ./
RUN npm install --production
WORKDIR /app
COPY . .
WORKDIR /app/services/food-inventory-service
EXPOSE 3002
CMD ["node", "index.js"]
