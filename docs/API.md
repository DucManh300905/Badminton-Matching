# Đặc tả API — Badminton Matching

> Cập nhật: 13/11/2026. Địa chỉ gốc khi chạy trên máy: `http://localhost:8080/api`.
> Tài liệu liên quan: [project.md](project.md) (quy tắc BR-xx) · [database.md](database.md)

## 1. Quy ước chung

### 1.1 Định dạng phản hồi

Thành công:
```json
{ "success": true, "message": "Đăng kèo thành công", "data": { } }
```
`message` có thể không có. `data` là đối tượng hoặc mảng tùy endpoint.

Lỗi:
```json
{
  "success": false,
  "message": "Giờ kết thúc phải sau giờ bắt đầu",
  "code": "VALIDATION_ERROR",
  "errors": [{ "field": "endsAt", "msg": "Giờ kết thúc phải sau giờ bắt đầu" }]
}
```
- `code`: mã lỗi máy đọc được (mục 4). **Frontend hiển thị theo `code`, không theo `message`.**
- `errors`: chỉ có khi lỗi gắn với từng trường. Trường lồng nhau ghi dạng `slots.male`.

### 1.2 Mã HTTP

| Mã | Khi nào |
|---|---|
| 200 | Thành công |
| 201 | Tạo mới thành công (đăng ký, đăng kèo) |
| 400 | Dữ liệu không hợp lệ |
| 401 | Chưa đăng nhập, token sai / hết hạn, sai email hoặc mật khẩu |
| 403 | Đã đăng nhập nhưng không có quyền (vd không phải chủ kèo) |
| 404 | Không tìm thấy (kể cả id sai định dạng) |
| 409 | Xung đột trạng thái (kèo đủ người, đã tham gia, email trùng…) |
| 413 | Body lớn hơn 100 KB |
| 429 | Thử quá nhiều lần |
| 500 | Lỗi máy chủ (không trả chi tiết ra ngoài) |

### 1.3 Xác thực

- Đăng ký / đăng nhập trả `token` (JWT, hạn **7 ngày**).
- Gửi kèm mọi request cần đăng nhập: `Authorization: Bearer <token>`.
- Mỗi request, server đọc lại người dùng trong CSDL. Token mất hiệu lực ngay khi tài khoản bị xóa hoặc người dùng **đổi mật khẩu**.
- Không có refresh token; hết hạn thì đăng nhập lại.

### 1.4 Giới hạn và bảo mật

| Hạng mục | Giá trị |
|---|---|
| Kích thước body | ≤ 100 KB |
| Đăng nhập sai | ≤ 10 lần / 15 phút / IP (chỉ đếm lần sai) |
| Đăng ký | ≤ 10 tài khoản / giờ / IP |
| Đổi mật khẩu sai | ≤ 5 lần / 15 phút / IP |
| CORS | Chỉ cho phép địa chỉ trong biến `CLIENT_URL` |
| Header bảo mật | helmet (nosniff, chống nhúng iframe…); không có `X-Powered-By` |

Phản hồi của các endpoint có giới hạn kèm header chuẩn `RateLimit` (vd `"10-in-15min"; r=9; t=900`).

### 1.5 Dạng dữ liệu dùng chung

**User**
```json
{ "id": "665f…", "email": "minh@example.com", "displayName": "Minh", "gender": "male", "level": "TB",
  "bankAccount": { "bankBin": "970436", "accountNumber": "0123456789", "accountName": "NGUYEN VAN MINH" } }
```
- `bankAccount` (tài khoản nhận tiền) chỉ có khi người dùng đã nhập; chỉ trả cho chính chủ.

