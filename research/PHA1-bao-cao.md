# PHA 1 — Báo cáo dọn tàn dư v1 (nhánh `chuan-bi-v2`)

> Trạng thái: **HOÀN TẤT phần code — DỪNG chờ duyệt.** Build xanh sau mỗi bước.
> KHÔNG đụng production. KHÔNG xoá cứng code/DB. Ngày 10/07/2026.

## 1. Đã dọn gì (9 commit, mỗi §C 1 commit)

| Bước | Commit | Nội dung | Cách loại |
|---|---|---|---|
| C5 | `5bc7257d` | Gỡ `apps/web-platform` (OS Shell 3D) khỏi pnpm workspace/turbo | negation `!apps/web-platform`, GIỮ file |
| C3 | `d5d27950` | `GET /ventures/:id/openclaw-access` + `getOpenclawAccess` | `@deprecated` (JSDoc + ApiOperation) |
| C1 | `80b63ae0` | `DEFAULT_APPS_BY_PLAN` → `["commerce-starter"]` + thêm CatalogApp commerce-starter | đổi + ghi chú |
| C4 | `311b0f51` | `getOrCreateOpenclawToken` ngừng gọi trong launch | `@deprecated`, biến openclaw → rỗng |
| C2 | `a47f1ed5` | `APP_CONFIGS.claw3d` + `.openclaw` | block comment `/* MOVED TO openclawos.vn */` |
| C8 | `948f2bd0` | plans.ts allowedAppKeys, concierge text, main.ts CORS, bat-dau nút OS, infra markers | comment/sửa text/marker |
| C9 | `8968e8a4` | seed v2 + 2 migration ARCHIVE | `active=false` + `status=ARCHIVED` (reversible) |
| C6/C7 | `c039fc7b` | Đánh dấu điểm nối AIO Sandbox + sub-agents | marker (CHƯA cắt) |

**GIỮ nguyên (ràng buộc):** `commerce-starter` (thêm vào catalog + default), `svc-billing-webhooks` (diff rỗng — không đụng), WoWonder/PlayTube/Grupo, `wowonder.controller.ts` (auth cộng đồng — để nguyên).

## 2. Build

- `pnpm build` **xanh sau mỗi bước** (6/6 task, web-platform đã ra ngoài build).
- `pnpm test`: 7 passed / 4 skipped; 1 test file `svc-billing-webhooks` fail ở `afterAll` (`prisma.transaction.deleteMany`) vì **cần Postgres live** — máy local không có DB. **Không liên quan PHA 1** (billing không bị sửa; build compile xanh). Cần chạy lại trên môi trường có DB.

## 3. Đồ thị phụ thuộc còn sót

Sau dọn, mọi tham chiếu cụm v1 trong **luồng chạy active** đã hết; phần còn lại đều ở dạng cho phép (§F R0):

| Còn lại | Trạng thái | OK? |
|---|---|---|
| `store.service.getOpenclawAccess` (lookup key `openclaw`) | `@deprecated`, 0 caller trong build | ✅ (chừa @deprecated) |
| `store.controller.openclawAccess` | `@deprecated` | ✅ |
| `worker.ts` `getOrCreateOpenclawToken` + APP_CONFIGS claw3d/openclaw | `@deprecated` + block comment | ✅ |
| `wowonder.controller.ts` (platform/app.soloceo.vn) | KEEP — auth cộng đồng, không đụng | ✅ (WoWonder) |
| `coolify-client.ts:34` `// vd .../claw3d` | comment ví dụ | ✅ |
| `*.app.soloceo.vn` trong web-community | KEEP — domain sản phẩm tenant (commerce-starter) | ✅ |

Không còn `import`/URL **active** trỏ openclaw/claw3d/clawhub. ✅ (§F đạt)

## 4. LỆNH CẦN ANH TỰ CHẠY (VPS/Coolify/DB) — soạn sẵn, chưa thực thi

> Chạy theo thứ tự. Đặt biến trước:
> ```bash
> CORE=194.233.72.150 ; TENANT1=62.146.235.177
> SSHK="ssh -i ~/.ssh/soloceo_deploy -o IdentitiesOnly=yes"
> COOLIFY=https://coolify.soloceo.vn ; TOKEN='4|hHoWfjiGVW98WLmXVT2HpyXo8gO8fEL3hlh2o7Mt'
> ```

