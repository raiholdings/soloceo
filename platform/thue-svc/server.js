// SoloCEO — Hoá đơn & Thuế (Phần B + C): trợ lý AI hỗ trợ TOÀN DIỆN cho CEO.
// HỢP PHÁP: SoloCEO chỉ SOẠN THẢO / TÍNH TOÁN / KIỂM TRA / HƯỚNG DẪN.
//  - Hoá đơn điện tử (NĐ 123/2020 + TT 78/2021): phát hành QUA nhà cung cấp
//    được Tổng cục Thuế công nhận (MISA/Viettel/VNPT...) bằng TÀI KHOẢN CỦA CEO.
//    SoloCEO KHÔNG tự kết nối trực tiếp GDT, KHÔNG tự phát hành thay.
//  - Kê khai thuế: soạn bản thảo tờ khai + hướng dẫn CEO tự nộp trên
//    thuedientu.gdt.gov.vn bằng CHỮ KÝ SỐ của CEO. KHÔNG nộp thay (cần giấy phép T-VAN).
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
let mysql = null; try { mysql = require("mysql2/promise"); } catch (_) { /* CRM tắt nếu thiếu driver */ }

const LLM_BASE = (process.env.LLM_BASE_URL || "https://llm.soloceo.vn/v1").replace(/\/$/, "");
const LLM_KEY = process.env.LLM_API_KEY || "";
const LLM_MODEL = process.env.LLM_MODEL_NAME || "soloceo-smart";

// ── Két mã hoá AES-256-GCM cho khoá API HĐĐT của CEO (bền vững qua restart) ──
const DATA_DIR = process.env.DATA_DIR || "/app/data";
const VAULT_FILE = path.join(DATA_DIR, "conn.json");
const MKEY = crypto.createHash("sha256").update(process.env.MASTER_KEY || "dev-insecure-key").digest();
function encJson(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", MKEY, iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
}
function decJson(b64) {
  const raw = Buffer.from(b64, "base64");
  const d = crypto.createDecipheriv("aes-256-gcm", MKEY, raw.slice(0, 12));
  d.setAuthTag(raw.slice(12, 28));
  return JSON.parse(Buffer.concat([d.update(raw.slice(28)), d.final()]).toString("utf8"));
}
// vault: { [mst]: { provider, enc } }  — enc = ciphertext của cfg (khoá của CEO)
function vaultLoad() { try { return JSON.parse(fs.readFileSync(VAULT_FILE, "utf8")); } catch (_) { return {}; } }
function vaultSave(v) { try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(VAULT_FILE, JSON.stringify(v)); } catch (e) { console.error("vault save:", e.message); } }
function connSet(mst, provider, cfg) { const v = vaultLoad(); v[mst] = { provider, enc: encJson(cfg || {}) }; vaultSave(v); }
function connGet(mst) { const v = vaultLoad(); const e = v[mst]; if (!e) return null; let cfg = {}; try { cfg = decJson(e.enc); } catch (_) {} return { provider: e.provider, cfg }; }

// ── Xác thực X-Ceo-Token (đồng dạng crm-mcp) → user_id → tenant DB Perfex ──
const MCP_SECRET = Buffer.from(process.env.CRM_MCP_SECRET || "", "utf8");
function verifyCeoToken(tok) {
  if (!tok || !MCP_SECRET.length) return null;
  let raw; try { raw = Buffer.from(tok.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"); } catch (_) { return null; }
  const i2 = raw.lastIndexOf("|"), i1 = raw.lastIndexOf("|", i2 - 1);
  if (i1 < 0) return null;
  const userId = raw.slice(0, i1), exp = raw.slice(i1 + 1, i2), sig = raw.slice(i2 + 1);
  const expect = crypto.createHmac("sha256", MCP_SECRET).update(`${userId}|${exp}`).digest("hex");
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  if (parseInt(exp, 10) < Math.floor(Date.now() / 1000)) return null;
  return userId;
}
function tenantName(userId) { return "c" + crypto.createHash("sha256").update(userId).digest("hex").slice(0, 15); }

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

async function llm(prompt, maxTokens = 2600) {
  if (!LLM_KEY) return "(Chưa cấu hình LLM_API_KEY trên server)";
  const r = await fetch(`${LLM_BASE}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${LLM_KEY}` },
    body: JSON.stringify({ model: LLM_MODEL, temperature: 0.2, max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }] }),
  });
  const j = await r.json();
  return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) ||
    "(Lỗi sinh nội dung: " + JSON.stringify(j).slice(0, 200) + ")";
}

