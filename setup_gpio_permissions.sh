#!/bin/bash
# Setup GPIO permissions để không cần sudo

echo "Setting up GPIO permissions..."

# GPIO pins to configure
PINS=(17 22 27)
BASE=512

for pin in "${PINS[@]}"; do
    gpio_num=$((BASE + pin))
    echo "Configuring GPIO $pin (gpio$gpio_num)..."
    
    # Unexport if already exported
    echo $gpio_num > /sys/class/gpio/unexport 2>/dev/null
    
    # Export
    echo $gpio_num > /sys/class/gpio/export 2>/dev/null
    
    # Wait for directory to be created
    sleep 0.2
    
    # Set permissions
    if [ -d "/sys/class/gpio/gpio$gpio_num" ]; then
        chmod -R 777 /sys/class/gpio/gpio$gpio_num
        echo "  ✓ Permissions set for gpio$gpio_num"
    fi
done

echo ""
echo "Done! Now run: npm start"


