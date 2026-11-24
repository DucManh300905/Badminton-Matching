# Đặc tả API — Badminton Matching

> Cập nhật: 24/11/2026. Địa chỉ gốc khi chạy trên máy: `http://localhost:8080/api`.
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
| 400 | Dữ liệu không hợp lệ (kể cả file không phải ảnh) |
| 401 | Chưa đăng nhập, token sai / hết hạn, sai email hoặc mật khẩu |
| 403 | Đã đăng nhập nhưng không có quyền (vd không phải chủ kèo) |
| 404 | Không tìm thấy (kể cả id sai định dạng) |
| 409 | Xung đột trạng thái (kèo đủ người, đã tham gia, email trùng…) |
| 413 | Body JSON lớn hơn 100 KB, hoặc ảnh lớn hơn 5 MB |
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
| Kích thước body | JSON ≤ 100 KB · ảnh ≤ 5 MB |
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
  "avatarUrl": "/uploads/avatars/3f9c…e1.webp",
  "bankAccount": { "bankBin": "970436", "accountNumber": "0123456789", "accountName": "NGUYEN VAN MINH" } }
```
- `bankAccount` (tài khoản nhận tiền) chỉ có khi người dùng đã nhập; chỉ trả cho chính chủ.
- `avatarUrl`: đường dẫn ảnh đại diện **cùng tên miền với web** (`null` = chưa có ảnh, giao diện dùng chữ cái đầu của tên). Mọi chỗ trả thông tin người khác (`author`, `participants[]`) cũng có `avatarUrl`.

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
  "coverUrl": "/uploads/covers/8a1d…07.webp",
  "author": { "id": "665f…", "displayName": "Minh", "avatarUrl": null }
}
```
- Thời gian là chuỗi ISO 8601, giờ UTC.
- `slots`: số chỗ **cần thêm** theo loại; `remaining`: số chỗ còn trống.
- `status`: `open` (còn chỗ) · `full` (đủ người) · `closed` (chủ kèo đã hủy).
- `coverUrl`: ảnh bìa của kèo (`null` = chưa có, giao diện dùng dải màu xanh mặc định).

**PostDetail** = PostSummary + danh sách người tham gia:
```json
"participants": [
  { "id": "665f…", "displayName": "Lan", "gender": "female", "level": "TB_MINUS", "slot": "female", "joinedAt": "2026-11-13T08:00:00.000Z", "paid": false, "attended": null, "amountDue": 80000, "paymentStatus": "unpaid" }
]
```
- `paid`, `attended` (điểm danh: `true` / `false` / `null` = chưa điểm danh), `amountDue` (số tiền người đó phải trả; `null` = chủ kèo chưa nhập khoản chi nào), `paymentStatus`, `costs` và `payment` (bên dưới) **chỉ có khi người xem là chủ kèo hoặc người đã tham gia** (gửi kèm token); khách và người ngoài kèo không thấy (BR-15).
- `pricePerPerson` là **chi phí dự kiến** chủ kèo nhập khi đăng, để tham khảo; số tiền thật tính theo các khoản chi.

**PostCosts** (`costs` trong PostDetail, WBS 4.8.2):
```json
"costs": {
  "updatedAt": "2026-11-25T15:00:00.000Z",
  "total": 620000,
  "guests": [{ "id": "6b05…", "name": "Tuấn" }],
  "expenses": [
    { "kind": "court", "label": null, "amount": 320000, "everyone": true, "sharedBy": [],
      "sharers": ["host", "u:665f…", "u:6660…", "g:6b05…"], "share": 80000 },
    { "kind": "food", "label": null, "amount": 300000, "everyone": false, "sharedBy": ["host", "u:665f…", "g:6b05…"],
      "sharers": ["host", "u:665f…", "g:6b05…"], "share": 100000 }
  ],
  "members": [
    { "ref": "host", "type": "host", "name": "Minh", "due": 180000 },
    { "ref": "u:665f…", "type": "user", "userId": "665f…", "name": "Lan", "due": 180000, "status": "unpaid", "diff": 0, "attended": null },
    { "ref": "u:6660…", "type": "user", "userId": "6660…", "name": "Hùng", "due": 80000, "status": "paid", "diff": 0, "attended": true },
    { "ref": "g:6b05…", "type": "guest", "name": "Tuấn", "due": 180000 }
  ]
}
```
- **Mã người** (`ref`): `host` (chủ kèo), `u:<userId>` (người tham gia qua app), `g:<id>` (bạn của chủ kèo **không dùng app**, chủ kèo thêm bằng tên).
- `kind`: `court` (tiền sân), `shuttle` (tiền cầu), `water` (tiền nước), `food` (tiền ăn), `other` (khác, có `label`).
- `everyone: true` ("Chọn tất cả") luôn tính theo danh sách người **hiện tại**, nên tự gồm người vào sau; người đã rời kèo tự bị loại khỏi phần chia.
- `due` của mỗi người = tổng (`amount` ÷ số người cùng chịu) của các khoản có người đó, làm tròn **lên** 1.000đ (BR-17). `null` khi chưa có khoản chi nào.
- `status` (người tham gia): `none` (không phải trả) · `unpaid` · `paid` · `owe` (còn thiếu `diff`) · `overpaid` (trả dư `diff`), BR-18.

