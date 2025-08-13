#!/usr/bin/env node

/**
 * Simple Performance Test for Deals Page (Windows Compatible)
 * 
 * This script tests the performance by starting the Electron app directly
 * and monitoring console output for performance issues.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🚀 Starting Simple Deals Page Performance Test\n');

/**
 * Log with timestamp
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    'info': '📋',
    'success': '✅',
    'warning': '⚠️',
    'error': '❌',
    'performance': '⏱️'
  }[type] || '📋';
  
  console.log(`${prefix} [${timestamp.split('T')[1].slice(0,8)}] ${message}`);
}

/**
 * Check if the app is built
 */
function isAppBuilt() {
  const distElectron = path.join(__dirname, '..', 'dist-electron', 'main.js');
  return fs.existsSync(distElectron);
}

/**
 * Start the app and monitor performance
 */
async function runPerformanceTest() {
  if (!isAppBuilt()) {
    log('❌ Application not built. Please run: npm run build && npm run build:electron', 'error');
    process.exit(1);
  }

  log('✅ Application build found', 'success');
  log('🔧 Starting Electron app for performance monitoring...', 'info');

  const electronPath = path.join(__dirname, '..', 'node_modules', '.bin', 'electron');
  const mainPath = path.join(__dirname, '..', 'dist-electron', 'main.js');
  
  // Use electron directly instead of npm
  let electronCommand;
  if (os.platform() === 'win32') {
    electronCommand = path.join(__dirname, '..', 'node_modules', '.bin', 'electron.cmd');
  } else {
    electronCommand = electronPath;
  }

  log(`🚀 Starting: ${electronCommand} ${mainPath}`, 'info');
  
  const electronApp = spawn(electronCommand, [mainPath], {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe',
    env: { ...process.env, NODE_ENV: 'production' }
  });

  let startTime = Date.now();
  let performanceData = {
    dealsPageLoadTime: null,
    customerLoadCalls: [],
    totalCustomersLoaded: 0,
    logs: []
  };

  // Monitor stdout for performance indicators
  electronApp.stdout.on('data', (data) => {
    const output = data.toString();
    performanceData.logs.push(output);
    
    // Look for deals page loading
    if (output.includes('deals:get-all called')) {
      log('📊 Deals data loading detected', 'performance');
    }
    
    // Look for customer loading (expensive operation)
    if (output.includes('db:get-customers called')) {
      const includesCustomFields = output.includes('includeCustomFields=true');
      performanceData.customerLoadCalls.push({
        timestamp: Date.now() - startTime,
        includeCustomFields,
        output: output.trim()
      });
      
      if (includesCustomFields) {
        log('🚨 EXPENSIVE: Customer loading with custom fields detected!', 'warning');
      } else {
        log('✅ GOOD: Customer loading without custom fields', 'success');
      }
    }
    
    // Check for customer count
    const customerCountMatch = output.match(/returning (\d+) customers/);
    if (customerCountMatch) {
      performanceData.totalCustomersLoaded = parseInt(customerCountMatch[1]);
      log(`📈 Loaded ${performanceData.totalCustomersLoaded} customers`, 'performance');
    }
    
    // Check for deals page completion
    if (output.includes('DealsPage] loadDeals() completed')) {
      const timeMatch = output.match(/completed in (\d+)ms/);
      if (timeMatch && !performanceData.dealsPageLoadTime) {
        performanceData.dealsPageLoadTime = parseInt(timeMatch[1]);
        log(`📊 Deals page loaded in ${performanceData.dealsPageLoadTime}ms`, 'performance');
        
        // Kill the app after a moment
        setTimeout(() => {
          log('🔄 Shutting down app...', 'info');
          electronApp.kill('SIGTERM');
        }, 2000);
      }
    }
  });

  electronApp.stderr.on('data', (data) => {
    const output = data.toString();
    performanceData.logs.push(`STDERR: ${output}`);
    
    if (output.includes('Error') || output.includes('Failed')) {
      log(`❌ Error detected: ${output.trim()}`, 'error');
    }
  });

  return new Promise((resolve) => {
    electronApp.on('close', (code) => {
      log(`Electron app closed with code ${code}`, code === 0 ? 'success' : 'error');
      resolve(performanceData);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      log('⏰ Test timeout reached, killing process...', 'warning');
      electronApp.kill('SIGKILL');
      resolve({ ...performanceData, error: 'Timeout' });
    }, 30000);
  });
}

/**
 * Generate performance report
 */
function generateReport(performanceData) {
  log('\n📊 Performance Test Results:', 'performance');
  
  if (performanceData.error) {
    log(`❌ Test failed: ${performanceData.error}`, 'error');
    return;
  }
  
  if (performanceData.dealsPageLoadTime) {
    const isGood = performanceData.dealsPageLoadTime <= 2000;
    log(`⏱️  Deals page load time: ${performanceData.dealsPageLoadTime}ms`, isGood ? 'success' : 'warning');
  } else {
    log('❌ Deals page load time: Could not measure', 'error');
  }
  
  log(`🔍 Customer load calls detected: ${performanceData.customerLoadCalls.length}`, 'info');
  
  const expensiveCalls = performanceData.customerLoadCalls.filter(call => call.includeCustomFields);
  const optimizedCalls = performanceData.customerLoadCalls.filter(call => !call.includeCustomFields);
  
  log(`🚨 Expensive calls (with custom fields): ${expensiveCalls.length}`, expensiveCalls.length > 0 ? 'error' : 'success');
  log(`✅ Optimized calls (without custom fields): ${optimizedCalls.length}`, 'info');
  
  if (performanceData.totalCustomersLoaded > 0) {
    log(`📈 Total customers loaded: ${performanceData.totalCustomersLoaded}`, performanceData.totalCustomersLoaded > 5000 ? 'warning' : 'success');
  }
  
  // Performance verdict
  log('\n🏆 Performance Verdict:', 'performance');
  if (expensiveCalls.length > 0) {
    log('❌ PERFORMANCE ISSUE: Expensive customer loading detected!', 'error');
    log('   -> Fix: Ensure all customer loading calls use includeCustomFields=false', 'warning');
    
    expensiveCalls.forEach((call, idx) => {
      log(`   ${idx + 1}. Expensive call at ${call.timestamp}ms`, 'error');
    });
  } else if (!performanceData.dealsPageLoadTime || performanceData.dealsPageLoadTime > 2000) {
    log('⚠️  SLOW LOADING: Deals page performance needs improvement', 'warning');
  } else {
    log('✅ PERFORMANCE GOOD: No issues detected', 'success');
  }
  
  // Save detailed logs
  const logFile = path.join(__dirname, 'performance-test-output.txt');
  fs.writeFileSync(logFile, performanceData.logs.join(''));
  log(`📝 Detailed logs saved to: ${logFile}`, 'info');
}

/**
 * Main execution
 */
async function main() {
  try {
    const performanceData = await runPerformanceTest();
    generateReport(performanceData);
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Instructions for user
log('📋 Instructions:', 'info');
log('  1. Make sure the app is built: npm run build && npm run build:electron', 'info');
log('  2. This test will start the Electron app and monitor performance', 'info');
log('  3. Navigate to the deals page to trigger the performance test', 'info');
log('  4. The test will automatically close after collecting data\n', 'info');

if (require.main === module) {
  main();
}