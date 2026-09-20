import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (args) => execFileSync('node', ['build.mjs', ...args], { cwd: root, encoding: 'utf8' });

describe('build smoke tests', () => {
  it('minimal Jane fixture validates (optional sections omit cleanly)', () => {
    const out = run(['--profile', 'examples/test-jane-profile.json', '--dry']);
    assert.match(out, /is valid/, 'Jane fixture should validate');
  });

  it('Jane has no skills/teardowns/builds keys, so template must skip them', () => {
    const jane = JSON.parse(readFileSync(join(root, 'examples/test-jane-profile.json'), 'utf8'));
    assert.ok(!jane.skills, 'fixture has no skills section');
    assert.ok(!jane.teardowns, 'fixture has no teardowns section');
    assert.ok(!jane.builds, 'fixture has no builds section');
  });

  it('hostile input in escaped fields does not break validation', () => {
    const evil = JSON.parse(readFileSync(join(root, 'examples/test-jane-profile.json'), 'utf8'));
    evil.profile.role = 'PM <img src=x onerror=alert(1)>';
    evil.experience.jobs[0].bullets = ['Grew things 10% <script>alert(1)</script>'];
    const tmp = join(root, 'examples', '.tmp-evil.json');
    writeFileSync(tmp, JSON.stringify(evil));
    try {
      const out = run(['--profile', 'examples/.tmp-evil.json', '--dry']);
      assert.match(out, /is valid/, 'evil fixture should still validate');
    } finally {
      rmSync(tmp, { force: true });
    }
  });

  it('missing CV fails fast with helpful message', () => {
    const jane = JSON.parse(readFileSync(join(root, 'examples/test-jane-profile.json'), 'utf8'));
    jane.site.cv = 'Does_Not_Exist_CV.pdf';
    const tmp = join(root, 'examples', '.tmp-nocv.json');
    writeFileSync(tmp, JSON.stringify(jane));
    try {
      assert.throws(() => run(['--profile', 'examples/.tmp-nocv.json', '--dry']), /missing required file/,
        'build must refuse a missing CV');
    } finally {
      rmSync(tmp, { force: true });
    }
  });

  it('preflight passes on a fresh build', () => {
    const out = execFileSync('node', ['preflight.mjs'], { cwd: root, encoding: 'utf8' });
    assert.match(out, /deploy preflight/, 'preflight should pass');
  });

  it('preflight refuses a stale dist', () => {
    const prof = join(root, 'profile.json');
    const bak = readFileSync(prof, 'utf8');
    const d = JSON.parse(bak);
    d.site.assetVersion = 'STALE-QA-PROBE';
    writeFileSync(prof, JSON.stringify(d));
    try {
      assert.throws(() => execFileSync('node', ['preflight.mjs'], { cwd: root, encoding: 'utf8' }), /stale/,
        'preflight must refuse stale dist');
    } finally {
      writeFileSync(prof, bak);
    }
  });

  it('preflight --allow-stale bypasses the hash check', () => {
    const prof = join(root, 'profile.json');
    const bak = readFileSync(prof, 'utf8');
    const d = JSON.parse(bak);
    d.site.assetVersion = 'STALE-QA-PROBE';
    writeFileSync(prof, JSON.stringify(d));
    try {
      const out = execFileSync('node', ['preflight.mjs', '--allow-stale'], { cwd: root, encoding: 'utf8' });
      assert.match(out, /deploy preflight/, 'bypass should pass');
    } finally {
      writeFileSync(prof, bak);
    }
  });

  it('QA: symlink escape outside dist/ is NOT served', async () => {
    const { spawn } = await import('node:child_process');
    const outside = join(os.tmpdir(), `qa-outside-${Date.now()}.txt`);
    writeFileSync(outside, 'qa-secret-must-not-leak');
    const link = join(root, 'dist', 'qa-evil-link.html');
    try { rmSync(link, { force: true }); } catch { /* noop */ }
    try {
      symlinkSync(outside, link);
    } catch {
      rmSync(outside, { force: true });
      return; // Windows CI without symlink rights — skip, not fail
    }
    const port = 18710;
    const child = spawn('node', ['serve.mjs'], { cwd: root, env: { ...process.env, PORT: String(port) } });
    await new Promise((r) => setTimeout(r, 900));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/qa-evil-link.html`);
      const body = await res.text();
      assert.equal(res.status, 404, 'symlink escape must 404');
      assert.ok(!body.includes('qa-secret-must-not-leak'), 'outside content must not leak');
    } finally {
      child.kill('SIGTERM');
      rmSync(link, { force: true });
      rmSync(outside, { force: true });
    }
  });

  it('QA: HEAD on missing file is 404, not 500', async () => {
    const { spawn } = await import('node:child_process');
    const port = 18711;
    const child = spawn('node', ['serve.mjs'], { cwd: root, env: { ...process.env, PORT: String(port) } });
    await new Promise((r) => setTimeout(r, 900));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/does-not-exist-qa.html`, { method: 'HEAD' });
      assert.equal(res.status, 404, 'missing file must 404');
      assert.match(res.headers.get('cache-control') || '', /no-store/, '404 carries no-store');
    } finally {
      child.kill('SIGTERM');
    }
  });

  it('QA: traversal /..%2f.. is blocked', async () => {
    const { spawn } = await import('node:child_process');
    const port = 18712;
    const child = spawn('node', ['serve.mjs'], { cwd: root, env: { ...process.env, PORT: String(port) } });
    await new Promise((r) => setTimeout(r, 900));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/..%2f..%2fpackage.json`);
      assert.equal(res.status, 404, 'traversal must 404');
    } finally {
      child.kill('SIGTERM');
    }
  });
});
