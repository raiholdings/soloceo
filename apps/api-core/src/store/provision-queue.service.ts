import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";

export interface ProvisionJobData {
  ventureId: string;
  installIds: string[];
}

export interface RemoveJobData {
  installId: string;
}

@Injectable()
export class ProvisionQueueService implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor(config: ConfigService) {
    this.queue = new Queue("provision", {
      connection: {
        url: config.get("REDIS_URL") ?? "redis://localhost:6379",
      },
      defaultJobOptions: {
        // retry 2 lần (Phần 7) → tổng 3 attempts
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }

  enqueueProvision(data: ProvisionJobData) {
    return this.queue.add("provision", data);
  }

  enqueueRemove(data: RemoveJobData) {
    return this.queue.add("remove", data);
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
