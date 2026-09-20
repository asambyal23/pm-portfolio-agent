#!/usr/bin/env node
/**
 * Deploy wrapper: project name comes from env, not hardcoded personal URL.
 *   CLOUDFLARE_PROJECT_NAME=ankush-kumar npm run deploy   # a live site
 *   npm run deploy                                        # default: pm-portfolio
 *
 * Runs preflight.mjs with the SAME args first (staleness + profile/asset gate),
 * then forwards only real `wrangler pages deploy` flags. Our own --profile,
 * --dry-run and --allow-stale never reach wrangler — wrangler's global --profile
 * means an AUTH profile, so forwarding a file path there would break auth.
 * Unknown flags are rejected so typos like --brancch never reach wrangler silently.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

const project = (process.env.CLOUDFLARE_PROJECT_NAME || 'pm-portfolio').trim() || 'pm-portfolio';
const raw = process.argv.slice(2);
// Real `wrangler pages deploy` flags (Cloudflare docs, 2026) + our own --dry-run.
// There is no --json for `pages deploy` (only `pages deployment list` has it).
const VALUE_FLAGS = new Set(['--profile', '--branch', '--commit-hash', '--commit-message']);
const BOOL_FLAGS = new Set(['--commit-dirty', '--skip-caching', '--no-bundle', '--upload-source-maps', '--dry-run']);
const allowStale = raw.includes('--allow-stale');

let profileArgs = [];
const passthrough = [];
for (let i = 0; i < raw.length; i++) {
  const a = raw[i];
  if (a === '--allow-stale' || !a.startsWith('--')) continue; // stray positionals are ignored
  const name = a.split('=')[0];
  if (!VALUE_FLAGS.has(name) && !BOOL_FLAGS.has(name)) {
    console.error(`✖ unknown deploy flag: ${a}`);
    console.error('  allowed: --profile <file>, --branch <name>, --commit-hash <sha>, --commit-message <msg>,');
    console.error('           --commit-dirty, --skip-caching, --no-bundle, --upload-source-maps, --dry-run, --allow-stale');
    process.exit(1);
  }
  const inline = a.includes('=');
  const value = inline ? a.slice(a.indexOf('=') + 1) : raw[i + 1];
  if (VALUE_FLAGS.has(name) && !inline && (!value || value.startsWith('--'))) {
    console.error(`✖ ${name} needs a value, e.g. ${name} main`);
    process.exit(1);
  }
  if (name === '--profile') {
    profileArgs = ['--profile', value]; // preflight-only: never forwarded to wrangler
    if (!inline) i += 1;
    continue;
  }
  if (name === '--dry-run') continue; // ours
  passthrough.push(a);
  if (VALUE_FLAGS.has(name) && !inline) {
    passthrough.push(value);
    i += 1;
  }
}

// Gate first: refuse a stale dist/ (profile or assets changed since build).
const pf = spawnSync('node', [join(root, 'preflight.mjs'), ...profileArgs, ...(allowStale ? ['--allow-stale'] : [])], {
  cwd: root,
  stdio: 'inherit',
});
if (pf.status !== 0) process.exit(pf.status ?? 1);

const DRY = raw.includes('--dry-run');
const args = ['wrangler', 'pages', 'deploy', 'dist', `--project-name=${project}`, ...passthrough];
console.log(`→ ${DRY ? '[dry-run] would deploy' : 'deploying'} dist/ to Cloudflare Pages project "${project}"`);
if (DRY) {
  console.log('  npx ' + args.join(' '));
  process.exit(0);
}
const r = spawnSync('npx', args, { stdio: 'inherit', shell: false });
process.exit(r.status ?? 1);
