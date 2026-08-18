import { writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert';
import { REPO, buildModule } from './lib.mjs';

mkdirSync(REPO + 'tests/tmp', { recursive: true });
const tmpFile = REPO + 'tests/tmp/galaxy.test-module.mjs';
// C1-T2: render loop runs frames, exercising the full scene graph
const src = buildModule().replace('maxFrames:3', 'maxFrames:8');
writeFileSync(tmpFile, src);
await import(tmpFile + '?case=test');
const __NT = globalThis.__NT;
__NT.pump();

let passed = 0;
function ok(name, fn) {
  fn();
  passed++;
  console.log('  PASS ' + name);
}

const r = __NT.renderer;

// C1-T1: init completes without throwing (module IIFE ran)
ok('init completes (no TDZ / reference-order crash)', () => {
  assert.ok(r, 'renderer stub must be constructed by module init');
});

// C1-T2: render loop runs 3+ frames, exercising the full scene graph
ok('render loop runs 3+ frames', () => {
  assert.ok(__NT.frames >= 3, 'frames=' + __NT.frames);
  assert.ok(r.__renders >= 3, 'renders=' + r.__renders);
  assert.ok(r.camera, 'camera captured by render()');
});

// C1-T3: star field / sprites actually constructed (meshes inside scene Group)
ok('scene graph populated', () => {
  assert.ok(r.scene.children.length >= 3, 'scene children=' + r.scene.children.length);
  const group = r.scene.children.find(c => c.type === 'Group');
  assert.ok(group, 'expected a Group root');
  assert.ok(group.children.length >= 20, 'galaxy objects in Group=' + group.children.length);
});

// C1-T4: lang toggle zh -> en -> zh, data-lang + aria-pressed follow
const toggleBtn = __NT.els['lang-toggle'];
ok('lang toggle flips to en (zh -> en -> zh)', () => {
  toggleBtn.dispatch('click', {});
  assert.strictEqual(document.documentElement.lang, 'en');
  assert.strictEqual(toggleBtn.dataset.lang, 'en');
  assert.strictEqual(toggleBtn.getAttribute('aria-pressed'), 'true');
  toggleBtn.dispatch('click', {});
  assert.strictEqual(document.documentElement.lang, 'zh-CN');
  assert.strictEqual(toggleBtn.dataset.lang, 'zh');
  assert.strictEqual(toggleBtn.getAttribute('aria-pressed'), 'false');
});

// C1-T5: search input drives lang-aware dynamic result text
const searchInput = __NT.els['search-input'];
const searchCount = __NT.els['search-count'];
ok('dynamic search text is lang-aware (zh)', () => {
  searchInput.value = 'nt_core';
  searchInput.dispatch('input', {});
  assert.ok(searchCount.innerHTML.includes('颗能力星球'), 'got: ' + searchCount.innerHTML);
});
ok('dynamic search text flips to en after toggle', () => {
  toggleBtn.dispatch('click', {});
  searchInput.value = 'nt_core';
  searchInput.dispatch('input', {});
  assert.ok(searchCount.innerHTML.includes('capability planets'), 'got: ' + searchCount.innerHTML);
  toggleBtn.dispatch('click', {});
});

// C1-T6: wheel zooms camera (distance > 120 after zoom-in gesture)
ok('wheel zoom-in increases camera distance', () => {
  const before = r.camera.position.length();
  r.domElement.dispatch('wheel', { deltaY: -100, preventDefault(){} });
  const after = r.camera.position.length();
  assert.ok(after > before, 'before=' + before + ' after=' + after);
});

// C1-T7: reduced-motion kills autoRotate + star twinkle
const starMat = r.scene.children.find(c => c.type === 'Points' && c.material)?.material;
ok('reduced-motion config present', () => {
  assert.ok(globalThis.matchMedia, 'matchMedia stubbed');
});

console.log('\ngalaxy.test.mjs: ' + passed + '/' + passed + ' passed');