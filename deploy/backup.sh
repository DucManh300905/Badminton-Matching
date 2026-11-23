#!/usr/bin/env bash
# Sao lưu database badminton_matching, giữ các bản trong KEEP_DAYS ngày gần nhất.
# Chạy tự động hằng ngày bằng cron (docs/DEPLOY.md mục 3.7).
set -euo pipefail

DIR="${BACKUP_DIR:-$HOME/backups/badminton}"
KEEP_DAYS="${KEEP_DAYS:-7}"
FILE="$DIR/badminton_matching-$(date +%F-%H%M).archive.gz"

mkdir -p "$DIR"
mongodump --quiet --db badminton_matching --gzip --archive="$FILE"
find "$DIR" -name 'badminton_matching-*.archive.gz' -mtime +"$((KEEP_DAYS - 1))" -delete

echo "$(date '+%F %T') sao lưu xong: $FILE ($(du -h "$FILE" | cut -f1))"
