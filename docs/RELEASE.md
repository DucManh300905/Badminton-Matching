# Phát hành và tự nghiệm thu

**Sinh viên thực hiện:** An Đức Mạnh – MSSV 23110310 · Đồ án cá nhân
> Cập nhật: 29/11/2026. Quy ước nhánh, tag và số phiên bản: [GIT.md](GIT.md) mục 5. Cách cập nhật máy chủ: [DEPLOY.md](DEPLOY.md) mục 5.

## 1. Các bản phát hành

| Bản | Ngày | Mốc | Nội dung chính |
|---|---|---|---|
| `v0.1.0` | 13/11/2026 | M0 | Charter, WBS, Gantt; lõi nghiệp vụ ghép kèo, unit test, CI |
| `v0.2.0` | 23/11/2026 | M1 | Fullstack chạy thật tại https://sv22.bcse-vju.com: đăng ký / đăng nhập, tìm và lọc kèo, đăng kèo, tham gia / rời / hủy, Kèo của tôi |
| `v0.9.0` | 30/11/2026 | M2 | Chia chi phí theo từng khoản, thu tiền QR và các tiện ích quanh kèo (mục 2) |
| `v1.0.0` | 15/12/2026 (dự kiến) | M5 | Hoàn thành dự án (mục 4) |

## 2. Ghi chú phát hành v0.9.0

### 2.1 Tính năng mới (PR #16 – #39)

- **Thu tiền bằng mã QR** (US-32): chủ kèo lưu tài khoản ngân hàng; người tham gia thấy mã VietQR có đúng số tiền và nội dung chứa mã kèo; chủ kèo đánh dấu "Đã trả".
- **Chi phí theo từng khoản** (US-33): sân, cầu, nước, ăn, khác; chọn ai cùng chịu từng khoản (có "Chọn tất cả", tích chọn nhanh); thêm bạn không dùng app bằng tên; làm tròn lên 1.000đ; người đã trả mà chi phí tăng thấy phần còn thiếu.
- **Kho cầu** (US-37): nhiều loại cầu, nhập nhanh 12 / 24 / 36 quả, giá bình quân, thanh mức cầu, tự trừ / hoàn khi lưu chi phí, thống kê theo tuần / tháng.
- **Ảnh bill và hóa đơn** (US-38): tối đa 7 ảnh bill; trang hóa đơn có mã QR, lưu PDF ngay trong trình duyệt (dùng được cả khi mở như ứng dụng trên điện thoại).
- **Ảnh chuyển khoản** (US-41): người chơi gửi tối đa 3 ảnh; chủ kèo nhận email và thấy nhãn "Chờ xác nhận".
- **Nhắn tin** (US-40): nhóm chat theo kèo và nhắn riêng, tin đến ngay qua WebSocket, đếm tin chưa đọc, chặn người nhắn riêng.
- **Tổng quan, Cài đặt, chế độ tối** (US-39): mọi tiện ích ở một trang có tìm kiếm không dấu; tự chọn 3 tiện ích ở thanh dưới, lưu theo tài khoản; Sáng / Tối / Theo máy.
- **Chia sẻ kèo và tin tổng kết** (US-14, US-35); **cài lên màn hình chính** (US-34).
- **Quên mật khẩu bằng mã OTP 4 số** (US-42): hiệu lực 10 phút, sai 5 lần thì hủy mã; đặt xong thì các máy khác phải đăng nhập lại.
- **Số điện thoại** (US-43): không bắt buộc; chỉ người cùng kèo thấy, có nút gọi và mở Zalo.
- **Giao diện**: icon SVG nét mảnh, ảnh đại diện và ảnh bìa (cắt, đổi WebP, xóa GPS); "Hôm nay" thành một bộ lọc ở trang tìm kèo.
- **Nhật ký sự kiện của kèo** (US-22, đợt 1): ghi tham gia, rời, đủ người, mở lại, hủy, lưu chi phí, đã trả, ảnh chuyển khoản, điểm danh; chỉ mã và số, không thông tin cá nhân.

### 2.2 Thay đổi phá vỡ

- **Bỏ bộ trích xuất bài đăng** (Charter 2.0, 24/11/2026): không còn "dán bài → tự điền" ở trang đăng kèo.
- **Bỏ link đặt lại mật khẩu**: `/dat-lai-mat-khau` chuyển về `/quen-mat-khau`; link trong thư cũ không còn dùng được.
- Thanh dưới đổi ô cuối từ "Tài khoản" thành "Tổng quan"; menu Tài khoản (góc phải trên) chỉ còn Cài đặt và Đăng xuất.

### 2.3 Cấu hình máy chủ (`backend/.env`)

Biến mới so với `v0.2.0` (giá trị không ghi ở đây; mẫu trong `backend/.env.example`):

