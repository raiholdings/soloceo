// Trang Tin tức nội bộ /tin-tuc — lấy tin do CHÍNH nền tảng tạo (api-core /v1/news,
// bài SEO do Đội AI biên tập). Server-rendered để tốt cho SEO. Brand SoloCEO.
import { SiteHeader } from "@/components/landing/soloceo-nav";
import type { ReactNode } from "react";

const API = "https://api.soloceo.vn/v1/news";
const WORKSPACE = "/workspace";

type NewsItem = {
  id: string; title: string; slug: string; excerpt: string;
  coverUrl: string | null; category: string; authorName: string; publishedAt: string;
};
type NewsFull = NewsItem & { body: string };

const CAT_LABEL: Record<string, string> = {
  "san-pham": "Sản phẩm", "thong-bao": "Thông báo", "huong-dan": "Hướng dẫn",
  "cong-dong": "Cộng đồng", "thi-truong": "Thị trường",
};
function catLabel(c: string) { return CAT_LABEL[c] ?? "Tin tức"; }

function fmt(d: string) {
  if (!d) return "";
  const t = new Date(d);
  if (isNaN(t.getTime())) return "";
  return `${String(t.getDate()).padStart(2, "0")}/${String(t.getMonth() + 1).padStart(2, "0")}/${t.getFullYear()}`;
}

