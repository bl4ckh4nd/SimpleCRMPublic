#!/usr/bin/env node
// Patches better-sqlite3 for Electron 41+ compatibility.
// v12.7.1 upstream used Holder() but Electron 41's V8 only exposes HolderV2().
const fs = require('fs');
const path = require('path');

// Locate the package — path differs between npm and pnpm installs
function findPackageDir() {
  const candidates = [
    path.join(__dirname, '../node_modules/better-sqlite3'),
    // pnpm content-addressable store path (glob not available here, try known suffix)
    ...require('fs')
      .readdirSync(path.join(__dirname, '../node_modules/.pnpm'), { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name.startsWith('better-sqlite3@'))
      .map(e => path.join(__dirname, '../node_modules/.pnpm', e.name, 'node_modules/better-sqlite3')),
  ];
  return candidates.find(p => fs.existsSync(path.join(p, 'src')));
}

const pkgDir = findPackageDir();
if (!pkgDir) {
  console.warn('patch-better-sqlite3: package directory not found, skipping.');
  process.exit(0);
}

const files = [
  {
    file: path.join(pkgDir, 'src/objects/database.cpp'),
    replacements: [['info.Holder()', 'info.HolderV2()']],
  },
  {
    file: path.join(pkgDir, 'src/objects/statement.cpp'),
    replacements: [['info.Holder()', 'info.HolderV2()']],
  },
];

let patched = 0;
for (const { file, replacements } of files) {
  if (!fs.existsSync(file)) {
    console.warn(`patch-better-sqlite3: skipping (not found): ${file}`);
    continue;
  }
  let content = fs.readFileSync(file, 'utf8');
  for (const [from, to] of replacements) {
    const count = (content.match(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (count > 0) {
      content = content.replaceAll(from, to);
      patched += count;
    }
  }
  fs.writeFileSync(file, content);
}
console.log(`patch-better-sqlite3: applied ${patched} replacement(s) in ${pkgDir}`);
