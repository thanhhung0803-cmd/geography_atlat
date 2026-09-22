#!/bin/bash
# Start script với GPIO setup tự động

echo "Dashboard Geography - Starting..."
echo ""

# Setup GPIO permissions
echo "Setting up GPIO permissions..."
sudo bash -c '
for pin in 17 22 27 13 19 26; do
    gpio_num=$((512 + pin))
    echo $gpio_num > /sys/class/gpio/unexport 2>/dev/null
    echo $gpio_num > /sys/class/gpio/export 2>/dev/null
    sleep 0.1
    if [ -d "/sys/class/gpio/gpio$gpio_num" ]; then
        chmod -R 777 /sys/class/gpio/gpio$gpio_num
    fi
done
'

echo "✓ GPIO permissions configured"
echo ""

# Start the application (fullscreen handled in main.js)
npm start

