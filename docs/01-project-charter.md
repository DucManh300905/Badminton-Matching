# PROJECT CHARTER – ĐỒ ÁN KHOA HỌC KỸ THUẬT

| | |
|---|---|
| **Sinh viên thực hiện** | An Đức Mạnh – MSSV 23110310 |
| **Giảng viên hướng dẫn** | [ ] |
| **Hình thức** | Đồ án cá nhân |
| **Phiên bản** | **2.0 – đề xuất đổi trọng tâm nghiên cứu** (bản trình duyệt) |
| **Ngày lập** | 13/11/2026 · cập nhật 17/11/2026: lộ trình 2 giai đoạn, **hạn hoàn thành dự án 15/12/2026** · cập nhật 24/11/2026 (bản 2.0): **bỏ bộ trích xuất bài đăng**, đổi trọng tâm nghiên cứu sang **chia chi phí theo từng khoản và thu tiền bằng mã QR** (mục 1, 3, 4, 5, 6, 7, 10, 12; lý do ở mục 14) |
| **Trạng thái** | **Chờ giảng viên hướng dẫn phê duyệt việc đổi đề tài và câu hỏi nghiên cứu** |
| **Tên dự án (tên tạm)** | Badminton Matching |

---

## 1. Đề tài chính thức

**Tiếng Việt:** *Xây dựng nền tảng web ghép kèo cầu lông vãng lai, có cơ chế chia chi phí theo từng khoản và thu tiền bằng mã QR.*

**English:** *A web platform for matching casual badminton players, with itemized cost sharing and QR-based payment collection.*

**Lĩnh vực:** Công nghệ phần mềm ứng dụng.

---

## 2. Bối cảnh và vấn đề

Cầu lông là một trong những môn thể thao phong trào phổ biến nhất Việt Nam. Mỗi kèo thường cần 4–8 người, nên thiếu người xảy ra thường xuyên. Hiện nay người chơi chủ yếu tìm đối đánh vãng lai ("ghép kèo") qua các hội nhóm Facebook, cách này có nhiều bất cập:

1. **Thông tin phi cấu trúc:** giờ, sân, trình độ, giá, số chỗ đều viết tự do, không lọc hay tìm kiếm được.
2. **Bài cũ trôi lẫn với bài mới:** không biết kèo nào còn chỗ, kèo nào đã đủ người.
3. **Không có cơ chế giữ chỗ và uy tín:** phải comment, nhắn tin thủ công, và không có cách nào hạn chế người "bùng kèo".
4. **Chia tiền và thu tiền khó khăn:**
   - Giá niêm yết trong bài đăng là con số cố định, trong khi thực tế thường **phát sinh** thêm tiền cầu, nước, đi ăn sau buổi chơi.
   - Chủ kèo thường đi cùng **một nhóm bạn không dùng nền tảng**. Người vãng lai **chỉ đến đánh**, không cùng ăn uống. Vì vậy **chia đều mọi khoản cho tất cả là không công bằng**.
   - Chủ kèo phải tự nhắn số tài khoản, nhắc nợ từng người lạ, và chịu thiệt khi có người **bùng tiền**.

Các ứng dụng ghép kèo hiện có (Vmito, Pickcourt, Tuyển Vãng Lai…) đã giải quyết tốt vấn đề 1–3 nhưng chưa có cơ chế chia chi phí theo từng khoản cho kèo vãng lai. Đây là khoảng trống đồ án tập trung giải quyết.

Việc tự động thu thập (cào) dữ liệu từ Facebook đã được cân nhắc và bị loại bỏ, vì vi phạm Điều khoản dịch vụ của Meta và quy định về bảo vệ dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP, Luật Bảo vệ dữ liệu cá nhân có hiệu lực từ 01/01/2026).

---

## 3. Mục tiêu

### 3.1 Mục tiêu tổng quát
Xây dựng và thử nghiệm thực tế một nền tảng web giúp người chơi cầu lông đăng, tìm và tham gia kèo nhanh hơn so với cách dùng hội nhóm Facebook hiện nay. Đồng thời đánh giá cơ chế **chia chi phí theo từng khoản** và **thu tiền bằng mã QR** trong bối cảnh kèo vãng lai.

