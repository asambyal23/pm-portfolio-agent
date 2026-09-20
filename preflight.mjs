#!/usr/bin/env node
/**
 * Preflight for `npm run deploy`: refuse to publish a stale dist/.
 * Rebuilds the expected profile hash and compares it with dist/.build-meta.json.
 * Bypass only with:  npm run deploy -- --allow-stale
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const allowStale = process.argv.includes('--allow-stale');
const profilePath = existsSync(join(root, 'profile.json'))
  ? join(root, 'profile.json')
  : join(root, 'examples', 'ankush-profile.json');
const metaPath = join(root, 'dist', '.build-meta.json');

const fail = (msg) => {
  console.error(`✖ deploy preflight: ${msg}`);
  console.error('  Run `npm run build` first, or bypass once with `npm run deploy -- --allow-stale`.');
  process.exit(1);
};

if (!existsSync(join(root, 'dist', 'index.html'))) fail('dist/index.html missing.');
if (!existsSync(metaPath)) fail('dist/.build-meta.json missing (dist predates provenance stamps).');
let meta;
try {
  meta = JSON.parse(readFileSync(metaPath, 'utf8'));
} catch {
  fail('dist/.build-meta.json is not valid JSON.');
}
const current = createHash('sha256').update(readFileSync(profilePath)).digest('hex');
if (!allowStale && meta.profileSha256 !== current) {
  fail(`dist/ was built from a different profile (meta ${String(meta.profileSha256).slice(0, 12)}… vs current ${current.slice(0, 12)}…).`);
}
console.log(`✔ deploy preflight: dist/ matches ${profilePath.split('/').slice(-1)[0]} (built ${meta.builtAt}).`);
