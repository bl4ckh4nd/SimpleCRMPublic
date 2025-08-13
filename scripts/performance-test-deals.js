#!/usr/bin/env node

/**
 * Performance Test for Deals Page
 * 
 * This script tests the performance of the deals page with a real database
 * containing 30,000 customers to identify UI freezing and performance issues.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🚀 Starting Deals Page Performance Test\n');

// Configuration
const TEST_CONFIG = {
  targetLoadTime: 2000, // 2 seconds max acceptable load time
  customerCount: 30000,
  testIterations: 3,
  outputFile: path.join(__dirname, 'performance-results.json')
};

// Test results storage
let testResults = {
  timestamp: new Date().toISOString(),
  config: TEST_CONFIG,
  results: []
};

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
 * Check if the application is running
 */
function isAppRunning() {
  try {
    // Try to ping the electron app (you might need to adjust this based on your setup)
    // For now, we'll check if the dist-electron directory exists and is built
    const distElectron = path.join(__dirname, '..', 'dist-electron');
    return fs.existsSync(distElectron) && fs.existsSync(path.join(distElectron, 'main.js'));
  } catch (error) {
    return false;
  }
}

/**
 * Get the correct npm command for the platform
 */
function getNpmCommand() {
  return os.platform() === 'win32' ? 'npm.cmd' : 'npm';
}

/**
 * Build the application if needed
 */