const DISCLAIMER = "\n\n---\n*BẢN THẢO do AI SoloCEO lập để tham khảo. CEO/kế toán phải RÀ SOÁT, đối chiếu số liệu sổ sách và quy định hiện hành trước khi phát hành/nộp. SoloCEO không phát hành hoá đơn thay và không nộp tờ khai thay; mọi thao tác chính thức do CEO thực hiện bằng tài khoản & chữ ký số của mình.*";

// ─────────────────────────────────────────────────────────────
// PHẦN B — HOÁ ĐƠN ĐIỆN TỬ
// ─────────────────────────────────────────────────────────────

// Nhà cung cấp giải pháp HĐĐT được Tổng cục Thuế công nhận (danh sách tham khảo)
const PROVIDERS = [
  { key: "misa", ten: "MISA meInvoice", web: "https://www.meinvoice.vn", ghi_chu: "Phổ biến nhất cho DN nhỏ; tích hợp kế toán MISA." },
  { key: "viettel", ten: "Viettel S-Invoice", web: "https://sinvoice.viettel.vn", ghi_chu: "Hạ tầng Viettel, hỗ trợ toàn quốc." },
  { key: "vnpt", ten: "VNPT-Invoice", web: "https://vnpt-invoice.com.vn", ghi_chu: "Của VNPT, dùng chung hệ sinh thái VNPT." },
  { key: "easyinvoice", ten: "EasyInvoice (SoftDreams)", web: "https://easyinvoice.vn", ghi_chu: "Giá tốt cho hộ/DN siêu nhỏ." },
  { key: "fpt", ten: "FPT.eInvoice", web: "https://einvoice.fpt.com.vn", ghi_chu: "Của FPT." },
  { key: "bkav", ten: "BKAV eHoadon", web: "https://ehoadon.vn", ghi_chu: "Của BKAV." },
];

const THUE_SUAT_GTGT = [
  { v: 0, mo_ta: "0% — hàng hoá/dịch vụ xuất khẩu" },
  { v: 5, mo_ta: "5% — hàng thiết yếu (nước sạch, thiết bị y tế, nông sản...)" },
  { v: 8, mo_ta: "8% — mức giảm theo nghị quyết hỗ trợ (nếu còn hiệu lực & thuộc diện áp dụng)" },
  { v: 10, mo_ta: "10% — mức phổ thông" },
  { v: -1, mo_ta: "KCT/KKKNT — không chịu thuế / không kê khai tính nộp" },
];

app.get("/api/hoadon/providers", (req, res) => res.json({ providers: PROVIDERS, thue_suat: THUE_SUAT_GTGT }));

// Soạn + KIỂM TRA + TÍNH nội dung hoá đơn (bản thảo để CEO phát hành qua provider của mình)
app.post("/api/hoadon/draft", async (req, res) => {
  const d = req.body || {};
  const items = Array.isArray(d.items) ? d.items : [];
  if (!items.length) return res.status(400).json({ error: "Chưa có dòng hàng hoá/dịch vụ." });
  // Tính toán phía server (không phụ thuộc AI cho con số tiền)
  let tongTruocThue = 0, tongThue = 0;
  const rows = items.map((it, i) => {
    const sl = Number(it.so_luong || 0), dg = Number(it.don_gia || 0);
    const ts = it.thue_suat === "" || it.thue_suat == null ? 10 : Number(it.thue_suat);
    const thanhTien = Math.round(sl * dg);
    const tienThue = ts > 0 ? Math.round(thanhTien * ts / 100) : 0;
    tongTruocThue += thanhTien; tongThue += tienThue;
    return { stt: i + 1, ten: it.ten || "", dvt: it.dvt || "", so_luong: sl, don_gia: dg,
      thue_suat: ts, thanh_tien: thanhTien, tien_thue: tienThue };
  });
  const tongThanhToan = tongTruocThue + tongThue;
  // Kiểm tra hợp lệ cơ bản
  const canhBao = [];
  if (!d.mua_mst && (d.mua_ten || "").length) canhBao.push("Người mua là tổ chức nên có MST; nếu là cá nhân không kinh doanh có thể để trống MST.");
  if (!d.ban_mst) canhBao.push("Thiếu MST người bán — bắt buộc trên hoá đơn.");
  rows.forEach(r => { if (!r.ten) canhBao.push(`Dòng ${r.stt}: thiếu tên hàng hoá/dịch vụ.`);
    if (r.don_gia <= 0) canhBao.push(`Dòng ${r.stt}: đơn giá phải > 0.`); });
  let aiNote = "";
  try {
    aiNote = await llm(
`Bạn là trợ lý kế toán thuế Việt Nam. Cho hoá đơn GTGT (điện tử) với các dòng hàng:
${rows.map(r => `- ${r.ten}: SL ${r.so_luong}, ĐG ${r.don_gia}, thuế suất ${r.thue_suat}%`).join("\n")}
Người bán MST: ${d.ban_mst || "(trống)"} — ${d.ban_ten || ""}
Người mua: ${d.mua_ten || ""} MST ${d.mua_mst || "(trống)"}
Hãy nêu NGẮN GỌN (gạch đầu dòng, tối đa 6 ý): thuế suất áp dụng có hợp lý không, rủi ro sai sót cần lưu ý về nội dung/thời điểm lập hoá đơn theo NĐ 123/2020 & TT 78/2021, và lưu ý về diễn giải tên hàng cho đúng chuẩn. Chỉ trả nội dung tư vấn.`, 700);
  } catch (e) { aiNote = "(Không tạo được ghi chú AI: " + e.message + ")"; }
  res.json({
    rows, tong_truoc_thue: tongTruocThue, tong_thue: tongThue, tong_thanh_toan: tongThanhToan,
    canh_bao: canhBao, ai_note: aiNote + DISCLAIMER,
    phat_hanh: {
      huong_dan: "Hoá đơn CHÍNH THỨC được phát hành trên phần mềm của nhà cung cấp HĐĐT mà CEO đã đăng ký (ký bằng chữ ký số của DN). Bản thảo này để CEO nhập/kiểm tra trước khi bấm phát hành.",
      providers: PROVIDERS.map(p => ({ ten: p.ten, web: p.web })),
    },
  });
});

