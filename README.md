# Dashboard Di sản Nam Ô

Ứng dụng desktop Electron giới thiệu các địa danh, danh lam thắng cảnh và di sản Nam Ô. Bản desktop hiển thị thông tin, ảnh và phát thuyết minh âm thanh; không sử dụng GPIO, microphone hoặc nhận dạng giọng nói.

## Chạy trên Windows

```powershell
npm.cmd start
```

Nhấn `F11` để bật/tắt toàn màn hình. Nhấn phím số `1` đến `7` để chọn địa danh:

| Phím | Địa danh |
| --- | --- |
| 1 | Lăng Ngư Ông Nam Ô |
| 2 | Đình làng Nam Ô |
| 3 | Miếu Bà Huyền Trân |
| 4 | Dinh Cô Hồn Nam Ô |
| 5 | Giếng Chăm cổ Nam Ô |
| 6 | Ghềnh Nam Ô |
| 7 | Làng nghề Nước mắm Nam Ô |

## Media

Mỗi địa danh dùng đường dẫn media trực tiếp trong `renderer/cities.js`. Bảy ảnh và bảy bản ghi âm Nam Ô được giữ ở thư mục gốc của dự án.
