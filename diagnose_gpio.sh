#!/bin/bash
# GPIO Diagnostic Script

echo "════════════════════════════════════════════════"
echo "  GPIO Diagnostic Tool"
echo "════════════════════════════════════════════════"
echo ""

# Test 1: Check GPIO system
echo "1. Checking GPIO system files..."
if [ -d "/sys/class/gpio" ]; then
    echo "   ✓ /sys/class/gpio exists"
    ls -la /sys/class/gpio/ | head -5
else
    echo "   ✗ /sys/class/gpio not found!"
fi
echo ""

# Test 2: Check gpiomem
echo "2. Checking /dev/gpiomem permissions..."
ls -la /dev/gpiomem
echo ""

# Test 3: Try to export GPIO pins manually
echo "3. Testing GPIO export for pins 17, 22, 27..."
for pin in 17 22 27; do
    echo "   Testing GPIO $pin..."
    
    # Try to unexport first
    echo $pin > /sys/class/gpio/unexport 2>/dev/null
    
    # Try to export
    if echo $pin > /sys/class/gpio/export 2>/dev/null; then
        echo "   ✓ GPIO $pin exported successfully"
        
        # Check if gpio directory created
        if [ -d "/sys/class/gpio/gpio$pin" ]; then
            echo "   ✓ GPIO $pin directory created"
            
            # Try to set direction
            if echo "in" > /sys/class/gpio/gpio$pin/direction 2>/dev/null; then
                echo "   ✓ GPIO $pin direction set to 'in'"
                
                # Try to read value
                value=$(cat /sys/class/gpio/gpio$pin/value 2>/dev/null)
                echo "   ✓ GPIO $pin value: $value"
            else
                echo "   ✗ Cannot set GPIO $pin direction"
            fi
            
            # Cleanup
            echo $pin > /sys/class/gpio/unexport 2>/dev/null
        else
            echo "   ✗ GPIO $pin directory not created"
        fi
    else
        echo "   ✗ Cannot export GPIO $pin"
        echo "      Error: Pin may be in use or reserved"
    fi
    echo ""
done

# Test 4: List all available GPIO
echo "4. Available GPIO pins:"
if [ -d "/sys/class/gpio" ]; then
    for gpiochip in /sys/class/gpio/gpiochip*; do
        if [ -d "$gpiochip" ]; then
            base=$(cat $gpiochip/base 2>/dev/null)
            ngpio=$(cat $gpiochip/ngpio 2>/dev/null)
            label=$(cat $gpiochip/label 2>/dev/null)
            echo "   $label: base=$base, ngpio=$ngpio"
        fi
    done
fi
echo ""

# Test 5: Check if pins are already in use
echo "5. Checking if pins are already in use..."
for pin in 17 22 27; do
    if [ -d "/sys/class/gpio/gpio$pin" ]; then
        echo "   ⚠ GPIO $pin is already exported!"
    else
        echo "   - GPIO $pin is not exported (available)"
    fi
done
echo ""

# Test 6: Try alternative pins
echo "6. Testing alternative GPIO pins (23, 24, 25)..."
for pin in 23 24 25; do
    if echo $pin > /sys/class/gpio/export 2>/dev/null; then
        echo "   ✓ GPIO $pin works!"
        echo $pin > /sys/class/gpio/unexport 2>/dev/null
    else
        echo "   ✗ GPIO $pin failed"
    fi
done
echo ""

echo "════════════════════════════════════════════════"
echo "Diagnosis complete!"
echo ""
echo "If pins 17, 22, 27 failed but other pins work,"
echo "consider using alternative pins like 23, 24, 25"
echo "════════════════════════════════════════════════"


