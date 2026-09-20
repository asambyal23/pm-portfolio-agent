#!/usr/bin/env node
/**
 * Preflight for `npm run deploy`: refuse to publish a stale dist/.
 * Standalone (no build import — build.mjs always emits dist/ as a side effect,
 * so importing it would rebuild). Mirrors build.mjs resolution: --profile flag,
 * else profile.json, else the bundled example. Also verifies dist/ was built
 * from the same file. Bypass staleness once with: npm run deploy -- --allow-stale
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const allowStale = argv.includes('--allow-stale');
const flagProfile = (() => {
  const i = argv.indexOf('--profile');
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
})();
const profilePath = flagProfile
  ? (flagProfile.startsWith('/') ? flagProfile : join(root, flagProfile))
  : existsSync(join(root, 'profile.json'))
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
const builtName = meta.profile || '(unknown)';
const wantName = profilePath.split('/').slice(-1)[0];
if (builtName !== wantName) fail(`dist/ was built from ${builtName}, but deploy targets ${wantName}. Rebuild with the same --profile.`);
if (!existsSync(profilePath)) fail(`profile not found: ${profilePath}`);
const current = createHash('sha256').update(readFileSync(profilePath)).digest('hex');
if (!allowStale && meta.profileSha256 !== current) {
  fail(`dist/ is stale (meta ${String(meta.profileSha256).slice(0, 12)}… vs current ${current.slice(0, 12)}…).`);
}
console.log(`✔ deploy preflight: dist/ matches ${wantName} (built ${meta.builtAt}).`);