**PostSummary** (danh sách kèo)
```json
{
  "id": "665f…",
  "courtName": "Sân Cầu Giấy",
  "district": "Cầu Giấy",
  "address": null,
  "startsAt": "2026-11-14T12:00:00.000Z",
  "endsAt": "2026-11-14T14:00:00.000Z",
  "levelMin": "TB_MINUS",
  "levelMax": "TB_PLUS",
  "pricePerPerson": 50000,
  "slots": { "male": 2, "female": 1, "any": 0 },
  "remaining": { "male": 2, "female": 0, "any": 0 },
  "participantCount": 1,
  "status": "open",
  "note": null,
  "author": { "id": "665f…", "displayName": "Minh" }
}
```
- Thời gian là chuỗi ISO 8601, giờ UTC.
- `slots`: số chỗ **cần thêm** theo loại; `remaining`: số chỗ còn trống.
- `status`: `open` (còn chỗ) · `full` (đủ người) · `closed` (chủ kèo đã hủy).

**PostDetail** = PostSummary + danh sách người tham gia:
```json
"participants": [
  { "id": "665f…", "displayName": "Lan", "gender": "female", "level": "TB_MINUS", "slot": "female", "joinedAt": "2026-11-13T08:00:00.000Z", "paid": false }
]
```
- `paid` và `payment` (bên dưới) **chỉ có khi người xem là chủ kèo hoặc người đã tham gia** (gửi kèm token); khách và người ngoài kèo không thấy (BR-15).

**PostPayment** (`payment` trong PostDetail, WBS 4.8.1):
```json
"payment": {
  "amount": 50000,
  "available": true,
  "bank": { "bin": "970436", "shortName": "Vietcombank" },
  "accountNumber": "0123456789",
  "accountName": "NGUYEN VAN MINH",
  "summary": { "paidCount": 1, "participantCount": 2, "collected": 50000, "expected": 100000 },
  "content": "BM 70FB8C LAN",
  "qr": "00020101021238540010A000000727…6304ABCD",
  "paid": false
}
```
- `available`: kèo có thu tiền (`amount > 0`), chưa hủy và chủ kèo đã nhập tài khoản. Khi `false` thì `bank`, `accountNumber`, `accountName`, `qr` là `null`.
- `content`, `qr`, `paid` chỉ có với **người tham gia** (không có với chủ kèo). `qr` là chuỗi theo chuẩn **VietQR** (NAPAS / EMVCo), client vẽ thành mã QR; ứng dụng ngân hàng quét sẽ điền sẵn ngân hàng, số tài khoản, số tiền, nội dung.
- `content`: `BM <6 ký tự cuối mã kèo> <tên người chơi không dấu>`, tối đa 25 ký tự.
- Hệ thống **không giữ tiền và không tự biết ai đã chuyển**: chủ kèo đối chiếu tài khoản rồi đánh dấu bằng `PATCH …/payment`.

**Danh mục**

| Trường | Giá trị |
|---|---|
| `gender` | `male`, `female` |
| `level` (thấp → cao) | `YEU` (yếu / mới chơi), `TB_YEU`, `TB_MINUS` (TB-), `TB`, `TB_PLUS` (TB+ / TB khá), `KHA`, `GIOI` |
| `slot` | `male`, `female`, `any` (nam hoặc nữ) |
| `district` | Ba Đình, Hoàn Kiếm, Tây Hồ, Long Biên, Cầu Giấy, Đống Đa, Hai Bà Trưng, Hoàng Mai, Thanh Xuân, Nam Từ Liêm, Bắc Từ Liêm, Hà Đông, Khác |

## 2. Danh sách endpoint

