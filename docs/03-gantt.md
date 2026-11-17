# GANTT CHART – TIẾN ĐỘ ĐỒ ÁN

**Sinh viên thực hiện:** An Đức Mạnh – MSSV 23110310 · Đồ án cá nhân
Phiên bản 1.3 – 17/11/2026 · **Hạn hoàn thành dự án: 15/12/2026** · Mã công việc khớp với [WBS](02-wbs.md).

## 1. Lịch chi tiết

Lịch chi tiết từng công việc nằm trong file Excel **[diagrams/gantt.xlsx](diagrams/gantt.xlsx)**. Đây là **nguồn gốc của lịch**: muốn đổi ngày hoặc trạng thái thì sửa trực tiếp trong file này.

| Sheet | Nội dung |
|---|---|
| Gantt | Giai đoạn 1, ứng dụng web: 41 công việc, 6 mốc, 09/11/2026 → 15/12/2026 |
| Giai đoạn 2 (App) | Giai đoạn 2, app di động: 8 công việc, 1 mốc, 16/12/2026 → 18/01/2027 |
| Tổng hợp | Số việc theo trạng thái, tỉ lệ hoàn thành, đường găng, số ngày còn lại tới hạn hoàn thành |
| Hướng dẫn | Ô nào được sửa, cách thêm công việc, cách in |

Lịch được điều chỉnh ngày 17/11/2026 theo hạn hoàn thành 15/12/2026: **giữ đủ mọi hạng mục, giảm cỡ mẫu** (100 bài đăng, ≥ 30 phản hồi khảo sát, ≥ 15 người thử nghiệm, ≥ 8 người usability test). Khối lượng còn lại khoảng 137 giờ, trung bình **~34 giờ/tuần** ([WBS](02-wbs.md) mục 3).

## 2. Các mốc

| Mốc | Nội dung | Ngày | Giai đoạn |
|---|---|---|---|
| **M0** | Charter trình duyệt, WBS và Gantt hoàn thành, CI chạy | 13/11/2026 | 1 |
| **M1** | Hệ thống chạy thật (production), chốt đặc tả, bắt đầu thử nghiệm thực tế | 23/11/2026 | 1 |
| **M2** | Feature freeze: bộ trích xuất LLM + kết hợp, bộ dữ liệu 100 bài gán nhãn | 30/11/2026 | 1 |
| **M3** | Kết thúc thử nghiệm thực tế (2 tuần), đánh giá RQ1, RQ2 | 07/12/2026 | 1 |
| **M4** | Báo cáo đồ án và slide hoàn thành | 13/12/2026 | 1 |
| **M5** | **Hạn hoàn thành dự án** (ngày bảo vệ: chờ lịch của khoa) | 15/12/2026 | 1 |
| **A1** | Phát hành bản thử app di động (Android) | 18/01/2027 | 2 |

## 3. Lịch theo tuần (4 tuần còn lại)

| Tuần | Thời gian | Việc chính | Mốc |
|---|---|---|---|
| 1 | 17/11 – 23/11 | Môi trường chạy thật + **deploy production**; user stories, đặc tả; bảng hỏi và gửi khảo sát; thu thập 100 bài đăng; liên hệ chủ sân / admin nhóm | M1 (23/11) |
| 2 | 24/11 – 30/11 | **Thử nghiệm thực tế tuần 1**; gán nhãn + đo κ; bộ trích xuất LLM và kết hợp; wireframe; thông báo email; đánh giá uy tín | M2 (30/11) |
| 3 | 01/12 – 07/12 | **Thử nghiệm tuần 2**; đánh giá RQ1; usability test RQ2; E2E test; phân tích khảo sát; bắt đầu viết báo cáo | M3 (07/12) |
| 4 | 08/12 – 15/12 | Phân tích số liệu RQ3; hoàn thiện báo cáo; slide và video demo | M4 (13/12), M5 (15/12) |

## 4. Đường găng (giai đoạn 1)

```
Môi trường chạy thật (4.1.3) → Deploy (6.1) → M1 → Thử nghiệm 2 tuần (6.2) → M3 → Phân tích RQ3 (6.3) → Báo cáo (7.1) → M4 → M5
Đặc tả (2.4) ─┘
Thu thập 100 bài (2.2.2) → Gán nhãn (2.2.3) → LLM (4.3.2) → Kết hợp (4.3.3) → Đánh giá RQ1 (5.4) → Báo cáo (7.1)
```

Thử nghiệm thực tế cần đủ 2 tuần lịch để có số liệu RQ3, nên **M1 (23/11): deploy production là mốc không được trễ**. Chậm 1 ngày ở đây là thử nghiệm ngắn đi 1 ngày.

## 5. Quy tắc cắt phạm vi khi trễ

Kiểm tra tại **M1 (23/11)** và **M2 (30/11)**. Nếu trễ hơn 2 ngày so với kế hoạch, cắt theo thứ tự:

1. 4.7 Đánh giá uy tín (*Could*)
2. 4.6 Thông báo email (*Should*)
3. 5.3 E2E test (*Should*): giữ kịch bản bấm thử bằng tay làm bằng chứng
4. 3.4 Wireframe: thay bằng ảnh chụp giao diện thật

**Không cắt:** thử nghiệm thực tế (6.2), bộ trích xuất LLM / kết hợp (4.3.2, 4.3.3) và đánh giá RQ1 (5.4), vì đây là phần nghiên cứu chính của đồ án.

## 6. Giai đoạn 2: App di động

- Bắt đầu **ngay sau hạn hoàn thành (M5)**: 16/12/2026 → 18/01/2027, khoảng 15 giờ/tuần, 63 giờ công, nghỉ Tết Dương lịch 31/12 – 01/01.
- App làm bằng React Native + Expo, dùng lại backend và API của giai đoạn 1. Gói công việc: [WBS](02-wbs.md) mục 5.
- Giai đoạn 2 **không thuộc phạm vi chấm đồ án** và **không được bắt đầu trước M5** ([RISKS.md](RISKS.md), R3).
- Nếu ngày bảo vệ do khoa xếp rơi vào giữa giai đoạn 2, tạm dừng app trong tuần chuẩn bị bảo vệ.
