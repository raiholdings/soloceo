import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { decryptSecret } from "../ai/crypto.util";

/**
 * Báo cáo nghiên cứu — Đội AI sản xuất mỗi ngày một bản toàn diện.
 *
 * Vì sao lưu nguyên HTML thay vì markdown như News: một báo cáo thật có bảng so sánh, biểu
 * đồ, khung cảnh báo, bố cục hai cột. Markdown diễn đạt được tiêu đề và đoạn văn, nhưng
 * không tả nổi những thứ đó — ép vào markdown là tự cắt chân báo cáo cho vừa giày.
 *
 * Nguồn dữ liệu: kho đúc của bigdata (vấn đề · giải pháp · mô hình KD đã đúc từ dữ liệu
 * thật) và xưởng kiểm chứng. Báo cáo KHÔNG được bịa số — mọi con số phải truy được về
 * nguồn, và nguồn lưu lại trong trường `sources` để người đọc tự kiểm.
 */
@Injectable()
export class BaoCaoService {
  private readonly log = new Logger(BaoCaoService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private slugify(s: string) {
    return s
      .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
  }

  // ── Công khai ──
  danhSachCongKhai() {
    return this.prisma.report.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 60,
      // KHÔNG lấy `html`: danh sách chỉ cần thẻ tóm tắt. Kéo cả trăm nghìn ký tự HTML về
      // chỉ để hiện tiêu đề là lãng phí băng thông lẫn bộ nhớ.
      select: {
        id: true, title: true, slug: true, summary: true, coverUrl: true,
        category: true, authorName: true, publishedAt: true,
      },
    });
  }

  async motBaoCao(slug: string) {
    const r = await this.prisma.report.findUnique({ where: { slug } });
    if (!r || r.status !== "PUBLISHED") throw new BadRequestException("Không có báo cáo này");
    return r;
  }

  // ── Quản trị ──
  danhSachAdmin(status?: string) {
    return this.prisma.report.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, title: true, slug: true, summary: true, coverUrl: true, category: true,
        status: true, publishedAt: true, createdAt: true, fbPostId: true, fbPostedAt: true,
      },
    });
  }

  async nhap(p: {
    title: string; html: string; slug?: string; summary?: string;
    coverUrl?: string; category?: string; sources?: unknown; publish?: boolean;
  }) {
    if (!p?.title || !p?.html) throw new BadRequestException("Cần title và html");
    let slug = this.slugify(p.slug || p.title) || `bao-cao-${Date.now()}`;
    const cu = await this.prisma.report.findUnique({ where: { slug } });
    const data = {
      title: p.title.slice(0, 300),
      summary: (p.summary ?? "").slice(0, 1000) || null,
      html: p.html,
      coverUrl: p.coverUrl ?? null,
      category: p.category ?? "thi-truong",
      sources: (p.sources ?? null) as never,
      status: p.publish === false ? "DRAFT" : "PUBLISHED",
      publishedAt: p.publish === false ? null : new Date(),
    };
    // Cùng slug thì CẬP NHẬT: sinh lại một báo cáo không được đẻ ra bản trùng.
    if (cu) return this.prisma.report.update({ where: { id: cu.id }, data: data as never });
    return this.prisma.report.create({ data: { ...data, slug } as never });
  }

  async dangTrangThai(id: string, publish: boolean) {
    return this.prisma.report.update({
      where: { id },
      data: { status: publish ? "PUBLISHED" : "DRAFT", publishedAt: publish ? new Date() : null },
    });
  }

  xoa(id: string) {
    return this.prisma.report.delete({ where: { id } });
  }

  // ── Sinh báo cáo hằng ngày ──
  private async llm(prompt: string, maxTokens = 8000): Promise<string> {
    const base = this.config.get<string>("LITELLM_BASE_URL") ?? "https://llm.soloceo.vn";
    const key = this.config.get<string>("LITELLM_MASTER_KEY");
    if (!key) throw new Error("LITELLM_MASTER_KEY chưa cấu hình");
    const url = base.endsWith("/v1") ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "soloceo-smart",
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens, temperature: 0.5,
      }),
      signal: AbortSignal.timeout(280000),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}`);
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return j.choices?.[0]?.message?.content ?? "";
  }

  /** Gom nguyên liệu THẬT từ bigdata + sandbox. Không có nguyên liệu thì không viết. */
  private async nguyenLieu() {
    const bd = this.config.get<string>("BIGDATA_URL") ?? "https://bigdata.soloceo.vn";
    const sb = this.config.get<string>("SANDBOX_URL") ?? "https://sandbox.soloceo.vn";
    const lay = async (u: string) => {
      try {
        const r = await fetch(u, { signal: AbortSignal.timeout(25000) });
        return r.ok ? await r.json() : null;
      } catch { return null; }
    };
    const [vd, gp, mh, yt, xuong] = await Promise.all([
      lay(`${bd}/api/van-de?limit=14`), lay(`${bd}/api/giai-phap?limit=14`),
      lay(`${bd}/api/mo-hinh-kd?limit=14`), lay(`${bd}/api/ideas`),
      lay(`${sb}/api/du-an`),
    ]);
    return {
      van_de: (vd as { van_de?: unknown[] })?.van_de ?? [],
      giai_phap: (gp as { giai_phap?: unknown[] })?.giai_phap ?? [],
      mo_hinh: (mh as { mo_hinh?: unknown[] })?.mo_hinh ?? [],
      y_tuong: ((yt as { ideas?: unknown[] })?.ideas ?? []).slice(0, 16),
      du_an: ((xuong as { results?: unknown[] })?.results ?? []).slice(0, 20),
    };
  }

  async sinhBaoCao(chuDe?: string) {
    const ng = await this.nguyenLieu();
    const tong = ng.van_de.length + ng.giai_phap.length + ng.mo_hinh.length;
    if (tong < 6)
      return { ok: false, ly_do: "kho dữ liệu quá mỏng để viết báo cáo có căn cứ" };

    const hom_nay = new Date().toLocaleDateString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh",
    });
    const prompt = `Bạn là trưởng nhóm nghiên cứu của SoloCEO. Viết BÁO CÁO NGÀY ${hom_nay}