### 3.2 Mục tiêu cụ thể (SMART)
| # | Mục tiêu | Chỉ số đo | Hạn |
|---|---|---|---|
| O1 | Hoàn thành web app với các chức năng cốt lõi (đăng kèo, tìm / lọc, tham gia, chi phí theo từng khoản, thu tiền bằng mã QR) | 100% user story mức *Must* đạt tiêu chí chấp nhận | 30/11/2026 |
| O2 | Khảo sát người chơi về cách chia tiền, bùng kèo, bùng tiền hiện nay | ≥ 30 phản hồi hợp lệ | 30/11/2026 |
| O3 | Thu tiền hiệu quả trong thử nghiệm thực tế | ≥ 80% người phải trả được chủ kèo đánh dấu đã trả trong 24 giờ sau giờ kết thúc | 07/12/2026 |
| O4 | Thử nghiệm thực tế tại 1 khu vực | ≥ 15 người dùng thật, ≥ 10 kèo được đăng trong 2 tuần | 07/12/2026 |
| O5 | Đảm bảo chất lượng mã nguồn | Unit test chạy tự động trên CI, coverage dòng ≥ 80% | Liên tục |

---

## 4. Câu hỏi nghiên cứu và giả thuyết

| | Câu hỏi nghiên cứu | Giả thuyết | Phương pháp kiểm chứng |
|---|---|---|---|
| **RQ1** | Trong kèo vãng lai, chia chi phí theo từng khoản (chủ kèo chọn người cùng chịu cho mỗi khoản) khác chia đều cho tất cả như thế nào? | **H1:** ≥ 30% kèo có chi phí có ít nhất một khoản **không** chia cho tất cả; trong các kèo đó, số tiền mỗi người chênh lệch trung bình ≥ 20.000đ so với chia đều; người chơi đánh giá mức công bằng trung bình ≥ 4/5. | Ghi lại các khoản chi trong 2 tuần thử nghiệm; tính lại phương án chia đều trên **cùng dữ liệu** để so sánh; thống kê mô tả; câu hỏi Likert 1–5 về mức công bằng trong khảo sát cuối thử nghiệm. |
| **RQ2** | Thu tiền bằng mã QR kèm trạng thái "đã trả / còn thiếu" có giúp chủ kèo thu đủ tiền nhanh và giảm bùng tiền không? | **H2:** ≥ 80% người phải trả được đánh dấu đã trả trong 24 giờ sau giờ kết thúc; trung vị thời gian thu đủ một kèo ≤ 12 giờ. | Thời điểm đánh dấu đã trả so với giờ kết thúc (log hệ thống); đối chiếu với tỉ lệ bùng tiền và thời gian nhắc nợ theo cách cũ do người chơi tự báo trong khảo sát đầu kỳ. |
| **RQ3** | Nền tảng có cấu trúc giúp kèo được lấp đủ người hiệu quả hơn không? | **H3:** ≥ 60% kèo đăng trong thời gian thử nghiệm đủ người trước giờ chơi. | Thống kê log hệ thống trong 2 tuần thử nghiệm, kèm khảo sát mức hài lòng (thang SUS). |

---

## 5. Phạm vi

Vì đồ án do một người thực hiện, phạm vi được phân loại theo MoSCoW để biết cần cắt gì trước nếu bị chậm tiến độ.

### 5.1 Trong phạm vi
| Chức năng | Mức |
|---|---|
| Web app responsive: kiểu web trên máy tính, kiểu app trên điện thoại; cài lên màn hình chính (PWA) | Must |
| Đăng ký / đăng nhập bằng email + mật khẩu (JWT) | Must |
| Đăng nhập bằng Google | Could |
| Đăng kèo: sân, thời gian, trình độ, số chỗ theo giới tính, **chi phí dự kiến** mỗi người (để tham khảo) | Must |
| Tìm kiếm và lọc theo khu vực, thời gian, trình độ | Must |
| Tìm theo khoảng cách (tọa độ sân) | Could |
| Tham gia / rời kèo; kèo tự đóng khi đủ người | Must |
| **Chi phí theo từng khoản** (sân, cầu, nước, ăn, khác): chủ kèo thêm / sửa **bất cứ lúc nào**; mỗi khoản chọn người cùng chịu (có "Chọn tất cả"); thêm bạn của chủ kèo không dùng nền tảng; **mọi người trong kèo xem được toàn bộ**, chỉ chủ kèo được sửa | Must |
| Thu tiền bằng mã QR chuyển khoản (VietQR) đúng số tiền của từng người; chủ kèo đánh dấu đã trả; hiện "còn thiếu" khi chi phí phát sinh sau khi đã trả | Must |
| Điểm danh có mặt / vắng sau buổi chơi | Should |
| Thử nghiệm thực tế tại 1 khu vực (Hà Nội) | Must |
| Thông báo qua email (có người tham gia, kèo sắp diễn ra) | Should |
| Tin nhắn tổng kết kèo để chia sẻ sang Zalo / Facebook | Should |
| Đánh giá uy tín sau mỗi kèo | Could (cắt đầu tiên nếu trễ) |
| Lịch sử chi tiêu theo tháng | Could |

