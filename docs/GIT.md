# Quy ước Git, nhánh và Pull Request — Badminton Matching

> Cập nhật: 17/11/2026. Repo: https://github.com/DucManh300905/Badminton-Matching (nhánh mặc định `develop`).
> Tài liệu liên quan: [QUALITY.md](QUALITY.md) (điều kiện được merge) · [WBS](02-wbs.md) (mã công việc dùng trong tên nhánh)

## 1. Mô hình nhánh

```
main      ──●─────────────────────●──────────►   bản ổn định, mỗi mốc có tag (v0.1.0, v0.2.0…)
             \                   /
develop   ────●──●──●──●──●──●──●────────────►   nhánh tích hợp, nhánh mặc định
               \    /  \     /
feature/…       ●──●    ●───●                     nhánh ngắn, mỗi nhánh một việc
```

| Nhánh | Mục đích | Tách từ | Merge vào | Cách merge |
|---|---|---|---|---|
| `main` | Bản ổn định, dùng để demo / bảo vệ | — | — | Chỉ nhận PR từ `develop` hoặc `hotfix/*` |
| `develop` | Tích hợp mọi thay đổi | `main` | `main` (khi đạt mốc) | Create a merge commit |
| `feature/<mã-WBS>-<mô-tả>` | Tính năng mới | `develop` | `develop` | Create a merge commit |
| `fix/<mô-tả>` | Sửa lỗi chưa phát hành | `develop` | `develop` | Create a merge commit |
| `docs/<mô-tả>` | Chỉ sửa tài liệu | `develop` | `develop` | Create a merge commit |
| `hotfix/<mô-tả>` | Sửa gấp lỗi trên bản đã phát hành | `main` | `main`, rồi merge `main` về `develop` | Create a merge commit |

- Tên nhánh viết thường, không dấu, nối bằng gạch ngang. Ví dụ: `feature/4.3.2-trich-xuat-llm`, `fix/dang-xuat-ve-trang-chu`, `docs/bao-cao-rq1`.
- **Mọi PR đều dùng "Create a merge commit"** (nút mặc định "Merge pull request"): giữ lịch sử đầy đủ và các nhánh luôn chung commit, nên không bị lệch nhánh ở lần merge sau. Repo không dùng Squash hay Rebase.
- **Mỗi việc một nhánh**, đặt tên theo mã WBS; merge xong thì xóa nhánh và tạo nhánh mới từ `develop` cho việc tiếp theo. Nhờ vậy danh sách PR khớp với WBS.
- Xóa nhánh sau khi merge. Bật **Settings → General → Automatically delete head branches** để GitHub tự xóa.

## 2. Thông điệp commit

Theo dạng Conventional Commits:

```
<loại>(<phạm vi, không bắt buộc>): <mô tả ngắn>
```

| Loại | Dùng khi | Ví dụ |
|---|---|---|
| `feat` | Thêm tính năng | `feat(backend): API keo cua toi` |
| `fix` | Sửa lỗi | `fix: dang xuat tu trang Tai khoan ve trang chu` |
| `docs` | Chỉ sửa tài liệu | `docs: dac ta API va thiet ke CSDL` |
| `test` | Thêm / sửa test | `test: 5 nguoi tham gia cung luc` |
| `refactor` | Sửa cấu trúc code, không đổi hành vi | `refactor: tach post.rules khoi service` |
| `chore` | Cấu hình, thư viện, việc lặt vặt | `chore: CI 2 job backend-test, frontend-build` |

Quy tắc:
- Mô tả bằng tiếng Việt không dấu hoặc tiếng Anh; nói rõ **làm gì**, không ghi chung chung kiểu "update", "fix bug".
- Mỗi commit làm một việc.
- **Không bao giờ commit:** `.env`, `node_modules/`, `coverage/`, `dist/`, dữ liệu bài đăng thô `data/raw/`, file ghi chú `*.local.md`. Các mục này đã có trong `.gitignore`.

## 3. Quy trình một thay đổi

```bash
git switch develop && git pull                      # 1. lấy develop mới nhất
git switch -c feature/4.3.2-trich-xuat-llm          # 2. tạo nhánh theo mã WBS

# ... code + viết test ...
cd backend && npm test                              # 3. test backend
cd ../frontend && npm test && npm run lint && npm run build   #    test + kiểm tra frontend

git add -A && git commit -m "feat: ..."             # 4. commit
git push -u origin feature/4.3.2-trich-xuat-llm     # 5. đẩy lên
# 6. mở Pull Request vào develop → chờ CI xanh → Merge pull request (Create a merge commit)

git switch develop && git pull                      # 7. cập nhật develop sau khi merge
git branch -d feature/4.3.2-trich-xuat-llm          # 8. xóa nhánh đã xong
```

## 4. Quy tắc Pull Request

- Mô tả PR ngắn gọn: làm gì / vì sao, mã WBS, cách kiểm tra.
- **CI bắt buộc xanh** trước khi merge. Cấu hình bảo vệ nhánh (Settings → Branches) cho cả `main` và `develop`:
  - *Require a pull request before merging* (không yêu cầu approve, vì đồ án làm một mình).
  - *Require status checks to pass*: `backend-test`, `frontend-build`.
- Thay đổi API hoặc CSDL thì cập nhật [API.md](API.md) / [database.md](database.md) **trong cùng PR**.
- PR chưa xong thì để dạng **Draft**.

CI (`.github/workflows/ci.yml`) chạy trên **mọi** lần push và mọi PR:

| Job | Các bước |
|---|---|
| `backend-test` | `npm ci` → `npm run test:coverage` (Jest, MongoDB trong RAM; fail nếu coverage dòng < 80%) |
| `frontend-build` | `npm ci` → `npm run lint` → `npm test` → `npm run build` (gồm kiểm tra kiểu TypeScript) |

## 5. Phát hành và gắn tag

Mỗi mốc trong [Gantt](03-gantt.md) là một lần phát hành: PR `develop` → `main` (merge commit), rồi gắn tag.

```bash
git switch main && git pull
git tag -a v0.2.0 -m "M1: chay that (production), chot dac ta"
git push origin v0.2.0
git switch develop
```

| Mốc | Tag | Nội dung | Trạng thái |
|---|---|---|---|
| M0 | `v0.1.0` | Charter, WBS, Gantt, CI | Đã gắn |
| M1 (23/11/2026) | `v0.2.0` | Chạy thật (production), bắt đầu thử nghiệm thực tế | |
| M2 (30/11/2026) | `v0.9.0` | Feature freeze: bộ trích xuất LLM + kết hợp | |
| M3, M4 | — | Kết thúc thử nghiệm, xong báo cáo: không đổi code nên không gắn tag | |
| M5 (15/12/2026) | `v1.0.0` | Hoàn thành dự án | |
| A1 (18/01/2027) | `mobile-v0.1.0` | Bản thử app di động Android (giai đoạn 2) | |

Số phiên bản theo SemVer `MAJOR.MINOR.PATCH`. Khi phát hành, cập nhật `version` trong `backend/package.json`, `frontend/package.json` và `APP_VERSION` trong `frontend/src/utils/constants.ts` (hiện ở footer mọi trang).
