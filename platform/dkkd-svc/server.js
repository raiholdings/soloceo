// SoloCEO — Lập doanh nghiệp (Phần A): AI sinh bộ hồ sơ thành lập DN + hướng dẫn nộp.
// HỢP PHÁP: chỉ CHUẨN BỊ hồ sơ (bản thảo để CEO rà soát) + hướng dẫn nộp trên
// Cổng ĐKKD quốc gia. KHÔNG nộp thay, KHÔNG kết nối cơ quan nhà nước.
const express = require("express");
const path = require("path");

const LLM_BASE = (process.env.LLM_BASE_URL || "https://llm.soloceo.vn/v1").replace(/\/$/, "");
const LLM_KEY = process.env.LLM_API_KEY || "";
const LLM_MODEL = process.env.LLM_MODEL_NAME || "soloceo-smart";
const BIGDATA = process.env.BIGDATA_BASE || "https://bigdata.soloceo.vn";

const app = express();
app.use(express.json({ limit: "512kb" }));
app.use(express.static(path.join(__dirname, "public")));

const LOAI_HINH = {
  "tnhh-1tv": "Công ty TNHH một thành viên",
  "tnhh-2tv": "Công ty TNHH hai thành viên trở lên",
  "cp": "Công ty Cổ phần",
  "dntn": "Doanh nghiệp tư nhân",
};

async function llm(prompt, maxTokens = 2600) {
  if (!LLM_KEY) return "(Chưa cấu hình LLM_API_KEY trên server)";
  const r = await fetch(`${LLM_BASE}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${LLM_KEY}` },
    body: JSON.stringify({ model: LLM_MODEL, temperature: 0.25, max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }] }),
  });
  const j = await r.json();
  return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) ||
    "(Lỗi sinh nội dung: " + JSON.stringify(j).slice(0, 200) + ")";
}

// Proxy danh mục ngành VSIC từ bigdata (bộ não thứ 2) để chọn ngành nghề
app.get("/api/nganh", async (req, res) => {
  try {
    const q = encodeURIComponent(req.query.q || "");
    const d = await (await fetch(`${BIGDATA}/api/search?type=nganh-vsic&q=${q}&limit=30`)).json();
    res.json({ nganh: (d.results || []).map((r) => ({ ma: r.name, ten: r.oneliner })) });
  } catch (e) { res.json({ nganh: [] }); }
});

function baseInfo(d) {
  return `- Loại hình: ${LOAI_HINH[d.loai_hinh] || d.loai_hinh}
- Tên công ty (tiếng Việt): ${d.ten_vi || ""}
- Tên viết tắt: ${d.ten_tat || ""}
- Tên tiếng Anh: ${d.ten_en || ""}
- Địa chỉ trụ sở: ${d.dia_chi || ""}
- Vốn điều lệ: ${d.von || ""} VNĐ
- Ngành nghề kinh doanh: ${d.nganh || ""}
- Người đại diện theo pháp luật: ${d.dai_dien || ""} — chức danh ${d.chuc_danh || "Giám đốc"}
- Chủ sở hữu/Thành viên: ${d.chu_so_huu || ""}${d.thanh_vien ? "\n- Danh sách thành viên/cổ đông: " + d.thanh_vien : ""}`;
}

const DISCLAIMER = "\n\n---\n*BẢN THẢO do AI SoloCEO tạo để tham khảo. CEO phải RÀ SOÁT kỹ, đối chiếu mẫu chính thức tại Thông tư 01/2021/TT-BKHĐT và Luật Doanh nghiệp 2020 trước khi ký & nộp. SoloCEO không nộp thay và không chịu trách nhiệm pháp lý về nội dung.*";

