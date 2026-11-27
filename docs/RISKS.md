# Sổ rủi ro — Badminton Matching

> Cập nhật: 24/11/2026 (Charter 2.0: bỏ bộ trích xuất bài đăng; đóng R4, R5; thêm R16, R17). Người theo dõi mọi rủi ro: An Đức Mạnh (đồ án cá nhân).
> Tài liệu liên quan: [Charter](01-project-charter.md) mục 10 (R1–R7 gốc) · [QUALITY.md](QUALITY.md) · [Gantt](03-gantt.md)

## 1. Cách đánh giá

**Điểm = Khả năng xảy ra (1–5) × Mức ảnh hưởng (1–5).**

| Điểm | Mức | Cách xử lý |
|---|---|---|
| 15 – 25 | Cao | Có biện pháp phòng ngừa ngay; xem lại mỗi tuần |
| 8 – 14 | Trung bình | Có biện pháp phòng ngừa; xem lại mỗi mốc |
| 1 – 7 | Thấp | Theo dõi |

Thang khả năng: 1 hiếm khi · 2 khó xảy ra · 3 có thể · 4 dễ xảy ra · 5 gần như chắc chắn.
Thang ảnh hưởng: 1 không đáng kể · 2 nhỏ · 3 trễ < 1 tuần hoặc phải cắt mục *Could* · 4 trễ một mốc hoặc phải cắt mục *Should* · 5 không hoàn thành được đồ án / vi phạm pháp luật.

## 2. Bảng tổng hợp

| Mã | Rủi ro | Nhóm | K | A | Điểm | Mức | Trạng thái |
|---|---|---|:-:|:-:|:-:|---|---|
| R1 | Làm một mình: ốm, bận thi, việc riêng | Tiến độ | 4 | 5 | 20 | Cao | Đang theo dõi |
| R2 | Thử nghiệm thực tế thiếu người dùng | Nghiên cứu | 4 | 4 | 16 | Cao | Đang theo dõi |
| R3 | Phình phạm vi | Tiến độ | 4 | 4 | 16 | Cao | Đang theo dõi |
| R4 | Bộ trích xuất dựa trên luật không đạt chỉ tiêu | Nghiên cứu | – | – | – | – | **Đóng** (bỏ bộ trích xuất, 24/11) |
| R5 | Gán nhãn dữ liệu thiếu khách quan | Nghiên cứu | – | – | – | – | **Đóng** (không còn bộ dữ liệu gán nhãn, 24/11) |
| R6 | Vi phạm quy định bảo vệ dữ liệu cá nhân | Pháp lý | 2 | 5 | 10 | Trung bình | Đã có biện pháp |
| R7 | Mã QR chuyển khoản sai (sai số tài khoản, sai số tiền) | Kỹ thuật | 2 | 3 | 6 | Thấp | Theo dõi |
| R8 | Lộ bí mật (`JWT_SECRET`, `.env`) lên repo Public | Bảo mật | 2 | 5 | 10 | Trung bình | Đã có biện pháp |
| R9 | Lỗ hổng trong thư viện bên thứ ba | Bảo mật | 3 | 3 | 9 | Trung bình | Theo dõi |
| R10 | Hai người cùng lấy một chỗ cuối cùng | Kỹ thuật | 4 | 4 | 16 → 4 | Cao → Thấp | **Đã xử lý** |
| R11 | Sai múi giờ khi lọc theo ngày | Kỹ thuật | 4 | 3 | 12 → 3 | TB → Thấp | **Đã xử lý** |
| R12 | Môi trường dev phụ thuộc MongoDB replica set | Kỹ thuật | 3 | 2 | 6 | Thấp | Đã có biện pháp |
| R13 | Tài liệu không khớp với code | Quy trình | 3 | 2 | 6 | Thấp | Theo dõi |
| R14 | Thời gian còn lại rất ngắn (hạn 15/12/2026) | Tiến độ | 4 | 5 | 20 | Cao | Đang theo dõi |
| R15 | Máy chủ chạy thật gián đoạn hoặc mất dữ liệu trong thời gian thử nghiệm | Hạ tầng | 3 | 4 | 12 | Trung bình | Đã có biện pháp |
| R16 | Giảng viên chưa đồng ý đổi đề tài và câu hỏi nghiên cứu lúc muộn (Charter 2.0) | Quy trình | 3 | 5 | 15 | Cao | Đang theo dõi |
| R17 | Thiếu số liệu cho RQ1, RQ2 vì chủ kèo không nhập khoản chi / không đánh dấu đã trả | Nghiên cứu | 3 | 4 | 12 | Trung bình | Đang theo dõi |
| R18 | Ảnh người dùng tải lên: ảnh không phù hợp, lộ vị trí qua EXIF, file độc hại, đầy ổ đĩa | Bảo mật | 2 | 3 | 6 | Thấp | Đã có biện pháp |
| R19 | Nhắn tin: quấy rối, spam, lộ tin nhắn cho người ngoài | Bảo mật | 2 | 3 | 6 | Thấp | Đã có biện pháp |
| R20 | Email: thư vào Spam, lộ link đặt lại mật khẩu, bị dùng để gửi thư hàng loạt | Bảo mật | 2 | 3 | 6 | Thấp | Đã có biện pháp |