**PostPayment** (`payment` trong PostDetail, WBS 4.8.1):
```json
"payment": {
  "hasCosts": true,
  "estimate": 50000,
  "bank": { "bin": "970436", "shortName": "Vietcombank" },
  "accountNumber": "0123456789",
  "accountName": "NGUYEN VAN MINH",
  "summary": { "paidCount": 1, "participantCount": 2, "collected": 80000, "expected": 260000 },
  "amount": 180000,
  "status": "owe",
  "toPay": 10000,
  "diff": 10000,
  "paid": true,
  "paidAmount": 170000,
  "available": true,
  "content": "BM 70FB8C LAN",
  "qr": "00020101021238540010A000000727…6304ABCD"
}
```
- `hasCosts: false` (chủ kèo chưa nhập khoản chi nào) → **chưa có mã QR**; `estimate` là chi phí dự kiến để tham khảo.
- `summary` chỉ tính **người tham gia qua app** phải trả > 0; `collected` = tổng `paidAmount` của người đã được đánh dấu.
- Chỉ có với **chủ kèo**: `canEditCosts` (kèo chưa hủy), `canMarkAttendance` (kèo chưa hủy và đã tới giờ bắt đầu).
- Chỉ có với **người tham gia**: `amount` (phần của mình), `status`, `toPay` (số còn phải chuyển), `diff`, `paid`, `paidAmount` (số tiền lúc được đánh dấu đã trả), `attended`, `available`, `content`, `qr`.
- `available`: còn tiền phải chuyển, kèo chưa hủy, chủ kèo đã nhập tài khoản. `qr` là chuỗi theo chuẩn **VietQR** (NAPAS / EMVCo) cho đúng số `toPay`; ứng dụng ngân hàng quét sẽ điền sẵn ngân hàng, số tài khoản, số tiền, nội dung.
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
| PUT | `/users/me/avatar` | Có | Tải ảnh đại diện (multipart) |
| DELETE | `/users/me/avatar` | Có | Xóa ảnh đại diện |
| GET | `/posts` | | Danh sách kèo sắp diễn ra, có lọc |
| GET | `/posts/:id` | Tùy chọn | Chi tiết kèo; có token thì người trong kèo thấy thêm phần thanh toán |
| POST | `/posts` | Có | Đăng kèo |
| POST | `/posts/:id/join` | Có | Tham gia kèo |
| DELETE | `/posts/:id/join` | Có | Rời kèo |
| POST | `/posts/:id/cancel` | Có | Hủy kèo (chỉ chủ kèo) |
| PATCH | `/posts/:id/participants/:userId/payment` | Có | Đánh dấu đã / chưa trả tiền (chỉ chủ kèo) |
| PUT | `/posts/:id/costs` | Có | Lưu các khoản chi + bạn không dùng app (chỉ chủ kèo) |
| PUT | `/posts/:id/attendance` | Có | Điểm danh, từ giờ bắt đầu (chỉ chủ kèo) |
| PUT | `/posts/:id/cover` | Có | Tải ảnh bìa (multipart, chỉ chủ kèo) |
| DELETE | `/posts/:id/cover` | Có | Xóa ảnh bìa (chỉ chủ kèo) |

Ảnh tải lên được phục vụ tĩnh tại `/uploads/avatars/<file>` và `/uploads/covers/<file>` (không qua `/api`; máy chủ chạy thật do Nginx phục vụ).

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

