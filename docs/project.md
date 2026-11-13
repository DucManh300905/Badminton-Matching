# Tổng quan dự án — Badminton Matching

> Đồ án cá nhân: An Đức Mạnh (MSSV 23110310). Cập nhật: 13/11/2026.
> Tài liệu liên quan: [Charter](01-project-charter.md) · [API.md](API.md) · [database.md](database.md) · [QUALITY.md](QUALITY.md) · [RISKS.md](RISKS.md) · [GIT.md](GIT.md)

## 1. Mục tiêu và phạm vi

Nền tảng web giúp người chơi cầu lông **đăng kèo thiếu người, tìm kèo còn chỗ và tham gia ngay**, thay cho việc đăng bài tự do trong các hội nhóm Facebook. Điểm khác biệt là chức năng **dán bài → tự điền**: người dùng dán nội dung bài đăng quen thuộc (ví dụ *"Tối nay 19h-21h sân Cầu Giấy thiếu 2 nam 1 nữ TB- đến TB+, 50k/ng"*), hệ thống trích ra thời gian, chi phí, số chỗ và trình độ để điền sẵn form.

Phạm vi chi tiết, mục tiêu đo được và câu hỏi nghiên cứu: xem [Charter](01-project-charter.md) mục 3–5.

## 2. Công nghệ

| Phần | Công nghệ | Lý do chọn |
|---|---|---|
| Backend | Node.js 24 LTS, Express 5 (CommonJS) | Phổ biến, nhẹ; Node 24 còn được hỗ trợ tới 04/2028 |
| CSDL | MongoDB 8 + Mongoose 9 | Có transaction (chống tranh chỗ), có gói cloud miễn phí (Atlas M0) |
| Xác thực | JWT (hạn 7 ngày) + bcrypt | Không cần lưu phiên phía server |
| Kiểm tra dữ liệu | express-validator (ở route) + schema Mongoose (ở model) | Hai lớp bảo vệ |
| Bảo mật | helmet, cors, express-rate-limit | Header an toàn, chỉ cho frontend gọi, chống dò mật khẩu |
| Frontend | React 19, Vite, TypeScript, React Router 7, Axios | Kiểm tra kiểu khi build, phát hiện sớm khi API đổi |
| Giao diện | CSS thuần (`frontend/src/styles.css`) | Không phụ thuộc thư viện; giao diện dạng ứng dụng điện thoại |
| Kiểm thử | Jest + Supertest + MongoDB chạy trong RAM; Vitest + React Testing Library | Test chạy độc lập, không cần cài CSDL |
| CI | GitHub Actions | Chạy test trên mọi push và Pull Request |

## 3. Kiến trúc

### 3.1 Kiểu kiến trúc: modular monolith

Một ứng dụng backend duy nhất, chia **theo chức năng** (module). Mỗi module tự chứa routes → controller → service → model. Quy tắc nghiệp vụ của kèo tách riêng thành hàm thuần (`post.rules.js`), không phụ thuộc CSDL, nên kiểm thử nhanh và dễ đọc.

```mermaid
flowchart LR
    subgraph FE["Frontend (React, cổng 5173)"]
        P[pages] --> A[api/*.ts<br/>axios + JWT]
    end
    A -- "HTTP/JSON<br/>Authorization: Bearer" --> R

    subgraph BE["Backend (Express, cổng 8080)"]
        R[routes<br/>express-validator] --> C[controller]
        C --> S[service]
        S --> RU[post.rules.js<br/>quy tắc thuần]
        S --> M[model Mongoose]
        PR[parser/parsePost.js<br/>bộ trích xuất]
    end
    M --> DB[(MongoDB<br/>replica set)]
```

Luồng xử lý khi người dùng bấm **"Tham gia kèo"**:

1. Frontend gọi `POST /api/posts/:id/join` kèm JWT.
2. `auth.middleware` giải mã token, đọc lại người dùng trong CSDL (giới tính, trình độ).
3. `post.service` mở **transaction**: đọc kèo → `post.toRules()` → `rules.joinPost()` áp BR-06…BR-11 → ghi lại.
4. Nếu hai người bấm cùng lúc, MongoDB báo xung đột ghi cho transaction đến sau; transaction đó tự chạy lại, đọc thấy chỗ đã bị lấy và trả `409 NO_SLOT` / `POST_NOT_OPEN`.

### 3.2 Cấu trúc thư mục

