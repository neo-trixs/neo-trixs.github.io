import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert';
import { REPO, extractModule } from './lib.mjs';

const html = readFileSync(REPO + 'index.html', 'utf8');

// C2-I1: no duplicate element ids
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
const dups = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
assert.strictEqual(dups.length, 0, 'duplicate ids: ' + dups.join(', '));
console.log('  PASS no duplicate ids (' + new Set(ids).size + ' unique)');

// C2-I2: tag balance (div/section/script/module)
for (const tag of ['div', 'section', 'script', 'main', 'button']) {
  const open = (html.match(new RegExp('<' + tag + '(\\s|>)', 'g')) || []).length;
  const close = (html.match(new RegExp('</' + tag + '>', 'g')) || []).length;
  assert.strictEqual(open, close, 'tag <' + tag + '> unbalanced: open=' + open + ' close=' + close);
  console.log('  PASS balanced <' + tag + '> (' + open + ')');
}

// C2-I3: required anchors exist
for (const id of ['lang-toggle', 'search-input', 'search-count', 'cst-panel', 'detail-panel', 'gtooltip', 'starmap']) {
  assert.ok(html.includes('id="' + id + '"'), 'missing anchor #' + id);
}
console.log('  PASS required anchors present');

// C2-I4: extracted module parses (syntax gate beyond node --check)
const body = extractModule();
mkdirSync(REPO + 'tests/tmp', { recursive: true });
const tmp = REPO + 'tests/tmp/module-check.mjs';
writeFileSync(tmp, body);
execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
console.log('  PASS module body parses (' + body.split('\n').length + ' lines)');
rmSync(tmp, { force: true });

console.log('\nhtml-check.mjs: static gates passed');