const fs = require('fs');
const path = require('path');

// This script cleans up after the Electron build
console.log('Cleaning up after Electron build...');

// Clean up temporary build files and directories
const cleanupPaths = [
  path.join(__dirname, 'dist', 'electron'),
  path.join(__dirname, '.vite')
];

cleanupPaths.forEach(path => {
  if (fs.existsSync(path)) {
    fs.rmSync(path, { recursive: true, force: true });
    console.log(`✅ Removed ${path}`);
  }
});

console.log('✅ Cleanup completed');
