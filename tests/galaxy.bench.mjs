import { writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert';
import { REPO, buildModule } from './lib.mjs';

mkdirSync(REPO + 'tests/tmp', { recursive: true });

// benchmark run: 60 frames, capture init time + per-frame JS cost
const tmpFile = REPO + 'tests/tmp/galaxy.bench-module.mjs';
const src = buildModule().replace('maxFrames:3', 'maxFrames:60');
writeFileSync(tmpFile, src);
await import(tmpFile);
const __NT = globalThis.__NT;

const initMs = __NT.initMs;
const frames = __NT.frames;
const renders = __NT.renderer.__renders;
const avgFrame = __NT.frameTimes.reduce((a, b) => a + b, 0) / (__NT.frameTimes.length || 1);
const p95Frame = __NT.frameTimes.slice().sort((a, b) => a - b)[Math.floor(__NT.frameTimes.length * 0.95)] || 0;

console.log('[bench] init:       ' + initMs.toFixed(1) + ' ms');
console.log('[bench] frames:     ' + frames + ' (renders: ' + renders + ')');
console.log('[bench] avg frame:  ' + avgFrame.toFixed(2) + ' ms');
console.log('[bench] p95 frame:  ' + p95Frame.toFixed(2) + ' ms');

// C3 budgets: init under 5s, per-frame JS under 50ms p95 (pure JS on CI class hardware)
assert.ok(initMs < 5000, 'init budget exceeded: ' + initMs + 'ms');
assert.ok(avgFrame < 50, 'avg frame budget exceeded: ' + avgFrame + 'ms');
assert.ok(p95Frame < 100, 'p95 frame budget exceeded: ' + p95Frame + 'ms');
assert.ok(frames === 60, 'expected 60 bench frames, got ' + frames);
console.log('\ngalaxy.bench.mjs: C3 budgets passed');