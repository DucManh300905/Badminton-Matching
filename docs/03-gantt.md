# GANTT CHART – TIẾN ĐỘ ĐỒ ÁN

**Sinh viên thực hiện:** An Đức Mạnh – MSSV 23110310 · Đồ án cá nhân
Phiên bản 2.0 – 24/11/2026 (theo Charter 2.0) · **Hạn hoàn thành dự án: 15/12/2026** · Mã công việc khớp với [WBS](02-wbs.md).

## 1. Lịch chi tiết

Lịch chi tiết từng công việc nằm trong file Excel **[diagrams/gantt.xlsx](diagrams/gantt.xlsx)**. Đây là **nguồn gốc của lịch**: muốn đổi ngày hoặc trạng thái thì sửa trực tiếp trong file này.

| Sheet | Nội dung |
|---|---|
| Gantt | Giai đoạn 1, ứng dụng web: 41 công việc, 6 mốc, 09/11/2026 → 15/12/2026 |
| Giai đoạn 2 (App) | Giai đoạn 2, app di động: 8 công việc, 1 mốc, 16/12/2026 → 18/01/2027 |
| Tổng hợp | Số việc theo trạng thái, tỉ lệ hoàn thành, đường găng, số ngày còn lại tới hạn hoàn thành |
| Hướng dẫn | Ô nào được sửa, cách thêm công việc, cách in |

Lịch được điều chỉnh ngày 17/11/2026 theo hạn hoàn thành 15/12/2026 (và ngày 24/11/2026: bỏ LLM / hybrid, thêm 4.8): **giữ đủ mọi hạng mục, giảm cỡ mẫu** (≥ 30 phản hồi khảo sát, ≥ 15 người thử nghiệm, ≥ 8 người usability test). Từ 24/11 còn khoảng 106 giờ, trung bình **~35 giờ/tuần** ([WBS](02-wbs.md) mục 3).

## 2. Các mốc