// ─────────────────────────────────────────────────────────────
// PHẦN C — KÊ KHAI THUẾ
// ─────────────────────────────────────────────────────────────

// Hồ sơ nghĩa vụ thuế của DN (kê khai) — sinh từ đặc điểm DN
const TO_KHAI = {
  mon_bai:  { ma: "Mẫu 01/LPMB", ten: "Tờ khai lệ phí môn bài" },
  gtgt:     { ma: "Mẫu 01/GTGT", ten: "Tờ khai thuế GTGT (khấu trừ)" },
  tndn_qt:  { ma: "Mẫu 03/TNDN", ten: "Quyết toán thuế TNDN năm" },
  tncn_kk:  { ma: "Mẫu 05/KK-TNCN", ten: "Tờ khai khấu trừ thuế TNCN" },
  tncn_qt:  { ma: "Mẫu 05/QTT-TNCN", ten: "Quyết toán thuế TNCN năm" },
};

app.post("/api/thue/nghia-vu", async (req, res) => {
  const d = req.body || {};
  const dt = Number(String(d.doanh_thu_nam || "0").replace(/[^\d]/g, ""));
  const von = Number(String(d.von || "0").replace(/[^\d]/g, ""));
  const kyGtgt = dt > 50000000000 ? "tháng" : "quý"; // >50 tỷ khai tháng, ≤50 tỷ khai quý
  const monBai = von > 10000000000 ? "3.000.000đ/năm (vốn > 10 tỷ)" : "2.000.000đ/năm (vốn ≤ 10 tỷ)";
  const list = [
    { thue: "Lệ phí môn bài", to_khai: TO_KHAI.mon_bai, muc: monBai,
      han: "Nộp tiền chậm nhất 30/1 hằng năm. DN mới thành lập: MIỄN năm đầu (NĐ 22/2020); nộp tờ khai chậm nhất 30/1 năm sau năm thành lập." },
    { thue: "Thuế GTGT", to_khai: TO_KHAI.gtgt, muc: "0% / 5% / 8% / 10% tuỳ hàng hoá dịch vụ",
      han: kyGtgt === "quý" ? "Khai theo QUÝ — chậm nhất ngày cuối tháng đầu quý sau (≈30/4, 31/7, 31/10, 31/1)." : "Khai theo THÁNG — chậm nhất ngày 20 tháng sau." },
    { thue: "Thuế TNDN", to_khai: TO_KHAI.tndn_qt, muc: "20% trên thu nhập tính thuế",
      han: "Tạm nộp 4 quý (không phải nộp tờ khai quý) chậm nhất ngày 30 tháng đầu quý sau; QUYẾT TOÁN năm chậm nhất 31/3. Tổng tạm nộp phải ≥ 80% số quyết toán." },
  ];
  if (d.co_lao_dong) list.push(
    { thue: "Thuế TNCN (khấu trừ tại nguồn)", to_khai: TO_KHAI.tncn_kk, muc: "Biểu luỹ tiến với lao động ký HĐ; 10% với vãng lai ≥ 2 triệu/lần",
      han: "Khai theo quý (nếu đủ điều kiện) — cùng hạn GTGT quý; quyết toán 05/QTT-TNCN chậm nhất 31/3." });
  let aiNote = "";
  try {
    aiNote = await llm(
`Trợ lý thuế Việt Nam. DN: ${d.loai_hinh || ""}, vốn ${von.toLocaleString("vi")}đ, doanh thu năm ước ${dt.toLocaleString("vi")}đ, ${d.co_lao_dong ? "CÓ" : "KHÔNG"} lao động, phương pháp tính thuế: ${d.pp_tinh_thue || "khấu trừ"}.
Giải thích NGẮN GỌN cho một Solo CEO không rành kế toán (tối đa 8 gạch đầu dòng): các loại thuế phải làm, khi nào nộp, mẹo tránh bị phạt chậm nộp, và có nên thuê dịch vụ kế toán không. Chỉ trả nội dung.`, 900);
  } catch (e) { aiNote = "(Không tạo được ghi chú AI: " + e.message + ")"; }
  res.json({ ky_gtgt: kyGtgt, danh_sach: list, ai_note: aiNote + DISCLAIMER });
});

