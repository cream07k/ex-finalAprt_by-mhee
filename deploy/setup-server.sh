#!/usr/bin/env bash
# ════════════════════════════════════════════
#  Ubuntu 24.04 — One-shot server setup
#  รัน: sudo bash setup-server.sh
# ════════════════════════════════════════════
set -euo pipefail

echo "▶ 1/8  อัพเดต system"
apt-get update
apt-get upgrade -y

echo "▶ 2/8  ติดตั้ง dependencies พื้นฐาน"
apt-get install -y \
  curl wget git ufw fail2ban \
  nginx ca-certificates gnupg lsb-release \
  build-essential

echo "▶ 3/8  ติดตั้ง Node.js 22 (NodeSource)"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

echo "▶ 4/8  ติดตั้ง Docker (optional แต่แนะนำ)"
if ! command -v docker &> /dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi

echo "▶ 5/8  Certbot (SSL)"
apt-get install -y certbot python3-certbot-nginx

echo "▶ 6/8  Firewall (UFW)"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

echo "▶ 7/8  Fail2ban (กัน brute force SSH + nginx)"
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
backend  = systemd

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-botsearch]
enabled = true
EOF
systemctl enable --now fail2ban

echo "▶ 8/8  สร้าง user 'apt' (ไม่มี shell login)"
if ! id apt &>/dev/null; then
  useradd --system --shell /usr/sbin/nologin --home /var/www/apt-utility apt
fi
mkdir -p /var/www/apt-utility/logs
chown -R apt:apt /var/www/apt-utility

echo "✅  Server setup เสร็จ"
echo
echo "ขั้นต่อไป:"
echo "  1. clone repo ลง /var/www/apt-utility"
echo "  2. สร้าง /var/www/apt-utility/.env.local จาก .env.example"
echo "  3. เลือกวิธี deploy:"
echo "     a) Docker:  cd /var/www/apt-utility && docker compose up -d --build"
echo "     b) Native:  ดู deploy/apt-utility.service"
echo "  4. ตั้ง nginx + SSL ดู deploy/nginx.conf และ DEPLOY.md"