### 5.2 Ngoài phạm vi
- Tự động thu thập (cào) dữ liệu từ Facebook hoặc mạng xã hội khác.
- **Bộ trích xuất bài đăng** ("dán bài → tự điền", cả dựa trên luật lẫn LLM): **bỏ ngày 24/11/2026** khi đổi trọng tâm nghiên cứu (mục 14).
- Thanh toán trực tuyến (cổng thanh toán, ví, thu hộ) và đặt sân tích hợp với hệ thống của chủ sân. Hệ thống chỉ **hiển thị mã QR chuyển khoản** giữa người chơi và chủ kèo, không giữ hay xử lý tiền.
- Quản lý quỹ nhóm, kho cầu, gộp nợ chéo giữa nhiều người ứng tiền, chia tiền theo số trận: phù hợp nhóm chơi cố định hơn là kèo vãng lai.
- Ứng dụng di động native (iOS/Android): **không thuộc phạm vi đồ án**, làm ở giai đoạn 2 sau khi bảo vệ (mục 7.1).
- Web push notification; chat thời gian thực (dùng liên kết Zalo/Messenger thay thế).

---

## 6. Sản phẩm bàn giao

| # | Sản phẩm | Định dạng |
|---|---|---|
| D1 | Project Charter, WBS, Gantt chart, kế hoạch chất lượng, sổ rủi ro | Markdown trong repo (`docs/`) |
| D2 | Báo cáo khảo sát người chơi (cách chia tiền, bùng kèo, bùng tiền) | PDF |
| D3 | Bộ số liệu thử nghiệm đã ẩn danh: kèo, khoản chi, người cùng chịu, thời điểm đánh dấu đã trả | CSV |
| D4 | Đặc tả yêu cầu + quy tắc nghiệp vụ (`docs/project.md`), thiết kế CSDL (`docs/database.md`), đặc tả API (`docs/API.md`) | Markdown / PDF |
| D5 | Mã nguồn kèm test tự động và CI | GitHub repository |
| D6 | Hệ thống chạy thật (production) | URL công khai |
| D7 | Báo cáo đánh giá thực nghiệm (RQ1–RQ3) | Chương trong báo cáo đồ án |
| D8 | Báo cáo đồ án, slide, video demo | PDF, PPTX, MP4 |

---

## 7. Các mốc chính

| Mốc | Nội dung | Ngày |
|---|---|---|
| **M0** | Charter trình duyệt, WBS và Gantt hoàn thành, CI chạy | 13/11/2026 |
| **M1** | Hệ thống chạy thật (production), bắt đầu thử nghiệm thực tế | 23/11/2026 (đã đạt) |
| **M2** | Hoàn thành tính năng (*feature freeze*): chi phí theo từng khoản, thu tiền QR, xuất số liệu thử nghiệm; khảo sát ≥ 30 phản hồi | 30/11/2026 |
| **M3** | Kết thúc thử nghiệm thực tế (2 tuần); đánh giá RQ1–RQ3 | 07/12/2026 |
| **M4** | Báo cáo đồ án và slide hoàn thành | 13/12/2026 |
| **M5** | **Hạn hoàn thành dự án** (ngày bảo vệ: chờ lịch của khoa) | 15/12/2026 |

Chi tiết xem [Gantt chart](03-gantt.md) và file Excel [diagrams/gantt.xlsx](diagrams/gantt.xlsx).

### 7.1 Lộ trình 2 giai đoạn

| Giai đoạn | Nội dung | Thời gian | Thuộc đồ án |
|---|---|---|:-:|
| **1. Ứng dụng web** | Toàn bộ phạm vi ở mục 5.1; nghiên cứu RQ1–RQ3; thử nghiệm thực tế | 09/11/2026 → 15/12/2026 (M5) | Có |
| **2. App di động** | App Android / iOS bằng React Native + Expo, dùng lại backend và API của giai đoạn 1; thông báo đẩy | Dự kiến 16/12/2026 → 18/01/2027 (mốc A1: bản thử Android) | Không |

- Làm web trước vì: một nền tảng chạy được trên mọi thiết bị, thử nghiệm và đo đạc nhanh hơn; trên điện thoại giao diện đã ở dạng app và cài lên màn hình chính được.
- Backend và API (giai đoạn 1) được thiết kế độc lập với giao diện, nên giai đoạn 2 không phải sửa backend, trừ phần lưu mã thiết bị cho thông báo đẩy.
- Giai đoạn 2 **không được bắt đầu trước M5**, để không ảnh hưởng tiến độ đồ án (xem rủi ro R3).