// AI soạn BẢN THẢO một tờ khai cụ thể từ số liệu CEO nhập
app.post("/api/thue/to-khai", async (req, res) => {
  const d = req.body || {};
  const loai = d.loai || "gtgt";
  const info = TO_KHAI[loai] || TO_KHAI.gtgt;
  const soLieu = Object.entries(d.so_lieu || {}).map(([k, v]) => `- ${k}: ${v}`).join("\n") || "(CEO chưa nhập số liệu chi tiết)";
  let vb = "";
  try {
    vb = (await llm(
`Soạn BẢN THẢO "${info.ten}" (${info.ma}) theo mẫu của Tổng cục Thuế Việt Nam, kỳ tính thuế: ${d.ky || ""}.
Thông tin người nộp thuế: ${d.nnt_ten || ""}, MST ${d.mst || ""}, kỳ ${d.ky || ""}.
Số liệu do CEO cung cấp:
${soLieu}
Trình bày đúng bố cục tờ khai (các chỉ tiêu đánh số), tính toán các chỉ tiêu tổng hợp từ số liệu trên, nêu rõ chỉ tiêu nào CEO cần tự điền nếu còn thiếu. Tiếng Việt hành chính. Chỉ trả nội dung tờ khai.`, 2600)) + DISCLAIMER;
  } catch (e) { return res.status(500).json({ error: "Lỗi soạn tờ khai: " + e.message }); }
  res.json({ to_khai: info, van_ban: vb, nop: {
    cong: "thuedientu.gdt.gov.vn",
    huong_dan: "Đăng nhập bằng tài khoản thuế điện tử của DN → 'Kê khai' → chọn đúng mẫu tờ khai → nhập số liệu (đối chiếu bản thảo này) → ký bằng chữ ký số → nộp. Sau đó lập giấy nộp tiền điện tử nếu phát sinh số phải nộp.",
  } });
});

// Lịch thuế trong năm (nhắc hạn tránh phạt)
app.get("/api/thue/lich", (req, res) => {
  const y = Number(req.query.nam) || 0;
  const pp = req.query.pp === "thang" ? "thang" : "quy";
  const nn = y || "(năm hiện tại)";
  const lich = [
    { han: `30/1/${nn}`, viec: "Nộp lệ phí môn bài cả năm; nộp tờ khai môn bài nếu DN mới/đổi vốn." },
  ];
  if (pp === "quy") {
    lich.push(
      { han: `30/4/${nn}`, viec: "Tờ khai GTGT Q1 + tạm nộp TNDN Q1 (+ TNCN Q1 nếu có)." },
      { han: `31/7/${nn}`, viec: "Tờ khai GTGT Q2 + tạm nộp TNDN Q2 (+ TNCN Q2)." },
      { han: `31/10/${nn}`, viec: "Tờ khai GTGT Q3 + tạm nộp TNDN Q3 (+ TNCN Q3)." },
      { han: `31/1/${(y ? y + 1 : "")}`, viec: "Tờ khai GTGT Q4 + tạm nộp TNDN Q4 (+ TNCN Q4)." },
    );
  } else {
    lich.push({ han: `Ngày 20 hằng tháng`, viec: "Tờ khai GTGT tháng trước (+ TNCN tháng nếu khai tháng)." });
  }
  lich.push(
    { han: `31/3/${(y ? y + 1 : "năm sau")}`, viec: `QUYẾT TOÁN thuế TNDN (03/TNDN) & TNCN (05/QTT-TNCN) của năm ${nn}.` },
    { han: `Trong 5 ngày`, viec: "Nộp tiền thuế trong thời hạn nộp tờ khai để tránh tiền chậm nộp 0,03%/ngày." },
  );
  res.json({ pp, lich, luu_y: "Các mốc là hạn CUỐI theo quy định chung; nếu trùng ngày nghỉ thì lùi sang ngày làm việc kế tiếp. Đối chiếu thông báo của cơ quan thuế quản lý." });
});

