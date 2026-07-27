/**
 * sandbox.soloceo.vn — Xưởng kiểm chứng ý tưởng
 *
 * Vì sao có dịch vụ này: marketplace trước đây bán 100 "dự án mẫu" vốn chỉ là mô tả ý niệm —
 * cùng một khối thành phần dán cho cả 100 mục, không có gì chạy được đằng sau. Từ nay một
 * ý tưởng phải đi qua đây và **thực sự chạy** thì mới được lên sàn.
 *
 *   bigdata (đúc ý tưởng) → sandbox (kiểm chứng → subagent dựng MVP → nghiệm thu) → marketplace
 *
 * Cổng chất lượng: `demo_url` phải trả 200 và qua kiểm thử khói. Không đạt thì không xuất bản.
 */
const express = require("express");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const DB_PATH = process.env.DB_PATH || "/data/sandbox.db";
const BIGDATA = process.env.BIGDATA_URL || "https://bigdata.soloceo.vn";
const API_CORE = process.env.API_CORE_URL || "https://api.soloceo.vn";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const TOKEN = process.env.SANDBOX_TOKEN || "";
const LLM_BASE = process.env.LLM_BASE_URL || "https://llm.soloceo.vn/v1";
const LLM_KEY = process.env.LLM_API_KEY || "";
const LLM_MODEL = process.env.LLM_MODEL_NAME || "soloceo-smart";

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 30000");

db.exec(`
CREATE TABLE IF NOT EXISTS du_an (
  id INTEGER PRIMARY KEY,
  y_tuong_id INTEGER,              -- id ý tưởng bên bigdata
  ten TEXT NOT NULL,
  slug TEXT UNIQUE,
  nganh TEXT,
  tom_tat TEXT,
  bmc TEXT,                        -- JSON 9 khối lấy từ ý tưởng gốc
  trang_thai TEXT DEFAULT 'moi',   -- moi|dang-kiem-chung|dat|truot|dang-xay|nghiem-thu|xuat-ban|hong
  diem_kha_thi INTEGER DEFAULT 0,  -- 0..100
  ly_do TEXT,                      -- vì sao trượt / ghi chú
  repo TEXT,                       -- nơi chứa mã MVP
  demo_url TEXT,
  nghiem_thu_luc TEXT,
  nghiem_thu_ma INTEGER,           -- mã HTTP lần kiểm cuối
  xuat_ban_luc TEXT,
  tao_luc TEXT,
  cap_nhat TEXT
);
CREATE INDEX IF NOT EXISTS idx_da_tt ON du_an(trang_thai);
CREATE INDEX IF NOT EXISTS idx_da_yt ON du_an(y_tuong_id);

CREATE TABLE IF NOT EXISTS kiem_chung (
  id INTEGER PRIMARY KEY,
  du_an_id INTEGER NOT NULL,
  tieu_chi TEXT NOT NULL,
  diem INTEGER,                    -- 0..100
  nhan_xet TEXT,
  can_cu TEXT,                     -- id/nguồn dữ liệu thật làm căn cứ
  luc TEXT,
  UNIQUE(du_an_id, tieu_chi)
);

CREATE TABLE IF NOT EXISTS nhat_ky (
  id INTEGER PRIMARY KEY,
  du_an_id INTEGER NOT NULL,
  buoc TEXT, trang_thai TEXT, chi_tiet TEXT, luc TEXT
);
CREATE INDEX IF NOT EXISTS idx_nk_da ON nhat_ky(du_an_id);
`);

const now = () => new Date().toISOString();
const ghi = (du_an_id, buoc, trang_thai, chi_tiet) =>
  db.prepare("INSERT INTO nhat_ky(du_an_id,buoc,trang_thai,chi_tiet,luc) VALUES(?,?,?,?,?)")
    .run(du_an_id, buoc, trang_thai, String(chi_tiet || "").slice(0, 2000), now());

