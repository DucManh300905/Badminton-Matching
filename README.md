# Badminton Booking

![CI](https://github.com/DucManh300905/Badminton-Matching/actions/workflows/ci.yml/badge.svg?branch=develop)


Nền tảng web kết nối người chơi cầu lông vãng lai, có tính năng trích xuất thông tin tự động từ bài đăng tiếng Việt phi cấu trúc.

**Đồ án cá nhân** – Sinh viên thực hiện: An Đức Mạnh (MSSV 23110310)

## Tài liệu dự án

| Tài liệu | Nội dung |
|---|---|
| [docs/01-project-charter.md](docs/01-project-charter.md) | Đề tài, mục tiêu, câu hỏi nghiên cứu, phạm vi, rủi ro |
| [docs/02-wbs.md](docs/02-wbs.md) | Cấu trúc phân rã công việc |
| [docs/03-gantt.md](docs/03-gantt.md) | Tiến độ 12 tuần, đường găng |

## Mã nguồn hiện có

```
src/
  domain/          Lõi nghiệp vụ: kèo, chỗ trống theo giới tính, trình độ, tham gia/rời
  parser/          Bộ trích xuất dựa trên luật (baseline cho RQ1)
tests/             Unit test (Vitest)
.github/workflows/ CI: typecheck + test + coverage trên mỗi push / Pull Request
```

Ví dụ bộ trích xuất:

```ts
parsePost('Tối nay 19h-21h sân Cầu Giấy thiếu 2 nam 1 nữ TB- đến TB+, 50k/ng');
// → { dayOffset: 0, start: {hour:19,minute:0}, end: {hour:21,minute:0},
//     slots: {male:2,female:1,any:0}, levelMin:'TB_MINUS', levelMax:'TB_PLUS',
//     pricePerPerson: 50000, confidence: 1 }
```

## Chạy dự án

Yêu cầu Node.js ≥ 22.

```bash
npm ci              # cài dependency theo lockfile
npm test            # chạy unit test
npm run test:watch  # chạy test ở chế độ theo dõi khi đang code
npm run coverage    # test + báo cáo coverage (mở coverage/index.html)
npm run typecheck   # kiểm tra kiểu TypeScript
```

## Quy ước làm việc

- `main`: bản ổn định, chỉ nhận merge từ `develop` khi đạt mốc (M1, M2, …).
- `develop`: nhánh tích hợp, nhánh mặc định của repo.
- Nhánh tính năng tạo từ `develop`, đặt tên `feature/<mã-WBS>-<mô-tả>`, ví dụ `feature/4.4.2-api-keo`.
- Mọi thay đổi đi qua Pull Request và chỉ merge khi CI xanh.
- PR vào `develop` dùng **Squash and merge**; PR `develop` → `main` dùng **Create a merge commit**.
- Code mới phải có test kèm theo. CI sẽ fail nếu coverage tụt dưới ngưỡng trong [vitest.config.ts](vitest.config.ts).

