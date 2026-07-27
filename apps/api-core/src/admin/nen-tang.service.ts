import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { PLATFORM_CATALOG } from "./platform-catalog.data";
import { dungBaiNenTang, anhBiaNenTang, type NoiDungNenTang } from "./nen-tang.mau";

/**
 * Bài giới thiệu nền tảng mã nguồn mở — soloceo.vn/giai-phap/nen-tang/<slug>
 *
 * Mục tiêu: mỗi nền tảng trong danh mục có một trang riêng, viết cho người Việt đang tìm
 * giải pháp, và nối ba chiều — bài giới thiệu ↔ trang bán ở platform.soloceo.vn ↔ khoá học
 * ở edu.soloceo.vn. Người tìm "phần mềm CRM mã nguồn mở" phải tới được đây.
 *
 * Nguồn dữ liệu là PLATFORM_CATALOG trong mã, KHÔNG phải mô hình tự nghĩ ra nền tảng nào.
 * Mô hình chỉ viết nội dung quanh những gì danh mục đã ghi: tên, nhóm, mô tả, URL demo,
 * có dùng AI hay không. Bịa ra một nền tảng không tồn tại thì bài SEO thành bẫy người đọc.
 *
 * Cũng như báo cáo: mô hình sinh NỘI DUNG có cấu trúc, máy chủ dựng HTML từ khuôn cố định.
 * 112 bài mà mỗi bài một kiểu thì không phải một website, mà là một đống trang rời.
 */
@Injectable()
export class NenTangService {
  private readonly log = new Logger(NenTangService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  slugify(s: string) {
    return s
      .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  }

  /** Nạp danh mục vào bảng (chưa có bài viết). Chạy lại an toàn: trùng slug thì cập nhật. */
  async dongBoDanhMuc() {
    let them = 0, capNhat = 0;
    for (const p of PLATFORM_CATALOG) {
      const slug = this.slugify(p.name);
      if (!slug) continue;
      const cu = await this.prisma.platformArticle.findUnique({ where: { slug } });
      const data = {
        name: p.name, category: p.category,
        summary: p.description?.slice(0, 600) ?? null,
        demoUrl: p.demoUrl || null,
        usesAI: !!p.usesAI,
        platformUrl: "https://platform.soloceo.vn",
        courseUrl: `https://edu.soloceo.vn/search?q=${encodeURIComponent(p.name)}`,
      };
      if (cu) {
        // KHÔNG đụng html/seo đã sinh — đồng bộ danh mục chỉ cập nhật siêu dữ liệu.
        await this.prisma.platformArticle.update({ where: { id: cu.id }, data });
        capNhat++;
      } else {
        await this.prisma.platformArticle.create({ data: { ...data, slug } as never });
        them++;
      }
    }
    const tong = await this.prisma.platformArticle.count();
    return { them, cap_nhat: capNhat, tong };
  }

  // ── Công khai ──
  danhSachCongKhai() {
    return this.prisma.platformArticle.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      // Không kéo `html`: trang mục lục chỉ cần thẻ tóm tắt.
      select: {
        slug: true, name: true, category: true, summary: true, coverUrl: true,
        demoUrl: true, usesAI: true, seoDesc: true,
      },
    });
  }

  async motBai(slug: string) {
    const r = await this.prisma.platformArticle.findUnique({ where: { slug } });
    if (!r || r.status !== "PUBLISHED") throw new BadRequestException("Không có bài này");
    return r;
  }

  // ── Quản trị ──
  danhSachAdmin(status?: string) {
    return this.prisma.platformArticle.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ status: "asc" }, { category: "asc" }, { name: "asc" }],
      select: {
        id: true, slug: true, name: true, category: true, status: true,
        publishedAt: true, coverUrl: true, usesAI: true,
      },
    });
  }

  private async llm(prompt: string, maxTokens = 6000): Promise<string> {
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
        max_tokens: maxTokens, temperature: 0.45,
      }),
      signal: AbortSignal.timeout(280000),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}`);
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return j.choices?.[0]?.message?.content ?? "";
  }

  /** Viết bài cho MỘT nền tảng. Trả về {ok, slug} hoặc {ok:false, ly_do}. */
  async sinhBai(slug: string, dangLuon = true) {
    const p = await this.prisma.platformArticle.findUnique({ where: { slug } });
    if (!p) return { ok: false, ly_do: "chưa có nền tảng này trong danh mục" };

    const prompt = `Viết bài giới thiệu nền tảng mã nguồn mở cho website SoloCEO — hệ điều
hành cho doanh nghiệp một người ở Việt Nam. Người đọc là Solo CEO đang tìm công cụ.