function buildApp() {
  log('Building application...', 'info');
  try {
    const npmCmd = getNpmCommand();
    execSync(`${npmCmd} run build && ${npmCmd} run build:electron`, { 
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: true
    });
    log('Application built successfully', 'success');
  } catch (error) {
    log(`Build failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

/**
 * Start performance monitoring
 */
async function startPerformanceMonitoring() {
  log('Starting performance monitoring...', 'performance');
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    let logBuffer = [];
    
    // Start the electron app
    const npmCmd = getNpmCommand();
    const electronApp = spawn(npmCmd, ['run', 'electron:start'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
      shell: true
    });
    
    let dealsPageLoadTime = null;
    let isDealsPageLoaded = false;
    let customerLoadCalls = [];
    let totalCustomersLoaded = 0;
    
    // Monitor stdout for performance logs
    electronApp.stdout.on('data', (data) => {
      const output = data.toString();
      logBuffer.push(output);
      
      // Check for deals page related logs
      if (output.includes('deals:get-all')) {
        log('📊 Deals data loading detected', 'performance');
      }
      
      // Check for customer loading (the expensive operation)
      if (output.includes('db:get-customers')) {
        const includesCustomFields = output.includes('includeCustomFields=true');
        customerLoadCalls.push({
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
      
      // Check for customer count in logs
      const customerCountMatch = output.match(/returning (\d+) customers/);
      if (customerCountMatch) {
        totalCustomersLoaded = parseInt(customerCountMatch[1]);
        log(`📈 Loaded ${totalCustomersLoaded} customers`, 'performance');
      }
      
      // Check if deals page is fully loaded (look for specific log patterns)
      if (output.includes('Deals konnten nicht geladen werden') || 
          output.includes('deals.length') ||
          output.includes('Deal-Pipeline')) {
        if (!isDealsPageLoaded) {
          dealsPageLoadTime = Date.now() - startTime;
          isDealsPageLoaded = true;
          log(`📊 Deals page loaded in ${dealsPageLoadTime}ms`, 'performance');
          
          // Give it a moment to settle then kill the process
          setTimeout(() => {
            electronApp.kill('SIGINT');
          }, 2000);
        }
      }
    });
    
    electronApp.stderr.on('data', (data) => {
      const output = data.toString();
      logBuffer.push(`STDERR: ${output}`);
      
      // Check for errors
      if (output.includes('Error') || output.includes('Failed')) {
        log(`❌ Error detected: ${output.trim()}`, 'error');
      }
    });
    
    electronApp.on('close', (code) => {
      log(`Electron app closed with code ${code}`, code === 0 ? 'success' : 'error');
      
      const testResult = {
        iteration: testResults.results.length + 1,
        loadTime: dealsPageLoadTime,
        customerLoadCalls: customerLoadCalls,
        totalCustomersLoaded: totalCustomersLoaded,
        isWithinTarget: dealsPageLoadTime <= TEST_CONFIG.targetLoadTime,
        fullLog: logBuffer.join('\n')
      };
      
      testResults.results.push(testResult);
      resolve(testResult);
    });
    
    // Set a timeout to prevent hanging
    setTimeout(() => {
      log('Test timeout reached, killing process...', 'warning');
      electronApp.kill('SIGKILL');
      resolve({
        iteration: testResults.results.length + 1,
        loadTime: null,
        error: 'Timeout',
        customerLoadCalls: customerLoadCalls,
        totalCustomersLoaded: totalCustomersLoaded,
        isWithinTarget: false
      });
    }, 30000); // 30 second timeout
  });
}

/**
 * Run the performance test
 */
async function runPerformanceTest() {
  log('🔧 Checking application build status...', 'info');
  
  if (!isAppRunning()) {
    log('Application not built, building now...', 'warning');
    buildApp();
  } else {
    log('Application build found', 'success');
  }
  
  // Run multiple test iterations
  for (let i = 1; i <= TEST_CONFIG.testIterations; i++) {
    log(`\n🧪 Running test iteration ${i}/${TEST_CONFIG.testIterations}`, 'info');
    
    try {
      const result = await startPerformanceMonitoring();
      
      if (result.loadTime) {
        const status = result.isWithinTarget ? 'success' : 'warning';
        log(`Test ${i} completed: ${result.loadTime}ms (Target: ${TEST_CONFIG.targetLoadTime}ms)`, status);
        
        if (result.customerLoadCalls.length > 0) {
          log(`Customer load calls detected: ${result.customerLoadCalls.length}`, 'info');
          result.customerLoadCalls.forEach((call, idx) => {
            const type = call.includeCustomFields ? 'EXPENSIVE' : 'OPTIMIZED';
            log(`  ${idx + 1}. ${type} call at ${call.timestamp}ms`, call.includeCustomFields ? 'warning' : 'success');
          });
        }
        
        if (result.totalCustomersLoaded > 0) {
          log(`Total customers loaded: ${result.totalCustomersLoaded}`, 'performance');
        }
      } else {
        log(`Test ${i} failed: ${result.error || 'Unknown error'}`, 'error');
      }
      
      // Wait between iterations
      if (i < TEST_CONFIG.testIterations) {
        log('Waiting 3 seconds before next iteration...', 'info');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      log(`Test ${i} error: ${error.message}`, 'error');
    }
  }
}

/**
 * Generate performance report
 */
function generateReport() {
  log('\n📊 Generating Performance Report', 'info');
  
  const successfulTests = testResults.results.filter(r => r.loadTime !== null);
  const failedTests = testResults.results.filter(r => r.loadTime === null);
  
  if (successfulTests.length === 0) {
    log('❌ All tests failed - no performance data available', 'error');
    return;
  }
  
  const avgLoadTime = successfulTests.reduce((sum, r) => sum + r.loadTime, 0) / successfulTests.length;
  const minLoadTime = Math.min(...successfulTests.map(r => r.loadTime));
  const maxLoadTime = Math.max(...successfulTests.map(r => r.loadTime));
  
  const expensiveCallsTotal = testResults.results.reduce((sum, r) => 
    sum + r.customerLoadCalls.filter(call => call.includeCustomFields).length, 0);
  const optimizedCallsTotal = testResults.results.reduce((sum, r) => 
    sum + r.customerLoadCalls.filter(call => !call.includeCustomFields).length, 0);
  
  const maxCustomersLoaded = Math.max(...testResults.results.map(r => r.totalCustomersLoaded || 0));
  
  log('\n📈 Performance Summary:', 'performance');
  log(`  • Successful tests: ${successfulTests.length}/${TEST_CONFIG.testIterations}`, 'info');
  log(`  • Failed tests: ${failedTests.length}/${TEST_CONFIG.testIterations}`, failedTests.length > 0 ? 'warning' : 'info');
  log(`  • Average load time: ${Math.round(avgLoadTime)}ms`, avgLoadTime <= TEST_CONFIG.targetLoadTime ? 'success' : 'warning');
  log(`  • Min load time: ${minLoadTime}ms`, 'info');
  log(`  • Max load time: ${maxLoadTime}ms`, 'info');
  log(`  • Target load time: ${TEST_CONFIG.targetLoadTime}ms`, 'info');
  log(`  • Performance target met: ${avgLoadTime <= TEST_CONFIG.targetLoadTime ? 'YES' : 'NO'}`, avgLoadTime <= TEST_CONFIG.targetLoadTime ? 'success' : 'error');
  
  log('\n🔍 Customer Loading Analysis:', 'performance');
  log(`  • Expensive customer calls (with custom fields): ${expensiveCallsTotal}`, expensiveCallsTotal > 0 ? 'error' : 'success');
  log(`  • Optimized customer calls (without custom fields): ${optimizedCallsTotal}`, 'info');
  log(`  • Max customers loaded in one call: ${maxCustomersLoaded}`, maxCustomersLoaded > 1000 ? 'warning' : 'success');
  
  // Performance verdict
  log('\n🏆 Performance Verdict:', 'performance');
  if (expensiveCallsTotal > 0) {
    log('❌ PERFORMANCE ISSUE DETECTED: Expensive customer loading with custom fields found!', 'error');
    log('   Recommendation: Fix the expensive customer loading calls', 'warning');
  } else if (avgLoadTime > TEST_CONFIG.targetLoadTime) {
    log('⚠️  SLOW LOADING: Deals page loads slower than target', 'warning');
    log('   Recommendation: Optimize loading performance', 'warning');
  } else {
    log('✅ PERFORMANCE GOOD: Deals page meets performance targets', 'success');
  }
  
  // Save results to file
  fs.writeFileSync(TEST_CONFIG.outputFile, JSON.stringify(testResults, null, 2));
  log(`\n💾 Full results saved to: ${TEST_CONFIG.outputFile}`, 'info');
}

/**
 * Main execution
 */
async function main() {
  try {
    await runPerformanceTest();
    generateReport();
  } catch (error) {
    log(`Test suite failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { runPerformanceTest, generateReport };