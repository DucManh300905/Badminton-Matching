# Kế hoạch chất lượng — Badminton Matching

> Cập nhật: 17/11/2026 (theo hạn hoàn thành dự án 15/12/2026).
> Tài liệu liên quan: [RISKS.md](RISKS.md) · [project.md](project.md) (quy tắc BR-xx) · [API.md](API.md) · [GIT.md](GIT.md) · [Charter](01-project-charter.md) (mục tiêu O3, O5; câu hỏi nghiên cứu RQ1–RQ3)

**QA** (đảm bảo chất lượng) là các biện pháp phòng ngừa trong lúc làm, để lỗi khó xảy ra.
**QC** (kiểm soát chất lượng) là các ca kiểm tra trên sản phẩm để phát hiện lỗi; mỗi ca có kết quả mong đợi và bằng chứng.

## 1. Tổng hợp

| ID | Hạng mục | Ngưỡng đạt | Hiện trạng (13/11/2026) |
|---|---|---|---|
| Q1 | Đúng nghiệp vụ | 0 test lỗi trên CI ở mọi PR; 18/18 quy tắc BR có test; coverage dòng backend ≥ 80% | **Đạt**: 209 test backend + 62 test frontend; 18/18 BR; coverage dòng ≥ 98% (25/11/2026); smoke test 17/17 trên máy chủ chạy thật (23/11/2026) |
| Q2 | Bảo mật | 0 bí mật trong repo; 0 lỗ hổng mức cao trong thư viện chạy thật; các ca tấn công ở mục Q2 đều bị chặn | **Đạt**, xem mục Q2 |
| Q3 | Hiệu năng | `GET /api/posts` ≤ 300 ms (trung vị 20 lần) với ≥ 100 kèo; gói JS ≤ 150 KB (gzip) | **Một phần**: 7,7 ms với 5 kèo (chưa đo với 100 kèo); gói JS 128,3 KB (thêm thư viện vẽ mã QR) |
| Q4 | Dễ dùng | Luồng chính chạy được trên màn hình máy tính 1366 px và điện thoại 390 px; 0 thông báo lỗi tiếng Anh ở luồng chính; usability test luồng chia tiền ≥ 8 người (WBS 5.5) | **Một phần**: 2 kịch bản E2E đạt; RQ2 chưa đo |
| Q5 | Số liệu nghiên cứu (Charter 2.0) | Xuất được số liệu ẩn danh cho RQ1–RQ3 (khoản chi, người cùng chịu, thời điểm đã trả, kèo đủ người); không có tên, email, số tài khoản | **Chưa**: chờ 4.8.2 và lệnh xuất số liệu (US-22). Q5 cũ (độ chính xác bộ trích xuất) đã bỏ 24/11/2026 |

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
| TC-Q1-08 | Smoke test trên **máy chủ chạy thật** (qua Cloudflare + Nginx): đăng ký, đăng nhập, đăng kèo, 3 người tranh 2 chỗ cùng lúc, rời, hủy | 16/16 bước đạt, tự dọn dữ liệu thử | `npm run smoke` với `SMOKE_API_URL=https://sv22.bcse-vju.com/api`, 23/11/2026 ([DEPLOY.md](DEPLOY.md) mục 4) |
| TC-Q1-09 | Mã QR chuyển khoản theo chuẩn VietQR: đủ trường, đúng BIN / số tài khoản / số tiền / nội dung, CRC16 đúng (mẫu chuẩn "123456789" → 29B1) | Mọi trường đúng; giải mã ảnh QR trên giao diện ra đúng chuỗi | `tests/utils/vietqr.test.js`; giải mã ảnh chụp màn hình bằng jsQR (24/11/2026) |
| TC-Q1-10 | Chủ kèo đánh dấu đã trả; người khác thử đánh dấu; đánh dấu người ngoài kèo; kèo đã hủy; người khác vào / rời kèo | 200; 403 `NOT_AUTHOR`; 409 `NOT_JOINED`; 409 `POST_NOT_OPEN`; trạng thái đã trả không mất (BR-14) | `tests/post/payment.test.js` |
| TC-Q1-11 | Chi phí theo từng khoản: sân chia tất cả + ăn chia 3 người; "Tất cả" gồm người vào sau; người rời bị loại; chia lẻ làm tròn lên; còn thiếu / trả dư sau khi đã trả; sửa sau giờ chơi; người khác sửa; kèo đã hủy; dữ liệu sai; điểm danh trước giờ bắt đầu | 180.000đ / 80.000đ đúng; 403, 409, 400 đúng trường (BR-16 → BR-18) | `tests/post/costs.rules.test.js`, `tests/post/payment.test.js` |

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
| TC-Q2-07 | Xem chi tiết kèo / danh sách | Không có email người khác; khách / người ngoài kèo không thấy chi phí, số tài khoản | `post.test.js` |
| TC-Q2-08 | Lỗi không lường trước ở server | 500 `INTERNAL_ERROR`, không trả chi tiết lỗi | `tests/utils/error-middleware.test.js` |
| TC-Q2-09 | Khách, người ngoài kèo, token hỏng xem chi tiết kèo có thu tiền | Không có số tài khoản, không có `payment` / `paid` (BR-15) | `tests/post/payment.test.js` |
| TC-Q2-10 | Tải ảnh có EXIF GPS; file giả ảnh, GIF, ảnh > 5 MB; không gửi file; không đăng nhập | Ảnh lưu ra không còn EXIF / GPS, đúng 256×256 / 1200×630 WebP; còn lại bị chặn: 400 `INVALID_IMAGE`, 413 `FILE_TOO_LARGE`, 401 | `tests/images.test.js` |
| TC-Q2-11 | Người không phải chủ kèo đổi / xóa ảnh bìa; đổi ảnh bìa kèo đã hủy | 403 `NOT_AUTHOR`; 409 `POST_NOT_OPEN` | `tests/images.test.js` |
| TC-Q2-12 | Ảnh bill: khách và người ngoài kèo xem chi tiết; người chơi tải ảnh; ảnh thứ 8; xóa file không thuộc kèo (`..%2F..`) | Không có `bills`; 403 `NOT_AUTHOR`; 409 `BILL_LIMIT`; 404 | `tests/post/bills.test.js` |
| TC-Q2-13 | Kho cầu: sửa / xóa loại cầu của người khác; khoản "Cầu" gửi mã loại cầu của người khác | 404; coi như nhập giá tay, kho người khác không đổi | `tests/shuttle/shuttle.test.js` |

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
- Giao diện theo thiết bị: **máy tính** (từ 1024 px) dùng bố cục web (thanh điều hướng trên cùng, nội dung rộng tối đa 1200 px, nhiều cột); **điện thoại / máy tính bảng** dùng giao diện kiểu app: thanh tab đáy 5 mục, thanh tiêu đề gọn có nút quay lại, chip lọc nhanh cuộn ngang (chọn ngày / khu vực bằng bộ chọn của điện thoại), nút hành động chính dính ở đáy; vùng bấm ≥ 44 px; chừa vùng tai thỏ / thanh home (safe-area).
- Cài lên màn hình chính như một app (PWA): manifest, biểu tượng 192 / 512 px (có bản maskable), chế độ `standalone`. Không dùng service worker để tránh người dùng bị kẹt ở bản cũ khi cập nhật.
- Mọi lỗi hiển thị bằng tiếng Việt theo `code` (bảng ở [API.md](API.md) mục 4).
- Chi phí theo từng khoản: xem trước số tiền của từng người ngay khi chủ kèo sửa; người tham gia thấy toàn bộ khoản chi và phần của mình.
- Bộ lọc nằm trên URL: tải lại trang hoặc gửi link vẫn giữ bộ lọc.

