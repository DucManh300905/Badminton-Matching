# Kế hoạch 4 tuần: kế hoạch và thực tế

**Sinh viên thực hiện:** An Đức Mạnh – MSSV 23110310 · Đồ án cá nhân
> Cập nhật: 29/11/2026 (hết tuần 2).

## 1. Mục đích và nguồn số liệu

- File này đặt **kế hoạch** cạnh **kết quả thực tế** theo từng tuần, cùng các lần điều chỉnh phạm vi và lý do.
- Kế hoạch lấy từ [03-gantt.md](03-gantt.md) (bản điều chỉnh 17/11/2026) và [02-wbs.md](02-wbs.md).
- Kết quả thực tế lấy từ lịch sử Git: ngày merge Pull Request, tag phát hành, số test ghi trong [QUALITY.md](QUALITY.md). Không có commit nào được ghi lùi ngày.
- 4 tuần tính từ **17/11 đến 15/12/2026** (hạn hoàn thành, mốc M5). Giai đoạn 09/11 – 16/11 ghi là **Tuần 0: khởi động**. Ngày bảo vệ chờ lịch của khoa.
- Cột "Kết quả thực tế" của tuần chưa tới để trống và cập nhật vào cuối tuần đó.

## 2. Bảng kế hoạch 4 tuần

