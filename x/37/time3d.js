// Qualia/time の 3D：氷川参道の目の高さ。時間の速さだけを変える。形と数は模式（出典は画面の「＋」）。
// three.js r170（MIT）。質感は CC0（Qualia/sight と同じ写真）。生き物・人・水の造形は mitsulab の自作の模式。
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';
import { installSkyFog, groundMottle, landTint, hash1 } from './kit/sight_land.js';

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const LAT = 35.9 * Math.PI / 180;   // 大宮の緯度

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
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 120 }); sun.shadow.bias = -0.0008; sun.shadow.normalBias = .04;
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
  const path = new THREE.Mesh(new THREE.PlaneGeometry(5, 120), pMat); path.rotation.x = -Math.PI / 2; path.position.set(0, .02, -50); path.receiveShadow = true; S.add(path);

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
  const bodyGeo = new THREE.CapsuleGeometry(.2, 1.05, 3, 8); bodyGeo.translate(0, .73, 0);
  const headGeo = new THREE.SphereGeometry(.12, 10, 8); headGeo.translate(0, 1.6, 0);
  const pM = new THREE.MeshStandardMaterial({ roughness: .9, transparent: true }), hM = new THREE.MeshStandardMaterial({ color: '#c9a58a', roughness: .8, transparent: true });
  const pB = new THREE.InstancedMesh(bodyGeo, pM, NP), pH = new THREE.InstancedMesh(headGeo, hM, NP); pB.castShadow = true;
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
    const ab = new THREE.Mesh(new THREE.SphereGeometry(len * .3, 14, 10), bm); ab.scale.set(.8, .8, 1.3); ab.position.z = len * .42; g.add(ab);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(len * .15, 12, 8), new THREE.MeshStandardMaterial({ color: '#1d1a16', roughness: .5 })); hd.position.z = -len * .3; g.add(hd);
    const wm = new THREE.MeshStandardMaterial({ color: '#e9f0f2', transparent: true, opacity: .45, side: THREE.DoubleSide, roughness: .2, depthWrite: false });
    const wg = new THREE.PlaneGeometry(wingL, wingL * .38); wg.translate(wingL / 2, 0, 0);
    const wings = []; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const w = new THREE.Mesh(wg, wm.clone()); w.position.set(s * len * .12, len * .16, len * .05); w.scale.x = s; g.add(w); wings.push({ w, s, k }); }
    return { g, wings, bm };
  };
  const bee = bug(.014, '#8a6a2c', .011); bee.g.position.set(mobile ? .025 : .07, 1.55, 3.74); bee.g.rotation.y = .9; S.add(bee.g);
  { const st = new THREE.Mesh(new THREE.TorusGeometry(.0034, .0012, 6, 16), new THREE.MeshStandardMaterial({ color: '#2b2418' })); st.position.z = .007; bee.g.add(st); }
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
  const oneLeaf = new THREE.Mesh(new THREE.PlaneGeometry(.1, .05), new THREE.MeshStandardMaterial({ map: lcT, alphaTest: .3, side: THREE.DoubleSide, roughness: .6, transparent: true }));   // ケヤキの葉一枚（鋸歯と側脈・模式）
  oneLeaf.position.set(-.06, 1.5, 3.74); oneLeaf.rotation.set(-.9, .5, .2); S.add(oneLeaf);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(.006, .07), new THREE.MeshBasicMaterial({ color: '#fffef2', blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthTest: false }));
  oneLeaf.add(front); front.position.z = .002;

  const snowG = new THREE.BufferGeometry(), SN = 500, sp = new Float32Array(SN * 3); for (let i = 0; i < SN; i++) { sp[i * 3] = (hash1(i) - .5) * 16; sp[i * 3 + 1] = hash1(i * 2.3) * 5; sp[i * 3 + 2] = 4 - hash1(i * 3.1) * 16; }
  snowG.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const dotC = document.createElement('canvas'); dotC.width = dotC.height = 32; { const g = dotC.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }
  const snowM = new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dotC), color: '#e6f2ee', size: .03, transparent: true, opacity: 0, depthWrite: false }); const snow = new THREE.Points(snowG, snowM); S.add(snow);   // 海中を漂う粒（模式）
  const glint = new THREE.Mesh(new THREE.PlaneGeometry(40, 40, 1, 1), new THREE.MeshBasicMaterial({ color: '#cfe7e2', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); glint.rotation.x = Math.PI / 2; S.add(glint);   // 水面のゆらぐ明るさ（模式）
  function size() { const w = innerWidth, h = innerHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < .8 ? 72 : 62; cam.updateProjectionMatrix(); }
  size(); addEventListener('resize', size);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), e = new THREE.Euler(), col = new THREE.Color();
  let tFast = 0, tDay = 0, lastAgo = -1, lastSeason = -1;
  const sunDir = new THREE.Vector3();
  const GREEN = new THREE.Color('#e8f0dc'), YEL = new THREE.Color('#f0d48a'), RED = new THREE.Color('#e0a070'), BUD = new THREE.Color('#d8ecb8');

  let seaF = 0;
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
      const H = 4 + 18 * gk, Wd = .25 + gk * 1.1;
      m4.compose(v3.set(t.x, 0, t.z), q.identity(), s3.set(Wd, gk > .02 ? H : .0001, Wd)); trunks.setMatrixAt(i, m4);
      m4.compose(v3.set(t.x, 0, t.z), q.identity(), s3.set(gc * 1.1 + .0001, gc * 20 + .0001, gc * 1.1 + .0001)); cedars.setMatrixAt(i, m4);
      for (let j = 0; j < LPT; j++) { const o = LO[i * LPT + j], k = i * LPT + j, on = o[4] < dens && gk > .05;
        const cr = (1.8 + 4.6 * gk);
        e.set(o[5] * .3, o[3], o[5] * .2); q.setFromEuler(e);
        m4.compose(v3.set(t.x + o[0] * cr, H * (.32 + o[1] * .68) , t.z + o[2] * cr), q, s3.setScalar(on ? .8 + gk * 1.5 : 0)); leaves.setMatrixAt(k, m4); }
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
    if (avg > .5) sunDir.set(0, 1, .3).normalize();
    sun.position.copy(sun.target.position).addScaledVector(sunDir, 60);
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
    const ab = Math.round(ago * 4) / 4, sk = Math.round(dens * 40);
    if (ab !== lastAgo || sk !== lastSeason) { lastAgo = ab; lastSeason = sk; placeTrees(ago, doy, dens); }
    wind.value = (tFast * 1.0) % 1e3; windAmp.value = 1 - sm(.5, 2.2, n);
    // 人
    const pv = 1 - sm(1.3, 3.2, n), hist = 1 - sm(60, 120, ago);
    pM.opacity = hM.opacity = .4 * pv * hist; pB.visible = pH.visible = pv * hist > .02;
    for (let i = 0; i < NP; i++) { const p = people[i]; const z = -24 - (((p.z0 + p.v * tDay) % 66) + 66) % 66; const bob = Math.abs(Math.sin(tDay * 3.2 + i)) * .03;
      m4.compose(v3.set(p.x, bob, z), q.setFromAxisAngle(s3.set(0, 1, 0), p.v > 0 ? Math.PI : 0), s3.set(1, 1, 1)); pB.setMatrixAt(i, m4); pH.setMatrixAt(i, m4); }
    pB.instanceMatrix.needsUpdate = pH.instanceMatrix.needsUpdate = true;
    // 雲
    const cv = 1 - sm(3.6, 5.2, n); clM.opacity = .25 + .75 * cv; clM.color.copy(col.set('#f4f6f6').multiplyScalar(.35 + .65 * day));
    for (let i = 0; i < NC; i++) { const c = CL[i]; const x = (((c.x + 9 * tDay) + 260) % 520 + 520) % 520 - 260;
      m4.compose(v3.set(x, c.y, c.z), cam.quaternion, s3.set(c.s * (1 + (1 - cv) * 2), c.s * (1 + (1 - cv)), 1)); clouds.setMatrixAt(i, m4); }
    clouds.instanceMatrix.needsUpdate = true;
    // 羽：見かけの回数が毎秒 20 回を超えると、霞んだ扇に
    for (const [b, f, amp] of [[bee, 230, 1.0], [mos, 500, 1.2]]) {
      const fa = f * rate, blur = sm(12, 30, fa), vis = 1 - sm(1.5, 3, n);
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
    // 目：ほんの少しの呼吸と、見回し
    cam.position.y = 1.6 + Math.sin(performance.now() / 1600) * .004;
    cam.rotation.set(-.02 + (n < -1.5 ? -.06 : 0) * (1 - sm(-3, -1.5, n)) - .08 * jomon, yaw - .95 * sm(11, 11.4, n) * (1 - sm(12.1, 12.4, n)), 0, 'YXZ');
    R.render(S, cam);
  }
  return { frame };
}
