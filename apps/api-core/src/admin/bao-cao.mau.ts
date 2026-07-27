/**
 * Khuôn dựng báo cáo HTML + ảnh đại diện SVG.
 *
 * Vì sao KHÔNG để mô hình tự viết cả tài liệu HTML: một báo cáo nghiêm túc dài 60-100
 * nghìn ký tự. Sinh ngần ấy HTML trong một lượt thì hỏng thẻ, lệch bố cục, và mỗi bản một
 * kiểu — thử nghiệm cho thấy tỉ lệ hỏng cao và không sửa được bằng prompt. Ở đây mô hình
 * chỉ sinh NỘI DUNG có cấu trúc (JSON), còn máy chủ dựng HTML từ khuôn cố định. Đổi lại:
 * mọi báo cáo trông như nhau, không bao giờ vỡ, và sửa giao diện một chỗ là đổi tất cả.
 *
 * Ảnh đại diện cũng dựng bằng SVG nhúng thẳng (data: URI) thay vì gọi dịch vụ sinh ảnh:
 * không phụ thuộc mạng, không tốn tiền, không có ngày dịch vụ đó chết làm hỏng cả trang.
 */

export type MucBaoCao = {
  tieu_de: string;
  dan_nhap?: string;
  doan?: string[];
  gach_dau_dong?: string[];
  bang?: { tieu_de?: string; cot: string[]; hang: string[][] };
  luu_y?: string;
};

export type NoiDungBaoCao = {
  tieu_de: string;
  phu_de?: string;
  tom_tat: string;
  so_lieu_chinh?: { nhan: string; so: string; chu_thich?: string }[];
  muc: MucBaoCao[];
  ket_luan?: string[];
  nguon?: string[];
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Ảnh đại diện: SVG theo bộ nhận diện SoloCEO (nền đen · xanh #3fb950 · vàng #e3b341). */
export function anhDaiDien(tieuDe: string, nhan: string, ngay: string): string {
  // Vân nền sinh từ chính tiêu đề nên mỗi báo cáo có hình khác nhau nhưng vẫn cùng phong
  // cách — không cần lưu ảnh, không cần gọi dịch vụ ngoài.
  let h = 0;
  for (let i = 0; i < tieuDe.length; i++) h = (h * 31 + tieuDe.charCodeAt(i)) >>> 0;
  const cot = Array.from({ length: 26 }, (_, i) => {
    const v = ((h >>> (i % 24)) ^ (i * 2654435761)) >>> 0;
    return 18 + (v % 150);
  });
  const chu = tieuDe.length > 58 ? tieuDe.slice(0, 56) + "…" : tieuDe;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#0b0b0c"/><stop offset="1" stop-color="#14161a"/></linearGradient></defs>
<rect width="1200" height="630" fill="url(#g)"/>
<g opacity="0.5">${cot.map((c, i) =>
    `<rect x="${40 + i * 44}" y="${470 - c}" width="22" height="${c}" rx="3" fill="${
      i % 5 === 0 ? "#e3b341" : "#3fb950"}" opacity="${0.16 + (i % 7) * 0.045}"/>`).join("")}</g>
<rect x="0" y="0" width="1200" height="6" fill="#3fb950"/>
<text x="64" y="120" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="19"
  letter-spacing="4" fill="#e3b341">${esc(nhan.toUpperCase())}</text>
<text x="64" y="228" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="${
    chu.length > 40 ? 52 : 62}" font-weight="700" fill="#f5f5f6">${esc(chu.slice(0, 34))}</text>
<text x="64" y="${chu.length > 34 ? 300 : 300}" font-family="system-ui,-apple-system,Segoe UI,sans-serif"
  font-size="${chu.length > 40 ? 52 : 62}" font-weight="700" fill="#f5f5f6">${esc(chu.slice(34))}</text>
<text x="64" y="556" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="21"
  fill="#8b8b92">soloceo.vn · Đội AI · ${esc(ngay)}</text>
</svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg, "utf8").toString("base64");
}

function veMuc(m: MucBaoCao, i: number): string {
  const p: string[] = [`<section class="muc"><h2><span class="so">${String(i + 1).padStart(2, "0")}</span>${esc(m.tieu_de)}</h2>`];
  if (m.dan_nhap) p.push(`<p class="dan">${esc(m.dan_nhap)}</p>`);
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
  if (m.luu_y) p.push(`<aside class="luuy">${esc(m.luu_y)}</aside>`);
  return p.join("") + "</section>";
}

