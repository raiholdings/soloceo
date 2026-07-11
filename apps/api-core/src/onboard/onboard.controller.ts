import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { IsArray, IsOptional, IsString, MaxLength } from "class-validator";

class DanhGiaDto {
  @IsString() @MaxLength(120) tenDN!: string;
  @IsString() @MaxLength(60) nganh!: string;
  @IsString() @MaxLength(2000) yTuong!: string;
  @IsOptional() @IsString() @MaxLength(200) vonKhoiDiem?: string;
  @IsOptional() @IsString() @MaxLength(300) kenhBan?: string;
  @IsOptional() @IsString() @MaxLength(300) mucTieu?: string;
  /** Catalog gói BM từ /workspace/api/bm (client gửi kèm — nguồn động, không hardcode) */
  @IsArray() cacGoi!: { id: string; ten: string; tagline?: string }[];
}

/**
 * Onboarding "phân nhập dữ liệu ý tưởng": CEO khai báo ý tưởng → LLM (qua
 * LiteLLM) đánh giá và ghép: gói Mô hình kinh doanh phù hợp + trợ lý AI nên
 * dùng + vai trò 8 nền tảng cho đúng ý tưởng đó → workspace chỉ setup phần
 * liên quan. Trợ lý lấy động từ DeerFlow gateway (token server-side).
 */
@ApiTags("onboard")
@ApiBearerAuth()
@Controller("onboard")
export class OnboardController {
  constructor(private readonly config: ConfigService) {}

  @Post("danh-gia")
  @ApiOperation({ summary: "Đánh giá ý tưởng → gói BM + trợ lý + nền tảng phù hợp" })
  async danhGia(@Body() dto: DanhGiaDto) {
    // 1) Lấy danh sách trợ lý mặc định (metadata) từ gateway
    let troLyCatalog: { name: string; description: string }[] = [];
    const gwBase = process.env.DEERFLOW_PUBLIC_BASE ?? "https://soloceo.vn";
    const gwToken = process.env.DEERFLOW_INTERNAL_TOKEN;
    if (gwToken) {
      try {
        const r = await fetch(`${gwBase}/api/agents`, {
          headers: { "X-DeerFlow-Internal-Token": gwToken },
        });
        if (r.ok) {
          const d = (await r.json()) as { agents?: { name: string; description?: string }[] };
          troLyCatalog = (d.agents ?? []).map((a) => ({
            name: a.name,
            description: (a.description ?? "").slice(0, 110),
          }));
        }
      } catch {
        /* gateway lỗi → vẫn đánh giá, phần trợ lý để trống */
      }
    }

    const goiList = dto.cacGoi
      .slice(0, 80)
      .map((g) => `- ${g.id}: ${g.ten}${g.tagline ? ` — ${g.tagline}` : ""}`)
      .join("\n");
    const troLyList = troLyCatalog.map((t) => `- ${t.name}: ${t.description}`).join("\n");

    const prompt = `Bạn là cố vấn khởi nghiệp của SoloCEO. CEO Việt vừa khai báo ý tưởng:
- Tên doanh nghiệp: ${dto.tenDN}
- Ngành: ${dto.nganh}
- Ý tưởng: ${dto.yTuong}
- Vốn khởi điểm: ${dto.vonKhoiDiem ?? "chưa rõ"}
- Kênh bán dự kiến: ${dto.kenhBan ?? "chưa rõ"}
- Mục tiêu: ${dto.mucTieu ?? "chưa rõ"}

DANH SÁCH GÓI MÔ HÌNH KINH DOANH (id: tên — mô tả):
${goiList}

DANH SÁCH TRỢ LÝ AI (name: mô tả):
${troLyList || "(trống)"}

8 NỀN TẢNG: deerflow (điều phối đội AI), sandbox (agent dựng web/tài liệu), flowgram (quy trình lặp),
midscene (thao tác web), dolphin (đọc giấy tờ), arishem (phê duyệt tiền/pháp lý), godlp (che dữ liệu cá nhân),
g3 (an ninh mạng).

Trả về DUY NHẤT JSON (tiếng Việt, thực dụng, không tâng bốc):
{"danhGia":"3-5 câu đánh giá thẳng ý tưởng: điểm mạnh, rủi ro chính, tính khả thi với nguồn lực đã khai",
 "diem": số 1-10,
 "goiPhuHop":[{"id":"id gói từ danh sách","lyDo":"1 câu vì sao hợp"}] (đúng 2-3 gói, id PHẢI có trong danh sách),
 "troLyPhuHop":[{"name":"name từ danh sách","lyDo":"1 câu"}] (5-7 trợ lý, name PHẢI có trong danh sách),
 "nenTang":[{"key":"deerflow|sandbox|...","vaiTro":"1 câu nền tảng này giúp gì cho Ý TƯỞNG NÀY"}] (4-6 cái sát nhất),
 "buocDauTien":"1 việc cụ thể nên giao cho đội AI ngay hôm nay"}`;

    const baseUrl = this.config.get<string>("LITELLM_BASE_URL") ?? "https://llm.soloceo.vn";
    const masterKey = this.config.get<string>("LITELLM_MASTER_KEY");
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${masterKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "soloceo-fast",
        max_tokens: 2500,
        temperature: 0.4,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      return { ok: false, loi: `Hệ thống đánh giá bận (${res.status}) — thử lại sau ít phút.` };
    }
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    let raw = data.choices[0]!.message.content.trim();
    raw = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    try {
      const parsed = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as Record<string, unknown>;
      // lọc id/name lạ do model bịa
      const goiIds = new Set(dto.cacGoi.map((g) => g.id));
      const tlNames = new Set(troLyCatalog.map((t) => t.name));
      parsed.goiPhuHop = ((parsed.goiPhuHop as { id: string }[]) ?? []).filter((g) => goiIds.has(g.id)).slice(0, 3);
      parsed.troLyPhuHop = ((parsed.troLyPhuHop as { name: string }[]) ?? [])
        .filter((t) => tlNames.has(t.name))
        .slice(0, 7);
      return { ok: true, ketQua: parsed };
    } catch {
      return { ok: false, loi: "Kết quả đánh giá không đọc được — thử lại." };
    }
  }
}
