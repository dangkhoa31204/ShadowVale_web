# Dọn dữ liệu test — 22/11/2026

**Kết quả cuối: 0 item test, 0 map test, 0 bundle test trong database.** Các bảng nội dung hiện còn 31 items, 4 weapons và 3 maps game thật của Draft #15, revision 3. Không tự publish Draft #15.

## Hai giai đoạn đã thực hiện

Lần đầu người dùng chọn giữ Published/lịch sử. Đã dọn 20 item test và 10 weapon phụ thuộc ở #3, #7, #8, #10, #13, là các bản chưa từng publish và không có session/history tham chiếu. Backup: output/local-unity-integration/test-items-before-1795357447303.json.

Sau đó người dùng yêu cầu dọn kỹ hơn và làm rõ “chỉ xóa dữ liệu test”. Đã kiểm kê toàn bộ nội dung cũ, rồi dọn tiếp:

- 28 item: test_ammo_pistol, test_ammo_rifle, test_pistol, test_rifle.
- 14 weapon phụ thuộc của các item trên.
- 24 map: test_field và test_safe_camp trong các phiên bản cũ.
- 7 bundle JSON chứa các item/map test.

Tổng hai lần: xóa **48 item test, 24 weapon test, 24 map test và 7 bundle test**. Các code giống test chưa biết, nội dung hỗn hợp hoặc tham chiếu ngoài bộ test sẽ làm công cụ dừng; không cascade-delete nội dung khác.

## Trạng thái phiên bản và dữ liệu được giữ

Versions #3–#14 được Archived; xóa bundle/checksum/validation và cờ published_at/published_by_id để ngừng phục vụ/rollback bộ test. Ràng buộc ck_content_versions_published_has_bundle được giữ nguyên. Lần ghi đầu thiếu bước ngừng cờ published đã bị CHECK chặn và rollback toàn bộ; lần sau thực hiện giao dịch với trạng thái hợp lệ, không tắt CHECK hoặc FK.

Bản test Published #9 đã ngừng phát hành; **hiện không có Published version**. Unity sử dụng cơ chế cache/local fallback hiện có cho tới khi Designer kiểm tra/submit Draft #15 và Admin duyệt/publish. Lần dọn này không tự phát hành nội dung thay thế.

Giữ metadata phiên bản để các FK session/publication history vẫn hợp lệ. Không xóa hay sửa tài khoản, refresh token, players, solver configurations, game sessions, telemetry events, coordination results hoặc publication history. Lịch sử log còn liên kết được tới version cũ; các snapshot nội dung test đã bỏ nên không dùng các bản đó để rollback nữa.

Backup trước giao dịch cuối: output/local-unity-integration/legacy-test-content-before-1795358072061.json, gồm đầy đủ metadata/version bundle, content rows và weapons bị tác động; không commit backup vào Git.

## Công cụ và kiểm chứng

- tools/clean-test-items.mjs: chỉ dọn test chưa publish, không có session/history; mặc định lập kế hoạch, --write yêu cầu số item đã kiểm kê.
- tools/retire-legacy-test-content.mjs: maintenance riêng cho các bản test #3–#14; mặc định lập kế hoạch. --write yêu cầu cờ --retire-published-test và số items/weapons/maps/bundles đã kiểm kê.
- tools/legacy-test-content.mjs: kiểm tra snapshot chỉ chứa các mã test đã biết, chặn bundle trộn dữ liệu thật và version #15 trở lên.

Mỗi lần ghi dùng transaction Serializable, khóa các version/row liên quan, backup trước ghi và kiểm tra row count. So sánh digest server-side của dữ liệu nằm ngoài đích dọn và toàn bộ tài khoản/session/telemetry/history; rollback nếu dữ liệu ngoài phạm vi bị đổi. Không export payload của users/token/telemetry khi kiểm tra.

Đọc lại độc lập sau commit: không còn test items/maps/bundles; chạy kế hoạch lần nữa trả 0 hàng cần dọn. Audit xác nhận đủ 31 items, 4 weapons, 3 maps cùng mọi bảng/quan hệ khác của Draft #15 khớp snapshot Unity; revision vẫn là 3.
