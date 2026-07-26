FROM node:20-slim
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY public ./public
ENV DB_PATH=/data/bigdata.db PORT=8080
VOLUME /data
EXPOSE 8080
CMD ["node","server.js"]