Ký hiệu "16 → 4": điểm trước và sau khi đã có biện pháp xử lý.

## 3. Chi tiết từng rủi ro

### R1 — Làm một mình (Cao, 20 điểm)
- **Mô tả:** đồ án cá nhân, không có người làm thay khi ốm, bận thi cuối kỳ hoặc việc riêng; kế hoạch cần khoảng 34 giờ/tuần trong 4 tuần cuối (hạn 15/12/2026).
- **Dấu hiệu sớm:** một tuần làm dưới 25 giờ; một công việc trên đường găng trễ quá 3 ngày.
- **Phòng ngừa:** nhật ký tuần (WBS 1.3.1); phân loại MoSCoW trong Charter; không đặt mốc vào tuần thi.
- **Dự phòng:** cắt theo thứ tự 4.7 Uy tín → 4.6 Thông báo email → 5.3 E2E → 3.4 Wireframe ([Gantt](03-gantt.md) mục 4); trễ quá 1 tuần thì báo giảng viên hướng dẫn ngay.

### R2 — Thử nghiệm thực tế thiếu người dùng (Cao, 16 điểm)
- **Mô tả:** nền tảng mới chưa có ai dùng nên chưa có kèo; chưa có kèo thì không ai vào. Không đủ số liệu cho RQ3 (mục tiêu ≥ 15 người dùng, ≥ 10 kèo trong 2 tuần 24/11 – 07/12/2026).
- **Dấu hiệu sớm:** đến 21/11/2026 chưa có chủ sân / admin hội nhóm nào đồng ý hỗ trợ.
- **Phòng ngừa:** chỉ thử nghiệm ở 1 khu vực (Hà Nội); liên hệ chủ sân, admin hội nhóm ngay tuần 17/11 – 23/11; tự đăng kèo thật để khởi động; nút chia sẻ kèo lên Facebook / Zalo.
- **Dự phòng:** giảm chỉ tiêu và ghi rõ trong báo cáo; bổ sung số liệu từ usability test (RQ2).

