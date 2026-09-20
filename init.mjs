#!/usr/bin/env node
/**
 * Make this repo yours:  npm run init
 *
 * Copies the starter profile + placeholder assets into place so a fresh clone
 * builds and previews before you have written a single line of your own.
 *
 *   npm run init                 scaffold profile.json + assets/my-cv.pdf + my-photo.png
 *   npm run init -- --force      overwrite an existing profile.json / placeholders
 *   npm run init -- --clean      also remove the bundled author's personal content
 *                                (CV, photo, artifact page) so nothing of theirs ships
 *   npm run init -- --root DIR   scaffold into another directory (used by tests)
 *
 * Nothing here is destructive without --force/--clean, and every removal is printed.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const raw = process.argv.slice(2);

if (raw.includes('--help') || raw.includes('-h')) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*/, '').replace(/^ \* ?/gm, '').trim());
  process.exit(0);
}

const KNOWN = new Set(['--force', '--clean', '--root']);
for (let i = 0; i < raw.length; i++) {
  const a = raw[i];
  if (!a.startsWith('--')) continue;
  if (!KNOWN.has(a.split('=')[0])) {
    console.error(`✖ unknown init flag: ${a} (allowed: --force, --clean, --root <dir>)`);
    process.exit(1);
  }
  if (a === '--root' && (!raw[i + 1] || raw[i + 1].startsWith('--'))) {
    console.error('✖ --root needs a directory, e.g. --root /tmp/mysite');
    process.exit(1);
  }
  if (a.startsWith('--root=') && !a.slice('--root='.length)) {
    console.error('✖ --root needs a directory, e.g. --root /tmp/mysite');
    process.exit(1);
  }
}
// Accept both `--root DIR` and `--root=DIR` (the old code silently scaffolded into
// the repo itself when given the inline form).
const inlineRoot = raw.find((a) => a.startsWith('--root='));
const idx = raw.findIndex((a) => a === '--root');
const root = resolve(inlineRoot ? inlineRoot.slice('--root='.length) : idx === -1 ? here : raw[idx + 1]);
const force = raw.includes('--force');
const clean = raw.includes('--clean');

const starterDir = join(here, 'starter');
const need = ['profile.starter.json', 'my-cv.pdf', 'my-photo.png'];
for (const f of need) {
  if (!existsSync(join(starterDir, f))) {
    console.error(`✖ starter/${f} is missing — this repo is incomplete. Re-clone it or restore starter/.`);
    process.exit(1);
  }
}

const targetProfile = join(root, 'profile.json');
const targetAssets = join(root, 'assets');
const removals = [];

if (existsSync(targetProfile) && !force && !clean) {
  console.error('✖ profile.json already exists — refusing to overwrite someone else\'s content.');
  console.error('  - New here? Start your own:  npm run init -- --clean      (replaces it + removes the bundled author assets)');
  console.error('  - Starting over?             npm run init -- --force      (replaces it, keeps assets)');
  console.error('  - Keeping your file?         npm run validate             (edit profile.json directly)');
  process.exit(1);
}

mkdirSync(targetAssets, { recursive: true });
copyFileSync(join(starterDir, 'profile.starter.json'), targetProfile);
console.log(`✔ wrote profile.json (starter content — every TODO is yours to replace)`);

const assets = [
  ['my-cv.pdf', 'CV'],
  ['my-photo.png', 'profile photo'],
];
for (const [file, label] of assets) {
  const dest = join(targetAssets, file);
  if (existsSync(dest) && !force) {
    console.log(`• kept assets/${file} (already there) — delete it or rerun with --force to reset the placeholder`);
    continue;
  }
  copyFileSync(join(starterDir, file), dest);
  console.log(`✔ wrote assets/${file} — placeholder ${label}, replace with your real one`);
}

if (clean) {
  // The bundled author's personal content. Removed only when asked, one by one.
  for (const f of ['Ankush_Kumar_CV.pdf', 'profile.jpg', 'eval-rubric.html']) {
    const p = join(targetAssets, f);
    if (existsSync(p) && statSync(p).isFile()) {
      rmSync(p);
      removals.push(`assets/${f}`);
    }
  }
  if (removals.length) console.log(`✔ --clean removed bundled author content: ${removals.join(', ')}`);
  else console.log('• --clean found no bundled author assets to remove');
}

// The old dist/ + provenance stamp belong to the previous profile: clear them so
// nothing stale can be previewed or deployed against your new content.
for (const f of ['dist', '.build-meta.json']) {
  const p = join(root, f);
  if (existsSync(p)) {
    rmSync(p, { recursive: true, force: true });
    removals.push(f);
  }
}
if (removals.length) console.log(`✔ cleared generated output: ${removals.filter((r) => r === 'dist' || r === '.build-meta.json').join(', ')}`);

console.log(`
Next steps
  1. Replace the two required inputs (your real files):
       cp ~/Downloads/Your_CV.pdf        assets/my-cv.pdf
       cp ~/Downloads/your-photo.jpg     assets/my-photo.png     # jpg/png both fine
     Then keep site.cv / site.photo in profile.json pointing at the filenames you used.
  2. Fill in profile.json — every TODO. Or hand it to an AI agent with SKILL.md + prompts/.
  3. Check + preview:
       npm run validate      # flags leftover TODOs and weak bullets
       npm run dev           # http://localhost:8000
  4. Publish (manual step — git push never publishes):
       CLOUDFLARE_PROJECT_NAME=<your-project> npm run deploy
     or drag dist/ into the Cloudflare dashboard. See wiki/Deployment.md.

Preview note: placeholder content still builds on purpose so you can see the design —
but the validator warns until the TODOs are gone, and you should not deploy until they are.`);
process.exit(0);
