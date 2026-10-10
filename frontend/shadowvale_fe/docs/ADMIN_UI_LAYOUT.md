# Admin UI — 2026-10-10

Admin có Dashboard, Review content, Publish versions và Users theo yêu cầu bổ sung mới nhất.
Analytics vẫn nằm trong menu tài khoản. Chỉ sửa frontend; bố cục TailAdmin được giữ, màu olive/khaki có theme sáng/tối. Chi tiết cập nhật Users, Profile và song ngữ ở [USER_PROFILE_APPEARANCE.md](USER_PROFILE_APPEARANCE.md).

- Dashboard: counts theo workspace thật, hàng chờ review, bản approved, phiên bản live và publication activity.
- Review: mặc định InReview, bộ lọc trạng thái, tìm theo số version/tên/tác giả, hàng chờ oldest-first, metadata và validation, diff trước/sau, quyết định kèm feedback.
- Publish: live version, hàng approved, Published versions/Publication history/Compare versions ở tab riêng; View changes mở dialog; publish/rollback yêu cầu lý do.
- Game changes/assets là tùy chọn, API chưa hỗ trợ vẫn ghi rõ giới hạn; không tạo dữ liệu server giả.

API / workflow, revision checks và raw JSON download giữ nguyên. Admin không được mở Content authoring.

## Kiểm chứng

- Build/lint đạt và 59/59 tests pass sau lượt bổ sung Users, Profile và tùy chọn hiển thị.
- Browser QA dùng scripts/contract-preview.mjs: API in-memory cổng 15079 + FE 15173.
- Đã kiểm tra Dashboard navigation, hàng InReview mặc định, diff, approve → hàng Publish, View changes dialog, publish reason/confirmation và cập nhật live version, history và compare tabs.
- Kiểm tra responsive 390px. Ảnh admin-review-layout.png và admin-publish-layout.png là dữ liệu fixture, không phải dữ liệu DB.
- Không approve/publish/reset mật khẩu hoặc sửa DB thật trong lượt thiết kế này.