cho các Solo CEO Việt Nam.${chuDe ? `\n\nCHỦ ĐỀ CHỈ ĐỊNH: ${chuDe}` : ""}

NGUYÊN LIỆU — đây là dữ liệu THẬT từ hệ thống, chỉ được dùng những gì có ở đây:
· ${ng.van_de.length} vấn đề đã đúc: ${JSON.stringify(ng.van_de).slice(0, 3800)}
· ${ng.giai_phap.length} giải pháp: ${JSON.stringify(ng.giai_phap).slice(0, 3800)}
· ${ng.mo_hinh.length} mô hình kinh doanh: ${JSON.stringify(ng.mo_hinh).slice(0, 3800)}
· ${ng.y_tuong.length} ý tưởng mới: ${JSON.stringify(ng.y_tuong).slice(0, 2600)}
· ${ng.du_an.length} dự án ở xưởng kiểm chứng: ${JSON.stringify(ng.du_an).slice(0, 2600)}

BÁO CÁO PHẢI BAO PHỦ: ý tưởng mới phát triển trong ngày · công nghệ mới đáng chú ý ·
nghiên cứu thị trường (quy mô đếm được, ai là khách hàng) · điều gì đã bị cổng kiểm chứng
đánh trượt và vì sao — phần trượt cũng là thông tin có giá trị.

QUY TẮC KHÔNG ĐƯỢC PHÁ:
1. Mọi con số phải lấy TỪ nguyên liệu trên. Không có thì viết "chưa đo được", TUYỆT ĐỐI
   không bịa. Báo cáo bịa số làm hỏng uy tín nhanh hơn là không có báo cáo.
2. Viết như người đã đọc dữ liệu, không viết như quảng cáo. Nêu cả điểm yếu.
3. Tiếng Việt tự nhiên, câu ngắn, tránh sáo rỗng kiểu "trong bối cảnh hiện nay".
4. 6-9 mục, mỗi mục 2-4 đoạn. Ít nhất 2 mục có bảng số liệu.