---

## 8. Các bên liên quan và vai trò

| Vai trò | Họ tên | Trách nhiệm chính |
|---|---|---|
| Sinh viên thực hiện | An Đức Mạnh (MSSV 23110310) | Toàn bộ dự án: quản lý, phân tích, thiết kế, phát triển, kiểm thử, triển khai, báo cáo |
| Giảng viên hướng dẫn | [ ] | Định hướng chuyên môn, phê duyệt Charter và các mốc |
| Người dùng thử nghiệm | Người chơi tại khu vực pilot | Tham gia khảo sát, usability test, pilot |
| Chủ sân / admin hội nhóm (đối tác) | [ ] | Hỗ trợ giới thiệu nền tảng tới người chơi |

---

## 9. Nguồn lực và ngân sách dự kiến

| Hạng mục | Giải pháp | Chi phí ước tính |
|---|---|---|
| Hosting backend (Node.js) + frontend (file tĩnh sau khi build) | Máy chủ Ubuntu của trường, HTTPS qua Cloudflare (Nginx + PM2, [DEPLOY.md](DEPLOY.md)) | 0đ |
| Cơ sở dữ liệu | MongoDB 8 dạng replica set: cài trên máy khi phát triển, cài trên máy chủ khi chạy thật | 0đ |
| Tạo mã QR chuyển khoản | Tự sinh mã theo chuẩn VietQR ngay trong ứng dụng | 0đ |
| Tên miền (tùy chọn) | | ≤ 300.000đ/năm |
| CI/CD | GitHub Actions | 0đ |
| **Tổng** | | **≤ 300.000đ** |

**Thời gian:** giai đoạn 1 khoảng **250 giờ công** (sau điều chỉnh 24/11/2026). Từ 24/11 tới hạn 15/12/2026 còn khoảng **106 giờ** trong 3 tuần, trung bình **~35 giờ/tuần** (chi tiết trong [WBS](02-wbs.md) mục 3).

**Công nghệ:**
- **Backend:** Node.js 24 LTS + Express 5 (kiến trúc modular monolith: mỗi chức năng một module routes / controller / service / model), MongoDB + Mongoose, xác thực JWT, kiểm tra dữ liệu bằng express-validator, bảo mật bằng helmet + giới hạn số lần đăng nhập.
- **Frontend:** React 19 + Vite + TypeScript + React Router 7 + Axios, CSS thuần; PWA (manifest).
- **Kiểm thử:** Jest + Supertest + MongoDB chạy trong RAM (backend); Vitest + React Testing Library (frontend); GitHub Actions chạy tự động mỗi lần push / Pull Request.

MongoDB được chọn vì có sẵn transaction (bảo đảm hai người tham gia cùng lúc không lấy chung một chỗ). Tìm kèo theo khu vực; tìm theo khoảng cách để mức *Could*.

---

## 10. Rủi ro chính

| # | Rủi ro | Khả năng | Ảnh hưởng | Biện pháp |
|---|---|---|---|---|
| R1 | Làm một mình: ốm, bận thi hoặc việc khác thì không có người làm thay | Cao | Cao | Có dự phòng thời gian; cắt phạm vi theo MoSCoW (Could → Should); báo GVHD sớm khi trễ quá 1 tuần |
| R2 | Pilot không có đủ người dùng (bài toán "con gà – quả trứng") | Cao | Cao | Tập trung 1 khu vực; hợp tác với chủ sân và admin group; tự đăng kèo thật để khởi động |
| R3 | Phát sinh thêm yêu cầu (*scope creep*) | Cao | Cao | Chỉ làm *Must* trước M2; mọi ý tưởng mới ghi vào backlog, xem xét sau M5 |
| R4 | Chủ kèo không nhập khoản chi hoặc không đánh dấu đã trả, nên thiếu số liệu cho RQ1, RQ2 | Trung bình | Cao | Nhắc chủ kèo ngay trên trang kèo; tự tổ chức một số kèo thật; bổ sung bằng khảo sát cuối thử nghiệm |
| R5 | Giảng viên chưa đồng ý việc đổi đề tài và câu hỏi nghiên cứu lúc muộn (24/11/2026) | Trung bình | Cao | Gửi Charter 2.0 ngay; giữ lịch sử bản 1.x trong Git để có thể quay lại; phần nền tảng (ghép kèo, thu tiền) không phụ thuộc quyết định này |
| R6 | Vi phạm quy định bảo vệ dữ liệu cá nhân | Thấp | Cao | Không cào dữ liệu; xin đồng ý khi khảo sát; số tài khoản chỉ người cùng kèo thấy; số liệu xuất ra đã ẩn danh |
| R7 | Mã QR chuyển khoản sai (sai số tài khoản, sai số tiền) | Thấp | Trung bình | Hiện tên chủ tài khoản để người chuyển đối chiếu; test mã QR theo chuẩn VietQR; nội dung chuyển khoản có mã kèo |