function slugHoa(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

async function layJson(url, opt = {}) {
  const r = await fetch(url, { signal: AbortSignal.timeout(opt.timeout || 30000), ...opt });
  if (!r.ok) throw new Error(`${url.slice(0, 60)} → ${r.status}`);
  return r.json();
}

async function llm(prompt, maxTokens = 1500) {
  const r = await fetch(`${LLM_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_KEY}` },
    body: JSON.stringify({
      model: LLM_MODEL, max_tokens: maxTokens, temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(180000),
  });
  if (!r.ok) throw new Error(`LLM ${r.status}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}

// ═══════════════ 1. HÚT Ý TƯỞNG TỪ BIGDATA ═══════════════
async function hutYTuong(gioi_han = 10) {
  const d = await layJson(`${BIGDATA}/api/ideas?sort=top&limit=${gioi_han}`);
  const ds = d.ideas || d.results || (Array.isArray(d) ? d : []);
  let them = 0;
  for (const y of ds) {
    const yid = y.id;
    if (!yid) continue;
    if (db.prepare("SELECT 1 FROM du_an WHERE y_tuong_id=?").get(yid)) continue;
    const ten = y.ten || y.name || `Ý tưởng #${yid}`;
    let slug = slugHoa(ten) || `y-tuong-${yid}`;
    if (db.prepare("SELECT 1 FROM du_an WHERE slug=?").get(slug)) slug += "-" + yid;
    db.prepare(`INSERT INTO du_an(y_tuong_id,ten,slug,nganh,tom_tat,bmc,trang_thai,tao_luc,cap_nhat)
                VALUES(?,?,?,?,?,?,'moi',?,?)`)
      .run(yid, ten, slug, y.nganh || y.industry || "", y.tom_tat || y.summary || "",
           JSON.stringify(y.bmc || y.BMC || null), now(), now());
    them++;
  }
  return { them, tong: db.prepare("SELECT count(*) n FROM du_an").get().n };
}

// ═══════════════ 2. KIỂM CHỨNG — 6 TIÊU CHÍ DỰA TRÊN DỮ LIỆU THẬT ═══════════════
// Không chấm bằng cảm tính: mỗi tiêu chí phải đối chiếu được với kho dữ liệu của bigdata
// và ghi lại căn cứ. Ý tưởng không có căn cứ thì điểm thấp, không phải "chưa rõ".
const TIEU_CHI = [
  { ma: "van-de-co-that", ten: "Vấn đề có thật", trong_so: 25,
    mo_ta: "Khớp được với vấn đề đã ghi nhận trong kho (có nguồn), không phải vấn đề tự nghĩ ra" },
  { ma: "giai-phap-san-co", ten: "Công nghệ đã sẵn sàng", trong_so: 20,
    mo_ta: "Có giải pháp/công nghệ thật đã tồn tại để dựng, không phải chờ đột phá" },
  { ma: "mo-hinh-doanh-thu", ten: "Đường tiền rõ ràng", trong_so: 20,
    mo_ta: "Khớp mô hình kinh doanh đã có startup chạy thành công" },
  { ma: "mot-nguoi-lam-duoc", ten: "Một người + AI dựng nổi", trong_so: 15,
    mo_ta: "Phạm vi MVP đủ nhỏ để một Solo CEO với subagent dựng trong vài ngày" },
  { ma: "thi-truong-vn", ten: "Có chỗ đứng ở Việt Nam", trong_so: 10,
    mo_ta: "Có số liệu thị trường hoặc doanh nghiệp Việt Nam liên quan trong kho" },
  { ma: "canh-tranh", ten: "Cạnh tranh chấp nhận được", trong_so: 10,
    mo_ta: "Chưa bị ông lớn chiếm trọn; có khe cho người mới" },
];
const NGUONG_DAT = 65; // dưới ngưỡng này thì không dựng MVP

async function doiChieuKho(tu_khoa) {
  // Hỏi thẳng bigdata xem có gì liên quan — đây là "căn cứ" của điểm số.
  // BẮT BUỘC kèm ?q=: gọi trần chỉ trả 40 mục mới nhất của kho, hoàn toàn ngẫu nhiên so với
  // ý tưởng đang chấm, và mô hình sẽ cho 0 điểm vì "không có căn cứ" — đúng theo dữ liệu
  // nó nhận, nhưng sai về bản chất. Đã mất một vòng chẩn đoán nhầm vì chỗ này.
  const q = encodeURIComponent(String(tu_khoa).slice(0, 120));
  const ra = {};
  // Lấy TOÀN BỘ kho đúc, không lọc từ khoá. Lý do: bộ lọc LIKE của bigdata tách tiếng Việt
  // theo âm tiết nên "bất ĐỘNG sản" khớp trúng "hoạt ĐỘNG", "lao ĐỘNG" — lọc xong còn nhiễu
  // hơn không lọc. Kho đúc hiện chỉ vài chục mục nên đưa hết bản rút gọn vào ngữ cảnh rẻ hơn
  // và chính xác hơn nhiều. Khi kho vượt ~300 mục thì mới cần quay lại lọc (bằng FTS, không
  // phải LIKE) — endpoint ?q= đã sẵn sàng cho lúc đó.
  for (const [ten, url, gon] of [
    ["van_de", `${BIGDATA}/api/van-de?limit=200`,
      (r) => ({ id: r.id, van_de: r.tieu_de, ai_dau: r.khach_hang, nganh: r.nganh, dau: r.do_dau })],
    ["giai_phap", `${BIGDATA}/api/giai-phap?limit=200`,
      (r) => ({ id: r.id, giai_phap: r.ten, nguyen_ly: (r.nguyen_ly || "").slice(0, 130), nganh: r.nganh })],
    ["mo_hinh", `${BIGDATA}/api/mo-hinh-kd?limit=200`,
      (r) => ({ id: r.id, mo_hinh: r.ten, kiem_tien: (r.cach_kiem_tien || "").slice(0, 130), nganh: r.nganh })],
    ["san_pham", `${BIGDATA}/api/san-pham?limit=60`,
      (r) => ({ id: r.id, san_pham: r.ten, mo_ta: (r.mo_ta || "").slice(0, 90) })],
  ]) {
    try {
      const d = await layJson(url, { timeout: 25000 });
      ra[ten] = (d.results || d.items || d[ten] || []).map(gon);
    } catch { ra[ten] = []; }
  }
  try {
    const d = await layJson(`${BIGDATA}/api/search?q=${q}&limit=12`, { timeout: 25000 });
    ra.lien_quan = (d.results || []).map((x) => ({ id: x.id, ten: x.name, loai: x.type, vung: x.region }));
  } catch { ra.lien_quan = []; }
  // Quy mô thị trường VN đếm được. Thiếu cái này, cổng cho 0 điểm tiêu chí "có chỗ đứng ở
  // Việt Nam" với lý do "không có số liệu" — trong khi kho có 44.728 cơ sở kinh doanh thật.
  try {
    const d = await layJson(`${BIGDATA}/api/thi-truong-vn?q=${q}`, { timeout: 20000 });
    ra.thi_truong_vn = d.cum || [];
    ra.tong_co_so = d.tong || 0;
  } catch { ra.thi_truong_vn = []; ra.tong_co_so = 0; }
  return ra;
}

async function kiemChung(id) {
  const da = db.prepare("SELECT * FROM du_an WHERE id=?").get(id);
  if (!da) throw new Error("không có dự án");
  db.prepare("UPDATE du_an SET trang_thai='dang-kiem-chung', cap_nhat=? WHERE id=?").run(now(), id);
  ghi(id, "kiem-chung", "bat-dau", "");

  const kho = await doiChieuKho(`${da.ten} ${da.tom_tat}`);
  const prompt = `Bạn chấm điểm khả thi cho một ý tưởng khởi nghiệp của Solo CEO Việt Nam.

Ý TƯỞNG: ${da.ten}
MÔ TẢ: ${da.tom_tat}
NGÀNH: ${da.nganh || "chưa rõ"}

DỮ LIỆU THẬT ĐỂ ĐỐI CHIẾU — đây là TOÀN BỘ kho đúc, không phải trích chọn, nên nếu không
tìm thấy gì liên quan ở đây thì đúng là kho chưa có (chỉ được dùng những gì có ở đây làm căn cứ):
- Nốt tìm được theo từ khoá: ${JSON.stringify(kho.lien_quan).slice(0, 1800)}
- Toàn bộ ${(kho.van_de || []).length} vấn đề đã ghi nhận: ${JSON.stringify(kho.van_de || []).slice(0, 5000)}
- Toàn bộ ${(kho.giai_phap || []).length} giải pháp đã có: ${JSON.stringify(kho.giai_phap || []).slice(0, 5000)}
- Toàn bộ ${(kho.mo_hinh || []).length} mô hình KD đã có: ${JSON.stringify(kho.mo_hinh || []).slice(0, 5000)}
- Cơ sở kinh doanh Việt Nam ĐẾM ĐƯỢC khớp ngành này (tổng ${kho.tong_co_so || 0} cơ sở thật, nguồn OSM/Trang Vàng):
  ${JSON.stringify(kho.thi_truong_vn || []).slice(0, 1200)}
  → Đây là bằng chứng thị trường Việt Nam mạnh nhất trong kho. Nếu con số này lớn hơn 0 và
    đúng ngành thì tiêu chí "có chỗ đứng ở Việt Nam" PHẢI được chấm theo nó, không được ghi
    "chưa có căn cứ". Nếu bằng 0 hoặc lệch ngành thì mới cho điểm thấp.

Chấm 6 tiêu chí, mỗi tiêu chí 0-100:
${TIEU_CHI.map((t) => `- ${t.ma} (${t.ten}, trọng số ${t.trong_so}%): ${t.mo_ta}`).join("\n")}

QUY TẮC BẮT BUỘC:
- Nếu KHÔNG tìm được căn cứ trong dữ liệu trên cho một tiêu chí, cho điểm THẤP và ghi rõ "chưa có căn cứ trong kho". Không được suy đoán rồi cho điểm cao.
- Trường "can_cu" CHỈ điền khi mục đó thật sự LIÊN QUAN tới ý tưởng. Nếu chỉ gần gần
  hoặc không liên quan thì để trống — trích một id không liên quan rồi cho 0 điểm là
  gây hiểu nhầm cho người đọc.
- "nhan_xet" phải nói rõ THIẾU GÌ để đạt điểm cao hơn, vì đây là chỉ dẫn để bổ sung kho.

Trả về DUY NHẤT JSON:
{"diem":[{"ma":"...","diem":0,"nhan_xet":"...","can_cu":"..."}],"ket_luan":"..."}`;

  let kq;
  try {
    const t = await llm(prompt, 2000);
    kq = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
  } catch (e) {
    ghi(id, "kiem-chung", "loi", e.message);
    db.prepare("UPDATE du_an SET trang_thai='moi', ly_do=?, cap_nhat=? WHERE id=?")
      .run("chấm điểm lỗi: " + e.message, now(), id);
    throw e;
  }

  let tong = 0;
  for (const t of TIEU_CHI) {
    const d = (kq.diem || []).find((x) => x.ma === t.ma) || { diem: 0, nhan_xet: "không chấm được", can_cu: "" };
    db.prepare(`INSERT INTO kiem_chung(du_an_id,tieu_chi,diem,nhan_xet,can_cu,luc) VALUES(?,?,?,?,?,?)
                ON CONFLICT(du_an_id,tieu_chi) DO UPDATE SET diem=excluded.diem,nhan_xet=excluded.nhan_xet,can_cu=excluded.can_cu,luc=excluded.luc`)
      .run(id, t.ma, d.diem | 0, d.nhan_xet || "", d.can_cu || "", now());
    tong += (d.diem | 0) * t.trong_so / 100;
  }
  const diem = Math.round(tong);
  const dat = diem >= NGUONG_DAT;
  db.prepare("UPDATE du_an SET diem_kha_thi=?, trang_thai=?, ly_do=?, cap_nhat=? WHERE id=?")
    .run(diem, dat ? "dat" : "truot", kq.ket_luan || "", now(), id);
  ghi(id, "kiem-chung", dat ? "dat" : "truot", `điểm ${diem}/100 — ${kq.ket_luan || ""}`);
  return { id, diem, trang_thai: dat ? "dat" : "truot", nguong: NGUONG_DAT };
}

// ═══════════════ 3. NGHIỆM THU — MVP CÓ CHẠY THẬT KHÔNG ═══════════════
// Đây là cổng chất lượng. Không có bước này thì marketplace lại đầy thứ không chạy.
async function nghiemThu(id) {
  const da = db.prepare("SELECT * FROM du_an WHERE id=?").get(id);
  if (!da) throw new Error("không có dự án");
  if (!da.demo_url) {
    ghi(id, "nghiem-thu", "truot", "chưa có demo_url");
    return { dat: false, ly_do: "chưa có địa chỉ demo" };
  }
  let ma = 0, loi = "", noi_dung = "";
  const t0 = Date.now();
  try {
    const r = await fetch(da.demo_url, { signal: AbortSignal.timeout(25000), redirect: "follow" });
    ma = r.status;
    noi_dung = (await r.text()).slice(0, 4000);
  } catch (e) { loi = e.message; }
  const ms = Date.now() - t0;

  // Kiểm thử khói: phải trả 2xx, có nội dung thật, không phải trang lỗi mặc định
  const kiem = [
    { ten: "trả về 2xx", dat: ma >= 200 && ma < 300 },
    { ten: "có nội dung (>500 ký tự)", dat: noi_dung.length > 500 },
    { ten: "không phải trang lỗi mặc định", dat: !/nginx error|502 Bad Gateway|no available server|Application error|Cannot GET \//i.test(noi_dung) },
    { ten: "phản hồi dưới 15 giây", dat: ms < 15000 && ma > 0 },
  ];
  const dat = kiem.every((k) => k.dat);
  db.prepare("UPDATE du_an SET nghiem_thu_luc=?, nghiem_thu_ma=?, trang_thai=?, cap_nhat=? WHERE id=?")
    .run(now(), ma, dat ? "nghiem-thu" : "hong", dat ? da.trang_thai === "xuat-ban" ? "xuat-ban" : "nghiem-thu" : "hong", id);
  ghi(id, "nghiem-thu", dat ? "dat" : "truot",
    kiem.map((k) => `${k.dat ? "✓" : "✗"} ${k.ten}`).join(" · ") + (loi ? ` | lỗi: ${loi}` : ` | ${ma} trong ${ms}ms`));
  return { dat, ma, ms, kiem, loi };
}

// ═══════════════ 4. XUẤT BẢN LÊN MARKETPLACE ═══════════════
// Chỉ chạy được khi đã nghiệm thu đạt. Đây là điều kiện không thể bỏ qua.
async function xuatBan(id) {
  const da = db.prepare("SELECT * FROM du_an WHERE id=?").get(id);
  if (!da) throw new Error("không có dự án");
  if (da.trang_thai !== "nghiem-thu")
    return { ok: false, ly_do: `chưa nghiệm thu đạt (đang ở '${da.trang_thai}')` };

  const nt = await nghiemThu(id); // kiểm lại ngay trước khi lên sàn
  if (!nt.dat) return { ok: false, ly_do: "nghiệm thu lại không đạt", chi_tiet: nt };

  if (!ADMIN_TOKEN) return { ok: false, ly_do: "thiếu ADMIN_TOKEN để gọi api-core" };
  const bmc = (() => { try { return JSON.parse(da.bmc); } catch { return null; } })();
  const cc = db.prepare("SELECT tieu_chi,diem,nhan_xet FROM kiem_chung WHERE du_an_id=?").all(id);
  const body = {
    name: da.ten, slug: da.slug, idea: da.tom_tat, industry: da.nganh || "khac",
    summary: da.tom_tat,
    components: {
      nguon: "sandbox.soloceo.vn",
      y_tuong_id: da.y_tuong_id,           // truy ngược về ý tưởng gốc trong bigdata
      diem_kha_thi: da.diem_kha_thi,
      kiem_chung: cc,                      // để người mua tự đọc căn cứ, không phải tin lời
      bmc: bmc || undefined,
    },
    valueProps: cc.filter((x) => x.diem >= 70).map((x) => x.nhan_xet).slice(0, 5),
    demoUrl: da.demo_url, publish: true,
  };
  const r = await fetch(`${API_CORE}/v1/admin/eco/projects/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Token": ADMIN_TOKEN },
    body: JSON.stringify(body), signal: AbortSignal.timeout(30000),
  });
  const t = await r.text();
  if (!r.ok) { ghi(id, "xuat-ban", "loi", `${r.status} ${t.slice(0, 200)}`); return { ok: false, ly_do: `api-core ${r.status}`, chi_tiet: t.slice(0, 300) }; }
  db.prepare("UPDATE du_an SET trang_thai='xuat-ban', xuat_ban_luc=?, cap_nhat=? WHERE id=?").run(now(), now(), id);
  ghi(id, "xuat-ban", "dat", da.demo_url);
  return { ok: true, demo_url: da.demo_url };
}

// ═══════════════ API ═══════════════
// ═══════════ CỬA NGÕ TỚI MVP ═══════════
// MVP chạy trong container trên mạng nội bộ KHÔNG ra được Internet. Xưởng đứng ra
// chuyển tiếp theo đường dẫn /mvp/<slug>/… nên không cần DNS ký tự đại diện, và cũng
// không phải mở thêm cổng nào ra ngoài cho mã do AI sinh.
const http = require("http");

function chuyenTiep(req, res, slug, duong) {
  const rq = http.request(
    { host: "mvp-" + slug, port: 8080, path: duong || "/", method: req.method,
      headers: { ...req.headers, host: "mvp-" + slug + ":8080" }, timeout: 20000 },
    (r) => { res.writeHead(r.statusCode || 502, r.headers); r.pipe(res); },
  );
  rq.on("timeout", () => { rq.destroy(); if (!res.headersSent) res.status(504).send("MVP không phản hồi kịp"); });
  rq.on("error", (e) => {
    if (!res.headersSent)
      res.status(502).type("html").send(
        `<div style="font:14px ui-monospace;background:#0b0b0c;color:#e6e6e6;padding:40px">
         <b style="color:#f85149">MVP chưa chạy</b><p>Bản dựng <code>${slug}</code> không phản hồi (${e.code || e.message}).</p>
         <p><a style="color:#3fb950" href="/">← Về xưởng kiểm chứng</a></p></div>`);
  });
  req.pipe(rq);
}

const app = express();

// /mvp/<slug>/... → container mvp-<slug>.
// PHẢI đứng trước express.json(): nếu không, thân yêu cầu POST bị đọc mất và
// proxy sẽ treo vì không còn gì để chuyển tiếp.
app.use("/mvp/:slug", (req, res) => {
  const slug = String(req.params.slug || "");
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return res.status(400).send("slug không hợp lệ");
  chuyenTiep(req, res, slug, req.url === "/" ? "/" : req.url);
});
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));
const canToken = (req, res) => {
  if (!TOKEN || (req.query.token || req.get("X-Sandbox-Token")) === TOKEN) return true;
  res.status(403).json({ error: "token sai" }); return false;
};

app.get("/health", (_q, s) => s.json({ ok: true, dich_vu: "sandbox", luc: now() }));


app.get("/api/tong-quan", (_q, s) => {
  const theo = db.prepare("SELECT trang_thai, count(*) n FROM du_an GROUP BY trang_thai").all();
  s.json({
    tong: db.prepare("SELECT count(*) n FROM du_an").get().n,
    theo_trang_thai: Object.fromEntries(theo.map((r) => [r.trang_thai, r.n])),
    nguong_dat: NGUONG_DAT,
    tieu_chi: TIEU_CHI,
    quy_trinh: ["1. Hút ý tưởng từ bigdata", "2. Kiểm chứng 6 tiêu chí trên dữ liệu thật",
      "3. Subagent dựng MVP", "4. Nghiệm thu — gọi thử, phải chạy được", "5. Xuất bản lên marketplace"],
  });
});

app.get("/api/du-an", (req, s) => {
  const { trang_thai = "", limit = 50 } = req.query;
  const rows = trang_thai
    ? db.prepare("SELECT * FROM du_an WHERE trang_thai=? ORDER BY diem_kha_thi DESC, id DESC LIMIT ?").all(trang_thai, +limit)
    : db.prepare("SELECT * FROM du_an ORDER BY id DESC LIMIT ?").all(+limit);
  s.json({ count: rows.length, results: rows });
});

app.get("/api/du-an/:id", (req, s) => {
  const da = db.prepare("SELECT * FROM du_an WHERE id=?").get(req.params.id);
  if (!da) return s.status(404).json({ error: "không có" });
  da.kiem_chung = db.prepare("SELECT * FROM kiem_chung WHERE du_an_id=?").all(da.id);
  da.nhat_ky = db.prepare("SELECT * FROM nhat_ky WHERE du_an_id=? ORDER BY id DESC LIMIT 40").all(da.id);
  s.json(da);
});

app.get("/api/admin/hut", async (req, s) => {
  if (!canToken(req, s)) return;
  try { s.json(await hutYTuong(+(req.query.n || 10))); } catch (e) { s.status(500).json({ error: e.message }); }
});
app.get("/api/admin/kiem-chung/:id", async (req, s) => {
  if (!canToken(req, s)) return;
  try { s.json(await kiemChung(+req.params.id)); } catch (e) { s.status(500).json({ error: e.message }); }
});
app.get("/api/admin/nghiem-thu/:id", async (req, s) => {
  if (!canToken(req, s)) return;
  try { s.json(await nghiemThu(+req.params.id)); } catch (e) { s.status(500).json({ error: e.message }); }
});
app.post("/api/admin/demo/:id", (req, s) => {
  if (!canToken(req, s)) return;
  const { demo_url, repo, trang_thai } = req.body || {};
  db.prepare("UPDATE du_an SET demo_url=COALESCE(?,demo_url), repo=COALESCE(?,repo), trang_thai=COALESCE(?,trang_thai), cap_nhat=? WHERE id=?")
    .run(demo_url || null, repo || null, trang_thai || null, now(), +req.params.id);
  ghi(+req.params.id, "cap-nhat", "ok", `demo=${demo_url || "-"} repo=${repo || "-"}`);
  s.json({ ok: true });
});
app.get("/api/admin/xuat-ban/:id", async (req, s) => {
  if (!canToken(req, s)) return;
  try { s.json(await xuatBan(+req.params.id)); } catch (e) { s.status(500).json({ error: e.message }); }
});

// Một vòng tự động: hút → kiểm chứng những cái mới → nghiệm thu lại những cái đã có demo
app.get("/api/admin/vong", async (req, s) => {
  if (!canToken(req, s)) return;
  const ra = { hut: null, kiem_chung: [], nghiem_thu: [] };
  try { ra.hut = await hutYTuong(10); } catch (e) { ra.hut = { loi: e.message }; }
  for (const r of db.prepare("SELECT id FROM du_an WHERE trang_thai='moi' LIMIT 3").all()) {
    try { ra.kiem_chung.push(await kiemChung(r.id)); } catch (e) { ra.kiem_chung.push({ id: r.id, loi: e.message }); }
  }
  for (const r of db.prepare("SELECT id FROM du_an WHERE demo_url IS NOT NULL AND demo_url<>'' AND trang_thai IN ('nghiem-thu','hong','xuat-ban') LIMIT 10").all()) {
    try { ra.nghiem_thu.push({ id: r.id, ...(await nghiemThu(r.id)) }); } catch (e) { ra.nghiem_thu.push({ id: r.id, loi: e.message }); }
  }
  s.json(ra);
});

app.listen(PORT, () => console.log(`sandbox nghe cổng ${PORT}`));
