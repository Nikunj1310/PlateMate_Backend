FROM node:20-alpine
WORKDIR /app
COPY . .
WORKDIR /app/services/reputation-service
RUN npm install --production
EXPOSE 3004
CMD ["node", "index.js"]