app.get("/api/thue/huong-dan", (req, res) => res.json({
  buoc: [
    { b: "1. Chữ ký số & tài khoản thuế điện tử", m: "DN cần chữ ký số (token) và tài khoản trên thuedientu.gdt.gov.vn (đăng ký khi thành lập)." },
    { b: "2. Đăng ký sử dụng hoá đơn điện tử", m: "Chọn nhà cung cấp HĐĐT (MISA/Viettel/VNPT...), nộp Mẫu 01/ĐKTĐ-HĐĐT qua cổng, chờ cơ quan thuế chấp nhận." },
    { b: "3. Phát hành hoá đơn", m: "Xuất hoá đơn trên phần mềm nhà cung cấp, ký số; dữ liệu tự chuyển về Tổng cục Thuế (có mã/không mã)." },
    { b: "4. Kê khai định kỳ", m: "Mỗi quý/tháng: lập tờ khai GTGT (+TNCN), đối chiếu bản thảo AI, ký số & nộp trên cổng." },
    { b: "5. Tạm nộp & quyết toán", m: "Tạm nộp TNDN theo quý; cuối năm quyết toán TNDN & TNCN chậm nhất 31/3." },
    { b: "6. Lưu trữ & tránh phạt", m: "Lưu hoá đơn, chứng từ, tờ khai; nộp đúng hạn (chậm nộp bị phạt + tiền chậm nộp 0,03%/ngày)." },
  ],
  chu_y: "Nếu doanh nghiệp phức tạp hoặc doanh thu lớn, nên thuê kế toán/đại lý thuế có chứng chỉ. SoloCEO hỗ trợ soạn thảo & nhắc hạn, không thay thế trách nhiệm kê khai của DN.",
}));

// ─────────────────────────────────────────────────────────────
// NÂNG CẤP — BÁO CÁO QUÝ: đồng bộ/nhập hoá đơn đầu vào–đầu ra, tổng hợp & đối chiếu
// Nguồn hợp pháp: (1) API phần mềm HĐĐT của CHÍNH DN (MISA/Viettel/VNPT — key của CEO),
//                 (2) file kết xuất từ Cổng hoadondientu.gdt.gov.vn (XML/Excel/CSV).
// SoloCEO KHÔNG tự đăng nhập Cổng Thuế thay CEO, KHÔNG có API bên-thứ-ba kéo hoá đơn trực tiếp.
// ─────────────────────────────────────────────────────────────

// Kiểm tra định dạng MST (10 số, hoặc 13 số dạng chi nhánh) — kiểm tra sơ bộ.
function mstDinhDang(mst) {
  const s = String(mst || "").replace(/[^0-9]/g, "");
  return s.length === 10 || s.length === 13;
}
const R = (n) => Math.round(Number(n) || 0);

// Chuẩn hoá 1 danh sách hoá đơn thô về cấu trúc thống nhất
function chuanHoaHoaDon(arr) {
  return (Array.isArray(arr) ? arr : []).map((x, i) => {
    const truoc = R(x.truoc_thue != null ? x.truoc_thue : (Number(x.so_luong || 0) * Number(x.don_gia || 0)));
    const ts = x.thue_suat === "" || x.thue_suat == null ? 10 : Number(x.thue_suat);
    const thueKhai = x.thue != null ? R(x.thue) : (ts > 0 ? R(truoc * ts / 100) : 0);
    return {
      idx: i + 1,
      loai: (x.loai === "vao" || x.loai === "input") ? "vao" : "ra",
      so: String(x.so || x.so_hd || ""),
      ky_hieu: String(x.ky_hieu || ""),
      ngay: String(x.ngay || ""),
      mst: String(x.mst || x.mst_doi_tac || ""),
      ten: String(x.ten || x.ten_doi_tac || ""),
      truoc_thue: truoc, thue_suat: ts, thue: thueKhai,
    };
  });
}

