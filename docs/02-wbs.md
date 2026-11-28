# WBS – CẤU TRÚC PHÂN RÃ CÔNG VIỆC

**Sinh viên thực hiện:** An Đức Mạnh – MSSV 23110310 · Đồ án cá nhân
Phiên bản 2.0 – 24/11/2026 (theo Charter 2.0) · Phương pháp: phân rã theo **giai đoạn → gói công việc**. Mỗi gói công việc có sản phẩm đầu ra, ước lượng công và mức ưu tiên rõ ràng.

**Lộ trình 2 giai đoạn:** giai đoạn 1 là **ứng dụng web** (phạm vi đồ án, mục 1–4 của tài liệu này, 318 giờ công, **hạn hoàn thành 15/12/2026** ở mốc M5). Giai đoạn 2 là **app di động**, làm sau khi bảo vệ (mục 5), không tính vào khối lượng đồ án.

**Ưu tiên (MoSCoW):** M = Must · S = Should · C = Could (chỉ làm nếu còn thời gian)
**Trạng thái:** Xong · Đang làm · Chưa (chưa bắt đầu)

## 1. Sơ đồ tổng quan (cấp 1–2)

![Sơ đồ tổng quan WBS cấp 1–2](diagrams/wbs-tong-quan.png)

Bản vẽ gốc chỉnh sửa được: [diagrams/wbs-tong-quan.drawio](diagrams/wbs-tong-quan.drawio) (mở bằng https://app.diagrams.net hoặc extension Draw.io Integration trong VS Code). Sửa xong thì xuất lại PNG và ghi đè `diagrams/wbs-tong-quan.png`.

## 2. Bảng WBS chi tiết

| Mã | Gói công việc | Sản phẩm đầu ra | Ưu tiên | Giờ công | Phụ thuộc | TT |
|---|---|---|:-:|---:|---|:-:|
| **1** | **QUẢN LÝ DỰ ÁN** | | | **31** | | |
| 1.1.1 | Chốt đề tài chính thức | Tên đề tài, câu hỏi nghiên cứu | M | 4 | – | Xong |
| 1.1.2 | Lập Project Charter | [01-project-charter.md](01-project-charter.md) | M | 8 | 1.1.1 | Xong |
| 1.2.1 | Lập WBS | Tài liệu này | M | 4 | 1.1.2 | Xong |
| 1.2.2 | Lập Gantt chart | [03-gantt.md](03-gantt.md) | M | 3 | 1.2.1 | Xong |
| 1.2.3 | Kế hoạch quản lý rủi ro + kế hoạch chất lượng | `docs/RISKS.md`, `docs/QUALITY.md` | M | 3 | 1.1.2 | Xong |
| 1.3.1 | Nhật ký tiến độ hằng tuần | Weekly log (việc đã làm / kế hoạch / vướng mắc) | M | 5 | – | Đang làm |
| 1.3.2 | Gặp và báo cáo GVHD | Báo cáo 2 tuần/lần | M | 4 | – | Chưa |
| **2** | **KHẢO SÁT & PHÂN TÍCH** | | | **21** | | |
| 2.1.1 | Thiết kế bảng hỏi (kèm phiếu đồng ý): cách chia tiền hiện nay, bùng kèo, bùng tiền, thời gian nhắc nợ (đầu vào cho RQ1, RQ2) | Google Form | M | 3 | 1.1.2 | Chưa |
| 2.1.2 | Thu thập ≥ 30 phản hồi | Dữ liệu khảo sát | M | 3 | 2.1.1 | Chưa |
| 2.1.3 | Phân tích kết quả khảo sát | Báo cáo khảo sát (D2) | M | 3 | 2.1.2 | Chưa |
| 2.3 | Phân tích giải pháp hiện có | Bảng so sánh | S | 3 | – | Chưa |
| 2.4.1 | User stories + use case (MoSCoW) | Product backlog: [04-user-stories.md](04-user-stories.md) (31 story, 14 use case) | M | 5 | 2.1.3 | Xong |
| 2.4.2 | Đặc tả yêu cầu + quy tắc nghiệp vụ (mã BR-xx) | `docs/project.md` (D4) | M | 4 | 2.4.1 | Đang làm |
| **3** | **THIẾT KẾ** | | | **15** | | |
| 3.1 | Kiến trúc hệ thống (modular monolith) | Sơ đồ kiến trúc trong `docs/project.md` | M | 4 | 2.4.1 | Xong |
| 3.2 | Thiết kế CSDL (MongoDB collections, index) | `docs/database.md` | M | 4 | 3.1 | Xong |
| 3.3 | Đặc tả API (endpoint, định dạng response, mã lỗi) | `docs/API.md` | M | 4 | 3.1 | Xong |
| 3.4 | Wireframe các màn hình chính (từ giao diện đã làm) | Wireframe (Figma / giấy) | M | 3 | 4.5.1, 4.5.2 | Chưa |
| **4** | **PHÁT TRIỂN** | | | **172** | | |
| 4.1.1 | Khởi tạo repo, cấu trúc mã nguồn | Repo + TypeScript + Vitest | M | 2 | – | Xong |
| 4.1.2 | Cấu hình CI (GitHub Actions) + quy ước Git/PR | `.github/workflows/ci.yml`, `docs/GIT.md` | M | 2 | 4.1.1 | Xong |
| 4.1.3 | Khung dự án + môi trường chạy thật (máy chủ Ubuntu: Nginx, PM2, MongoDB; [DEPLOY.md](DEPLOY.md)) | Ứng dụng chạy được ở local và trên máy chủ | M | 3 | 3.1 | Xong |
| 4.2 | Lõi nghiệp vụ: kèo, chỗ, trình độ | `backend/src/modules/post/post.rules.js` | M | 8 | 4.1.1 | Xong |
| 4.3 | Gỡ bộ trích xuất bài đăng (code `parser/`, API `/api/parse`, ô dán bài, test, tài liệu) | Code và tài liệu không còn bộ trích xuất | M | 2 | – | Xong |
| 4.4.1 | Xác thực (email + mật khẩu, JWT) | Đăng nhập hoạt động | M | 4 | 4.1.3 | Xong |
| 4.4.2 | API kèo + tham gia/rời | API posts | M | 10 | 4.2, 4.4.1 | Xong |
| 4.4.3 | Tìm kiếm theo khu vực / ngày / trình độ | API search | M | 8 | 4.4.2 | Xong |
| 4.5.1 | Màn hình đăng kèo | UI đăng kèo | M | 12 | 4.4.2 | Xong |
| 4.5.2 | Danh sách kèo + bộ lọc | UI tìm kèo | M | 10 | 4.4.3 | Xong |
| 4.5.3 | Trang cá nhân | UI profile | S | 5 | 4.4.1 | Xong |
| 4.5.4 | Giao diện kiểu app trên điện thoại / máy tính bảng (dưới 1024px): thanh tab đáy, thanh tiêu đề có nút quay lại, chip lọc, nút hành động dính ở đáy; máy tính giữ bố cục web | `TabBar`, `PageHeader`, CSS | S | 8 | 4.5.2 | Xong |
| 4.6 | Thông báo qua email | Module notify | S | 4 | 4.4.2 | Chưa |
| 4.7 | Đánh giá uy tín sau kèo | API + UI rating | C | 6 | 4.4.2 | Chưa |
| 4.8.1 | Thu tiền kèo bằng mã QR chuyển khoản (VietQR): số tài khoản trong hồ sơ, QR đúng số tiền từng người, chủ kèo đánh dấu đã trả | API + UI thanh toán kèo (US-32) | M | 6 | 4.4.2 | Xong |
| 4.8.2 | **Chi phí theo từng khoản** (sân, cầu, nước, ăn, khác): chủ kèo thêm / sửa bất cứ lúc nào, chọn người cùng chịu từng khoản (có "Chọn tất cả"), thêm bạn không dùng app; mọi người trong kèo xem được; điểm danh; "còn thiếu" khi chi phí tăng sau khi đã trả. Thay cho bản chốt chi phí chia đều | API + UI chi phí kèo (US-33, US-28) | M | 10 | 4.8.1 | Xong |
| 4.8.3 | Cài web lên màn hình chính (PWA: manifest, biểu tượng) | `manifest.webmanifest`, biểu tượng | S | 2 | 4.5.2 | Xong |
| 4.8.4 | Tin nhắn tổng kết kèo để sao chép / chia sẻ sang Zalo, Facebook | Nút "Chia sẻ kèo", "Gửi tin thu tiền" ở chi tiết kèo (US-35, gộp US-14) | S | 1 | 4.8.1 | Xong |
| 4.8.5 | Lịch sử chi tiêu theo tháng | Mục trong "Kèo của tôi" (US-36) | C | 1 | 4.8.2 | Chưa |
| 4.9 | Icon nét mảnh cạnh chữ khắp giao diện; **ảnh đại diện** và **ảnh bìa kèo** (tải lên, cắt, đổi WebP, xóa EXIF / GPS; chưa có ảnh thì dùng chữ cái đầu / dải màu xanh) | `Icon.tsx`, `utils/images.js`, API `/users/me/avatar`, `/posts/:id/cover` | S | 12 | 4.5.3, 4.5.4 | Xong |
| 4.10 | **Kho cầu**: nhiều loại cầu, nhập theo số quả (12 / 24 / 36 hoặc tự nhập) + tổng tiền → giá mỗi quả (bình quân khi nhập thêm), thanh mức cầu; khoản "Cầu" theo số quả tự trừ / hoàn kho; thống kê số quả đã dùng theo tuần / tháng | Module `shuttle`, trang `/kho-cau` (US-37) | S | 11 | 4.8.2 | Xong |
| 4.11 | Ảnh bill (tối đa 7 ảnh / kèo) và trang **hóa đơn** in / lưu PDF cho mọi người trong kèo | API `/posts/:id/bills`, trang `/keo/:id/hoa-don` (US-38) | S | 6 | 4.8.2, 4.9 | Xong |
| 4.12 | **Tổng quan và Cài đặt**: tab "Tổng quan" chứa mọi tính năng (ô tìm kiếm không dấu, hàng số liệu nhỏ); nút Tài khoản ở góc phải trên cùng (Cài đặt, Đăng xuất); Cài đặt gồm Hồ sơ, Đổi mật khẩu, **chế độ Sáng / Tối / Theo máy**, chọn 3 tiện ích cho thanh dưới (lưu theo tài khoản) | `utils/features.ts`, `OverviewPage`, `SettingsPage`, `UserMenu`, API `/users/me/tab-bar` (US-39) | S | 11 | 4.5.4 | Xong |
| 4.13 | **Nhắn tin trong app**: nhóm chat theo kèo + nhắn riêng giữa người đã cùng chơi; mở tới 2 giờ sau giờ kết thúc rồi chỉ xem lại; tin mới qua WebSocket; chưa đọc, chặn, giới hạn tốc độ; "Kèo của tôi" đổi thành "Lịch sử" (tab Tin nhắn) | Module `chat`, `/api/chats`, `/api/ws`, trang `/lich-su/tin-nhan/:key` (US-40) | S | 13 | 4.12 | Xong |
| 4.14 | **Email, hóa đơn, chuyển khoản, quên mật khẩu**: gửi thư Gmail SMTP; sửa xuất PDF không phản hồi trên điện thoại (tạo PDF trong trình duyệt); QR trên hóa đơn; người chơi gửi ảnh chuyển khoản (tối đa 3), chủ kèo nhận email, thấy "Chờ xác nhận"; quên mật khẩu qua email | `utils/mailer.js`, `utils/pdf.ts`, API `/auth/forgot-password`, `/auth/reset-password`, `/posts/:id/proofs` (US-41, US-42) | S | 12 | 4.11, 4.13 | Xong |
| 4.15 | **Số điện thoại** trong hồ sơ / đăng ký, chỉ người cùng kèo thấy (gọi, Zalo); **"Hôm nay" thành bộ lọc** dùng chung điện thoại và máy tính, bỏ khỏi tiện ích | `utils/phone.js`, `PhoneLinks`, hàng chip lọc (US-43) | S | 3 | 4.12 | Xong |
| **5** | **KIỂM THỬ & ĐÁNH GIÁ** | | | **28** | | |
| 5.1 | Unit test (liên tục, coverage ≥ 80%) | `backend/tests/` (Jest), test frontend (Vitest) | M | 12 | 4.1.2 | Đang làm |
| 5.2 | Integration / API test | Jest + Supertest + MongoDB trong RAM | M | 6 | 4.4.2 | Xong |
| 5.3 | E2E test cho 3 luồng chính (đăng, tìm, tham gia) | Bộ test Playwright | S | 5 | 4.5.2 | Chưa |
| 5.5 | Usability test luồng đăng kèo, chia tiền theo khoản, thu tiền (≥ 8 người) | Tỉ lệ hoàn thành nhiệm vụ, thời gian, điểm SUS | M | 5 | 4.8.2 | Chưa |
| **6** | **TRIỂN KHAI & PILOT** | | | **22** | | |
| 6.1 | Deploy production | URL production (D6): https://sv22.bcse-vju.com | M | 3 | 4.1.3 | Xong |
| 6.2 | Pilot 2 tuần tại Hà Nội | Log hệ thống, phản hồi | M | 12 | 6.1 | Chưa |
| 6.3 | Xuất số liệu thử nghiệm đã ẩn danh (US-22) và phân tích RQ1–RQ3: **nhật ký sự kiện của kèo (xong 28/11)**, lệnh xuất CSV + `summary.txt` H1–H3, phân tích | CSV (D3), thống kê, điểm SUS | M | 7 | 6.2 | Đang làm |
| **7** | **KẾT THÚC** | | | **29** | | |
| 7.1 | Viết báo cáo đồ án | Báo cáo (D8) | M | 20 | 5.5, 6.3 | Chưa |
| 7.2 | Slide + video demo | Slide, video (D8) | M | 6 | 6.1 | Chưa |
| 7.3 | Bảo vệ | – | M | 3 | 7.1, 7.2 | Chưa |
| | **TỔNG GIAI ĐOẠN 1** | | | **318** | | |

## 3. Tổng hợp khối lượng

Kế hoạch điều chỉnh ngày 17/11/2026 theo **hạn hoàn thành dự án 15/12/2026** (phương án: giữ đủ mọi hạng mục, giảm cỡ mẫu).

| | Giờ công |
|---|---:|
| Tổng giai đoạn 1 (gồm cả 4.7 Uy tín) | 318 |
| Còn lại tính từ 24/11 (không tính 7.3 Bảo vệ) | ~106 |
| Số tuần còn lại (24/11/2026 → 15/12/2026) | 3 |
| **Trung bình cần làm** | **~35 giờ/tuần** |

Cỡ mẫu đã giảm so với kế hoạch ban đầu: khảo sát ≥ 30 phản hồi (trước 50), thử nghiệm thực tế ≥ 15 người dùng / ≥ 10 kèo (trước 30 / 20), usability test ≥ 8 người (trước 10).

**Điều chỉnh 24/11/2026:** bỏ bộ trích xuất LLM (4.3.2, 8h) và hybrid (4.3.3, 5h); thêm gói 4.8 Thu tiền và chi phí kèo (15h). RQ1 chỉ đánh giá bộ trích xuất dựa trên luật (Charter mục 4). Tổng tăng 2 giờ.

**Bổ sung 24/11/2026:** thêm 4.5.4 Giao diện kiểu app trên điện thoại (8h) theo yêu cầu, làm cùng 4.8.3 PWA. Tổng tăng 8 giờ (270h); ghi nhận ở [RISKS.md](RISKS.md) R3.

**Đổi trọng tâm 24/11/2026 (Charter 2.0):** bỏ bộ trích xuất bài đăng và phần nghiên cứu đi kèm: 2.2.1–2.2.3 bộ dữ liệu 100 bài (12h), 4.3.1 tinh chỉnh luật (12h), 5.4 đánh giá trích xuất (6h). Thêm 4.3 gỡ bộ trích xuất (2h), mở rộng 4.8.2 thành chi phí theo từng khoản (+5h), mở rộng 6.3 xuất và phân tích số liệu (+3h); 5.5 đổi từ A/B "dán bài" sang usability test chia tiền. Tổng **250 giờ**.

**Bổ sung 24/11/2026:** thêm 4.9 Icon và ảnh (12h: icon 3h, ảnh đại diện / ảnh bìa 9h) theo yêu cầu, đã làm xong trong ngày nên **không** làm tăng phần việc còn lại. Tổng **262 giờ**; ghi nhận ở [RISKS.md](RISKS.md) R3, rủi ro mới R18.

**Bổ sung 25/11/2026:** thêm 4.10 Kho cầu (11h) và 4.11 Ảnh bill, hóa đơn PDF (6h) theo yêu cầu; kho cầu chuyển từ ngoài phạm vi vào phạm vi (Charter mục 5). Đã làm xong nên **không** làm tăng phần việc còn lại. Tổng **279 giờ**.

**Bổ sung 25/11/2026 (lần 2):** thêm 4.12 Tổng quan và Cài đặt (11h) theo yêu cầu; đã làm xong nên **không** làm tăng phần việc còn lại. Tổng **290 giờ**.

**Bổ sung 25/11/2026 (lần 3):** 4.8.4 xong; thêm 4.13 Nhắn tin trong app (13h, gồm WebSocket) theo yêu cầu, chuyển "chat" từ ngoài phạm vi vào phạm vi Charter. Đã làm xong nên **không** làm tăng phần việc còn lại. Tổng **303 giờ**.

**Bổ sung 27/11/2026:** thêm 4.14 Email, hóa đơn PDF, ảnh chuyển khoản, quên mật khẩu (12h) và 4.15 Số điện thoại, "Hôm nay" thành bộ lọc (3h) theo yêu cầu; đã làm xong. Tổng **318 giờ**.

Nếu trễ so với lịch, cắt theo thứ tự: 4.7 Uy tín → 4.8.5 Lịch sử chi tiêu → 4.6 Thông báo email → 5.3 E2E test → 3.4 Wireframe (dùng ảnh chụp giao diện). Xem [Gantt](03-gantt.md) mục 5.

Giai đoạn 2 (app di động, mục 5) **không** nằm trong khối lượng trên và **không** được bắt đầu trước mốc M5.

## 4. Từ điển WBS (các gói quan trọng)

**2.2 Bộ dữ liệu bài đăng (đã bỏ 24/11/2026).** Thu thập ≥ 100 bài ghép kèo tiếng Việt, ưu tiên bài do người tham gia khảo sát tự gửi (có đồng ý). Bài chép tay từ group công khai phải xóa tên, SĐT, ảnh và đường dẫn hồ sơ ngay khi chép. Gán nhãn 4 nhóm trường (thời gian, giá, số chỗ, trình độ). Vì làm một mình, độ tin cậy của nhãn được kiểm tra bằng hai cách: (1) nhờ 1 người gán nhãn độc lập 30 bài và tính Cohen's κ giữa hai người (mục tiêu κ ≥ 0,8); (2) tự gán nhãn lại 20% số bài sau vài ngày để đo độ nhất quán. Chia 70 bài tập phát triển luật, 30 bài tập kiểm tra giữ kín.

**4.3 Bộ trích xuất (đã bỏ 24/11/2026).** Phần mô tả dưới đây giữ lại để đối chiếu với Charter 1.x. Nhận văn bản bài đăng, trả về dữ liệu có cấu trúc để điền form. Chỉ dùng phương pháp **dựa trên luật** (regex + từ điển, chạy ngay trên máy chủ, không tốn chi phí, không gửi dữ liệu ra ngoài); phương án LLM / hybrid đã bỏ ngày 24/11/2026. Luật được tinh chỉnh trên 70 bài phát triển, không dùng 30 bài kiểm tra. **Tiêu chí chấp nhận:** đạt chỉ tiêu F1 trong Charter trên tập kiểm tra giữ kín, kèm bảng phân loại lỗi.

**4.8 Thu tiền và chi phí kèo (trọng tâm nghiên cứu từ Charter 2.0).** Mỗi kèo có danh sách khoản chi; mỗi khoản chia đều cho những người chủ kèo chọn (gồm chủ kèo, người tham gia qua app, bạn của chủ kèo không dùng app); mỗi người trả tổng các phần của mình, làm tròn lên 1.000đ. Phần mô tả cũ: Giúp chủ kèo thu tiền người chơi vãng lai mà không phải nhắc nợ. Hệ thống **chỉ hiển thị mã QR chuyển khoản** theo chuẩn VietQR (số tài khoản do chủ kèo nhập, số tiền, nội dung có mã kèo), tiền chuyển thẳng giữa hai tài khoản ngân hàng, hệ thống không giữ tiền (đúng Charter mục 5.2). Sau buổi chơi, chủ kèo nhập chi phí thực tế và đánh dấu người có mặt; số tiền chia lại cho người có mặt, đồng thời ghi nhận người không đến (dữ liệu cho E9 trong [user stories](04-user-stories.md) và RQ3).

**4.9 Icon và ảnh.** Icon SVG nét mảnh (một bộ tự vẽ trong `Icon.tsx`, không dùng thư viện icon, không emoji) đặt cạnh chữ ở tiêu đề thẻ, dòng thông tin kèo, loại khoản chi, bộ lọc, số liệu tài khoản. Ảnh do người dùng tải lên được xử lý hoàn toàn ở máy chủ: kiểm tra định dạng theo nội dung file (JPEG / PNG / WebP, ≤ 5 MB), xoay theo EXIF, cắt (ảnh đại diện 256×256, ảnh bìa 1200×630), đổi WebP, **bỏ toàn bộ metadata gồm vị trí GPS**, đặt tên ngẫu nhiên; ảnh cũ bị xóa khi đổi. Ảnh lưu trên ổ đĩa máy chủ (ngoài thư mục code), Nginx phục vụ trực tiếp, sao lưu cùng database. **Tiêu chí chấp nhận:** test API cho định dạng sai, quá cỡ, sai quyền, EXIF GPS bị xóa; e2e trên trình duyệt ở 1366 px và 390 px.

**4.10 Kho cầu.** Mỗi người có tối đa 20 loại cầu (collection `shuttles`). Nhập cầu = số quả + tổng tiền đã trả; giá mỗi quả = tổng tiền / số quả, nhập thêm khi kho còn cầu thì lấy **bình quân theo số quả**. Khoản "Cầu" của kèo lưu số quả, giá mỗi quả và loại cầu (chép tên); server tính số tiền và **trừ / hoàn kho theo chênh lệch** so với lần lưu trước, trong cùng transaction với lần lưu chi phí; kho không đủ thì dừng ở 0, không chặn. Thống kê số quả đã dùng tính từ các kèo mình làm chủ, đã diễn ra, chưa hủy, theo lịch Việt Nam (tuần bắt đầu thứ Hai). **Tiêu chí chấp nhận:** test API cho giá bình quân, trừ / hoàn kho, cầu của người khác, loại cầu đã xóa, thống kê; e2e thêm / nhập thêm / khoản cầu / vượt kho.

**4.11 Ảnh bill và hóa đơn.** Chủ kèo tải tối đa 7 ảnh bill (giữ tỉ lệ, cạnh dài ≤ 1600 px, WebP, xóa EXIF / GPS); giới hạn kiểm tra ngay trong lệnh ghi nên tải đồng thời cũng không vượt. Chỉ người trong kèo thấy ảnh. Trang hóa đơn dùng chức năng in của trình duyệt để lưu PDF (chữ tiếng Việt đúng, không thêm thư viện); ghi rõ đây là bảng kê chia tiền, không phải hóa đơn VAT. **Tiêu chí chấp nhận:** test API quyền xem / sửa, giới hạn 7 ảnh, kích thước ảnh; e2e tạo PDF thật bằng Chrome.

**4.12 Tổng quan và Cài đặt.** Danh mục tiện ích nằm ở một chỗ (`frontend/src/utils/features.ts`): trang Tổng quan, ô tìm kiếm và thanh dưới đều đọc từ đây, nên tính năng mới chỉ cần thêm một dòng. Thanh dưới: 3 ô tự chọn + "Đăng kèo" ở giữa + "Tổng quan" ở cuối (cố định); lựa chọn lưu theo tài khoản (trường `tabBar`). Chế độ màu lưu trên thiết bị; một đoạn script trong `index.html` đặt màu trước khi vẽ trang để không nháy trắng; mọi màu trong CSS đi qua biến, chế độ tối chỉ đổi giá trị biến; khi in luôn dùng màu sáng. Menu Tài khoản chỉ có Cài đặt và Đăng xuất, không lặp lại tính năng. **Tiêu chí chấp nhận:** test API cho thanh dưới (thiếu, trùng, ô cố định, null về mặc định); e2e cả sáng lẫn tối ở 390 px và 1366 px.

**4.13 Nhắn tin trong app.** Mỗi cuộc trò chuyện có một khóa: `p-<mã kèo>` (nhóm của kèo) hoặc `d-<người A>-<người B>` (nhắn riêng, hai mã xếp tăng dần). Quyền được tính lại ở **mỗi** lần đọc / gửi từ dữ liệu kèo, không lưu danh sách thành viên riêng: người trong kèo mới vào nhóm; hai người phải cùng ở trong ít nhất một kèo mới nhắn riêng; gửi được tới 2 giờ sau giờ kết thúc của kèo (nhắn riêng: kèo chung muộn nhất), sau đó chỉ xem lại; bị chặn thì không nhắn riêng được cho nhau. Gửi tin qua REST; tin mới được đẩy qua WebSocket `/api/ws` (đăng nhập bằng tin đầu tiên, chỉ nhận từ đúng địa chỉ web), mất kết nối thì trang chat tự tải lại 10 giây một lần và tự kết nối lại. **Tiêu chí chấp nhận:** test API cho quyền, thời hạn, chặn, giới hạn tốc độ, chưa đọc, phân trang và kết nối WebSocket thật; e2e hai trình duyệt nhắn qua lại.

**4.14 Email, hóa đơn PDF, ảnh chuyển khoản, quên mật khẩu.** Gửi thư qua Gmail SMTP (`utils/mailer.js`); gửi hỏng không làm hỏng thao tác chính. Quên mật khẩu (đổi sang mã OTP 4 số ngày 27/11/2026): mã ngẫu nhiên an toàn, CSDL chỉ lưu mã băm HMAC gắn với tài khoản, hết hạn sau 10 phút, dùng một lần, sai 5 lần thì hủy mã; luôn trả cùng một câu (không lộ email đã đăng ký); mỗi email tối đa 1 thư / phút, mỗi IP 5 yêu cầu / giờ; đặt xong thì mọi phiên đăng nhập cũ hết hiệu lực. Ảnh chuyển khoản: người chơi gửi tối đa 3 ảnh, chỉ chủ kèo và người gửi thấy, chủ kèo nhận email và tự bấm "Đã trả". Hóa đơn: mã QR (đúng số tiền của người xem, chủ kèo thì không ghi số tiền); PDF tạo ngay trong trình duyệt vì chức năng in không chạy khi web mở như app trên điện thoại. **Tiêu chí chấp nhận:** test API cho mã đặt lại (hết hạn, dùng lại, sai, sai quá 5 lần, mã của người khác), không lộ email, quyền xem ảnh, giới hạn 3 ảnh, nội dung thư; e2e tải PDF thật trên máy tính và chia sẻ file trên điện thoại.

**4.15 Số điện thoại, "Hôm nay" thành bộ lọc.** Số di động Việt Nam 10 chữ số, `+84` tự đổi thành `0`, không bắt buộc, nhập ở Đăng ký và Hồ sơ; chỉ người cùng kèo thấy, có nút gọi và Zalo. "Hôm nay" bỏ khỏi tiện ích; trang Tìm kèo dùng chung một hàng chip lọc cho điện thoại và máy tính (chip "Chọn ngày" mở lịch khi bấm ở bất kỳ đâu trên chip, kể cả máy tính); tiện ích mặc định: Tìm kèo, Lịch sử, Kho cầu.

**5.1 Unit test.** Mọi logic nghiệp vụ và bộ trích xuất phải có unit test. CI chạy typecheck + test + coverage trên mỗi lần push và Pull Request. Không merge vào `main` khi CI đỏ. Backend dùng Jest + Supertest với MongoDB chạy trong RAM (dạng replica set để test được transaction); frontend dùng Vitest. Ngưỡng coverage backend: lines/functions/statements ≥ 80%, branches ≥ 70%.

**6.2 Pilot.** 2 tuần tại Hà Nội, phối hợp với ít nhất 1 chủ sân hoặc admin group. Ghi log ẩn danh: số kèo đăng, tỉ lệ kèo đủ người, thời gian từ lúc đăng đến lúc đủ người. Kết thúc bằng khảo sát SUS.

## 5. Giai đoạn 2: App di động (sau đồ án)

Bắt đầu **ngay sau mốc M5** (hạn hoàn thành dự án 15/12/2026): dự kiến **16/12/2026 → 18/01/2027**, khoảng **15 giờ/tuần**, nghỉ Tết Dương lịch 31/12 – 01/01. Lịch chi tiết: sheet "Giai đoạn 2 (App)" trong [diagrams/gantt.xlsx](diagrams/gantt.xlsx).

**Công nghệ:** React Native + Expo, viết bằng TypeScript. App **dùng lại toàn bộ backend và API hiện có** (không sửa backend), dùng lại kiểu dữ liệu (`types.ts`), cách gọi API và bảng dịch mã lỗi của frontend web. Bản thử đầu tiên phát hành cho **Android** (file APK). iOS chỉ thử qua ứng dụng Expo Go, vì phát hành chính thức lên App Store cần tài khoản Apple Developer trả phí.

| Mã | Gói công việc | Sản phẩm đầu ra | Ưu tiên | Giờ công | Phụ thuộc | TT |
|---|---|---|:-:|---:|---|:-:|
| 8.1 | Thiết lập dự án Expo, dùng lại kiểu dữ liệu và cách gọi API | Thư mục `mobile/`, CI chạy test | M | 5 | M5 | Chưa |
| 8.2 | Đăng ký, đăng nhập, lưu token an toàn (SecureStore) | Màn hình đăng nhập / đăng ký | M | 6 | 8.1 | Chưa |
| 8.3 | Danh sách kèo + bộ lọc | Màn hình Tìm kèo | M | 10 | 8.2 | Chưa |
| 8.4 | Chi tiết kèo: tham gia, rời, hủy | Màn hình chi tiết | M | 8 | 8.3 | Chưa |
| 8.5 | Đăng kèo, chi phí theo từng khoản, kho cầu | Màn hình đăng kèo, chi phí | M | 10 | 8.4 | Chưa |
| 8.6 | Lịch sử, tin nhắn, Tổng quan, Cài đặt (hồ sơ, đổi mật khẩu, giao diện) | Các màn hình tài khoản | M | 8 | 8.2 | Chưa |
| 8.7 | Thông báo đẩy khi có người tham gia / kèo sắp diễn ra | Expo Notifications + API đăng ký thiết bị | S | 8 | 8.4 | Chưa |
| 8.8 | Kiểm thử trên điện thoại thật, phát hành bản thử Android | File APK, danh sách lỗi đã sửa | M | 8 | 8.1–8.7 | Chưa |
| | **TỔNG GIAI ĐOẠN 2** | | | **63** | | |

Gói 8.7 là gói duy nhất cần thêm vào backend (API lưu mã thiết bị để gửi thông báo); các gói còn lại chỉ dùng API đã có trong [API.md](API.md).
