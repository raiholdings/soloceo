/**
 * Devstack — chạy Postgres 15 + Redis project-local cho môi trường dev
 * (máy không có Docker/Homebrew). Prod dùng docker-compose.core.yml.
 *
 *   pnpm --filter @soloceo/devstack start
 *
 * Postgres: localhost:5432, user postgres/postgres, db soloceo
 * Redis:    localhost:6379
 */
import EmbeddedPostgres from "embedded-postgres";
import { RedisMemoryServer } from "redis-memory-server";
import path from "node:path";

const DATA_DIR = path.join(__dirname, "..", ".pgdata");

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password: "postgres",
    port: 5432,
    persistent: true,
  });

  const fs = await import("node:fs");
  if (!fs.existsSync(path.join(DATA_DIR, "PG_VERSION"))) {
    console.log("devstack: khởi tạo cluster Postgres lần đầu...");
    await pg.initialise();
  }
  await pg.start();
  const client = pg.getPgClient();
  await client.connect();
  const exists = await client.query(
    "SELECT 1 FROM pg_database WHERE datname='soloceo'",
  );
  if (exists.rowCount === 0) {
    // UTF8 bắt buộc cho tiếng Việt (cluster init mặc định SQL_ASCII)
    await client.query(
      "CREATE DATABASE soloceo ENCODING 'UTF8' TEMPLATE template0",
    );
  }
  await client.end();
  console.log("devstack: Postgres sẵn sàng — postgres://postgres:postgres@localhost:5432/soloceo");

  const redis = new RedisMemoryServer({
    instance: { port: 6379 },
  });
  await redis.getHost();
  console.log(`devstack: Redis sẵn sàng — redis://localhost:${await redis.getPort()}`);
  console.log("devstack: nhấn Ctrl+C để dừng.");

  const shutdown = async () => {
    console.log("\ndevstack: đang dừng...");
    await redis.stop().catch(() => {});
    await pg.stop().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  // giữ tiến trình sống
  setInterval(() => {}, 1 << 30);
}

main().catch((err) => {
  console.error("devstack lỗi:", err);
  process.exit(1);
});
