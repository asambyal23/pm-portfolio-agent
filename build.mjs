#!/usr/bin/env node
/**
 * PM Portfolio Agent — zero-dependency static site builder.
 *
 * Renders template/template.html with data from your profile JSON into dist/.
 * The mini template engine supports:
 *   {{path}}            escaped interpolation
 *   {{{path}}}          raw HTML interpolation (for trusted, user-authored copy)
 *   {{#each items}}…{{/each}}   loops (item fields are merged into scope)
 *   {{#if path}}…{{/if}}        renders block when value is truthy
 *   {{.}}               current loop item (when it is a plain string)
 *   {{@index}}          current loop index
 *
 * Usage:
 *   node build.mjs                        # uses ./profile.json, falls back to examples/ankush-profile.json
 *   node build.mjs --profile mydata.json  # explicit profile
 *   node build.mjs --dry                  # validate + render, but do not write dist/
 *
 * Required inputs (fail fast with a helpful message when missing):
 *   1. profile content — profile.json (or --profile <file>)
 *   2. CV file        — assets/<site.cv> (e.g. assets/Ankush_Kumar_CV.pdf)
 *   3. Profile photo  — assets/<site.photo> (e.g. assets/profile.jpg)
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  copyFileSync,
  statSync,
  rmSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

/* ---------------- CLI args ---------------- */
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
};
const hasFlag = (name) => args.includes(`--${name}`);
const dry = hasFlag('dry');

/* ---------------- Load profile ---------------- */
const profileArg = getArg('profile');
const profilePath = profileArg
  ? (profileArg.startsWith('/') ? profileArg : join(root, profileArg))
  : existsSync(join(root, 'profile.json'))
    ? join(root, 'profile.json')
    : join(root, 'examples', 'ankush-profile.json');

if (!existsSync(profilePath)) {
  console.error(`✖ Profile not found: ${profilePath}`);
  console.error('  Create profile.json in the repo root (copy examples/ankush-profile.json and edit it),');
  console.error('  or pass --profile path/to/your.json');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(readFileSync(profilePath, 'utf8'));
} catch (err) {
  console.error(`✖ Could not parse ${profilePath}: ${err.message}`);
  process.exit(1);
}

/* ---------------- Mini template engine ---------------- */
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function lookup(ctx, path) {
  if (path === '.') return ctx['.'] ?? ctx;
  if (path === '@index') return ctx['@index'];
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx);
}

const TOKEN = /\{\{\{([^}]+)\}\}\}|\{\{([^}]+)\}\}/g;

function render(tpl, ctx) {
  const TOKEN_RE = () => new RegExp(TOKEN.source, 'g');
  let out = '';
  let last = 0;
  const tokens = TOKEN_RE();
  let m;
  while ((m = tokens.exec(tpl))) {
    out += tpl.slice(last, m.index);
    if (m[1] !== undefined) {
      // raw (trusted HTML from profile data)
      const v = lookup(ctx, m[1].trim());
      out += v == null ? '' : String(v);
      last = tokens.lastIndex;
      continue;
    }
    // parse tag content: "#each expr", "/each", "expr", "."
    const raw = m[2].trim();
    let marker = '';
    let name = raw;
    let expr = '';
    if (raw.startsWith('#') || raw.startsWith('/')) {
      marker = raw[0];
      const sp = raw.slice(1).trim().split(/\s+/);
      name = sp[0];
      expr = sp.slice(1).join(' ');
    }
    if (marker === '') {
      const v = lookup(ctx, raw);
      out += v == null ? '' : escapeHtml(v);
      last = tokens.lastIndex;
      continue;
    }
    if (marker === '#') {
      if (!expr || !expr.length) throw new Error(`Block {{#${name}}} needs an expression, e.g. {{#${name} items}}`);
      const blockExpr = expr;
      // find matching close tag (same name), honoring nesting (fresh scanner: no shared lastIndex)
      const scan = TOKEN_RE();
      scan.lastIndex = tokens.lastIndex;
      const stack = [];
      let close;
      let found = false;
      while ((close = scan.exec(tpl))) {
        const c = close[2] ? close[2].trim() : null;
        if (!c) continue;
        if (c.startsWith('#')) {
          stack.push(c.slice(1).trim().split(/\s+/)[0]);
        } else if (c.startsWith('/')) {
          const nm = c.slice(1).trim().split(/\s+/)[0];
          if (stack.length === 0) {
            if (nm === name) { found = true; break; }
          } else {
            stack.pop();
          }
        }
      }
      if (!close || !found) throw new Error(`Unclosed block {{#${name}}} — missing {{/${name}}}`);
      const body = tpl.slice(tokens.lastIndex, close.index);
      const val = lookup(ctx, blockExpr);
      const isObj = val && typeof val === 'object' && !Array.isArray(val);
      const child = val != null && typeof val === 'object' ? { ...ctx, ...val, '.': val } : { ...ctx, '.': val };
      if (name === 'each' && Array.isArray(val)) {
        val.forEach((item, idx) => {
          const scope =
            item && typeof item === 'object' ? { ...child, ...item, '@index': idx } : { ...child, '.': item, '@index': idx };
          out += render(body, scope);
        });
      } else if (val) {
        // #if or truthy non-array value: render body exactly once
        out += render(body, isObj ? child : { ...ctx, '.': val });
      }
      last = scan.lastIndex;
      tokens.lastIndex = scan.lastIndex;
      continue;
    }
    throw new Error(`Unexpected closing tag {{/${name}}} in template`);
  }
  out += tpl.slice(last);
  return out;
}


/* ---------------- Validation ---------------- */
const warnings = [];
const requireField = (path, value) => {
  if (value === undefined || value === null || value === '') warnings.push(`⚠ missing: ${path}`);
};