// Tổng hợp một kỳ + đối chiếu/kiểm tra
app.post("/api/baocao/tong-hop", async (req, res) => {
  const d = req.body || {};
  const hds = chuanHoaHoaDon(d.hoa_don);
  if (!hds.length) return res.status(400).json({ error: "Chưa có hoá đơn nào để tổng hợp." });
  const ra = hds.filter(h => h.loai === "ra"), vao = hds.filter(h => h.loai === "vao");
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
  // Doanh thu chịu thuế theo từng mức thuế suất đầu ra
  const theoMuc = {};
  ra.forEach(h => { const k = h.thue_suat; theoMuc[k] = theoMuc[k] || { truoc: 0, thue: 0 }; theoMuc[k].truoc += h.truoc_thue; theoMuc[k].thue += h.thue; });
  const tongDoanhThu = sum(ra, h => h.truoc_thue);
  const thueDauRa = sum(ra, h => h.thue);
  const thueDauVao = sum(vao, h => h.thue);
  const phaiNop = Math.max(0, thueDauRa - thueDauVao);
  const conKhauTru = Math.max(0, thueDauVao - thueDauRa);
  // Đối chiếu / kiểm tra tự động
  const canhBao = [];
  const seen = {};
  hds.forEach(h => {
    if (!mstDinhDang(h.mst) && h.mst) canhBao.push(`HĐ ${h.loai === "ra" ? "đầu ra" : "đầu vào"} số ${h.so || h.idx}: MST "${h.mst}" sai định dạng (phải 10 hoặc 13 chữ số).`);
    if (h.loai === "vao" && !h.mst) canhBao.push(`HĐ đầu vào số ${h.so || h.idx}: thiếu MST người bán — không đủ điều kiện khấu trừ.`);
    if (h.thue_suat > 0) { const dung = R(h.truoc_thue * h.thue_suat / 100); if (Math.abs(dung - h.thue) > 1) canhBao.push(`HĐ số ${h.so || h.idx}: tiền thuế ${h.thue.toLocaleString("vi")} lệch với tính lại ${dung.toLocaleString("vi")} (${h.thue_suat}%).`); }
    const key = `${h.loai}|${h.mst}|${h.so}`;
    if (h.so && seen[key]) canhBao.push(`Nghi TRÙNG hoá đơn: ${h.loai === "ra" ? "đầu ra" : "đầu vào"} số ${h.so} (MST ${h.mst}).`);
    seen[key] = true;
  });
  let aiDoiChieu = "";
  try {
    aiDoiChieu = await llm(
`Bạn là kế toán thuế. Tổng hợp kỳ ${d.ky || ""}: doanh thu đầu ra ${tongDoanhThu.toLocaleString("vi")}đ, thuế GTGT đầu ra ${thueDauRa.toLocaleString("vi")}đ, thuế đầu vào được khấu trừ ${thueDauVao.toLocaleString("vi")}đ, số phải nộp ${phaiNop.toLocaleString("vi")}đ. Có ${ra.length} HĐ đầu ra, ${vao.length} HĐ đầu vào. ${canhBao.length ? "Cảnh báo đối chiếu: " + canhBao.slice(0, 4).join("; ") : "Không có cảnh báo."}
Nêu NGẮN GỌN (tối đa 6 gạch đầu dòng): rủi ro cần rà trước khi nộp tờ khai quý, tỷ lệ thuế đầu vào/đầu ra có bất thường không, và nhắc đối chiếu với dữ liệu trên Cổng hoadondientu.gdt.gov.vn. Chỉ trả nội dung.`, 700);
  } catch (e) { aiDoiChieu = "(Không tạo được đối chiếu AI: " + e.message + ")"; }
  res.json({
    ky: d.ky || "", so_luong: { dau_ra: ra.length, dau_vao: vao.length },
    theo_muc: Object.entries(theoMuc).map(([ts, v]) => ({ thue_suat: Number(ts), doanh_thu: v.truoc, thue: v.thue })),
    tong: { doanh_thu: tongDoanhThu, thue_dau_ra: thueDauRa, thue_dau_vao: thueDauVao, phai_nop: phaiNop, con_khau_tru: conKhauTru },
    canh_bao: canhBao, ai_doi_chieu: aiDoiChieu + DISCLAIMER,
    // Số liệu sẵn sàng đổ vào tờ khai 01/GTGT
    to_khai_prefill: {
      "Tổng doanh thu HHDV bán ra chịu thuế": tongDoanhThu,
      "Thuế GTGT đầu ra": thueDauRa,
      "Thuế GTGT đầu vào được khấu trừ": thueDauVao,
      "Thuế GTGT còn phải nộp trong kỳ": phaiNop,
      "Thuế GTGT chưa khấu trừ hết chuyển kỳ sau": conKhauTru,
    },
  });
});

