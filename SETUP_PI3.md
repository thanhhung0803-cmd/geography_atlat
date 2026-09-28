# Chuyển và chạy Dashboard Nam Ô trên Raspberry Pi 3

Hướng dẫn này dùng Raspberry Pi OS Desktop 64-bit, 7 nút/cảm biến nối trực tiếp vào GPIO của Pi và nhận dạng giọng nói tiếng Việt Vosk chạy offline.

## 1. Chuẩn bị

Cần có Raspberry Pi 3/3B+, nguồn ổn định, Raspberry Pi OS Desktop 64-bit, màn hình, loa, microphone USB, mạng cho lần cài đầu và 7 nút thường hở hoặc cảm biến chạm có ngõ ra 3.3V.

Kiểm tra kiến trúc trên Pi:

```bash
uname -m
```

Kết quả khuyến nghị là `aarch64`. Electron và Vosk phải được cài trực tiếp trên Pi, không dùng `node_modules` từ Windows.

## 2. Đóng gói thư mục trên Windows

Mở PowerShell tại thư mục dự án:

```powershell
cd C:\Users\nhthinh\Desktop\freelance\geography_atlat
tar.exe -czf ..\geography_atlat-pi.tar.gz --exclude=node_modules --exclude=.git --exclude=dist .
```

Không đưa `node_modules`, `dist` hoặc `.git` sang Pi.

## 3. Chuyển file sang Pi

### Cách A — SCP qua mạng

Tìm IP của Pi bằng `hostname -I`, sau đó chạy trên Windows:

```powershell
scp ..\geography_atlat-pi.tar.gz <TEN_USER_PI>@<IP_CUA_PI>:~/
```

Ví dụ:

```powershell
scp ..\geography_atlat-pi.tar.gz namo@192.168.1.50:~/
```

### Cách B — USB

Chép `geography_atlat-pi.tar.gz` vào USB, gắn USB vào Pi rồi copy file về thư mục Home bằng trình quản lý file.

## 4. Giải nén trên Pi

Mở Terminal trong giao diện Desktop của Pi:

```bash
mkdir -p ~/geography_atlat
tar -xzf ~/geography_atlat-pi.tar.gz -C ~/geography_atlat
cd ~/geography_atlat
pwd
ls
```

Phải thấy `package.json`, `main.js`, `gpio_bridge.py`, `voice_bridge.py` và thư mục `renderer`.

## 5. Cài gói hệ thống

```bash
sudo apt update
sudo apt install -y nodejs npm python3 python3-venv python3-gpiozero alsa-utils unzip wget libgtk-3-0 libnss3 libxss1 libasound2
```

Kiểm tra:

```bash
node --version
npm --version
python3 --version
dpkg --print-architecture
```

Nên dùng Node.js 18 trở lên và kiến trúc `arm64`. Nếu Node thấp hơn 18, cần nâng Node trước khi cài ứng dụng.

## 6. Cài Electron đúng kiến trúc Pi

```bash
cd ~/geography_atlat
rm -rf node_modules
npm ci
npx electron --version
```

Không chạy `npm audit fix --force` vì có thể thay đổi dependency ngoài cấu hình đã kiểm thử.

## 7. Đấu 7 chân GPIO

Tắt nguồn Pi hoàn toàn trước khi đấu:

```bash
sudo poweroff
```

| Vị trí | BCM GPIO | Chân vật lý | Địa danh |
| ---: | ---: | ---: | --- |
| 1 | GPIO17 | 11 | Lăng Ngư Ông Nam Ô |
| 2 | GPIO27 | 13 | Đình làng Nam Ô |
| 3 | GPIO22 | 15 | Miếu Bà Huyền Trân |
| 4 | GPIO23 | 16 | Dinh Cô Hồn Nam Ô |
| 5 | GPIO24 | 18 | Giếng Chăm cổ Nam Ô |
| 6 | GPIO25 | 22 | Ghềnh Nam Ô |
| 7 | GPIO5 | 29 | Làng nghề Nước mắm Nam Ô |

Mỗi nút nối giữa chân GPIO tương ứng và 3.3V (pin vật lý 1 hoặc 17). Xem `README_GPIO.md` để có sơ đồ và lưu ý an toàn.

Bật lại Pi và test:

```bash
cd ~/geography_atlat
python3 gpio_bridge.py
```

Nhấn từng nút; phải nhận `POSITION:1` đến `POSITION:7`. Nhấn `Ctrl+C` để dừng.

