# Kế hoạch chất lượng — Badminton Matching

> Cập nhật: 13/11/2026.
> Tài liệu liên quan: [RISKS.md](RISKS.md) · [project.md](project.md) (quy tắc BR-xx) · [API.md](API.md) · [GIT.md](GIT.md) · [Charter](01-project-charter.md) (mục tiêu O3, O5; câu hỏi nghiên cứu RQ1–RQ3)

**QA** (đảm bảo chất lượng) là các biện pháp phòng ngừa trong lúc làm, để lỗi khó xảy ra.
**QC** (kiểm soát chất lượng) là các ca kiểm tra trên sản phẩm để phát hiện lỗi; mỗi ca có kết quả mong đợi và bằng chứng.

## 1. Tổng hợp

| ID | Hạng mục | Ngưỡng đạt | Hiện trạng (13/11/2026) |
|---|---|---|---|
| Q1 | Đúng nghiệp vụ | 0 test lỗi trên CI ở mọi PR; 13/13 quy tắc BR có test; coverage dòng backend ≥ 80% | **Đạt**: 160 test backend + 41 test frontend; 13/13 BR; coverage dòng 99,25% |
| Q2 | Bảo mật | 0 bí mật trong repo; 0 lỗ hổng mức cao trong thư viện chạy thật; các ca tấn công ở mục Q2 đều bị chặn | **Đạt**, xem mục Q2 |
| Q3 | Hiệu năng | `GET /api/posts` ≤ 300 ms (trung vị 20 lần) với ≥ 100 kèo; gói JS ≤ 150 KB (gzip) | **Một phần**: 7,7 ms với 5 kèo (chưa đo với 100 kèo); gói JS 113,5 KB |
| Q4 | Dễ dùng | Luồng chính chạy được trên màn hình 390 px; 0 thông báo lỗi tiếng Anh ở luồng chính; thời gian tạo bài giảm ≥ 50% nhờ "dán bài → tự điền" (RQ2) | **Một phần**: 2 kịch bản E2E đạt; RQ2 chưa đo |
| Q5 | Độ chính xác bộ trích xuất | F1 trung bình theo trường ≥ 0,75 (luật) và ≥ 0,90 (kết hợp) trên tập kiểm tra 60 bài (RQ1) | **Chưa đo**: chờ bộ dữ liệu gán nhãn (WBS 2.2) |

---

## Q1 — Đúng nghiệp vụ

**Biện pháp QA:**
- Quy tắc nghiệp vụ viết thành hàm thuần trong `post.rules.js`, có mã BR-xx; mỗi quy tắc có test ghi rõ mã trong tên test.
- Test viết cùng lúc với tính năng: Jest + Supertest; MongoDB chạy trong RAM **dạng replica set** để test được cả transaction.
- Kiểm tra dữ liệu hai lớp: express-validator ở route, schema Mongoose ở model.
- Mọi thay đổi vào `develop` đi qua Pull Request; CI phải xanh mới được merge ([GIT.md](GIT.md) mục 4).
- Ngưỡng coverage cấu hình trong `backend/package.json`: dòng / hàm / câu lệnh ≥ 80%, nhánh ≥ 70%. Thấp hơn thì CI đỏ.

**Ca kiểm tra QC:**