### R3 — Phình phạm vi (Cao, 16 điểm)
- **Mô tả:** liên tục thêm chức năng ngoài kế hoạch làm chậm các việc trên đường găng.
- **Dấu hiệu sớm:** làm một chức năng không có mã trong [WBS](02-wbs.md).
- **Phòng ngừa:** trước feature freeze (M3) chỉ làm mục *Must*; ý tưởng mới ghi vào backlog; mọi thay đổi phạm vi phải cập nhật WBS + Gantt.
- **Ghi nhận:** giai đoạn khởi tạo đã thêm trang Tài khoản, Kèo của tôi, Hủy kèo (khoảng 6 giờ công) — chấp nhận vì là phần cốt lõi của trải nghiệm; đã ghi vào [project.md](project.md).
- **Ghi nhận (17/11/2026):** app di động được đưa vào kế hoạch dưới dạng **giai đoạn 2, sau khi bảo vệ** (khoảng 63 giờ, [WBS](02-wbs.md) mục 5). Quy tắc: **không làm bất kỳ phần nào của app trước mốc M5**; giai đoạn 1 chỉ giữ thiết kế API độc lập với giao diện để app dùng lại được.
- **Ghi nhận (24/11/2026):** thêm gói **4.8 Thu tiền và chi phí kèo** (15 giờ, ý tưởng từ một ứng dụng chia tiền cầu lông, tự làm lại theo nhu cầu kèo vãng lai) và **bỏ bộ trích xuất LLM / hybrid** (13 giờ) để bù. Tổng khối lượng chỉ tăng 2 giờ; các tính năng quỹ nhóm, kho cầu, chia theo số trận ghi vào ngoài phạm vi (Charter mục 5.2).
- **Ghi nhận (24/11/2026, lần 2):** thêm 4.5.4 giao diện kiểu app trên điện thoại (8 giờ) theo yêu cầu; giữ nguyên mọi tính năng, máy tính vẫn dùng bố cục web. Đây là thay đổi ngoài kế hoạch thứ ba trong tuần; từ giờ tới M2 (30/11) ưu tiên bộ dữ liệu RQ1 và thử nghiệm thực tế.
- **Ghi nhận (27/11/2026):** thêm 4.14 email, hóa đơn PDF, ảnh chuyển khoản, quên mật khẩu và 4.15 số điện thoại, "Hôm nay" thành bộ lọc (15 giờ) theo yêu cầu. Tổng giai đoạn 1 thành 318 giờ.
- **Ghi nhận (25/11/2026, lần 3):** thêm 4.13 nhắn tin trong app (13 giờ) theo yêu cầu; chat chuyển từ ngoài phạm vi vào phạm vi Charter. Tổng giai đoạn 1 thành 303 giờ.
- **Ghi nhận (25/11/2026, lần 2):** thêm 4.12 Tổng quan, Cài đặt, chế độ tối (11 giờ) theo yêu cầu. Tổng giai đoạn 1 thành 290 giờ.
- **Ghi nhận (25/11/2026):** thêm 4.10 kho cầu và 4.11 ảnh bill, hóa đơn PDF (17 giờ) theo yêu cầu; kho cầu chuyển từ ngoài phạm vi vào phạm vi Charter. Tổng giai đoạn 1 thành 279 giờ.
- **Ghi nhận (24/11/2026, lần 3):** thêm 4.9 icon và ảnh đại diện / ảnh bìa (12 giờ) theo yêu cầu, làm xong trong ngày; tổng giai đoạn 1 thành 262 giờ, phần việc còn lại không đổi.

### R4 — Bộ trích xuất dựa trên luật không đạt chỉ tiêu (Đóng 24/11/2026)
- **Đóng:** bộ trích xuất bị bỏ khi đổi trọng tâm nghiên cứu (Charter 2.0). Nội dung dưới đây giữ lại để đối chiếu.
- **Mô tả:** cách viết bài đăng quá đa dạng, F1 của phương pháp luật dưới 0,75.
- **Dấu hiệu sớm:** trên tập phát triển (70 bài), F1 một nhóm trường dưới 0,6.
- **Phòng ngừa:** mở rộng luật dựa trên phân tích lỗi; bộ test mẫu cho từng trường hợp khó.
- **Dự phòng:** mở rộng luật cho các nhóm lỗi lớn nhất trên tập phát triển (không đụng tập kiểm tra); nếu vẫn dưới chỉ tiêu, trình bày như một phát hiện nghiên cứu (giới hạn của phương pháp luật) kèm bảng phân loại lỗi. Phương án dùng LLM / hybrid đã bỏ ngày 24/11/2026.

### R5 — Gán nhãn dữ liệu thiếu khách quan (Đóng 24/11/2026)
- **Đóng:** không còn bộ dữ liệu gán nhãn (Charter 2.0). Nội dung dưới đây giữ lại để đối chiếu.
- **Mô tả:** một người vừa viết bộ trích xuất vừa gán nhãn, dễ thiên lệch.
- **Phòng ngừa:** hướng dẫn gán nhãn viết trước; nhờ 1 người gán độc lập 30 bài, đo Cohen's κ (mục tiêu ≥ 0,8); tự gán lại 20% sau 1 tuần; tập kiểm tra 30 bài giữ kín, không dùng khi viết luật.

### R6 — Vi phạm quy định bảo vệ dữ liệu cá nhân (Trung bình, 10 điểm)
- **Mô tả:** thu thập bài đăng hoặc thông tin người dùng trái Nghị định 13/2023/NĐ-CP và Luật Bảo vệ dữ liệu cá nhân.
- **Phòng ngừa:** không tự động thu thập dữ liệu từ Facebook; bài chép tay xóa tên, số điện thoại, ảnh, đường dẫn hồ sơ ngay khi chép; `data/raw/` không lên Git; ứng dụng chỉ lưu email, tên hiển thị, giới tính, trình độ; API không trả email người khác. **Số điện thoại** (WBS 4.15) không bắt buộc, xóa được, chỉ người cùng kèo thấy, không có trong danh sách kèo. **Ảnh chuyển khoản** (WBS 4.14) chỉ chủ kèo và người gửi thấy. **Ảnh đại diện / ảnh bìa** (WBS 4.9) không bắt buộc, xóa được, server bỏ toàn bộ EXIF kể cả vị trí GPS (R18). **Số tài khoản nhận tiền** (WBS 4.8.1) do người dùng tự nhập và tự xóa được, không bắt buộc, chỉ người đã tham gia kèo của chủ tài khoản mới thấy (BR-15, TC-Q2-09); hệ thống không lưu giao dịch chuyển tiền.