#### `PUT /users/me/avatar`
Gửi `multipart/form-data`, một file ở trường **`image`**.
- Nhận **JPEG, PNG, WebP**, tối đa **5 MB**. Định dạng được kiểm tra theo **nội dung file**, không tin phần mở rộng hay `Content-Type`.
- Server xoay ảnh theo EXIF, cắt vuông **256×256** (ưu tiên vùng nổi bật), đổi sang **WebP** chất lượng 80 và **bỏ toàn bộ metadata (EXIF, GPS)**. Tên file ngẫu nhiên 32 ký tự hex; ảnh cũ bị xóa.
- `200` → `data: User` (có `avatarUrl` mới) · `400 INVALID_IMAGE` (không có file, không phải ảnh, GIF…) · `413 FILE_TOO_LARGE` · `401`

#### `DELETE /users/me/avatar`
- `200` → `data: User` (`avatarUrl: null`), xóa file ảnh · `401`

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
| `pricePerPerson` | Có | Số nguyên 0 – 1.000.000; BR-04. Là **chi phí dự kiến** mỗi người (để tham khảo) |
| `slots.male`, `slots.female`, `slots.any` | | Số nguyên 0 – 20, mặc định 0; tổng 1 – 20 (BR-05) |
| `note` | | ≤ 1000 ký tự |

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
- Chủ kèo đánh dấu người tham gia `userId` đã / chưa chuyển tiền (BR-14). Làm được cả sau giờ chơi, trừ khi kèo đã hủy. Khi đánh dấu đã trả, server lưu số tiền phải trả lúc đó (`paidAmount`) để sau này tính "còn thiếu" / "trả dư" (BR-18).
- `200` → `data: PostDetail` (đã cập nhật `paid`, `payment.summary`)
- `403 NOT_AUTHOR` · `409 NOT_JOINED` (người đó không tham gia kèo) · `409 POST_NOT_OPEN` (kèo đã hủy) · `400 VALIDATION_ERROR` · `401` · `404 NOT_FOUND`

#### `PUT /posts/:id/costs`
Lưu **toàn bộ** chi phí của kèo trong một lần (thay danh sách cũ):
```json
{
  "guests": [{ "key": "6b05…", "name": "Tuấn" }, { "key": "moi-1", "name": "Hòa" }],
  "expenses": [
    { "kind": "court", "amount": 320000, "everyone": true },
    { "kind": "food", "amount": 300000, "everyone": false, "sharedBy": ["host", "u:665f…", "g:moi-1"] },
    { "kind": "other", "label": "Gửi xe", "amount": 20000, "everyone": true }
  ]
}
```
| Trường | Ràng buộc |
|---|---|
| `guests[].key` | Id cũ (giữ nguyên) hoặc khóa tạm do client đặt cho người mới thêm; khoản chi tham chiếu bằng `g:<key>`, server cấp id thật và đổi lại tham chiếu |
| `guests[].name` | 1 – 30 ký tự; tối đa 20 người |
| `expenses[].kind` | `court`, `shuttle`, `water`, `food`, `other` (khoản `other` bắt buộc có `label` ≤ 40 ký tự) |
| `expenses[].amount` | Số nguyên 0 – 10.000.000; tối đa 30 khoản |
| `expenses[].everyone` | `true` = "Chọn tất cả" (gồm cả người vào sau) |
| `expenses[].sharedBy` | Khi `everyone: false`: ít nhất 1 mã người, đều phải có trong kèo |

- Chỉ chủ kèo, **bất cứ lúc nào** (trước, trong, sau buổi chơi), trừ kèo đã hủy (BR-16).
- `200` → `data: PostDetail` (có `costs`, `payment` theo số tiền mới)
- `403 NOT_AUTHOR` · `409 POST_NOT_OPEN` (kèo đã hủy) · `400 VALIDATION_ERROR` (trường `expenses[i]` hoặc `guests`) · `401` · `404 NOT_FOUND`

#### `PUT /posts/:id/attendance`
Body: `{ "attendance": [{ "userId": "665f…", "attended": false }] }` (chỉ những người cần đổi; mỗi người một lần).
- Chỉ chủ kèo, từ **giờ bắt đầu** trở đi, kèo chưa hủy. Điểm danh là số liệu bùng kèo; **không** tự đổi phần chia tiền (muốn người vắng không chịu khoản nào thì bỏ họ khỏi khoản đó).
- `200` → `data: PostDetail` · `403 NOT_AUTHOR` · `409 NOT_STARTED` · `409 POST_NOT_OPEN` · `400 VALIDATION_ERROR` · `401` · `404 NOT_FOUND`

