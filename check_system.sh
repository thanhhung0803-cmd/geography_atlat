#!/bin/bash
# System check script for Raspberry Pi setup

echo "======================================"
echo "Dashboard Geography - System Check"
echo "======================================"
echo ""

# Check if running on Raspberry Pi
echo "1. Checking system..."
if [ -f /proc/device-tree/model ]; then
    MODEL=$(cat /proc/device-tree/model)
    echo "   ✓ Device: $MODEL"
else
    echo "   ✗ Not running on Raspberry Pi"
fi
echo ""

# Check Node.js
echo "2. Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "   ✓ Node.js: $NODE_VERSION"
else
    echo "   ✗ Node.js not found"
    echo "   Install: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "            sudo apt-get install -y nodejs"
fi
echo ""

# Check npm
echo "3. Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "   ✓ npm: $NPM_VERSION"
else
    echo "   ✗ npm not found"
fi
echo ""

# Check GPIO access
echo "4. Checking GPIO access..."
if [ -r /dev/gpiomem ] && [ -w /dev/gpiomem ]; then
    echo "   ✓ GPIO accessible"
else
    echo "   ⚠ Limited GPIO access"
    echo "   Run: sudo usermod -a -G gpio $USER"
    echo "   Then logout and login again"
fi
echo ""

# Check if in gpio group
echo "5. Checking user groups..."
if groups | grep -q gpio; then
    echo "   ✓ User in gpio group"
else
    echo "   ✗ User not in gpio group"
    echo "   Run: sudo usermod -a -G gpio $USER"
fi
echo ""

# Check Python (for testing)
echo "6. Checking Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "   ✓ $PYTHON_VERSION"
else
    echo "   ✗ Python3 not found"
fi
echo ""

# Check RPi.GPIO
echo "7. Checking RPi.GPIO module..."
if python3 -c "import RPi.GPIO" 2>/dev/null; then
    echo "   ✓ RPi.GPIO installed"
else
    echo "   ✗ RPi.GPIO not installed"
    echo "   Install: sudo apt-get install python3-rpi.gpio"
fi
echo ""

# Check project files
echo "8. Checking project files..."
if [ -f "package.json" ]; then
    echo "   ✓ package.json found"
else
    echo "   ✗ package.json not found"
fi

if [ -f "config.json" ]; then
    echo "   ✓ config.json found"
    if grep -q '"useGPIO": true' config.json; then
        echo "   ✓ GPIO mode enabled"
    else
        echo "   ⚠ GPIO mode disabled (set useGPIO: true)"
    fi
else
    echo "   ⚠ config.json not found (will use example)"
fi

if [ -d "node_modules" ]; then
    echo "   ✓ node_modules installed"
else
    echo "   ⚠ Dependencies not installed (run: npm install)"
fi
echo ""

# Check GPIO pins
echo "9. Checking GPIO pin status..."
for pin in 17 27 22; do
    if [ -d "/sys/class/gpio/gpio$pin" ]; then
        echo "   ⚠ GPIO $pin already exported (may be in use)"
    else
        echo "   ✓ GPIO $pin available"
    fi
done
echo ""

echo "======================================"
echo "System check complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Fix any issues marked with ✗ or ⚠"
echo "2. Connect buttons to GPIO 17, 27, 22"
echo "3. Run: npm install (if needed)"
echo "4. Test GPIO: python3 test_gpio.py"
echo "5. Start app: npm start (or ./start.sh)"