requireField('profile.name', data.profile?.name);
requireField('profile.heroHtml', data.profile?.heroHtml);
requireField('profile.heroLedeHtml', data.profile?.heroLedeHtml);
requireField('seo.title', data.seo?.title);
requireField('seo.description', data.seo?.description);
requireField('site.url', data.site?.url);
requireField('contact.email', data.contact?.email);

/* -------- Required inputs: CV + profile photo must exist in assets/ -------- */
const errors = [];
const needAsset = (label, filename) => {
  if (!filename) {
    errors.push(`✖ missing: site.${label} — set it in profile.json (e.g. "cv": "Your_Name_CV.pdf")`);
    return;
  }
  const p = join(root, 'assets', filename);
  if (!existsSync(p)) {
    errors.push(
      `✖ missing required file: assets/${filename} (${label})\n` +
        `  Copy your file there, e.g.:  cp ~/Downloads/your-file assets/${filename}`
    );
  }
};
needAsset('cv', data.site?.cv);
needAsset('photo', data.site?.photo);
if (errors.length) {
  errors.forEach((e) => console.error(e));
  process.exit(1);
}

(data.experience?.jobs || []).forEach((j, i) => {
  if (!j.badge) warnings.push(`⚠ experience.jobs[${i}] has no badge (e.g. "Current" or a headline metric)`);
  (j.bullets || []).forEach((b, k) => {
    if (!/\d/.test(b)) warnings.push(`⚠ experience.jobs[${i}] bullet ${k + 1} has no number — recruiters look for measurable outcomes`);
  });
});
(data.caseStudies?.items || []).forEach((c, i) => {
  if (!c.outcome) warnings.push(`⚠ caseStudies.items[${i}] "${c.title}" has no outcome metric`);
  if (!(c.details || []).some((d) => d.label === 'Impact')) {
    warnings.push(`⚠ caseStudies.items[${i}] "${c.title}" has no Impact detail`);
  }
});
(data.profile?.stats || []).forEach((s, i) => {
  if (!s.label) warnings.push(`⚠ profile.stats[${i}] missing label`);
});
warnings.forEach((w) => console.error(w));

/* ---------------- Inject icon SVGs for known contact-button types ---------------- */
const ICONS = {
  email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6L22 7"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>',
  github: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.93c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z"/></svg>',
};
(data.profile?.contactButtons || []).forEach((b) => {
  b.icon = ICONS[b.type] || '';
  if (!b.icon) warnings.push(`⚠ profile.contactButtons: unknown type "${b.type}" (known: ${Object.keys(ICONS).join(', ')})`);
});

/* ---------------- Render ---------------- */
const template = readFileSync(join(root, 'template', 'template.html'), 'utf8');
let html;
try {
  html = render(template, data);
} catch (err) {
  console.error(`✖ Template error: ${err.message}`);
  process.exit(1);
}

if (dry) {
  console.log(`✔ ${profilePath} is valid — template rendered (${(html.length / 1024).toFixed(1)} KB). Not written (--dry).`);
  if (warnings.length) console.log(`  ${warnings.length} warning(s) — content suggestions, build still green.`);
  process.exit(0);
}

/* ---------------- Emit dist/ ---------------- */
const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, 'index.html'), html);
copyFileSync(join(root, 'template', 'styles.css'), join(dist, 'styles.css'));
copyFileSync(join(root, 'template', 'script.js'), join(dist, 'script.js'));

const ASSET_ALLOW = new Set(['.jpg', '.jpeg', '.png', '.pdf', '.svg', '.ico', '.webp', '.html']);
// Hashes of everything actually copied into dist/. preflight compares these so a
// replaced CV/photo/rubric cannot be published from a stale dist/.
const assetHashes = {};
const assetsDir = join(root, 'assets');
if (existsSync(assetsDir)) {
  for (const f of readdirSync(assetsDir)) {
    // Skip dotfiles/backups so *.bak, *~, .DS_Store never ship to dist/ or Cloudflare.
    if (f.startsWith('.') || f.endsWith('~') || f.endsWith('.bak')) continue;
    // Skip the generator sources for the evaluated CV (reportlab script + pypdf cache).
    if (f === 'cv_build_full.py' || f === '__pycache__') continue;
    const src = join(assetsDir, f);
    let st;
    try {
      st = statSync(src);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;
    const ext = f.slice(f.lastIndexOf('.')).toLowerCase();
    if (!ASSET_ALLOW.has(ext)) {
      warnings.push(`⚠ assets/${f} skipped: extension ${ext || '(none)'} not in publish allow-list`);
      continue;
    }
    copyFileSync(src, join(dist, f));
    assetHashes[f] = createHash('sha256').update(readFileSync(src)).digest('hex');
  }
}

/* Provenance stamp: lets `npm run deploy` refuse a stale dist/.
   Written BESIDE dist/ (not inside) so the hash file itself never uploads to Pages. */
writeFileSync(
  join(root, '.build-meta.json'),
  JSON.stringify(
    {
      profile: profilePath.split('/').slice(-1)[0],
      profileSha256: createHash('sha256').update(readFileSync(profilePath)).digest('hex'),
      assetVersion: data.site?.assetVersion ?? null,
      assets: assetHashes,
      builtAt: new Date().toISOString(),
      node: process.version,
    },
    null,
    2
  ) + '\n'
);

console.log(`✔ Built portfolio from ${profilePath}`);
console.log(`  → ${join(dist, 'index.html')}  (${(html.length / 1024).toFixed(1)} KB)`);
console.log('  → styles.css, script.js + assets copied to dist/');
if (warnings.length) console.log(`  ${warnings.length} warning(s) above — fix them for a stronger portfolio.`);
process.exit(0);