NỀN TẢNG (chỉ được dùng thông tin này, KHÔNG bịa thêm tính năng):
· Tên: ${p.name}
· Nhóm: ${p.category}
· Mô tả trong danh mục: ${p.summary ?? "(chưa có)"}
· Có tích hợp AI qua cổng LiteLLM của SoloCEO: ${p.usesAI ? "có" : "không"}
· Bản demo chạy thật: ${p.demoUrl ?? "chưa có"}

YÊU CẦU:
1. Viết cho người Việt đang tìm giải pháp, không viết như tài liệu kỹ thuật dịch máy.
2. Nói rõ: nó giải quyết việc gì, hợp với ai, KHÔNG hợp với ai (phần này quan trọng —
   bài chỉ khen thì người đọc không tin).
3. So sánh với phần mềm thương mại tương đương mà người Việt hay dùng, nêu cả điểm thua.
4. Có phần "Dựng trên SoloCEO" — một người cần làm gì để chạy được nó.
5. Nếu bạn KHÔNG biết chắc điều gì về nền tảng này, ĐỪNG viết ra. Thà bài ngắn còn hơn sai.
6. seo_tieu_de: dưới 60 ký tự, có tên nền tảng + từ khoá người Việt hay gõ.
7. seo_mo_ta: 150-160 ký tự, đọc như câu mời chứ không nhồi từ khoá.
8. tu_khoa: 5-8 cụm người Việt thật sự gõ khi tìm loại công cụ này.

Trả về DUY NHẤT JSON:
{"tieu_de":"","mo_ta_ngan":"2-3 câu","seo_tieu_de":"","seo_mo_ta":"","tu_khoa":[""],
 "muc":[{"tieu_de":"","doan":[""],"gach_dau_dong":[""],
         "bang":{"tieu_de":"","cot":[""],"hang":[[""]]}}],
 "hop_voi":[""],"khong_hop_voi":[""],"cau_hoi":[{"hoi":"","dap":""}]}`;

    let nd: NoiDungNenTang;
    try {
      const raw = await this.llm(prompt);
      const i = raw.indexOf("{"), j = raw.lastIndexOf("}");
      if (i < 0) return { ok: false, ly_do: "mô hình không trả JSON" };
      nd = JSON.parse(raw.slice(i, j + 1)) as NoiDungNenTang;
    } catch (e) {
      return { ok: false, ly_do: "JSON hỏng: " + String(e).slice(0, 110) };
    }
    if (!nd?.tieu_de || !Array.isArray(nd.muc) || nd.muc.length < 2)
      return { ok: false, ly_do: "nội dung quá mỏng" };

    const anh = anhBiaNenTang(p.name, p.category);
    const html = dungBaiNenTang(nd, {
      ten: p.name, nhom: p.category, demo: p.demoUrl, dungAI: p.usesAI,
      platformUrl: p.platformUrl, courseUrl: p.courseUrl,
    }, anh);

    await this.prisma.platformArticle.update({
      where: { id: p.id },
      data: {
        html, coverUrl: anh,
        summary: nd.mo_ta_ngan?.slice(0, 600) ?? p.summary,
        seoTitle: (nd.seo_tieu_de ?? `${p.name} — nền tảng mã nguồn mở | SoloCEO`).slice(0, 70),
        seoDesc: (nd.seo_mo_ta ?? nd.mo_ta_ngan ?? "").slice(0, 170),
        keywords: (nd.tu_khoa ?? []) as never,
        status: dangLuon ? "PUBLISHED" : "DRAFT",
        publishedAt: dangLuon ? new Date() : null,
      },
    });
    return { ok: true, slug: p.slug, tieu_de: nd.tieu_de, so_muc: nd.muc.length };
  }

  /** Viết theo lô: lấy N bài chưa có nội dung. 112 nền tảng thì phải chạy nhiều đợt. */
  async sinhTheoLo(n = 5) {
    const ds = await this.prisma.platformArticle.findMany({
      where: { html: "" },
      orderBy: { name: "asc" },
      take: Math.min(Math.max(n, 1), 20),
      select: { slug: true },
    });
    const kq: unknown[] = [];
    for (const d of ds) {
      try { kq.push(await this.sinhBai(d.slug)); }
      catch (e) { kq.push({ ok: false, slug: d.slug, ly_do: String(e).slice(0, 100) }); }
    }
    const conLai = await this.prisma.platformArticle.count({ where: { html: "" } });
    return { da_viet: kq.filter((x) => (x as { ok?: boolean }).ok).length, chi_tiet: kq, con_lai: conLai };
  }
}
