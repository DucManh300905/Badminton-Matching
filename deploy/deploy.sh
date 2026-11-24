#!/usr/bin/env bash
# Cập nhật Badminton Matching trên máy chủ. Hướng dẫn: docs/DEPLOY.md
# Cách dùng (trong thư mục repo trên máy chủ):
#   bash deploy/deploy.sh            # bản mới nhất của nhánh main
#   bash deploy/deploy.sh develop    # nhánh khác
#   bash deploy/deploy.sh v0.2.0     # quay về một tag
#
# Toàn bộ nằm trong hàm main(): bash đọc hết hàm trước khi chạy. Bước "Lấy code" thay chính file
# này trên đĩa; nếu không gói trong hàm, bash đọc tiếp file mới ở vị trí cũ và có thể bỏ sót lệnh.
set -euo pipefail

step() { printf '\n== %s\n' "$*"; }

main() {
    local REF="${1:-main}"
    local APP_DIR
    APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
    local WEB_ROOT="${WEB_ROOT:-/var/www/badminton}"
    local HEALTH_URL="http://127.0.0.1:8080/api/health"

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
    # Nginx (www-data) phải đọc được, kể cả khi terminal đang đặt umask chặt (vd: 077)
    sudo chmod -R a+rX "$WEB_ROOT.new"
    if [ -d "$WEB_ROOT" ]; then sudo mv "$WEB_ROOT" "$WEB_ROOT.old"; fi
    sudo mv "$WEB_ROOT.new" "$WEB_ROOT"
    sudo rm -rf "$WEB_ROOT.old"

    step "Backend: khởi động lại (PM2)"
    pm2 startOrReload backend/ecosystem.config.cjs --update-env
    pm2 save

    step "Kiểm tra $HEALTH_URL và trang web"
    for _ in $(seq 1 15); do
        # -s: không in lỗi trong lúc backend còn đang khởi động
        if curl -fs "$HEALTH_URL" >/dev/null; then
            local web
            web="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/)"
            if [ "$web" != "200" ]; then
                echo "[LỖI] API chạy nhưng trang web trả $web. Xem: sudo tail -5 /var/log/nginx/error.log" >&2
                exit 1
            fi
            echo "[ĐẠT] Triển khai xong (API và web đều chạy): $(git log --oneline -1)"
            exit 0
        fi
        sleep 2
    done
    echo "[LỖI] Backend không phản hồi. Xem log: pm2 logs badminton-backend --lines 50" >&2
    exit 1
}

main "$@"