app.post("/api/generate", async (req, res) => {
  const d = req.body || {};
  if (!d.ten_vi || !d.loai_hinh) return res.status(400).json({ error: "Thiếu tên công ty hoặc loại hình." });
  const info = baseInfo(d);
  const which = (d.tai_lieu || ["giay_de_nghi", "dieu_le"]);
  const out = {};
  try {
    if (which.includes("giay_de_nghi")) {
      out.giay_de_nghi = (await llm(
`Soạn "GIẤY ĐỀ NGHỊ ĐĂNG KÝ DOANH NGHIỆP" đúng thể thức mẫu Phụ lục I (Thông tư 01/2021/TT-BKHĐT) cho ${LOAI_HINH[d.loai_hinh]} tại Việt Nam, dựa trên thông tin:
${info}
Trình bày trang trọng: Quốc hiệu, tiêu ngữ, tên văn bản, kính gửi Phòng Đăng ký kinh doanh - Sở KH&ĐT, các mục thông tin doanh nghiệp (tên, địa chỉ, ngành nghề, vốn, người đại diện, chủ sở hữu), cam kết, chữ ký. Tiếng Việt chuẩn hành chính. Chỉ trả văn bản.`)) + DISCLAIMER;
    }
    if (which.includes("dieu_le")) {
      out.dieu_le = (await llm(
`Soạn "ĐIỀU LỆ CÔNG TY" đầy đủ cho ${LOAI_HINH[d.loai_hinh]} tại Việt Nam theo Luật Doanh nghiệp 2020, dựa trên:
${info}
Gồm các chương/điều chuẩn: Tên & trụ sở; Ngành nghề kinh doanh; Vốn điều lệ & phần vốn góp; Quyền và nghĩa vụ của chủ sở hữu/thành viên; Cơ cấu tổ chức quản lý (Chủ tịch/Hội đồng thành viên, Giám đốc/Tổng giám đốc, Kiểm soát viên nếu có); Người đại diện theo pháp luật; Phân chia lợi nhuận & xử lý lỗ; Tăng/giảm vốn; Chuyển nhượng phần vốn; Giải thể & thanh lý; Điều khoản thi hành. Trích dẫn điều luật phù hợp. Chỉ trả văn bản.`, 3200)) + DISCLAIMER;
    }
    if (which.includes("danh_sach") && (d.loai_hinh === "tnhh-2tv" || d.loai_hinh === "cp")) {
      out.danh_sach = (await llm(
`Soạn "${d.loai_hinh === "cp" ? "DANH SÁCH CỔ ĐÔNG SÁNG LẬP" : "DANH SÁCH THÀNH VIÊN"}" theo mẫu Phụ lục I (Thông tư 01/2021/TT-BKHĐT), dạng bảng, cho:
${info}
Các cột: STT, Họ tên, Ngày sinh, Quốc tịch, Số CCCD/Hộ chiếu, Địa chỉ thường trú, Phần vốn góp/Số cổ phần, Tỷ lệ (%), Chữ ký. Chỉ trả văn bản.`)) + DISCLAIMER;
    }
  } catch (e) {
    return res.status(500).json({ error: "Lỗi sinh hồ sơ: " + e.message });
  }
  res.json({ ho_so: out, huong_dan: HUONG_DAN, checklist: CHECKLIST });
});

const HUONG_DAN = [
  { b: "1. Chuẩn bị chữ ký số", m: "Đăng ký chữ ký số (token) cho người đại diện pháp luật, hoặc dùng tài khoản đăng ký kinh doanh có xác thực trên Cổng." },
  { b: "2. Tạo tài khoản", m: "Vào dangkyquamang.dkkd.gov.vn → đăng ký/đăng nhập tài khoản đăng ký kinh doanh." },
  { b: "3. Tạo hồ sơ đăng ký", m: "Chọn 'Đăng ký thành lập doanh nghiệp' → chọn loại hình → nhập thông tin (khớp bộ hồ sơ đã sinh) → chọn ngành nghề theo mã VSIC 2018." },
  { b: "4. Đính kèm & ký", m: "Tải lên Giấy đề nghị, Điều lệ, Danh sách thành viên (nếu có), giấy tờ pháp lý cá nhân (CCCD) → ký số toàn bộ hồ sơ." },
  { b: "5. Nộp & nộp lệ phí", m: "Nộp hồ sơ + thanh toán lệ phí công bố nội dung ĐKDN. Cơ quan xử lý trong ~3 ngày làm việc." },
  { b: "6. Nhận kết quả", m: "Nhận Giấy chứng nhận ĐKDN (mã số DN = mã số thuế) qua Cổng. Sau đó: khắc dấu, mở tài khoản ngân hàng, nộp lệ phí môn bài, đăng ký hóa đơn điện tử." },
];
const CHECKLIST = [
  "Tên DN không trùng/gây nhầm lẫn với DN đã đăng ký (tra cứu trên Cổng trước).",
  "Ngành nghề chọn đúng mã VSIC 2018; ngành có điều kiện phải đủ điều kiện.",
  "Địa chỉ trụ sở hợp lệ (không dùng chung cư để ở làm trụ sở).",
  "Vốn điều lệ hợp lý (một số ngành yêu cầu vốn pháp định).",
  "Thông tin CCCD/địa chỉ người đại diện & thành viên chính xác, còn hiệu lực.",
  "Người đại diện pháp luật không thuộc đối tượng bị cấm thành lập/quản lý DN.",
];

app.get("/api/huong-dan", (req, res) => res.json({ huong_dan: HUONG_DAN, checklist: CHECKLIST }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => console.log(`dkkd-svc nghe cổng ${PORT}`));
