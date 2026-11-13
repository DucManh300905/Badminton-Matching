# GANTT CHART – TIẾN ĐỘ ĐỒ ÁN

**Sinh viên thực hiện:** An Đức Mạnh – MSSV 23110310 · Đồ án cá nhân
Phiên bản 1.1 – 13/11/2026 · Thời gian: **12 tuần, 09/11/2026 → 29/01/2027** · Mã công việc khớp với [WBS](02-wbs.md).

> Biểu đồ dùng Mermaid: GitHub hiển thị trực tiếp; trong VS Code cần extension *Markdown Preview Mermaid Support*.
> Vì chỉ có một người làm, các công việc được xếp **gần như nối tiếp nhau**. Những thanh kéo dài (họp, unit test, thu thập khảo sát) là việc làm xen kẽ với cường độ thấp.
> Màu đỏ (`crit`) là các công việc trên **đường găng**.

```mermaid
gantt
    title Badminton Booking - Kế hoạch 12 tuần (An Đức Mạnh)
    dateFormat YYYY-MM-DD
    axisFormat %d/%m
    tickInterval 1week
    weekday monday

    section 1. Quản lý dự án
    1.1 Chốt đề tài và Charter           :done,   t11,  2026-11-09, 5d
    1.2.1-1.2.2 WBS và Gantt             :done,   t122, 2026-11-12, 2d
    1.2.3 Rủi ro và chất lượng          :        t123, 2026-11-14, 2d
    1.3 Nhật ký tuần và gặp GVHD         :active, t13,  2026-11-09, 82d
    M0 Charter trình duyệt, CI chạy      :milestone, m0, 2026-11-13, 0d

    section 2. Khảo sát và phân tích
    2.2.1 Quy trình ẩn danh hóa          :        t221, 2026-11-16, 1d
    2.1.1 Thiết kế bảng hỏi              :        t211, 2026-11-16, 2d
    2.1.2 Thu thập 50 phản hồi           :        t212, 2026-11-18, 12d
    2.2.2 Thu thập 200 bài đăng          :crit,   t222, 2026-11-17, 8d
    2.3 Phân tích giải pháp hiện có      :        t23,  2026-11-20, 3d
    2.2.3 Gán nhãn và đo đồng thuận      :crit,   t223, 2026-11-23, 8d
    2.4.1 User stories và use case       :crit,   t241, 2026-11-25, 5d
    2.1.3 Phân tích khảo sát             :        t213, 2026-11-30, 2d
    2.4.2 Đặc tả yêu cầu                 :crit,   t242, 2026-11-30, 2d
    M1 Chốt yêu cầu và dữ liệu           :milestone, m1, 2026-12-01, 0d

    section 3. Thiết kế
    3.1 Kiến trúc hệ thống               :crit,   t31,  2026-12-02, 2d
    3.2 Thiết kế CSDL (collections)      :        t32,  2026-12-03, 2d
    3.3 Đặc tả API                       :crit,   t33,  2026-12-04, 3d
    3.4 Wireframe                        :        t34,  2026-12-05, 4d
    M2 Hoàn thành thiết kế               :milestone, m2, 2026-12-08, 0d

    section 4. Phát triển
    4.1.1-4.1.2 Repo và CI               :done,   t411, 2026-11-12, 1d
    4.2 Lõi nghiệp vụ                    :active, t42,  2026-11-12, 11d
    4.3.1 Trích xuất dựa trên luật       :active, t431, 2026-11-12, 32d
    4.1.3 Khung full-stack và staging    :crit,   t413, 2026-12-09, 2d
    4.4.1 Xác thực                       :crit,   t441, 2026-12-10, 2d
    4.4.2 API kèo và tham gia            :crit,   t442, 2026-12-11, 7d
    4.5.1 UI đăng kèo và dán-tự-điền     :crit,   t451, 2026-12-16, 7d
    4.4.3 Tìm kiếm theo vị trí           :crit,   t443, 2026-12-21, 6d
    4.3.2 Trích xuất bằng LLM            :        t432, 2026-12-23, 6d
    4.5.2 UI danh sách và bộ lọc         :crit,   t452, 2026-12-26, 8d
    4.3.3 Trích xuất hybrid              :        t433, 2026-12-29, 3d
    4.5.3 Trang cá nhân (Should)         :        t453, 2027-01-04, 3d
    4.6 Thông báo email (Should)         :        t46,  2027-01-06, 3d
    M3 Feature freeze                    :milestone, m3, 2027-01-10, 0d

    section 5. Kiểm thử và đánh giá
    5.1 Unit test liên tục               :active, t51,  2026-11-12, 60d
    5.2 Integration test                 :        t52,  2026-12-14, 26d
    5.4 Đánh giá trích xuất RQ1          :        t54,  2027-01-02, 4d
    5.3 E2E test (Should)                :        t53,  2027-01-05, 5d
    5.5 Usability test RQ2               :        t55,  2027-01-11, 5d

    section 6. Triển khai và pilot
    6.1 Deploy production                :crit,   t61,  2027-01-08, 3d
    6.2 Pilot 2 tuần tại Hà Nội          :crit,   t62,  2027-01-11, 14d
    6.3 Phân tích số liệu RQ3            :crit,   t63,  2027-01-25, 2d
    M4 Kết thúc pilot                    :milestone, m4, 2027-01-24, 0d

    section 7. Kết thúc
    7.1 Báo cáo đồ án                    :crit,   t71,  2027-01-11, 18d
    7.2 Slide và video demo              :        t72,  2027-01-24, 5d
    M5 Nộp báo cáo và bảo vệ             :milestone, m5, 2027-01-29, 0d
```

