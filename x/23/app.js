// 内と外のコモングラウンド── 外の空間と内の空間を行き来して、受けとり方の重なりを一つの系として見る
// 模式の表現。生き物の受けとり方は資料/出典.md で確かめた範囲だけを語る。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as AU from './audio.js';
import { sightLeaf, sightBark, setSightSun } from './kit/sight_trees.js';

window.__t = [['start', performance.now()]];
const MOBILE = matchMedia('(pointer:coarse)').matches || innerWidth < 760;
const renderer = new THREE.WebGLRenderer({ antialias: !MOBILE, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const HAZE = new THREE.Color('#c9cfc2'), INNER_BG = new THREE.Color('#3a4641');
scene.background = HAZE.clone();
scene.fog = new THREE.FogExp2(HAZE.clone(), 0.045);
const camera = new THREE.PerspectiveCamera(MOBILE ? 58 : 48, innerWidth / innerHeight, 0.05, 200);

scene.add(new THREE.HemisphereLight('#e8efe6', '#4a4232', 1.15));
const sun = new THREE.DirectionalLight('#fff1d8', 2.1); sun.position.set(-6, 12, 5); scene.add(sun);

const TL = new THREE.TextureLoader();
const tex = (n, rep = 1, srgb = true) => { const t = TL.load('tex/' + n + '.webp'); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

// ───────── 外の空間：参道 ─────────
const outer = new THREE.Group(); scene.add(outer);
{
  const g = new THREE.PlaneGeometry(80, 80); g.rotateX(-Math.PI / 2);
  const side = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex('path_gravel', 26), color: '#6d6650', roughness: 1 }));
  outer.add(side);
  const pg = new THREE.PlaneGeometry(3.4, 80); pg.rotateX(-Math.PI / 2);
  const edge = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 4; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, '#000'); g.addColorStop(.22, '#fff'); g.addColorStop(.78, '#fff'); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, 0, 64, 4); return new THREE.CanvasTexture(c); })();
  const path = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ map: tex('path_gravel', 1), alphaMap: edge, transparent: true, depthWrite: false, color: '#d8d2c4', roughness: .95 }));   // 道の縁は土へなじませる
  path.material.map.repeat.set(1.2, 28); path.position.y = .005; outer.add(path);
}
// 木：幹（写真の樹皮・CC0）と葉の束
const barkMat = new THREE.MeshStandardMaterial({ map: tex('bark_zelkova', 1), normalMap: tex('bark_zelkova_n', 1, false), roughnessMap: tex('bark_zelkova_orm', 1, false), color: '#b7ab98' });
barkMat.map.repeat.set(2, 6); barkMat.normalMap.repeat.set(2, 6); barkMat.roughnessMap.repeat.set(2, 6); sightBark(barkMat); setSightSun(sun.position);
const leafTex = tex('leaf_spray', 1); leafTex.wrapS = leafTex.wrapT = THREE.ClampToEdgeWrapping;
const leafMat = sightLeaf(new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: .45, side: THREE.DoubleSide, color: '#a7b98e', roughness: .8 }), { crownY: 7, crownR: 3, k: .9 });
const trees = [];
for (let i = 0; i < 14; i++) {
  const s = i % 2 ? 1 : -1, z = 6 - Math.floor(i / 2) * 4.2 + (i % 3) * .4;
  trees.push(new THREE.Vector3(s * (3.1 + (i * 37 % 10) / 9), 0, z));
}
const NEAR_TREES = trees.length;
// 奥と両脇の林（地平で切れないように）
for (let i = 0; i < (MOBILE ? 26 : 40); i++) { const a = i * 2.39996, r = 9 + (i * 7 % 13) * 1.6; trees.push(new THREE.Vector3(Math.cos(a) * r, 0, -4 + Math.sin(a) * r * 1.4)); }
for (let i = 0; i < 10; i++) { const s = i % 2 ? 1 : -1; trees.push(new THREE.Vector3(s * (3.4 + (i % 3) * .5), 0, -26 - Math.floor(i / 2) * 4.4)); }
{
  const tg = new THREE.CylinderGeometry(.24, .34, 9, 18, 24, true); tg.translate(0, 4.5, 0);
  { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x); const k = 1 + 1.3 * Math.exp(-y * 2.2) * (.7 + .3 * Math.sin(a * 5)) + .04 * Math.sin(y * 1.3 + a * 3); p.setXYZ(i, x * k + Math.sin(y * .35) * .12, y, z * k); } tg.computeVertexNormals(); }   // 根張りと、幹のゆるい曲がり
  const trunks = new THREE.InstancedMesh(tg, barkMat, trees.length);
  const lg = new THREE.PlaneGeometry(1.6, 1.6);
  const per = MOBILE ? 30 : 56;
  const leaves = new THREE.InstancedMesh(lg, leafMat, trees.length * per);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  let k = 0;
  trees.forEach((t, i) => {
    const far = i >= NEAR_TREES ? 1.15 : 1; const r = far * (.9 + (i * 13 % 5) / 10); m.compose(t, q.identity().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.7), sc.set(r, 1 + (i % 4) * .08, r)); trunks.setMatrixAt(i, m);
    for (let j = 0; j < per; j++) {
      const a = Math.random() * 6.283, u = Math.pow(Math.random(), .6), rr = u * 3.0, h = 6.0 + (Math.random() - .3) * 4.2 * Math.sqrt(1 - u * u * .7);
      p.set(t.x + Math.cos(a) * rr + Math.sin(4.5 * .35) * .12, h, t.z + Math.sin(a) * rr);
      e.set(Math.random() * 6.283, Math.random() * 6.283, Math.random() * 6.283); q.setFromEuler(e);
      const s2 = .9 + Math.random() * 1.0; m.compose(p, q, sc.set(s2, s2, s2)); leaves.setMatrixAt(k++, m);
    }
  });
  outer.add(trunks, leaves);
}

