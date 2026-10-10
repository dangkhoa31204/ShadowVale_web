# User UI, profile and display preferences — 2026-10-10

Phạm vi: chỉ FE. Giữ bố cục Dashboard / Review / Publish đã hoàn thành; bổ sung Users theo yêu cầu mới nhất.

## Các màn đã nối

- Admin có Dashboard, Review content, Publish versions, Users. Analytics mở từ menu tài khoản.
- Users nối đầy đủ GET list (search, role, isActive, page/pageSize), GET detail, POST create, PUT update và PUT reset password.
- Username cố định sau khi tạo. Đổi email, fullName, role và trạng thái theo DTO BE. Không có nút xóa tài khoản vì BE không có DELETE users; vô hiệu hóa/khôi phục quyền truy cập dùng PUT update.
- Không cho tự đổi role, vô hiệu hóa hoặc reset password của mình trong Users. Đổi mật khẩu là trang riêng `/admin/change-password`, mở từ menu Account qua PUT /auth/me/password; Profile chỉ chứa thông tin và tùy chọn hiển thị.
- Profile đọc thông tin /me đã được AuthProvider xác thực. Không có API tự sửa profile; Admin có thể sửa thông tin qua Users. Không hiển thị thao tác lưu profile giả.
- EN/VI và sáng/tối có icon, dùng localStorage key shadowvale_preferences_v1; đồng bộ các tab. Đổi lựa chọn không remount editor và không mất nội dung đang sửa. Dữ liệu do người dùng nhập, code/GUID và thông báo gốc từ BE giữ nguyên.
- Background gốc sao chép từ Unity: Assets/_Project/Map01/Resources/Menu/Background.png. ForestMenu.cs tải bằng Resources.Load<Texture2D>("Menu/Background"). FE dùng `public/images/shadowvale-menu-landscape.png`, bản đã xóa người lính bằng imagegen theo yêu cầu mới nhất. Giữ ảnh gốc ở `shadowvale-menu.png`; không chỉnh sửa repo game. Prompt và ghi chú đồng bộ dev ở [FINAL_SYNC_2026-10-10.md](FINAL_SYNC_2026-10-10.md).
- Màu olive/khaki, nền và độ tương phản riêng cho hai theme. Các popup căn giữa viewport, form label nằm phía trên, input/textarea đủ chiều rộng.
- Users và Publish dùng Modal qua portal, Escape/Tab/focus restore, khóa đóng và sửa khi request đang chạy.

## Kiểm chứng

Kết quả cuối: `npm run build`, `npm run lint`, `npm test` đều đạt; 59/59 tests pass. `git diff --check` không có lỗi whitespace.
UI QA dùng scripts/contract-preview.mjs: API trong bộ nhớ ở 15079 và FE ở 15173, tài khoản @example.test. Không kết nối database thật.
Đã kiểm tra Login có artwork Unity, chuyển language/theme giữ form, lưu thông tin User, khóa self actions, Profile, Review, popup Publish và thao tác bàn phím. Kiểm tra responsive desktop/mobile và lưu ảnh minh chứng trong docs.
User create/reset-password request và lỗi API được kiểm bằng adapter tests; chưa thực hiện tạo/reset tài khoản trên BE/database thật.

Ảnh minh chứng (dữ liệu fixture):

- `login-game-background.png`: màn đăng nhập dùng artwork Unity, tiếng Việt, theme tối.
- `admin-users-military.png`: quản lý tài khoản, theme tối.
- `profile-military.png`: Profile tách khỏi form đổi mật khẩu, theme tối.
- `admin-publish-dialog-military.png`: popup phát hành căn giữa, textarea đủ chiều rộng.

Desktop 1280×720 và mobile 390×844 đã kiểm tra. Lựa chọn ngôn ngữ/theme được giữ sau chuyển trang và tải lại. Không thay đổi tài khoản, role, mật khẩu hoặc content version trên database thật trong lượt này.
