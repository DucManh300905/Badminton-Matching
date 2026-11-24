#!/usr/bin/env bash
# Sao lưu database badminton_matching và thư mục ảnh tải lên, giữ các bản trong KEEP_DAYS ngày gần nhất.
# Chạy tự động hằng ngày bằng cron (docs/DEPLOY.md mục 3.7).
set -euo pipefail

DIR="${BACKUP_DIR:-$HOME/backups/badminton}"
KEEP_DAYS="${KEEP_DAYS:-7}"
STAMP="$(date +%F-%H%M)"
FILE="$DIR/badminton_matching-$STAMP.archive.gz"
UPLOADS="${UPLOAD_DIR:-/var/lib/badminton/uploads}"

mkdir -p "$DIR"
mongodump --quiet --db badminton_matching --gzip --archive="$FILE"
find "$DIR" -name 'badminton_matching-*.archive.gz' -mtime +"$((KEEP_DAYS - 1))" -delete
echo "$(date '+%F %T') sao lưu xong: $FILE ($(du -h "$FILE" | cut -f1))"

# Ảnh đại diện / ảnh bìa (database chỉ lưu tên file)
if [ -d "$UPLOADS" ]; then
    IMG="$DIR/uploads-$STAMP.tar.gz"
    tar -czf "$IMG" -C "$(dirname "$UPLOADS")" "$(basename "$UPLOADS")"
    find "$DIR" -name 'uploads-*.tar.gz' -mtime +"$((KEEP_DAYS - 1))" -delete
    echo "$(date '+%F %T') sao lưu ảnh xong: $IMG ($(du -h "$IMG" | cut -f1))"
fi
