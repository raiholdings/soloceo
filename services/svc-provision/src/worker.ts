/**
 * Worker provisioning (CLAUDE.md Phần 7):
 * job "provision" {ventureId, installIds} → tạo project Coolify (nếu chưa có),
 * deploy từng app từ template, poll trạng thái, cập nhật AppInstall/Venture.
 */
import { Worker, type Job } from "bullmq";
import { prisma } from "@soloceo/db";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import Mustache from "mustache";
import { createCoolifyClient, type ICoolifyClient } from "./coolify-client";

export interface ProvisionJobData {
  ventureId: string;
  installIds: string[];
}

const TEMPLATES_DIR =
  process.env.TEMPLATES_DIR ??
  path.join(__dirname, "..", "..", "..", "infra", "coolify", "templates");

const APP_DOMAIN = process.env.PUBLIC_APP_DOMAIN ?? "app.soloceo.vn";
const DEPLOY_TIMEOUT_MS = 10 * 60 * 1000; // 10 phút (Phần 7)
const POLL_INTERVAL_MS = Number(process.env.PROVISION_POLL_MS ?? 5000);

function subdomainFor(slug: string, appKey: string): string {
  // ADR-005: claw3d = domain chính (nền desktop); openclaw/erpnext có subdomain riêng
  const suffix =
    appKey === "claw3d"
      ? ""
      : appKey === "openclaw"
        ? "-ai"
        : appKey === "erpnext"
          ? "-erp"
          : `-${appKey.split("-")[0]}`;
  return `${slug}${suffix}.${APP_DOMAIN}`;
}

function renderTemplate(
  templateFile: string,
  view: Record<string, string>,
): string {
  const raw = readFileSync(path.join(TEMPLATES_DIR, templateFile), "utf8");
  return Mustache.render(raw, view);
}

async function waitUntilRunning(
  coolify: ICoolifyClient,
  appUuid: string,
): Promise<void> {
  const deadline = Date.now() + DEPLOY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const status = await coolify.getStatus(appUuid);
    if (status.includes("running")) return;
    if (status.includes("exited") || status.includes("failed")) {
      throw new Error(`Deploy thất bại — trạng thái Coolify: ${status}`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error("Deploy quá 10 phút — timeout");
}

export async function processProvisionJob(job: Job<ProvisionJobData>) {
  const coolify = createCoolifyClient();
  const { ventureId, installIds } = job.data;

  const venture = await prisma.venture.findUniqueOrThrow({
    where: { id: ventureId },
    include: { org: true },
  });

  // 1. Project Coolify per-tenant: "vt-{slug}" — cô lập network (Phần 7)
  const serverUuid = await coolify.pickServerUuid();
  const project = await coolify.createProject(`vt-${venture.slug}`);
  await job.log(`Project Coolify: ${project.uuid} trên server ${serverUuid}`);

  const installs = await prisma.appInstall.findMany({
    where: { id: { in: installIds } },
    include: { catalogApp: true },
  });

  let anyFailed = false;

  for (const install of installs) {
    const appKey = install.catalogApp.key;
    const domain = subdomainFor(venture.slug, appKey);
    try {
      await prisma.appInstall.update({
        where: { id: install.id },
        data: { status: "DEPLOYING" },
      });
      await job.log(`[${appKey}] render template + tạo app...`);

      // secrets sinh ngẫu nhiên 32 bytes (Phần 7) — không log
      const view: Record<string, string> = {
        DOMAIN: domain,
        VENTURE_SLUG: venture.slug,
        ORG_ID: venture.orgId,
        APP_SECRET: randomBytes(32).toString("hex"),
        DB_PASSWORD: randomBytes(16).toString("hex"),
        LITELLM_BASE_URL:
          process.env.LITELLM_BASE_URL ?? "https://llm.soloceo.vn",
        LITELLM_VIRTUAL_KEY: "", // gắn ở GĐ4 khi org có virtual key
      };
      const compose = renderTemplate(
        path.basename(install.catalogApp.composeTemplate),
        view,
      );

      const app = await coolify.createComposeApp({
        projectUuid: project.uuid,
        serverUuid,
        name: `${venture.slug}-${appKey}`,
        dockerCompose: compose,
        domain,
        envs: {},
      });
      await coolify.deploy(app.uuid);
      await job.log(`[${appKey}] đang deploy (${app.uuid})...`);
      await waitUntilRunning(coolify, app.uuid);

      await prisma.appInstall.update({
        where: { id: install.id },
        data: {
          status: "RUNNING",
          coolifyAppId: app.uuid,
          url: `https://${domain}`,
        },
      });
      await job.log(`[${appKey}] RUNNING tại https://${domain}`);
    } catch (err) {
      anyFailed = true;
      await prisma.appInstall.update({
        where: { id: install.id },
        data: { status: "FAILED" },
      });
      await job.log(
        `[${appKey}] FAILED: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // 5. Tất cả RUNNING → LIVE; có lỗi → giữ PROVISIONING? Không — đánh dấu theo kết quả
  const remaining = await prisma.appInstall.count({
    where: { ventureId, status: { in: ["QUEUED", "DEPLOYING"] } },
  });
  const failed = await prisma.appInstall.count({
    where: { ventureId, status: "FAILED" },
  });
  if (remaining === 0) {
    await prisma.venture.update({
      where: { id: ventureId },
      data: { status: failed > 0 ? "DRAFT" : "LIVE" },
    });
  }

  if (anyFailed) {
    // đẩy cảnh báo kênh admin (webhook n8n nội bộ — Phần 7); log nếu chưa cấu hình
    const hook = process.env.ADMIN_ALERT_WEBHOOK;
    if (hook) {
      await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Provision FAILED cho venture ${venture.slug} (${ventureId})`,
        }),
      }).catch(() => {});
    }
    throw new Error("Một hoặc nhiều app deploy thất bại");
  }
}

export interface RemoveJobData {
  installId: string;
}

export async function processRemoveJob(job: Job<RemoveJobData>) {
  const coolify = createCoolifyClient();
  const install = await prisma.appInstall.findUniqueOrThrow({
    where: { id: job.data.installId },
  });
  if (install.coolifyAppId) {
    await coolify.delete(install.coolifyAppId);
    await job.log(`Đã xóa resource Coolify ${install.coolifyAppId}`);
  }
  await prisma.appInstall.update({
    where: { id: install.id },
    data: { status: "REMOVED", url: null },
  });
}

export function startWorker() {
  const worker = new Worker<ProvisionJobData | RemoveJobData>(
    "provision",
    async (job) => {
      if (job.name === "remove") {
        return processRemoveJob(job as Job<RemoveJobData>);
      }
      return processProvisionJob(job as Job<ProvisionJobData>);
    },
    {
      connection: {
        url: process.env.REDIS_URL ?? "redis://localhost:6379",
      },
      concurrency: 2,
    },
  );
  worker.on("completed", (job) =>
    console.log(`provision job ${job.id} hoàn tất`),
  );
  worker.on("failed", (job, err) =>
    console.error(`provision job ${job?.id} lỗi:`, err.message),
  );
  console.log("svc-provision: worker lắng nghe queue 'provision'");
  return worker;
}
