// Qualia/time の 3D：氷川参道の目の高さ。時間の速さだけを変える。形と数は模式（出典は画面の「＋」）。
// three.js r170（MIT）。質感は CC0（Qualia/sight と同じ写真）。生き物・人・水の造形は mitsulab の自作の模式。
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';
import { installSkyFog, groundMottle, landTint, hash1 } from './kit/sight_land.js';

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const LAT = 35.9 * Math.PI / 180;   // 大宮の緯度
const ROAD = 4 * Math.PI / 180;   // 参道の向き＝N 約 4° W（一の鳥居側から三の鳥居側へ。OpenStreetMap の参道の線 約 1.4 km で測った）

export function create(canvas) {
  const mobile = matchMedia('(max-width:760px)').matches;
  const R = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  const S = new THREE.Scene();
  const SKY = new THREE.Color('#c9d6dc'), SKYN = new THREE.Color('#2c3846'), WATERFOG = new THREE.Color('#5f8a8a');
  S.background = SKY.clone(); S.fog = new THREE.FogExp2(SKY.clone(), 0.018);
  const cam = new THREE.PerspectiveCamera(62, 1, 0.02, 400); cam.position.set(0, 1.6, 4);
  const hemi = new THREE.HemisphereLight('#dfe9ee', '#4a4030', 1.2); S.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d8', 2.2); sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 120 }); sun.shadow.bias = -0.0008; sun.shadow.intensity = .72; sun.shadow.radius = 3; sun.shadow.normalBias = .04;
  S.add(sun, sun.target); sun.target.position.set(0, 0, -14);
  installSkyFog(THREE, { sun: new THREE.Vector3(-.4, .6, .3) });
  const domeM = new THREE.MeshBasicMaterial({ color: '#c9d6dc', side: THREE.BackSide, fog: true });
  S.add(new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), domeM));

  const tl = new THREE.TextureLoader();
  const tex = (nm, rx, ry) => { const t = tl.load('tex/' + nm + '.webp'); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

  // 地面：台地の上（参道）と、東の見沼の低地へ下る斜面（模式）
  const gGeo = new THREE.PlaneGeometry(900, 900, 96, 96); gGeo.rotateX(-Math.PI / 2);
  { const p = gGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, -9 * sm(45, 95, x) + .25 * Math.sin(x * .07 + z * .05)); } gGeo.computeVertexNormals(); }
  const gMat = new THREE.MeshStandardMaterial({ map: tex('soil_forest', 50, 50), roughness: 1, color: '#b3a68a' });
  groundMottle(gMat, { relief: !mobile });
  const ground = new THREE.Mesh(gGeo, gMat); ground.receiveShadow = true; S.add(ground);
  const pMat = new THREE.MeshStandardMaterial({ map: tex('path_gravel', 2, 50), roughness: 1, color: '#d8d0c0', transparent: true });
  { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
    for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) { const e = Math.min(x, 63 - x) / 64 + (Math.sin(y * .7 + x) * .5 + Math.sin(y * 2.3) * .5) * .025; const a = Math.max(0, Math.min(1, (e - .02) / .16)); g.fillStyle = `rgb(${a * 255 | 0},${a * 255 | 0},${a * 255 | 0})`; g.fillRect(x, y, 1, 1); }
    const am = new THREE.CanvasTexture(c); am.wrapT = THREE.RepeatWrapping; am.repeat.set(1, 30); pMat.alphaMap = am; pMat.alphaTest = 0; pMat.depthWrite = false; }   // 道の縁は砂利が土へまばらに溶ける
  const path = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 120), pMat); path.rotation.x = -Math.PI / 2; path.position.set(0, .02, -50); path.receiveShadow = true; S.add(path);

  // 水（縄文海進・下末吉期の海の模式）
  const wMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, color: '#8fb2ae', roughness: .25, metalness: .1, transparent: true, opacity: .0, depthWrite: false });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), wMat); water.rotation.x = -Math.PI / 2; water.position.y = -12; S.add(water);

  // 並木：ケヤキ（参道の両側）とスギ（昭和の初めまでの並木）。植えた年と大きさは模式
  const T = []; for (let side of [-1, 1]) for (let k = 0; k < 18; k++) { const z = 6 - k * 6.2 + (hash1(k * 3 + side) - .5) * 2; T.push({ x: side * (4.4 + hash1(k + side * 7) * 1.4), z, seed: k * 2 + (side > 0 ? 1 : 0), planted: 55 + hash1(k * 5.1 + side) * 35, life: 180 + hash1(k * 9.7 + side) * 260 }); }
  for (let k = 0; k < (mobile ? 36 : 60); k++) { const side = k % 2 ? 1 : -1; T.push({ x: side * (9 + hash1(k * 4.7) * 26), z: 10 - hash1(k * 6.3) * 120, seed: 40 + k, planted: 60 + hash1(k * 8.1) * 80, life: 180 + hash1(k * 2.9) * 260 }); }   // 参道の外の林（模式）
  const NT = T.length;
  const trunkGeo = new THREE.CylinderGeometry(.22, .42, 1, 9, 1, true); trunkGeo.translate(0, .5, 0);
  const tMat = new THREE.MeshStandardMaterial({ map: tex('bark_zelkova', 1, 4), roughness: .95, color: '#b9aa96' }); landTint(tMat, { amt: .1 });
  const trunks = new THREE.InstancedMesh(trunkGeo, tMat, NT); trunks.castShadow = true; trunks.receiveShadow = true; S.add(trunks);
  const leafT = tl.load('tex/leaf_cluster.webp'); leafT.colorSpace = THREE.SRGBColorSpace;
  const lMat = new THREE.MeshStandardMaterial({ map: leafT, alphaTest: .45, side: THREE.DoubleSide, roughness: .8, color: '#e8f0dc' });
  const wind = { value: 0 }, windAmp = { value: 1 };
  lMat.onBeforeCompile = sh => { sh.uniforms.uW = wind; sh.uniforms.uA = windAmp;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uW, uA;').replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vec3 o_ = instanceMatrix[3].xyz; transformed.x += uA * .06 * sin(uW * 1.7 + o_.x * .8 + o_.y) * position.y; transformed.z += uA * .04 * sin(uW * 2.3 + o_.z); }'); };
  const LPT = mobile ? 60 : 90, leafGeo = new THREE.PlaneGeometry(2.4, 1.4);
  const leaves = new THREE.InstancedMesh(leafGeo, lMat, NT * LPT); leaves.castShadow = !mobile; S.add(leaves);
  const LO = []; for (let i = 0; i < NT * LPT; i++) { const r = hash1(i * 1.37), a = hash1(i * 2.11) * 6.283, h = hash1(i * 3.7); LO.push([Math.cos(a) * r, .55 + h * .45, Math.sin(a) * r, hash1(i * 5.3) * 6.28, hash1(i * 7.9), hash1(i * 4.4) * 3.14]); }
  const cedarGeo = new THREE.ConeGeometry(1.6, 1, 8); cedarGeo.translate(0, .5, 0);
  const cMat = new THREE.MeshStandardMaterial({ color: '#566e48', roughness: .95 }); landTint(cMat, { amt: .14 });
  const cedars = new THREE.InstancedMesh(cedarGeo, cMat, NT); cedars.castShadow = true; S.add(cedars);
  // 遠くの森（低い帯）
  const farM = new THREE.MeshStandardMaterial({ color: '#56664b', roughness: 1 });
  const far = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), farM, 70);
  { const m = new THREE.Matrix4(); for (let i = 0; i < 70; i++) { const s = i % 2 ? 1 : -1; m.compose(new THREE.Vector3(s * (30 + hash1(i) * 25), 3 + hash1(i * 2) * 3, 20 - hash1(i * 3) * 160), new THREE.Quaternion(), new THREE.Vector3(7 + hash1(i * 4) * 4, 6 + hash1(i * 5) * 4, 7)); far.setMatrixAt(i, m); } }
  far.visible = false;

  // 人（参道を歩く・模式）
  const NP = 16, people = [];
  const bodyGeo = new THREE.CapsuleGeometry(.17, .5, 3, 10); bodyGeo.scale(1, 1, .7); bodyGeo.translate(0, 1.2, 0);
  const headGeo = new THREE.SphereGeometry(.12, 10, 8); headGeo.translate(0, 1.6, 0);
  const pM = new THREE.MeshStandardMaterial({ roughness: .9, transparent: true }), hM = new THREE.MeshStandardMaterial({ color: '#c9a58a', roughness: .8, transparent: true });
  const pB = new THREE.InstancedMesh(bodyGeo, pM, NP), pH = new THREE.InstancedMesh(headGeo, hM, NP); pB.castShadow = true;
  const legGeo = new THREE.CapsuleGeometry(.07, .62, 3, 6); legGeo.translate(0, -.38, 0);
  const pL = new THREE.InstancedMesh(legGeo, pM, NP * 2); S.add(pL);
  const armGeo = new THREE.CapsuleGeometry(.05, .5, 3, 6); armGeo.translate(0, -.3, 0); const pA = new THREE.InstancedMesh(armGeo, pM, NP * 2); S.add(pA);
  const cloth = ['#3b4048', '#6d6a60', '#8a7f6b', '#4d5a62', '#5f4e45', '#2e3b3a', '#9c968a'];
  for (let i = 0; i < NP; i++) { people.push({ x: (hash1(i * 3.3) - .5) * 3.6, z0: hash1(i * 1.9) * 66, v: (i % 2 ? 1 : -1) * (1.1 + hash1(i * 6.1) * .4) }); pB.setColorAt(i, new THREE.Color(cloth[i % cloth.length])); }
  S.add(pB, pH);

  // 雲（柔らかい板・模式）
  const cc = document.createElement('canvas'); cc.width = cc.height = 128; { const g = cc.getContext('2d'); for (let k = 0; k < 14; k++) { const x = 30 + Math.random() * 68, y = 50 + Math.random() * 30, r = 18 + Math.random() * 22, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); } }
  const cT = new THREE.CanvasTexture(cc); cT.colorSpace = THREE.SRGBColorSpace;
  const clM = new THREE.MeshBasicMaterial({ map: cT, transparent: true, depthWrite: false, fog: false, color: '#f4f6f6' });
  const NC = 30, clouds = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, .55), clM, NC), CL = [];
  for (let i = 0; i < NC; i++) CL.push({ x: hash1(i * 8.1) * 500 - 250, y: 45 + hash1(i * 2.7) * 30, z: -60 - hash1(i * 4.2) * 160, s: 60 + hash1(i * 3.3) * 70 });
  S.add(clouds);

  // ミツバチ・蚊（目の前でとまる・模式）
  const bug = (len, col, wingL) => {
    const g = new THREE.Group(), bm = new THREE.MeshStandardMaterial({ color: col, roughness: .6 });
    const th = new THREE.Mesh(new THREE.SphereGeometry(len * .22, 14, 10), bm); g.add(th);
    const sc = document.createElement('canvas'); sc.width = 8; sc.height = 64; { const gg = sc.getContext('2d'); for (let y = 0; y < 64; y++) { const b = Math.floor(y / 8) % 2; gg.fillStyle = b ? '#2a2016' : col; gg.fillRect(0, y, 8, 1); } }
    const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace;
    const abM = new THREE.MeshStandardMaterial({ map: st, roughness: .7 });
    const abG = new THREE.SphereGeometry(len * .3, 18, 14); abG.rotateX(Math.PI / 2);
    const ab = new THREE.Mesh(abG, abM); ab.scale.set(.8, .8, 1.35); ab.position.z = len * .44; g.add(ab);
    th.scale.set(1.05, 1, 1.1); bm.roughness = 1; bm.sheen = 1;
    const lm = new THREE.MeshStandardMaterial({ color: '#2a241c', roughness: .6 });
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { const L = new THREE.Mesh(new THREE.CylinderGeometry(len * .018, len * .012, len * .55, 4), lm); L.position.set(sx * len * .16, -len * .2, (k - 1) * len * .14); L.rotation.set(.3 * (k - 1), 0, sx * .9); g.add(L); }
    for (const sx of [-1, 1]) { const A = new THREE.Mesh(new THREE.CylinderGeometry(len * .012, len * .012, len * .45, 4), lm); A.position.set(sx * len * .07, len * .12, -len * .5); A.rotation.set(-1.1, 0, sx * .35); g.add(A); }
    const hd = new THREE.Mesh(new THREE.SphereGeometry(len * .15, 12, 8), new THREE.MeshStandardMaterial({ color: '#1d1a16', roughness: .5 })); hd.position.z = -len * .3; g.add(hd);
    const wm = new THREE.MeshStandardMaterial({ color: '#e9f0f2', transparent: true, opacity: .45, emissive: '#5a6a70', emissiveIntensity: .3, side: THREE.DoubleSide, roughness: .2, depthWrite: false });
    const wg = new THREE.PlaneGeometry(wingL, wingL * .38); wg.translate(wingL / 2, 0, 0);
    const wings = []; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const w = new THREE.Mesh(wg, wm.clone()); w.position.set(s * len * .12, len * .16, len * .05); w.scale.x = s; g.add(w); wings.push({ w, s, k }); }
    return { g, wings, bm };
  };
  const bee = bug(.014, '#8a6a2c', .011); bee.g.position.set(mobile ? .025 : .07, 1.55, 3.74); bee.g.rotation.y = .9; S.add(bee.g);
  { const st = new THREE.Mesh(new THREE.TorusGeometry(.0034, .0012, 6, 16), new THREE.MeshStandardMaterial({ color: '#2b2418' })); st.position.z = .007; bee.g.add(st); }
  // ハチドリ（日本にはいない。羽ばたきの速さを比べるための模式）：毎秒 およそ 50 回で描く
  let hum = null; const mkHum = () => { const g = new THREE.Group(), L = .08;
    const fm = new THREE.MeshStandardMaterial({ color: '#3f7a4a', roughness: .35, metalness: .35 }), dm = new THREE.MeshStandardMaterial({ color: '#2a2a26', roughness: .5 }), wm2 = new THREE.MeshStandardMaterial({ color: '#3b3f36', roughness: .7, transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false });
    const bd = new THREE.Mesh(new THREE.SphereGeometry(L * .2, 16, 12), fm); bd.scale.set(.8, .85, 1.6); g.add(bd);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(L * .17, 12, 8), new THREE.MeshStandardMaterial({ color: '#d9d6c8', roughness: .8 })); bl.scale.set(.75, .7, 1.3); bl.position.set(0, -L * .05, L * .02); g.add(bl);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(L * .13, 14, 10), fm); hd.position.set(0, L * .1, -L * .32); g.add(hd);
    const bk = new THREE.Mesh(new THREE.ConeGeometry(L * .018, L * .4, 6), dm); bk.rotation.x = -Math.PI / 2; bk.position.set(0, L * .09, -L * .6); bk.scale.set(.8, 1.3, .8); g.add(bk);
    const tl = new THREE.Mesh(new THREE.ConeGeometry(L * .09, L * .35, 4), dm); tl.rotation.x = Math.PI / 2 + .5; tl.scale.set(1, .25, 1); tl.position.set(0, -L * .08, L * .42); g.add(tl);
    const ws = new THREE.Shape(); ws.moveTo(0, -L * .05); ws.quadraticCurveTo(L * .45, -L * .1, L * .85, -L * .02); ws.quadraticCurveTo(L * .5, L * .12, 0, L * .06); ws.lineTo(0, -L * .05);
    const wg2 = new THREE.ShapeGeometry(ws, 6); const wings = [];
    for (const s of [-1, 1]) { const w = new THREE.Mesh(wg2, wm2.clone()); w.position.set(s * L * .1, L * .1, -L * .05); w.scale.x = s; g.add(w); wings.push({ w, s, k: 0 }); }
    g.rotation.x = .5; g.position.set(mobile ? -.1 : -.3, 1.5, 3.2); g.rotation.y = -.5; g.visible = false; S.add(g); return { g, wings }; };   // ハチドリ（模式）。帯に近づいてから組み立てる
  const mos = bug(.006, '#4a4038', .0055); mos.g.position.set(-.06, 1.62, 3.8); mos.g.rotation.y = -.6; S.add(mos.g);

  // 自分の前腕と神経（模式）
  const arm = new THREE.Group(); const armM = new THREE.MeshStandardMaterial({ color: '#c49c80', roughness: .7, transparent: true });
  const fa = new THREE.Mesh(new THREE.CapsuleGeometry(.032, .26, 4, 12), armM); fa.rotation.z = Math.PI / 2; arm.add(fa);
  const nerveM = new THREE.MeshBasicMaterial({ color: '#f2e6a0', transparent: true, opacity: .0, depthTest: false });
  const nerve = new THREE.Mesh(new THREE.CylinderGeometry(.0018, .0018, .3, 6), nerveM); nerve.rotation.z = Math.PI / 2; nerve.position.y = .03; arm.add(nerve);
  const pulse = new THREE.Mesh(new THREE.SphereGeometry(.007, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff7cf', transparent: true, depthTest: false })); pulse.position.y = .03; arm.add(pulse);
  cam.add(arm); arm.position.set(.06, -.19, -.5); arm.rotation.set(.35, .5, -.15); S.add(cam);

  // 葉一枚と、光の前面（模式）
  const lc2 = document.createElement('canvas'); lc2.width = 256; lc2.height = 128; { const g = lc2.getContext('2d'); g.fillStyle = '#6f8a4a'; g.beginPath(); g.moveTo(6, 64);
    for (let i = 0; i <= 24; i++) { const x = 6 + i * 10, w = Math.sin(Math.PI * i / 24) ** .8 * 52, tooth = i % 2 ? 4 : 0; g.lineTo(x, 64 - w - tooth); } for (let i = 24; i >= 0; i--) { const x = 6 + i * 10, w = Math.sin(Math.PI * i / 24) ** .8 * 52, tooth = i % 2 ? 4 : 0; g.lineTo(x, 64 + w + tooth); } g.fill();
    g.strokeStyle = 'rgba(220,230,170,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(6, 64); g.lineTo(246, 64); for (let i = 2; i < 23; i += 2) { g.moveTo(6 + i * 10, 64); g.lineTo(26 + i * 10, 64 - 40 * Math.sin(Math.PI * i / 24)); g.moveTo(6 + i * 10, 64); g.lineTo(26 + i * 10, 64 + 40 * Math.sin(Math.PI * i / 24)); } g.stroke(); }
  const lcT = new THREE.CanvasTexture(lc2); lcT.colorSpace = THREE.SRGBColorSpace;
  const olG = new THREE.PlaneGeometry(.1, .05, 12, 4); { const p = olG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -(y * y) * 6 - x * x * 2); } olG.computeVertexNormals(); }
  const oneLeaf = new THREE.Mesh(olG, new THREE.MeshStandardMaterial({ map: lcT, alphaTest: .3, side: THREE.DoubleSide, roughness: .6, transparent: true }));   // ケヤキの葉一枚（鋸歯と側脈・模式）
  oneLeaf.position.set(-.06, 1.5, 3.74); oneLeaf.rotation.set(-.9, .5, .2); S.add(oneLeaf);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(.006, .07), new THREE.MeshBasicMaterial({ color: '#fffef2', blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthTest: false }));
  oneLeaf.add(front); front.position.z = .002;

  const snowG = new THREE.BufferGeometry(), SN = 500, sp = new Float32Array(SN * 3); for (let i = 0; i < SN; i++) { sp[i * 3] = (hash1(i) - .5) * 16; sp[i * 3 + 1] = hash1(i * 2.3) * 5; sp[i * 3 + 2] = 4 - hash1(i * 3.1) * 16; }
  snowG.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const dotC = document.createElement('canvas'); dotC.width = dotC.height = 32; { const g = dotC.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }
  const snowM = new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dotC), color: '#e6f2ee', size: .03, transparent: true, opacity: 0, depthWrite: false }); const snow = new THREE.Points(snowG, snowM); S.add(snow);   // 海中を漂う粒（模式）
  const glint = new THREE.Mesh(new THREE.PlaneGeometry(40, 40, 1, 1), new THREE.MeshBasicMaterial({ color: '#cfe7e2', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); glint.rotation.x = Math.PI / 2; S.add(glint);   // 水面のゆらぐ明るさ（模式）
  // 月：満ち欠けの周期（朔望月 約 29.53 日）。欠けの形は太陽との離角から計算（模式。大きさは見やすく少し大きい）
  const moonU = { uL: { value: new THREE.Vector3(1, 0, 0) }, uA: { value: 1 } };
  const moonM = new THREE.ShaderMaterial({ uniforms: moonU, transparent: true, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 uL; uniform float uA; varying vec3 vN; varying vec3 vP; float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); } float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }\n void main(){ vec3 q = normalize(vP); float m = n3(q*2.2)*.6 + n3(q*6.)*.3 + n3(q*18.)*.1; float alb = mix(.88, 1., smoothstep(.35,.65,m)); float lit = smoothstep(-.12,.14, dot(normalize(vN), normalize(uL))); vec3 c = vec3(.93,.92,.86)*alb*lit + vec3(.08,.1,.13)*(1.-lit); gl_FragColor = vec4(c, uA*lit*.85); }' });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(7, 40, 24), moonM); moon.renderOrder = 2; S.add(moon);
  const SYN = 29.530589;   // 朔望月（日）。国立天文台『理科年表』
  const _mv = new THREE.Vector3(), _ml = new THREE.Vector3(), _ax = new THREE.Vector3();

  function size() { const w = innerWidth, h = innerHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < .8 ? 72 : 62; cam.updateProjectionMatrix(); }
  size(); addEventListener('resize', size);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), e = new THREE.Euler(), col = new THREE.Color();
  let tFast = 0, tDay = 0, lastAgo = -1, lastSeason = -1;
  const sunDir = new THREE.Vector3(), _Y = new THREE.Vector3(0, 1, 0);
  // 影の先の道すじ：一本のケヤキの影の先が、その日に地面に描く弧（日時計の線・模式）
  const TR = 60, trP = new Float32Array(TR * 3), trG = new THREE.BufferGeometry(); trG.setAttribute('position', new THREE.BufferAttribute(trP, 3)); trG.setDrawRange(0, 0);
  const trM = new THREE.LineBasicMaterial({ color: '#f2ead2', transparent: true, opacity: 0, depthWrite: false }); const trail = new THREE.Line(trG, trM); trail.frustumCulled = false; S.add(trail);
  const tipM = new THREE.Mesh(new THREE.RingGeometry(.18, .3, 24), new THREE.MeshBasicMaterial({ color: '#f2ead2', transparent: true, opacity: 0, depthWrite: false })); tipM.rotation.x = -Math.PI / 2; S.add(tipM);
  const sunAt = (doy, hour, out) => { const dec = -23.44 * Math.PI / 180 * Math.cos(2 * Math.PI * (doy + 10) / 365), H = (hour - 12) * Math.PI / 12;
    const el = Math.asin(Math.sin(LAT) * Math.sin(dec) + Math.cos(LAT) * Math.cos(dec) * Math.cos(H)), az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(LAT) - Math.tan(dec) * Math.cos(LAT));
    return out.set(-Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).applyAxisAngle(_Y, -ROAD); };
  const tipOf = (d, H0, t0, out) => { const hz = Math.max(1e-3, Math.hypot(d.x, d.z)), k = Math.min(16, H0 * hz / Math.max(.05, d.y)) / hz; return out.set(t0.x - d.x * k, .04, t0.z - d.z * k); };
  const _d = new THREE.Vector3(), _p = new THREE.Vector3();
  const GREEN = new THREE.Color('#e8f0dc'), YEL = new THREE.Color('#f0d48a'), RED = new THREE.Color('#e0a070'), BUD = new THREE.Color('#d8ecb8');

  let seaF = 0, gw = 0, gAge = 0;
  // 欅一本の百年（樹高：27 年生 約 14.5 m・45 年生 約 21.9 m＝片倉・奥村 1989 長野県林総研報告 5。45 年より先と芽生えは模式）
  const hOf = a => a < 27 ? .15 + 14.35 * Math.pow(a / 27, 1.15) : a < 45 ? 14.5 + 7.4 * (a - 27) / 18 : 21.9 + 3.6 * (1 - Math.exp(-(a - 45) / 30));
  function placeTrees(ago, season, dens) {
    const deep = sm(900, 1300, ago);   // 古代以前：並木ではなく、生えては消える森（模式）
    for (let i = 0; i < NT; i++) {
      const t = T[i]; let gk, gc;
      const lifeAge = ((ago + t.seed * 37) % t.life) / t.life;   // 森の一本の生と死の巡り（模式）
      const cyc = Math.sin(Math.PI * Math.min(1, lifeAge * 1.15));
      const keyaki = Math.max(0, Math.min(1, (t.planted - ago) / 50));   // 植えてから 50 年でおとな（模式）
      const sugi = ago > t.planted ? (ago < 1000 ? Math.min(1, (ago - t.planted) / 6) : 0) : 0;
      gk = keyaki * (1 - deep) + deep * (t.seed % 3 === 0 ? cyc : 0);
      gc = sugi * (1 - deep); gk *= 1 - seaF; gc *= 1 - seaF;
      let H = 4 + 18 * gk;
      if (i === 3 && gw > .01) { const h = hOf(gAge); H = H * (1 - gw) + h * gw; gk = gk * (1 - gw) + Math.min(1, h / 22) * gw; }
      const Wd = .25 + gk * 1.1;
      m4.compose(v3.set(t.x, 0, t.z), q.identity(), s3.set(Wd, gk > .02 ? H : .0001, Wd)); trunks.setMatrixAt(i, m4);
      m4.compose(v3.set(t.x, 0, t.z), q.identity(), s3.set(gc * 1.1 + .0001, gc * 20 + .0001, gc * 1.1 + .0001)); cedars.setMatrixAt(i, m4);
      for (let j = 0; j < LPT; j++) { const o = LO[i * LPT + j], k = i * LPT + j, on = o[4] < dens && gk > .05;
        const cr = (1.8 + 4.6 * gk);
        e.set(o[5] * .3, o[3], o[5] * .2); q.setFromEuler(e);
        m4.compose(v3.set(t.x + o[0] * cr, H * (.32 + o[1] * .68) , t.z + o[2] * cr), q, s3.setScalar(on ? (i === 3 && gw > .01 ? .35 + gk * .9 : .8 + gk * 1.5) : 0)); leaves.setMatrixAt(k, m4); }
    }
    trunks.instanceMatrix.needsUpdate = cedars.instanceMatrix.needsUpdate = leaves.instanceMatrix.needsUpdate = true;
  }

  function frame(dt, n, rate, ago, yaw) {
    const sd = rate * dt;
    tFast = (tFast + sd) % 1e4;
    if (n < 4.5) tDay += sd; else tDay -= sd;   // 遅い方は過去へ遡る
    // 太陽：10 時半から始める。年の日は 11 月 10 日（314 日目）から
    const doy = (((314 - ago * 365.25 + tDay / 86400) % 365) + 365) % 365;
    const hour = ((10.5 + tDay / 3600) % 24 + 24) % 24;
    const dec = -23.44 * Math.PI / 180 * Math.cos(2 * Math.PI * (doy + 10) / 365), H = (hour - 12) * Math.PI / 12;
    const el = Math.asin(Math.sin(LAT) * Math.sin(dec) + Math.cos(LAT) * Math.cos(dec) * Math.cos(H));
    const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(LAT) - Math.tan(dec) * Math.cos(LAT));
    const avg = sm(4.4, 5.6, n);   // 一日がちらつきに溶ける
    const day = Math.max(.28, sm(-.08, .12, Math.sin(el)) * (1 - avg) + .55 * avg);
    sunDir.set(-Math.sin(az) * Math.cos(el), Math.max(.05, Math.sin(el)), Math.cos(az) * Math.cos(el));   // 参道は南北（−z が北）の模式
    sunDir.applyAxisAngle(_Y, -ROAD);   // 参道（−z）は真北から西へ約 4°
    if (avg > .5) sunDir.set(0, 1, .3).normalize();
    sun.position.copy(sun.target.position).addScaledVector(sunDir, 60);
    { const tv = sm(3.4, 4.2, n) * (1 - sm(5.4, 6, n)); trM.opacity = .7 * tv; tipM.material.opacity = .8 * tv; trail.visible = tipM.visible = tv > .02;
      if (tv > .02) { const t0 = T[1], H0 = 4 + 18 * Math.max(0, Math.min(1, (t0.planted - ago) / 50)); let m = 0;
        for (let k = 0; k < TR; k++) { sunAt(doy, 4 + k * 16 / (TR - 1), _d); if (_d.y < .06) continue; tipOf(_d, H0, t0, _p); trP[m * 3] = _p.x; trP[m * 3 + 1] = _p.y; trP[m * 3 + 2] = _p.z; m++; }
        trG.setDrawRange(0, m); trG.attributes.position.needsUpdate = true;
        if (sunDir.y > .06) { tipOf(sunDir, H0, t0, _p); tipM.position.copy(_p); } else tipM.visible = false; } }
    sun.intensity = 2.3 * day * (1 - .55 * avg); hemi.intensity = .25 + 1.0 * day + .55 * avg;
    sun.castShadow = avg < .95;
    // 水の高さ（模式）：縄文海進は約 6000〜7000 年前に最も高い／下末吉期は約 12〜13 万年前
    const jomon = sm(3500, 6000, ago) * (1 - sm(7000, 9500, ago)), shimo = sm(100000, 112000, ago) * (1 - sm(135000, 150000, ago));
    const lvl = -12 + 10.5 * jomon + 15.7 * shimo; water.position.y = lvl; wMat.opacity = Math.min(.85, (jomon + shimo) * 1.5);
    const under = sm(1.5, 2.6, lvl); wMat.emissive.set('#9cc4c0').multiplyScalar(.7 * under); if (Math.abs(under - seaF) > .02) { seaF = under; lastAgo = -1; }
    const fogC = col.copy(SKYN).lerp(SKY, day).lerp(WATERFOG, under);
    S.fog.color.copy(fogC); S.background.copy(fogC); domeM.color.copy(fogC); S.fog.density = (.018 - .01 * (jomon + shimo) * (1 - under)) + under * .035;
    snowM.opacity = .8 * under; snow.visible = under > .02; snow.position.y = -((performance.now() / 9000) % 1) * .6; glint.visible = under > .02; glint.position.y = lvl - .05; glint.material.opacity = under * (.35 + .15 * Math.sin(performance.now() / 700));
    path.visible = ago < 1300; pMat.opacity = 1 - sm(900, 1300, ago);
    // 季節：葉の量と色。速すぎる年は、量の平均（ちらつき）に
    const yAvg = sm(6.9, 7.9, n);
    let dens, lc;
    if (doy < 95 || doy > 345) { dens = 0; lc = YEL; } else if (doy < 120) { dens = (doy - 95) / 25; lc = BUD; } else if (doy < 290) { dens = 1; lc = GREEN; } else if (doy < 320) { dens = 1 - (doy - 290) / 60; lc = col.copy(GREEN).lerp(YEL, (doy - 290) / 30).clone(); } else { dens = .5 * (1 - (doy - 320) / 25); lc = RED; }
    dens = dens * (1 - yAvg) + .62 * yAvg; lMat.color.copy(yAvg > .5 ? GREEN.clone().lerp(YEL, .3) : lc);
    gw = sm(7.45, 7.75, n) * (1 - sm(8.25, 8.55, n)); if (gw > .01) { gAge = (gAge + rate * dt / 3.156e7) % 100; lastAgo = -1; } else gAge = 0;
    const ab = Math.round(ago * 4) / 4, sk = Math.round(dens * 40);
    if (ab !== lastAgo || sk !== lastSeason) { lastAgo = ab; lastSeason = sk; placeTrees(ago, doy, dens); }
    wind.value = (tFast * 1.0) % 1e3; windAmp.value = 1 - sm(.5, 2.2, n);
    // 人
    const pv = 1 - sm(1.3, 3.2, n), hist = 1 - sm(60, 120, ago);
    pM.opacity = hM.opacity = .4 * pv * hist; pB.visible = pH.visible = pL.visible = pA.visible = pv * hist > .02;
    for (let i = 0; i < NP; i++) { const p = people[i]; const z = -24 - (((p.z0 + p.v * tDay) % 66) + 66) % 66; const bob = Math.abs(Math.sin(tDay * 3.2 + i)) * .03;
      m4.compose(v3.set(p.x, bob, z), q.setFromAxisAngle(s3.set(0, 1, 0), p.v > 0 ? Math.PI : 0), s3.set(1, 1, 1)); pB.setMatrixAt(i, m4); pH.setMatrixAt(i, m4);
      const sw = Math.sin(tDay * 3.2 * 1.6 + i * 1.7) * .45, ry = p.v > 0 ? Math.PI : 0;
      for (let k = 0; k < 2; k++) { const sg = k ? 1 : -1;
        e.set(sw * sg, ry, 0, 'YXZ'); q.setFromEuler(e); m4.compose(v3.set(p.x + Math.cos(ry) * sg * .09, .95 + bob, z), q, s3.set(1, 1, 1)); pL.setMatrixAt(i * 2 + k, m4);
        e.set(-sw * sg * .7, ry, sg * .12, 'YXZ'); q.setFromEuler(e); m4.compose(v3.set(p.x + Math.cos(ry) * sg * .22, 1.42 + bob, z), q, s3.set(1, 1, 1)); pA.setMatrixAt(i * 2 + k, m4); } }
    pB.instanceMatrix.needsUpdate = pH.instanceMatrix.needsUpdate = pL.instanceMatrix.needsUpdate = pA.instanceMatrix.needsUpdate = true;
    // 雲
    const cv = 1 - sm(3.6, 5.2, n); clM.opacity = .25 + .75 * cv; clM.color.copy(col.set('#f4f6f6').multiplyScalar(.35 + .65 * day));
    for (let i = 0; i < NC; i++) { const c = CL[i]; const x = (((c.x + 9 * tDay) + 260) % 520 + 520) % 520 - 260;
      m4.compose(v3.set(x, c.y, c.z), cam.quaternion, s3.set(c.s * (1 + (1 - cv) * 2), c.s * (1 + (1 - cv)), 1)); clouds.setMatrixAt(i, m4); }
    clouds.instanceMatrix.needsUpdate = true;
    // 羽：見かけの回数が毎秒 20 回を超えると、霞んだ扇に
    if (!hum && n > -2.2 && n < .3) hum = mkHum();
    for (const [b, f, amp, hv] of hum ? [[bee, 230, 1.0], [mos, 500, 1.2], [hum, 50, 1.1, 1]] : [[bee, 230, 1.0], [mos, 500, 1.2]]) {
      const fa = f * rate, blur = sm(12, 30, fa), vis = hv ? sm(-1.5, -1.2, n) * (1 - sm(-.7, -.4, n)) : 1 - sm(.9, 1.7, n);
      b.g.visible = vis > .02; 
      for (const { w, s, k } of b.wings) { const ph = 2 * Math.PI * f * tFast;
        const a = blur > .5 ? (k - 1) * amp * .9 : amp * Math.sin(ph) * (k === 0 ? 1 : 0);
        w.rotation.z = s * a; w.visible = blur > .5 || k === 0; w.material.opacity = (blur > .5 ? .16 : .5) * vis; }
    }
    // 神経（自分の前腕・模式）：活動電位の山が毎秒 50 m で走る
    const nv = sm(-5, -4.2, n) * (1 - sm(-1.8, -1.2, n)); armM.opacity = nv; arm.visible = nv > .02; nerveM.opacity = .7 * nv;
    pulse.position.x = ((tFast * 50) % .6) - .15; pulse.visible = Math.abs(pulse.position.x) < .15; pulse.material.opacity = nv;
    // 光の前面が葉を渡る（光速）
    const lv = 1 - sm(-7.8, -6.8, n); front.material.opacity = lv; front.position.x = ((tFast * 3e8) % .2) - .05; front.visible = lv > .02 && Math.abs(front.position.x) < .05;
    oneLeaf.visible = n < -1.5; oneLeaf.material.opacity = 1 - sm(-3, -1.5, n);
    // 月：離角 E（0＝新月・π＝満月）。一日が見分けられる速さでは日周で動き、それより速いと空の一か所で満ち欠けだけを見せる
    { const days = tDay / 86400 - ago * 365.25, E = 2 * Math.PI * ((((days / SYN) + .35) % 1 + 1) % 1);
      const mv = sm(2.6, 3.4, n) * (1 - sm(6.4, 7.0, n)) * (1 - seaF);
      moon.visible = mv > .02;
      if (moon.visible) {
        if (avg < .5) { sunAt((doy + E / (2 * Math.PI) * SYN) % 365, ((hour - E * 12 / Math.PI) % 24 + 24) % 24, _mv); }
        else _mv.set(0, Math.sin(.09), -Math.cos(.09));
        moon.position.copy(cam.position).addScaledVector(_mv, 240);
        // 月から見た太陽の向き：地球からの太陽の向きを、視線の向きを鉛直軸のまわりに離角ぶん回したもの（模式）
        if (avg < .5) _ml.copy(sunDir); else { _ml.copy(_mv).applyAxisAngle(_Y, E); }
        moonU.uL.value.copy(_ml).transformDirection(cam.matrixWorldInverse);
        moonU.uA.value = mv * (_mv.y > -.02 ? 1 : 0) * (avg < .5 ? (1 - .6 * day) + .4 : 1);
      } }
    // 目：ほんの少しの呼吸と、見回し
    cam.position.y = 1.6 + Math.sin(performance.now() / 1600) * .004;
    cam.rotation.set(.26 * gw - .02 + (n < -1.5 ? -.06 : 0) * (1 - sm(-3, -1.5, n)) - .08 * jomon, yaw + .3 * gw - .95 * sm(11, 11.4, n) * (1 - sm(12.1, 12.4, n)), 0, 'YXZ');
    R.render(S, cam);
  }
  return { frame };
}