| Biến | Dùng cho | Bắt buộc |
|---|---|---|
| `UPLOAD_DIR` | Thư mục lưu ảnh, nằm ngoài repo | Có |
| `APP_URL` | Link trong email | Có |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Gửi mã OTP, email ảnh chuyển khoản, hóa đơn | Không: thiếu thì không gửi thư, mọi thao tác khác vẫn chạy |

### 2.4 Nâng cấp

1. Thêm các biến ở mục 2.3 vào `backend/.env` trên máy chủ, tạo thư mục `UPLOAD_DIR` ([DEPLOY.md](DEPLOY.md) mục 3.4).
2. Chạy `bash deploy/deploy.sh main` trên máy chủ.
3. Kiểm tra theo [DEPLOY.md](DEPLOY.md) mục 4; footer hiện `v0.9.0`.

Không cần chuyển đổi dữ liệu: các trường mới đều có giá trị mặc định; collection mới (`shuttles`, `chats`, `chatreads`, `postevents`…) tự tạo khi dùng lần đầu.

### 2.5 Giới hạn còn biết

- **US-22 chưa xong**: đã ghi nhật ký sự kiện nhưng chưa có lệnh xuất CSV ẩn danh; làm trước `v1.0.0`.
- **Chưa có số liệu thử nghiệm thực tế**: chưa có người dùng ngoài tài khoản thử; nhật ký chỉ có từ 28/11/2026.
- **US-24, US-28 một phần**: chưa giới hạn số kèo đang mở / kèo trong ngày; chưa có phản hồi khi bị đánh dấu "Không đến".
- **Bỏ thông báo email** (US-19, US-20): sẽ làm bằng thông báo của ứng dụng di động (giai đoạn 2).
- Test E2E chạy trong lúc phát triển nhưng chưa nằm trong repo; đưa vào cùng `docs/TEST-REPORT.md`.

## 3. Tự nghiệm thu v0.9.0

**Cách làm:** mỗi user story mức **M** và **S** được đối chiếu với tiêu chí chấp nhận (AC) trong [04-user-stories.md](04-user-stories.md) bằng một hoặc hai cách:

