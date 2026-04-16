FROM node:20-alpine
WORKDIR /app
COPY . .
WORKDIR /app/services/claim-service
RUN npm install --production
EXPOSE 3003
CMD ["node", "index.js"]