// 木漏れ日：太陽の向きの細い光の筋（向きのある光を一つ）
{
  const c = document.createElement('canvas'); c.width = 16; c.height = 128; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, 'rgba(255,244,214,0)'); g.addColorStop(.25, 'rgba(255,244,214,.55)'); g.addColorStop(1, 'rgba(255,244,214,0)'); x.fillStyle = g; x.fillRect(0, 0, 16, 128);
  const t = new THREE.CanvasTexture(c), m = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: .16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const dir = sun.position.clone().normalize();
  [[-1.4, -1.5, .9], [.9, -4.2, 1.3], [-.2, -7.5, .7], [1.8, .6, .5]].forEach(([x0, z0, w]) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 14), m); p.position.set(x0, 0, z0).addScaledVector(dir, 6.5); p.lookAt(p.position.clone().add(dir)); p.rotateX(Math.PI / 2); p.renderOrder = 3; outer.add(p); });
}
// ───────── 主体（10） ─────────
// cap の文は資料/出典.md に照らした範囲。機械は「受けとり方」と呼ぶ。
const SUBJ = [
  { id: 'bird', name: 'シジュウカラ', col: '#b9a7d6', pos: [-2.2, 2.4, -1.5], r: 2.3, cap: 'シジュウカラ──多くの鳥は四種の錐体をもち、紫外の光も受けとる。葉や羽の色は、人とは違う分かれ方で見えているとされる。' },
  { id: 'bee', name: 'ミツバチ', col: '#e3c98f', pos: [1.6, 1.0, -.4], r: 1.6, cap: 'ミツバチ──紫外と空の偏光を手がかりに、花と方角を読む。赤は見分けにくい。' },
  { id: 'worm', name: 'ミミズ', col: '#c8a98a', pos: [1.9, .03, -3.6], r: 1.5, cap: 'ミミズ──目はないが、皮膚の細胞で光の明るさを、体で土の震えを受けとる。' },
  { id: 'tree', name: 'ケヤキ', col: '#9ec09a', pos: [trees[0].x, 3.4, trees[0].z], r: 3.2, cap: 'ケヤキ──日の長さと温度の移ろいを受けとり、芽吹きと落葉の時期が決まる。' },
  { id: 'fungi', name: '土の菌糸', col: '#c9b48c', pos: [-1.2, -.2, -3.2], r: 2.6, cap: '土の菌糸──根とつながり、水と養分をやりとりする（菌根）。土の中の網。' },
  { id: 'human', name: '人', col: '#e9d7c4', pos: [-.9, 1.4, 3.4], r: 2.4, cap: '人──いま見ているあなた。見て、聴いて、名前と記憶で風景に意味をつける。この受けとり方も、ここでは一つ。' },
  { id: 'aoi', name: '碧', col: '#8fd3e6', pos: [1.1, 1.0, 1.2], r: 1.7, cap: '碧──測ったことと記録を、人の感じられる形に訳す。' },
  { id: 'sensor', name: '温湿度計', col: '#a8c4cf', pos: [-2.6, .8, -6.0], r: 1.4, mach: 1, cap: '温湿度計──温度と湿り気を、数として受けとる。' },
  { id: 'camera', name: 'カメラと AI', col: '#a7b3d4', pos: [2.9, 2.0, -7.5], r: 1.8, mach: 1, cap: 'カメラと AI──光の並びから、形と名前の見当をつける。' },
  { id: 'gis', name: '地図（GIS）', col: '#b8c2a8', pos: [0, .1, -9.5], r: 3.0, mach: 1, cap: '地図（GIS）──土地の高さと位置を、層として重ねる。' },
];
const E = new THREE.Vector3(0, .05, -3); // 場

// 体の形（さりげなく・模式）
const bodyMat = c => new THREE.MeshStandardMaterial({ color: c, roughness: .7 });
function makeBody(s) {
  const g = new THREE.Group(); const P = new THREE.Vector3(...s.pos); g.position.copy(P);
  if (s.id === 'bird') { const b = new THREE.Mesh(new THREE.SphereGeometry(.09, 16, 12), bodyMat('#5d6a52')); b.scale.set(1, .85, 1.4); const h = new THREE.Mesh(new THREE.SphereGeometry(.06, 12, 10), bodyMat('#1c1c1c')); h.position.set(0, .07, .11); const ch = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 8), bodyMat('#f3f1ea')); ch.position.set(.04, .07, .14); const t = new THREE.Mesh(new THREE.BoxGeometry(.04, .01, .16), bodyMat('#3e4646')); t.position.set(0, -.01, -.16); g.add(b, h, ch, t); }
  if (s.id === 'bee') { const b = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), bodyMat('#8a6326')); b.scale.set(1, 1, 1.7); const w = new THREE.Mesh(new THREE.PlaneGeometry(.06, .03), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .35, side: 2 })); w.position.y = .03; w.rotation.x = -1.4; g.add(b, w); g.userData.bee = w; }
  if (s.id === 'tanuki') { const b = new THREE.Mesh(new THREE.SphereGeometry(.22, 18, 14), bodyMat('#6a5a46')); b.scale.set(.9, .8, 1.5); const h = new THREE.Mesh(new THREE.SphereGeometry(.13, 14, 12), bodyMat('#5a4c3c')); h.position.set(0, .08, .32); const m = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), bodyMat('#2b241d')); m.position.set(0, .1, .38); m.scale.set(1.6, .7, .6); g.add(b, h, m); }
  if (s.id === 'sensor') { const p = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1.4, 8), bodyMat('#8c8f8c')); p.position.y = -.1; const bx = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .22, 6), bodyMat('#e6e6e1')); bx.position.y = .55; g.add(p, bx); }
  if (s.id === 'camera') { const bx = new THREE.Mesh(new THREE.BoxGeometry(.18, .12, .22), bodyMat('#2a2d30')); const l = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .06, 14), new THREE.MeshStandardMaterial({ color: '#0c1a24', metalness: .9, roughness: .1 })); l.rotation.x = 1.57; l.position.z = .13; g.add(bx, l); g.lookAt(0, 1, 0); }
  if (s.id === 'gis') { const pl = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .05, 20), bodyMat('#a39c8c')); g.add(pl); }
  if (s.id === 'human') { const b = new THREE.Mesh(new THREE.CapsuleGeometry(.17, .9, 6, 14), bodyMat('#4b5058')); b.position.y = -.25; const h = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 12), bodyMat('#c9a68c')); h.position.y = .45; g.add(b, h); }
  return g;
}

