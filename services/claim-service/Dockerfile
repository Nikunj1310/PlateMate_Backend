FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/claim-service/package*.json ./services/claim-service/
RUN npm install --production
WORKDIR /app/services/claim-service
RUN npm install --production
WORKDIR /app
COPY . .
EXPOSE 3003
CMD ["node", "services/claim-service/index.js"]
