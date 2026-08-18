import { existsSync, mkdirSync, symlinkSync, rmSync, writeFileSync } from 'node:fs';
import { REPO, VENDOR } from './lib.mjs';

// Resolve `import 'three'` inside vendor OrbitControls.js for node ESM.
// node_modules/three -> symlink to vendor/three (which carries its own package.json).

const pkg = VENDOR + '/package.json';
if (!existsSync(pkg)) {
  writeFileSync(pkg, JSON.stringify({
    name: 'three',
    version: '0.160.0',
    type: 'module',
    main: './three.module.js',
    exports: {
      '.': './three.module.js',
      './*': './*',
    },
  }, null, 2));
  console.log('created ' + pkg);
}

const nm = REPO + 'node_modules';
const link = nm + '/three';
if (existsSync(link)) rmSync(link, { recursive: true, force: true });
mkdirSync(nm, { recursive: true });
symlinkSync(VENDOR, link, 'dir');
console.log('linked node_modules/three -> vendor/three');