// sight と同じ写実の生き物（creatures.js・mitsulab の造形）。体の長さ＝1 を実寸へ（蜂だけ見える大きさへ拡大）
let makeCreature, makeSightBody;
function sightBody(s) {
  const id = { bird: 'tori', bee: 'hachi', worm: 'mimizu' }[s.id];
  let g = null;
  if (id) { g = makeCreature(id); g.scale.setScalar({ tori: .15, hachi: .06, mimizu: .16 }[id]); }
  if (s.id === 'human') { g = makeSightBody('hito'); g.scale.setScalar(1.48); g.position.y = 0; g.rotation.y = .6; const w = new THREE.Group(); w.add(g); w.position.set(s.pos[0], 0, s.pos[2]); w.userData = g.userData; return w; }
  if (!g) return null; const w = new THREE.Group(); w.add(g); w.position.set(...s.pos); w.userData = g.userData; return w;
}
// 受けとる層（揺らぐ界面）
const veilVS = `#include <fog_pars_vertex>
uniform float uT;varying vec3 vN;varying vec3 vV;varying vec3 vW;
float n3(vec3 p){return sin(p.x*1.7+uT*.6)*sin(p.y*2.1-uT*.45)*sin(p.z*1.9+uT*.5);}
void main(){vec3 p=position+normal*n3(position*1.3)*.09*length(position);vec4 w=modelMatrix*vec4(p,1.);vW=w.xyz;vN=normalize(mat3(modelMatrix)*normal);vV=normalize(cameraPosition-w.xyz);vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
const veilFS = `#include <fog_pars_fragment>
uniform vec3 uC;uniform float uI;uniform float uM;uniform float uT;uniform float uR;varying vec3 vN;varying vec3 vV;varying vec3 vW;
void main(){float f=pow(1.-abs(dot(normalize(vN),vV)),2.2);float sc=uM*smoothstep(.85,1.,sin(vW.y*38.-uT*2.))*.5;
float a=(f*f*.22+.008+sc*f)*uI*(1.-uR*.55);vec3 c=mix(uC,vec3(1.),f*.35);gl_FragColor=vec4(c,a);
#include <fog_fragment>
}`;
const veils = [], hits = [], bodies = {};
const vGeo = new THREE.IcosahedronGeometry(1, MOBILE ? 4 : 5);
SUBJ.forEach((s, i) => {
  const m = new THREE.ShaderMaterial({ vertexShader: veilVS, fragmentShader: veilFS, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uC: { value: new THREE.Color(s.col) }, uI: { value: .8 }, uM: { value: s.mach || 0 }, uT: { value: 0 }, uR: { value: 0 } }]) });
  const v = new THREE.Mesh(vGeo, m); v.position.set(s.pos[0], Math.min(s.pos[1], .9) * .6, s.pos[2]); v.scale.setScalar(s.r * 1.15); v.scale.y = .38;   // 受けとる層は地面近くの薄い帯（木と碧を横切らない） v.renderOrder = 2; outer.add(v); veils.push(v);
  const h = new THREE.Mesh(new THREE.SphereGeometry(Math.max(.7, s.r * .55), 8, 6), new THREE.MeshBasicMaterial({ visible: false })); h.position.set(...s.pos); h.userData.i = i; outer.add(h); hits.push(h);
  if (['sensor', 'camera', 'gis'].includes(s.id)) { const b = makeBody(s); outer.add(b); bodies[s.id] = b; }
});
// 土の菌糸：地表すれすれの細い線
{
  const pts = []; const rnd = (a) => (Math.random() - .5) * a;
  for (let k = 0; k < (MOBILE ? 70 : 140); k++) {
    let x = -1.2 + rnd(3), z = -3.2 + rnd(3);
    for (let s = 0; s < 6; s++) { const nx = x + rnd(.6), nz = z + rnd(.6); pts.push(x, .012, z, nx, .012, nz); x = nx; z = nz; }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  outer.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#e9dfc6', transparent: true, opacity: .14 })));
}

// 流れ：場 E → 主体（受けとる P）、主体 → 場（働き a）
const curves = SUBJ.map(s => { const P = new THREE.Vector3(...s.pos); const mid = E.clone().lerp(P, .5); mid.y += 1.2; return new THREE.QuadraticBezierCurve3(E, mid, P); });
const FN = MOBILE ? 18 : 30, NF = SUBJ.length * FN;
const fGeo = new THREE.BufferGeometry(); const fPos = new Float32Array(NF * 3), fCol = new Float32Array(NF * 3); const fT = new Float32Array(NF).map(() => Math.random());
fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3)); fGeo.setAttribute('color', new THREE.BufferAttribute(fCol, 3));
const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, '#fff'); g.addColorStop(.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); const t = new THREE.CanvasTexture(c); return t; })();
const flow = new THREE.Points(fGeo, new THREE.PointsMaterial({ size: .07, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .8 }));
outer.add(flow);
const field = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: dotTex, color: '#cfe7e2', transparent: true, opacity: .25, depthWrite: false }));
field.position.copy(E); outer.add(field);

// 露の網（帝網の像を地上の具体で）：木と木のあいだの糸に、露の珠
const DROPS = []; const strandPts = [];
for (let i = 0; i + 1 < trees.length; i += 1) {
  const a = trees[i], b = trees[(i + 2) % trees.length]; if (a.distanceTo(b) > 7) continue;
  const y0 = 1.3 + (i % 3) * .35;
  for (let k = 0; k <= 22; k++) { const t = k / 22; const p = a.clone().lerp(b, t); p.y = y0 - Math.sin(t * Math.PI) * .45; strandPts.push(p); if (k % 2 && k < 22) DROPS.push(p.clone().add(new THREE.Vector3(0, -.015, 0))); }
}
{
  const g = new THREE.BufferGeometry().setFromPoints(strandPts.flatMap((p, i) => (i % 23 === 22) ? [] : [p, strandPts[i + 1]]));
  outer.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#f2f2ec', transparent: true, opacity: .22 })));
}
const cubeRT = new THREE.WebGLCubeRenderTarget(MOBILE ? 128 : 256); const cubeCam = new THREE.CubeCamera(.1, 60, cubeRT);
const dropMat = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 1, roughness: .04, envMap: cubeRT.texture, envMapIntensity: 1.25 });
const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(.028, 14, 10), dropMat, DROPS.length);
const dGlow = new Float32Array(DROPS.length);
{ const m = new THREE.Matrix4(); DROPS.forEach((p, i) => { m.makeScale(1, .9, 1); m.setPosition(p); drops.setMatrixAt(i, m); drops.setColorAt(i, new THREE.Color(1, 1, 1)); }); }
outer.add(drops);

// ───────── 内の空間：人の内側 ─────────
const inner = new THREE.Group(); inner.visible = false; scene.add(inner);
// P・K・g の三つの働き＝外から内への三つの薄い層（字は出さない）
const layerCols = ['#cfe3e6', '#d9cfb8', '#e8e0f0'];
const innerLayers = layerCols.map((c, i) => {
  const m = new THREE.ShaderMaterial({ vertexShader: veilVS, fragmentShader: veilFS, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uC: { value: new THREE.Color(c) }, uI: { value: .9 }, uM: { value: i === 1 ? .6 : 0 }, uT: { value: 0 }, uR: { value: 0 } }]) });
  const v = new THREE.Mesh(vGeo, m); v.scale.setScalar(3.2 - i * 1.0); inner.add(v); return v;
});
// 記憶と文脈（K）の細かな粒：ゆっくり層をなす
const KN = MOBILE ? 600 : 1400; const kPos = new Float32Array(KN * 3);
for (let i = 0; i < KN; i++) { const r = 1.3 + Math.random() * 1.0, a = Math.random() * 6.283, y = (Math.random() - .5) * 2.4; kPos.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3); }
const kGeo = new THREE.BufferGeometry(); kGeo.setAttribute('position', new THREE.BufferAttribute(kPos, 3));
const kPts = new THREE.Points(kGeo, new THREE.PointsMaterial({ size: .03, map: dotTex, color: '#e6dcc4', transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending })); inner.add(kPts);
// 写り込む受けとり方：主体ごとの露（同じ数・同じ大きさへ向かう）
const cubeRT2 = new THREE.WebGLCubeRenderTarget(MOBILE ? 128 : 256), cubeCam2 = new THREE.CubeCamera(.1, 60, cubeRT2);
// 内の露は、参道とほかの露を同時に映す写し（露どうしが映り合う）
const iMat = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 1, roughness: .05, envMap: cubeRT2.texture, envMapIntensity: 2.2 });
const absMatOuter = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 1, roughness: .05, envMap: cubeRT.texture });
// 露ごとの見え方（主体の受けとり方の模式）：0 そのまま／1 紫外寄り／2 偏光の縞・赤が沈む／3 明暗だけ／4 数の段／5 光の緑／6 菌糸の網／7 等高線
const LOOK = { bird: 1, bee: 2, worm: 3, sensor: 4, camera: 4, tree: 5, fungi: 6, gis: 7 };
function lookMat(id) {
  const m = iMat.clone(); const L = LOOK[id] || 0;
  m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
{ vec3 c = gl_FragColor.rgb; float l = dot(c, vec3(.3, .59, .11)); vec2 q = gl_FragCoord.xy; float L = ${L}.;
  if (L == 1.) c = vec3(c.b * .9 + .1, c.g * .75, c.r * .35 + c.b * .8 + .05);
  else if (L == 2.) c = vec3(c.g * .85, c.g * .8 + c.b * .3, c.b + .12) * (.82 + .18 * sin((q.x + q.y) * .7));
  else if (L == 3.) c = vec3(smoothstep(.15, .55, l));
  else if (L == 4.) { c = floor(c * 4.) / 4.; c *= .78 + .22 * step(.5, fract(q.y * .25)); }
  else if (L == 5.) c = mix(vec3(l), vec3(l * .7, l * 1.05, l * .55), .7);
  else if (L == 6.) c = mix(c * .45, vec3(.95, .88, .7), step(.9, fract(q.x * .11 + sin(q.y * .06) * 2.)));
  else if (L == 7.) c = mix(vec3(l * .8, l * .85, l * .72), vec3(.9, .95, .85), step(.86, fract(l * 12.)));
  gl_FragColor.rgb = c; }`); };
  m.customProgramCacheKey = () => 'look' + L; return m;
}
const iDrops = []; const iLinks = [];
SUBJ.forEach((s, i) => {
  const phi = Math.acos(1 - 2 * (i + .5) / SUBJ.length), th = i * 2.39996;
  const p = new THREE.Vector3(Math.sin(phi) * Math.cos(th), Math.cos(phi) * .7, Math.sin(phi) * Math.sin(th)).multiplyScalar(4.4);
  const d = new THREE.Mesh(new THREE.SphereGeometry(.32, 32, 24), lookMat(s.id)); d.material.emissive = new THREE.Color(s.col).multiplyScalar(.22); d.position.copy(p); d.userData.i = i; inner.add(d); iDrops.push(d);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: s.col, transparent: true, opacity: .45, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.setScalar(1.6); d.add(halo);
});
// 露どうしが映し合う糸（相互の写り込み）と、中心（意味づけ）への流れ
{
  const seg = []; for (let a = 0; a < iDrops.length; a++) for (let b = a + 1; b < iDrops.length; b++) seg.push(iDrops[a].position, iDrops[b].position);
  const g = new THREE.BufferGeometry().setFromPoints(seg); const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#d8ece9', transparent: true, opacity: .0, depthWrite: false })); inner.add(l); iLinks.push(l);
}
const iFN = MOBILE ? 10 : 18, iNF = SUBJ.length * iFN; const iPos = new Float32Array(iNF * 3), iCol = new Float32Array(iNF * 3); const iT = new Float32Array(iNF).map(() => Math.random());
const iGeo = new THREE.BufferGeometry(); iGeo.setAttribute('position', new THREE.BufferAttribute(iPos, 3)); iGeo.setAttribute('color', new THREE.BufferAttribute(iCol, 3));
inner.add(new THREE.Points(iGeo, new THREE.PointsMaterial({ size: .06, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
const HUMAN = SUBJ.findIndex(s => s.id === 'human');
// 映り合う光の点：各露の面の、近い露の向きに、その露の色の小さな光
const REF = []; iDrops.forEach((a, i) => { iDrops.map((b, j) => [j, a.position.distanceTo(b.position)]).filter(x => x[0] !== i).sort((x, y) => x[1] - y[1]).slice(0, 4).forEach(([j]) => REF.push([i, j])); });
const rPos = new Float32Array(REF.length * 3), rCol = new Float32Array(REF.length * 3);
REF.forEach(([i, j], k) => { const c = new THREE.Color(SUBJ[j].col).lerp(new THREE.Color(1, 1, 1), .35); rCol.set([c.r, c.g, c.b], k * 3); });
const rGeo = new THREE.BufferGeometry(); rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3)); rGeo.setAttribute('color', new THREE.BufferAttribute(rCol, 3));
inner.add(new THREE.Points(rGeo, new THREE.PointsMaterial({ size: .18, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
// 各露から外の体の方へ残る細い糸（体→露→体の往き来）
const tPts = [], tCols = []; iDrops.forEach((d, i) => { const o = d.position.clone().multiplyScalar(1.35); const c = new THREE.Color(SUBJ[i].col); tPts.push(d.position.x, d.position.y, d.position.z, o.x, o.y, o.z); tCols.push(c.r, c.g, c.b, 0, 0, 0); });
const tGeo = new THREE.BufferGeometry(); tGeo.setAttribute('position', new THREE.Float32BufferAttribute(tPts, 3)); tGeo.setAttribute('color', new THREE.Float32BufferAttribute(tCols, 3));
const tLines = new THREE.LineSegments(tGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending })); inner.add(tLines);
// 人の露のふち（埋もれないように）
// 帝網：近い露どうしを結ぶ網（相対化が進むほど光る）
const nSeg = [], beads = []; REF.forEach(([i, j]) => { if (!(i < j || !REF.some(([a, b]) => a === j && b === i))) return; const A = iDrops[i].position, B = iDrops[j].position, sag = A.distanceTo(B) * .12; let prev = A.clone();
  for (let k = 1; k <= 10; k++) { const u = k / 10, p = A.clone().lerp(B, u); p.y -= Math.sin(u * Math.PI) * sag; nSeg.push(prev, p); if (k % 2 && k < 10) beads.push(p.x, p.y - .02, p.z); prev = p; } });   // 糸はたわみ、露の粒が並ぶ
const netLines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(nSeg), new THREE.LineBasicMaterial({ color: '#e8f2ee', transparent: true, opacity: .2, depthWrite: false })); inner.add(netLines);
{ const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(beads, 3)); inner.add(new THREE.Points(g, new THREE.PointsMaterial({ size: .07, map: dotTex, color: '#f4f8f4', transparent: true, opacity: .7, depthWrite: false }))); }
const selfRing = new THREE.Mesh(new THREE.TorusGeometry(.4, .006, 6, 64), new THREE.MeshBasicMaterial({ color: '#f3e6c8', transparent: true, opacity: .7 })); iDrops[HUMAN].add(selfRing);
// 具体↔抽象：外の各主体の上に、その受けとり方を写した小さな露（内の露と同じもの）。糸で体と結ぶ
const absDrops = [], absHome = [], absLine = []; const absMat = absMatOuter;
SUBJ.forEach((s, i) => {
  const d = new THREE.Mesh(new THREE.SphereGeometry(.07, 20, 14), absMat.clone()); d.material.color.set(s.col);
  const h = new THREE.Vector3(...s.pos); h.y = s.id === 'aoi' ? 2.35 : Math.max(h.y, .3) + .75; d.position.copy(h); absHome.push(h); outer.add(d); absDrops.push(d);
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...s.pos), h.clone()]);
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: s.col, transparent: true, opacity: .25, depthWrite: false })); outer.add(l); absLine.push(l);
});

