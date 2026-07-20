# Nghiên cứu mã nguồn mở "Open*" cho platform.soloceo.vn

**Ngày:** 21/07/2026 · **Người thực hiện:** Claude (SoloCEO) · **Nguồn:** GitHub (kiểm tra trực tiếp license + Dockerfile từng repo)

## Mục đích
Từ danh sách repo có chữ **"Open"** trên GitHub, chọn ra các mã nguồn có thể **dựng thành container tự phục vụ trên platform.soloceo.vn** để CEO đăng ký là dùng ngay (mô hình 1 instance / 1 tenant qua Coolify, giống cách đã làm với ERPNext, OpenClaw).

## 3 câu hỏi đánh giá
1. **Đẩy lên VPS được không?** = có Dockerfile/compose, self-host được (kỹ thuật).
2. **Dựng lên platform cho CEO đăng ký được không?** = self-host **+ license cho phép cung cấp cho người dùng cuối**.
3. **Cái nào KHÔNG đẩy VPS được?** = thư viện/SDK/ứng dụng desktop/phần cứng — không phải web-app đa tenant.

## Nguyên tắc license (quan trọng)
Mô hình platform.soloceo.vn là **mỗi CEO một instance riêng** (không phải 1 bản dùng chung nhiều khách). Nhờ vậy:
- **MIT / Apache-2.0 / BSD / MPL-2.0** → bán lại/cung cấp SaaS **thoải mái**, kể cả white-label.
- **GPL-3 / AGPL-3** → **vẫn dùng được** ở mô hình per-tenant (giống ADR-001 Dify). AGPL bắt buộc **cho phép tenant/người dùng của họ tải mã nguồn** nếu ta sửa code; không được biến thành SaaS đóng kín giấu mã. Chấp nhận được nếu ta không giấu mã.
- **Elastic License v2 / SSPL / BSL** → **CẤM** cung cấp dạng dịch vụ có quản lý → loại. *(May mắn: không repo nào dưới đây dính bẫy này — đã kiểm.)*
- **License có điều khoản giữ thương hiệu** (vd Open WebUI) → dùng được nhưng **hạn chế white-label** ở quy mô lớn.

---

## A. DỰNG ĐƯỢC LÊN platform.soloceo.vn (CEO đăng ký dùng ngay)

### License mở hẳn — bán lại/white-label thoải mái (Apache / MIT / MPL)

| # | Dự án | Repo | License | Dùng làm gì cho CEO | Docker |
|---|-------|------|---------|---------------------|--------|
| 1 | **OpenIM** | openimsdk/open-im-server | Apache-2.0 | Chat nội bộ đội nhóm / nhắn tin realtime nhúng vào app | ✅ |
| 2 | **Openfire** | igniterealtime/Openfire | Apache-2.0 | Máy chủ chat XMPP (IM doanh nghiệp, hỗ trợ) | ✅ |
| 3 | **OpenBao** | openbao/openbao | MPL-2.0 | Quản lý bí mật/khoá/chứng chỉ (fork HashiCorp Vault) — hạ tầng | ✅ |
| 4 | **OpenHands** | All-Hands-AI/OpenHands | MIT (trừ `enterprise/`) | Agent AI tự viết code/tự động hoá cho CEO tech | ✅* |

> *OpenHands chạy **Docker-in-Docker** (mỗi phiên 1 sandbox) → tốn RAM/CPU, cần cấu hình node riêng.

### License copyleft — dùng per-tenant OK, không giấu mã (GPL / AGPL)

| # | Dự án | Repo | License | Dùng làm gì cho CEO | Docker |
|---|-------|------|---------|---------------------|--------|
| 5 | **OpenProject** | opf/openproject | GPL-3 | Quản lý dự án/công việc (thay Jira, Asana, MS Project) | ✅ |
| 6 | **OpenSign** | OpenSignLabs/OpenSign | AGPL-3 | Ký tài liệu điện tử (thay DocuSign) — rất hợp Solo CEO ký HĐ | ✅ |
| 7 | **OpenReplay** | openreplay/openreplay | AGPL-3 (+MIT vài phần, `/ee` đóng) | Session replay + analytics web app (xem khách thao tác) | ✅ |
| 8 | **OpenObserve** | openobserve/openobserve | AGPL-3 (+enterprise) | Logs/metrics/traces; free 50GB/ngày, **được dùng thương mại** | ✅ |
| 9 | **OpenBB** | OpenBB-finance/OpenBB | AGPL-3 | Nền tảng dữ liệu tài chính/đầu tư (niche, hơi nặng) | ✅ |

---

## B. ĐẨY VPS ĐƯỢC nhưng LƯU Ý (license/white-label/phụ thuộc cloud)