| Mã | Tình huống | Kết quả mong đợi | Bằng chứng |
|---|---|---|---|
| TC-Q1-01 | 5 người bấm tham gia **cùng lúc** kèo còn 2 chỗ | Đúng 2 người vào (200); 3 người nhận 409; kèo chuyển `full` | `tests/post/post.test.js`; chạy riêng 5 lần đều đạt; thử trên MongoDB thật cũng đạt |
| TC-Q1-02 | Nam tham gia kèo chỉ còn chỗ nữ | 409 `NO_SLOT` | `post.rules.test.js`, `post.test.js` |
| TC-Q1-03 | Kèo đầy có người rời | Kèo mở lại `open`, trả đúng loại chỗ | `post.test.js` |
| TC-Q1-04 | Chủ kèo tự tham gia; người lệch trình độ tham gia | 409 `IS_AUTHOR`; 409 `LEVEL_MISMATCH` | `post.test.js` |
| TC-Q1-05 | Người khác hủy kèo; chủ kèo hủy rồi có người vào | 403 `NOT_AUTHOR`; 409 `POST_NOT_OPEN` | `post.test.js` |
| TC-Q1-06 | Lọc kèo ngày mai lúc 5h30 sáng khi server chạy giờ UTC | Kèo nằm đúng ngày theo lịch Việt Nam | `post.test.js`, `utils/vnTime.test.js` |
| TC-Q1-07 | Đăng kèo giờ kết thúc trước giờ bắt đầu / ở quá khứ | 400, chỉ rõ trường `endsAt` / `startsAt` | `post.test.js` |

## Q2 — Bảo mật

**Biện pháp QA:**
- Mật khẩu: bcrypt 10 vòng; 8 ký tự – 72 byte; chặn danh sách mật khẩu phổ biến.
- JWT ký HS256, chỉ chấp nhận đúng thuật toán này; mỗi request đọc lại người dùng trong CSDL; đổi mật khẩu → `tokenVersion` tăng → mọi token cũ hết hiệu lực.
- Giới hạn số lần thử ([API.md](API.md) mục 1.4); helmet; CORS chỉ cho `CLIENT_URL`.
- Server **từ chối khởi động** nếu `JWT_SECRET` ngắn hơn 32 ký tự hoặc còn là giá trị mẫu.
- `.env`, dữ liệu thô, file ghi chú nội bộ nằm trong `.gitignore`; trước mỗi lần push kiểm tra bằng `git add --dry-run`.
- Kiểm tra thư viện: `npm audit --omit=dev` phải báo 0 lỗ hổng.

**Ca kiểm tra QC:**

| Mã | Tình huống | Kết quả mong đợi | Bằng chứng |
|---|---|---|---|
| TC-Q2-01 | Token giả, token ký bằng secret khác, token hết hạn | 401 `TOKEN_EXPIRED` | `tests/auth/security.test.js` |
| TC-Q2-02 | Tấn công đổi thuật toán JWT thành `none` | 401 | `security.test.js` |
| TC-Q2-03 | Dùng token cũ sau khi đổi mật khẩu | 401 ngay lập tức | `security.test.js` |
| TC-Q2-04 | Sai email và sai mật khẩu | Cùng 401 `INVALID_CREDENTIALS`, không lộ email nào đã đăng ký | `tests/auth/auth.test.js` |
| TC-Q2-05 | Đăng nhập sai liên tục | Vượt giới hạn → 429 `RATE_LIMITED`; đăng nhập đúng không bị đếm | `tests/auth/rate-limit.test.js` (kiểm tra cơ chế với giới hạn 3 lần; cấu hình thật 10 lần / 15 phút nằm ở `rateLimit.middleware.js`) |
| TC-Q2-06 | Client tự gửi `tokenVersion`, `email`, `author`, `status`, `participants` | Bị bỏ qua | `auth.test.js`, `user.test.js`, `post.test.js` |
| TC-Q2-07 | Xem chi tiết kèo / danh sách | Không có email người khác, không có `rawText` | `post.test.js` |
| TC-Q2-08 | Lỗi không lường trước ở server | 500 `INTERNAL_ERROR`, không trả chi tiết lỗi | `tests/utils/error-middleware.test.js` |

**Ghi nhận:** `npm audit` (kể cả thư viện dev) báo lỗ hổng trong thư viện con của **Jest** (`deepmerge`, `glob`). Đây là công cụ test, chỉ chạy trên máy dev và CI, không có trong bản chạy thật. Lệnh "sửa" mà npm gợi ý hạ Jest xuống bản 25 nên không áp dụng; theo dõi bản cập nhật của Jest ([RISKS.md](RISKS.md) R9).

## Q3 — Hiệu năng