#### `PUT /posts/:id/cover`
Gửi `multipart/form-data`, một file ở trường **`image`**; ràng buộc và cách xử lý giống ảnh đại diện, nhưng cắt theo khung **1200×630**.
- Chỉ chủ kèo, kèo chưa hủy (đăng xong mới tải ảnh: giao diện tạo kèo rồi gửi ảnh ngay sau đó).
- `200` → `data: PostDetail` (có `coverUrl` mới) · `403 NOT_AUTHOR` · `409 POST_NOT_OPEN` (kèo đã hủy) · `400 INVALID_IMAGE` · `413 FILE_TOO_LARGE` · `401` · `404 NOT_FOUND`

#### `DELETE /posts/:id/cover`
- `200` → `data: PostDetail` (`coverUrl: null`) · `403 NOT_AUTHOR` · `409 POST_NOT_OPEN` · `401` · `404 NOT_FOUND`

## 4. Mã lỗi

| `code` | HTTP | Ý nghĩa | Thông báo hiển thị ở frontend |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | Dữ liệu sai / JSON hỏng | Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại. |
| `INVALID_IMAGE` | 400 | Không gửi file, hoặc file không phải JPEG / PNG / WebP | Chỉ nhận ảnh JPEG, PNG hoặc WebP. |
| `INVALID_PASSWORD` | 400 | Sai mật khẩu hiện tại khi đổi mật khẩu | Mật khẩu hiện tại không đúng. |
| `UNAUTHORIZED` | 401 | Không gửi token | Vui lòng đăng nhập để tiếp tục. |
| `TOKEN_EXPIRED` | 401 | Token sai, hết hạn, hoặc đã đổi mật khẩu | Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại. |
| `INVALID_CREDENTIALS` | 401 | Sai email hoặc mật khẩu | Email hoặc mật khẩu không đúng. |
| `NOT_AUTHOR` | 403 | Không phải chủ kèo (hủy kèo, đánh dấu đã trả, sửa chi phí, điểm danh, ảnh bìa) | Chỉ chủ kèo mới làm được thao tác này. |
| `NOT_FOUND` | 404 | Không tìm thấy / đường dẫn sai | Không tìm thấy dữ liệu. |
| `DUPLICATE` | 409 | Trùng dữ liệu duy nhất (email) | Email này đã được đăng ký. |
| `POST_NOT_OPEN` | 409 | Kèo đủ người hoặc đã hủy | Kèo đã đủ người hoặc đã bị hủy. |
| `POST_STARTED` | 409 | Kèo đã bắt đầu | Kèo đã bắt đầu, không thể thay đổi. |
| `IS_AUTHOR` | 409 | Chủ kèo tự tham gia | Bạn là chủ kèo này. |
| `ALREADY_JOINED` | 409 | Đã tham gia rồi | Bạn đã tham gia kèo này rồi. |
| `NOT_JOINED` | 409 | Rời kèo chưa tham gia; đánh dấu đã trả cho người không trong kèo | Bạn chưa tham gia kèo này. |
| `NOT_STARTED` | 409 | Điểm danh trước giờ bắt đầu | Chỉ điểm danh được từ giờ bắt đầu kèo. |
| `LEVEL_MISMATCH` | 409 | Trình độ ngoài khoảng của kèo | Trình độ của bạn không nằm trong khoảng kèo yêu cầu. |
| `NO_SLOT` | 409 | Hết chỗ hợp giới tính | Kèo không còn chỗ phù hợp với giới tính của bạn. |
| `SYSTEM_BUSY` | 409 | Xung đột ghi CSDL | Hệ thống đang bận, vui lòng thử lại. |
| `PAYLOAD_TOO_LARGE` | 413 | Body quá lớn | Nội dung gửi lên quá lớn. |
| `FILE_TOO_LARGE` | 413 | Ảnh lớn hơn 5 MB | Ảnh tối đa 5 MB. |
| `RATE_LIMITED` | 429 | Thử quá nhiều lần | Bạn thử quá nhiều lần, vui lòng đợi ít phút rồi thử lại. |
| `INTERNAL_ERROR` | 500 | Lỗi không lường trước | Máy chủ gặp lỗi, vui lòng thử lại sau. |

Bảng ánh xạ ở frontend: `frontend/src/api/client.ts` (`CODE_MESSAGES`). Thêm mã lỗi mới thì cập nhật **cả hai nơi**.
