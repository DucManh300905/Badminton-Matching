# PROJECT CHARTER – ĐỒ ÁN KHOA HỌC KỸ THUẬT

| | |
|---|---|
| **Sinh viên thực hiện** | An Đức Mạnh – MSSV 23110310 |
| **Giảng viên hướng dẫn** | [ ] |
| **Hình thức** | Đồ án cá nhân |
| **Phiên bản** | 1.3 (bản trình duyệt) |
| **Ngày lập** | 13/11/2026 · cập nhật 17/11/2026: lộ trình 2 giai đoạn (web trước, app di động sau); **hạn hoàn thành dự án 15/12/2026** |
| **Trạng thái** | Chờ giảng viên hướng dẫn phê duyệt |
| **Tên dự án (tên tạm)** | Badminton Booking |

---

## 1. Đề tài chính thức

**Tiếng Việt:** *Xây dựng nền tảng web kết nối người chơi cầu lông vãng lai, ứng dụng trích xuất thông tin tự động từ bài đăng tiếng Việt phi cấu trúc.*

**English:** *A web platform for matching casual badminton players, with automatic information extraction from unstructured Vietnamese posts.*

**Lĩnh vực:** Phần mềm hệ thống / Xử lý ngôn ngữ tự nhiên ứng dụng.

---

## 2. Bối cảnh và vấn đề

Cầu lông là một trong những môn thể thao phong trào phổ biến nhất Việt Nam. Mỗi kèo thường cần 4–8 người, nên thiếu người xảy ra thường xuyên. Hiện nay người chơi chủ yếu tìm đối đánh vãng lai (“ghép kèo”) qua các hội nhóm Facebook, cách này có nhiều bất cập:

1. **Thông tin phi cấu trúc:** giờ, sân, trình độ, giá, số chỗ đều viết tự do, không lọc hay tìm kiếm được.
2. **Bài cũ trôi lẫn với bài mới:** không biết kèo nào còn chỗ, kèo nào đã đủ người.
3. **Không có cơ chế giữ chỗ và uy tín:** phải comment, nhắn tin thủ công, và không có cách nào hạn chế người “bùng kèo”.
4. **Phân tán:** mỗi khu vực có hàng chục group, người chơi phải theo dõi nhiều nơi cùng lúc.

Việc tự động thu thập (cào) dữ liệu từ Facebook đã được cân nhắc và bị loại bỏ, vì vi phạm Điều khoản dịch vụ của Meta (Groups API đã ngừng từ 04/2024) và quy định về bảo vệ dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP, Luật Bảo vệ dữ liệu cá nhân có hiệu lực từ 01/01/2026). Thay vào đó, đề tài cho phép chính người dùng dán nội dung bài của họ để hệ thống tự điền thông tin.

---

## 3. Mục tiêu

### 3.1 Mục tiêu tổng quát
Xây dựng và thử nghiệm thực tế một nền tảng web giúp người chơi cầu lông đăng, tìm và tham gia kèo nhanh hơn so với cách dùng hội nhóm Facebook hiện nay. Đồng thời nghiên cứu phương pháp trích xuất thông tin từ bài đăng tiếng Việt văn phong mạng xã hội.

### 3.2 Mục tiêu cụ thể (SMART)
| # | Mục tiêu | Chỉ số đo | Hạn |
|---|---|---|---|
| O1 | Hoàn thành web app với các chức năng cốt lõi (đăng kèo, tìm/lọc, tham gia, thông báo email) | 100% user story mức *Must* đạt tiêu chí chấp nhận | 30/11/2026 |
| O2 | Xây dựng bộ dữ liệu bài đăng có gán nhãn | ≥ 100 bài, đã ẩn danh hóa | 28/11/2026 |
| O3 | Bộ trích xuất đạt độ chính xác cao | F1 trung bình theo trường ≥ 0,90 (hybrid) | 03/12/2026 |
| O4 | Thử nghiệm thực tế tại 1 khu vực | ≥ 15 người dùng thật, ≥ 10 kèo được đăng trong 2 tuần | 07/12/2026 |
| O5 | Đảm bảo chất lượng mã nguồn | Unit test chạy tự động trên CI, coverage dòng ≥ 80% | Liên tục |

---

## 4. Câu hỏi nghiên cứu và giả thuyết

