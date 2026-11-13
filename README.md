# Badminton Matching

![CI](https://github.com/DucManh300905/Badminton-Matching/actions/workflows/ci.yml/badge.svg?branch=develop)

Nền tảng web kết nối người chơi cầu lông vãng lai, có tính năng trích xuất thông tin tự động từ bài đăng tiếng Việt phi cấu trúc.

**Đồ án cá nhân** – Sinh viên thực hiện: An Đức Mạnh (MSSV 23110310)

## Tài liệu dự án

| Tài liệu | Nội dung |
|---|---|
| [docs/01-project-charter.md](docs/01-project-charter.md) | Đề tài, mục tiêu, câu hỏi nghiên cứu, phạm vi, rủi ro |
| [docs/02-wbs.md](docs/02-wbs.md) | Cấu trúc phân rã công việc |
| [docs/03-gantt.md](docs/03-gantt.md) | Tiến độ 12 tuần, đường găng |

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Backend | Node.js 24 LTS · Express 5 (CommonJS) · MongoDB + Mongoose · JWT · express-validator · helmet · express-rate-limit |
| Frontend | React 19 · Vite · TypeScript · React Router 7 · Axios |
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
│  │  │  ├─ post/           Kèo: model + quy tắc nghiệp vụ (post.rules.js)
│  │  │  └─ parser/         Bộ trích xuất bài đăng dựa trên luật
│  │  └─ utils/             AppError, asyncHandler, giờ VN, chính sách mật khẩu, dữ liệu mẫu
│  └─ tests/                Mỗi module một thư mục test
├─ frontend/                React + TypeScript (package.json riêng)
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
npm install
npm run dev                 # http://localhost:5173
```

### Kiểm thử

| Lệnh | Việc làm |
|---|---|
| `cd backend && npm test` | Test backend (MongoDB chạy trong RAM, không cần cài) |
| `cd backend && npm run test:coverage` | Kèm báo cáo coverage (`backend/coverage/index.html`) |
| `cd frontend && npm test` | Test frontend |
| `cd frontend && npm run lint && npm run build` | Kiểm tra code và build frontend |

## Trạng thái

| Chức năng | Trạng thái |
|---|---|
| Quy tắc nghiệp vụ của kèo, bộ trích xuất bài đăng | ✅ Có test |
| Đăng ký, đăng nhập, đổi mật khẩu, hồ sơ (`/api/auth`, `/api/users`) | ✅ |
| API kèo: danh sách, chi tiết, tạo, tham gia / rời (`/api/posts`), `/api/parse` | 🔄 Đang làm |
| Frontend nối với API mới | 🔄 Đang làm |

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