- **Test tự động**: chạy `npm run test` ở gốc repo (backend Jest + Supertest với MongoDB trong bộ nhớ, frontend Vitest).
- **Kiểm tra tay**: trên bản production (https://sv22.bcse-vju.com), bằng điện thoại thật (Android, Chrome, mở như ứng dụng) và máy tính (Chrome, 1366 px); các bước ở mục 3.3.

### 3.1 Kết quả test tự động

| Phần | Lệnh | Kết quả | Ngày |
|---|---|---|---|
| Backend | `npm --prefix backend test` | 27 / 27 bộ, **248 / 248 test đạt** | 29/11/2026 |
| Frontend | `npm --prefix frontend test` | 11 / 11 file, **68 / 68 test đạt** | 29/11/2026 |

### 3.2 Bảng nghiệm thu theo user story

Cột "Kiểm tra tay" ghi mã bước ở mục 3.3. Story ghi "Đạt" khi test tự động đạt **và** bước kiểm tra tay tương ứng đạt (sinh viên tự kiểm tra trên thiết bị, ngày 29/11/2026).

| Story | Mức | AC chính | Test tự động | Kiểm tra tay | Kết quả |
|---|:-:|---|---|---|---|
| US-06 Xem kèo khi chưa đăng nhập | M | Chỉ kèo chưa bắt đầu, chưa hủy, sớm nhất trước | `post/post.test.js` | K1 || Đạt |
| US-07 Lọc khu vực, ngày | M | Ngày theo giờ Việt Nam; bộ lọc nằm trên URL | `post/post.test.js`, `utils/vnTime.test.js` | K1 || Đạt |
| US-08 Lọc theo trình độ | M | Khoảng trình độ chứa trình độ hồ sơ (BR-09) | `post/post.test.js`, `utils/skillLevel.test.js` | K1 || Đạt |
| US-09 Chi tiết kèo | M | Không lộ email; "Còn N chỗ / Đủ người / Đã hủy" | `post/post.test.js`, `PostCard.test.tsx` | K2 || Đạt |
| US-11 Đăng kèo | M | BR-01 → BR-05; lỗi chỉ rõ ô sai | `post/post.rules.test.js`, `post/post.test.js`, `postForm.test.ts` | K2 || Đạt |
| US-14 Chia sẻ link kèo | S | Mở hộp chia sẻ; link vào thẳng chi tiết | `share.test.ts` | K2 || Đạt |
| US-15 Tham gia kèo | M | BR-06 → BR-11; bấm cùng lúc không vượt số chỗ | `post/post.rules.test.js`, `post/post.test.js` | K3 || Đạt |
| US-16 Rời kèo | M | Trước giờ bắt đầu; mở lại kèo đủ người (BR-12) | `post/post.rules.test.js`, `post/post.test.js` | K3 || Đạt |
| US-17 Hủy kèo | M | Chỉ chủ kèo; hỏi xác nhận; kèo hủy bị ẩn (BR-13) | `post/post.rules.test.js`, `post/post.test.js` | K3 || Đạt |
| US-18 Kèo của tôi | M | Hai tab có số lượng; "Đã diễn ra" | `user/my-posts.test.js`, `myPosts.test.ts` | K4 || Đạt |
| US-32 Thu tiền QR | M | QR đúng số tiền, nội dung có mã kèo; ẩn khi chưa có tài khoản; "Đã trả" | `post/payment.test.js`, `user/bank-account.test.js`, `utils/vietqr.test.js`, `PaymentCard.test.tsx` | K5 || Đạt |
| US-33 Chi phí theo khoản | M | Thêm / sửa / xóa khoản; chọn người cùng chịu; làm tròn 1.000đ; "còn thiếu" | `post/costs.rules.test.js`, `post/payment.test.js`, `costs.test.ts` | K5 || Đạt |
| US-34 Cài lên màn hình chính | S | Gợi ý cài; mở không có thanh địa chỉ, có biểu tượng riêng | — | K9 || Đạt |
| US-35 Tin tổng kết | S | Đoạn tin có giờ, sân, người, số tiền, link | `share.test.ts` | K5 || Đạt |
| US-37 Kho cầu | S | 12 / 24 / 36 quả; giá bình quân; tự trừ / hoàn; thống kê | `shuttle/shuttle.test.js` | K6 || Đạt |
| US-38 Ảnh bill, hóa đơn | S | 7 ảnh, xóa GPS; khách không thấy; lưu PDF | `post/bills.test.js`, `images.test.js`, `images.test.ts` | K6 || Đạt |
| US-39 Tổng quan, Cài đặt, chế độ tối | S | Tìm không dấu; 3 tiện ích lưu theo tài khoản; Sáng / Tối / Theo máy | `user/tab-bar.test.js`, `features.test.ts`, `nav.test.ts` | K8 || Đạt |
| US-40 Nhắn tin | S | Chỉ người cùng kèo; tin đến ngay; đếm chưa đọc; chặn; ≤ 20 tin / phút | `chat/chat.test.js` | K7 || Đạt |
| US-41 Ảnh chuyển khoản | S | Tối đa 3 ảnh; chỉ chủ kèo và người gửi thấy; "Chờ xác nhận" | `post/proofs.test.js` | K5 || Đạt |
| US-42 Quên mật khẩu (OTP) | S | Mã 4 số, 10 phút, sai 5 lần hủy; không lộ email có tồn tại; máy khác phải đăng nhập lại | `auth/reset-password.test.js` | K10 || Đạt |
| US-43 Số điện thoại | S | Không bắt buộc; số di động VN; chỉ người cùng kèo thấy | `user/phone.test.js` | K2 || Đạt |
| US-22 Xuất số liệu | M | CSV ẩn danh, loại tài khoản thử | `post/events.test.js` (chỉ phần nhật ký) | — | **Chưa đạt**: chưa có lệnh xuất (mục 2.5) |
| US-24 Chống đăng kèo hàng loạt | S | 3 kèo đang mở, 5 kèo / ngày, chặn kèo trùng | `auth/rate-limit.test.js` (chỉ giới hạn tạo tài khoản) | — | **Một phần** |
| US-28 Điểm danh | S | Đánh dấu có đến / không đến; phản hồi khi sai | `post/payment.test.js`, `post/events.test.js` | K5 | **Một phần**: phần điểm danh đạt (K5); chưa có phản hồi khi bị đánh dấu sai |
| US-19, US-20 Email thông báo | S | — | — | — | **Bỏ**, chuyển sang thông báo của app (giai đoạn 2) |
| US-25, US-26 Báo cáo kèo, quản trị | S | — | — | — | **Chưa làm** |

Story mức **C** (US-10, US-21, US-27, US-29 → US-31, US-36) không nằm trong phạm vi nghiệm thu bản này.

### 3.3 Các bước kiểm tra tay

Làm trên https://sv22.bcse-vju.com với hai tài khoản (A: chủ kèo, B: người chơi), một trình duyệt mỗi tài khoản. Bước nào sai thì ghi vào bug log (`docs/TEST-REPORT.md`) thay vì ghi "Đạt".

| Mã | Bước | Kết quả mong đợi | Điện thoại | Máy tính |
|---|---|---|---|---|
| K1 | Chưa đăng nhập, mở trang chủ; chọn khu vực, chọn ngày, chọn "Hôm nay"; tải lại trang | Chỉ kèo sắp diễn ra; bộ lọc giữ nguyên sau khi tải lại và nằm trên URL; "Chọn ngày" mở lịch| Đạt | Đạt |
| K2 | A đăng kèo: thử giờ đã qua, giá âm rồi sửa đúng; mở chi tiết bằng B; bấm "Chia sẻ kèo" | Lỗi chỉ đúng ô sai; đăng xong có trang chi tiết; B không thấy email của A; số điện thoại của A chỉ hiện sau khi B tham gia| Đạt | Đạt |
| K3 | B tham gia đến khi đủ người, rời kèo, tham gia lại; A hủy một kèo khác | Đủ người thì nhãn đổi "Đủ người"; rời thì mở lại; hủy có hỏi xác nhận và kèo biến khỏi danh sách| Đạt | Đạt |
| K4 | Mở "Lịch sử" → hai tab | Số lượng đúng ở mỗi tab; kèo đã qua ghi "Đã diễn ra"| Đạt | Đạt |
| K5 | A thêm khoản sân (mọi người), khoản ăn (chỉ A); B xem QR; B gửi ảnh chuyển khoản; A bấm "Đã trả"; A tăng tiền sân; A điểm danh; bấm "Gửi tin thu tiền" | Số tiền mỗi người đúng, làm tròn 1.000đ; QR quét bằng app ngân hàng ra đúng số tiền và mã kèo; A thấy "Chờ xác nhận" và nhận email; sau khi tăng tiền B thấy "còn thiếu"; tin thu tiền đủ thông tin| Đạt | Đạt |
| K6 | A nhập 12 quả cầu với tổng tiền; dùng 3 quả trong khoản "Cầu"; tải 2 ảnh bill; bấm "Xuất hóa đơn" → lưu PDF | Thanh mức cầu giảm 3 quả; ảnh bill B xem được, khách không thấy; file PDF mở được, có QR và đủ khoản| Đạt | Đạt |
| K7 | A và B nhắn trong nhóm kèo và nhắn riêng; B chặn A | Tin đến ngay không tải lại; số chưa đọc hiện và mất khi mở; bị chặn thì A không gửi được| Đạt | Đạt |
| K8 | Mở Tổng quan, gõ "kho cau"; Cài đặt: đổi 3 tiện ích ở thanh dưới, chọn Tối; đăng xuất, đăng nhập lại | Ra "Kho cầu"; thanh dưới giữ lựa chọn sau đăng nhập lại; chế độ tối không nháy trắng khi mở| Đạt | Đạt |
| K9 | Điện thoại Android: Chrome → "Thêm vào màn hình chính", mở từ biểu tượng | Có biểu tượng và tên riêng; mở không có thanh địa chỉ | Đạt | — |
| K10 | Đăng xuất, "Quên mật khẩu?" bằng email của A; nhập sai mã 1 lần, rồi nhập đúng và đặt mật khẩu mới; mở lại trình duyệt khác đang đăng nhập A | Nhận thư có mã 4 số; sai báo lỗi; đúng thì đăng nhập được bằng mật khẩu mới; phiên ở trình duyệt khác bị đăng xuất| Đạt | Đạt |

### 3.4 Kết luận nghiệm thu

Kiểm tra ngày **29/11/2026** trên bản production, do sinh viên tự thực hiện và xác nhận.

| Hạng mục | Kết quả |
|---|---|
| Test tự động | Backend 248 / 248, frontend 68 / 68 đạt |
| Bước kiểm tra tay | **10 / 10 đạt** (K1 – K8, K10 trên cả điện thoại và máy tính; K9 chỉ áp dụng điện thoại) |
| Lỗi phát hiện | Không có lỗi mới trong lần nghiệm thu này |
| User story mức M | 11 / 12 đạt; US-22 chưa đạt (chưa có lệnh xuất số liệu) |
| User story mức S | 10 đạt; US-28, US-24 một phần; US-19, US-20 bỏ; US-25, US-26 chưa làm |

**Quyết định:** phát hành `v0.9.0` (mốc M2, feature freeze). Từ bản này chỉ sửa lỗi và làm US-22 cho tới `v1.0.0`; các giới hạn ở mục 2.5 được ghi nhận, không chặn phát hành.

## 4. v1.0.0 (dự kiến 15/12/2026)

Điều kiện phát hành:

- US-22 đạt: lệnh xuất CSV ẩn danh và `summary.txt` cho RQ1 – RQ3.
- `docs/TEST-REPORT.md` có kết quả E2E và bug log; không còn lỗi mức cao chưa sửa.
- Số liệu thử nghiệm (nếu có người dùng) đã xuất và phân tích.
- Ghi chú phát hành theo mẫu mục 2; tự nghiệm thu lại các story đổi từ sau `v0.9.0`.
