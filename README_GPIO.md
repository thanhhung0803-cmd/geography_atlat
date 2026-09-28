# GPIO Raspberry Pi 3 cho 7 địa danh Nam Ô

Ứng dụng dùng cách đánh số **BCM GPIO**. Không nhầm số BCM với số chân vật lý trên đầu nối 40 chân của Raspberry Pi 3.

## Bảng đấu chân

| Vị trí | BCM GPIO | Chân vật lý | Địa danh, danh lam |
| ---: | ---: | ---: | --- |
| 1 | GPIO17 | Pin 11 | Lăng Ngư Ông Nam Ô |
| 2 | GPIO27 | Pin 13 | Đình làng Nam Ô |
| 3 | GPIO22 | Pin 15 | Miếu Bà Huyền Trân |
| 4 | GPIO23 | Pin 16 | Dinh Cô Hồn Nam Ô |
| 5 | GPIO24 | Pin 18 | Giếng Chăm cổ Nam Ô |
| 6 | GPIO25 | Pin 22 | Ghềnh Nam Ô |
| 7 | GPIO5 | Pin 29 | Làng nghề Nước mắm Nam Ô |

Các chân cấp nguồn dùng chung:

- 3.3V: pin vật lý 1 hoặc 17.
- GND: pin vật lý 6, 9, 14, 20, 25, 30, 34 hoặc 39.

## Sơ đồ đấu nút nhấn

Phải tắt nguồn Pi trước khi đấu dây. Mỗi nút là loại thường hở (`normally open`):

```text
3.3V (pin 1 hoặc 17)
  │
  ├── [Nút 1] ── GPIO17 (pin 11)
  ├── [Nút 2] ── GPIO27 (pin 13)
  ├── [Nút 3] ── GPIO22 (pin 15)
  ├── [Nút 4] ── GPIO23 (pin 16)
  ├── [Nút 5] ── GPIO24 (pin 18)
  ├── [Nút 6] ── GPIO25 (pin 22)
  └── [Nút 7] ── GPIO5  (pin 29)
```

Chương trình bật điện trở kéo xuống nội bộ. Trạng thái bình thường là `LOW`; nhấn nút sẽ đưa 3.3V vào chân và tạo trạng thái `HIGH`.

## Nếu dùng cảm biến chạm

Với module có chân `VCC`, `GND`, `OUT`:

- `VCC` → 3.3V của Pi.
- `GND` → GND của Pi.
- `OUT` → GPIO tương ứng trong bảng.
- Module phải xuất tín hiệu 3.3V. Không đưa tín hiệu 5V vào GPIO.
- Nếu module xuất mức `HIGH` liên tục khi chưa chạm, phải đảo `active_state` trong `gpio_bridge.py` hoặc điều chỉnh jumper của module.

## Kiểm tra chân trên Pi

Hiện sơ đồ chân thực tế:

```bash
pinout
```

Chạy riêng bridge GPIO:

```bash
cd ~/geography_atlat
python3 gpio_bridge.py
```

Khi nhấn từng nút, terminal phải lần lượt hiển thị:

```text
POSITION:1
POSITION:2
POSITION:3
POSITION:4
POSITION:5
POSITION:6
POSITION:7
```

Nhấn `Ctrl+C` để dừng kiểm tra.

## Quyền truy cập GPIO

Kiểm tra user hiện tại thuộc nhóm `gpio`:

```bash
groups
```

Nếu chưa có nhóm `gpio`:

```bash
sudo usermod -a -G gpio "$USER"
sudo reboot
```

Không chạy toàn bộ Electron bằng `sudo`. Nếu có lỗi quyền, sửa quyền/nhóm GPIO rồi đăng nhập lại.

## An toàn phần cứng

- GPIO của Raspberry Pi chỉ chịu mức logic 3.3V; không nối GPIO trực tiếp với 5V.
- Không đấu hoặc tháo dây khi Pi đang được cấp nguồn.
- Không nối trực tiếp động cơ, relay trần hoặc tải công suất vào GPIO.
- Đối chiếu cả số BCM và số chân vật lý trước khi bật nguồn.
- File thực thi mapping này là `gpio_bridge.py`; mọi thay đổi chân phải được cập nhật đồng thời trong file đó và tài liệu này.
