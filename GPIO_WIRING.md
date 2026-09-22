# Hướng dẫn kết nối GPIO cho Raspberry Pi 3 B+

## Sơ đồ chân GPIO

Dựa trên hình pinout đã cung cấp, đây là cách kết nối các nút nhấn:

```
Raspberry Pi 3 B+ GPIO Pinout:
┌─────────────────────────────────┐
│  3.3V  [ 1] [ 2]  5V            │
│   SDA  [ 3] [ 4]  5V            │
│   SCL  [ 5] [ 6]  GND           │
│ GPIO4  [ 7] [ 8]  GPIO14        │
│   GND  [ 9] [10]  GPIO15        │
│GPIO17  [11] [12]  GPIO18  ◄──── GPIO 17 (Hà Nội)
│GPIO27  [13] [14]  GND           │
│GPIO22  [15] [16]  GPIO23  ◄──── GPIO 22 (TP.HCM)
│  3.3V  [17] [18]  GPIO24        │
│GPIO10  [19] [20]  GND           │
│ GPIO9  [21] [22]  GPIO25        │
│GPIO11  [23] [24]  GPIO8         │
│   GND  [25] [26]  GPIO7         │
│  DNC   [27] [28]  DNC           │
│ GPIO5  [29] [30]  GND           │
│ GPIO6  [31] [32]  GPIO12        │
│GPIO13  [33] [34]  GND     ◄──── GPIO 27 (Đà Nẵng)
│GPIO19  [35] [36]  GPIO16        │
│GPIO26  [37] [38]  GPIO20        │
│   GND  [39] [40]  GPIO21        │
└─────────────────────────────────┘
```

## Vị trí các GPIO pins

| GPIO | Physical Pin | Thành phố |
|------|--------------|-----------|
| 17   | Pin 11       | Hà Nội    |
| 27   | Pin 13       | Đà Nẵng   |
| 22   | Pin 15       | TP.HCM    |

## Sơ đồ kết nối chi tiết

### Cách 1: Nút nhấn với pull-down (khuyến nghị)

```
        ┌──────┐
3.3V ───┤      ├─── GPIO17 (Pin 11) → Hà Nội
        │ BTN1 │
GND  ───┤      │
        └──────┘

        ┌──────┐
3.3V ───┤      ├─── GPIO27 (Pin 13) → Đà Nẵng
        │ BTN2 │
GND  ───┤      │
        └──────┘

        ┌──────┐
3.3V ───┤      ├─── GPIO22 (Pin 15) → TP.HCM
        │ BTN3 │
GND  ───┤      │
        └──────┘
```

### Cách 2: Nút nhấn đơn giản

Mỗi nút kết nối giữa GPIO pin và 3.3V:
- Một đầu nút → GPIO pin (17, 27, hoặc 22)
- Đầu kia → 3.3V (Pin 1 hoặc Pin 17)
- Software sẽ tự động cấu hình pull-down resistor

**Lưu ý quan trọng:**
- **KHÔNG** kết nối trực tiếp GPIO với 5V, sẽ làm hỏng Raspberry Pi!
- Chỉ sử dụng 3.3V cho GPIO
- Sử dụng nút nhấn thường mở (normally open)

## Danh sách linh kiện cần thiết

1. **Raspberry Pi 3 B+** (1 cái)
2. **Nút nhấn** (3 cái) - Push button, normally open
3. **Điện trở 10kΩ** (3 cái) - Tùy chọn, để pull-down
4. **Dây Dupont Female-to-Female** (6-9 sợi)
5. **Breadboard** (1 cái) - Tùy chọn, để dễ kết nối

## Code test GPIO (Python)

Nếu muốn test GPIO trước khi chạy ứng dụng Electron, sử dụng script Python:

```python
import RPi.GPIO as GPIO
import time

# Setup
GPIO.setmode(GPIO.BCM)
GPIO.setup(17, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
GPIO.setup(27, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
GPIO.setup(22, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

print("Testing GPIO pins...")
print("Press buttons to test...")

try:
    while True:
        if GPIO.input(17):
            print("GPIO 17 - Hà Nội")
        if GPIO.input(27):
            print("GPIO 27 - Đà Nẵng")
        if GPIO.input(22):
            print("GPIO 22 - TP.HCM")
        time.sleep(0.1)
except KeyboardInterrupt:
    GPIO.cleanup()
    print("\nTest completed!")
```

## Xử lý sự cố

### Lỗi: "onoff module not found"
```bash
cd /path/to/project
npm install onoff
```

### Lỗi: "Permission denied accessing GPIO"
```bash
# Thêm user vào gpio group
sudo usermod -a -G gpio $USER
# Logout và login lại
```

### GPIO không hoạt động
1. Kiểm tra kết nối vật lý
2. Chạy test script Python ở trên
3. Kiểm tra file `/sys/class/gpio/` có tồn tại không
4. Đảm bảo không có process khác đang sử dụng GPIO pins

## Tài liệu tham khảo

- [Raspberry Pi GPIO Pinout](https://pinout.xyz/)
- [onoff npm package](https://www.npmjs.com/package/onoff)
- [RPi.GPIO Documentation](https://sourceforge.net/p/raspberry-gpio-python/wiki/Home/)

