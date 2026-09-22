#!/usr/bin/env node
// Simple GPIO test without Electron

console.log('Testing GPIO with onoff module...\n');

try {
  const Gpio = require('onoff').Gpio;
  
  console.log('Step 1: Creating GPIO 17 as input...');
  const gpio17 = new Gpio(17, 'in');
  console.log('✓ GPIO 17 created successfully');
  
  console.log('\nStep 2: Reading GPIO 17 value...');
  const value = gpio17.readSync();
  console.log(`✓ GPIO 17 value: ${value}`);
  
  console.log('\nStep 3: Cleaning up...');
  gpio17.unexport();
  console.log('✓ GPIO 17 unexported');
  
  console.log('\n✓ All tests passed! GPIO is working.');
  console.log('\nNow try: npm start');
  
} catch (err) {
  console.error('\n✗ GPIO test failed!');
  console.error('Error:', err.message);
  console.error('Code:', err.code);
  console.error('\nPossible solutions:');
  console.error('1. Run with sudo: sudo node test_gpio_simple.js');
  console.error('2. Fix permissions: sudo chmod 666 /dev/gpiomem');
  console.error('3. Check if GPIO is available: ls -l /sys/class/gpio/');
  console.error('4. Enable GPIO in raspi-config');
  process.exit(1);
}