| # | Dự án | Repo | License | Lưu ý |
|---|-------|------|---------|-------|
| 10 | **Open WebUI** | open-webui/open-webui | Custom (BSD-3 + **bắt giữ thương hiệu "Open WebUI"**) | Giao diện chat AI kiểu ChatGPT, self-host tốt. **NHƯNG** phải giữ logo/tên "Open WebUI" trừ khi <50 user hoặc có thoả thuận → **khó white-label** thành thương hiệu SoloCEO ở quy mô lớn. |
| 11 | **OpenStatus** | openstatusHQ/openstatus | AGPL-3 | Trang trạng thái + giám sát uptime. Bản đầy đủ **phụ thuộc dịch vụ cloud** (Turso DB, Tinybird analytics) → self-host chỉ một phần; muốn dựng trọn cần thay component. |

> Ghi chú **open-core**: OpenProject / OpenObserve / OpenReplay / OpenHands có thư mục `ee`/`enterprise` tính phí. **Bản community đủ dùng**, chỉ vài tính năng nâng cao (SSO doanh nghiệp, audit, scale lớn) là trả phí — không ảnh hưởng việc cung cấp cho CEO.

---

## C. KHÔNG ĐẨY LÊN VPS ĐƯỢC (không phải web-app đa tenant)

Đây là các repo có chữ "Open" nhưng **bản chất không phải dịch vụ web** để CEO đăng ký — không đưa lên platform được:

| Dự án | Bản chất | Vì sao không dựng được |
|-------|----------|------------------------|
| **Open Interpreter** (OpenInterpreter/open-interpreter) | Agent chạy **máy cá nhân** điều khiển máy tính của chính user | Client-side, thao tác filesystem/ứng dụng local — không thể host đa tenant |
| **OpenCV** (opencv/opencv) | **Thư viện** thị giác máy tính | Là library nhúng vào phần mềm, không có giao diện/dịch vụ |
| **OpenAI Python** (openai/openai-python) | **SDK** gọi API | Chỉ là thư viện client, không phải ứng dụng |
| **OpenAPI-Specification** | **Tài liệu đặc tả** (chuẩn REST) | Là văn bản chuẩn, không phải phần mềm chạy được |
| **openpilot** (commaai/openpilot) | Phần mềm lái xe tự động | Chạy trên **phần cứng xe**, không phải server |

**Dấu hiệu nhận biết "không dựng được":** repo là *library / SDK / CLI chạy local / spec / firmware phần cứng* → không có Dockerfile phục vụ web hoặc không có mô hình đa người dùng.

---

## KHUYẾN NGHỊ cho platform.soloceo.vn

SoloCEO đã có: CRM (Perfex), CSKH (Support Board), cộng đồng (WoWonder), LMS (Academy), họp video (LiveSmart), ERP (ERPNext), AI hub (MagicAI). Các "Open*" nên thêm để **lấp khoảng trống**, ưu tiên theo giá trị cho Solo CEO:

| Ưu tiên | Thêm gì | Lý do |
|---------|---------|-------|
| ⭐⭐⭐ | **OpenSign** (AGPL) | Ký hợp đồng điện tử — nhu cầu thật của mọi Solo CEO, chưa có trong hệ |
| ⭐⭐⭐ | **OpenProject** (GPL) | Quản lý dự án/công việc — lấp khoảng trống PM |
| ⭐⭐ | **Open WebUI** (custom) | Chat AI riêng tư kiểu ChatGPT — hợp định vị AI (lưu ý giữ thương hiệu) |
| ⭐⭐ | **OpenReplay** (AGPL) | Analytics/session replay — CEO có web/landing xem hành vi khách |
| ⭐ | **OpenIM / Openfire** (Apache) | Chat nội bộ đội nhóm — license sạch nhất, dễ tích hợp |

**Cách triển khai** (theo mô hình đã có với ERPNext/OpenClaw):
1. Đóng gói docker-compose từng app vào catalog Coolify (`infra/coolify/templates/`).
2. WHMCS platform.soloceo.vn bán như "dịch vụ PaaS" → CEO đăng ký → svc-provision gọi Coolify tạo project riêng + subdomain.
3. AGPL/GPL: giữ link tải mã nguồn công khai (không giấu) → tuân thủ.
4. Open WebUI: giữ nguyên thương hiệu hoặc dùng cho nhóm nhỏ; nếu muốn white-label toàn diện → cân nhắc thay bằng lựa chọn Apache/MIT.

---

*Tài liệu này kiểm tra license + Dockerfile trực tiếp từ GitHub ngày 21/07/2026. License có thể đổi theo thời gian — rà lại trước khi thương mại hoá quy mô lớn (đặc biệt các bản "open-core" và Open WebUI).*
