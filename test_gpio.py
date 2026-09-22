#!/usr/bin/env python3
"""
Test script for GPIO buttons on Raspberry Pi 3B+
GPIO 17 = Hà Nội
GPIO 27 = Đà Nẵng  
GPIO 22 = TP.HCM
"""

import RPi.GPIO as GPIO
import time

# GPIO pins mapping
PINS = {
    17: "Hà Nội",
    27: "Đà Nẵng",
    22: "TP.HCM"
}

def setup_gpio():
    """Initialize GPIO pins"""
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    
    for pin in PINS.keys():
        GPIO.setup(pin, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
        print(f"✓ GPIO {pin} configured as INPUT with pull-down")

def test_loop():
    """Main test loop"""
    print("\n" + "="*50)
    print("GPIO Test - Dashboard Geography")
    print("="*50)
    print("\nPress the buttons to test:")
    print("- Button 1 → GPIO 17 → Hà Nội")
    print("- Button 2 → GPIO 27 → Đà Nẵng")
    print("- Button 3 → GPIO 22 → TP.HCM")
    print("\nPress Ctrl+C to exit\n")
    
    last_state = {17: 0, 27: 0, 22: 0}
    
    try:
        while True:
            for pin, city in PINS.items():
                current = GPIO.input(pin)
                if current == 1 and last_state[pin] == 0:
                    print(f"✓ GPIO {pin} pressed → {city}")
                last_state[pin] = current
            time.sleep(0.05)  # 50ms polling
            
    except KeyboardInterrupt:
        print("\n\nTest completed!")
        cleanup()

def cleanup():
    """Clean up GPIO"""
    GPIO.cleanup()
    print("GPIO cleaned up. Goodbye!")

if __name__ == "__main__":
    try:
        setup_gpio()
        test_loop()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nMake sure you:")
        print("1. Run this on Raspberry Pi")
        print("2. Have RPi.GPIO installed: sudo apt-get install python3-rpi.gpio")
        print("3. Have proper permissions: sudo usermod -a -G gpio $USER")
        cleanup()

