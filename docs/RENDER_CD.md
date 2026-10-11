# CD cho FE và BE trên Render

CD dùng GitHub Actions và hai Deploy Hooks riêng. Nhánh triển khai là `dev`,
đúng với hai dịch vụ hiện tại. Code CD được push vào `Khoa`; cần merge vào `dev`
trước khi workflow tự chạy. Không deploy từ PR, `main` hoặc `Khoa`.

## Luồng

- Thay đổi `frontend/**`: Frontend chạy `npm ci`, lint, tests, build; đạt mới gọi hook FE.
- Thay đổi `backend/**`: Backend chạy CI hiện có (build, OpenAPI consistency,
  unit/integration tests trên PostgreSQL dùng một lần); đạt mới gọi hook BE.
- Thay đổi cả hai: mỗi dịch vụ đợi CI của chính nó, rồi deploy độc lập.
- Thay script deploy chung: cả hai workflow chạy lại.
- Hook gửi `ref` bằng SHA đã kiểm tra, không tự chọn commit mới chưa qua CI.
  Run cũ bị bỏ qua nếu `dev` đã có thay đổi mới hơn của chính phần đó; commit
  chỉ sửa phần còn lại không làm mất deploy đang chờ.

## Thiết lập một lần

1. Trong **cả hai dịch vụ Render**, đặt Branch = `dev`, **Auto-Deploy = Off**.
   GitHub Actions sẽ điều khiển deploy; giữ Auto-Deploy On Commit có thể deploy
   trước khi CI đạt và tạo deploy trùng.
2. Mở từng dịch vụ → Settings → Deploy Hook, copy URL nguyên bản.
3. Trong repository `dangkhoa31204/ShadowVale_web` → Settings → Secrets and
   variables → Actions → New repository secret, thêm:

   | Secret | Giá trị |
   | --- | --- |
   | `RENDER_FE_DEPLOY_HOOK` | Deploy Hook của Static Site `shadowvale-web-1` |
   | `RENDER_BE_DEPLOY_HOOK` | Deploy Hook của Web Service `shadowvale-web` |

   Không đưa hook vào file, commit, chat hoặc log; hook có quyền kích hoạt deploy.
   Không cần Render API key hoặc quyền ghi GitHub token cho cách này.
4. Kiểm tra các cấu hình dịch vụ dưới đây rồi merge bản CD từ `Khoa` vào `dev`.

## Cấu hình dịch vụ

| Cấu hình | FE Static Site | BE Docker Web Service |
| --- | --- | --- |
| Root Directory | `frontend/shadowvale_fe` | `backend/shadowvale_be` |
| Build Command | `npm ci && npm run build` | Do Dockerfile thực hiện |
| Publish Directory | `dist` | Không áp dụng |
| Dockerfile / context | Không áp dụng | `./Dockerfile` / `.` |
| Health Check | Không áp dụng | `/health` |
| Branch / Auto-Deploy | `dev` / Off | `dev` / Off |

FE Environment:

```env
NODE_VERSION=24
VITE_DEMO_MODE=false
VITE_API_BASE_URL=https://shadowvale-web.onrender.com/api
```

FE Redirects/Rewrites: Source `/*`, Destination `/index.html`, Action **Rewrite**.
Build trên Actions kiểm tra FE; Render build lại cùng SHA với các biến môi trường
của dịch vụ. Do đó phải đặt đúng URL API trên Render, không chỉ ở workflow.

BE Environment (giữ nguyên DB/JWT/Game keys đang có):

```env
ASPNETCORE_ENVIRONMENT=Production
PORT=8080
OpenApi__Enabled=true
Cors__AllowedOrigins__0=https://shadowvale-web-1.onrender.com
```

`OpenApi__Enabled` chỉ cần nếu muốn mở Scalar. CORS origin không có `/` cuối.
Pipeline không tự migrate hoặc seed database; nếu BE có startup seeder hiện có,
việc khởi động vẫn theo hành vi BE. Database integration tests của CI là service
PostgreSQL dùng một lần, không được đổi sang DB team/Production.

## Kiểm chứng và giới hạn

- GitHub Actions: trên push `dev`, job CI phải đạt trước job Deploy tương ứng.
- Thiếu secret / hook lỗi: job Deploy báo lỗi, không báo web đã live.
- Hook trả 200 hoặc 202 chỉ xác nhận Render nhận lệnh/start/queue deploy.
  Workflow **không** xác nhận deploy đã live; xem Render Events/Logs.
- Render deploy phải hiện đúng SHA của run, FE tải `/assets/*.js`, BE `/health`
  hoạt động. Thử login và F5 một route FE sau khi deploy.
- Nếu run cũ bị bỏ qua, cần run CI thành công cho SHA mới nhất, có thay đổi thuộc
  dịch vụ cần deploy. Có thể re-run run tương ứng sau khi sửa secrets.
- Các thiết lập Render, GitHub secrets và merge `dev` cần hoàn thành trước khi CD
  chạy thật; kiểm tra local không chứng minh tài khoản bên ngoài đã cấu hình.

Tài liệu: [Render Deploy Hooks](https://render.com/docs/deploy-hooks),
[Render monorepo](https://render.com/docs/monorepo-support),
[GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).
