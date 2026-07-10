"""
SoloAioSandboxProvider — cắm AIO Sandbox vào DeerFlow, thay sandbox-local
(research/R1 §2 + R2). Map org_id → 1 AIO Sandbox container/tenant, warm pool +
idle timeout, hardening (SANDBOX_API_KEY, egress chỉ qua g3).

Đặt file này trong backend DeerFlow (vd backend/packages/harness/deerflow/community/
hoặc thư mục provider tùy biến) và trỏ config:
    sandbox:
      use: soloceo.sandbox.provider:SoloAioSandboxProvider

[CẦN KIỂM CHỨNG] Đường import base class + chữ ký chính xác của SandboxProvider
(acquire/get/release) và kiểu Sandbox — đối chiếu backend/.../sandbox/sandbox_provider.py
của bytedance/deer-flow trước khi deploy.
"""
from __future__ import annotations

import os
import threading
import time
from dataclasses import dataclass, field
from typing import Optional

# from deerflow.sandbox.sandbox_provider import SandboxProvider, Sandbox  # [CẦN KIỂM CHỨNG]
try:  # cho phép import độc lập để test/lint ngoài DeerFlow
    from deerflow.sandbox.sandbox_provider import SandboxProvider, Sandbox  # type: ignore
except Exception:  # pragma: no cover - seam
    class SandboxProvider:  # type: ignore
        ...

    class Sandbox:  # type: ignore
        ...


IDLE_TIMEOUT_SEC = int(os.environ.get("AIO_IDLE_TIMEOUT_SEC", "1800"))  # 30 phút
SANDBOX_API_KEY = os.environ.get("SANDBOX_API_KEY", "")
G3_PROXY = os.environ.get("G3_PROXY", "http://g3proxy:3128")


@dataclass
class _Entry:
    sandbox_id: str
    org_id: str
    base_url: str
    last_used: float = field(default_factory=lambda: 0.0)


class SoloAioSandboxProvider(SandboxProvider):  # type: ignore[misc]
    """1 sandbox/org. base_url = http://{host}:8080. Cô lập network: sandbox chỉ
    ra ngoài qua g3 (đặt PROXY_SERVER + Docker network internal khi provision)."""

    def __init__(self, **_: object) -> None:
        self._by_id: dict[str, _Entry] = {}
        self._by_org: dict[str, str] = {}
        self._lock = threading.Lock()

    # --- interface DeerFlow ---
    def acquire(
        self,
        thread_id: Optional[str] = None,
        *,
        user_id: Optional[str] = None,
    ) -> str:
        org_id = self._org_of(thread_id, user_id)
        now = time.monotonic()
        with self._lock:
            self._reap(now)
            sid = self._by_org.get(org_id)
            if sid and sid in self._by_id:
                self._by_id[sid].last_used = now
                return sid
            entry = self._provision(org_id)
            entry.last_used = now
            self._by_id[entry.sandbox_id] = entry
            self._by_org[org_id] = entry.sandbox_id
            return entry.sandbox_id

    def get(self, sandbox_id: str):
        entry = self._by_id.get(sandbox_id)
        if not entry:
            return None
        entry.last_used = time.monotonic()
        # Trả về đối tượng Sandbox của DeerFlow bọc base_url + API key.
        return self._make_sandbox(entry)

    def release(self, sandbox_id: str) -> None:
        with self._lock:
            entry = self._by_id.pop(sandbox_id, None)
            if entry:
                self._by_org.pop(entry.org_id, None)
                self._teardown(entry)

    # --- helpers ---
    def _org_of(self, thread_id: Optional[str], user_id: Optional[str]) -> str:
        # org_id lấy từ metadata thread/user (DeerFlow set khi tạo run). Ưu tiên
        # user_id; fallback thread_id. [CẦN KIỂM CHỨNG] cách DeerFlow truyền org_id.
        return user_id or thread_id or "default"

    def _reap(self, now: float) -> None:
        stale = [
            sid
            for sid, e in self._by_id.items()
            if now - e.last_used > IDLE_TIMEOUT_SEC
        ]
        for sid in stale:
            e = self._by_id.pop(sid, None)
            if e:
                self._by_org.pop(e.org_id, None)
                self._teardown(e)

    def _provision(self, org_id: str) -> _Entry:
        """SEAM: đảm bảo 1 AIO Sandbox container cho org đang chạy → trả base_url.
        Triển khai thật: gọi Coolify/docker API tạo container image
        ghcr.io/agent-infra/sandbox:1.11.0 với:
          - SANDBOX_API_KEY, PROXY_SERVER=g3 (username=org_id), bind 127.0.0.1
          - Docker network internal (không route ngoài) — R2 §5 / R6 §9.
        Ở đây trả host quy ước (service DNS nội bộ)."""
        host = os.environ.get(
            "AIO_HOST_TEMPLATE", "sbx-{org}"
        ).format(org=_safe(org_id))
        return _Entry(
            sandbox_id=f"aio:{org_id}",
            org_id=org_id,
            base_url=f"http://{host}:8080",
        )

    def _teardown(self, entry: _Entry) -> None:
        """SEAM: dừng/hủy container sandbox của org (hoặc để orchestrator reap)."""
        return None

    def _make_sandbox(self, entry: _Entry):
        # [CẦN KIỂM CHỨNG] cách dựng đối tượng Sandbox của DeerFlow. Tối thiểu cần
        # base_url + header X-AIO-API-Key. SDK: @agent-infra/sandbox / agent_sandbox.
        return Sandbox()  # type: ignore[call-arg]


def _safe(s: str) -> str:
    return "".join(c if c.isalnum() or c in "-_" else "-" for c in s)[:40]