| Phương thức | Đường dẫn | Đăng nhập | Mô tả |
|---|---|:-:|---|
| GET | `/health` | | Kiểm tra server đang chạy |
| POST | `/auth/register` | | Đăng ký (đăng nhập luôn) |
| POST | `/auth/login` | | Đăng nhập |
| PUT | `/auth/change-password` | Có | Đổi mật khẩu, trả token mới |
| GET | `/users/me` | Có | Thông tin của mình |
| PUT | `/users/me` | Có | Sửa tên, giới tính, trình độ |
| GET | `/users/me/posts` | Có | Kèo mình đã đăng và đã tham gia |
| PUT | `/users/me/bank-account` | Có | Lưu / sửa tài khoản nhận tiền |
| DELETE | `/users/me/bank-account` | Có | Xóa tài khoản nhận tiền |
| GET | `/posts` | | Danh sách kèo sắp diễn ra, có lọc |
| GET | `/posts/:id` | Tùy chọn | Chi tiết kèo; có token thì người trong kèo thấy thêm phần thanh toán |
| POST | `/posts` | Có | Đăng kèo |
| POST | `/posts/:id/join` | Có | Tham gia kèo |
| DELETE | `/posts/:id/join` | Có | Rời kèo |
| POST | `/posts/:id/cancel` | Có | Hủy kèo (chỉ chủ kèo) |
| PATCH | `/posts/:id/participants/:userId/payment` | Có | Đánh dấu đã / chưa trả tiền (chỉ chủ kèo) |
| POST | `/parse` | | Trích thông tin từ nội dung bài đăng |

## 3. Chi tiết endpoint

### 3.1 Xác thực

#### `POST /auth/register`
| Trường | Bắt buộc | Ràng buộc |
|---|:-:|---|
| `email` | Có | Email hợp lệ, ≤ 254 ký tự; tự bỏ khoảng trắng và chuyển chữ thường |
| `password` | Có | 8 ký tự – 72 byte; không thuộc danh sách mật khẩu phổ biến |
| `displayName` | Có | 2 – 50 ký tự |
| `gender` | Có | `male` / `female` |
| `level` | Có | Một giá trị trong danh mục trình độ |

- `201` → `data: { token, user }`
- `400 VALIDATION_ERROR` · `409 DUPLICATE` (email đã đăng ký, `errors: [{ field: "email" }]`) · `429 RATE_LIMITED`

#### `POST /auth/login`
Body: `{ email, password }`
- `200` → `data: { token, user }`
- `401 INVALID_CREDENTIALS`: dùng **chung** cho sai email và sai mật khẩu, thời gian phản hồi như nhau, nên không dò được email nào đã đăng ký.
- `400 VALIDATION_ERROR` · `429 RATE_LIMITED`

#### `PUT /auth/change-password`
Body: `{ currentPassword, newPassword }` (`newPassword` theo cùng chính sách như khi đăng ký)
- `200` → `data: { token }`: **mọi token cũ hết hiệu lực ngay**; client phải lưu token mới.
- `400 INVALID_PASSWORD` (sai mật khẩu hiện tại) · `400 VALIDATION_ERROR` · `401` · `429 RATE_LIMITED`

### 3.2 Người dùng

#### `GET /users/me`
`200` → `data: User`

#### `PUT /users/me`
Body (đều không bắt buộc): `{ displayName?, gender?, level? }`. Các trường khác (`email`, `password`…) bị bỏ qua.
- `200` → `data: User` · `400 VALIDATION_ERROR`

#### `GET /users/me/posts`
`200` → `data: { authored: PostSummary[], joined: PostSummary[] }`
- Mỗi danh sách tối đa 50 kèo, mới nhất trước, **gồm cả kèo đã qua và đã hủy**.

#### `PUT /users/me/bank-account`
| Trường | Bắt buộc | Ràng buộc |
|---|:-:|---|
| `bankBin` | Có | Mã BIN 6 số, thuộc danh sách ngân hàng (`backend/src/utils/banks.js`, theo danh sách của Ngân hàng Nhà nước) |
| `accountNumber` | Có | 6 – 19 chữ số; khoảng trắng, dấu chấm, gạch ngang được tự bỏ |
| `accountName` | Có | 2 – 50 chữ cái; server tự đổi sang **in hoa không dấu** (`Nguyễn Văn Minh` → `NGUYEN VAN MINH`) |

- `200` → `data: User` (có `bankAccount` đã chuẩn hóa) · `400 VALIDATION_ERROR` · `401`

#### `DELETE /users/me/bank-account`
- `200` → `data: User` (không còn `bankAccount`) · `401`

### 3.3 Kèo

