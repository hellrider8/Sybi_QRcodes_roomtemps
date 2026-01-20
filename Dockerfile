FROM node:20-slim

# Verzeichnis für die App erstellen
WORKDIR /usr/src/app

# Abhängigkeiten kopieren
COPY package*.json ./

# Nur Produktions-Abhängigkeiten installieren
RUN npm install --production

# Quellcode der App kopieren
COPY . .

# Der Server nutzt standardmäßig Port 3000
EXPOSE 3000

# Startbefehl für den Server
CMD [ "node", "server.js" ]