// ── KẾT NỐI phần mềm HĐĐT của CHÍNH DN (dùng API key của CEO) — khung adapter ──
const PROVIDER_META = {
  misa:    { ten: "MISA meInvoice", huong_dan: "Đăng nhập meInvoice → Thiết lập → API/Kết nối → tạo AppId & tài khoản dịch vụ; nhập taxCode, username, password, domain vào đây." },
  viettel: { ten: "Viettel S-Invoice", huong_dan: "Liên hệ Viettel cấp tài khoản API (username/password + endpoint); nhập vào đây." },
  vnpt:    { ten: "VNPT-Invoice", huong_dan: "Lấy Account/ACpass (tài khoản dịch vụ) từ VNPT; nhập endpoint + tài khoản vào đây." },
};
app.get("/api/ketnoi/meta", (req, res) => res.json({
  providers: Object.entries(PROVIDER_META).map(([k, v]) => ({ key: k, ...v })),
  luu_y: "Bạn nhập KEY/tài khoản của CHÍNH doanh nghiệp bạn tại nhà cung cấp HĐĐT. Khoá được mã hoá AES-256 trước khi lưu, chỉ dùng để đồng bộ hoá đơn CỦA BẠN. Đây là kênh chính thống (nhà cung cấp được Tổng cục Thuế cấp phép).",
}));
app.post("/api/ketnoi/luu", (req, res) => {
  const d = req.body || {};
  if (!d.mst || !d.provider) return res.status(400).json({ error: "Thiếu MST hoặc nhà cung cấp." });
  connSet(String(d.mst), d.provider, d.cfg || {});
  res.json({ ok: true, trang_thai: "Đã lưu kết nối (khoá mã hoá, bền vững qua khởi động lại). Bấm 'Thử đồng bộ' để kéo hoá đơn." });
});
app.get("/api/ketnoi/trang-thai", (req, res) => {
  const c = connGet(String(req.query.mst || ""));
  res.json({ da_ket_noi: !!c, provider: c ? c.provider : null });
});

// Adapter đồng bộ hoá đơn từ nhà cung cấp HĐĐT của CEO (REST cấu hình được, mặc định mẫu MISA).
// Trả {ok, hoa_don[], message}. Không có endpoint/tài khoản hợp lệ → ok:false + thông báo rõ, KHÔNG bịa dữ liệu.
async function providerSync(provider, cfg, kyTu, kyDen) {
  const c = cfg || {};
  // Endpoint auth & invoice: ưu tiên cfg.auth_url/invoice_url; nếu chỉ có domain → suy ra mẫu MISA.
  const domain = (c.domain || "").replace(/\/$/, "");
  const authUrl = c.auth_url || (provider === "misa" && domain ? `${domain}/api/service/account/authenticationbypartner` : "");
  const invUrl = c.invoice_url || (provider === "misa" && domain ? `${domain}/api/service/invoice/searchpublic` : "");
  if (!authUrl || !invUrl) {
    return { ok: false, can_cau_hinh: true, message: `Khung kết nối ${PROVIDER_META[provider]?.ten || provider} đã sẵn sàng và mã hoá khoá của bạn. Để kích hoạt đồng bộ tự động, cần endpoint API (auth_url + invoice_url) và tài khoản dịch vụ hợp lệ của DN bạn — tham số này lấy trong phần API/Kết nối của phần mềm HĐĐT. Trong lúc chờ, hãy dùng 'Nhập file/CSV'.` };
  }
  try {
    const authBody = c.appId ? { appid: c.appId, taxcode: c.taxCode || c.mst, username: c.username, password: c.password }
                             : { username: c.username, password: c.password };
    const ar = await fetch(authUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(authBody) });
    const aj = await ar.json().catch(() => ({}));
    const token = aj.token || aj.access_token || (aj.data && (aj.data.token || aj.data.access_token)) || "";
    if (!token) return { ok: false, message: "Xác thực nhà cung cấp thất bại — kiểm tra tài khoản/endpoint. Phản hồi: " + JSON.stringify(aj).slice(0, 160) };
    const ir = await fetch(invUrl, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ fromDate: kyTu || "", toDate: kyDen || "" }) });
    const ij = await ir.json().catch(() => ({}));
    const list = Array.isArray(ij) ? ij : (ij.data || ij.invoices || []);
    const hoaDon = list.map((x) => ({
      loai: (x.invoiceType === "input" || x.loai === "vao") ? "vao" : "ra",
      so: x.invoiceNumber || x.invNo || x.so || "", ngay: x.invoiceDate || x.ngay || "",
      mst: x.buyerTaxCode || x.sellerTaxCode || x.mst || "", ten: x.buyerName || x.sellerName || x.ten || "",
      truoc_thue: Number(x.totalAmountWithoutVat || x.truoc_thue || 0), thue_suat: Number(x.vatRate || x.thue_suat || 10),
      thue: Number(x.vatAmount || x.thue || 0),
    }));
    return { ok: true, hoa_don: hoaDon, message: `Đã đồng bộ ${hoaDon.length} hoá đơn từ ${PROVIDER_META[provider]?.ten || provider}.` };
  } catch (e) { return { ok: false, message: "Lỗi gọi API nhà cung cấp: " + e.message }; }
}
app.post("/api/ketnoi/dong-bo", async (req, res) => {
  const d = req.body || {};
  const c = connGet(String(d.mst || ""));
  if (!c) return res.status(400).json({ error: "Chưa cấu hình kết nối cho MST này. Vào tab Kết nối để nhập tài khoản HĐĐT của bạn, hoặc dùng nhập file." });
  const r = await providerSync(c.provider, { ...c.cfg, mst: d.mst }, d.tu, d.den);
  res.json({ provider: c.provider, ok: !!r.ok, can_cau_hinh: r.can_cau_hinh || false, thong_bao: r.message, hoa_don: r.hoa_don || [] });
});

