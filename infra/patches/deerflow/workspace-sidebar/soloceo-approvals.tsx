"use client";

import { AlertTriangle, Check, Loader2, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  WorkspaceBody,
  WorkspaceContainer,
  WorkspaceHeader,
} from "@/components/workspace/workspace-container";

/**
 * Hàng đợi PHÊ DUYỆT (HITL tầng 2) — nơi CEO thực thi quyền cao nhất trong org
 * của mình. Agent chỉ ĐỀ XUẤT; mọi hành động tiền/pháp lý/không-đảo-ngược dừng
 * ở đây chờ CEO chốt. Duyệt xong api-core resume lại thread DeerFlow.
 *
 * Trang NATIVE (không iframe): đọc token từ cookie `soloceo_token` đặt ở
 * Domain=.soloceo.vn nên dùng chung phiên với app.soloceo.vn. CORS của api-core
 * đã cho phép origin https://soloceo.vn.
 */

const API = "https://api.soloceo.vn/v1";

const ACTION_LABEL: Record<string, string> = {
  spend_money: "Chi tiền",
  send_bulk_email: "Gửi email/SMS hàng loạt",
  submit_application: "Nộp hồ sơ chính thức",
  sign_document: "Ký tài liệu",
  publish_public: "Đăng công khai",
  delete_data: "Xoá dữ liệu",
  deploy_infra: "Cấp phát hạ tầng",
  transfer_ownership: "Chuyển sở hữu doanh nghiệp",
  export_pii: "Xuất dữ liệu cá nhân",
};

interface Approval {
  id: string;
  actionType: string;
  tier: number;
  payloadJson: Record<string, unknown> | null;
  createdAt: string;
  threadId: string | null;
}

function readToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )soloceo_token=([^;]*)/);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

function summarize(p: Record<string, unknown> | null): string {
  if (!p) return "—";
  if (typeof p.amount === "number") {
    return `${new Intl.NumberFormat("vi-VN").format(p.amount)} đ`;
  }
  if (typeof p.count === "number") return `${p.count} bản ghi`;
  const s = JSON.stringify(p);
  return s.length > 90 ? `${s.slice(0, 90)}…` : s;
}

export function SoloceoApprovals() {
  const [token] = useState<string | null>(() => readToken());
  const [items, setItems] = useState<Approval[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const r = await fetch(`${API}/approvals/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`API trả ${r.status}`);
      setItems((await r.json()) as Approval[]);
    } catch (e) {
      setError((e as Error).message);
      setItems([]);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, approve: boolean) {
    if (!token) return;
    setBusy(id);
    try {
      const r = await fetch(
        `${API}/approvals/${id}/${approve ? "approve" : "reject"}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );
      if (!r.ok) throw new Error(`API trả ${r.status}`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          <div className="mb-6 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            <div>
              <h1 className="text-xl font-semibold">Phê duyệt</h1>
              <p className="text-muted-foreground text-sm">
                Trợ lý AI chỉ đề xuất. Mọi việc chi tiền, ký kết hay không thể
                hoàn tác đều dừng ở đây chờ bạn quyết định.
              </p>
            </div>
          </div>

          {!token && (
            <div className="rounded-lg border p-6 text-center">
              <p className="text-sm">
                Bạn cần đăng nhập tài khoản SoloCEO để xem hàng đợi phê duyệt.
              </p>
              <a
                href="https://app.soloceo.vn/dang-nhap"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Đăng nhập →
              </a>
            </div>
          )}

          {token && items === null && (
            <div className="text-muted-foreground flex items-center gap-2 py-10 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải hàng đợi…
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Không tải được: {error}</span>
            </div>
          )}

          {token && items?.length === 0 && !error && (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <ShieldCheck className="text-muted-foreground/50 mx-auto h-10 w-10" />
              <p className="mt-3 text-sm font-medium">Không có yêu cầu nào</p>
              <p className="text-muted-foreground text-sm">
                Khi trợ lý AI cần chi tiền hay ký kết, yêu cầu sẽ hiện ở đây.
              </p>
            </div>
          )}

          <ul className="space-y-3">
            {items?.map((a) => (
              <li key={a.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {ACTION_LABEL[a.actionType] ?? a.actionType}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      a.tier >= 2
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {a.tier >= 2 ? "Rủi ro cao" : "Cần xác nhận"}
                  </span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {new Date(a.createdAt).toLocaleString("vi-VN")}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  Chi tiết: {summarize(a.payloadJson)}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={busy === a.id}
                    onClick={() => void decide(a.id, true)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {busy === a.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Duyệt
                  </button>
                  <button
                    disabled={busy === a.id}
                    onClick={() => void decide(a.id, false)}
                    className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Từ chối
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