| | Câu hỏi nghiên cứu | Giả thuyết | Phương pháp kiểm chứng |
|---|---|---|---|
| **RQ1** | Phương pháp nào trích xuất thông tin kèo từ bài đăng tiếng Việt phi cấu trúc chính xác nhất: dựa trên luật, LLM, hay kết hợp (hybrid)? | **H1:** Hybrid đạt F1 ≥ 0,90; dựa trên luật đạt F1 ≥ 0,75. | Đo Precision/Recall/F1 theo 4 nhóm trường (thời gian, giá, số chỗ, trình độ) trên tập 100 bài gán nhãn tay (30 bài kiểm tra giữ kín). |
| **RQ2** | Tính năng “dán bài → tự điền” có giảm thời gian tạo bài đăng so với điền form thủ công không? | **H2:** Thời gian tạo bài giảm ≥ 50%. | Thử nghiệm A/B trong phòng (within-subject), n ≥ 8, kiểm định Wilcoxon (phù hợp với mẫu nhỏ). |
| **RQ3** | Nền tảng có cấu trúc giúp kèo được lấp đủ người hiệu quả hơn không? | **H3:** ≥ 60% kèo đăng trong thời gian thử nghiệm đủ người trước giờ chơi. | Thống kê log hệ thống trong 2 tuần thử nghiệm, kèm khảo sát mức hài lòng (thang SUS). |

---

## 5. Phạm vi

Vì đồ án do một người thực hiện, phạm vi được phân loại theo MoSCoW để biết cần cắt gì trước nếu bị chậm tiến độ.

### 5.1 Trong phạm vi
| Chức năng | Mức |
|---|---|
| Web app responsive, dùng tốt trên điện thoại | Must |
| Đăng ký / đăng nhập bằng email + mật khẩu (JWT) | Must |
| Đăng nhập bằng Google | Could |
| Đăng kèo: sân, thời gian, trình độ, số chỗ theo giới tính, chi phí mỗi người | Must |
| Dán nội dung bài đăng → tự động điền form (dựa trên luật, LLM, hybrid) | Must |
| Tìm kiếm và lọc theo khu vực, thời gian, trình độ | Must |
| Tìm theo khoảng cách (tọa độ sân) | Could |
| Tham gia / rời kèo; kèo tự đóng khi đủ người | Must |
| Thử nghiệm thực tế tại 1 khu vực (Hà Nội) | Must |
| Thông báo qua email (có người tham gia, kèo sắp diễn ra) | Should |
| Nút chia sẻ kèo lên Facebook / Zalo | Should |
| Đánh giá uy tín sau mỗi kèo | Could (có trong lịch, cắt đầu tiên nếu trễ) |

### 5.2 Ngoài phạm vi
- Tự động thu thập (cào) dữ liệu từ Facebook hoặc mạng xã hội khác.
- Thanh toán trực tuyến, đặt sân tích hợp với hệ thống của chủ sân.
- Ứng dụng di động (iOS/Android): **không thuộc phạm vi đồ án**, làm ở giai đoạn 2 sau khi bảo vệ (mục 7.1).
- Web push notification.
- Chat thời gian thực (dùng liên kết Zalo/Messenger thay thế).

---

## 6. Sản phẩm bàn giao

| # | Sản phẩm | Định dạng |
|---|---|---|
| D1 | Project Charter, WBS, Gantt chart, kế hoạch chất lượng, sổ rủi ro | Markdown trong repo (`docs/`) |
| D2 | Báo cáo khảo sát người chơi | PDF |
| D3 | Bộ dữ liệu bài đăng gán nhãn (đã ẩn danh) | JSON/CSV |
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
| **M1** | Hệ thống chạy thật (production), chốt đặc tả yêu cầu, bắt đầu thử nghiệm thực tế | 23/11/2026 |
| **M2** | Hoàn thành tính năng (*feature freeze*): bộ trích xuất LLM + kết hợp, bộ dữ liệu 100 bài gán nhãn | 30/11/2026 |
| **M3** | Kết thúc thử nghiệm thực tế (2 tuần); đánh giá RQ1, RQ2 | 07/12/2026 |
| **M4** | Báo cáo đồ án và slide hoàn thành | 13/12/2026 |
| **M5** | **Hạn hoàn thành dự án** (ngày bảo vệ: chờ lịch của khoa) | 15/12/2026 |

