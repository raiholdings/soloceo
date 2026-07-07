#!/usr/bin/env bash
# =====================================================================
# SoloCEO — Bootstrap Contabo VPS (Ubuntu 24.04) MỘT LỆNH
# Chạy bằng root:
#   ROLE=core   bash setup-vds.sh   # VPS-CORE: hardening + Coolify
#   ROLE=tenant bash setup-vds.sh   # VPS-TENANT: hardening (Coolify quản qua SSH)
# Idempotent — chạy lại an toàn.
# =====================================================================
set -euo pipefail
ROLE="${ROLE:-core}"
HOSTNAME_SET="${HOSTNAME_SET:-}"
[ -n "$HOSTNAME_SET" ] && hostnamectl set-hostname "$HOSTNAME_SET"

echo "==> [1/6] Cập nhật hệ thống..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git ufw fail2ban htop unattended-upgrades

echo "==> [2/6] Bật cập nhật bảo mật tự động..."
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> [3/6] Swap 4GB (đệm cho build image)..."
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> [4/6] Firewall UFW..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
if [ "$ROLE" = "core" ]; then
  ufw allow 8000/tcp   # Coolify dashboard — khóa lại sau: ufw delete allow 8000/tcp
  ufw allow 6001/tcp   # Coolify realtime
  ufw allow 6002/tcp   # Coolify terminal
fi
ufw --force enable

echo "==> [5/6] fail2ban bảo vệ SSH..."
systemctl enable --now fail2ban

if [ "$ROLE" = "core" ]; then
  echo "==> [6/6] Cài Coolify (kèm Docker)..."
  if [ ! -d /data/coolify ]; then
    curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
  else
    echo "Coolify đã cài — bỏ qua."
  fi
else
  echo "==> [6/6] ROLE=tenant — bỏ qua Coolify (controller trên core sẽ quản máy này qua SSH)."
fi

IP=$(curl -s -4 ifconfig.me || hostname -I | awk '{print $1}')
cat <<EOF

=====================================================================
✅ XONG. Bước tiếp theo (làm 1 lần trên trình duyệt):
1. Mở http://$IP:8000 → tạo tài khoản admin Coolify ĐẦU TIÊN ngay
   (ai mở trước người đó là admin!).
2. Coolify Settings → Instance Domain: coolify.soloceo.vn (sau khi trỏ DNS).
3. Tạo API token: Keys & Tokens → API tokens → quyền deploy
   → điền vào .env (COOLIFY_API_TOKEN).
4. Deploy các app theo docs/DEPLOY.md.
5. Sau khi có domain + SSL cho Coolify: ufw delete allow 8000/tcp
=====================================================================
EOF
