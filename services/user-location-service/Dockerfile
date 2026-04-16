FROM node:20-alpine
WORKDIR /app
COPY . .
WORKDIR /app/services/user-location-service
RUN npm install --production
EXPOSE 3001
CMD ["node", "index.js"]
