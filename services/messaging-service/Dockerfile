FROM node:20-alpine
WORKDIR /app
COPY . .
WORKDIR /app/services/messaging-service
RUN npm install --production
EXPOSE 3005
CMD ["node", "index.js"]