### R7 — Mã QR chuyển khoản sai (Thấp, 6 điểm)
- **Mô tả:** chủ kèo nhập sai số tài khoản hoặc mã QR sinh sai số tiền / nội dung, người chơi chuyển nhầm (gói 4.8). Thay cho rủi ro chi phí API LLM trước đây (đã bỏ LLM ngày 24/11/2026).
- **Phòng ngừa:** hiện tên chủ tài khoản cạnh mã QR để người chuyển đối chiếu; mã QR sinh theo chuẩn VietQR và có unit test với các mẫu đã kiểm tra bằng ứng dụng ngân hàng; nội dung chuyển khoản có mã kèo; hệ thống không giữ tiền nên không phát sinh hoàn tiền.

### R8 — Lộ bí mật lên repo Public (Trung bình, 10 điểm)
- **Mô tả:** `JWT_SECRET` hoặc chuỗi kết nối CSDL bị commit → ai cũng giả mạo được token của bất kỳ người dùng nào.
- **Phòng ngừa:** `.env` trong `.gitignore`; chỉ commit `.env.example` với giá trị mẫu; server từ chối khởi động nếu `JWT_SECRET` < 32 ký tự hoặc còn giá trị mẫu; trước mỗi lần push kiểm tra danh sách file bằng `git add --dry-run`.
- **Dự phòng:** nếu lỡ commit: đổi `JWT_SECRET` ngay (mọi token cũ hết hiệu lực), đổi mật khẩu CSDL, xóa khỏi lịch sử Git.

### R9 — Lỗ hổng thư viện bên thứ ba (Trung bình, 9 điểm)
- **Hiện trạng:** `npm audit --omit=dev` (thư viện chạy thật) = 0 lỗ hổng. Thư viện dev: Jest 30 có lỗ hổng ở thư viện con (`deepmerge`, `glob`); không ảnh hưởng bản chạy thật.
- **Phòng ngừa:** chạy `npm audit --omit=dev` trước mỗi mốc; cập nhật thư viện mỗi tháng; không dùng `npm audit fix --force` vì có thể hạ phiên bản.

### R10 — Hai người cùng lấy một chỗ cuối cùng (Đã xử lý: 16 → 4)
- **Mô tả:** đọc kèo → kiểm tra còn chỗ → ghi; hai request song song đều thấy "còn 1 chỗ" và cùng vào.
- **Xử lý:** tham gia / rời / hủy chạy trong transaction MongoDB; transaction đến sau gặp xung đột ghi, tự chạy lại và đọc thấy hết chỗ.
- **Bằng chứng:** TC-Q1-01 ([QUALITY.md](QUALITY.md)): 5 người cùng bấm, đúng 2 người vào; chạy riêng 5 lần đều đạt.

### R11 — Sai múi giờ khi lọc theo ngày (Đã xử lý: 12 → 3)
- **Mô tả:** server / CI chạy giờ UTC; kèo 5h30 sáng (giờ VN) bị tính sang ngày hôm trước.
- **Xử lý:** CSDL lưu UTC; mọi phép tính ngày đi qua `utils/vnTime.js`; tham số `date` của API hiểu theo lịch Việt Nam.
- **Bằng chứng:** TC-Q1-06.

### R12 — Môi trường dev phụ thuộc MongoDB replica set (Thấp, 6 điểm)
- **Mô tả:** chuyển sang máy khác, MongoDB mặc định chạy standalone → chức năng tham gia kèo lỗi.
- **Phòng ngừa:** server in cảnh báo khi MongoDB không phải replica set; có lệnh `npm run db:init-replset`; hướng dẫn trong [database.md](database.md) mục 1. Test tự động không cần cài MongoDB (chạy trong RAM).

### R13 — Tài liệu không khớp với code (Thấp, 6 điểm)
- **Phòng ngừa:** thay đổi API / CSDL thì cập nhật [API.md](API.md) / [database.md](database.md) trong cùng Pull Request; xem lại tài liệu tại mỗi mốc.

