// Tự phê duyệt device pairing (SoloCEO per-tenant): pairing request CHỈ được
// gateway tạo sau khi client vượt qua kiểm tra token → token là biên bảo mật;
// bước approve thủ công không hợp SaaS (CEO không có SSH).
import { execFileSync } from "node:child_process";

let out;
try {
  out = execFileSync("node", ["openclaw.mjs", "devices", "list", "--json"], {
    cwd: "/app",
    encoding: "utf8",
    timeout: 15_000,
  });
} catch {
  process.exit(0); // gateway chưa sẵn sàng — thử lại vòng sau
}
let data;
try {
  const jsonStart = out.indexOf("{");
  data = JSON.parse(out.slice(jsonStart));
} catch {
  process.exit(0);
}
for (const req of data.pending ?? []) {
  const id = req.requestId ?? req.id;
  if (!id) continue;
  try {
    execFileSync("node", ["openclaw.mjs", "devices", "approve", id], {
      cwd: "/app",
      encoding: "utf8",
      timeout: 15_000,
    });
    console.log("[soloceo] auto-approved device request", id);
  } catch {}
}
