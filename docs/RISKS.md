# Sổ rủi ro — Badminton Matching

> Cập nhật: 13/11/2026. Người theo dõi mọi rủi ro: An Đức Mạnh (đồ án cá nhân).
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
| R4 | Bộ trích xuất dựa trên luật không đạt chỉ tiêu | Nghiên cứu | 3 | 3 | 9 | Trung bình | Chưa đo được |
| R5 | Gán nhãn dữ liệu thiếu khách quan | Nghiên cứu | 3 | 3 | 9 | Trung bình | Chưa bắt đầu |
| R6 | Vi phạm quy định bảo vệ dữ liệu cá nhân | Pháp lý | 2 | 5 | 10 | Trung bình | Đã có biện pháp |
| R7 | Chi phí / giới hạn LLM, hosting, MongoDB Atlas M0 | Hạ tầng | 3 | 2 | 6 | Thấp | Theo dõi |
| R8 | Lộ bí mật (`JWT_SECRET`, `.env`) lên repo Public | Bảo mật | 2 | 5 | 10 | Trung bình | Đã có biện pháp |
| R9 | Lỗ hổng trong thư viện bên thứ ba | Bảo mật | 3 | 3 | 9 | Trung bình | Theo dõi |
| R10 | Hai người cùng lấy một chỗ cuối cùng | Kỹ thuật | 4 | 4 | 16 → 4 | Cao → Thấp | **Đã xử lý** |
| R11 | Sai múi giờ khi lọc theo ngày | Kỹ thuật | 4 | 3 | 12 → 3 | TB → Thấp | **Đã xử lý** |
| R12 | Môi trường dev phụ thuộc MongoDB replica set | Kỹ thuật | 3 | 2 | 6 | Thấp | Đã có biện pháp |
| R13 | Tài liệu không khớp với code | Quy trình | 3 | 2 | 6 | Thấp | Theo dõi |

Ký hiệu "16 → 4": điểm trước và sau khi đã có biện pháp xử lý.

## 3. Chi tiết từng rủi ro

### R1 — Làm một mình (Cao, 20 điểm)
- **Mô tả:** đồ án cá nhân, không có người làm thay khi ốm, bận thi cuối kỳ hoặc việc riêng; kế hoạch cần khoảng 22 giờ/tuần.
- **Dấu hiệu sớm:** một tuần làm dưới 15 giờ; một công việc trên đường găng trễ quá 3 ngày.
- **Phòng ngừa:** nhật ký tuần (WBS 1.3.1); phân loại MoSCoW trong Charter; không đặt mốc vào tuần thi.
- **Dự phòng:** cắt theo thứ tự 4.6 Thông báo email → 4.5.3 Trang cá nhân → 5.3 E2E ([Gantt](03-gantt.md)); trễ quá 1 tuần thì báo giảng viên hướng dẫn ngay.

### R2 — Thử nghiệm thực tế thiếu người dùng (Cao, 16 điểm)
- **Mô tả:** nền tảng mới chưa có ai dùng nên chưa có kèo; chưa có kèo thì không ai vào. Không đủ số liệu cho RQ3 (mục tiêu ≥ 30 người dùng, ≥ 20 kèo).
- **Dấu hiệu sớm:** đến 05/01/2027 chưa có chủ sân / admin hội nhóm nào đồng ý hỗ trợ.
- **Phòng ngừa:** chỉ thử nghiệm ở 1 khu vực (Hà Nội); liên hệ chủ sân, admin hội nhóm từ tháng 12; tự đăng kèo thật để khởi động; nút chia sẻ kèo lên Facebook / Zalo.
- **Dự phòng:** giảm chỉ tiêu và ghi rõ trong báo cáo; bổ sung số liệu từ usability test (RQ2).

### R3 — Phình phạm vi (Cao, 16 điểm)
- **Mô tả:** liên tục thêm chức năng ngoài kế hoạch làm chậm các việc trên đường găng.
- **Dấu hiệu sớm:** làm một chức năng không có mã trong [WBS](02-wbs.md).
- **Phòng ngừa:** trước feature freeze (M3) chỉ làm mục *Must*; ý tưởng mới ghi vào backlog; mọi thay đổi phạm vi phải cập nhật WBS + Gantt.
- **Ghi nhận:** giai đoạn khởi tạo đã thêm trang Tài khoản, Kèo của tôi, Hủy kèo (khoảng 6 giờ công) — chấp nhận vì là phần cốt lõi của trải nghiệm; đã ghi vào [project.md](project.md).

### R4 — Bộ trích xuất dựa trên luật không đạt chỉ tiêu (Trung bình, 9 điểm)
- **Mô tả:** cách viết bài đăng quá đa dạng, F1 của phương pháp luật dưới 0,75.
- **Dấu hiệu sớm:** trên tập phát triển (140 bài), F1 một nhóm trường dưới 0,6.
- **Phòng ngừa:** mở rộng luật dựa trên phân tích lỗi; bộ test mẫu cho từng trường hợp khó.
- **Dự phòng:** dựa vào phương pháp LLM / kết hợp; trình bày kết quả thấp như một phát hiện nghiên cứu (giới hạn của phương pháp luật).

### R5 — Gán nhãn dữ liệu thiếu khách quan (Trung bình, 9 điểm)
- **Mô tả:** một người vừa viết bộ trích xuất vừa gán nhãn, dễ thiên lệch.
- **Phòng ngừa:** hướng dẫn gán nhãn viết trước; nhờ 1 người gán độc lập 50 bài, đo Cohen's κ (mục tiêu ≥ 0,8); tự gán lại 20% sau 1 tuần; tập kiểm tra 60 bài giữ kín, không dùng khi viết luật.

### R6 — Vi phạm quy định bảo vệ dữ liệu cá nhân (Trung bình, 10 điểm)
- **Mô tả:** thu thập bài đăng hoặc thông tin người dùng trái Nghị định 13/2023/NĐ-CP và Luật Bảo vệ dữ liệu cá nhân.
- **Phòng ngừa:** không tự động thu thập dữ liệu từ Facebook; bài chép tay xóa tên, số điện thoại, ảnh, đường dẫn hồ sơ ngay khi chép; `data/raw/` không lên Git; ứng dụng chỉ lưu email, tên hiển thị, giới tính, trình độ; API không trả email người khác.

### R7 — Chi phí / giới hạn dịch vụ miễn phí (Thấp, 6 điểm)
- **Mô tả:** chi phí API LLM vượt ngân sách; MongoDB Atlas M0 giới hạn 512 MB; hosting miễn phí tự tắt khi không có truy cập.
- **Phòng ngừa:** đặt hạn mức chi cho API LLM; chỉ gọi LLM khi phương pháp luật không trích được (kết hợp); theo dõi dung lượng CSDL.

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
- **Phòng ngừa:** thay đổi API / CSDL thì cập nhật [API.md](API.md) / [database.md](database.md) trong cùng Pull Request (mẫu PR có ô kiểm); xem lại tài liệu tại mỗi mốc.

## 4. Cập nhật sổ rủi ro

- Xem lại các rủi ro mức **Cao** mỗi tuần (cùng lúc ghi nhật ký tuần), các rủi ro còn lại tại mỗi mốc.
- Rủi ro đã xử lý giữ lại trong bảng, ghi điểm trước và sau, kèm bằng chứng.
- Rủi ro mới thêm vào cuối bảng với mã tiếp theo (R14, R15…).
