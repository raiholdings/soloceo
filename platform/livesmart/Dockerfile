FROM node:18-bullseye

# mediasoup worker cần python3 + build tools (nếu không có prebuilt binary)
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 build-essential openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

# self-signed cert để httpolyglot khởi tạo được (Traefik mới là lớp TLS thật)
RUN openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
      -keyout /app/key.pem -out /app/cert.pem \
      -subj "/CN=meeting.soloceo.vn" 2>/dev/null

EXPOSE 9002
CMD ["node", "src/livesmart.js"]
