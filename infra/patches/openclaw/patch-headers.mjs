import { readdirSync, readFileSync, writeFileSync } from "node:fs";
const dir = "/app/dist";
let patched = 0;
for (const f of readdirSync(dir)) {
  if (!f.endsWith(".js")) continue;
  const p = `${dir}/${f}`;
  let s = readFileSync(p, "utf8");
  const before = s;
  // 1) CSP: cho phép nhúng iframe từ platform + landing
  s = s.replaceAll(
    "frame-ancestors 'none'",
    "frame-ancestors 'self' https://platform.soloceo.vn https://soloceo.vn"
  );
  // 2) bỏ header X-Frame-Options: DENY (không cho phép cross-origin cụ thể)
  s = s.replaceAll(
    "res.setHeader(\"X-Frame-Options\", \"DENY\");",
    "/* X-Frame-Options gỡ bỏ: dùng CSP frame-ancestors */"
  );
  if (s !== before) { writeFileSync(p, s); patched++; console.log("patched", f); }
}
console.log("files patched:", patched);
if (patched === 0) { console.error("KHÔNG patch được file nào!"); process.exit(1); }
