# Game delivery — frontend contract

Phần này chỉ triển khai bố cục và tương tác frontend cho Admin: **Review content →
Game changes** và **Publish versions → Game bundle**. Dùng giao diện TailAdmin
đã điều chỉnh cho bố cục web hiện tại.

Ở demo mode (`VITE_DEMO_MODE=true`), dữ liệu build, commit, preview và phiên bản
là dữ liệu mẫu. Review, approve và publish minh hoạ luồng bằng state phía frontend.
Nhãn **Local Git** và **CI build** biểu diễn hai nguồn dự kiến khi tích hợp BE.
`Reset demo` khôi phục dữ liệu mẫu của màn hình này để thử lại luồng duyệt/publish.
Hiện không có đồng bộ Git thật, đọc repo local, Unity build, upload binary hay
Unity client tải/cài bản game. JSON xuất từ UI demo chỉ phục vụ xem hợp đồng dữ liệu.

## DTO dự kiến

`types.ts` định nghĩa hợp đồng để BE cung cấp dữ liệu sau này:

- `DeliveryState`: `builds`, `releases`, `active` theo platform và `source_error`.
- `GameBuild`: ID do BE cấp, commit/branch/author, `source: git | ci`, platform,
  revision, trạng thái build, baseline, danh sách thay đổi, gameplay JSON và artifacts.
  `stale` cho biết build cần review lại với baseline mới.
- `GameChange`: đường dẫn, loại thay đổi, nhóm maps/models/graphics/missions,
  đường dẫn trước khi rename; `import_settings` đánh dấu thay đổi thiết lập import.
  `summary` và `details` tùy chọn phục vụ thẻ mô tả và bảng giá trị trước/sau.
- `GameArtifact`: tên file, loại assetbundle/preview, URL, kích thước, SHA256,
  dependencies. UI hiển thị metadata; không biên dịch hay xác minh binary Unity.
- `GameManifest`: phiên bản, platform, commit nguồn, minimum client version,
  gameplay JSON và artifacts của cùng một bản phát hành.

Gameplay JSON bên trong theo schema DB v3: `version_no`, `label`, `schema_version`
và 14 collection trong `content/contracts/content.schema.json`. Số content version
là số tăng dần; phiên bản build/binary game dùng chuỗi semver riêng. Không đổi
`version_no` của content thành phiên bản binary khi xuất manifest.
Các DTO assets/builds là phần mở rộng UI dự kiến; DB được cung cấp chưa có bảng
Git/CI hay AssetBundles. Không coi chúng là bảng DB đã tồn tại.

Luồng UI: `awaiting_build → ready → approved → published`; lỗi build dùng `failed`,
yêu cầu sửa dùng `rejected`. Chỉ build hoàn tất và đã duyệt mới được chọn để publish.

## API placeholders

Các đường dẫn dưới đây tương đối với `VITE_API_BASE_URL` (mặc định `/api/v1`).
Chúng là hợp đồng cho tích hợp sau này, không phải endpoint đã được triển khai:

| Method / path | Request / response |
| --- | --- |
| `GET /internal/game-builds` | Trả `DeliveryState` từ nguồn Local Git/CI của BE |
| `GET /internal/game-builds/{id}/preview/{file}` | Trả ảnh preview build |
| `GET /internal/game-builds/{id}/source-preview?path=...` | Trả ảnh của source commit |
| `POST /internal/game-builds/{id}/review` | `{revision, approve, note}` → `GameBuild` |
| `POST /internal/game-releases` | `{build_id, revision, version, notes}` → `GameManifest` |

API mode cần BE thực tế trả đúng DTO, xác thực Admin và xử lý revision/baseline.
Việc nhận Git/CI, tạo AssetBundles, lưu artifacts, phát hành manifest và tích hợp
Unity download thuộc giai đoạn BE/Unity tiếp theo; frontend không thực hiện các bước đó.
