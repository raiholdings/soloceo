// svc-provision — worker provisioning (BullMQ + Coolify API), CLAUDE.md Phần 7.
import { startWorker } from "./worker";

const worker = startWorker();

// retry 2 lần được cấu hình phía producer (api-core) khi enqueue job

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});