// ───────── 碧（3D・あとから読む） ─────────
let vrm = null, aoiRoot = null, AM = null;
setTimeout(async () => {
  try {
    ({ makeCreature, makeBody: makeSightBody } = await import('./bodies.js'));
    for (const s of SUBJ) if (['bird', 'bee', 'worm'].includes(s.id)) { const b = sightBody(s); outer.add(b); bodies[s.id] = b; }
    const { AoiMotion, warmAoi } = await import('./kit/aoi_motion.js');
    const { VRMLoaderPlugin, VRMUtils } = await import('@pixiv/three-vrm');
    const L = new GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder); L.register(p => new VRMLoaderPlugin(p));
    const gl = await L.loadAsync('assets/aoi/aoi.vrm'); vrm = gl.userData.vrm; VRMUtils.rotateVRM0(vrm);
    VRMUtils.removeUnnecessaryVertices(gl.scene); vrm.scene.traverse(o => o.frustumCulled = false);
    aoiRoot = new THREE.Group(); aoiRoot.add(vrm.scene); aoiRoot.position.set(1.1, 0, 1.2);
    AM = new AoiMotion(vrm, { root: aoiRoot, wind: .35, startCalm: 2.2, posture: 'natural', uprightWeight: .25, faceLight: .6 }); AM.place(1.1, 1.2, -.5);
    outer.add(aoiRoot); await warmAoi(renderer, aoiRoot, camera, scene).catch(() => {}); refreshEnv();
  } catch (e) { console.warn('aoi', e); }
}, 350);

