# Badminton Matching

![CI](https://github.com/DucManh300905/Badminton-Matching/actions/workflows/ci.yml/badge.svg?branch=develop)

Nền tảng web ghép kèo cầu lông vãng lai, có cơ chế chia chi phí theo từng khoản và thu tiền bằng mã QR.

**Đồ án cá nhân** – Sinh viên thực hiện: An Đức Mạnh (MSSV 23110310)

**Bản chạy thật:** https://sv22.bcse-vju.com

## Tài liệu dự án

| Tài liệu | Nội dung |
|---|---|
| [docs/01-project-charter.md](docs/01-project-charter.md) | Đề tài, mục tiêu, câu hỏi nghiên cứu, phạm vi, rủi ro |
| [docs/02-wbs.md](docs/02-wbs.md) | Cấu trúc phân rã công việc |
| [docs/03-gantt.md](docs/03-gantt.md) | Mốc, đường găng, quy tắc cắt phạm vi, lộ trình 2 giai đoạn (lịch chi tiết: [docs/diagrams/gantt.xlsx](docs/diagrams/gantt.xlsx)) |
| [docs/04-user-stories.md](docs/04-user-stories.md) | User stories (MoSCoW, tiêu chí chấp nhận) và use case |
| [docs/project.md](docs/project.md) | Tổng quan kỹ thuật: kiến trúc, chức năng, **quy tắc nghiệp vụ BR-01…BR-18**, chi phí theo từng khoản |
| [docs/API.md](docs/API.md) | Đặc tả API: endpoint, định dạng phản hồi, mã lỗi |
| [docs/database.md](docs/database.md) | Thiết kế CSDL MongoDB: collection, index, transaction |
| [docs/QUALITY.md](docs/QUALITY.md) | Kế hoạch chất lượng: ngưỡng đạt, ca kiểm tra, kết quả đo |
| [docs/RISKS.md](docs/RISKS.md) | Sổ rủi ro: chấm điểm, phòng ngừa, dự phòng |
| [docs/GIT.md](docs/GIT.md) | Quy ước nhánh, commit, Pull Request, phát hành |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Triển khai máy chủ chạy thật: Nginx, PM2, sao lưu, cập nhật, xử lý sự cố |

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Backend | Node.js 24 LTS · Express 5 (CommonJS) · MongoDB + Mongoose · JWT · express-validator · helmet · express-rate-limit |
| Frontend | React 19 · Vite · TypeScript · React Router 7 · Axios (gọi API qua `VITE_API_URL`, JWT lưu `localStorage`) · CSS thuần (`src/styles.css`, giao diện **kiểu app trên điện thoại / máy tính bảng** (dưới 1024px: thanh tab đáy, thanh tiêu đề có nút quay lại, chip lọc, nút hành động dính ở đáy) và **kiểu web trên máy tính**; cài lên màn hình chính được (PWA), màu xanh lá) |
| Kiểm thử | Jest + Supertest + MongoDB chạy trong RAM (backend) · Vitest + React Testing Library (frontend) |
| CI | GitHub Actions: `backend-test`, `frontend-build` |

## Cấu trúc

```
Badminton-Matching/
├─ backend/                 Express, CommonJS (package.json riêng)
│  ├─ src/
│  │  ├─ app.js             Tạo app Express (dùng chung cho server và test)
│  │  ├─ server.js          Đọc .env, kết nối MongoDB, mở cổng 8080
│  │  ├─ config/            Kết nối MongoDB, plugin toJSON
│  │  ├─ middlewares/       auth, error, validate, rateLimit
│  │  ├─ modules/           Mỗi chức năng một thư mục: routes / controller / service / model
│  │  │  ├─ auth/  user/    Đăng ký, đăng nhập, hồ sơ
│  │  │  └─ post/           Kèo: model, quy tắc (post.rules.js), chi phí theo khoản (post.costs.js), service, routes
│  │  └─ utils/             AppError, asyncHandler, giờ VN, chính sách mật khẩu, dữ liệu mẫu
│  └─ tests/                Mỗi module một thư mục test
├─ frontend/                React + TypeScript (package.json riêng)
│  └─ src/
│     ├─ api/               client.ts (axios + JWT + dịch mã lỗi) và mỗi tài nguyên một file
│     ├─ components/        Layout, Navbar (máy tính), TabBar (điện thoại), AccountLayout, PageHeader, PostCard, Menu, Icon…
│     ├─ context/  pages/
│     ├─ utils/             Hằng số, định dạng, chuyển đổi form
│     ├─ types.ts           Kiểu dữ liệu dùng chung
│     └─ styles.css         Toàn bộ CSS (biến màu ở :root)
├─ deploy/                 Cấu hình máy chủ: Nginx, deploy.sh, backup.sh (xem docs/DEPLOY.md)
└─ docs/
```

## Chạy dự án

Yêu cầu: **Node.js 24 LTS** ([.nvmrc](.nvmrc)) và **MongoDB chạy dạng replica set** (để dùng transaction).

```bash
cd backend
cp .env.example .env        # sửa JWT_SECRET: openssl rand -hex 48
npm install
npm run db:init-replset     # chỉ cần một lần, nếu MongoDB chưa khởi tạo replica set
npm run seed:demo           # dữ liệu mẫu: minh / lan / hung / thu @example.com, mật khẩu Demo@123
npm run dev                 # http://localhost:8080/api/health
```

```bash
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:8080/api (không có .env thì dùng địa chỉ này)
npm install
npm run dev                 # http://localhost:5173
```

Cần chạy **cả hai** (backend ở một terminal, frontend ở terminal khác) rồi mở http://localhost:5173.

### Kiểm thử

| Lệnh | Việc làm |
|---|---|
| `cd backend && npm test` | Test backend (MongoDB chạy trong RAM, không cần cài) |
| `cd backend && npm run test:coverage` | Kèm báo cáo coverage (`backend/coverage/index.html`) |
| `cd backend && npm run smoke` | Kiểm tra nhanh API **đang chạy thật** (cần `npm run dev`; với máy chủ: đặt `SMOKE_API_URL`), tự tạo và tự dọn tài khoản thử |
| `cd frontend && npm test` | Test frontend |
| `cd frontend && npm run lint && npm run build` | Kiểm tra code và build frontend |

## Trạng thái

| Chức năng | Trạng thái |
|---|---|
| Quy tắc nghiệp vụ của kèo | Xong, có test |
| Đăng ký, đăng nhập, đổi mật khẩu, hồ sơ (`/api/auth`, `/api/users`) | Xong |
| API kèo: danh sách có lọc, chi tiết, tạo, tham gia / rời (transaction), hủy (`/api/posts`) | Xong |
| Frontend: danh sách + lọc, đăng kèo, chi tiết, tham gia / rời / hủy, đăng nhập JWT | Xong |
| Thu tiền kèo bằng mã QR chuyển khoản (VietQR): tài khoản nhận tiền trong Hồ sơ, mã QR đúng giá cho người tham gia, chủ kèo đánh dấu đã trả (`/users/me/bank-account`, `PATCH /posts/:id/participants/:userId/payment`) | Xong |
| **Chi phí theo từng khoản**: sân / cầu / nước / ăn / khác, chọn người cùng chịu (có "Chọn tất cả"), bạn không dùng app, ai trong kèo cũng xem được, chỉ chủ kèo sửa bất cứ lúc nào; còn thiếu / trả dư; điểm danh (`PUT /posts/:id/costs`, `PUT /posts/:id/attendance`) | Xong |
| Giao diện web responsive (CSS thuần): thanh điều hướng trên cùng, bộ lọc cột trái, lưới kèo, khu Tài khoản có menu dọc (Tổng quan, Kèo của tôi, Hồ sơ, Đổi mật khẩu; `GET /api/users/me/posts`) | Xong |
| Giao diện kiểu app trên điện thoại (dưới 1024px): thanh tab đáy 5 mục, thanh tiêu đề có nút quay lại, chip lọc nhanh, nút hành động dính ở đáy; cài lên màn hình chính (PWA: manifest, biểu tượng) | Xong |
| Icon nét mảnh cạnh chữ khắp giao diện; ảnh đại diện và ảnh bìa kèo (cắt, đổi WebP, xóa EXIF / GPS; `PUT /users/me/avatar`, `PUT /posts/:id/cover`) | Xong |

## Định dạng API

```json
{ "success": true, "message": "…", "data": { } }
{ "success": false, "message": "…", "code": "MA_LOI", "errors": [{ "field": "email", "msg": "…" }] }
```

Frontend hiển thị thông báo dựa theo `code`.

## Quy ước làm việc

- `main`: bản ổn định, chỉ nhận merge từ `develop` khi đạt mốc (M1, M2, …).
- `develop`: nhánh tích hợp, nhánh mặc định của repo.
- Nhánh tính năng tạo từ `develop`, đặt tên `feature/<mã-WBS>-<mô-tả>`, ví dụ `feature/4.4.2-api-keo`.
- Mọi thay đổi đi qua Pull Request và chỉ merge khi CI xanh.
- PR vào `develop` dùng **Squash and merge**; PR `develop` → `main` dùng **Create a merge commit**.
- Commit theo dạng `<loại>: <mô tả>` (`feat`, `fix`, `docs`, `test`, `chore`, `refactor`).
- Code mới phải có test kèm theo. CI fail nếu coverage backend tụt dưới 80% (dòng).
- **Không** commit `.env` và dữ liệu bài đăng thô chưa ẩn danh hóa (`data/raw/`).
