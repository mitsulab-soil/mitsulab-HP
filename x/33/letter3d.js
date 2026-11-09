// Qualia/letter の 3D：氷川参道の目の高さ（ミツバチ・ヒヨドリ・ナミアゲハ）。画は模式。
// three.js r170（MIT）。質感は CC0（Qualia/sight と同じ写真）。
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';
import { installSkyFog, groundMottle, hash1 } from './kit/sight_land.js';   // 2026-11-10 共通部品の地（sight の写実）

export function create(canvas, TEX) {
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  R.outputColorSpace = THREE.SRGBColorSpace;
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
  const S = new THREE.Scene();
  const SKY = new THREE.Color('#c9d6dc');
  S.background = SKY.clone(); S.fog = new THREE.FogExp2(SKY.clone(), 0.045);
  const cam = new THREE.PerspectiveCamera(70, 1, 0.02, 120);
  const hemi = new THREE.HemisphereLight('#dfe9ee', '#4a4030', 1.25); S.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d8', 2.1); sun.position.set(-8, 14, 6); S.add(sun);
  installSkyFog(THREE, { sun: sun.position });   // 霞と空：地平は明るく・太陽の側は暖かく・上は青く
  { const dome = new THREE.Mesh(new THREE.SphereGeometry(100, 24, 12), new THREE.MeshBasicMaterial({ color: '#c9d6dc', side: THREE.BackSide, fog: true })); S.add(dome); }   // 空＝霞に溶けきった球（単色の背景にしない）

  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tl = new THREE.TextureLoader();
  const tex = (n, rx, ry, srgb = true) => { const t = tl.load(TEX + n + '.webp'); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

  // 地面と参道
  const gMat = new THREE.MeshStandardMaterial({ map: tex('soil_forest', 30, 30), roughness: 1, color: '#9a8f78' });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), gMat); ground.rotation.x = -Math.PI / 2; S.add(ground); groundMottle(gMat, { relief: !matchMedia('(max-width:760px)').matches });   // 地面のむら（土・苔・枯れ草）と凹凸の陰
  const pMat = new THREE.MeshStandardMaterial({ map: tex('path_gravel', 2, 40), roughness: 1, color: '#d8d0c0' });
  const path = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 90), pMat); path.rotation.x = -Math.PI / 2; path.position.y = 0.01; S.add(path);

  // ケヤキの並木（不ぞろいに）
  const bark = tex('bark_zelkova', 1, 4);
  const tMat = new THREE.MeshStandardMaterial({ map: bark, roughness: .95, color: '#b9aa96' });
  const leafT = tl.load(TEX + 'leaf_cluster.webp'); leafT.colorSpace = THREE.SRGBColorSpace;
  const lMat = new THREE.MeshStandardMaterial({ map: leafT, alphaTest: .45, side: THREE.DoubleSide, roughness: .8, color: '#e8f0dc' });
  const leafGeo = new THREE.PlaneGeometry(2.6, 1.45);
  const SUN = sun.position.clone().normalize();
  function crownLight(m, cx0, cy0, cz0, cr) {   // sight の樹（sight_trees.js）と同じ式：樹冠の内側の陰・外側と逆光で葉を透かす
    m.onBeforeCompile = sh => { sh.uniforms.uC = { value: new THREE.Vector4(cx0, cy0, cz0, cr) }; sh.uniforms.uSun = { value: SUN };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCw;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvCw = (modelMatrix * vec4(transformed, 1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec4 uC; uniform vec3 uSun; varying vec3 vCw;').replace('#include <color_fragment>', '#include <color_fragment>\n{ float rr = length((vCw - uC.xyz) * vec3(1., 1.3, 1.)) / uC.w; diffuseColor.rgb *= mix(.62, 1.05, smoothstep(.25, 1., rr)); }').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ vec3 V = normalize(cameraPosition - vCw), O = normalize(vCw - uC.xyz); float back = pow(max(dot(-V, uSun), 0.), 3.), side = .5 + .5 * dot(O, uSun), rim = .35 + .65 * smoothstep(-.2, .8, dot(O, V)); totalEmissiveRadiance += diffuseColor.rgb * vec3(1.15, 1.25, .55) * (.18 * rim + .8 * back * side); }'); };
    m.customProgramCacheKey = () => 'crownLight1'; }
  const _yU = new THREE.Vector3(0, 1, 0);
  function limb(p, d, len, r0, r1, mat) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, 7), mat); m.quaternion.setFromUnitVectors(_yU, d.clone().normalize()); m.position.copy(p).addScaledVector(d.clone().normalize(), len / 2); S.add(m); return m; }
  const trunks = [], TV = [];   // TV＝一本ずつの色の揺らぎ（幹と葉の材質の写し）
  for (let side of [-1, 1]) for (let z = 12; z > -46; z -= 3.2 + rnd() * 2.6) {
    const x = side * (3.4 + rnd() * 2.8), r = .28 + rnd() * .22, h = 13 + rnd() * 5, hv = hash1(x * 3.1 + z * 7.7);
    const tM = tMat.clone(), lM = lMat.clone(); lM.emissive.set('#162210'); crownLight(lM, x, h * .78, z, h * .32); TV.push({ tM, lM, v: .86 + .28 * hv, y: hash1(hv * 91.3) });   // 樹皮の明るさと葉の緑〜黄を一本ずつ
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(r * .55, r, h, 12), tM); tr.position.set(x, h / 2, z); tr.rotation.z = (rnd() - .5) * .06; S.add(tr); trunks.push(tr);
    for (let k = 0; k < 5; k++) { const a = rnd() * 6.283, y = h * .55 + k * 1.2, d = new THREE.Vector3(Math.cos(a) * .8, .55 + rnd() * .3, Math.sin(a) * .8); limb(new THREE.Vector3(x + Math.cos(a) * r * .6, y, z + Math.sin(a) * r * .6), d, 2 + rnd() * 1.2, .04, .1, tM); }   // 枝は幹から斜め上へ（根もとのない枝を作らない）
    for (let k = 0; k < 18; k++) { const l = new THREE.Mesh(leafGeo, lM); l.position.set(x + (rnd() - .5) * 5, h * .55 + rnd() * h * .45, z + (rnd() - .5) * 4); l.rotation.set((rnd() - .5) * 1.6, rnd() * 3.14, (rnd() - .5) * 1.2); l.scale.setScalar(.8 + rnd() * .7); S.add(l); }
  }
  // 鳥居（朱）
  const toriiMat = new THREE.MeshStandardMaterial({ color: '#c23b22', roughness: .7 });
  const torii = new THREE.Group(); const pil = new THREE.CylinderGeometry(.22, .26, 5.2, 16);
  [-2.4, 2.4].forEach(x => { const p = new THREE.Mesh(pil, toriiMat); p.position.set(x, 2.6, 0); torii.add(p); });
  const kas = new THREE.Mesh(new THREE.BoxGeometry(6.8, .36, .5), new THREE.MeshStandardMaterial({ color: '#22201d', roughness: .8 })); kas.position.y = 5.3; torii.add(kas);
  const sh = new THREE.Mesh(new THREE.BoxGeometry(6.2, .3, .42), toriiMat); sh.position.y = 5.0; torii.add(sh);
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(5.6, .24, .24), toriiMat); nuki.position.y = 4.1; torii.add(nuki);
  torii.position.set(0, 0, -12); S.add(torii);

  // 草花（白・黄・赤）。花びらはインスタンス
  const N = 220, petalGeo = new THREE.CircleGeometry(.03, 12); petalGeo.scale(.42, 1, 1); petalGeo.translate(0, .03, 0);
  const petMat = new THREE.MeshStandardMaterial({ roughness: .6, side: THREE.DoubleSide });
  const NP = 8; const petals = new THREE.InstancedMesh(petalGeo, petMat, N * NP);
  const gGeo = new THREE.CircleGeometry(.03, 10); gGeo.scale(.22, .5, 1); gGeo.translate(0, .016, .001); const guides = new THREE.InstancedMesh(gGeo, new THREE.MeshBasicMaterial({ color: '#5a2fa8', side: THREE.DoubleSide, transparent: true, opacity: .75 }), N * NP);
  const centers = new THREE.InstancedMesh(new THREE.SphereGeometry(.007, 8, 6), new THREE.MeshStandardMaterial({ roughness: .7 }), N);
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(.003, .004, 1, 4), new THREE.MeshStandardMaterial({ color: '#4b6b34', roughness: .9 }), N);
  const blades = new THREE.InstancedMesh(new THREE.PlaneGeometry(.012, .3), new THREE.MeshStandardMaterial({ color: '#5d7a3c', side: THREE.DoubleSide, roughness: .9 }), 1400);
  const fl = [], M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), SC = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < N; i++) {
    const near = i < 70, side = near ? 1 : (rnd() < .5 ? -1 : 1), x = near ? 1.3 + rnd() * 2.2 : side * (2.2 + rnd() * 2.6), z = near ? 2.6 - rnd() * 4.5 : 4 - rnd() * 22, h = .18 + rnd() * .35, c = rnd() < .5 ? 0 : (rnd() < .6 ? 1 : 2), s = .8 + rnd() * .9, face = (rnd() - .5) * 1.2;
    fl.push({ x, z, h, c, s, face, ph: rnd() * 6 });
  }
  const HUM = [new THREE.Color('#f3efe6'), new THREE.Color('#efcf3a'), new THREE.Color('#c8343a')];
  const BEE = [new THREE.Color('#8fc6c9'), new THREE.Color('#9fd3a3'), new THREE.Color('#15161b')];
  function placeFlowers(t) {
    let pi = 0;
    fl.forEach((f, i) => {
      const sw = Math.sin(t * 1.3 + f.ph) * .03;
      V.set(f.x, f.h / 2, f.z); E.set(0, 0, sw * .5); Q.setFromEuler(E); SC.set(1, f.h, 1); M.compose(V, Q, SC); stems.setMatrixAt(i, M);
      const cx = f.x + sw * f.h, cy = f.h, cz = f.z;
      E.set(-.5, f.face, 0); const base = new THREE.Quaternion().setFromEuler(E);
      for (let k = 0; k < NP; k++) { const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), k / NP * Math.PI * 2); const q3 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -.35); Q.copy(base).multiply(q2).multiply(q3); SC.setScalar(f.s); V.set(cx, cy, cz); M.compose(V, Q, SC); petals.setMatrixAt(pi, M); SC.setScalar(f.s * (f.c === 1 ? 1 : .001)); M.compose(V, Q, SC); guides.setMatrixAt(pi, M); pi++; }
      SC.setScalar(f.s); V.set(cx, cy + .004, cz); M.compose(V, Q, SC); centers.setMatrixAt(i, M);
    });
    petals.instanceMatrix.needsUpdate = stems.instanceMatrix.needsUpdate = guides.instanceMatrix.needsUpdate = centers.instanceMatrix.needsUpdate = true;
  }
  for (let i = 0; i < 1400; i++) { const side = rnd() < .5 ? -1 : 1; V.set(side * (2.15 + rnd() * 4), .12, 5 - rnd() * 26); E.set((rnd() - .5) * .4, rnd() * 3.14, (rnd() - .5) * .4); Q.setFromEuler(E); SC.set(1, .5 + rnd(), 1); M.compose(V, Q, SC); blades.setMatrixAt(i, M); }
  S.add(petals, guides, centers, stems, blades);

  // 枝と実（ヒヨドリの前）
  const perch = new THREE.Group(); S.add(perch);
  const BL = lMat.clone(); BL.emissive.set('#2e4320'); crownLight(BL, -3.4, 5.9, -1.6, 2.6); TV.push({ tM: tMat.clone(), lM: BL, v: 1.05, y: .3 });   // 枝の葉も樹冠と同じ光（裏から黒く沈まない）
  const berryMat = new THREE.MeshStandardMaterial({ color: '#a8161f', roughness: .28 });   // クロガネモチの実（赤・径 5〜8 mm。見えるよう少し大きめの模式）
  const uvMat = new THREE.MeshStandardMaterial({ color: '#a8161f', roughness: .22, emissive: '#000000' });
  const berries = new THREE.Group();
  { const own = new THREE.Mesh(new THREE.CylinderGeometry(.24, .34, 16, 12), tMat); own.position.set(-5.85, 8, -1.6); S.add(own); const n0 = S.children.length;   // ヒヨドリの止まる木：幹から一本の枝、その先の小枝に実の房（クロガネモチ）
    const p0 = new THREE.Vector3(-5.62, 5.35, -1.6), dir = new THREE.Vector3(1, .14, 0).normalize(), len = 2.3; const BP = [p0.clone()]; { let p = p0.clone(), d = dir.clone(), r = .085; for (let k = 0; k < 4; k++) { const sl = len * .27, r2 = r * .72; limb(p, d, sl, r2, r, tMat); p = p.clone().addScaledVector(d, sl * .97); BP.push(p); d = d.clone().add(new THREE.Vector3(0, .07 + k * .03, (k % 2 ? -.06 : .07))).normalize(); r = r2; } }   // 四つの節で少しずつ上へ曲がり、先へ細くなる   // 先へ細く、途中で少し上へ曲がる
    const TS = [.16, .3, .37, .52, .6, .74, .9]; for (let c = 0; c < 7; c++) { const t = TS[c] + (rnd() - .5) * .05, side = c % 2 ? 1 : -1, base = (() => { const f = Math.min(t, .999) * (BP.length - 1), i = Math.floor(f); return BP[i].clone().lerp(BP[i + 1], f - i); })(), td = new THREE.Vector3(.2 + rnd() * .5, .45 + rnd() * .5, side * (.25 + rnd() * .5)).normalize(), tl = .18 + rnd() * .3, tip = base.clone().addScaledVector(td, tl); limb(base, td, tl, .006, .014, tMat);
      for (let k = 0; k < 8; k++) { const rr = .012 + rnd() * .003, uv = (c * 7 + k) % 3 === 0, m = new THREE.Mesh(new THREE.SphereGeometry(rr, 12, 8), uv ? uvMat : berryMat); m.position.set(tip.x + (rnd() - .5) * .06, tip.y - .03 - rnd() * .04, tip.z + (rnd() - .5) * .06); berries.add(m); const st = new THREE.Mesh(new THREE.CylinderGeometry(.0012, .0012, .05, 4), tMat); st.position.copy(m.position); st.position.y += .026; berries.add(st); }
      for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(.5, .28), BL); l.position.set(tip.x + (rnd() - .5) * .25, tip.y + .04 + rnd() * .12, tip.z + (rnd() - .5) * .25); l.rotation.set(-.9 + (rnd() - .5) * .6, rnd() * 3, (rnd() - .5) * .5); S.add(l); } }
    const moved = S.children.splice(n0); for (const o of moved) { o.parent = null; perch.add(o); } }   // 葉は小枝の先に重なる房。枝と実と葉はヒヨドリの場面だけ（ほかの場面で根もとの見えない枝にしない）
  perch.add(berries);

  let lw = 0, lh = 0, mode = 'bee', human = false, camX = 0;
  const POSE = {
    bee: { p: [1.9, .32, 3.2], l: [1.4, .3, -2], fov: 82 },
    bird: { p: [-3.6, 5.85, .4], l: [-2.6, 4.6, -6], fov: 68 },
    ageha: { p: [1.2, 1.35, 4], l: [0, 2.4, -12], fov: 72 }
  };
  function apply() {
    const bee = mode === 'bee' && !human;
    fl.forEach((f, i) => { const col = bee ? BEE[f.c] : HUM[f.c]; for (let k = 0; k < NP; k++) petals.setColorAt(i * NP + k, col); centers.setColorAt(i, bee ? new THREE.Color('#7a9a5a') : new THREE.Color('#d9a830')); });
    petals.instanceColor.needsUpdate = centers.instanceColor.needsUpdate = true;
    guides.visible = !human && (mode === 'bee' || mode === 'ageha');
    guides.material.color.set(mode === 'bee' ? '#5a2fa8' : '#9a74ff');
    toriiMat.color.set(bee ? '#4a3a35' : '#c23b22'); perch.visible = mode === 'bird'; torii.visible = !(mode === 'bee' && !human);   // ミツバチの便りでは鳥居を見せない（紙の上に黒い板だけがのぞくため。2D の版と同じ）   // ミツバチの目でも鳥居の形は読める暗さに（赤は沈む）
    const sky = bee ? '#9db7c4' : '#c9d6dc'; S.background.set(sky); S.fog.color.set(sky);
    gMat.color.set(bee ? '#6f9a86' : '#9a8f78'); pMat.color.set(bee ? '#9fb7ae' : '#d8d0c0');
    lMat.color.set(bee ? '#bfe3d8' : '#e8f0dc'); tMat.color.set(bee ? '#8fa3a8' : '#b9aa96');
    for (const t of TV) { t.tM.color.copy(tMat.color).multiplyScalar(t.v); t.lM.color.copy(lMat.color).multiplyScalar(.9 + .14 * t.v); if (!bee) t.lM.color.multiply(new THREE.Color(1 + .06 * t.y, 1, 1 - .14 * t.y)); }
    uvMat.emissive.set((mode === 'bird' && !human) ? '#24183a' : '#000000'); uvMat.color.set((mode === 'bird' && !human) ? '#b3222c' : '#a8161f');
    const P = POSE[mode]; cam.fov = P.fov; cam.updateProjectionMatrix();
  }
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  function render(t) {
    if (canvas.clientWidth && (canvas.clientWidth !== lw || canvas.clientHeight !== lh)) { lw = canvas.clientWidth; lh = canvas.clientHeight; resize(); }
    const P = POSE[mode]; const bob = mode === 'ageha' ? Math.sin(t * 5.5) * .06 + Math.sin(t * 1.7) * .12 : mode === 'bee' ? Math.sin(t * 9) * .006 + Math.sin(t * 1.1) * .02 : Math.sin(t * .8) * .01;
    const dx = camX * (mode === 'bird' ? .9 : 1.6), dz = mode === 'bird' ? 0 : -Math.abs(camX) * .6;
    cam.position.set(P.p[0] + dx, P.p[1] + bob, P.p[2] + dz);
    cam.lookAt(P.l[0] + dx * .6, P.l[1] + bob * .5, P.l[2]);
    placeFlowers(t); R.render(S, cam);
  }
  placeFlowers(0); apply();
  return { setMode(m, h) { mode = m; human = h; apply(); }, setCam(x) { camX = x; }, render, resize, has: m => !!POSE[m] };
}