## Đường găng (critical path)

```
Thu thập + gán nhãn dữ liệu (2.2) → User stories/đặc tả (2.4) → Kiến trúc/API (3.1, 3.3)
→ Staging → Xác thực → API kèo → UI đăng kèo → Tìm kiếm → UI tìm kèo (4.x)
→ M3 → Deploy (6.1) → Pilot (6.2) → Phân tích (6.3) → Báo cáo (7.1) → M5
```

Với một người, gần như mọi công việc phát triển đều nằm trên đường găng, vì không có ai làm song song. Pilot (6.2) cần đủ 2 tuần để có số liệu cho RQ3, nên **M3 (10/01) là mốc không được trễ**.

**Quy tắc cắt phạm vi:** nếu đến **03/01** phần phát triển trễ hơn 3 ngày so với kế hoạch, bỏ theo thứ tự: 4.6 Thông báo email → 4.5.3 Trang cá nhân → 5.3 E2E test. Mục 4.7 Uy tín (*Could*) không có trong lịch, chỉ làm nếu còn thời gian.

## Lịch theo tuần

| Tuần | Thời gian | Trọng tâm | Giờ dự kiến | Mốc |
|---|---|---|---:|---|
| 1 | 09/11 – 15/11 | Chốt đề tài, Charter, WBS, Gantt, repo + CI, lõi nghiệp vụ | ~35 *(đã làm phần lớn)* | **M0** (13/11) |
| 2 | 16/11 – 22/11 | Bảng hỏi, thu thập bài đăng, phân tích giải pháp hiện có | ~20 | |
| 3 | 23/11 – 29/11 | Gán nhãn dữ liệu, user stories | ~22 | |
| 4 | 30/11 – 06/12 | Phân tích khảo sát, đặc tả yêu cầu, kiến trúc, thiết kế CSDL, API | ~22 | **M1** (01/12) |
| 5 | 07/12 – 13/12 | Wireframe, staging, xác thực, bắt đầu API kèo | ~22 | **M2** (08/12) |
| 6 | 14/12 – 20/12 | API kèo, UI đăng kèo, integration test | ~24 | |
| 7 | 21/12 – 27/12 | Tìm kiếm vị trí, trích xuất LLM, UI danh sách | ~24 | |
| 8 | 28/12 – 03/01 | UI danh sách, hybrid, đánh giá RQ1 · *nghỉ Tết Dương lịch 01/01* | ~20 | |
| 9 | 04/01 – 10/01 | Trang cá nhân, email, E2E, deploy production | ~24 | **M3** (10/01) |
| 10 | 11/01 – 17/01 | Pilot tuần 1, usability test, viết báo cáo | ~22 | |
| 11 | 18/01 – 24/01 | Pilot tuần 2, viết báo cáo | ~20 | **M4** (24/01) |
| 12 | 25/01 – 29/01 | Phân tích pilot, hoàn thiện báo cáo, slide | ~20 | **M5** (29/01) |

*Các ngày trên là kế hoạch ban đầu. Cần điều chỉnh khi có lịch thi và lịch bảo vệ chính thức của khoa.*
