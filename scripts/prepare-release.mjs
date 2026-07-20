#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const RELEASE_COMMIT_RE = /^chore\(release\): v\d+\.\d+\.\d+$/i;

export function bumpVersion(version, releaseType) {
  const match = VERSION_RE.exec(version);
  if (!match) throw new Error(`package.json contains an invalid stable version: ${version}`);
  const [, majorText, minorText, patchText] = match;
  let major = Number(majorText);
  let minor = Number(minorText);
  let patch = Number(patchText);

  if (releaseType === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (releaseType === 'minor') {
    minor += 1;
    patch = 0;
  } else if (releaseType === 'patch') {
    patch += 1;
  } else {
    throw new Error(`release type must be patch, minor, or major; received: ${releaseType}`);
  }

  return `${major}.${minor}.${patch}`;
}

export function categorizeCommit(subject) {
  const match = /^(feat|fix|perf|refactor|docs|test|build|ci|chore|revert)(?:\([^)]+\))?(!)?:\s+(.+)$/i.exec(subject);
  if (!match) return { category: 'Other', subject };
  const type = match[1].toLowerCase();
  const category = type === 'feat' ? 'Added' : type === 'fix' ? 'Fixed' : 'Changed';
  return { category, subject };
}

export function createChangelogEntry(version, date, subjects) {
  const groups = new Map(['Added', 'Fixed', 'Changed', 'Other'].map((name) => [name, []]));
  for (const subject of subjects) {
    const item = categorizeCommit(subject);
    groups.get(item.category).push(item.subject);
  }

  const sections = [];
  for (const [name, items] of groups) {
    if (items.length) sections.push(`### ${name}\n${items.map((item) => `- ${item}`).join('\n')}`);
  }
  return `## [${version}] - ${date}\n\n${sections.join('\n\n')}`;
}

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

export function prepareRelease({ cwd = process.cwd(), releaseType, notesFile }) {
  const packagePath = path.join(cwd, 'package.json');
  const changelogPath = path.join(cwd, 'CHANGELOG.md');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const currentVersion = packageJson.version;
  const currentTag = `v${currentVersion}`;
  const latestTag = git(cwd, ['describe', '--tags', '--abbrev=0']);
  if (latestTag !== currentTag) {
    throw new Error(`latest tag ${latestTag} does not match package.json version ${currentTag}`);
  }

  const nextVersion = bumpVersion(currentVersion, releaseType);
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  if (new RegExp(`^## \\[${nextVersion.replaceAll('.', '\\.')}\\]`, 'm').test(changelog)) {
    throw new Error(`CHANGELOG.md already contains version ${nextVersion}`);
  }
  if (git(cwd, ['tag', '--list', `v${nextVersion}`]) === `v${nextVersion}`) {
    throw new Error(`tag v${nextVersion} already exists`);
  }

  const subjects = git(cwd, ['log', '--no-merges', '--format=%s', `${currentTag}..HEAD`])
    .split('\n')
    .map((subject) => subject.trim())
    .filter((subject) => subject && !RELEASE_COMMIT_RE.test(subject));
  if (!subjects.length) throw new Error(`no releasable commits found after ${currentTag}`);

  const date = new Date().toISOString().slice(0, 10);
  const entry = createChangelogEntry(nextVersion, date, subjects);
  packageJson.version = nextVersion;
  fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  fs.writeFileSync(changelogPath, changelog.replace(/^# Changelog\s*/, `# Changelog\n\n${entry}\n\n`));
  if (notesFile) fs.writeFileSync(path.resolve(cwd, notesFile), `${entry.split('\n').slice(2).join('\n').trim()}\n`);
  return nextVersion;
}

function parseArgs(argv) {
  const [releaseType, ...rest] = argv;
  const notesIndex = rest.indexOf('--notes-file');
  return { releaseType, notesFile: notesIndex >= 0 ? rest[notesIndex + 1] : undefined };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const nextVersion = prepareRelease(parseArgs(process.argv.slice(2)));
    process.stdout.write(`${nextVersion}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