async function getList(): Promise<NewsItem[]> {
  try {
    const r = await fetch(API, { next: { revalidate: 300 } });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}
async function getOne(slug: string): Promise<NewsFull | null> {
  try {
    const r = await fetch(`${API}/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

/* ---------- LISTING ---------- */
export async function NewsIndex() {
  const items = await getList();
  const [hero, ...rest] = items;
  return (
    <div className="min-h-screen w-full bg-[#0b0b0c] font-sans text-[#f5f5f6] [font-family:-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-[6vw]">
        <section className="py-14 md:py-16">
          <div className="mb-4 inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[.2em] text-[#e3b341] uppercase"><span className="h-px w-5 bg-[#e3b341]" /> Tin tức</div>
          <h1 className="max-w-3xl text-[clamp(30px,5vw,54px)] leading-[1.05] font-extrabold tracking-[-.025em]">Tin tức & góc nhìn <span className="text-[#e3b341]">cho Solo CEO.</span></h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-[#a2a2aa]">Kiến thức vận hành doanh nghiệp một người, hướng dẫn công cụ và cập nhật nền tảng — biên tập bởi Đội AI SoloCEO.</p>
        </section>

        {items.length === 0 && (
          <section className="mb-20 rounded-3xl border border-[#232326] bg-[#131315] px-6 py-16 text-center">
            <div className="text-4xl">📰</div>
            <h2 className="mt-4 text-[20px] font-bold">Chưa có bài viết</h2>
            <p className="mx-auto mt-2 max-w-md text-[14px] text-[#a2a2aa]">Tin tức sẽ xuất hiện tại đây ngay khi được đăng.</p>
          </section>
        )}

        {hero && (
          <a href={`/tin-tuc/${hero.slug}`} className="group mb-4 grid gap-5 overflow-hidden rounded-3xl border border-[#232326] bg-[#131315] p-4 transition hover:border-[#33333a] md:grid-cols-2 md:p-5">
            <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-[#1a1a1d]">
              {hero.coverUrl && hero.coverUrl !== "None"
                ? <img src={hero.coverUrl} alt={hero.title} className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
                : <div className="flex h-full items-center justify-center text-4xl opacity-30">📰</div>}
            </div>
            <div className="flex flex-col justify-center md:pr-4">
              <div className="flex items-center gap-2 font-mono text-[11px] tracking-wide text-[#e3b341]"><span className="rounded bg-[#e3b341]/12 px-1.5 py-0.5">{catLabel(hero.category)}</span><span className="text-[#6b6b73]">{fmt(hero.publishedAt)}</span></div>
              <h2 className="mt-3 text-[clamp(20px,2.6vw,28px)] font-extrabold leading-snug tracking-[-.02em]">{hero.title}</h2>
              <p className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-[#a2a2aa]">{hero.excerpt}</p>
              <div className="mt-4 text-[13px] font-semibold text-[#e3b341]">Đọc bài →</div>
            </div>
          </a>
        )}

        <section className="grid gap-3 pb-16 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((n) => (
            <a key={n.id} href={`/tin-tuc/${n.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-[#232326] bg-[#131315] transition hover:border-[#33333a]">
              <div className="aspect-[16/9] overflow-hidden bg-[#1a1a1d]">
                {n.coverUrl && n.coverUrl !== "None"
                  ? <img src={n.coverUrl} alt={n.title} className="h-full w-full object-cover transition group-hover:scale-[1.03]" loading="lazy" />
                  : <div className="flex h-full items-center justify-center text-3xl opacity-30">📰</div>}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-wide text-[#e3b341]"><span>{catLabel(n.category)}</span><span className="text-[#6b6b73]">· {fmt(n.publishedAt)}</span></div>
                <h3 className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-snug">{n.title}</h3>
                <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-[#a2a2aa]">{n.excerpt}</p>
                <div className="mt-auto pt-3 text-[12px] font-semibold text-[#e3b341] opacity-0 transition group-hover:opacity-100">Đọc bài →</div>
              </div>
            </a>
          ))}
        </section>
      </main>
      <Foot />
    </div>
  );
}

/* ---------- ARTICLE ---------- */
export async function NewsArticle({ slug }: { slug: string }) {
  const a = await getOne(slug);
  if (!a) return await NewsIndex();
  const more = (await getList()).filter((n) => n.slug !== a.slug).slice(0, 3);
  return (
    <div className="min-h-screen w-full bg-[#0b0b0c] font-sans text-[#f5f5f6] [font-family:-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-[6vw]">
        <article className="py-14">
          <a href="/tin-tuc" className="mb-6 inline-flex items-center gap-1 font-mono text-[11px] tracking-[.14em] text-[#a2a2aa] uppercase hover:text-[#f5f5f6]">← Tin tức</a>
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-wide text-[#e3b341]"><span className="rounded bg-[#e3b341]/12 px-1.5 py-0.5">{catLabel(a.category)}</span><span className="text-[#6b6b73]">{fmt(a.publishedAt)} · {a.authorName}</span></div>
          <h1 className="mt-3 text-[clamp(26px,4.4vw,44px)] leading-[1.1] font-extrabold tracking-[-.02em]">{a.title}</h1>
          {a.excerpt && <p className="mt-4 text-[17px] leading-relaxed text-[#a2a2aa]">{a.excerpt}</p>}
          {a.coverUrl && a.coverUrl !== "None" && (
            <img src={a.coverUrl} alt={a.title} className="mt-6 w-full rounded-2xl border border-[#232326] object-cover" />
          )}
          <div className="mt-8 space-y-1">{renderMarkdown(a.body)}</div>
        </article>

        {more.length > 0 && (
          <section className="border-t border-[#1a1a1d] py-12">
            <div className="mb-5 font-mono text-[11px] font-semibold tracking-[.2em] text-[#e3b341] uppercase">Bài viết khác</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {more.map((n) => (
                <a key={n.id} href={`/tin-tuc/${n.slug}`} className="group rounded-2xl border border-[#232326] bg-[#131315] p-4 transition hover:border-[#33333a]">
                  <div className="font-mono text-[10.5px] text-[#e3b341]">{catLabel(n.category)}</div>
                  <h3 className="mt-1.5 line-clamp-3 text-[14px] font-bold leading-snug">{n.title}</h3>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="mb-14 rounded-3xl border border-[#232326] bg-gradient-to-b from-[#131315] to-[#0b0b0c] px-6 py-12 text-center">
          <h2 className="text-[24px] font-extrabold tracking-[-.02em]">Vận hành doanh nghiệp bằng AI</h2>
          <a href={WORKSPACE} className="mt-5 inline-block rounded-xl bg-[#f5f5f6] px-6 py-3 text-[14px] font-bold text-[#0b0b0c] transition hover:opacity-90">Vào Workspace →</a>
        </section>
      </main>
      <Foot />
    </div>
  );
}

/* ---------- Markdown tối giản (heading/bullet/bold/paragraph) ---------- */
function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => (p.startsWith("**") && p.endsWith("**"))
    ? <strong key={i} className="font-bold text-[#f5f5f6]">{p.slice(2, -2)}</strong>
    : <span key={i}>{p}</span>);
}
function renderMarkdown(md: string): ReactNode[] {
  const lines = (md || "").replace(/\r/g, "").split("\n");
  const out: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      out.push(<ul key={"ul" + out.length} className="my-3 space-y-1.5 pl-1">{list.map((it, i) => <li key={i} className="flex gap-2 text-[15.5px] leading-relaxed text-[#d4d4d8]"><span className="mt-0.5 text-[#3fb950]">•</span><span>{inline(it)}</span></li>)}</ul>);
      list = [];
    }
  };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (/^###\s+/.test(l)) { flush(); out.push(<h3 key={out.length} className="mt-6 mb-1.5 text-[18px] font-bold">{inline(l.replace(/^###\s+/, ""))}</h3>); }
    else if (/^##\s+/.test(l)) { flush(); out.push(<h2 key={out.length} className="mt-8 mb-2 text-[22px] font-extrabold tracking-[-.01em]">{inline(l.replace(/^##\s+/, ""))}</h2>); }
    else if (/^#\s+/.test(l)) { flush(); out.push(<h2 key={out.length} className="mt-8 mb-2 text-[24px] font-extrabold tracking-[-.01em]">{inline(l.replace(/^#\s+/, ""))}</h2>); }
    else if (/^[-*]\s+/.test(l)) { list.push(l.replace(/^[-*]\s+/, "")); }
    else if (l.trim() === "") { flush(); }
    else { flush(); out.push(<p key={out.length} className="my-3 text-[15.5px] leading-[1.75] text-[#d4d4d8]">{inline(l)}</p>); }
  }
  flush();
  return out;
}

function Foot() {
  return (
    <footer className="border-t border-[#1a1a1d] px-[6vw] py-8 text-center">
      <p className="font-mono text-[11px] tracking-wide text-[#6b6b73]">© SoloCEO — Hệ điều hành cho doanh nghiệp một người · 2026</p>
    </footer>
  );
}
