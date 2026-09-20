import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (args) => execFileSync('node', ['build.mjs', ...args], { cwd: root, encoding: 'utf8' });

// Ephemeral port + stdout handshake: no fixed ports, no sleep()-based flake.
// serve.mjs prints the ACTUAL bound port, so PORT=0 works for parallel/CI runs.
const startServer = async () => {
  const { spawn } = await import('node:child_process');
  const child = spawn('node', ['serve.mjs'], { cwd: root, env: { ...process.env, PORT: '0' } });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('serve.mjs did not report a port within 5s')), 5000);
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d;
      const m = buf.match(/http:\/\/[^:]+:(\d+)/);
      if (m) {
        clearTimeout(timer);
        resolve(Number(m[1]));
      }
    });
    child.on('exit', (code) => reject(new Error(`serve.mjs exited early (code ${code})`)));
  });
  return { child, port };
};

describe('build smoke tests', () => {
  // Hermetic: guarantee dist/ + .build-meta.json exist before the preflight tests,
  // so `npm test` passes on a fresh clone (and in CI, which tests before building).
  before(() => run([]));

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
    const { child, port } = await startServer();
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
    const { child, port } = await startServer();
    try {
      const res = await fetch(`http://127.0.0.1:${port}/does-not-exist-qa.html`, { method: 'HEAD' });
      assert.equal(res.status, 404, 'missing file must 404');
      assert.match(res.headers.get('cache-control') || '', /no-store/, '404 carries no-store');
    } finally {
      child.kill('SIGTERM');
    }
  });

  it('QA: traversal /..%2f.. is blocked', async () => {
    const { child, port } = await startServer();
    try {
      const res = await fetch(`http://127.0.0.1:${port}/..%2f..%2fpackage.json`);
      assert.equal(res.status, 404, 'traversal must 404');
    } finally {
      child.kill('SIGTERM');
    }
  });

  it('QA: nested each/if blocks render without shared-regex corruption', () => {
    const tpl = '{{#each items}}{{name}}:{{#if show}}[{{#each tags}}{{.}},{{/each}}]{{/if}}|{{/each}}';
    const jb = join(root, 'examples', '.tmp-nest.json');
    const jane = JSON.parse(readFileSync(join(root, 'examples/test-jane-profile.json'), 'utf8'));
    jane.skills = { items: [{ id: 'x', kicker: 'k', title: 't', description: tpl, more: 'm' }] };
    writeFileSync(jb, JSON.stringify(jane));
    try {
      const out = run(['--profile', 'examples/.tmp-nest.json', '--dry']);
      assert.match(out, /is valid/, 'nested template must not throw');
    } finally {
      rmSync(jb, { force: true });
    }
  });

  it('QA: dotfiles and backups never ship to dist', () => {
    const junk = join(root, 'assets', '.tmp-junk.bak');
    writeFileSync(junk, 'junk');
    try {
      run(['--profile', 'examples/test-jane-profile.json']);
      assert.ok(!existsSync(join(root, 'dist', '.tmp-junk.bak')), 'backup must not ship');
    } finally {
      rmSync(junk, { force: true });
      run([]);
    }
  });

  it('QA: deploy wrapper rejects unknown flags and supports --dry-run', () => {
    assert.throws(() => execFileSync('node', ['deploy.mjs', '--brancch'], { cwd: root, encoding: 'utf8' }), /unknown deploy flag/);
    const out = execFileSync('node', ['deploy.mjs', '--dry-run'], { cwd: root, encoding: 'utf8', env: { ...process.env, CLOUDFLARE_PROJECT_NAME: 'qa-probe' } });
    assert.match(out, /qa-probe/, 'dry-run names the project without deploying');
  });

  it('QA: deploy --dry-run keeps our flags out of wrangler args', () => {
    try {
      run(['--profile', 'examples/test-jane-profile.json']); // dist + meta from Jane
      const out = execFileSync(
        'node',
        ['deploy.mjs', '--dry-run', '--profile', 'examples/test-jane-profile.json', '--branch=main'],
        { cwd: root, encoding: 'utf8', env: { ...process.env, CLOUDFLARE_PROJECT_NAME: 'qa-probe' } }
      );
      const preview = out.split('\n').find((l) => l.includes('npx ')) || '';
      assert.match(preview, /--branch=main/, 'real wrangler flags pass through');
      assert.ok(!preview.includes('--profile'), 'our --profile must never reach wrangler (its global --profile means auth)');
    } finally {
      run([]); // restore profile.json build + meta
    }
  });

  it('QA: deploy --allow-stale reaches the preflight gate', () => {
    const metaP = join(root, '.build-meta.json');
    const bak = readFileSync(metaP, 'utf8');
    const meta = JSON.parse(bak);
    meta.assets = { ...(meta.assets || {}), 'Ghost_File_QA.pdf': 'abc123' };
    writeFileSync(metaP, JSON.stringify(meta));
    try {
      assert.throws(
        () => execFileSync('node', ['deploy.mjs', '--dry-run'], { cwd: root, encoding: 'utf8' }),
        /asset\(s\) changed since build/,
        'deploy must inherit the preflight gate by default'
      );
      const out = execFileSync('node', ['deploy.mjs', '--dry-run', '--allow-stale'], { cwd: root, encoding: 'utf8' });
      assert.match(out, /would deploy/, 'bypass must reach the gate through npm-style arg forwarding');
    } finally {
      writeFileSync(metaP, bak);
    }
  });

  it('QA: --dry exits 0 with warnings (warnings are not failures)', () => {
    const out = run(['--profile', 'examples/test-jane-profile.json', '--dry']);
    assert.match(out, /is valid/, 'dry run greens with warnings present');
  });

  it('QA: preflight refuses asset drift (CV/photo/rubric changed after build)', () => {
    const metaP = join(root, '.build-meta.json');
    const bak = readFileSync(metaP, 'utf8');
    const meta = JSON.parse(bak);
    const firstAsset = Object.keys(meta.assets || {})[0];
    assert.ok(firstAsset, 'meta records asset hashes');
    meta.assets[firstAsset] = 'deadbeef'.repeat(8);
    writeFileSync(metaP, JSON.stringify(meta));
    try {
      assert.throws(
        () => execFileSync('node', ['preflight.mjs'], { cwd: root, encoding: 'utf8' }),
        /asset\(s\) changed since build/,
        'preflight must refuse drifted assets'
      );
    } finally {
      writeFileSync(metaP, bak);
    }
  });

  it('QA: preflight refuses a recorded asset that vanished', () => {
    const metaP = join(root, '.build-meta.json');
    const bak = readFileSync(metaP, 'utf8');
    const meta = JSON.parse(bak);
    meta.assets = { ...(meta.assets || {}), 'Ghost_File_QA.pdf': 'abc123' };
    writeFileSync(metaP, JSON.stringify(meta));
    try {
      assert.throws(
        () => execFileSync('node', ['preflight.mjs'], { cwd: root, encoding: 'utf8' }),
        /asset\(s\) changed since build/,
        'preflight must refuse a missing recorded asset'
      );
    } finally {
      writeFileSync(metaP, bak);
    }
  });
});