Chi tiết xem [Gantt chart](03-gantt.md) và file Excel [diagrams/gantt.xlsx](diagrams/gantt.xlsx).

### 7.1 Lộ trình 2 giai đoạn

| Giai đoạn | Nội dung | Thời gian | Thuộc đồ án |
|---|---|---|:-:|
| **1. Ứng dụng web** | Toàn bộ phạm vi ở mục 5.1; nghiên cứu RQ1–RQ3; thử nghiệm thực tế | 09/11/2026 → 15/12/2026 (M5) | Có |
| **2. App di động** | App Android / iOS bằng React Native + Expo, dùng lại backend và API của giai đoạn 1; thông báo đẩy | Dự kiến 16/12/2026 → 18/01/2027 (mốc A1: bản thử Android) | Không |

- Làm web trước vì: một nền tảng chạy được trên mọi thiết bị, thử nghiệm và đo đạc nhanh hơn; giao diện web responsive nên người dùng thử nghiệm dùng tốt cả trên máy tính và điện thoại.
- Backend và API (giai đoạn 1) được thiết kế độc lập với giao diện, nên giai đoạn 2 không phải sửa backend, trừ phần lưu mã thiết bị cho thông báo đẩy.
- Giai đoạn 2 **không được bắt đầu trước M5**, để không ảnh hưởng tiến độ đồ án (xem rủi ro R3).
- Gói công việc giai đoạn 2: [WBS](02-wbs.md) mục 5.

---

## 8. Các bên liên quan và vai trò

| Vai trò | Họ tên | Trách nhiệm chính |
|---|---|---|
| Sinh viên thực hiện | An Đức Mạnh (MSSV 23110310) | Toàn bộ dự án: quản lý, phân tích, thiết kế, phát triển, kiểm thử, triển khai, báo cáo |
| Giảng viên hướng dẫn | [ ] | Định hướng chuyên môn, phê duyệt Charter và các mốc |
| Người gán nhãn đối chứng | [1 bạn cùng lớp, tình nguyện] | Gán nhãn độc lập 30 bài để đo độ đồng thuận |
| Người dùng thử nghiệm | Người chơi tại khu vực pilot | Tham gia khảo sát, usability test, pilot |
| Chủ sân / admin hội nhóm (đối tác) | [ ] | Hỗ trợ giới thiệu nền tảng tới người chơi |

---

## 9. Nguồn lực và ngân sách dự kiến

| Hạng mục | Giải pháp | Chi phí ước tính |
|---|---|---|
| Hosting backend (Node.js) + frontend (file tĩnh sau khi build) | Máy chủ Ubuntu của trường, HTTPS qua Cloudflare (Nginx + PM2, [DEPLOY.md](DEPLOY.md)) | 0đ |
| Cơ sở dữ liệu | MongoDB 8 dạng replica set: cài trên máy khi phát triển, cài trên máy chủ khi chạy thật | 0đ |
| API LLM cho bộ trích xuất | Giới hạn ngân sách cứng | ≤ 250.000đ |
| Tên miền (tùy chọn) | | ≤ 300.000đ/năm |
| CI/CD | GitHub Actions | 0đ |
| **Tổng** | | **≤ 550.000đ** |

**Thời gian:** giai đoạn 1 khoảng **260 giờ công**, hạn hoàn thành **15/12/2026**. Đến 17/11/2026 đã xong khoảng 101 giờ; phần còn lại khoảng 137 giờ trong 4 tuần, trung bình **~34 giờ/tuần** (chi tiết trong [WBS](02-wbs.md) mục 3). 

**Công nghệ:**
- **Backend:** Node.js 24 LTS + Express 5 (kiến trúc modular monolith: mỗi chức năng một module routes / controller / service / model), MongoDB + Mongoose, xác thực JWT, kiểm tra dữ liệu bằng express-validator, bảo mật bằng helmet + giới hạn số lần đăng nhập.
- **Frontend:** React 19 + Vite + TypeScript + React Router 7 + Axios, CSS thuần.
- **Kiểm thử:** Jest + Supertest + MongoDB chạy trong RAM (backend); Vitest + React Testing Library (frontend); GitHub Actions chạy tự động mỗi lần push / Pull Request.

