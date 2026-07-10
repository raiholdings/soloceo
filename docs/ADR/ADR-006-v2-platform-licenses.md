# ADR-006 — License 8 nền tảng SoloCEO OS v2

**Trạng thái:** Đề xuất (chờ xác minh LICENSE 3 lib Go/Rust trước go-live thu phí)
**Ngày:** 10/07/2026 · **Liên quan:** research/R1–R7, ADR-005 (ai-native-stack thay thế)

## Bối cảnh
SoloCEO OS v2 = DeerFlow + 7 nền tảng vệ tinh. Nguyên tắc bất biến #6: chỉ dùng
license MIT/Apache-2.0 (được bán lại dạng dịch vụ). Cụm OpenClaw/Claw3D/ClawHub
(v1) đã tách sang openclawos.vn — thay bằng bộ v2 dưới đây.

## Quyết định
| # | Nền tảng | License | Trạng thái |
|---|---|---|---|
| 0 | DeerFlow (bytedance/deer-flow) | MIT | ✅ (mở LICENSE xác nhận) |
| 1 | AIO Sandbox (agent-infra/sandbox) | Apache-2.0 | ✅ |
| 2 | FlowGram.ai (bytedance/flowgram.ai) | MIT | ✅ |
| 3 | Midscene.js (web-infra-dev/midscene) | MIT | ✅ |
| 4 | Dolphin (bytedance/Dolphin) | MIT | ✅ |
| 5 | arishem (bytedance/arishem) | Apache-2.0 (giả định) | ⚠️ **PHẢI mở LICENSE** |
| 6 | godlp (bytedance/godlp) | Apache-2.0 (giả định) | ⚠️ **PHẢI mở LICENSE** |
| 7 | g3 (bytedance/g3) | Apache-2.0 (giả định) | ⚠️ **PHẢI mở LICENSE** |

Tất cả đều MIT/Apache-2.0 → đạt nguyên tắc #6, được cung cấp dạng dịch vụ.

## Điều kiện bắt buộc trước go-live thu phí
1. Mở file `LICENSE` từng repo #5/#6/#7 xác nhận Apache-2.0 (research R6 §10 chưa
   xác minh được do offline). Nếu khác → đánh giá lại quyền bán-lại.
2. Giữ NOTICE/attribution theo Apache-2.0; pin commit SHA (không `latest`/`main`),
   ghi `infra/versions.lock`.
3. Không đóng gói bất kỳ thành phần license copyleft/hạn chế bán-lại (n8n vẫn cấm — ADR-002).

## Hệ quả
So v1: bỏ ràng buộc license Dify (ADR-001) khỏi luồng lõi (Dify không còn trong v2).