// ───────── 語り（碧の字幕） ─────────
const capEl = document.getElementById('cap'); let capTimer = 0;
const noteEl = document.getElementById('note');
function say(t, ms = 6000) { capEl.textContent = t; capEl.classList.add('on'); noteEl.classList.remove('on'); clearTimeout(capTimer); capTimer = setTimeout(() => { capEl.classList.remove('on'); noteEl.classList.add('on'); }, ms); }
const touched = new Set(); let rel = /[?&]rel=1/.test(location.search) ? 1 : 0;   // ?rel=1＝相対化が進んだあとの画を確かめる // 相対化の進み 0→1
let mode = 'outer', trans = 0, transDir = 0;

// ───────── 操作：なぞって回る・触れる ─────────
const view = { yaw: .15, pitch: .16, dist: MOBILE ? 9.5 : 8, tgt: new THREE.Vector3(0, 1.3, -2) };
const ptrs = new Map(); let downAt = null, pinch0 = 0;
const cv = renderer.domElement;
cv.addEventListener('pointerdown', e => { AU.start(SUBJ.map(s => s.id)); cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); downAt = [e.clientX, e.clientY, performance.now()]; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
cv.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0) view.dist = THREE.MathUtils.clamp(view.dist * pinch0 / d, 3, 16); pinch0 = d; }
  else { view.yaw -= (e.clientX - p[0]) * .005; view.pitch = THREE.MathUtils.clamp(view.pitch + (e.clientY - p[1]) * .004, -.35, 1.1); }
  ptrs.set(e.pointerId, [e.clientX, e.clientY]);
});
const up = e => { ptrs.delete(e.pointerId); pinch0 = 0; if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 8 && performance.now() - downAt[2] < 500) tap(e.clientX, e.clientY); downAt = null; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); downAt = null; });
cv.addEventListener('wheel', e => { view.dist = THREE.MathUtils.clamp(view.dist * (1 + e.deltaY * .001), 3, 16); }, { passive: true });

