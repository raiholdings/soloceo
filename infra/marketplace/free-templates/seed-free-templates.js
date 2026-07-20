// Seed 100 mẫu MIỄN PHÍ từ awesome-llm-apps (Apache-2.0) vào ProjectTemplate.
// Chạy TRONG container api-core: node /tmp/seed-free.js
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const prisma = new PrismaClient();
const KEY = process.env.LITELLM_MASTER_KEY;
const BASE = process.env.LITELLM_BASE_URL || "https://llm.soloceo.vn";
const apps = JSON.parse(fs.readFileSync("/tmp/apps100.json", "utf8"));

const slugify = (s) =>
  "free-" + s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 54);

async function genBatch(batch) {
  const list = batch.map((a, i) =>
    `${i + 1}. slug_goc="${a.path.split("/").pop()}" | nhom=${a.cat} | ten_goc="${a.name_en}"`
  ).join("\n");
  const prompt = `Bạn là biên tập viên SoloCEO. Dưới đây là ${batch.length} ứng dụng AI mã nguồn mở (bộ awesome-llm-apps) — mỗi cái là 1 mẫu code chạy được. Với MỖI app, viết một MẪU DỰ ÁN tiếng Việt cho marketplace SoloCEO (dành cho doanh nghiệp một người).
Trả về DUY NHẤT một JSON mảng ${batch.length} phần tử, ĐÚNG THỨ TỰ trên, mỗi phần tử:
{"name":"tên tiếng Việt ngắn, hấp dẫn (<=60 ký tự)","summary":"1-2 câu: app này giúp Solo CEO làm gì, giá trị thực tế","industry":"cong-nghe|ban-le|dich-vu|tai-chinh|giao-duc|bat-dong-san|du-lich|khac","valueProps":["2-3 lợi ích ngắn gọn"],"buildSteps":["Clone mã nguồn từ GitHub","Cấu hình khoá mô hình AI qua cổng LiteLLM của SoloCEO","Chạy & tuỳ biến theo nghiệp vụ"],"tags":["3-5 tag công nghệ ngắn: framework/model, vd Streamlit, LangGraph, CrewAI, RAG..."]}
Chỉ JSON, không giải thích.
${list}`;
  const r = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "soloceo-claude-fast", max_tokens: 6000, temperature: 0.5,
      messages: [{ role: "user", content: prompt }] }),
  });
  if (!r.ok) throw new Error("LLM " + r.status);
  const d = await r.json();
  let raw = d.choices[0].message.content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  raw = raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1);
  return JSON.parse(raw);
}

(async () => {
  let ok = 0, fail = 0;
  const B = 10;
  for (let i = 0; i < apps.length; i += B) {
    const batch = apps.slice(i, i + B);
    let metas;
    try { metas = await genBatch(batch); }
    catch (e) { console.log(`  batch@${i} GEN FAIL: ${e.message}`); fail += batch.length; continue; }
    for (let j = 0; j < batch.length; j++) {
      const a = batch[j], m = metas[j] || {};
      if (!m || !m.name) { fail++; continue; }
      const slug = slugify(a.path.split("/").pop());
      const tags = Array.isArray(m.tags) ? m.tags.slice(0, 6) : [];
      try {
        await prisma.projectTemplate.upsert({
          where: { slug },
          update: {
            name: m.name, summary: m.summary || "", industry: m.industry || "cong-nghe",
            components: { containers: tags, agents: [], dataLayer: [], communityPlatforms: [],
              integrations: ["Nguồn mở: Shubhamsaboo/awesome-llm-apps (Apache-2.0)"] },
            valueProps: m.valueProps || [], buildSteps: m.buildSteps || [],
            priceVnd: 0, monthlyFeeVnd: 0, demoUrl: a.url, status: "PUBLISHED",
          },
          create: {
            name: m.name, slug, idea: a.name_en, industry: m.industry || "cong-nghe",
            summary: m.summary || "",
            components: { containers: tags, agents: [], dataLayer: [], communityPlatforms: [],
              integrations: ["Nguồn mở: Shubhamsaboo/awesome-llm-apps (Apache-2.0)"] },
            valueProps: m.valueProps || [], buildSteps: m.buildSteps || [],
            priceVnd: 0, monthlyFeeVnd: 0, demoUrl: a.url,
            status: "PUBLISHED", publishedAt: new Date(),
          },
        });
        ok++;
      } catch (e) { console.log(`  insert FAIL ${slug}: ${e.message}`); fail++; }
    }
    console.log(`progress ${Math.min(i + B, apps.length)}/${apps.length}  ok=${ok} fail=${fail}`);
  }
  console.log(`DONE ok=${ok} fail=${fail}`);
  await prisma.$disconnect();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
