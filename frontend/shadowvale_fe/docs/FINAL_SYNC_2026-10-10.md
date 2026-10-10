# Đồng bộ Khoa với dev và tinh chỉnh tài khoản — 2026-10-10

- Đã fetch origin/dev và origin/Khoa. Khoa đồng bộ dev `72d4f324bbd5dc36ca412826297a814797b06d57` (fix throw json errors); không thay đổi code BE ngoài nội dung từ dev.
- Generator FE chạy lại theo OpenAPI mới: 95 schemas, 81 operations. Bộ xử lý lỗi FE đọc ProblemDetails (`message/detail/title`, `errors`, HTTP status), giữ nội dung đang sửa.
- Login và Profile dùng cảnh nền đã bỏ người lính. Asset: `public/images/shadowvale-menu-landscape.png`. Ảnh gốc Unity được giữ ở `public/images/shadowvale-menu.png` để truy xuất nguồn.
- Profile: thông tin tài khoản và tùy chọn hiển thị. Change password: trang riêng `/admin/change-password` trong menu Account, cùng quyền đăng nhập cho Admin/Designer/Analyst, PUT `/api/auth/me/password`; đổi thành công kết thúc phiên đăng nhập theo BE.
- Build, lint và 59/59 tests pass sau đồng bộ. UI QA dùng API trong bộ nhớ ở 15079, FE 15173; không đổi mật khẩu hoặc dữ liệu DB thật.
- Ảnh minh chứng: `login-game-background.png`, `profile-military.png`, `change-password-page.png`.

## Chỉnh ảnh

Dùng built-in image_gen theo skill imagegen; không dùng CLI. Edit target là artwork Unity gốc, không dùng screenshot giao diện làm ảnh nền. Prompt cuối:

> Use case: precise-object-edit. Edit target: the attached ShadowVale menu artwork, a Vietnamese rice-field landscape. Remove only the entire soldier on the right, including helmet, body, hands, clothes and boots. Seamlessly reconstruct the rural scenery previously obscured by him: the existing earthen path, bamboo hut wall and fence, banana foliage and surrounding vegetation. Keep the landscape, composition, camera angle, rice paddies, water reflections, palm trees, bamboo house, warm olive/khaki painterly pixel-art style and original lighting unchanged as closely as possible. Output a clean full landscape background with no people, no soldiers, no silhouettes, no text, no logo, no UI, no watermark. Preserve the original landscape aspect ratio.
