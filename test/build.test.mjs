import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
});
