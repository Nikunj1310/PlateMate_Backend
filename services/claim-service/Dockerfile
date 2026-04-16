FROM node:20-alpine
WORKDIR /app/services/claim-service
COPY services/claim-service/package*.json ./
RUN npm install --production
WORKDIR /app
COPY . .
WORKDIR /app/services/claim-service
EXPOSE 3003
CMD ["node", "index.js"]