| Tuần | Công việc và mục tiêu | Đầu ra | Thời lượng / phụ thuộc | Kết quả thực tế và điều chỉnh |
|---|---|---|---|---|
| **0** (09/11 – 16/11) | Chọn đề tài, viết Charter, WBS, Gantt; dựng khung dự án, lõi nghiệp vụ, CI | Charter, WBS, Gantt, repo có CI; mốc **M0** | Không phụ thuộc | **Đạt M0 ngày 13/11.** Commit khởi tạo `a5e68ed`, PR #1 – #7, tag **v0.1.0** (13/11). Gantt gốc kéo dài 12 tuần (đến 29/01/2027). |
| **1** (17/11 – 23/11) | Khung fullstack (backend + frontend), quy ước Git; **deploy production**; user stories, đặc tả; bảng hỏi khảo sát | Hệ thống chạy thật, `docs/04-user-stories.md`, `docs/GIT.md`, `docs/DEPLOY.md`; mốc **M1** | Deploy phụ thuộc khung fullstack. Deploy là mốc không được trễ vì thử nghiệm cần đủ 2 tuần | **Đạt M1 ngày 23/11.** PR #8 – #10 (17/11): khung fullstack, quy ước Git. PR #11, #13 – #15 (23/11): deploy tại sv22.bcse-vju.com, user stories, chống spam và bùng kèo. Tag **v0.2.0**, 160 test backend + 41 test frontend. **Điều chỉnh 17/11:** rút lịch từ 12 tuần về hạn 15/12/2026. **Chưa làm:** bảng hỏi khảo sát. |
| **2** (24/11 – 30/11) | Kế hoạch ban đầu: thử nghiệm thực tế tuần 1, bộ trích xuất bài đăng, wireframe, thông báo email. Sau Charter 2.0: chia chi phí theo từng khoản, thu tiền QR và các tiện ích quanh kèo | Các tính năng 4.8 – 4.15 chạy trên production; nhật ký sự kiện cho số liệu nghiên cứu; mốc **M2** | Phụ thuộc M1 (đã deploy). Thử nghiệm thực tế phụ thuộc việc có người dùng | **Đổi phạm vi 24/11 (Charter 2.0):** bỏ bộ trích xuất, trọng tâm chuyển sang chia chi phí và thu tiền QR (PR #16, #21). Đã merge PR #17 – #39: thu tiền QR, chi phí theo khoản, giao diện app, icon và ảnh, kho cầu, ảnh bill và hóa đơn PDF, Tổng quan / Cài đặt / chế độ tối, nhắn tin và chia sẻ kèo, đếm tin chưa đọc, ảnh chuyển khoản, quên mật khẩu bằng mã OTP, số điện thoại, nhật ký sự kiện của kèo (6.3 đợt 1). Đến 28/11: **248 test backend + 68 test frontend**. **Chưa làm:** thử nghiệm thực tế (chưa có người dùng), khảo sát, wireframe, lệnh xuất số liệu. **Bỏ:** thông báo email. |
| **3** (01/12 – 07/12) | Thử nghiệm với người chơi thật; lệnh xuất số liệu ẩn danh (6.3 đợt 2); usability test chia tiền (5.5); E2E test đưa vào repo; báo cáo kiểm thử và bug log; phát hành v1.0.0; bắt đầu viết báo cáo | `docs/TEST-REPORT.md`, `docs/RELEASE.md`, tag **v1.0.0**, số liệu CSV; mốc **M3** | Thử nghiệm phụ thuộc việc mời được người dùng | |
| **4** (08/12 – 15/12) | Phân tích số liệu RQ1 – RQ3; hoàn thiện báo cáo; slide, kịch bản và video demo | Báo cáo 20 – 30 trang, slide, demo; mốc **M4** (13/12), **M5** (15/12) | Phụ thuộc số liệu tuần 3 | |

## 3. Mốc trên Git

| Tuần | Thay đổi chính | Commit / PR / tag | Kết quả kiểm chứng | Quyết định tiếp theo |
|---|---|---|---|---|
| 0 | Khởi tạo: lõi nghiệp vụ, unit test, CI, tài liệu kế hoạch | `a5e68ed`, PR #1 – #7, **v0.1.0** (13/11) | CI chạy test lõi nghiệp vụ | Dựng khung fullstack, chuẩn bị deploy |
| 1 | Khung fullstack, quy ước Git | PR #8 – #10 (17/11) | Test backend và frontend chạy trong CI | Rút lịch về hạn 15/12; deploy sớm |
| 1 | Deploy production, user stories, chống spam / bùng kèo | PR #11, #13 – #15, **v0.2.0** (23/11) | 160 + 41 test; trang chạy tại sv22.bcse-vju.com | Xem lại phạm vi trước tuần 2 |
| 2 | Đổi phạm vi, thu tiền QR, chốt chi phí, giao diện app | PR #16 – #21 (24/11) | Charter 2.0 được duyệt; script deploy tự cập nhật | Làm chi phí theo khoản trước |
| 2 | Chi phí theo khoản, icon và ảnh, tích chọn nhanh | PR #22, #23, #25 (24 – 25/11) | 188 + 53 test (PR #23) | Kho cầu và hóa đơn |
| 2 | Kho cầu, hóa đơn, Tổng quan / Cài đặt, nhắn tin, tin chưa đọc | PR #27, #29, #31, #33 (25/11) | 219 + 68 test (PR #33) | Sửa lỗi PDF trên điện thoại, thêm thu tiền |
| 2 | Hóa đơn PDF, QR trên hóa đơn, ảnh chuyển khoản, quên mật khẩu, số điện thoại | PR #35 (27/11) | 242 + 68 test | Sửa chọn ngày, đổi sang mã OTP |
| 2 | Chọn ngày trên máy tính, quên mật khẩu bằng mã OTP 4 số | PR #37 (27/11) | Kiểm tra trên production | Ghi số liệu cho nghiên cứu |
| 2 | Nhật ký sự kiện của kèo | PR #39 (28/11) | 248 + 68 test; nhật ký không chứa thông tin cá nhân | Tạm dừng tính năng, chuẩn bị hồ sơ cuối kỳ |

## 4. Nhật ký điều chỉnh phạm vi

| Ngày | Thay đổi | Lý do | Ảnh hưởng |
|---|---|---|---|
| 17/11/2026 | Rút lịch từ 12 tuần (09/11/2026 – 29/01/2027) về 4 tuần, hạn **15/12/2026** | Hạn nộp của học phần | Giữ đủ hạng mục, giảm cỡ mẫu thử nghiệm và khảo sát. Ứng dụng di động chuyển sang giai đoạn 2 (16/12 – 18/01) |
| 24/11/2026 | **Charter 2.0:** bỏ bộ trích xuất bài đăng, trọng tâm chuyển sang chia chi phí theo khoản và thu tiền QR; viết lại câu hỏi nghiên cứu | Vấn đề lớn nhất của kèo vãng lai nằm ở chia tiền và thu tiền, không phải ở việc gõ bài đăng; số liệu cho RQ1, RQ2 mới sinh ra ngay trong thử nghiệm, không cần gán nhãn tay 100 bài (Charter mục 14) | Bỏ 2.2, 4.3.1, 5.4 và bộ dữ liệu 100 bài; thêm 4.3 gỡ bộ trích xuất, mở rộng 4.8.2 và 6.3; WBS còn 250 giờ |
| 24 – 28/11/2026 | Thêm 4.9 – 4.15: icon và ảnh, kho cầu, hóa đơn PDF, Tổng quan / Cài đặt, nhắn tin, ảnh chuyển khoản, quên mật khẩu, số điện thoại | Theo yêu cầu bổ sung khi dùng thử (Charter mục 5, WBS mục 3) | WBS tăng lên **318 giờ**; tuần 2 dành hết cho phát triển; khảo sát và wireframe dời sang sau |
| 28/11/2026 | Bỏ **thông báo email** | Dự án sẽ phát triển thành ứng dụng di động, thông báo sẽ đi qua app | Email chỉ còn dùng cho mã OTP và gửi hóa đơn |
| 28/11/2026 | Dời **thử nghiệm thực tế** sang tuần 3 | Chưa có người dùng thật nên chưa có số liệu | Thêm nhật ký sự kiện để số liệu được ghi ngay từ người dùng đầu tiên; cỡ mẫu nhỏ hơn kế hoạch |

## 5. Kế hoạch gốc so với hiện tại

| Mốc | Gantt gốc (13/11) | Gantt điều chỉnh (17/11) | Thực tế / hiện tại |
|---|---|---|---|
| M0 | Charter, CI: 13/11/2026 | 13/11/2026 | Đạt 13/11 (v0.1.0) |
| M1 | Chốt yêu cầu và dữ liệu: 01/12 | Production, chốt đặc tả: 23/11 | Đạt 23/11 (v0.2.0) |
| M2 | Hoàn thành thiết kế: 08/12 | Feature freeze (bộ trích xuất, 100 bài gán nhãn): 30/11 | Đổi nội dung theo Charter 2.0: các tính năng chia chi phí đã chạy; tạm dừng thêm tính năng từ 28/11 |
| M3 | Feature freeze: 10/01/2027 | Kết thúc thử nghiệm: 07/12 | Dự kiến 07/12, thử nghiệm ngắn hơn 2 tuần |
| M4 | Kết thúc thử nghiệm: 24/01/2027 | Báo cáo và slide: 13/12 | Dự kiến 13/12 |
| M5 | Nộp báo cáo và bảo vệ: 29/01/2027 | Hạn hoàn thành: 15/12 | 15/12; ngày bảo vệ chờ lịch của khoa |

## 6. Việc còn lại đến 15/12

- `docs/RELEASE.md`, tự nghiệm thu theo user stories, tag **v1.0.0**
- `docs/TEST-REPORT.md`, đưa các script E2E vào repo, bug log
- Lệnh xuất số liệu ẩn danh (CSV + `summary.txt`), 6.3 đợt 2
- Mời người chơi dùng thử, thu số liệu, phân tích RQ1 – RQ3
- Báo cáo cuối kỳ, slide, kịch bản và video demo