const ray = new THREE.Raycaster(), nd = new THREE.Vector2();
const focus = new Float32Array(SUBJ.length);
function tap(x, y) {
  nd.set(x / innerWidth * 2 - 1, -y / innerHeight * 2 + 1); ray.setFromCamera(nd, camera);
  if (mode === 'outer') {
    const hs = ray.intersectObjects(hits)[0];
    // 糸の露は小さいので、画面上で 26px 以内のいちばん近い露を当たりにする
    let best = -1, bd = 32; DROPS.forEach((p, k) => { v3.copy(p).project(camera); if (v3.z > 1) return; const dx = (v3.x + 1) / 2 * innerWidth - x, dy = (1 - v3.y) / 2 * innerHeight - y, d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = k; } });
    if (best >= 0 && (!hs || DROPS[best].distanceTo(camera.position) < hs.distance + .5)) { dGlow[best] = 1; ripple(best); return; }
    if (hs) { const i = hs.object.userData.i; focus[i] = 1; touched.add(SUBJ[i].id); say(SUBJ[i].cap, 7000); }
  } else {
    const h = ray.intersectObjects(iDrops)[0]; if (!h) return; const i = h.object.userData.i; focus[i] = 1; touched.add('in_' + SUBJ[i].id);
    say(i === HUMAN ? '人の露。ほかと同じ、一粒。' : SUBJ[i].name + 'の露。参道が、' + ({ bird: 'その目の色', bee: 'その目の色', worm: '明るさだけ', tree: '光の濃さ', fungi: '土の網の目', sensor: '数の段', camera: '数の段', gis: '高さの線', aoi: '訳す形' }[SUBJ[i].id] || 'その受けとり方') + 'で映る。', 6500);
  }
}
let rippleFrom = -1, rippleT = 0;
function ripple(id) { rippleFrom = id; rippleT = 0; AU.ripple(DROPS.map(p => p.distanceTo(DROPS[id]) / 4).filter(d => d > 0).sort((a, b) => a - b)); touched.add('drop'); say('一粒に、まわりの露がみな映っている。', 6000); }

