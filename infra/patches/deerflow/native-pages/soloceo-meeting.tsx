"use client";
// "Họp video" — Zoom của SoloCEO (LiveSmart SFU tại meeting.soloceo.vn).
// SSO-lite: người đã đăng nhập workspace (đồng bộ với WoWonder/BetterAuth) mở
// phòng với TÊN TỰ ĐIỀN qua ?p=base64({agentName|visitorName}) — không gõ lại tên.
import { Copy, Link2, Loader2, LogIn, Video, VideoIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";
import { getSoloceoAuth } from "@/components/workspace/soloceo-api";

const MEETING_BASE = "https://meeting.soloceo.vn";

function randomRoom() {
  const c = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

/** URL phòng kèm tên người dùng (host=agentName+admin, khách=visitorName). */
function meetingUrl(room: string, name: string, asHost: boolean) {
  const p = asHost ? { agentName: name, admin: 1 } : { visitorName: name };
  const enc = btoa(unescape(encodeURIComponent(JSON.stringify(p))));
  return `${MEETING_BASE}/${encodeURIComponent(room)}?p=${enc}`;
}

export function SoloceoMeeting() {
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [created, setCreated] = useState<{ room: string; hostUrl: string; guestUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSoloceoAuth()
      .then((a) => {
        const email = a.email ?? "";
        setName(email ? email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "Chủ phòng");
      })
      .catch(() => setName("Chủ phòng"))
      .finally(() => setReady(true));
  }, []);

  function taoPhong() {
    const room = randomRoom();
    const hostUrl = meetingUrl(room, name || "Chủ phòng", true);
    const guestUrl = `${MEETING_BASE}/${room}`; // khách tự nhập tên khi vào
    setCreated({ room, hostUrl, guestUrl });
    window.open(hostUrl, "_blank", "noopener");
  }

  function vaoPhong() {
    const code = joinCode.trim().replace(/^.*\//, "").split("?")[0]; // chấp cả link dán vào
    if (!code) return;
    window.open(meetingUrl(code, name || "Khách", false), "_blank", "noopener");
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        <div className="mx-auto w-full max-w-2xl px-4 py-8">
          <div className="mb-6 flex items-center gap-3">
            <VideoIcon className="h-6 w-6 text-emerald-600" />
            <div>
              <h1 className="text-xl font-semibold">Họp video</h1>
              <p className="text-muted-foreground text-sm">Phòng họp trực tuyến của SoloCEO — video, chia sẻ màn hình, chat, ghi hình. Không cần cài phần mềm.</p>
            </div>
          </div>

          {!ready ? (
            <div className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải…</div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border bg-card p-4">
                <label className="text-sm font-medium">Tên hiển thị của bạn trong phòng</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                <p className="text-muted-foreground mt-1 text-xs">Tự điền từ tài khoản đăng nhập — bạn có thể sửa.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <button onClick={taoPhong}
                  className="flex flex-col items-start gap-2 rounded-xl border bg-card p-5 text-left transition hover:border-emerald-400 hover:shadow-md">
                  <Video className="h-7 w-7 text-emerald-600" />
                  <span className="font-semibold">Tạo phòng họp mới</span>
                  <span className="text-muted-foreground text-sm">Mở phòng ngay với bạn là chủ phòng, rồi mời người khác bằng link.</span>
                </button>

                <div className="flex flex-col gap-2 rounded-xl border bg-card p-5">
                  <LogIn className="h-7 w-7 text-emerald-600" />
                  <span className="font-semibold">Vào phòng có sẵn</span>
                  <div className="flex gap-2">
                    <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Mã phòng hoặc link"
                      onKeyDown={(e) => e.key === "Enter" && vaoPhong()}
                      className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                    <button onClick={vaoPhong} disabled={!joinCode.trim()}
                      className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">Vào</button>
                  </div>
                </div>
              </div>

              {created && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium"><Link2 className="h-4 w-4 text-emerald-600" /> Phòng <b>{created.room}</b> đã mở ở tab mới. Gửi link này để mời:</p>
                  <div className="flex items-center gap-2">
                    <input readOnly value={created.guestUrl}
                      className="min-w-0 flex-1 rounded-md border bg-white/70 px-3 py-2 text-sm dark:bg-black/30" />
                    <button onClick={() => copy(created.guestUrl)}
                      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                      <Copy className="h-3.5 w-3.5" /> {copied ? "Đã chép" : "Chép"}
                    </button>
                  </div>
                </div>
              )}

              <p className="text-muted-foreground text-xs">
                Máy chủ họp: <b>meeting.soloceo.vn</b> (LiveSmart SFU, mã hoá WebRTC). Người được mời chỉ cần mở link — không cần tài khoản.
              </p>
            </div>
          )}
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
