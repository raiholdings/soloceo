/**
 * Khuôn dựng bài giới thiệu nền tảng + ảnh bìa SVG.
 *
 * Cùng lý do với khuôn báo cáo (bao-cao.mau.ts): mô hình sinh nội dung có cấu trúc, máy
 * chủ dựng HTML. Ở đây lý do còn mạnh hơn — có 112 bài. Mỗi bài một kiểu thì không phải
 * một website mà là một đống trang rời, và sửa giao diện phải sửa 112 lần.
 *
 * Cấu trúc thẻ viết theo hướng SEO: h1 duy nhất ở trang Next (không đặt ở đây để tránh hai
 * h1), các mục dùng h2, câu hỏi thường gặp dùng cặp dt/dd trong <dl> để công cụ tìm kiếm
 * nhận ra là FAQ mà không cần đánh dấu thêm.
 */

export type MucNenTang = {
  tieu_de: string;
  doan?: string[];
  gach_dau_dong?: string[];
  bang?: { tieu_de?: string; cot: string[]; hang: string[][] };
};

export type NoiDungNenTang = {
  tieu_de: string;
  mo_ta_ngan?: string;
  seo_tieu_de?: string;
  seo_mo_ta?: string;
  tu_khoa?: string[];
  muc: MucNenTang[];
  hop_voi?: string[];
  khong_hop_voi?: string[];
  cau_hoi?: { hoi: string; dap: string }[];
};

export type ThongTinNenTang = {
  ten: string;
  nhom: string;
  demo?: string | null;
  dungAI?: boolean;
  platformUrl?: string | null;
  courseUrl?: string | null;
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Ảnh bìa: chữ cái đầu trên nền vân sinh từ tên — mỗi nền tảng một hình, cùng phong cách. */
export function anhBiaNenTang(ten: string, nhom: string): string {
  let h = 0;
  for (let i = 0; i < ten.length; i++) h = (h * 33 + ten.charCodeAt(i)) >>> 0;
  const chuCai = (ten.trim()[0] ?? "?").toUpperCase();
  const o = Array.from({ length: 30 }, (_, i) => ((h >>> (i % 26)) ^ (i * 40503)) >>> 0);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
<rect width="1200" height="630" fill="#0b0b0c"/>
<g opacity="0.32">${o.map((v, i) =>
    `<circle cx="${(v % 1200)}" cy="${(v >>> 7) % 630}" r="${8 + (v % 46)}" fill="${
      i % 4 === 0 ? "#e3b341" : "#3fb950"}" opacity="${0.06 + (i % 6) * 0.035}"/>`).join("")}</g>
<rect x="0" y="0" width="1200" height="6" fill="#3fb950"/>
<circle cx="180" cy="315" r="108" fill="none" stroke="#3fb950" stroke-width="3" opacity="0.55"/>
<text x="180" y="358" text-anchor="middle" font-family="system-ui,sans-serif" font-size="104"
  font-weight="700" fill="#3fb950">${esc(chuCai)}</text>
<text x="336" y="272" font-family="ui-monospace,Menlo,monospace" font-size="19" letter-spacing="4"
  fill="#e3b341">${esc(nhom.toUpperCase())}</text>
<text x="336" y="356" font-family="system-ui,sans-serif" font-size="${
    ten.length > 18 ? 54 : 68}" font-weight="700" fill="#f5f5f6">${esc(ten.slice(0, 26))}</text>
<text x="336" y="410" font-family="system-ui,sans-serif" font-size="23" fill="#8b8b92">
Nền tảng mã nguồn mở · triển khai trên SoloCEO</text>
<text x="336" y="556" font-family="ui-monospace,Menlo,monospace" font-size="19" fill="#6b6b73">soloceo.vn/giai-phap/nen-tang</text>
</svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg, "utf8").toString("base64");
}

function veMuc(m: MucNenTang, i: number): string {
  const p: string[] = [`<section class="muc" id="m${i}"><h2>${esc(m.tieu_de)}</h2>`];
  (m.doan ?? []).forEach((d) => p.push(`<p>${esc(d)}</p>`));
  if (m.gach_dau_dong?.length)
    p.push(`<ul>${m.gach_dau_dong.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`);
  if (m.bang?.cot?.length) {
    p.push(
      `<figure class="bang">${m.bang.tieu_de ? `<figcaption>${esc(m.bang.tieu_de)}</figcaption>` : ""}` +
      `<table><thead><tr>${m.bang.cot.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>` +
      (m.bang.hang ?? []).map((h) => `<tr>${h.map((o) => `<td>${esc(o)}</td>`).join("")}</tr>`).join("") +
      `</tbody></table></figure>`);
  }
  return p.join("") + "</section>";
}