// 外 ⇄ 内
const go = document.getElementById('go');
go.addEventListener('click', () => { AU.start(SUBJ.map(s => s.id)); if (transDir) return; transDir = 1; trans = 0; });
function swapMode() {
  mode = mode === 'outer' ? 'inner' : 'outer';
  outer.visible = mode === 'outer'; inner.visible = mode === 'inner';
  go.textContent = mode === 'outer' ? '内へ' : '外へ';
  if (mode === 'inner') { view.tgt.set(0, camera.aspect < .7 ? -.7 : 0, 0); inner.scale.setScalar(Math.min(1, camera.aspect * 1.15)); view.dist = 9.5; view.pitch = .12; say('体をほどくと、受けとり方は一粒の露になる。\nほかの露が、ここに映る。', 7500); }
  else { view.tgt.set(0, 1.3, -2); view.dist = MOBILE ? 9.5 : 8; say(rel > .6 ? 'どれも中心ではない。映し合い、場を変え、変わった場がまた受けとられる。その全体が、ひとつの網。' : '露を体へ戻す。同じ参道が、重なって見える。', 9000); }
}

// 環境の写し（露の映り込み）：はじめと碧が来たときだけ
function refreshInner() { const o = outer.visible; outer.visible = true; inner.visible = true; innerLayers.forEach(v => v.visible = false); cubeCam2.position.set(0, 0, 0); for (let k = 0; k < 2; k++) { cubeCam2.update(renderer, scene); } innerLayers.forEach(v => v.visible = true); outer.visible = o; inner.visible = mode === 'inner'; }
function refreshEnv(once = false) { const was = inner.visible; inner.visible = false; drops.visible = false; outer.visible = true; cubeCam.position.set(0, 1.5, -2); cubeCam.update(renderer, scene); drops.visible = true; if (!once) cubeCam.update(renderer, scene); /* 二度目は露を写したまま＝露どうしが映り合う */ outer.visible = mode === 'outer'; inner.visible = was; }

