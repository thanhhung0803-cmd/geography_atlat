#!/bin/bash
# Script sửa lỗi GPIO cho Electron trên Raspberry Pi

echo "════════════════════════════════════════════════"
echo "  Sửa lỗi GPIO module cho Electron"
echo "════════════════════════════════════════════════"
echo ""

# Bước 1: Cài electron-rebuild
echo "1. Cài đặt electron-rebuild..."
npm install --save-dev electron-rebuild

# Bước 2: Rebuild native modules cho Electron
echo ""
echo "2. Rebuild native modules cho Electron..."
echo "   (Quá trình này mất 2-3 phút)"
./node_modules/.bin/electron-rebuild

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Rebuild thành công!"
    echo ""
    echo "Bây giờ chạy: npm start"
else
    echo ""
    echo "✗ Rebuild thất bại. Thử cách thủ công:"
    echo "   npm rebuild --runtime=electron --disturl=https://electronjs.org/headers --target=31.2.0 --abi=125"
fi