Trả về DUY NHẤT JSON, không kèm giải thích:
{"tieu_de":"","phu_de":"","tom_tat":"2-3 câu",
 "so_lieu_chinh":[{"nhan":"","so":"","chu_thich":""}],
 "muc":[{"tieu_de":"","dan_nhap":"","doan":[""],"gach_dau_dong":[""],
         "bang":{"tieu_de":"","cot":[""],"hang":[[""]]},"luu_y":""}],
 "ket_luan":[""],"nguon":[""]}`;

    const raw = await this.llm(prompt, 8000);
    const i = raw.indexOf("{"), j = raw.lastIndexOf("}");
    if (i < 0 || j < 0) return { ok: false, ly_do: "mô hình không trả JSON" };
    let nd: import("./bao-cao.mau").NoiDungBaoCao;
    try {
      nd = JSON.parse(raw.slice(i, j + 1)) as import("./bao-cao.mau").NoiDungBaoCao;
    } catch (e) {
      return { ok: false, ly_do: "JSON hỏng: " + String(e).slice(0, 120) };
    }
    if (!nd?.tieu_de || !Array.isArray(nd.muc) || nd.muc.length < 3)
      return { ok: false, ly_do: "nội dung quá mỏng (thiếu tiêu đề hoặc dưới 3 mục)" };

    const { anhDaiDien, dungBaoCao } = await import("./bao-cao.mau");
    const nhan = chuDe ? "BÁO CÁO CHUYÊN ĐỀ" : "BÁO CÁO NGÀY";
    const anh = anhDaiDien(nd.tieu_de, nhan, hom_nay);
    const html = dungBaoCao(nd, hom_nay, anh);

    // Slug có ngày: mỗi ngày một bản, chạy lại trong ngày thì ghi đè chứ không đẻ thêm.
    const ngaySlug = new Date().toISOString().slice(0, 10);
    const r = await this.nhap({
      title: nd.tieu_de,
      slug: `${ngaySlug}-${this.slugify(nd.tieu_de)}`.slice(0, 90),
      summary: nd.tom_tat,
      html, coverUrl: anh,
      category: chuDe ? "tong-hop" : "thi-truong",
      sources: {
        nguyen_lieu: {
          van_de: ng.van_de.length, giai_phap: ng.giai_phap.length,
          mo_hinh: ng.mo_hinh.length, y_tuong: ng.y_tuong.length, du_an: ng.du_an.length,
        },
        nguon_ghi_trong_bao_cao: nd.nguon ?? [],
      },
      publish: false,   // MẶC ĐỊNH NHÁP — xem mục dangFacebook để hiểu vì sao
    });
    return { ok: true, id: r.id, slug: r.slug, tieu_de: r.title, so_muc: nd.muc.length };
  }

  // ── Đăng lên Facebook Page ──
  //
  // Token lấy từ kho Ghi nhớ (bảng Secret, orgId "he-thong"), KHÔNG đặt trong env: token
  // Page có hạn và phải xoay được mà không cần deploy lại api-core.
  //
  // ⚠ VÌ SAO PHẢI DUYỆT TRƯỚC KHI ĐĂNG
  // Báo cáo do AI viết. Đăng thẳng lên trang Facebook chính thức nghĩa là một con số sai
  // hay một nhận định hớ hênh ra thẳng công chúng dưới tên thương hiệu, và Facebook thì
  // không cho rút lại êm — bài đã có người thấy, đã có người chia sẻ.
  //
  // Nên luồng là: sinh → NHÁP → người duyệt → xuất bản → tự đăng. Bước duyệt tốn của bạn
  // hai phút mỗi ngày; bỏ nó đi thì tiết kiệm hai phút và đánh cược uy tín thương hiệu.
  // Hàm này chỉ chấp nhận báo cáo đã PUBLISHED, và chưa từng đăng (fbPostId rỗng).
  //
  // Không có token thì trả lý do rõ ràng chứ không im lặng — một tính năng đăng bài thất
  // bại âm thầm còn tệ hơn không có.
  private async layToken(khoa: string): Promise<string | null> {
    const r = await this.prisma.secret.findUnique({
      where: { orgId_key: { orgId: "he-thong", key: khoa } },
    });
    if (!r) return null;
    try {
      const raw = decryptSecret(r.valueEnc);
      try { return (JSON.parse(raw) as { v?: string }).v ?? raw; } catch { return raw; }
    } catch { return null; }
  }

  async dangFacebook(id: string) {
    const r = await this.prisma.report.findUnique({ where: { id } });
    if (!r) throw new BadRequestException("Không có báo cáo");
    if (r.status !== "PUBLISHED") return { ok: false, ly_do: "báo cáo chưa xuất bản" };
    if (r.fbPostId) return { ok: false, ly_do: "đã đăng rồi", fbPostId: r.fbPostId };

    const token = await this.layToken("facebook/page/access-token");
    const pageId = await this.layToken("facebook/page/id");
    if (!token || !pageId)
      return {
        ok: false,
        ly_do:
          "chưa có khoá Facebook trong kho Ghi nhớ — cần thêm 'facebook/page/id' và " +
          "'facebook/page/access-token' (Page Access Token dài hạn)",
      };

    const web = this.config.get<string>("PUBLIC_WEB_URL") || "https://soloceo.vn";
    const link = `${web}/bao-cao/${r.slug}`;
    const message = [r.title, "", r.summary ?? "", "", `Đọc bản đầy đủ: ${link}`]
      .filter((x) => x !== null).join("\n").slice(0, 5000);

    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, link, access_token: token }),
        signal: AbortSignal.timeout(25000),
      });
      const j = (await res.json()) as { id?: string; error?: { message?: string } };
      if (!res.ok || !j.id) {
        // KHÔNG log token, và không log nguyên phản hồi phòng khi nó vọng lại token.
        this.log.warn(`Đăng Facebook thất bại cho '${r.slug}': ${j.error?.message ?? res.status}`);
        return { ok: false, ly_do: `Facebook từ chối: ${j.error?.message ?? res.status}` };
      }
      await this.prisma.report.update({
        where: { id },
        data: { fbPostId: j.id, fbPostedAt: new Date() },
      });
      return { ok: true, fbPostId: j.id, link };
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      this.log.warn(`Đăng Facebook lỗi mạng cho '${r.slug}': ${m.slice(0, 120)}`);
      return { ok: false, ly_do: `lỗi mạng: ${m.slice(0, 120)}` };
    }
  }
}