// ───────── 毎こま ─────────
const clock = new THREE.Clock(); const v3b = new THREE.Vector3(); const tmpC = new THREE.Color(), white = new THREE.Color(1, 1, 1), tm = new THREE.Matrix4(), v3 = new THREE.Vector3();
let said2 = false, saidEnd = false;
function frame() {
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
  // 相対化の進み：触れた数と内外の往き来で進む（ゆっくり）
  const target = Math.min(1, touched.size / 8 + (touched.has('drop') ? .1 : 0));
  if (!/[?&]rel=1/.test(location.search)) rel += (target - rel) * dt * .4;
  if (!said2 && t > 9 && mode === 'outer') { said2 = true; say('触れると、その受けとり方が濃くなる。木のあいだの糸の露にも。', 6500); }
  if (!saidEnd && rel > .85) { saidEnd = true; setTimeout(() => say('受けとり、覚え、意味をつける。その働きが場に戻る。一人の受けとり方は、網の目の一つ。', 10000), 800); }
  for (let i = 0; i < SUBJ.length; i++) focus[i] = Math.max(0, focus[i] - dt * .12);

  if (mode === 'outer') {
    veils.forEach((v, i) => { const u = v.material.uniforms; u.uT.value = t; u.uR.value = rel; u.uI.value = .45 + focus[i] * 1.8 + rel * .3; });
    // 流れ：前半＝場から主体へ（受けとる）、後半＝主体から場へ（働き）
    for (let i = 0; i < SUBJ.length; i++) { tmpC.set(SUBJ[i].col).lerp(white, .3); for (let j = 0; j < FN; j++) { const k = i * FN + j; fT[k] = (fT[k] + dt * (.08 + focus[i] * .25)) % 1; const back = j % 2; const tt = back ? 1 - fT[k] : fT[k]; curves[i].getPoint(tt, v3); fPos.set([v3.x, v3.y, v3.z], k * 3); const a = (.25 + focus[i] * .9 + rel * .35) * Math.sin(Math.PI * fT[k]); fCol.set([tmpC.r * a, tmpC.g * a, tmpC.b * a], k * 3); } }
    fGeo.attributes.position.needsUpdate = fGeo.attributes.color.needsUpdate = true;
    field.material.opacity = .18 + rel * .35 + Math.sin(t * .8) * .04;
    absLine.forEach((l, i) => l.material.opacity = .12 + focus[i] * .6 + rel * .25);
    // 露のさざ波（一つ→多く）
    if (rippleFrom >= 0) { rippleT += dt; const o = DROPS[rippleFrom]; DROPS.forEach((p, i) => { const d = p.distanceTo(o); const w = Math.exp(-Math.pow((d - rippleT * 4) * 1.6, 2)); dGlow[i] = Math.max(dGlow[i], w); }); if (rippleT > 6) rippleFrom = -1; }
    for (let i = 0; i < DROPS.length; i++) { dGlow[i] *= 1 - dt * 1.2; const g = 1 + dGlow[i] * 3; drops.setColorAt(i, tmpC.setRGB(g, g, g * 1.05)); tm.makeScale(1 + dGlow[i] * .5, .9 + dGlow[i] * .45, 1 + dGlow[i] * .5); tm.setPosition(DROPS[i]); drops.setMatrixAt(i, tm); }
    drops.instanceColor.needsUpdate = drops.instanceMatrix.needsUpdate = true;
    for (const k in bodies) bodies[k].userData.animate?.(t, k === 'bee' || k === 'worm');
    if (bodies.bird) { bodies.bird.position.y = SUBJ[0].pos[1] + Math.sin(t * 1.7) * .03; bodies.bird.rotation.y = Math.sin(t * .4) * .8; }
    if (bodies.bee) { const b = bodies.bee; b.position.set(SUBJ[1].pos[0] + Math.sin(t * .9) * .5, SUBJ[1].pos[1] + Math.sin(t * 2.3) * .12, SUBJ[1].pos[2] + Math.cos(t * .7) * .4); b.rotation.y = t * .9; }
    if (bodies.worm) bodies.worm.rotation.y = t * .05;
    if (AM) { AM.lookAt(camera.position); AM.update(dt, camera); }
  } else {
    innerLayers.forEach((v, i) => { const u = v.material.uniforms; u.uT.value = t * (1 + i * .3); u.uI.value = 1.3 - rel * .8; v.rotation.y = t * .03 * (i + 1); });
    kPts.visible = false;
    // 自分の露は大きく真ん中寄りから、相対化とともにほかと同じ大きさ・同じ輪の上へ
    iDrops.forEach((d, i) => { const self = i === HUMAN; const s = self ? THREE.MathUtils.lerp(1.15, .9, rel) : THREE.MathUtils.lerp(.75, 1, rel); d.scale.setScalar(s * (1 + focus[i] * .35)); d.children[0].material.opacity = .25 + focus[i] * .6 + rel * .2; });
    iLinks[0].material.opacity = 0; netLines.material.opacity = .16 + rel * .2;
    selfRing.lookAt(camera.position); selfRing.material.opacity = .3 + .15 * Math.sin(t * 1.2);
    REF.forEach(([i, j], k) => { const a = iDrops[i], b = iDrops[j]; v3.subVectors(b.position, a.position).normalize().multiplyScalar(.32 * a.scale.x * .92).add(a.position); rPos.set([v3.x, v3.y, v3.z], k * 3); });
    rGeo.attributes.position.needsUpdate = true;
    for (let i = 0; i < SUBJ.length; i++) { tmpC.set(SUBJ[i].col).lerp(white, .35); const P = v3b.copy(iDrops[i].position); for (let j = 0; j < iFN; j++) { const k = i * iFN + j; iT[k] = (iT[k] + dt * (.1 + focus[i] * .3)) % 1; const back = j % 3 === 0; const tt = back ? 1 - iT[k] : iT[k]; v3.copy(P).multiplyScalar(1 - tt); v3.y += Math.sin(tt * Math.PI) * .4; iPos.set([v3.x, v3.y, v3.z], k * 3); const a = (.3 + focus[i] + rel * .3) * Math.sin(Math.PI * iT[k]); iCol.set([tmpC.r * a, tmpC.g * a, tmpC.b * a], k * 3); } }
    iGeo.attributes.position.needsUpdate = iGeo.attributes.color.needsUpdate = true;
  }

  // 音：触れた主体の声部だけが鳴る。近いほど大きく、画面の左右に定位
  { const lv = [], pn = []; for (let i = 0; i < SUBJ.length; i++) { const id = SUBJ[i].id; const on = touched.has(id) || touched.has('in_' + id); let P = mode === 'outer' ? v3.set(...SUBJ[i].pos) : v3.copy(iDrops[i].position); const dist = P.distanceTo(camera.position); P = P.clone().project(camera); const behind = P.z > 1; pn.push(behind ? -P.x : P.x); lv.push(on ? (.3 + focus[i] * .7) * Math.min(1, 6 / dist) * (behind ? .6 : 1) : 0); } AU.update(lv, pn, mode === 'inner', rel); }
  // 外⇄内：霞を濃くして入れ替える
  if (transDir) {
    trans += dt / .9; const k = trans < 1 ? trans : 2 - trans;
    scene.fog.density = (mode === 'outer' ? .045 : .05) + k * .45; view.dist *= mode === 'outer' && trans < 1 ? .985 : 1;
    if (mode === 'outer') { // 具体→抽象：体から露が離れて集まり、層は縮む
      const c = view.tgt; absDrops.forEach((d, i) => { const to = iDrops[i].position.clone().multiplyScalar(.35).add(c); d.position.lerpVectors(absHome[i], to, k * k * (3 - 2 * k)); d.scale.setScalar(1 + k * 2.5); });
      veils.forEach((v, i) => v.material.uniforms.uI.value *= (1 - k));
    }
    if (trans >= 1 && transDir === 1) { transDir = 2; swapMode(); }
    if (trans >= 2) { transDir = 0; scene.fog.density = mode === 'outer' ? .045 : .05; if (mode === 'inner') { scene.background.copy(INNER_BG); scene.fog.color.copy(INNER_BG); refreshInner(); } absDrops.forEach((d, i) => { d.position.copy(absHome[i]); d.scale.setScalar(1); }); }
  }
  const bg = mode === 'outer' ? HAZE : INNER_BG; scene.background.lerp(bg, .08); scene.fog.color.lerp(bg, .08);

  if (!ptrs.size && !transDir) view.yaw += dt * .015;
  const cp = Math.cos(view.pitch); camera.position.set(view.tgt.x + Math.sin(view.yaw) * cp * view.dist, view.tgt.y + Math.sin(view.pitch) * view.dist, view.tgt.z + Math.cos(view.yaw) * cp * view.dist);
  if (mode === 'outer') camera.position.y = Math.max(.35, camera.position.y);
  camera.lookAt(view.tgt);
  renderer.render(scene, camera);
}
window.__t.push(['built', performance.now()]);
refreshEnv(true);
window.__t.push(['env', performance.now()]);
renderer.setAnimationLoop(frame);
// 内の空間の材質は、はじめのこまのあとで静かに組んでおく（起動を重くしない）
setTimeout(() => { if (mode !== 'outer' || !renderer.compileAsync) return; inner.visible = true; renderer.compileAsync(inner, camera, scene).catch(() => {}); inner.visible = false; }, 1200);
requestAnimationFrame(() => { const l = document.getElementById('ld'); l.style.opacity = 0; setTimeout(() => l.remove(), 500); say('ここは参道。鳥も、蜂も、木も、計る器も、それぞれの受けとり方で同じ場所にいる。', 7000); });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.fov = innerWidth < 760 ? 58 : 48; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
// 写真の質感が届いたら露の写しを撮り直す
THREE.DefaultLoadingManager.onLoad = () => refreshEnv();