## 8. Kiểm tra microphone

```bash
arecord -l
arecord -f S16_LE -r 16000 -c 1 -d 5 ~/mic-test.wav
aplay ~/mic-test.wav
```

Phải nghe lại được giọng nói rõ ràng. `voice_bridge.py` dùng thiết bị ALSA mặc định; nếu `arecord` không thu được, cần đặt microphone USB làm thiết bị thu mặc định trước.

## 9. Cài Vosk

Tạo môi trường Python riêng:

```bash
cd ~/geography_atlat
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install vosk
```

Tải model tiếng Việt nhỏ phù hợp với Pi 3:

```bash
mkdir -p models
wget -O /tmp/vosk-vn.zip https://alphacephei.com/vosk/models/vosk-model-small-vn-0.4.zip
unzip /tmp/vosk-vn.zip -d models
mv models/vosk-model-small-vn-0.4 models/vn
```

Test Vosk độc lập:

```bash
.venv/bin/python voice_bridge.py
```

Nói “Lăng Ngư Ông Nam Ô”, “Ghềnh Nam Ô” hoặc “Nước mắm Nam Ô”. Khi nhận được, terminal in dòng `FINAL:`. Nhấn `Ctrl+C` để dừng.

## 10. Bật từng chức năng

Trên Raspberry Pi, ứng dụng tự đọc `config.pi.json` thay vì cấu hình desktop. Mở cấu hình Pi:

```bash
nano ~/geography_atlat/config.pi.json
```

Cấu hình chạy đầy đủ:

```json
{
  "disableGPU": false,
  "useGPIO": true,
  "useVoice": true,
  "useKeyboard": false
}
```

Nên bật theo thứ tự để dễ tìm lỗi:

1. Cả `useGPIO` và `useVoice` là `false`: test giao diện.
2. Chỉ `useGPIO` là `true`: test bảy cảm biến.
3. Bật cả hai: chạy GPIO và Vosk.

Giữ `useKeyboard` là `false`: hệ thống chỉ chọn địa danh bằng cảm biến GPIO hoặc giọng nói, không dùng phím số 1–7.

## 11. Chạy ứng dụng

Chạy trong phiên Raspberry Pi OS Desktop có màn hình:

```bash
cd ~/geography_atlat
npm start
```

Kiểm tra lần lượt:

1. Cửa sổ Electron mở toàn màn hình.
2. Bảy cảm biến GPIO đổi đúng địa danh.
3. Ảnh và âm thanh thuyết minh hoạt động.
4. Vosk nhận tên địa danh và chuyển đúng vị trí.

Nhấn `F11` để đổi chế độ toàn màn hình. Dùng `Ctrl+C` tại terminal để dừng.

## 12. Xử lý lỗi

### `electron: not found`

```bash
cd ~/geography_atlat
npm ci
npx electron --version
```

### Electron không mở hoặc màn hình đen

Đổi `disableGPU` thành `true` trong `config.pi.json`, rồi chạy lại. Phải chạy trong phiên Desktop, không phải SSH thuần không có display.

### `No module named gpiozero`

```bash
sudo apt install -y python3-gpiozero
```

### Không có quyền GPIO

```bash
sudo usermod -a -G gpio "$USER"
sudo reboot
```

Không dùng `sudo npm start`.

### Vosk báo thiếu model

```bash
ls ~/geography_atlat/models/vn
```

Model phải nằm trực tiếp trong `models/vn`, không bị lồng thêm một thư mục model nữa.

### `arecord` báo lỗi mở thiết bị

Chạy `arecord -l`, kiểm tra microphone USB và test thu lại. Vosk chưa thể chạy cho tới khi `arecord` thu được âm thanh.

### Pi phản hồi chậm

- Chỉ dùng model `vosk-model-small-vn-0.4`.
- Đóng trình duyệt và ứng dụng không cần thiết.
- Test GPIO trước, sau đó mới bật Vosk.
- Dùng nguồn ổn định và kiểm tra cảnh báo sụt áp.

## 13. Cập nhật dự án lần sau

1. Không chép `node_modules`, `.venv` hoặc `models` từ Windows.
2. Giữ model tại `~/geography_atlat/models/vn` nếu không muốn tải lại.
3. Chạy `npm ci` trên Pi nếu `package-lock.json` thay đổi.
4. Test GPIO, microphone và Vosk riêng trước khi bật toàn bộ.