| Mốc | Nội dung | Ngày | Giai đoạn |
|---|---|---|---|
| **M0** | Charter trình duyệt, WBS và Gantt hoàn thành, CI chạy | 13/11/2026 | 1 |
| **M1** | Hệ thống chạy thật (production), chốt đặc tả, bắt đầu thử nghiệm thực tế. **Đạt 23/11/2026** phần chạy thật (https://sv22.bcse-vju.com, tag `v0.2.0`); đặc tả (2.4.2) vẫn đang hoàn thiện | 23/11/2026 | 1 |
| **M2** | Feature freeze: chi phí theo từng khoản, thu tiền QR, xuất số liệu thử nghiệm; khảo sát ≥ 30 phản hồi | 30/11/2026 | 1 |
| **M3** | Kết thúc thử nghiệm thực tế (2 tuần), đánh giá RQ1–RQ3 | 07/12/2026 | 1 |
| **M4** | Báo cáo đồ án và slide hoàn thành | 13/12/2026 | 1 |
| **M5** | **Hạn hoàn thành dự án** (ngày bảo vệ: chờ lịch của khoa) | 15/12/2026 | 1 |
| **A1** | Phát hành bản thử app di động (Android) | 18/01/2027 | 2 |

## 3. Lịch theo tuần (4 tuần còn lại)

| Tuần | Thời gian | Việc chính | Mốc |
|---|---|---|---|
| 1 | 17/11 – 23/11 | Môi trường chạy thật + **deploy production**; user stories, đặc tả; bảng hỏi và gửi khảo sát; thu thập 100 bài đăng; liên hệ chủ sân / admin nhóm | M1 (23/11) |
| 2 | 24/11 – 30/11 | **Thử nghiệm thực tế tuần 1**; gỡ bộ trích xuất (4.3); **chi phí theo từng khoản** (4.8.2); icon và ảnh đại diện / ảnh bìa (4.9); kho cầu (4.10); ảnh bill và hóa đơn PDF (4.11); Tổng quan, Cài đặt, chế độ tối (4.12); nhắn tin trong app và chia sẻ kèo (4.13, 4.8.4); email, hóa đơn PDF, ảnh chuyển khoản, quên mật khẩu, số điện thoại (4.14, 4.15); bảng hỏi và gửi khảo sát (2.1); tin nhắn tổng kết (4.8.4); xuất số liệu (US-22); wireframe; thông báo email | M2 (30/11) |
| 3 | 01/12 – 07/12 | **Thử nghiệm tuần 2**; usability test chia tiền (5.5); E2E test; phân tích khảo sát; bắt đầu viết báo cáo | M3 (07/12) |
| 4 | 08/12 – 15/12 | Phân tích số liệu RQ1–RQ3 (6.3); hoàn thiện báo cáo; slide và video demo | M4 (13/12), M5 (15/12) |

## 4. Đường găng (giai đoạn 1)

```
Môi trường chạy thật (4.1.3) → Deploy (6.1) → M1 → Thử nghiệm 2 tuần (6.2) → M3 → Phân tích RQ1–RQ3 (6.3) → Báo cáo (7.1) → M4 → M5
Đặc tả (2.4) ─┘
Chi phí theo từng khoản (4.8.2) → deploy → có số liệu trong thử nghiệm (6.2) → RQ1, RQ2 (6.3)
```

Thử nghiệm thực tế cần đủ 2 tuần lịch để có số liệu RQ3, nên **M1 (23/11): deploy production là mốc không được trễ**. Chậm 1 ngày ở đây là thử nghiệm ngắn đi 1 ngày.

## 5. Quy tắc cắt phạm vi khi trễ

Kiểm tra tại **M1 (23/11)** và **M2 (30/11)**. Nếu trễ hơn 2 ngày so với kế hoạch, cắt theo thứ tự:

1. 4.7 Đánh giá uy tín (*Could*)
2. 4.8.5 Lịch sử chi tiêu (*Could*)
3. 4.6 Thông báo email (*Should*)
4. 5.3 E2E test (*Should*): giữ kịch bản bấm thử bằng tay làm bằng chứng
5. 3.4 Wireframe: thay bằng ảnh chụp giao diện thật

**Không cắt:** thử nghiệm thực tế (6.2), chi phí theo từng khoản và thu tiền (4.8.1, 4.8.2), khảo sát (2.1) và phân tích số liệu (6.3), vì đây là phần nghiên cứu chính của đồ án (Charter 2.0).

**Đổi trọng tâm 24/11/2026:** bỏ bộ trích xuất bài đăng cùng bộ dữ liệu 100 bài và đánh giá đi kèm (2.2, 4.3.1, 5.4); xem [WBS](02-wbs.md) mục 3 và [Charter](01-project-charter.md) mục 14.

**Điều chỉnh 24/11/2026:** đã bỏ bộ trích xuất LLM / hybrid (4.3.2, 4.3.3; 13 giờ) và thay bằng gói 4.8 Thu tiền và chi phí kèo (15 giờ), xem [WBS](02-wbs.md) mục 3.

## 6. Giai đoạn 2: App di động

- Bắt đầu **ngay sau hạn hoàn thành (M5)**: 16/12/2026 → 18/01/2027, khoảng 15 giờ/tuần, 63 giờ công, nghỉ Tết Dương lịch 31/12 – 01/01.
- App làm bằng React Native + Expo, dùng lại backend và API của giai đoạn 1. Gói công việc: [WBS](02-wbs.md) mục 5.
- Giai đoạn 2 **không thuộc phạm vi chấm đồ án** và **không được bắt đầu trước M5** ([RISKS.md](RISKS.md), R3).
- Nếu ngày bảo vệ do khoa xếp rơi vào giữa giai đoạn 2, tạm dừng app trong tuần chuẩn bị bảo vệ.
