FROM node:20-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY public ./public
RUN mkdir -p /app/data
VOLUME ["/app/data"]
ENV PORT=8080 DATA_DIR=/app/data
EXPOSE 8080
CMD ["node", "server.js"]