Chi tiết từng rủi ro (dấu hiệu nhận biết sớm, kế hoạch dự phòng) ghi trong `docs/RISKS.md`.

---

## 11. Ràng buộc và giả định

**Ràng buộc**
- Thời gian: **hạn hoàn thành dự án 15/12/2026** (09/11/2026 – 15/12/2026, khoảng 5 tuần).
- Nhân lực: 1 người.
- Ngân sách: ≤ 300.000đ.
- Tuân thủ pháp luật Việt Nam về bảo vệ dữ liệu cá nhân và Điều khoản của các nền tảng mạng xã hội.

**Giả định**
- Sinh viên dành khoảng 35 giờ/tuần trong 3 tuần cuối (24/11 – 15/12/2026). Nếu thực tế ít hơn, cắt theo thứ tự ở [Gantt](03-gantt.md) mục 5 trước khi lùi mốc.
- Có ít nhất 1 chủ sân hoặc admin group tại Hà Nội đồng ý hỗ trợ giới thiệu trong giai đoạn pilot.
- Ngày bảo vệ do khoa xếp, sau hạn hoàn thành 15/12/2026 *(cần xác nhận)*.

---

## 12. Đạo đức nghiên cứu và dữ liệu

- **Không** tự động thu thập dữ liệu từ Facebook.
- Khảo sát và usability test có phiếu đồng ý tham gia, ẩn danh khi phân tích.
- Số liệu chi phí và thanh toán dùng cho RQ1, RQ2 chỉ xuất ở dạng **ẩn danh** (không tên, không email, không số tài khoản) và chỉ dùng để thống kê.
- Hệ thống thu thập tối thiểu dữ liệu cá nhân; số tài khoản nhận tiền do người dùng tự nhập, tự xóa được, chỉ người cùng kèo mới thấy; hệ thống không giữ tiền và không lưu giao dịch ngân hàng.

---

## 13. Phê duyệt

| Vai trò | Họ tên | Chữ ký | Ngày |
|---|---|---|---|
| Giảng viên hướng dẫn | | | |
| Sinh viên thực hiện | An Đức Mạnh (23110310) | | |

---

## 14. Lý do đổi trọng tâm nghiên cứu (bản 2.0, 24/11/2026)

| | Bản 1.x | Bản 2.0 |
|---|---|---|
| Trọng tâm | Trích xuất thông tin từ bài đăng tiếng Việt ("dán bài → tự điền") | Chia chi phí theo từng khoản và thu tiền bằng mã QR cho kèo vãng lai |
| RQ1 | Độ chính xác bộ trích xuất dựa trên luật (F1 ≥ 0,75) | Chia theo khoản khác chia đều thế nào (tỉ lệ kèo cần chia không đều, chênh lệch, mức công bằng) |
| RQ2 | "Dán bài" giảm ≥ 50% thời gian tạo bài (A/B, n ≥ 8) | Thu tiền bằng QR: ≥ 80% người trả trong 24 giờ, trung vị ≤ 12 giờ |
| RQ3 | Tỉ lệ kèo đủ người ≥ 60% | Giữ nguyên |
| Dữ liệu cần thu | 100 bài đăng gán nhãn tay, đo Cohen's κ | Số liệu sinh ra tự nhiên trong thử nghiệm (khoản chi, đã trả) + khảo sát |

**Lý do:**
1. Khi thử nghiệm với người dùng thật, vấn đề lớn nhất của kèo vãng lai nằm ở **chia tiền và thu tiền** (chi phí phát sinh, bạn của chủ kèo, người không ăn uống, bùng tiền), không phải ở việc gõ bài đăng.
2. Các ứng dụng ghép kèo hiện có chưa giải quyết việc chia chi phí theo từng khoản; đây là đóng góp rõ ràng hơn của đồ án.
3. Số liệu cho RQ1, RQ2 mới **sinh ra ngay trong thử nghiệm thực tế**, không cần thu thập và gán nhãn thủ công 100 bài, phù hợp với thời gian còn lại (3 tuần).
4. Các phần đã làm vẫn dùng được: nền tảng ghép kèo, thu tiền bằng mã QR, máy chủ chạy thật, bộ test.

Bản 1.x của Charter vẫn lưu trong lịch sử Git (tag `v0.2.0`) để đối chiếu.
