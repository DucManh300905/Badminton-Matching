#!/usr/bin/env bash
# Cập nhật Badminton Matching trên máy chủ. Hướng dẫn: docs/DEPLOY.md
# Cách dùng (trong thư mục repo trên máy chủ):
#   bash deploy/deploy.sh            # bản mới nhất của nhánh main
#   bash deploy/deploy.sh develop    # nhánh khác
#   bash deploy/deploy.sh v0.2.0     # quay về một tag
set -euo pipefail

REF="${1:-main}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_ROOT="${WEB_ROOT:-/var/www/badminton}"
HEALTH_URL="http://127.0.0.1:8080/api/health"

step() { printf '\n== %s\n' "$*"; }

step "Node 24 (nvm)"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm use 24 >/dev/null
NODE_BIN="$(nvm which 24)"
export NODE_BIN
node -v

step "Lấy code: $REF"
cd "$APP_DIR"
git fetch origin --tags --prune
if git rev-parse --verify --quiet "origin/$REF" >/dev/null; then
    git checkout --force --detach "origin/$REF"
else
    git checkout --force --detach "$REF"
fi
git log --oneline -1

if [ ! -f backend/.env ]; then
    echo "Thiếu backend/.env (xem docs/DEPLOY.md mục 3.3)" >&2
    exit 1
fi

step "Backend: cài thư viện"
(cd backend && npm ci --omit=dev --no-audit --no-fund)

step "Frontend: build"
(cd frontend && npm ci --no-audit --no-fund && VITE_API_URL=/api npm run build)

step "Frontend: chép bản build vào $WEB_ROOT"
sudo rm -rf "$WEB_ROOT.new" "$WEB_ROOT.old"
sudo cp -r frontend/dist "$WEB_ROOT.new"
if [ -d "$WEB_ROOT" ]; then sudo mv "$WEB_ROOT" "$WEB_ROOT.old"; fi
sudo mv "$WEB_ROOT.new" "$WEB_ROOT"
sudo rm -rf "$WEB_ROOT.old"

step "Backend: khởi động lại (PM2)"
pm2 startOrReload backend/ecosystem.config.cjs --update-env
pm2 save

step "Kiểm tra $HEALTH_URL"
for _ in $(seq 1 15); do
    if curl -fsS "$HEALTH_URL"; then
        echo
        echo "[ĐẠT] Triển khai xong: $(git log --oneline -1)"
        exit 0
    fi
    sleep 2
done
echo "[LỖI] Backend không phản hồi. Xem log: pm2 logs badminton-backend --lines 50" >&2
exit 1
