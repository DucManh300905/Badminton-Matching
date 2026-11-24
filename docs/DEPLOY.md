# Triển khai máy chủ chạy thật — Badminton Matching

> Cập nhật: 23/11/2026. Địa chỉ chạy thật: **https://sv22.bcse-vju.com** (web) · **https://sv22.bcse-vju.com/api** (API).
> Tài liệu liên quan: [GIT.md](GIT.md) (nhánh, tag phát hành) · [RISKS.md](RISKS.md) (R15) · [database.md](database.md)

## 1. Kiến trúc

```
Người dùng (trình duyệt / app)
   │  HTTPS
   ▼
Cloudflare ──(đường hầm)──► Nginx :80 trên máy chủ
                              ├─ /api/*  ──► Node 24 + Express :8080 (PM2: badminton-backend)
                              │                 └─► MongoDB 8 :27017 (127.0.0.1, replica set rs0)
                              │                        database: badminton_matching
                              └─ /*      ──► /var/www/badminton (bản build của frontend)
```

- HTTPS do Cloudflare đảm nhận; máy chủ chỉ có IP nội bộ, không mở cổng nào ra Internet.
- Frontend và API **cùng tên miền** nên không phát sinh CORS; frontend được build với `VITE_API_URL=/api`.
- MongoDB chỉ nghe `127.0.0.1`. Replica set `rs0` là bắt buộc vì tham gia / rời / hủy kèo chạy trong transaction ([database.md](database.md)).

| File trong repo | Vai trò |
|---|---|
| [backend/ecosystem.config.cjs](../backend/ecosystem.config.cjs) | Cấu hình PM2: tên tiến trình, Node 24, `NODE_ENV=production` |
| [deploy/nginx-badminton.conf](../deploy/nginx-badminton.conf) | Site Nginx: web tĩnh + chuyển `/api` vào backend, lấy IP thật từ Cloudflare |
| [deploy/deploy.sh](../deploy/deploy.sh) | Lấy code, cài thư viện, build web, khởi động lại backend, kiểm tra `/api/health` |
| [deploy/backup.sh](../deploy/backup.sh) | Sao lưu database, giữ 7 ngày |

## 2. Yêu cầu máy chủ

Ubuntu 24.04, có quyền `sudo`, đã cài: Nginx, MongoDB 8 (đã bật `replication: replSetName: rs0`), PM2, nvm, git. Khoảng 1 GB RAM và 1 GB ổ đĩa trống cho ứng dụng.

Kiểm tra nhanh:

```bash
systemctl is-active nginx mongod
grep -A1 '^replication:' /etc/mongod.conf      # phải có replSetName: rs0
command -v pm2 git && . ~/.nvm/nvm.sh && nvm --version
```

## 3. Cài đặt lần đầu

### 3.1 Node 24

```bash
. ~/.nvm/nvm.sh
nvm install 24
```

Không cần đổi bản Node mặc định của máy: `deploy.sh` tự chọn Node 24 và báo PM2 dùng đúng bản này.

### 3.2 Lấy code

```bash
mkdir -p ~/apps
git clone https://github.com/DucManh300905/Badminton-Matching.git ~/apps/badminton-matching
cd ~/apps/badminton-matching
```

### 3.3 Biến môi trường backend

```bash
cp backend/.env.example backend/.env
chmod 600 backend/.env
openssl rand -hex 48          # chép kết quả làm JWT_SECRET
nano backend/.env
```

Giá trị cho máy chủ chạy thật:

```dotenv
PORT=8080
CLIENT_URL=https://sv22.bcse-vju.com
MONGODB_URI=mongodb://127.0.0.1:27017/badminton_matching?replicaSet=rs0
JWT_SECRET=<chuỗi 96 ký tự vừa tạo>
TRUST_PROXY=1
```

- `JWT_SECRET` chỉ nằm trên máy chủ; **không** commit, không gửi qua chat. Đổi giá trị này làm mọi người dùng phải đăng nhập lại.
- `TRUST_PROXY=1`: Nginx đã đặt `X-Forwarded-For` = IP thật của người dùng (lấy từ header `CF-Connecting-IP` của Cloudflare), nên giới hạn số lần đăng nhập sai đếm đúng theo từng người.
- Bỏ dòng `DEMO_PASSWORD`: **không chạy `npm run seed:demo` trên máy chủ chạy thật**, để số liệu thử nghiệm không lẫn dữ liệu mẫu.

### 3.4 Nginx

```bash
sudo cp deploy/nginx-badminton.conf /etc/nginx/sites-available/badminton
sudo ln -sf /etc/nginx/sites-available/badminton /etc/nginx/sites-enabled/badminton
sudo nginx -t && sudo systemctl reload nginx
```

`nginx -t` báo lỗi thì **không** reload; sửa file rồi chạy lại.

### 3.5 Triển khai lần đầu

```bash
bash deploy/deploy.sh main
```

