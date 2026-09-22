# Hướng dẫn cài đặt trên Raspberry Pi 3B+

## Yêu cầu hệ thống

- Raspberry Pi 3 B+
- Raspbian/Raspberry Pi OS (32-bit hoặc 64-bit)
- Node.js v14 trở lên
- npm v6 trở lên

## Bước 1: Cài đặt Node.js (nếu chưa có)

```bash
# Kiểm tra phiên bản hiện tại
node -v
npm -v

# Nếu chưa có hoặc phiên bản cũ, cài đặt Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Xác nhận cài đặt
node -v
npm -v
```

## Bước 2: Cấu hình quyền GPIO

```bash
# Thêm user vào gpio group
sudo usermod -a -G gpio $USER

# Khởi động lại hoặc logout/login để áp dụng
# Hoặc chạy:
newgrp gpio
```

## Bước 3: Copy project vào Raspberry Pi

Chọn một trong các cách sau:

### Cách A: Sử dụng USB
1. Copy folder `Dashboard_Geography_1` từ máy Windows vào USB
2. Cắm USB vào Raspberry Pi
3. Copy folder vào Desktop:
```bash
cp -r /media/pi/USB_NAME/Dashboard_Geography_1 ~/Desktop/
cd ~/Desktop/Dashboard_Geography_1
```

### Cách B: Sử dụng SCP qua mạng
```bash
# Trên máy Windows (PowerShell), chạy:
scp -r C:\Users\ADMIN\Desktop\Task\Dashboard_Geography_1 pi@<raspberry-pi-ip>:~/Desktop/

# Sau đó trên Raspberry Pi:
cd ~/Desktop/Dashboard_Geography_1
```

### Cách C: Download từ GitHub (nếu có)
```bash
cd ~/Desktop
git clone <repository-url>
cd Dashboard_Geography_1
```

## Bước 4: Cài đặt dependencies

```bash
cd ~/Desktop/Dashboard_Geography_1
npm install
```

**Lưu ý:** Quá trình cài đặt có thể mất 5-10 phút trên Raspberry Pi.

## Bước 5: Kiểm tra cấu hình

Đảm bảo file `config.json` có `useGPIO: true`:

```bash
cat config.json
```

Nội dung phải là:
```json
{
  "useGPIO": true,
  "mqttHost": "thingsboard.cloud",
  "mqttPort": 1883,
  "useTLS": false,
  "accessToken": "SVrrYO07oqeucp6Cs2kf"
}
```

## Bước 6: Kết nối phần cứng

Kết nối 3 nút nhấn theo sơ đồ:

| Nút | GPIO Pin | Physical Pin | Thành phố |
|-----|----------|--------------|-----------|
| 1   | GPIO 17  | Pin 11       | Hà Nội    |
| 2   | GPIO 27  | Pin 13       | Đà Nẵng   |
| 3   | GPIO 22  | Pin 15       | TP.HCM    |

**Kết nối mỗi nút:**
- Một chân nút → GPIO pin (17, 27, hoặc 22)
- Chân kia của nút → 3.3V (Pin 1 hoặc Pin 17)
- **KHÔNG** sử dụng 5V!

Xem chi tiết trong file `GPIO_WIRING.md`

## Bước 7: Test GPIO (Tùy chọn)

Trước khi chạy app, test GPIO bằng Python:

```bash
# Tạo file test
nano test_gpio.py
```

Paste nội dung sau:
```python
import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)
GPIO.setup(17, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
GPIO.setup(27, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
GPIO.setup(22, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

print("Testing GPIO pins... Press Ctrl+C to exit")
print("Press buttons to test...")

try:
    while True:
        if GPIO.input(17):
            print("✓ GPIO 17 - Hà Nội")
            time.sleep(0.3)
        if GPIO.input(27):
            print("✓ GPIO 27 - Đà Nẵng")
            time.sleep(0.3)
        if GPIO.input(22):
            print("✓ GPIO 22 - TP.HCM")
            time.sleep(0.3)
        time.sleep(0.1)
except KeyboardInterrupt:
    GPIO.cleanup()
    print("\nTest completed!")
```

Chạy test:
```bash
python3 test_gpio.py
# Nhấn các nút để kiểm tra
# Ctrl+C để thoát
```

## Bước 8: Chạy ứng dụng

```bash
cd ~/Desktop/Dashboard_Geography_1
npm start
```

Ứng dụng sẽ:
1. Khởi động Electron
2. Khởi tạo GPIO pins 17, 27, 22
3. Hiển thị cửa sổ dashboard
4. Chờ bạn nhấn nút để chọn thành phố

## Xử lý sự cố

### Lỗi: "Error: cannot open /dev/gpiomem"
```bash
sudo chmod 666 /dev/gpiomem
# Hoặc chạy với sudo (không khuyến nghị):
sudo npm start
```

### Lỗi: "Gtk-WARNING **: cannot open display"
Raspberry Pi cần chạy trong môi trường desktop (GUI), không phải SSH text-only.
```bash
# Nếu đang SSH, enable X11 forwarding:
ssh -X pi@raspberry-pi-ip
# Hoặc dùng VNC để remote desktop
```

### Lỗi: "Module not found: onoff"
```bash
npm install onoff --save
```

### Ứng dụng không phản hồi khi nhấn nút
1. Kiểm tra kết nối vật lý
2. Chạy test_gpio.py để xác nhận GPIO hoạt động
3. Kiểm tra log trong terminal khi chạy npm start
4. Đảm bảo config.json có "useGPIO": true

## Chạy tự động khi khởi động (Tùy chọn)

```bash
# Tạo desktop entry
mkdir -p ~/.config/autostart
nano ~/.config/autostart/dashboard.desktop
```

Nội dung:
```
[Desktop Entry]
Type=Application
Name=Dashboard Geography
Exec=/home/pi/Desktop/Dashboard_Geography_1/start.sh
Terminal=false
```

Tạo script start:
```bash
nano ~/Desktop/Dashboard_Geography_1/start.sh
```

Nội dung:
```bash
#!/bin/bash
cd /home/pi/Desktop/Dashboard_Geography_1
npm start
```

Cấp quyền:
```bash
chmod +x ~/Desktop/Dashboard_Geography_1/start.sh
```

## Kiểm tra hiệu năng

Raspberry Pi 3B+ đủ mạnh để chạy Electron, nhưng:
- Khởi động có thể mất 10-30 giây
- Sử dụng RAM khoảng 200-400MB
- Nên đóng các ứng dụng khác để tối ưu

## Liên hệ và hỗ trợ

Nếu gặp vấn đề, kiểm tra:
1. Log trong terminal khi chạy `npm start`
2. File GPIO_WIRING.md để xem sơ đồ kết nối
3. Chạy test_gpio.py để kiểm tra phần cứng