### R14 — Thời gian còn lại rất ngắn (Cao, 20 điểm)
- **Mô tả:** hạn hoàn thành dời về 15/12/2026; còn 4 tuần cho khoảng 137 giờ công (~34 giờ/tuần), trong đó thử nghiệm thực tế cần đủ 2 tuần lịch.
- **Dấu hiệu sớm:** M1 (23/11) chưa deploy được production; M2 (30/11) bộ dữ liệu chưa gán nhãn xong.
- **Phòng ngừa:** deploy ngay tuần đầu để thử nghiệm chạy song song với các việc khác; giữ đủ hạng mục nhưng giảm cỡ mẫu (100 bài, ≥ 30 phản hồi khảo sát, ≥ 15 người thử nghiệm, ≥ 8 người usability test); viết báo cáo dần từ 02/12, dùng lại tài liệu kỹ thuật đã có (`project.md`, `API.md`, `database.md`).
- **Dự phòng:** cắt theo thứ tự ở [Gantt](03-gantt.md) mục 5; không cắt thử nghiệm thực tế, bộ dữ liệu gán nhãn và đánh giá RQ1, vì đó là phần nghiên cứu chính. Ngày 24/11/2026 đã bỏ bộ trích xuất LLM / hybrid (13 giờ) để có thời gian cho gói 4.8.

### R15 — Máy chủ chạy thật gián đoạn hoặc mất dữ liệu (Trung bình, 12 điểm)
- **Mô tả:** hệ thống chạy trên một máy chủ Ubuntu đặt sau Cloudflare ([DEPLOY.md](DEPLOY.md)). Máy có thể khởi động lại ngoài kế hoạch, ổ đĩa còn ít (khoảng 4 GB trống), MongoDB không bật xác thực; mất dữ liệu giữa thời gian thử nghiệm là mất số liệu RQ3.
- **Dấu hiệu sớm:** `https://sv22.bcse-vju.com/api/health` không phản hồi; ổ đĩa dùng trên 90%; file sao lưu hằng ngày không xuất hiện.
- **Phòng ngừa:** PM2 tự chạy lại backend khi lỗi và sau khi máy khởi động lại (`pm2 startup` + `pm2 save`); khởi động lại máy một lần **trước** khi bắt đầu thử nghiệm để kiểm tra; MongoDB chỉ nghe `127.0.0.1`, máy không mở cổng ra Internet; sao lưu tự động hằng ngày, giữ 7 ngày; xoay vòng log PM2; kiểm tra bằng `npm run smoke` sau mỗi lần triển khai.
- **Dự phòng:** khôi phục từ bản sao lưu gần nhất ([DEPLOY.md](DEPLOY.md) mục 6); chép bản sao lưu về máy cá nhân mỗi tuần thử nghiệm; ghi lại thời gian gián đoạn vào nhật ký thử nghiệm để loại khỏi số liệu.

### R16 — Giảng viên chưa đồng ý đổi đề tài lúc muộn (Cao, 15 điểm)
- **Mô tả:** ngày 24/11/2026 đổi trọng tâm nghiên cứu từ trích xuất bài đăng sang chia chi phí theo từng khoản và thu tiền QR (Charter 2.0), chỉ 3 tuần trước hạn.
- **Dấu hiệu sớm:** chưa có phản hồi của giảng viên sau 2 ngày gửi Charter 2.0.
- **Phòng ngừa:** gửi Charter 2.0 kèm mục 14 (lý do đổi) ngay; phần nền tảng (ghép kèo, thu tiền QR, máy chủ) không phụ thuộc quyết định này nên vẫn làm tiếp.
- **Dự phòng:** Charter 1.x và code bộ trích xuất còn trong lịch sử Git (tag `v0.2.0`), khôi phục được trong vài giờ nếu giảng viên yêu cầu giữ đề tài cũ.

### R17 — Thiếu số liệu cho RQ1, RQ2 (Trung bình, 12 điểm)
- **Mô tả:** RQ1, RQ2 dựa trên khoản chi và thời điểm đánh dấu đã trả do chủ kèo nhập; nếu chủ kèo không nhập thì không có số liệu.
- **Dấu hiệu sớm:** sau tuần thử nghiệm đầu, dưới 5 kèo có khoản chi.
- **Phòng ngừa:** nhắc chủ kèo trên trang kèo; nhập khoản chi được bất cứ lúc nào; tự tổ chức một số kèo thật trong thử nghiệm.
- **Dự phòng:** bổ sung bằng câu hỏi trong khảo sát cuối thử nghiệm; trình bày RQ1 bằng số liệu khảo sát nếu số kèo quá ít, ghi rõ giới hạn.

