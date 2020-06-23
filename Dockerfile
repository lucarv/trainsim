FROM node:12-alpine
WORKDIR /app/
COPY package*.json ./
RUN npm install --production
COPY . ./
    ENV connString
    CMD ["sh", "-c", "node app.js ${connStr}"]
