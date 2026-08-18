import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const REPO = fileURLToPath(new URL('../', import.meta.url));
export const VENDOR = REPO + 'vendor/three';

export function extractModule(htmlPath = REPO + 'index.html') {
  const html = readFileSync(htmlPath, 'utf8');
  const m = html.match(/<script type="module">\n([\s\S]*?)\n<\/script>/);
  if (!m) throw new Error('module <script> not found in ' + htmlPath);
  return m[1]
    .replace("import * as THREE from 'three';", '')
    .replace("import { OrbitControls } from 'three/addons/controls/OrbitControls.js';", '');
}

export const STUBS = `
function ctx2d(){ return new Proxy({}, {
  get(t,k){
    if(k==='createRadialGradient'||k==='createLinearGradient') return ()=>new Proxy({},{get:()=>()=>{},set:()=>true});
    if(k==='measureText') return ()=> { return { width:10 }; };
    if(k==='canvas') return {};
    if(k in t) return t[k];
    return function(){};
  },
  set(t,k,v){ t[k]=v; return true; }
}); }
function fakeStyle(){ return new Proxy({}, {
  get(t,k){ if(k==='setProperty'||k==='removeProperty') return ()=>{};
    if(k in t) return t[k]; return ''; },
  set(t,k,v){ t[k]=v; return true; }
}); }
class FakeEl {
  constructor(tag){ this.tagName=(tag||'div').toUpperCase(); this.children=[]; this.style=fakeStyle(); this.dataset={}; this.attributes={};
    this.classList={ add(){},remove(){},toggle(){},contains(){return false} };
    this.__ls = {};
  }
  addEventListener(t,f){ (this.__ls[t]=this.__ls[t]||[]).push(f); }
  removeEventListener(){}
  dispatch(t, ev){ (this.__ls[t]||[]).forEach(f=>f(ev)); }
  setAttribute(k,v){ this.attributes[k]=v; } getAttribute(k){ return this.attributes[k]; } removeAttribute(k){ delete this.attributes[k]; }
  getBoundingClientRect(){ return {left:0,top:0,width:1280,height:800,right:1280,bottom:800}; }
  getContext(t){ if(t==='2d') return ctx2d(); return null; }
  appendChild(c){ this.children.push(c); return c; }
  querySelector(){ return new FakeEl(); } querySelectorAll(){ return []; }
  focus(){} blur(){}
  get clientWidth(){ return 1280; } get clientHeight(){ return 800; }
  get width(){ return this._w||300; } set width(v){this._w=v;}
  get height(){ return this._h||150; } set height(v){this._h=v;}
}
globalThis.__NT = { els:{}, frames:0, maxFrames:3, frameTimes:[], renderer:null, initMs:0, errors:[] };
globalThis.__realConsoleError = console.error.bind(console);
globalThis.console.error = (...a)=>{ __NT.errors.push(a.map(String).join(' ')); };
const fakeDoc = {
  getElementById(id){ if(!__NT.els[id]) __NT.els[id]=new FakeEl(); return __NT.els[id]; },
  createElement(t){ return new FakeEl(t); },
  querySelector(){ return null; },
  querySelectorAll(){ return []; },
  title:'', documentElement:{ lang:'', style:{} },
  hidden:false,
  activeElement:new FakeEl(),
  body:new FakeEl(),
  addEventListener(){}, removeEventListener(){}
};
globalThis.window = globalThis;
globalThis.devicePixelRatio = 2;
globalThis.innerWidth = 1280; globalThis.innerHeight = 800;
globalThis.localStorage = { getItem(){ return null; }, setItem(){}, removeItem(){} };
globalThis.matchMedia = ()=> ({ matches:false, addEventListener(){} });
globalThis.__NT.queue = [];
let __flushScheduled = false;
function __flush(){
  __flushScheduled = false;
  if(__NT.frames >= __NT.maxFrames) return;
  __NT.frames++;
  const t0 = performance.now();
  const batch = __NT.queue.splice(0);
  for(const f of batch) f(t0);
  __NT.frameTimes.push(performance.now()-t0);
  if(__NT.queue.length && __NT.frames < __NT.maxFrames){
    __flushScheduled = true;
    queueMicrotask(__flush);
  }
}
globalThis.requestAnimationFrame = (fn)=>{
  if(__NT.frames < __NT.maxFrames){
    __NT.queue.push(fn);
    if(!__flushScheduled){
      __flushScheduled = true;
      queueMicrotask(__flush);
    }
  }
  return __NT.frames;
};
globalThis.cancelAnimationFrame = ()=>0;
globalThis.setInterval = ()=>0; globalThis.setTimeout = ()=>0;
globalThis.addEventListener = ()=>{}; globalThis.removeEventListener = ()=>{};
globalThis.document = fakeDoc;
const THREE = Object.assign({}, realTHREE);
THREE.WebGLRenderer = class StubRenderer {
  constructor(){ this.domElement = new FakeEl('canvas'); __NT.renderer = this; this.__renders = 0; }
  setPixelRatio(){} setSize(){} dispose(){} setAnimationLoop(){}
  render(scene, camera){ this.scene = scene; this.camera = camera; this.__renders++; }
};
const OrbitControls = realOrbitControls;
globalThis.__INIT_T0 = performance.now();
`;

export function buildModule(htmlPath) {
  const body = extractModule(htmlPath);
  return (
    "import * as realTHREE from '" + VENDOR + "/three.module.js';\n" +
    "import { OrbitControls as realOrbitControls } from '" + VENDOR + "/controls/OrbitControls.js';\n" +
    STUBS + '\n// ==== extracted module body (imports removed) ====\n' + body +
    '\nglobalThis.__NT.initMs = performance.now() - globalThis.__INIT_T0;\n'
  );
}