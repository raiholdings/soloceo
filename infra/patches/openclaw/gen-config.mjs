// Sinh /home/node/.openclaw/openclaw.json từ env lúc khởi động (SoloCEO per-tenant)
import { mkdirSync, writeFileSync, existsSync } from "node:fs";

const dir = "/home/node/.openclaw";
mkdirSync(dir, { recursive: true });

const origins = (process.env.OPENCLAW_ALLOWED_ORIGINS ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);
const proxies = (process.env.OPENCLAW_TRUSTED_PROXIES ?? "172.16.0.0/12")
  .split(",").map((s) => s.trim()).filter(Boolean);
const llmBaseRaw = process.env.OPENAI_API_BASE ?? "https://llm.soloceo.vn";
const llmBase = llmBaseRaw.replace(/\/$/, "").endsWith("/v1")
  ? llmBaseRaw.replace(/\/$/, "")
  : `${llmBaseRaw.replace(/\/$/, "")}/v1`;
const llmKey = process.env.OPENAI_API_KEY ?? "";
const model = process.env.OPENCLAW_DEFAULT_MODEL ?? "soloceo-smart";

const config = {
  gateway: {
    controlUi: {
      allowedOrigins: origins,
      // Per-tenant gateway: token 32-byte + origin whitelist là lớp auth chính.
      // Device pairing bắt CEO SSH approve từng trình duyệt — tắt cho SaaS.
      dangerouslyDisableDeviceAuth: true,
    },
    trustedProxies: proxies,
  },
  ...(llmKey
    ? {
        models: {
          providers: {
            litellm: {
              baseUrl: llmBase,
              api: "openai-completions",
              auth: "api-key",
              apiKey: llmKey,
              models: [
                { id: "soloceo-smart", name: "SoloCEO Smart (Claude Sonnet)" },
                { id: "soloceo-fast", name: "SoloCEO Fast (Claude Haiku)" },
              ],
            },
          },
        },
        agents: {
          defaults: {
            model: {
              primary: `litellm/${model}`,
              fallbacks: ["litellm/soloceo-fast"],
            },
          },
        },
      }
    : {}),
};

const target = `${dir}/openclaw.json`;
if (!existsSync(target)) {
  writeFileSync(target, JSON.stringify(config, null, 2));
  console.log("[soloceo] đã sinh openclaw.json (origins:", origins.length, ", model:", model, ")");
} else {
  console.log("[soloceo] openclaw.json đã tồn tại — giữ nguyên");
}