```
backend/src/
├─ app.js                 Tạo app Express (dùng chung cho server và test)
├─ server.js              Đọc .env, kiểm tra cấu hình, kết nối MongoDB, mở cổng
├─ config/                database.js (kết nối + cảnh báo replica set), mongoose.js (plugin toJSON)
├─ middlewares/           auth, error, validate, rateLimit
├─ modules/
│  ├─ auth/               đăng ký, đăng nhập, đổi mật khẩu, ký JWT
│  ├─ user/               model User, hồ sơ, rule express-validator dùng chung
│  ├─ post/               model, rules (BR), service (transaction), serializer, routes
│  └─ parser/             bộ trích xuất bài đăng + route /api/parse
└─ utils/                 AppError, asyncHandler, hằng số, giờ VN, chính sách mật khẩu, script

frontend/src/
├─ api/                   client.ts (axios, JWT, dịch mã lỗi) + mỗi tài nguyên một file
├─ components/            Layout, TabBar, PageHeader, PostCard, Menu, Icon, RequireAuth, ui
├─ context/               AuthContext (trạng thái đăng nhập)
├─ pages/                 10 trang
├─ utils/                 hằng số, định dạng, chuyển đổi form, logic điều hướng
├─ types.ts               kiểu dữ liệu dùng chung
└─ styles.css             toàn bộ CSS
```

### 3.3 Nguyên tắc kỹ thuật

- **Không tin dữ liệu từ client:** route chỉ lấy đúng các trường cho phép; người dùng không tự đặt được chủ kèo, trạng thái, người tham gia, `tokenVersion`.
- **Không tin dữ liệu trong JWT:** mỗi request đọc lại người dùng trong CSDL.
- **Một định dạng lỗi duy nhất** `{ success, message, code, errors }`; frontend hiển thị theo `code` ([API.md](API.md) mục 4).
- **Giờ Việt Nam:** CSDL lưu UTC; mọi phép tính "ngày" (lọc theo ngày, dữ liệu mẫu) đi qua `utils/vnTime.js`, vì server và CI có thể chạy ở múi giờ khác.
- **Không lộ thông tin cá nhân:** API công khai chỉ trả tên hiển thị; không trả email người khác, không trả nội dung bài gốc (`rawText`).

## 4. Vai trò

| Vai trò | Làm được |
|---|---|
| Khách (chưa đăng nhập) | Xem, lọc danh sách kèo; xem chi tiết kèo; dùng thử "dán bài → tự điền" |
| Người chơi (đã đăng nhập) | Mọi quyền của khách + đăng kèo, tham gia / rời kèo, xem "Kèo của tôi", sửa hồ sơ, đổi mật khẩu |
| Chủ kèo | Người chơi đã đăng kèo đó: hủy kèo (BR-13); không tự tham gia kèo của mình (BR-07) |

## 5. Chức năng

| Mã | Chức năng | Màn hình | API | Trạng thái |
|---|---|---|---|---|
| F1 | Đăng ký, đăng nhập, đăng xuất | Đăng ký, Đăng nhập, Tài khoản | `/auth/register`, `/auth/login` | Xong |
| F2 | Hồ sơ, đổi mật khẩu | Hồ sơ cá nhân, Đổi mật khẩu | `/users/me`, `/auth/change-password` | Xong |
| F3 | Danh sách kèo + lọc khu vực / ngày / trình độ | Tìm kèo, Hôm nay | `GET /posts` | Xong |
| F4 | Đăng kèo + dán bài tự điền (dựa trên luật) | Đăng kèo | `POST /posts`, `POST /parse` | Xong |
| F5 | Chi tiết, tham gia, rời, hủy kèo | Chi tiết kèo | `/posts/:id/…` | Xong |
| F6 | Kèo của tôi (đã đăng / đã tham gia) | Kèo của tôi, Tài khoản | `GET /users/me/posts` | Xong |
| F7 | Bộ trích xuất bằng LLM và hybrid (RQ1) | Đăng kèo | `POST /parse` | Chưa |
| F8 | Thông báo email | — | — | Chưa (Should) |
| F9 | Đánh giá uy tín sau kèo | — | — | Chưa (Could) |

## 6. Quy tắc nghiệp vụ

Mỗi quy tắc có mã **BR-xx**. Mã này xuất hiện trong code (`backend/src/modules/post/post.rules.js`) và trong tên test, để tra ngược từ quy tắc tới code và bằng chứng kiểm thử.

