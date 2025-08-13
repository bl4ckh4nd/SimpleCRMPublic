#!/usr/bin/env node

/**
 * Quick Check for Dangerous Default Parameters
 * 
 * This script checks if the dangerous default parameters that cause
 * expensive customer loading are still present in the codebase.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking for Dangerous Default Parameters\n');

const checks = [
  {
    file: 'electron/main.js',
    pattern: /includeCustomFields\s*=\s*true/,
    description: 'IPC handler dangerous default',
    location: 'electron/main.js line ~183'
  },
  {
    file: 'src/services/data/customerService.ts',
    pattern: /includeCustomFields:\s*boolean\s*=\s*true/,
    description: 'customerService dangerous default',
    location: 'src/services/data/customerService.ts line ~10'
  },
  {
    file: 'electron/sqlite-service.ts',
    pattern: /includeCustomFields:\s*boolean\s*=\s*true/,
    description: 'SQLite service dangerous default',
    location: 'electron/sqlite-service.ts getAllCustomers function'
  }
];

let issuesFound = 0;

function checkFile(check) {
  const filePath = path.join(__dirname, '..', check.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${check.file}`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (check.pattern.test(content)) {
    console.log(`❌ DANGEROUS DEFAULT FOUND: ${check.description}`);
    console.log(`   Location: ${check.location}`);
    console.log(`   Issue: Default parameter set to 'true' will cause expensive operations\n`);
    issuesFound++;
  } else {
    console.log(`✅ SAFE: ${check.description} - default is 'false' or not found`);
  }
}

console.log('📋 Scanning codebase for dangerous default parameters...\n');

checks.forEach(checkFile);

console.log('\n📊 Summary:');
if (issuesFound > 0) {
  console.log(`❌ Found ${issuesFound} dangerous default parameter(s)`);
  console.log('⚠️  These defaults cause expensive customer loading with custom fields');
  console.log('🔧 Fix: Change all defaults from "true" to "false"\n');
  
  console.log('Quick fix commands:');
  console.log('1. In electron/main.js: Change "includeCustomFields = true" to "includeCustomFields = false"');
  console.log('2. In src/services/data/customerService.ts: Change "= true" to "= false"');
  console.log('3. In electron/sqlite-service.ts: Change "= true" to "= false"');
  
} else {
  console.log('✅ No dangerous defaults found - all parameters default to "false"');
  console.log('🎉 Good! This prevents expensive customer loading operations');
}

console.log('\n🔍 If you\'re still experiencing performance issues:');
console.log('1. Run the manual test: npm run electron:dev and check console logs');
console.log('2. Look for any direct calls to getAllCustomers(true) in your code');
console.log('3. Check if any components are explicitly passing includeCustomFields=true');

console.log('\n📖 For detailed manual testing instructions:');
console.log('   See: scripts/manual-performance-guide.md');