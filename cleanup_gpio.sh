#!/bin/bash
# Script để giải phóng GPIO pins

echo "Giải phóng GPIO pins 17, 22, 27..."

for pin in 17 22 27; do
    if [ -d "/sys/class/gpio/gpio$pin" ]; then
        echo $pin | sudo tee /sys/class/gpio/unexport > /dev/null 2>&1
        echo "  ✓ GPIO $pin đã giải phóng"
    else
        echo "  - GPIO $pin đã sẵn sàng"
    fi
done

echo "Done!"

