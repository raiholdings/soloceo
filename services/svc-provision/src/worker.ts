/**
 * Worker provisioning (CLAUDE.md Phần 7):
 * job "provision" {ventureId, installIds} → tạo project Coolify (nếu chưa có),
 * deploy từng app từ template, poll trạng thái, cập nhật AppInstall/Venture.
 */
import { Worker, type Job } from "bullmq";
import { prisma } from "@soloceo/db";
import { readFileSync } from "node:fs";
import { randomBytes, createDecipheriv, createCipheriv } from "node:crypto";
import path from "node:path";
import Mustache from "mustache";
import { createCoolifyClient, type ICoolifyClient } from "./coolify-client";

/** Giải mã Secret (AES-256-GCM, MASTER_KEY) — cùng định dạng api-core crypto.util */
function decryptSecret(stored: string): string {
  const key = Buffer.from(process.env.MASTER_KEY ?? "", "hex");
  const buf = Buffer.from(stored, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}

/** Mã hoá Secret (AES-256-GCM, MASTER_KEY) — cùng định dạng api-core crypto.util */
function encryptSecret(plaintext: string): string {
  const key = Buffer.from(process.env.MASTER_KEY ?? "", "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64");
}

/** Lưu token gateway OpenClaw (để OS Shell mở Control UI với #token=) */
async function saveOpenclawToken(
  orgId: string,
  ventureId: string,
  token: string,
): Promise<void> {
  if (!process.env.MASTER_KEY) return;
  const key = `openclaw_token:${ventureId}`;
  await prisma.secret.upsert({
    where: { orgId_key: { orgId, key } },
    create: { orgId, key, valueEnc: encryptSecret(token) },
    update: { valueEnc: encryptSecret(token) },
  });
}

/** LiteLLM virtual key của org (cho OpenClaw dùng model qua gateway) */
async function getOrgLitellmKey(orgId: string): Promise<string> {
  const secret = await prisma.secret.findUnique({
    where: { orgId_key: { orgId, key: "litellm_virtual_key" } },
  });
  if (!secret || !process.env.MASTER_KEY) return "";
  try {
    return decryptSecret(secret.valueEnc);
  } catch {
    return "";
  }
}

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

const REGISTRY = process.env.SOLOCEO_REGISTRY ?? "localhost:5000";

// Cấu hình app dựng-sẵn (ADR-005 approach B): deploy image từ registry + domain,
// không build-from-git (không chạy được). Mỗi app: image, tag, cổng, subdomain, env.
interface AppDeployConfig {
  image: string;
  tag: string;
  port: string;
  subdomain: string; // "" = domain chính (nền desktop)
  buildEnvs: (ctx: {
    secret: string;
    litellmBase: string;
    litellmKey: string;
  }) => Record<string, string>;
}

const APP_CONFIGS: Record<string, AppDeployConfig> = {
  claw3d: {
    image: `${REGISTRY}/soloceo/claw3d`,
    tag: "patched",
    port: "3000",
    subdomain: "",
    buildEnvs: () => ({ HOST: "0.0.0.0", PORT: "3000", NODE_ENV: "production" }),
  },
  openclaw: {
    image: `${REGISTRY}/soloceo/openclaw`,
    // soloceo2 = vá header Control UI (frame-ancestors + bỏ X-Frame-Options) để nhúng iframe
    tag: "soloceo2",
    // OpenClaw gateway + Control UI phục vụ trên 18789 (KHÔNG phải 8080 — đó là lý do trước đây 502)
    port: "18789",
    subdomain: "-ai",
    buildEnvs: ({ secret, litellmBase, litellmKey }) => ({
      OPENCLAW_GATEWAY_TOKEN: secret,
      OPENAI_API_BASE: litellmBase,
      OPENAI_API_KEY: litellmKey,
      OPENCLAW_DEFAULT_MODEL: "soloceo-smart",
      OPENCLAW_MODEL: "soloceo-smart",
    }),
  },
};

function subdomainFor(slug: string, appKey: string): string {
  const cfg = APP_CONFIGS[appKey];
  const suffix = cfg ? cfg.subdomain : `-${appKey.split("-")[0]}`;
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
  // App vừa tạo có status "exited:unhealthy" (chưa deploy) — KHÔNG fail sớm.
  // Chỉ coi là chạy khi "running"; hết giờ thì báo timeout.
  let lastStatus = "";
  while (Date.now() < deadline) {
    const status = await coolify.getAppStatus(appUuid);
    lastStatus = status;
    if (status.includes("running")) return;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Deploy quá 10 phút — trạng thái cuối: ${lastStatus}`);
}

export async function processProvisionJob(job: Job<ProvisionJobData>) {
  const coolify = createCoolifyClient();
  const { ventureId, installIds } = job.data;

  const venture = await prisma.venture.findUniqueOrThrow({
    where: { id: ventureId },
    include: { org: true },
  });

  // 1. Project Coolify per-tenant: "vt-{slug}" — TÁI DÙNG nếu đã có (tránh trùng)
  const serverUuid = await coolify.pickServerUuid();
  const project = await coolify.findOrCreateProject(`vt-${venture.slug}`);
  await job.log(`Project Coolify: ${project.uuid} trên server ${serverUuid}`);

  const installs = await prisma.appInstall.findMany({
    where: { id: { in: installIds } },
    include: { catalogApp: true },
  });

  // LiteLLM virtual key của org (cho OpenClaw)
  const litellmBase = process.env.LITELLM_BASE_URL ?? "https://llm.soloceo.vn";
  const litellmKey = await getOrgLitellmKey(venture.orgId).catch(() => "");

  let anyFailed = false;

  for (const install of installs) {
    const appKey = install.catalogApp.key;
    const domain = subdomainFor(venture.slug, appKey);
    try {
      await prisma.appInstall.update({
        where: { id: install.id },
        data: { status: "DEPLOYING" },
      });

      const cfg = APP_CONFIGS[appKey];
      let app;
      if (cfg) {
        // Deploy từ image dựng sẵn (registry) — cách đáng tin cậy (ADR-005 approach B)
        const secret = randomBytes(32).toString("hex");
        await job.log(`[${appKey}] deploy image ${cfg.image}:${cfg.tag}...`);
        app = await coolify.createDockerImageApp({
          projectUuid: project.uuid,
          serverUuid,
          name: `${venture.slug}-${appKey}`,
          image: cfg.image,
          tag: cfg.tag,
          port: cfg.port,
          domain,
          envs: cfg.buildEnvs({ secret, litellmBase, litellmKey }),
        });
        // OpenClaw: lưu token gateway để OS Shell mở Control UI (#token=)
        if (appKey === "openclaw") {
          await saveOpenclawToken(venture.orgId, ventureId, secret);
        }
      } else {
        // App khác (erpnext...) vẫn dùng compose template
        const view: Record<string, string> = {
          DOMAIN: domain,
          VENTURE_SLUG: venture.slug,
          ORG_ID: venture.orgId,
          APP_SECRET: randomBytes(32).toString("hex"),
          DB_PASSWORD: randomBytes(16).toString("hex"),
          LITELLM_BASE_URL: litellmBase,
          LITELLM_VIRTUAL_KEY: litellmKey,
        };
        const compose = renderTemplate(
          path.basename(install.catalogApp.composeTemplate),
          view,
        );
        app = await coolify.createComposeApp({
          projectUuid: project.uuid,
          serverUuid,
          name: `${venture.slug}-${appKey}`,
          dockerCompose: compose,
          domain,
          envs: {},
        });
      }
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
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[provision][${venture.slug}][${appKey}] FAILED: ${msg}`);
      await job.log(`[${appKey}] FAILED: ${msg}`);
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
