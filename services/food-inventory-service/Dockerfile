FROM node:20-alpine
WORKDIR /app
COPY . .
WORKDIR /app/services/food-inventory-service
RUN npm install --production
EXPOSE 3002
CMD ["node", "index.js"]
