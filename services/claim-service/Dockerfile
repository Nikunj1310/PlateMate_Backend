FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
WORKDIR /app/services/claim-service
RUN npm install --production
EXPOSE 3003
WORKDIR /app
CMD ["node", "services/claim-service/index.js"]
