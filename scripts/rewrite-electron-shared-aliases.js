#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const isDryRun = process.argv.includes('--dry-run');
const distRoot = path.resolve(__dirname, '..', 'dist-electron');
const aliasPrefix = '@shared/';
const aliasPattern = /(['"])@shared\/([^'"]+)\1/g;

if (!fs.existsSync(distRoot)) {
  console.warn('[rewrite-electron-shared-aliases] dist-electron not found; skipping rewrite.');
  process.exit(0);
}

/**
 * Recursively collect files we want to inspect beneath dist-electron.
 * We only need to mutate JS bundles that Electron actually executes.
 */
const targetExtensions = new Set(['.js', '.cjs', '.mjs']);
const filesToProcess = [];

const walk = dir => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath);
    } else if (entry.isFile() && targetExtensions.has(path.extname(entry.name))) {
      filesToProcess.push(entryPath);
    }
  }
};

walk(distRoot);

let replacements = 0;

for (const file of filesToProcess) {
  const original = fs.readFileSync(file, 'utf8');
  let mutated = original;

  mutated = mutated.replace(aliasPattern, (match, quote, relativeFragment) => {
    const targetPath = path.join(distRoot, 'shared', relativeFragment);
    let replacementPath = path.relative(path.dirname(file), targetPath).replace(/\\/g, '/');

    if (!replacementPath.startsWith('.')) {
      replacementPath = `./${replacementPath}`;
    }

    replacements += 1;

    if (isDryRun) {
      console.log(`[dry-run] ${path.relative(distRoot, file)} -> ${replacementPath}`);
      return match;
    }

    return `${quote}${replacementPath}${quote}`;
  });

  if (!isDryRun && mutated !== original) {
    fs.writeFileSync(file, mutated, 'utf8');
  }
}

if (replacements === 0) {
  console.log('[rewrite-electron-shared-aliases] No @shared imports found.');
} else {
  const plural = replacements === 1 ? '' : 's';
  const action = isDryRun ? 'Would rewrite' : 'Rewrote';
  console.log(`[rewrite-electron-shared-aliases] ${action} ${replacements} @shared import${plural}.`);
}