// ── Nối DOANH THU từ CRM Perfex của CEO (nối THẲNG DB, xác thực X-Ceo-Token như crm-mcp) ──
const PERFEX = {
  host: process.env.PERFEX_DB_HOST || "perfex-db", port: Number(process.env.PERFEX_DB_PORT || 3306),
  user: process.env.PERFEX_DB_USER || "root", password: process.env.PERFEX_DB_PASS || "",
  mainDb: process.env.PERFEX_MAIN_DB || "perfex",
};
async function crmDoanhThu(userId, tu, den) {
  if (!mysql) throw new Error("Thiếu driver mysql2.");
  const conn = await mysql.createConnection({ host: PERFEX.host, port: PERFEX.port, user: PERFEX.user, password: PERFEX.password, database: PERFEX.mainDb, connectTimeout: 8000 });
  try {
    const tname = tenantName(userId);
    const [rows] = await conn.execute("SELECT tenants_db FROM tblclient_plan WHERE tenants_name=? LIMIT 1", [tname]);
    if (!rows.length || !rows[0].tenants_db) return { can_noi: true, thong_bao: "CRM của bạn chưa được khởi tạo. Mở workspace/crm một lần rồi thử lại." };
    const db = rows[0].tenants_db.replace(/[^a-zA-Z0-9_]/g, "");
    const cond = []; const p = [];
    if (tu) { cond.push("date>=?"); p.push(tu); }
    if (den) { cond.push("date<=?"); p.push(den); }
    const where = "WHERE status!=5" + (cond.length ? " AND " + cond.join(" AND ") : "");
    const [inv] = await conn.query(`SELECT COUNT(*) n, COALESCE(SUM(total),0) t, COALESCE(SUM(CASE WHEN status=2 THEN total ELSE 0 END),0) paid FROM \`${db}\`.tblinvoices ${where}`, p);
    return { ok: true, so_hoa_don: Number(inv[0].n), tong_doanh_thu: R(inv[0].t), da_thanh_toan: R(inv[0].paid),
      ghi_chu: "Doanh thu lấy từ hoá đơn CRM của bạn (Perfex) — dùng đối chiếu với HĐĐT đã phát hành." };
  } finally { await conn.end(); }
}
app.post("/api/crm/doanh-thu", async (req, res) => {
  const d = req.body || {};
  const tok = req.headers["x-ceo-token"] || d.ceo || req.query.ceo;
  const userId = verifyCeoToken(String(tok || ""));
  if (!userId) return res.json({ can_noi: true, thong_bao: "Chưa xác định được CEO (thiếu/không hợp lệ X-Ceo-Token). Trang này cần mở trong workspace SoloCEO để tự nhận diện CRM của bạn." });
  try { res.json(await crmDoanhThu(userId, d.tu, d.den)); }
  catch (e) { res.json({ can_noi: true, thong_bao: "Không đọc được CRM: " + e.message }); }
});

app.get("/health", (req, res) => res.json({ ok: true, svc: "thue-svc", v: 3, crm: !!mysql }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => console.log(`thue-svc nghe cổng ${PORT}`));
