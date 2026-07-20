import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { bumpVersion, categorizeCommit, prepareRelease } from './prepare-release.mjs';

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function repository() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'simplecrm-release-'));
  git(cwd, 'init', '-q');
  git(cwd, 'config', 'user.name', 'Release Test');
  git(cwd, 'config', 'user.email', 'release@example.com');
  fs.writeFileSync(path.join(cwd, 'package.json'), '{\n  "version": "1.2.3"\n}\n');
  fs.writeFileSync(path.join(cwd, 'CHANGELOG.md'), '# Changelog\n\nExisting notes.\n');
  git(cwd, 'add', '.');
  git(cwd, 'commit', '-qm', 'chore: initial release');
  git(cwd, 'tag', 'v1.2.3');
  return cwd;
}

function commit(cwd, subject) {
  fs.appendFileSync(path.join(cwd, 'work.txt'), `${subject}\n`);
  git(cwd, 'add', '.');
  git(cwd, 'commit', '-qm', subject);
}

test('bumps stable semantic versions', () => {
  assert.equal(bumpVersion('1.2.3', 'patch'), '1.2.4');
  assert.equal(bumpVersion('1.2.3', 'minor'), '1.3.0');
  assert.equal(bumpVersion('1.2.3', 'major'), '2.0.0');
  assert.throws(() => bumpVersion('1.2.3-beta', 'patch'));
});

test('categorizes conventional and fallback commits', () => {
  assert.equal(categorizeCommit('feat(ui)!: add dashboard').category, 'Added');
  assert.equal(categorizeCommit('fix: stop crash').category, 'Fixed');
  assert.equal(categorizeCommit('refactor(db): simplify').category, 'Changed');
  assert.equal(categorizeCommit('A useful plain subject').category, 'Other');
});

test('updates package and changelog from commits', () => {
  const cwd = repository();
  commit(cwd, 'feat(ui)!: add dashboard');
  commit(cwd, 'fix: stop crash');
  commit(cwd, 'A useful plain subject');
  assert.equal(prepareRelease({ cwd, releaseType: 'minor', notesFile: 'notes.md' }), '1.3.0');
  assert.equal(JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'))).version, '1.3.0');
  const changelog = fs.readFileSync(path.join(cwd, 'CHANGELOG.md'), 'utf8');
  assert.match(changelog, /## \[1\.3\.0\]/);
  assert.match(changelog, /### Added[\s\S]*feat\(ui\)!: add dashboard/);
  assert.match(changelog, /### Fixed[\s\S]*fix: stop crash/);
  assert.match(changelog, /### Other[\s\S]*A useful plain subject/);
});

test('fails on empty ranges and mismatched version tags', () => {
  const empty = repository();
  assert.throws(() => prepareRelease({ cwd: empty, releaseType: 'patch' }), /no releasable commits/);
  const mismatch = repository();
  commit(mismatch, 'fix: useful change');
  const pkg = JSON.parse(fs.readFileSync(path.join(mismatch, 'package.json')));
  pkg.version = '1.2.2';
  fs.writeFileSync(path.join(mismatch, 'package.json'), JSON.stringify(pkg));
  assert.throws(() => prepareRelease({ cwd: mismatch, releaseType: 'patch' }), /does not match/);
});
