---
name: vietnam-business
version: 1.0.0
author: SoloCEO (RAI Holdings)
description: Bộ kỹ năng nghiệp vụ doanh nghiệp Việt Nam cho agent SoloCEO
compatibility: deerflow>=2.0
---

# Kỹ năng: Nghiệp vụ doanh nghiệp Việt Nam

Chợ kỹ năng nội bộ (thay ClawHub — R0 §4-C). Mount vào DeerFlow/AIO Sandbox tại
`/mnt/skills/custom/vietnam-business`. Cung cấp cho 6 nhân sự AI kiến thức + quy
trình đặc thù VN.

## Phạm vi kỹ năng
- **Bán hàng & CSKH VN**: kịch bản tư vấn, chốt đơn, xử lý phản đối theo văn hóa VN; chăm khách qua Zalo OA.
- **Marketing VN**: kênh FB/TikTok/Zalo/Google, ngân sách nhỏ; lịch nội dung theo mùa vụ/lễ Tết.
- **Giấy tờ & tuân thủ**: đọc CCCD/GPKD/hóa đơn GTGT qua MCP `dolphin-docs`; quy tắc hóa đơn điện tử, MST.
- **Cổng dịch vụ công**: TUÂN ma trận Auto/Assist/Human-only (research/R4). CAPTCHA/ký số/VNeID/nộp hồ sơ/thanh toán = **Human-only**, agent KHÔNG tự làm.
- **Tài chính**: theo dõi doanh thu/công nợ; thuế GTGT/TNCN cơ bản (chỉ chuẩn bị, người nộp).

## Nguyên tắc bất biến
1. Hành động rủi ro → qua **arishem gate** (HITL). 2. Dữ liệu cá nhân → tuân **Nghị định 13/2023** (mask PII qua godlp trước khi rời hệ thống). 3. Không ký/nộp/thanh toán hộ. 4. Tiếng Việt mặc định.

## Cấu trúc
```
vietnam-business/
├── SKILL.md              # file này (entrypoint)
├── scripts/              # helper (đọc giấy tờ, tính thuế cơ bản) — bổ sung dần
└── templates/            # mẫu báo giá, hợp đồng, email, kịch bản CSKH
```
> Trạng thái: khung khởi tạo; scripts/templates bổ sung theo nhu cầu pilot.