Script in từng bước và kết thúc bằng `[ĐẠT] Triển khai xong: <commit>`. Lần đầu mất vài phút vì phải cài thư viện và build frontend.

### 3.6 Tự chạy lại khi máy khởi động lại, xoay vòng log

```bash
pm2 startup          # in ra một lệnh "sudo env PATH=... pm2 startup ..." → chép và chạy lệnh đó
pm2 save
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 5
```

### 3.7 Sao lưu tự động

```bash
mkdir -p ~/backups
crontab -e
```

Thêm dòng (3 giờ sáng mỗi ngày):

```cron
0 3 * * * bash $HOME/apps/badminton-matching/deploy/backup.sh >> $HOME/backups/backup.log 2>&1
```

Chạy thử ngay: `bash deploy/backup.sh` → in `sao lưu xong: ...`.

## 4. Kiểm tra sau khi triển khai

```bash
curl -s http://127.0.0.1:8080/api/health                 # trên máy chủ
curl -s https://sv22.bcse-vju.com/api/health             # từ bất kỳ máy nào
cd ~/apps/badminton-matching/backend
SMOKE_API_URL=https://sv22.bcse-vju.com/api npm run smoke # 16 bước, tự dọn tài khoản thử
```

- `npm run smoke` tự tạo 4 tài khoản tạm và xóa ở cuối, nên chạy được trên CSDL trống. Giới hạn 10 tài khoản / giờ / IP → **tối đa 2 lần mỗi giờ**.
- Mở https://sv22.bcse-vju.com trên điện thoại: đăng ký, đăng kèo, tham gia bằng tài khoản thứ hai.

## 5. Cập nhật phiên bản mới

Theo [GIT.md](GIT.md): code đã merge vào `main` (và gắn tag nếu là mốc) thì trên máy chủ:

```bash
cd ~/apps/badminton-matching
bash deploy/deploy.sh main
```

`deploy.sh` lấy đúng bản trên GitHub (bỏ mọi sửa tay trong thư mục repo, trừ `backend/.env`), nên **không sửa code trực tiếp trên máy chủ**.

**Quay về bản trước** khi bản mới lỗi:

```bash
bash deploy/deploy.sh v0.2.0      # tên tag hoặc mã commit
```

## 6. Sao lưu và khôi phục

Bản sao lưu: `~/backups/badminton/badminton_matching-<ngày-giờ>.archive.gz`, giữ 7 ngày.

Khôi phục (ghi đè dữ liệu hiện tại của `badminton_matching`):

```bash
pm2 stop badminton-backend
mongorestore --gzip --archive=$HOME/backups/badminton/<tên-file>.archive.gz --nsInclude='badminton_matching.*' --drop
pm2 start badminton-backend
```

Trước khi phân tích số liệu thử nghiệm (RQ3), chép một bản sao lưu về máy cá nhân.

## 7. Xử lý sự cố

| Hiện tượng | Kiểm tra |
|---|---|
| Web báo lỗi 500, `error.log` có `Permission denied` / `internal redirection cycle` | Nginx không đọc được thư mục web: `sudo chmod -R a+rX /var/www/badminton` (`deploy.sh` đã tự làm bước này) |
| Trình duyệt vẫn hiện trang cũ của tên miền | Bản lưu trong trình duyệt (cache / service worker), không phải máy chủ: mở cửa sổ ẩn danh để kiểm tra; xóa bằng DevTools → Application → Storage → **Clear site data** |
| Console báo 404 `/cdn-cgi/rum` | Script thống kê do Cloudflare chèn vào, không thuộc ứng dụng; bỏ qua |
| Web báo lỗi 502 | Backend không chạy: `pm2 ls`, `pm2 logs badminton-backend --lines 50` |
| Lỗi 52x trang Cloudflare | Nginx không chạy hoặc máy chủ tắt: `systemctl status nginx` |
| `deploy.sh` dừng ở "Thiếu backend/.env" | Làm lại mục 3.3 |
| Backend khởi động rồi tắt ngay | Thường do `.env`: thiếu `JWT_SECRET` / `MONGODB_URI` hoặc `JWT_SECRET` quá ngắn; xem `pm2 logs` |
| Tham gia kèo báo lỗi 500 | MongoDB không phải replica set: xem log khi khởi động, mục 2 |
| Ổ đĩa đầy | `df -h /`; dọn `~/.npm/_cacache` (`npm cache clean --force`), giảm `KEEP_DAYS` trong `backup.sh` |

Log Nginx: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`.

## 8. Gỡ ứng dụng

```bash
pm2 delete badminton-backend && pm2 save
sudo rm -f /etc/nginx/sites-enabled/badminton /etc/nginx/sites-available/badminton
sudo systemctl reload nginx
sudo rm -rf /var/www/badminton
crontab -e                        # xóa dòng backup.sh
# Xóa dữ liệu (không khôi phục được nếu không có bản sao lưu):
# mongosh --quiet --eval 'db.getSiblingDB("badminton_matching").dropDatabase()'
```
