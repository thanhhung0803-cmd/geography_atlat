# Micro Vosk tren Raspberry Pi 3

Ung dung dung Vosk offline va `arecord`, khong can Internet sau khi cai dat.
`config.pi.json` da bat ca GPIO va voice.

## Cai dat mot lan tren Pi

```bash
cd ~/geography_atlat
sudo apt update
sudo apt install -y alsa-utils python3-venv unzip wget
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install vosk
mkdir -p models
wget -O /tmp/vosk-vn.zip https://alphacephei.com/vosk/models/vosk-model-small-vn-0.4.zip
unzip /tmp/vosk-vn.zip -d models
mv models/vosk-model-small-vn-0.4 models/vn
```

## Kiem tra micro

```bash
arecord -l
arecord -f S16_LE -r 16000 -c 1 -d 5 /tmp/mic-test.wav
aplay /tmp/mic-test.wav
```

Neu USB microphone khong phai thiet bi mac dinh, lay card/device tu `arecord -l`
va khoi dong vi du nhu sau:

```bash
VOSK_AUDIO_DEVICE=plughw:1,0 npm start
```

## Test nhan dang rieng

```bash
cd ~/geography_atlat
npm run test:voice
.venv/bin/python voice_bridge.py
```

Noi mot trong bay keyword. Terminal phai in `FINAL: ...`:

1. Mieu Ba Huyen Tran
2. Ghenh Nam O
3. Lang Ca Ong
4. Gieng Vuong
5. Dinh Am Hon
6. Nuoc Mam Nam O
7. Dinh Lang

Nhan `Ctrl+C`, sau do chay ung dung bang `npm start`. Micro tiep tuc nghe trong
luc phat thuyet minh va bo qua dia danh hien dang phat.

## Tu khoi dong khi bat Raspberry Pi

Raspberry Pi can khoi dong vao Desktop va tu dong dang nhap user `pi`. Cai dat
autostart mot lan, khong dung `sudo`:

```bash
cd ~/Desktop/geography_atlat
bash install_autostart.sh
sudo reboot
```

Sau khi vao Desktop, ung dung se tu chay. Xem log:

```bash
tail -f ~/Desktop/geography_atlat/logs/autostart.log
```

Go bo tu khoi dong:

```bash
cd ~/Desktop/geography_atlat
bash install_autostart.sh --remove
```
