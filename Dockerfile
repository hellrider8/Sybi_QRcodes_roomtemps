FROM node:20-slim
WORKDIR /usr/src/app
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 8080
CMD [ "node", "server.js" ]