| Mã | Quy tắc | Lỗi khi vi phạm | Test |
|---|---|---|---|
| BR-01 | Giờ bắt đầu kèo phải ở tương lai | 400 `VALIDATION_ERROR` (`startsAt`) | `post.rules.test.js`, `post.test.js` |
| BR-02 | Thời lượng kèo > 0 và ≤ 6 giờ | 400 `VALIDATION_ERROR` (`endsAt`) | `post.rules.test.js`, `post.test.js` |
| BR-03 | Trình độ tối thiểu ≤ trình độ tối đa | 400 `VALIDATION_ERROR` (`levelMin`) | `post.rules.test.js` |
| BR-04 | Chi phí mỗi người là số nguyên 0 – 1.000.000đ | 400 `VALIDATION_ERROR` (`pricePerPerson`) | `post.rules.test.js`, `post.model.test.js` |
| BR-05 | Tổng số chỗ 1 – 20, mỗi loại chỗ là số nguyên không âm | 400 `VALIDATION_ERROR` (`slots`) | `post.rules.test.js` |
| BR-06 | Chỉ tham gia kèo đang `open` và chưa bắt đầu | 409 `POST_NOT_OPEN` / `POST_STARTED` | `post.rules.test.js`, `post.test.js` |
| BR-07 | Chủ kèo không tự tham gia kèo của mình | 409 `IS_AUTHOR` | `post.rules.test.js`, `post.test.js` |
| BR-08 | Mỗi người tham gia một kèo tối đa một lần | 409 `ALREADY_JOINED` | `post.rules.test.js`, `post.test.js` |
| BR-09 | Trình độ người chơi phải nằm trong khoảng của kèo | 409 `LEVEL_MISMATCH` | `post.rules.test.js`, `post.test.js` |
| BR-10 | Ưu tiên chỗ dành cho đúng giới tính; hết thì dùng chỗ chung ("nam hoặc nữ") | 409 `NO_SLOT` | `post.rules.test.js`, `post.test.js` |
| BR-11 | Hết chỗ → kèo tự chuyển `full` | — | `post.rules.test.js`, `post.test.js` (5 người cùng lúc) |
| BR-12 | Chỉ rời kèo trước giờ bắt đầu; kèo `full` có người rời → mở lại `open` | 409 `POST_STARTED` / `NOT_JOINED` | `post.rules.test.js`, `post.test.js` |
| BR-13 | Chỉ chủ kèo được hủy kèo, chỉ trước giờ bắt đầu; kèo đã hủy ẩn khỏi danh sách, không ai tham gia / rời được | 403 `NOT_AUTHOR`, 409 `POST_STARTED` / `POST_NOT_OPEN` | `post.rules.test.js`, `post.test.js` |

### Vòng đời một kèo

```mermaid
stateDiagram-v2
    [*] --> open: Chủ kèo đăng (BR-01…05)
    open --> open: Có người tham gia, còn chỗ
    open --> full: Người cuối cùng tham gia (BR-11)
    full --> open: Có người rời (BR-12)
    open --> closed: Chủ kèo hủy (BR-13)
    full --> closed: Chủ kèo hủy (BR-13)
    closed --> [*]
```

Kèo đã qua giờ bắt đầu vẫn giữ trạng thái cũ trong CSDL, nhưng không còn hiện trong danh sách và không thay đổi được nữa (BR-06, BR-12, BR-13).

## 7. Bộ trích xuất bài đăng (dựa trên luật)

File `backend/src/modules/parser/parsePost.js`. Đầu vào là văn bản tiếng Việt tự do; đầu ra là các trường trích được và độ tin cậy (`confidence` = số nhóm trường trích được / 4).

| Nhóm | Cách viết hiểu được |
|---|---|
| Ngày | "tối nay", "mai", "ngày kia / mốt", "thứ 7", "T3", "CN", "chủ nhật" |
| Giờ | "19h-21h", "19:00 - 21:00", "7h-9h tối", "8h rưỡi", "5h30"; 1h–4h không có ngữ cảnh hiểu là buổi chiều |
| Chi phí | "50k", "50k/ng", "60.000đ", "45 nghìn"; ưu tiên giá có "/người" hơn giá thuê sân |
| Số chỗ | sau "thiếu / cần / tuyển / tìm / còn / giao lưu": "2 nam 1 nữ", "1 bạn", "2 slot", "hai nam" |
| Trình độ | "TB-", "TB", "TB+", "TB khá", "TB yếu", "khá", "giỏi", "mới chơi", "TB+ trở lên", "khá trở xuống" |

Bộ trích xuất không lấy tên, số điện thoại hay đường dẫn cá nhân. Đây là phương pháp nền (baseline) cho câu hỏi nghiên cứu RQ1; phương pháp LLM và kết hợp (F7) sẽ so sánh với nó trên bộ dữ liệu 200 bài gán nhãn.

## 8. Chạy dự án

Xem [README](../README.md) mục "Chạy dự án". Tài khoản mẫu sau `npm run seed:demo`: `minh`, `lan`, `hung`, `thu` `@example.com`, mật khẩu `Demo@123`.