**Biện pháp QA:**
- Index cho mọi truy vấn chính ([database.md](database.md) mục 4); lọc trình độ làm ngay trong MongoDB.
- Danh sách tối đa 100 kèo; "Kèo của tôi" tối đa 50 kèo mỗi loại.
- Người tham gia nhúng trong kèo: xem chi tiết chỉ cần 1 truy vấn và 2 lần populate.

**Kết quả đo (13/11/2026):**

| Chỉ số | Điều kiện đo | Kết quả | Ngưỡng |
|---|---|---|---|
| `GET /api/posts` | Máy dev, MongoDB trên máy, **5 kèo**, 20 lần | Trung vị 7,7 ms, lớn nhất 19,3 ms | ≤ 300 ms |
| `GET /api/posts?level=TB&district=…` | Như trên | Trung vị 5,0 ms | ≤ 300 ms |
| Gói JS frontend (gzip) | `npm run build` | 113,5 KB | ≤ 150 KB |
| Gói CSS (gzip) | `npm run build` | 3,0 KB | — |

**Việc còn lại:** đo lại `GET /api/posts` với **≥ 100 kèo** và trên máy chủ thật trước giai đoạn thử nghiệm thực tế (WBS 6.2). Kết quả với 5 kèo chưa đủ để kết luận.

## Q4 — Dễ dùng

**Biện pháp QA:**
- Giao diện thiết kế cho màn hình điện thoại trước; thanh điều hướng dưới đáy; nút chính lớn, dễ bấm.
- Mọi lỗi hiển thị bằng tiếng Việt theo `code` (bảng ở [API.md](API.md) mục 4).
- "Dán bài → tự điền": ô được điền tự động có nền vàng để người dùng kiểm tra lại.
- Bộ lọc nằm trên URL: tải lại trang hoặc gửi link vẫn giữ bộ lọc.

**Ca kiểm tra QC (chạy tay bằng trình duyệt Chrome tự động, màn hình 390 px):**

| Mã | Luồng | Kết quả |
|---|---|---|
| TC-Q4-01 | Xem danh sách → lọc → chưa đăng nhập bị chuyển sang Đăng nhập → đăng nhập → dán bài mẫu → tự điền → đăng kèo → người khác tham gia → "Kèo của tôi" → token hết hạn → chủ kèo hủy kèo → trang 404 | 14/14 bước đạt, 0 lỗi JavaScript |
| TC-Q4-02 | Đăng ký → sửa trình độ → đổi mật khẩu (nhập lại sai, sai mật khẩu hiện tại, đúng) → đăng xuất → đăng nhập bằng mật khẩu mới | 10/10 bước đạt |

**Việc còn lại:**
- Chuyển hai kịch bản trên thành bộ test E2E (Playwright) trong repo và chạy trên CI (WBS 5.3).
- Thử nghiệm A/B thời gian tạo bài với ≥ 10 người (RQ2, WBS 5.5).

## Q5 — Độ chính xác bộ trích xuất (RQ1)

**Biện pháp QA:**
- Bộ test mẫu cho từng nhóm trường và các trường hợp dễ nhầm ("Việt Nam" không phải 2 nam, "1 gậy" không phải 1 giờ, số điện thoại, "2 đôi" không phải tiền, Unicode tổ hợp từ Facebook): `tests/parser/parsePost.test.js`.

**Phương pháp đo (khi có dữ liệu):**
1. Bộ dữ liệu 200 bài, gán nhãn 4 nhóm trường; đo độ đồng thuận người gán nhãn bằng Cohen's κ (mục tiêu ≥ 0,8).
2. Chia 70% tập phát triển luật (140 bài), 30% tập kiểm tra **giữ kín** (60 bài).
3. Tính Precision / Recall / F1 cho từng trường trên tập kiểm tra, cho 3 phương pháp: luật, LLM, kết hợp.
4. Ghi kết quả và phân tích lỗi vào báo cáo đồ án.

---

## Cập nhật tài liệu này

Cập nhật cột **Hiện trạng** ở mục 1 tại mỗi mốc trong [Gantt](03-gantt.md), và mỗi khi thêm ca kiểm tra mới.