**Ca kiểm tra QC (chạy tay bằng trình duyệt Chrome tự động, màn hình 1366 px và 390 px):**

| Mã | Luồng | Kết quả |
|---|---|---|
| TC-Q4-01 | Xem danh sách → lọc → chưa đăng nhập bị chuyển sang Đăng nhập → đăng nhập → điền form → đăng kèo → người khác tham gia → "Kèo của tôi" → token hết hạn → chủ kèo hủy kèo → trang 404 | 14/14 bước đạt, 0 lỗi JavaScript |
| TC-Q4-02 | Đăng ký → sửa trình độ → đổi mật khẩu (nhập lại sai, sai mật khẩu hiện tại, đúng) → đăng xuất → đăng nhập bằng mật khẩu mới | 10/10 bước đạt |
| TC-Q4-03 | Mở bản chạy thật https://sv22.bcse-vju.com ở 1366 px và 390 px: trang chủ, gọi API danh sách kèo, mở thẳng `/dang-ky` | 6/6 bước đạt, 0 lỗi JavaScript của ứng dụng (23/11/2026) |
| TC-Q4-04 | Chủ kèo nhập tài khoản nhận tiền → người tham gia thấy mã QR, số tài khoản, nội dung → chủ kèo đánh dấu đã trả → người tham gia thấy "Đã trả" → khách không thấy gì | 11/11 bước đạt, 0 lỗi JavaScript (24/11/2026) |
| TC-Q4-06 | Chưa có khoản chi → người chơi chưa thấy mã QR → chủ kèo bấm ô "Thêm" để thêm bạn không dùng app, bấm ô "Sân" 320.000đ (tất cả) + ô "Ăn" 300.000đ (bấm bỏ 1 người), xem trước, lưu → người chơi thấy toàn bộ chi phí, mã QR 180.000đ, không có nút sửa → chủ kèo đánh dấu đã trả, thêm tiền nước → người chơi "còn thiếu" 10.000đ → khách không thấy chi phí → điện thoại 390 px: vuốt trái một khoản hiện nút Xóa, bấm thì xóa | 13/13 bước đạt, 0 lỗi JavaScript; giải mã mã QR "còn thiếu" ra đúng 10.000đ (25/11/2026; giao diện bấm chọn và vuốt xóa 25/11/2026) |
| TC-Q4-07 | Điện thoại 390 px: thanh tab đáy 5 mục (Tìm kèo, Hôm nay, Đăng kèo, Kèo của tôi, Tài khoản), thanh điều hướng trên bị ẩn, bấm tab chuyển trang, trang con có nút quay lại; chụp 12 màn hình ở 390 px và 1366 px | Đạt, không trang nào bị cuộn ngang, 0 lỗi JavaScript (24/11/2026) |
| TC-Q4-08 | Kiểm tra điều kiện cài như app bằng Chrome (`Page.getInstallabilityErrors`, `Page.getAppManifest`) | 0 lỗi installability, manifest không lỗi (24/11/2026) |
| TC-Q4-09 | Tải ảnh đại diện (hiện ở thanh trên, menu tài khoản, thẻ hồ sơ); chọn file không phải ảnh bị chặn ngay trên trình duyệt; đăng kèo kèm ảnh bìa (xem trước trước khi đăng); thẻ kèo có ảnh / dải màu mặc định, mọi thẻ có icon; xóa và thêm lại ảnh bìa trên điện thoại 390 px; xóa ảnh đại diện → chữ cái đầu | 15/15 bước đạt, không cuộn ngang, 0 lỗi JavaScript / console (24/11/2026) |
| TC-Q4-10 | Kho cầu: thêm loại cầu bằng nút "24 quả" + 560.000đ (23.333đ/quả), nhập thêm 12 quả 300.000đ (bình quân 23.889đ, thanh mức cầu 36/36) → khoản Cầu 30 quả = 717.000đ, kho còn 6 → sửa 40 quả: cảnh báo "Kho chỉ còn 36 quả", vẫn lưu, kho 0, thanh đỏ → 2 ảnh bill, xem lớn → người chơi xuất hóa đơn, bản in chỉ còn tờ hóa đơn, Chrome tạo PDF 1 trang → điện thoại 390 px không cuộn ngang → khách mở link hóa đơn phải đăng nhập | 23/23 bước đạt, 0 lỗi JavaScript / console (25/11/2026) |
| TC-Q4-11 | Điện thoại 390 px: thanh dưới Tìm kèo / Hôm nay / Đăng kèo / Kèo của tôi / Tổng quan; khách tìm "kho cau" ở Tổng quan, bấm thì sang Đăng nhập và quay lại đúng Kho cầu; nút tài khoản góc phải chỉ có Cài đặt, Đăng xuất; Cài đặt: bỏ "Hôm nay", thêm "Kho cầu", đưa lên trước, lưu → thanh dưới đổi, lưu theo tài khoản, tải lại vẫn giữ, khôi phục mặc định; chế độ Tối đổi ngay, tải lại không nháy trắng, Theo máy đổi theo máy không cần tải lại; đang tối nhưng bản in hóa đơn nền trắng; máy tính: thanh trên có Tổng quan, menu dọc sáng "Cài đặt" khi ở Hồ sơ, `/tai-khoan` chuyển sang `/tong-quan` | 27/27 bước đạt, không trang nào cuộn ngang (sáng và tối), 0 lỗi JavaScript / console (25/11/2026) |
| TC-Q4-05 | Quét mã QR bằng **2 ứng dụng ngân hàng khác nhau** (không cần chuyển tiền thật) | Ứng dụng điền sẵn đúng ngân hàng, số tài khoản, tên, số tiền, nội dung. **Chưa làm**: chờ kiểm tra bằng điện thoại thật (rủi ro R7) |

**Việc còn lại:**
- Chuyển hai kịch bản trên thành bộ test E2E (Playwright) trong repo và chạy trên CI (WBS 5.3).
- Usability test luồng đăng kèo, chia tiền theo khoản, thu tiền với ≥ 8 người (WBS 5.5).

---

## Cập nhật tài liệu này

Cập nhật cột **Hiện trạng** ở mục 1 tại mỗi mốc trong [Gantt](03-gantt.md), và mỗi khi thêm ca kiểm tra mới.