export function dungBaoCao(nd: NoiDungBaoCao, ngay: string, anh: string): string {
  const mucLuc = nd.muc.map((m, i) =>
    `<li><a href="#m${i}">${String(i + 1).padStart(2, "0")} · ${esc(m.tieu_de)}</a></li>`).join("");
  const than = nd.muc.map((m, i) => veMuc(m, i).replace('<section class="muc">', `<section class="muc" id="m${i}">`)).join("");
  return `<article class="bc">
<style>
/* Tự chứa hoàn toàn: báo cáo phải đọc được cả khi tải rời khỏi trang web. */
.bc{--nen:#0b0b0c;--chu:#e6e6e6;--mo:#a2a2aa;--nhat:#6b6b73;--vien:#232326;--the:#131315;
    --xanh:#3fb950;--vang:#e3b341;color:var(--chu);line-height:1.75;font-size:16.5px;
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;max-width:820px;margin:0 auto;padding:0 20px 90px}
.bc h1{font-size:clamp(30px,5vw,46px);line-height:1.14;letter-spacing:-.02em;margin:26px 0 12px;color:#f5f5f6;font-weight:700}
.bc .phu{font-size:18px;color:var(--mo);margin:0 0 22px}
.bc .meta{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--nhat);
    letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid var(--vien);padding-bottom:16px;margin-bottom:26px}
.bc .bia{width:100%;border-radius:16px;border:1px solid var(--vien);display:block;margin:0 0 28px}
.bc .tomtat{background:var(--the);border:1px solid var(--vien);border-left:3px solid var(--xanh);
    border-radius:12px;padding:18px 20px;margin:0 0 30px;font-size:17px}
.bc .solieu{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0 0 34px}
.bc .solieu div{background:var(--the);border:1px solid var(--vien);border-radius:12px;padding:14px}
.bc .solieu b{display:block;font-size:25px;color:#f5f5f6;letter-spacing:-.01em}
.bc .solieu span{font-size:12.5px;color:var(--mo)}
.bc .solieu i{display:block;font-size:11px;color:var(--nhat);font-style:normal;margin-top:3px}
.bc nav.ml{background:var(--the);border:1px solid var(--vien);border-radius:12px;padding:16px 20px;margin:0 0 36px}
.bc nav.ml b{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.14em;color:var(--nhat);text-transform:uppercase}
.bc nav.ml ol{margin:10px 0 0;padding-left:0;list-style:none;columns:2;column-gap:26px}
.bc nav.ml li{margin:5px 0;font-size:13.5px;break-inside:avoid}
.bc nav.ml a{color:var(--mo);text-decoration:none}
.bc nav.ml a:hover{color:var(--xanh)}
.bc .muc{margin:0 0 42px;scroll-margin-top:80px}
.bc h2{font-size:23px;line-height:1.3;margin:0 0 14px;color:#f5f5f6;font-weight:650;display:flex;gap:12px;align-items:baseline}
.bc h2 .so{font-family:ui-monospace,monospace;font-size:13px;color:var(--vang);flex:none}
.bc p{margin:0 0 14px}
.bc .dan{color:var(--mo);font-size:17px}
.bc ul{margin:0 0 16px;padding-left:20px}
.bc li{margin:6px 0}
.bc figure.bang{margin:20px 0;overflow-x:auto;border:1px solid var(--vien);border-radius:12px;background:var(--the)}
.bc figcaption{padding:12px 16px;font-size:13px;color:var(--mo);border-bottom:1px solid var(--vien)}
.bc table{width:100%;border-collapse:collapse;font-size:14px}
.bc th{text-align:left;padding:11px 16px;color:var(--nhat);font-weight:600;font-size:12px;
    text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--vien)}
.bc td{padding:11px 16px;border-bottom:1px solid #1c1c1f;vertical-align:top}
.bc tr:last-child td{border-bottom:none}
.bc .luuy{background:#1a160c;border:1px solid #3a3116;border-left:3px solid var(--vang);
    border-radius:10px;padding:13px 16px;margin:16px 0;font-size:14.5px;color:#e8d9a8}
.bc .ketluan{background:#0f2413;border:1px solid #1e4a29;border-radius:14px;padding:22px 24px;margin:34px 0 0}
.bc .ketluan b{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.14em;color:var(--xanh);text-transform:uppercase}
.bc .ketluan ol{margin:12px 0 0;padding-left:20px}
.bc .nguon{margin-top:34px;padding-top:18px;border-top:1px solid var(--vien);font-size:12.5px;color:var(--nhat)}
.bc .nguon ul{padding-left:18px;margin:8px 0 0}
@media(max-width:640px){.bc nav.ml ol{columns:1}.bc{font-size:16px}}
</style>
<img class="bia" src="${anh}" alt="${esc(nd.tieu_de)}" loading="lazy">
<div class="meta">Báo cáo · Đội AI SoloCEO · ${esc(ngay)}</div>
<h1>${esc(nd.tieu_de)}</h1>
${nd.phu_de ? `<p class="phu">${esc(nd.phu_de)}</p>` : ""}
<div class="tomtat">${esc(nd.tom_tat)}</div>
${nd.so_lieu_chinh?.length ? `<div class="solieu">${nd.so_lieu_chinh.map((s) =>
    `<div><b>${esc(s.so)}</b><span>${esc(s.nhan)}</span>${s.chu_thich ? `<i>${esc(s.chu_thich)}</i>` : ""}</div>`).join("")}</div>` : ""}
<nav class="ml"><b>Nội dung</b><ol>${mucLuc}</ol></nav>
${than}
${nd.ket_luan?.length ? `<div class="ketluan"><b>Chốt lại</b><ol>${nd.ket_luan.map((k) => `<li>${esc(k)}</li>`).join("")}</ol></div>` : ""}
${nd.nguon?.length ? `<div class="nguon">Nguồn dữ liệu<ul>${nd.nguon.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>` : ""}
</article>`;
}