#### `GET /posts`
| Tham số | Ví dụ | Ý nghĩa |
|---|---|---|
| `district` | `Cầu Giấy` | Khu vực |
| `date` | `2026-11-14` | Ngày theo **lịch Việt Nam** (UTC+7) |
| `level` | `TB` | Trình độ người xem: chỉ lấy kèo có `levelMin ≤ level ≤ levelMax` (BR-09) |

- Chỉ kèo **chưa bắt đầu** và **chưa hủy**; sắp theo giờ bắt đầu tăng dần; tối đa 100 kèo.
- `200` → `data: PostSummary[]` · `400 VALIDATION_ERROR` (tham số sai)

#### `GET /posts/:id`
- Không bắt buộc đăng nhập. Gửi kèm token thì: chủ kèo và người đã tham gia nhận thêm `participants[].paid` và `payment`; token hỏng hoặc hết hạn thì coi như khách (không báo 401).
- `200` → `data: PostDetail` · `404 NOT_FOUND`

#### `POST /posts`
| Trường | Bắt buộc | Ràng buộc |
|---|:-:|---|
| `courtName` | Có | 1 – 100 ký tự |
| `district` | Có | Một khu vực trong danh mục |
| `address` | | ≤ 200 ký tự |
| `startsAt`, `endsAt` | Có | ISO 8601; BR-01, BR-02 |
| `levelMin`, `levelMax` | Có | Danh mục trình độ; BR-03 |
| `pricePerPerson` | Có | Số nguyên 0 – 1.000.000; BR-04 |
| `slots.male`, `slots.female`, `slots.any` | | Số nguyên 0 – 20, mặc định 0; tổng 1 – 20 (BR-05) |
| `note` | | ≤ 1000 ký tự |
| `rawText` | | ≤ 5000 ký tự: nội dung bài gốc đã dán (lưu để đánh giá bộ trích xuất, **không** trả ra API) |

- `201` → `data: PostDetail` (`status: "open"`, `participants: []`)
- `400 VALIDATION_ERROR` · `401`
- Chủ kèo, trạng thái, người tham gia luôn do server đặt; client gửi lên sẽ bị bỏ qua.

#### `POST /posts/:id/join`
- `200` → `data: PostDetail` (đã thêm mình)
- `409`: `POST_NOT_OPEN` · `POST_STARTED` · `IS_AUTHOR` · `ALREADY_JOINED` · `LEVEL_MISMATCH` · `NO_SLOT` (BR-06…BR-10)
- `409 SYSTEM_BUSY`: xung đột ghi kéo dài bất thường; thử lại được
- `401` · `404 NOT_FOUND`

#### `DELETE /posts/:id/join`
- `200` → `data: PostDetail` (kèo `full` sẽ mở lại `open`, BR-12)
- `409`: `NOT_JOINED` · `POST_STARTED` · `POST_NOT_OPEN` (kèo đã hủy)
- `401` · `404 NOT_FOUND`

#### `POST /posts/:id/cancel`
- `200` → `data: PostDetail` (`status: "closed"`)
- `403 NOT_AUTHOR` · `409 POST_STARTED` · `409 POST_NOT_OPEN` (đã hủy trước đó) · `401` · `404 NOT_FOUND`

#### `PATCH /posts/:id/participants/:userId/payment`
Body: `{ "paid": true }` hoặc `{ "paid": false }` (đúng kiểu boolean).
- Chủ kèo đánh dấu người tham gia `userId` đã / chưa chuyển tiền (BR-14). Làm được cả sau giờ chơi, trừ khi kèo đã hủy.
- `200` → `data: PostDetail` (đã cập nhật `paid`, `payment.summary`)
- `403 NOT_AUTHOR` · `409 NOT_JOINED` (người đó không tham gia kèo) · `409 POST_NOT_OPEN` (kèo đã hủy) · `400 VALIDATION_ERROR` · `401` · `404 NOT_FOUND`

### 3.4 Bộ trích xuất