### 4.1 — BACKUP DB core (BẮT BUỘC trước migrate)
```bash
$SSHK root@$CORE
# tìm container Postgres của core (Supabase self-host):
docker ps --format '{{.Names}}' | grep -iE 'postgres|supabase-db|soloceo.*db'
# pg_dump toàn bộ (thay <PG>, <USER>, <DB> cho đúng — thường USER=postgres):
docker exec -t <PG> pg_dump -U <USER> -d <DB> | gzip > /root/backup-soloceo-$(date +%F-%H%M).sql.gz
ls -lh /root/backup-soloceo-*.sql.gz     # xác nhận file > 0 byte
```

### 4.2 — DEPLOY code v2 rồi APPLY migration + seed
Sau khi Coolify build lại image từ nhánh `chuan-bi-v2` (KHI anh cho phép), trong container `api-core` (hoặc nơi có prisma + `DATABASE_URL`):
```bash
# áp 2 migration mới (add enum ARCHIVED → archive dữ liệu):
pnpm --filter @soloceo/db exec prisma migrate deploy
# seed lại catalog v2 (vô hiệu claw3d/openclaw, giữ erpnext + commerce-starter):
pnpm --filter @soloceo/db exec prisma db seed
```
Kiểm tra:
```sql
-- claw3d/openclaw phải active=false; commerce-starter/erpnext active=true
SELECT key, active FROM "CatalogApp" ORDER BY key;
-- các bản cài cũ phải ARCHIVED
SELECT status, count(*) FROM "AppInstall" GROUP BY status;
```
**Hoàn tác** (nếu cần): chạy `packages/db/prisma/migrations/20260710120100_archive_v1_claw3d_openclaw/ROLLBACK.sql`.

### 4.3 — ARCHIVE Secret `openclaw_token:*` (C4)
KHÔNG xoá — đổi tên key sang tiền tố `archived:` (ẩn khỏi lookup, giữ giá trị mã hoá, reversible):
```sql
-- xem trước:
SELECT "orgId", key FROM "Secret" WHERE key LIKE 'openclaw_token:%';
-- archive:
UPDATE "Secret" SET key = 'archived:' || key WHERE key LIKE 'openclaw_token:%';
-- hoàn tác: UPDATE "Secret" SET key = replace(key,'archived:','') WHERE key LIKE 'archived:openclaw_token:%';
```

### 4.4 — TẮT stack claw3d/openclaw cũ trên tenant-01 (step 9)
Để không đốt tài nguyên trùng với openclawos.vn. **Chỉ STOP, không xoá** (giữ dữ liệu 30 ngày).

Cách A — qua Coolify API (giữ trạng thái Coolify nhất quán, khuyến nghị):
```bash
# liệt kê app claw3d/openclaw:
curl -s -H "Authorization: Bearer $TOKEN" $COOLIFY/api/v1/applications \
 | jq -r '.[] | select(.name|test("claw3d|openclaw|-ai$")) | "\(.uuid)  \(.name)  \(.status)"'
# dừng từng app (thay <UUID>):
curl -s -H "Authorization: Bearer $TOKEN" "$COOLIFY/api/v1/applications/<UUID>/stop"
```

Cách B — qua docker trên tenant-01 (nhanh, nhưng Coolify vẫn tưởng đang chạy):
```bash
$SSHK root@$TENANT1
docker ps --format '{{.Names}}' | grep -E 'claw3d|openclaw'      # xem trước
docker ps --format '{{.Names}}' | grep -E 'claw3d|openclaw' | xargs -r docker stop
```

> Danh sách stack cần tắt = mọi app có tên chứa `claw3d`, `openclaw`, hoặc subdomain `-ai`
> trong các project `vt-<slug>` (khách nội bộ test). PlayTube/WoWonder/Grupo/commerce
> KHÔNG nằm trong danh sách này — tuyệt đối không tắt.

## 5. Xác nhận ràng buộc

- [x] Nhánh `chuan-bi-v2`, không đụng production/merge.
- [x] Không xoá cứng code (comment/@deprecated) và DB (ARCHIVED/active=false, có ROLLBACK).
- [x] Không đụng WoWonder/PlayTube/Grupo, `commerce-starter`, `svc-billing-webhooks`.
- [x] Build xanh sau mỗi bước.
- [x] Thao tác VPS/Coolify/DB: chỉ SOẠN LỆNH, chưa thực thi.
