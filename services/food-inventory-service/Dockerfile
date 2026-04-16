FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
WORKDIR /app/services/food-inventory-service
RUN npm install --production
EXPOSE 3002
WORKDIR /app
CMD ["node", "services/food-inventory-service/index.js"]
