#!/bin/bash
# Script để cài đặt lại dependencies trên Raspberry Pi

echo "======================================"
echo "Cài đặt Dashboard Geography trên Pi"
echo "======================================"
echo ""

# Kiểm tra build tools
echo "1. Kiểm tra build tools..."
if ! command -v gcc &> /dev/null; then
    echo "   ⚠ gcc not found. Installing build-essential..."
    sudo apt-get update
    sudo apt-get install -y build-essential
else
    echo "   ✓ gcc found"
fi
echo ""

# Kiểm tra Node.js
echo "2. Kiểm tra Node.js..."
NODE_VERSION=$(node -v)
echo "   Node version: $NODE_VERSION"
echo ""

# Xóa node_modules cũ
echo "3. Xóa node_modules và package-lock.json cũ..."
if [ -d "node_modules" ]; then
    rm -rf node_modules
    echo "   ✓ node_modules đã xóa"
fi

if [ -f "package-lock.json" ]; then
    rm -f package-lock.json
    echo "   ✓ package-lock.json đã xóa"
fi
echo ""

# Cài đặt lại
echo "4. Cài đặt dependencies mới..."
echo "   (Quá trình này có thể mất 5-10 phút)"
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Cài đặt thành công!"
    echo ""
    echo "Bạn có thể chạy ứng dụng bằng:"
    echo "   npm start"
else
    echo ""
    echo "✗ Cài đặt thất bại. Vui lòng kiểm tra lỗi ở trên."
fi