export function dungBaiNenTang(nd: NoiDungNenTang, tt: ThongTinNenTang, anh: string): string {
  const lien = [
    tt.demo ? `<a class="nut" href="${esc(tt.demo)}" target="_blank" rel="noopener">Dùng thử bản demo ↗</a>` : "",
    tt.platformUrl ? `<a class="nut phu" href="${esc(tt.platformUrl)}" target="_blank" rel="noopener">Triển khai cho doanh nghiệp ↗</a>` : "",
    tt.courseUrl ? `<a class="nut phu" href="${esc(tt.courseUrl)}" target="_blank" rel="noopener">Học cách dùng ↗</a>` : "",
  ].filter(Boolean).join("");

  return `<article class="nt">
<style>
.nt{--nen:#0b0b0c;--chu:#e6e6e6;--mo:#a2a2aa;--nhat:#6b6b73;--vien:#232326;--the:#131315;
    --xanh:#3fb950;--vang:#e3b341;color:var(--chu);line-height:1.75;font-size:16.5px;
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;max-width:800px;margin:0 auto;padding:0 20px 80px}
.nt img.bia{width:100%;border-radius:16px;border:1px solid var(--vien);display:block;margin:0 0 26px}
.nt .tomtat{background:var(--the);border:1px solid var(--vien);border-left:3px solid var(--xanh);
    border-radius:12px;padding:17px 20px;margin:0 0 24px;font-size:17px}
.nt .nut{display:inline-block;margin:0 8px 8px 0;padding:10px 17px;border-radius:11px;
    background:#f5f5f6;color:#0b0b0c;font-size:14px;font-weight:600;text-decoration:none}
.nt .nut.phu{background:transparent;color:var(--chu);border:1px solid var(--vien)}
.nt .nut:hover{opacity:.88}
.nt .lien{margin:0 0 34px}
.nt h2{font-size:22px;line-height:1.32;margin:34px 0 12px;color:#f5f5f6;font-weight:650}
.nt h3{font-size:17px;margin:22px 0 8px;color:#f5f5f6}
.nt p{margin:0 0 13px}
.nt ul{margin:0 0 15px;padding-left:20px}
.nt li{margin:5px 0}
.nt figure.bang{margin:18px 0;overflow-x:auto;border:1px solid var(--vien);border-radius:12px;background:var(--the)}
.nt figcaption{padding:11px 15px;font-size:13px;color:var(--mo);border-bottom:1px solid var(--vien)}
.nt table{width:100%;border-collapse:collapse;font-size:14px}
.nt th{text-align:left;padding:10px 15px;color:var(--nhat);font-weight:600;font-size:12px;
    text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--vien)}
.nt td{padding:10px 15px;border-bottom:1px solid #1c1c1f;vertical-align:top}
.nt tr:last-child td{border-bottom:none}
.nt .doi{display:grid;gap:12px;grid-template-columns:1fr 1fr;margin:22px 0}
.nt .doi>div{border:1px solid var(--vien);border-radius:13px;padding:15px 17px;background:var(--the)}
.nt .doi b{display:block;font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px}
.nt .hop b{color:var(--xanh)} .nt .khong b{color:#e06c5a}
.nt .doi ul{padding-left:18px;margin:0}
.nt dl{margin:16px 0 0}
.nt dt{font-weight:600;color:#f5f5f6;margin:16px 0 5px}
.nt dd{margin:0;color:var(--mo)}
@media(max-width:640px){.nt .doi{grid-template-columns:1fr}}
</style>
<img class="bia" src="${anh}" alt="${esc(tt.ten)} — nền tảng mã nguồn mở" loading="lazy">
${nd.mo_ta_ngan ? `<div class="tomtat">${esc(nd.mo_ta_ngan)}</div>` : ""}
<div class="lien">${lien}</div>
${nd.muc.map(veMuc).join("")}
${(nd.hop_voi?.length || nd.khong_hop_voi?.length) ? `<div class="doi">
  <div class="hop"><b>Hợp với</b><ul>${(nd.hop_voi ?? []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
  <div class="khong"><b>Không hợp với</b><ul>${(nd.khong_hop_voi ?? []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
</div>` : ""}
${nd.cau_hoi?.length ? `<section class="muc"><h2>Câu hỏi thường gặp</h2><dl>${
    nd.cau_hoi.map((c) => `<dt>${esc(c.hoi)}</dt><dd>${esc(c.dap)}</dd>`).join("")}</dl></section>` : ""}
</article>`;
}
