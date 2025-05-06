const fs = require('fs');
const path = require('path');

// This script prepares the Vite app for Electron build
console.log('Preparing Vite app for Electron build...');

// Ensure the dist directory exists
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
  console.log('✅ Created dist directory');
}

// Copy electron files to dist
const electronFiles = ['main.js', 'preload.js'];
electronFiles.forEach(file => {
  const sourcePath = path.join(__dirname, 'electron', file);
  const destPath = path.join(distPath, 'electron', file);
  
  if (fs.existsSync(sourcePath)) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ Copied ${file} to dist/electron`);
  }
});

console.log('✅ Vite app is ready for Electron build');