#### `POST /parse`
Body: `{ "text": "Tối nay 19h-21h sân Cầu Giấy thiếu 2 nam 1 nữ TB- đến TB+, 50k/ng" }` (1 – 5000 ký tự)

`200`:
```json
{
  "success": true,
  "data": {
    "dayOffset": 0,
    "start": { "hour": 19, "minute": 0 },
    "end": { "hour": 21, "minute": 0 },
    "slots": { "male": 2, "female": 1, "any": 0 },
    "levelMin": "TB_MINUS",
    "levelMax": "TB_PLUS",
    "pricePerPerson": 50000,
    "confidence": 1
  }
}
```
- Chỉ trả các trường trích được. `dayOffset`: 0 hôm nay, 1 mai, 2 ngày kia. `weekday`: 0 Chủ nhật … 6 Thứ bảy.
- `confidence`: số nhóm trường trích được (thời gian, chi phí, số chỗ, trình độ) chia 4.
- Nội dung không được lưu lại.
- `400 VALIDATION_ERROR`

## 4. Mã lỗi

| `code` | HTTP | Ý nghĩa | Thông báo hiển thị ở frontend |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | Dữ liệu sai / JSON hỏng | Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại. |
| `INVALID_PASSWORD` | 400 | Sai mật khẩu hiện tại khi đổi mật khẩu | Mật khẩu hiện tại không đúng. |
| `UNAUTHORIZED` | 401 | Không gửi token | Vui lòng đăng nhập để tiếp tục. |
| `TOKEN_EXPIRED` | 401 | Token sai, hết hạn, hoặc đã đổi mật khẩu | Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại. |
| `INVALID_CREDENTIALS` | 401 | Sai email hoặc mật khẩu | Email hoặc mật khẩu không đúng. |
| `NOT_AUTHOR` | 403 | Không phải chủ kèo (hủy kèo, đánh dấu đã trả) | Chỉ chủ kèo mới làm được thao tác này. |
| `NOT_FOUND` | 404 | Không tìm thấy / đường dẫn sai | Không tìm thấy dữ liệu. |
| `DUPLICATE` | 409 | Trùng dữ liệu duy nhất (email) | Email này đã được đăng ký. |
| `POST_NOT_OPEN` | 409 | Kèo đủ người hoặc đã hủy | Kèo đã đủ người hoặc đã bị hủy. |
| `POST_STARTED` | 409 | Kèo đã bắt đầu | Kèo đã bắt đầu, không thể thay đổi. |
| `IS_AUTHOR` | 409 | Chủ kèo tự tham gia | Bạn là chủ kèo này. |
| `ALREADY_JOINED` | 409 | Đã tham gia rồi | Bạn đã tham gia kèo này rồi. |
| `NOT_JOINED` | 409 | Rời kèo chưa tham gia; đánh dấu đã trả cho người không trong kèo | Bạn chưa tham gia kèo này. |
| `LEVEL_MISMATCH` | 409 | Trình độ ngoài khoảng của kèo | Trình độ của bạn không nằm trong khoảng kèo yêu cầu. |
| `NO_SLOT` | 409 | Hết chỗ hợp giới tính | Kèo không còn chỗ phù hợp với giới tính của bạn. |
| `SYSTEM_BUSY` | 409 | Xung đột ghi CSDL | Hệ thống đang bận, vui lòng thử lại. |
| `PAYLOAD_TOO_LARGE` | 413 | Body quá lớn | Nội dung gửi lên quá lớn. |
| `RATE_LIMITED` | 429 | Thử quá nhiều lần | Bạn thử quá nhiều lần, vui lòng đợi ít phút rồi thử lại. |
| `INTERNAL_ERROR` | 500 | Lỗi không lường trước | Máy chủ gặp lỗi, vui lòng thử lại sau. |

Bảng ánh xạ ở frontend: `frontend/src/api/client.ts` (`CODE_MESSAGES`). Thêm mã lỗi mới thì cập nhật **cả hai nơi**.
