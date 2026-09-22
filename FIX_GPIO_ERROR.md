# Khắc phục lỗi GPIO Module

## Lỗi gặp phải:
```
GPIO not available (onoff module error): The module 'epoll.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 115. This version of Node.js requires
NODE_MODULE_VERSION 125.
```

## Nguyên nhân:
Module `onoff` và `epoll` đã được compile trên máy Windows khi chạy `npm install` ở đó. Khi copy sang Raspberry Pi, các module native này không tương thích với phiên bản Node.js trên Pi.

## Giải pháp:

### Cách 1: Xóa và cài lại (KHUYẾN NGHỊ)

```bash
cd ~/Desktop/Dashboard_Geography_1

# Cài build tools nếu chưa có
sudo apt-get update
sudo apt-get install -y build-essential python3-dev

# Xóa node_modules cũ
rm -rf node_modules package-lock.json

# Cài lại trên Raspberry Pi
npm install

# Chạy ứng dụng
npm start
```

### Cách 2: Sử dụng script tự động

```bash
cd ~/Desktop/Dashboard_Geography_1
chmod +x install_on_pi.sh
./install_on_pi.sh
```

## Kiểm tra sau khi cài

1. **Kiểm tra module onoff:**
```bash
node -e "console.log(require('onoff').Gpio ? 'OK' : 'FAIL')"
```

2. **Test GPIO bằng Python:**
```bash
chmod +x test_gpio.py
python3 test_gpio.py
```
Nhấn các nút và xem có hiển thị thông báo không.

3. **Chạy ứng dụng:**
```bash
npm start
```

## Xác nhận GPIO hoạt động

Khi `npm start` thành công, bạn sẽ thấy:

```
Starting in GPIO mode...
Setting up GPIO pins for city selection...
GPIO 17 configured → Position 6
GPIO 27 configured → Position 2
GPIO 22 configured → Position 5
GPIO setup complete. Waiting for button press...
```

Khi nhấn nút, console sẽ hiển thị:
```
GPIO 17 activated → Position 6  (Hà Nội)
GPIO 27 activated → Position 2  (Đà Nẵng)
GPIO 22 activated → Position 5  (TP.HCM)
```

## Nếu vẫn lỗi

### Lỗi: "Cannot find module 'onoff'"
```bash
npm install onoff --save
```

### Lỗi: "permission denied /dev/gpiomem"
```bash
sudo usermod -a -G gpio $USER
# Logout và login lại
```

### Lỗi: "No such device or address"
```bash
# Kiểm tra GPIO có được bật không
ls -l /dev/gpiomem
# Nếu không có, bật GPIO trong raspi-config
sudo raspi-config
# Interface Options → GPIO → Enable
```

## Mapping GPIO đúng

| Nút | GPIO | Physical Pin | Position | Thành phố |
|-----|------|--------------|----------|-----------|
| 1   | 17   | Pin 11       | 6        | Hà Nội    |
| 2   | 27   | Pin 13       | 2        | Đà Nẵng   |
| 3   | 22   | Pin 15       | 5        | TP.HCM    |

Tham khảo `GPIO_WIRING.md` để biết chi tiết kết nối phần cứng.