MongoDB được chọn vì có sẵn transaction (bảo đảm hai người tham gia cùng lúc không lấy chung một chỗ) và có gói cloud miễn phí. Tìm kèo theo khu vực; tìm theo khoảng cách để mức *Could*.

---

## 10. Rủi ro chính

| # | Rủi ro | Khả năng | Ảnh hưởng | Biện pháp |
|---|---|---|---|---|
| R1 | Làm một mình: ốm, bận thi hoặc việc khác thì không có người làm thay | Cao | Cao | Có dự phòng thời gian; cắt phạm vi theo MoSCoW (Could → Should); báo GVHD sớm khi trễ quá 1 tuần |
| R2 | Pilot không có đủ người dùng (bài toán “con gà – quả trứng”) | Cao | Cao | Tập trung 1 khu vực; hợp tác với chủ sân và admin group; tự đăng kèo thật để khởi động |
| R3 | Phát sinh thêm yêu cầu (*scope creep*) | Cao | Cao | Chỉ làm *Must* trước M3; mọi ý tưởng mới ghi vào backlog, xem xét sau M5 |
| R4 | Bộ trích xuất dựa trên luật không đạt chỉ tiêu | Trung bình | Trung bình | Bổ sung LLM / hybrid; mở rộng tập luật dựa trên phân tích lỗi |
| R5 | Thiếu khách quan khi một người tự gán nhãn dữ liệu | Trung bình | Trung bình | Nhờ 1 người gán nhãn độc lập 30 bài; đo Cohen's κ; tự gán nhãn lại 20% sau 1 tuần |
| R6 | Vi phạm quy định bảo vệ dữ liệu cá nhân | Thấp | Cao | Không cào dữ liệu; ẩn danh hóa bộ dữ liệu; xin đồng ý khi khảo sát; có chính sách quyền riêng tư |
| R7 | Chi phí hoặc giới hạn của API LLM | Trung bình | Thấp | Đặt hạn mức chi; cache kết quả; dùng luật làm phương án dự phòng |

Chi tiết từng rủi ro (dấu hiệu nhận biết sớm, kế hoạch dự phòng) ghi trong `docs/RISKS.md`.

---

## 11. Ràng buộc và giả định

**Ràng buộc**
- Thời gian: **hạn hoàn thành dự án 15/12/2026** (09/11/2026 – 15/12/2026, khoảng 5 tuần).
- Nhân lực: 1 người.
- Ngân sách: ≤ 550.000đ.
- Tuân thủ pháp luật Việt Nam về bảo vệ dữ liệu cá nhân và Điều khoản của các nền tảng mạng xã hội.

**Giả định**
- Sinh viên dành khoảng 34 giờ/tuần trong 4 tuần cuối (17/11 – 15/12/2026). Nếu thực tế ít hơn, cắt theo thứ tự ở [Gantt](03-gantt.md) mục 4 trước khi lùi mốc.
- Có ít nhất 1 chủ sân hoặc admin group tại Hà Nội đồng ý hỗ trợ giới thiệu trong giai đoạn pilot.
- Ngày bảo vệ do khoa xếp, sau hạn hoàn thành 15/12/2026 *(cần xác nhận)*.

---

## 12. Đạo đức nghiên cứu và dữ liệu

- **Không** tự động thu thập dữ liệu từ Facebook.
- Bộ dữ liệu 100 bài lấy theo thứ tự ưu tiên: (1) bài do người tham gia khảo sát **tự gửi, có đồng ý**; (2) bài do sinh viên **chép tay** từ các group công khai, **xóa ngay** tên, số điện thoại, ảnh và đường dẫn hồ sơ. Bộ dữ liệu chỉ dùng để đánh giá nội bộ.
- Khảo sát và usability test có phiếu đồng ý tham gia, ẩn danh khi phân tích.
- Hệ thống thu thập tối thiểu dữ liệu cá nhân và có chính sách quyền riêng tư rõ ràng.

---

## 13. Phê duyệt

| Vai trò | Họ tên | Chữ ký | Ngày |
|---|---|---|---|
| Giảng viên hướng dẫn | | | |
| Sinh viên thực hiện | An Đức Mạnh (23110310) | | |
