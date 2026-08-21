FROM node:20-bullseye

# Install LibreOffice and fonts (needed by libreoffice-convert / officeConvert.js)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    fonts-dejavu \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install node dependencies first (better layer caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the backend source
COPY . .

# Render sets PORT automatically; your server.js already reads process.env.PORT
EXPOSE 10000

CMD ["node", "server.js"]