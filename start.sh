#!/bin/bash
# Start script for Dashboard Geography on Raspberry Pi

echo "Starting Dashboard Geography..."
echo "GPIO Mode: Enabled"

# Change to script directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Dependencies not found. Installing..."
    npm install
fi

# Check if config.json exists
if [ ! -f "config.json" ]; then
    echo "Config file not found. Creating from example..."
    cp config.example.json config.json
    echo "Please edit config.json if needed."
fi

# Check GPIO permissions
if [ ! -r /dev/gpiomem ]; then
    echo "Warning: No GPIO access. You may need to run with sudo or add user to gpio group."
    echo "Run: sudo usermod -a -G gpio $USER"
fi

# Start the application
echo "Launching Electron app..."
npm start


