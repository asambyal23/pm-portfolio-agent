import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync, readdirSync, symlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (args) => execFileSync('node', ['build.mjs', ...args], { cwd: root, encoding: 'utf8' });
// warnings go to stderr, the success line to stdout — capture both for assertions
const runBoth = (args) => {
  const r = spawnSync('node', ['build.mjs', ...args], { cwd: root, encoding: 'utf8' });
  return `${r.stdout || ''}${r.stderr || ''}`;
};

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
  // Fixture assets for examples/test-jane-profile.json. Owned by the tests, never
  // the user's files — a fork that replaces assets/ (the documented flow) still
  // passes `npm test`. build.mjs skips qa-fixture-* so they can never be published.
  const fixtureAssets = ['qa-fixture-cv.pdf', 'qa-fixture-photo.jpg'];
  const writeFixtures = () => {
    for (const f of fixtureAssets) {
      const p = join(root, 'assets', f);
      if (!existsSync(p)) writeFileSync(p, f.endsWith('.pdf') ? '%PDF-1.4\n% qa fixture\n' : 'qa-fixture');
    }
  };
  const removeFixtures = () => {
    for (const f of fixtureAssets) rmSync(join(root, 'assets', f), { force: true });
  };

  // Hermetic: guarantee dist/ + .build-meta.json exist before the preflight tests,
  // so `npm test` passes on a fresh clone (and in CI, which tests before building).
  before(() => {
    removeFixtures(); // a crashed earlier run must not skew the user's build
    writeFixtures();
    run([]);
  });

  // Leave the repo deployable: drop fixtures, then rebuild from the user's own
  // profile.json so dist/ + .build-meta.json describe THEIR site, not the fixture.
  after(() => {
    removeFixtures();
    run([]);
  });

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
  it('QA: stale contactButtons copied from the example are flagged', () => {
    const jane = JSON.parse(readFileSync(join(root, 'examples/test-jane-profile.json'), 'utf8'));
    jane.profile.contactButtons = [
      { type: 'email', label: 'Email Me', href: 'mailto:someone.else@example.org' },
      { type: 'linkedin', label: 'LinkedIn', href: 'https://linkedin.com/in/someone-else' },
      { type: 'phone', label: '+44-0000000000', href: 'tel:+440000000000' },
    ];
    const tmp = join(root, 'examples', '.tmp-stale-buttons.json');
    writeFileSync(tmp, JSON.stringify(jane));
    try {
      const out = runBoth(['--profile', 'examples/.tmp-stale-buttons.json', '--dry']);
      assert.match(out, /email button is "someone\.else@example\.org" but contact\.email/, 'stale email flagged');
      assert.match(out, /LinkedIn button is "https:\/\/linkedin\.com\/in\/someone-else"/, 'stale LinkedIn flagged');
      assert.match(out, /phone ".*" appears nowhere in your contact details/, 'unverifiable phone flagged');
    } finally {
      rmSync(tmp, { force: true });
    }
  });

  it('QA: matching contactButtons produce no leftover warnings', () => {
    const jane = JSON.parse(readFileSync(join(root, 'examples/test-jane-profile.json'), 'utf8'));
    jane.profile.contactButtons = [
      { type: 'email', label: 'Email Me', href: 'mailto:jane@example.com' },
      { type: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/jane/' }, // www + trailing slash
    ];
    const tmp = join(root, 'examples', '.tmp-good-buttons.json');
    writeFileSync(tmp, JSON.stringify(jane));
    try {
      const out = runBoth(['--profile', 'examples/.tmp-good-buttons.json', '--dry']);
      assert.doesNotMatch(out, /contactButtons: (email|LinkedIn|phone) button/, 'matching buttons must stay quiet');
    } finally {
      rmSync(tmp, { force: true });
    }
  });

  it('QA: test fixtures never ship to dist/', () => {
    try {
      run(['--profile', 'examples/test-jane-profile.json']);
      const listed = readdirSync(join(root, 'dist'));
      assert.ok(
        !listed.some((f) => f.startsWith('qa-fixture-')),
        `fixture files must never reach dist/, got: ${listed.join(', ')}`
      );
    } finally {
      run([]); // restore the user's real dist/ + meta
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

  it('user-UX: wrong-typed section gives a friendly error, not a stack trace', () => {
    const jane = JSON.parse(readFileSync(join(root, 'examples/test-jane-profile.json'), 'utf8'));
    const bad = { ...jane, profile: { ...jane.profile, stats: '8 years' } };
    const tmp = join(root, 'examples', '.tmp-bad-type.json');
    writeFileSync(tmp, JSON.stringify(bad));
    try {
      const r = spawnSync('node', ['build.mjs', '--profile', 'examples/.tmp-bad-type.json', '--dry'], {
        cwd: root,
        encoding: 'utf8',
      });
      const out = `${r.stdout || ''}${r.stderr || ''}`;
      assert.strictEqual(r.status, 1, 'must exit 1');
      assert.match(out, /profile\.stats must be an array, found string/, 'names the field and the actual type');
      assert.doesNotMatch(out, /TypeError|at (Object|Module)\./, 'no raw Node stack trace for end users');
    } finally {
      rmSync(tmp, { force: true });
    }
  });

  it('user-UX: malformed JSON names the file and line, no stack trace', () => {
    const jane = readFileSync(join(root, 'examples/test-jane-profile.json'), 'utf8');
    const tmp = join(root, 'examples', '.tmp-bad-json.json');
    writeFileSync(tmp, jane.slice(0, jane.length - 4) + ',}');
    try {
      const r = spawnSync('node', ['build.mjs', '--profile', 'examples/.tmp-bad-json.json', '--dry'], {
        cwd: root,
        encoding: 'utf8',
      });
      const out = `${r.stdout || ''}${r.stderr || ''}`;
      assert.strictEqual(r.status, 1);
      assert.match(out, /Could not parse .*\.tmp-bad-json\.json/, 'names the file');
      assert.doesNotMatch(out, /SyntaxError|at JSON\.parse/, 'no raw parser stack');
    } finally {
      rmSync(tmp, { force: true });
    }
  });

  it('QA: build rejects unknown flags instead of silently using ./profile.json', () => {
    assert.throws(
      () => execFileSync('node', ['build.mjs', '--profil', 'x.json'], { cwd: root, encoding: 'utf8' }),
      /unknown flag: --profil/,
      'a typo like --profil must fail loudly'
    );
    assert.throws(
      () => execFileSync('node', ['build.mjs', '--profile'], { cwd: root, encoding: 'utf8' }),
      /needs a value/,
      '--profile without a value must fail loudly'
    );
  });

  it('QA: --dry-run never writes dist/ (flag deploy.mjs relies on)', () => {
    const idx = join(root, 'dist', 'index.html');
    const before = readFileSync(idx, 'utf8');
    const out = run(['--dry-run']);
    assert.match(out, /Not written \(--dry\)/);
    assert.equal(readFileSync(idx, 'utf8'), before, '--dry-run must not touch dist/');
  });

  it('QA: reserved asset names fail the build (assets/index.html would overwrite the site)', () => {
    const reserved = join(root, 'assets', 'index.html');
    writeFileSync(reserved, '<h1>should never ship</h1>');
    try {
      assert.throws(
        () => execFileSync('node', ['build.mjs'], { cwd: root, encoding: 'utf8' }),
        /assets\/index\.html would overwrite the built site/,
        'reserved asset names must be rejected'
      );
    } finally {
      rmSync(reserved, { force: true });
      run([]); // restore a clean dist/ + meta
    }
  });

  it('QA: wrong-typed parent section gets a friendly error, not a crash', () => {
    const jane = JSON.parse(readFileSync(join(root, 'examples/test-jane-profile.json'), 'utf8'));
    jane.skills = 'none'; // string where an object is expected
    const tmp = join(root, 'examples', '.tmp-parent-type.json');
    writeFileSync(tmp, JSON.stringify(jane));
    try {
      const r = spawnSync('node', ['build.mjs', '--profile', 'examples/.tmp-parent-type.json', '--dry'], {
        cwd: root,
        encoding: 'utf8',
      });
      assert.notEqual(r.status, 0, 'must fail');
      assert.match(`${r.stdout}${r.stderr}`, /skills must be an object, found string/);
      assert.doesNotMatch(`${r.stderr}`, /at .*build\.mjs:\d+/s, 'no raw stack trace');
    } finally {
      rmSync(tmp, { force: true });
    }
  });

  it('QA: cache-bust hash is embedded and changes when CSS changes', () => {
    const meta = JSON.parse(readFileSync(join(root, '.build-meta.json'), 'utf8'));
    assert.match(meta.cacheBust || '', /^[0-9a-f]{8}$/, 'meta records the css/js hash');
    const idx = join(root, 'dist', 'index.html');
    assert.match(readFileSync(idx, 'utf8'), new RegExp(`\\?v=[^"']*${meta.cacheBust}`), 'index.html embeds the hash');
    const css = join(root, 'template', 'styles.css');
    const bak = readFileSync(css, 'utf8');
    try {
      writeFileSync(css, bak + '\n/* qa cache-bust probe */\n');
      run([]);
      const meta2 = JSON.parse(readFileSync(join(root, '.build-meta.json'), 'utf8'));
      assert.notEqual(meta2.cacheBust, meta.cacheBust, 'hash must change with CSS');
    } finally {
      writeFileSync(css, bak);
      run([]); // restore dist/ + meta for whatever runs next
    }
  });
});
