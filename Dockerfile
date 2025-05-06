
FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3001

CMD echo "Starting BACKEND service..." && \
    echo "Running npm run dev..." && \
    npm run dev
    # CMD ["npm", "start"]

