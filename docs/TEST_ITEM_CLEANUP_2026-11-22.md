# Dọn item test — 22/11/2026

Đã xóa dữ liệu test thật trong Supabase theo yêu cầu. Người dùng chọn giữ các bản Published/lịch sử và dừng ở 20 item đã dọn.

## Đã dọn

- 20 item có đúng các code `test_ammo_pistol`, `test_ammo_rifle`, `test_pistol`, `test_rifle`.
- Thuộc 5 version chưa từng publish và không có session/publication history tham chiếu: #3, #7, #8, #10, #13; mỗi bản 4 item.
- Xóa trước 10 hàng weapons phụ thuộc; không có loot, crafting, quest, consumable hoặc enemy phụ thuộc cần xóa.
- Tăng revision và xóa bundle/checksum/validation cũ của các version bị sửa. #7 từ Rejected về Draft theo quy tắc chỉnh nội dung; các bản Archived giữ trạng thái.
- Lưu backup trước giao dịch: `output/local-unity-integration/test-items-before-1795357447303.json`, gồm version metadata, items và weapons. Backup không đưa vào Git.

## Giữ lại theo lựa chọn của người dùng

28 item test thuộc #4, #5, #6, #9, #11, #12, #14. Các bản này có lịch sử phát hành, trong đó #9 là Published và được 18 phiên chơi tham chiếu. Không sửa các hàng này, frozen bundle, publication history hay session.

Draft #15 giữ nguyên revision 3 với 31 item, 4 súng gameplay; maps, loot, crafting và các nội dung game khác không đổi. Sau dọn, toàn database có 59 items (31 game + 28 test lịch sử), 18 weapons (4 game + 14 test lịch sử).

## Công cụ và kiểm chứng

`tools/clean-test-items.mjs` mặc định chỉ đọc/lập kế hoạch. Chỉ nhận các mã test đã biết; chỉ dọn version Draft/Rejected/Archived chưa từng publish, không có session và không có publication history. Dừng nếu có mã giống test chưa biết hoặc quan hệ phụ thuộc ngoài weapons; không cascade-delete nội dung khác.

```powershell
node tools/clean-test-items.mjs --pg-module output/local-unity-integration/pg-runtime/node_modules/pg/lib/index.js
```

`--write` bắt buộc kèm `--expected-items <số đã kiểm kê>`. Ghi trong transaction Serializable, khóa các version/item liên quan, backup trước ghi và kiểm tra số hàng đã xóa. So sánh digest dữ liệu nằm ngoài đích dọn, Published, publication history và sessions trước/sau; rollback nếu có thay đổi không mong đợi. Digest không được export cùng dữ liệu người dùng/token/telemetry.

Đọc lại sau commit: **0 item test còn đủ điều kiện dọn**, 28 item lịch sử giữ nguyên; toàn bộ số dòng và map rules của Draft #15 vẫn khớp snapshot Unity. Không publish hoặc deploy nội dung trong thao tác này.