### R18 — Ảnh người dùng tải lên (Thấp, 6 điểm)
- **Mô tả:** ảnh đại diện / ảnh bìa (WBS 4.9) và ảnh bill (WBS 4.11, có thể chụp cả thông tin cá nhân trên hóa đơn) có thể chứa vị trí GPS của người chụp, là file giả dạng ảnh, quá lớn làm đầy ổ đĩa, hoặc có nội dung không phù hợp.
- **Phòng ngừa:** kiểm tra định dạng theo nội dung file (chỉ JPEG / PNG / WebP), tối đa 5 MB ở cả Nginx và backend, giới hạn số điểm ảnh khi giải mã; server vẽ lại ảnh thành WebP kích thước cố định nên metadata (EXIF, GPS) và dữ liệu thừa bị bỏ; tên file ngẫu nhiên, chỉ xóa đúng dạng tên do server tạo; ảnh cũ bị xóa khi đổi nên mỗi người chỉ chiếm 1 ảnh đại diện, mỗi kèo 1 ảnh bìa (~20–100 KB) và tối đa 7 ảnh bill (~100–300 KB mỗi ảnh); ảnh bill chỉ người trong kèo xem được qua API (đường dẫn file là tên ngẫu nhiên 32 ký tự, không liệt kê được). Test: `backend/tests/post/bills.test.js`. Test: `backend/tests/images.test.js`.
- **Dự phòng:** ảnh không phù hợp trong thời gian thử nghiệm: xóa file trong `UPLOAD_DIR` và đặt trường `avatar` / `cover` về `null`; chưa làm chức năng báo cáo ảnh vì quy mô thử nghiệm nhỏ.

### R19 — Nhắn tin trong app (Thấp, 6 điểm)
- **Mô tả:** người dùng nhắn tin quấy rối / spam; người ngoài đọc được tin của kèo; kết nối WebSocket bị lợi dụng.
- **Phòng ngừa:** chỉ người đã cùng ở trong một kèo mới nhắn được, quyền tính lại ở mỗi lần đọc / gửi; tự đóng 2 giờ sau kèo nên không nhắn mãi cho người lạ; nút **chặn** nhắn riêng; chỉ gửi chữ ≤ 1.000 ký tự, ≤ 20 tin / phút / người; WebSocket chỉ nhận từ đúng địa chỉ web, token gửi trong tin đầu tiên (không nằm trên URL, không vào log), gói tin ≤ 4 KB. Test: `backend/tests/chat/chat.test.js`.
- **Dự phòng:** chưa có chức năng báo cáo tin nhắn và quản trị viên; trong thử nghiệm, tin vi phạm được xóa trực tiếp trong CSDL theo yêu cầu và ghi lại.

### R20 — Email (Thấp, 6 điểm)
- **Mô tả:** thư quên mật khẩu / thư báo ảnh chuyển khoản vào mục Spam hoặc không tới; link đặt lại mật khẩu bị lộ; kẻ xấu dùng chức năng quên mật khẩu để gửi thư hàng loạt hoặc dò email đã đăng ký.
- **Phòng ngừa:** link chứa mã ngẫu nhiên 32 byte, CSDL chỉ lưu mã băm, hết hạn sau 30 phút, dùng một lần, đặt xong thì mọi phiên cũ hết hiệu lực; luôn trả cùng một câu dù email có tồn tại hay không; mỗi email 1 thư / phút, mỗi IP 5 yêu cầu / giờ; Gmail riêng cho app với mật khẩu ứng dụng chỉ nằm trong `.env` máy chủ; gửi thư hỏng không làm hỏng thao tác chính. Test: `backend/tests/auth/reset-password.test.js`, `tests/post/proofs.test.js`.
- **Dự phòng:** thư vào Spam → hướng dẫn người dùng đánh dấu "Không phải spam"; vượt hạn mức Gmail (~500 thư / ngày) → chuyển sang dịch vụ gửi thư (Brevo, Resend) chỉ bằng cách đổi `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.

## 4. Cập nhật sổ rủi ro

- Xem lại các rủi ro mức **Cao** mỗi tuần (cùng lúc ghi nhật ký tuần), các rủi ro còn lại tại mỗi mốc.
- Rủi ro đã xử lý giữ lại trong bảng, ghi điểm trước và sau, kèm bằng chứng.
- Rủi ro mới thêm vào cuối bảng với mã tiếp theo (R14, R15…).
