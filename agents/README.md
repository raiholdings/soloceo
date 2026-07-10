# agents/ — 6 nhân sự AI của SoloCEO (DeerFlow sub-agents)

Port từ playbook `infra/patches/deerflow/skills/soloceo-business-builder/ai-staff.md`
(R0 §4-C: "Agent điều hành (OpenClaw) → DeerFlow lead_agent + 6 sub-agents").

- **lead_agent** = Trợ lý Điều hành (chánh văn phòng) — định danh ở
  `backend/.../agents/lead_agent/prompt.py` của DeerFlow; tiếp nhận yêu cầu CEO,
  lập kế hoạch, giao việc cho 6 sub-agent, tổng hợp báo cáo. Xem `lead_agent.md`.
- 6 sub-agent chuyên môn: `kinh-doanh`, `marketing`, `noi-dung`, `van-hanh`,
  `ke-toan`, `nghien-cuu` — khai trong `platform/deerflow/config.yaml` (custom_agents).

**Nguyên tắc an toàn (mọi agent):** hành động rủi ro (chi tiền, gửi/đăng hàng loạt,
ký, xóa, nộp hồ sơ) KHÔNG tự làm — gọi tool nhạy cảm sẽ bị **arishem gate** chặn và
đẩy CEO phê duyệt (HITL 2 tầng). Tiếng Việt mặc định. Mọi LLM qua LiteLLM.
