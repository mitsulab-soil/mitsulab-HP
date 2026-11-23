/* deep.js ── Qualia/deep：足もとの地面を透かして、土の中（根・菌糸・ミミズ・土の層）を重ねる模式。 */
import { create, THREE, hash1 } from './kit/qfield.js';

export function start(canvas) {
  const mob = matchMedia('(max-width:760px)').matches;
  const F = create(canvas, { pitch: -.18, pitchMin: -1.35 });
  const C = new THREE.Vector3(mob ? 0 : 1.4, 0, mob ? 2.35 : 1.5), RMAX = mob ? .8 : 1.75, DEP = 1.4;
  const uC = { value: C }, uR = { value: 0 };
  // 2026-11-23 本人「deep をさらにフォトリアルに」：土・砂・石・樹皮の写真の質感（CC0・Poly Haven／ambientCG。sight と同じ）と、物理ベースの材質
  const TL = new THREE.TextureLoader(), ptex = (nm, rx, ry, srgb = true) => { const t = TL.load('tex/' + nm + '.webp'); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t; };
  const soilImg = new Image(); soilImg.src = 'tex/soil_forest.webp';
  // 地面と参道：透かす円の内側を抜き、縁を淡く光らせる
  const hole = { key: 'dhole', vary: true, uniforms: { uC, uR }, pars: 'uniform vec3 uC; uniform float uR;',
    albedo: '{ float d_ = length( vQW.xz - uC.xz ); if ( d_ < uR ) discard; diffuseColor.rgb = mix( diffuseColor.rgb, vec3( .16, .11, .07 ), ( 1. - smoothstep( 0., .035, d_ - uR ) ) * step( .01, uR ) * .7 ); }' };
  F.patch(F.gMat, hole); F.patch(F.pMat, Object.assign({}, hole, { key: 'dhole2' }));
  // 中だけを見せる（円筒の外は描かない）
  const inside = k => ({ key: 'din' + k, vary: true, uniforms: { uC, uR }, pars: 'uniform vec3 uC; uniform float uR;', albedo: 'if ( length( vQW.xz - uC.xz ) > uR - .01 ) discard; diffuseColor.rgb = mix( diffuseColor.rgb, vec3( .2, .14, .1 ), clamp( -vQW.y * .5, 0., .55 ) );' });

  // 土の層の壁（上から：落ち葉・黒い表土〔黒ボク土〕・明るい褐色のローム層。厚さは模式）
  const wc = document.createElement('canvas'); wc.width = 1024; wc.height = 1024;
  const paintWall = () => { const g = wc.getContext('2d'), W = 1024, H = 1024;
    // 層の境は水平な線でなく、ゆらぐ線（模式）。上から：落ち葉（O）・黒い表土〔黒ボク土〕（A）・漸移層・ローム層（B）
    const edge = (y, amp, f, ph) => x => y + amp * (Math.sin(x / W * 6.28 * f + ph) * .6 + Math.sin(x / W * 6.28 * f * 2.7 + ph * 1.9) * .4);
    const E = [edge(0, 0, 1, 0), edge(22, 5, 3, .3), edge(330, 18, 2, 1.1), edge(430, 22, 3, 2.4), edge(H, 0, 1, 0)], cols = ['#4a3826', '#2b2219', '#3a2c20', '#6b5038'];
    for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(0, E[k](0)); for (let x = 0; x <= W; x += 8) g.lineTo(x, E[k](x)); for (let x = W; x >= 0; x -= 8) g.lineTo(x, E[k + 1](x)); g.closePath(); g.fillStyle = cols[k]; g.fill(); }
    if (soilImg.complete && soilImg.naturalWidth) { g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = .9; for (let y = 0; y < H; y += 256) for (let x = 0; x < W; x += 256) g.drawImage(soilImg, x, y, 256, 256); g.restore();
      g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = .55; for (let y = 0; y < H; y += 512) for (let x = 0; x < W; x += 512) g.drawImage(soilImg, x, y, 512, 512); g.restore(); }
    const rnd = (i => () => hash1(++i * .913))(0);
    for (let i = 0; i < 14000; i++) { const y = rnd() * H, x = rnd() * W, lo = y > 420, dk = y < 26 ? 60 : lo ? 95 : 22; g.fillStyle = `rgba(${dk + rnd() * 60 | 0},${dk * .72 + rnd() * 40 | 0},${dk * .45 + rnd() * 25 | 0},${.25 + rnd() * .35})`; g.fillRect(x, y, .8 + rnd() * 2.2, .8 + rnd() * 1.8); }   // 粒（団粒）
    for (let i = 0; i < 520; i++) { const y = 30 + rnd() * (H - 40), x = rnd() * W, r = .7 + rnd() * 2.6; g.fillStyle = 'rgba(8,5,3,.6)'; g.beginPath(); g.ellipse(x, y, r * 1.3, r, rnd() * 3, 0, 7); g.fill(); }   // すき間（孔隙）
    for (let i = 0; i < 90; i++) { const y = 380 + rnd() * 620, x = rnd() * W, r = 2 + rnd() * 5; g.fillStyle = `rgba(${150 + rnd() * 40 | 0},${120 + rnd() * 30 | 0},${90 + rnd() * 20 | 0},.55)`; g.beginPath(); g.ellipse(x, y, r * 1.4, r, rnd() * 3, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x + 1, y + r * .5, r * 1.3, r * .4, 0, 0, 7); g.fill(); }   // ロームの中の小さな軽石・礫（模式）
    for (let i = 0; i < 420; i++) { const y = 26 + rnd() * 380, x = rnd() * W; g.fillStyle = `rgba(${170 + rnd() * 40 | 0},${140 + rnd() * 30 | 0},${100 + rnd() * 30 | 0},.7)`; g.beginPath(); g.arc(x, y, .8 + rnd() * 1.4, 0, 7); g.fill(); }   // 切れた細い根の断面
    for (let i = 0; i < 90; i++) { let x = rnd() * W, y = 30 + rnd() * 320; g.strokeStyle = `rgba(${150 + rnd() * 50 | 0},${120 + rnd() * 30 | 0},${90 + rnd() * 30 | 0},.55)`; g.lineWidth = .6 + rnd() * .9; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (rnd() - .5) * 14; y += 4 + rnd() * 10; g.lineTo(x, y); } g.stroke(); }   // 壁に見える細い根
    if (window.__deepWT) window.__deepWT.needsUpdate = true; };
  paintWall(); soilImg.onload = paintWall;
  const wT = new THREE.CanvasTexture(wc); wT.colorSpace = THREE.SRGBColorSpace; wT.wrapS = THREE.RepeatWrapping; wT.repeat.set(3, 1); wT.anisotropy = 8; window.__deepWT = wT;
  const wallM = new THREE.MeshStandardMaterial({ map: wT, side: THREE.BackSide, roughness: 1, normalMap: ptex('sand_grit_n', 9, 3, false), normalScale: new THREE.Vector2(1.4, 1.4), bumpMap: wT, bumpScale: 2.2 });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, DEP, 96, 24, true).translate(0, -DEP / 2, 0), wallM); wall.position.copy(C); F.S.add(wall);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#b08a68', map: ptex('soil_forest', 2, 2), normalMap: ptex('sand_grit_n', 4, 4, false), normalScale: new THREE.Vector2(1.6, 1.6), roughness: 1 })); floor.position.set(C.x, -DEP, C.z); F.S.add(floor);
  // 底の土の粒（団粒・小石。大きさ 3〜12 mm・模式）：近寄っても平らな面に見えないように
  const crumbs = (() => { const geo = new THREE.IcosahedronGeometry(1, 1), pa = geo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i); v.multiplyScalar(.78 + hash1(i * 3.7 + v.x * 9) * .4); pa.setXYZ(i, v.x, v.y * .7, v.z); } geo.computeVertexNormals();
    const n = mob ? 420 : 900, im = new THREE.InstancedMesh(geo, F.patch(new THREE.MeshStandardMaterial({ color: '#9a7656', map: ptex('soil_forest', .3, .3), normalMap: ptex('rock_surface_n', .5, .5, false), roughness: 1 }), inside('c')), n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color();
    for (let i = 0; i < n; i++) { const a = hash1(i * 1.31) * 6.28, r = Math.sqrt(hash1(i * 2.17)) * RMAX * .98, z = .003 + Math.pow(hash1(i * 5.3), 2.2) * .009; e.set(hash1(i) * 6, hash1(i * 7) * 6, 0); q.setFromEuler(e); m4.compose(ps.set(C.x + Math.cos(a) * r, -DEP + z * .4, C.z + Math.sin(a) * r), q, sc.set(z * (1 + hash1(i * 9) * .5), z, z)); im.setMatrixAt(i, m4); im.setColorAt(i, col.setHSL(.07 + hash1(i * 4) * .03, .3 + hash1(i * 6) * .2, .22 + hash1(i * 8) * .2)); }
    im.castShadow = im.receiveShadow = true; F.S.add(im); return im; })();
  const glow = new THREE.PointLight('#ffe2bf', 0, 3.2, 1.6); glow.position.set(C.x, -.35, C.z); F.S.add(glow);   // 中を見やすくする光（模式）

  // 根：右の並木の一本（ケヤキ）から伸びる太い根と、表土に多い細い根
  const tree = F.T.filter(t => t.x > 0).sort((a, b) => Math.hypot(a.x - C.x, a.z - C.z) - Math.hypot(b.x - C.x, b.z - C.z))[0];
  const rootM = F.patch(new THREE.MeshStandardMaterial({ color: '#b29274', map: ptex('bark_zelkova', 1, 6), normalMap: ptex('bark_zelkova_n', 1, 6, false), roughnessMap: ptex('bark_zelkova_orm', 1, 6, false), roughness: 1 }), inside('r'));
  const fineM = F.patch(new THREE.MeshPhysicalMaterial({ color: '#c6ab84', roughness: .62, sheen: .4, sheenColor: new THREE.Color('#f0e2c8'), sheenRoughness: .6 }), inside('f'));
  // 先へ行くほど細くする（根は根元が太く先が細い）
  const taper = (geo, seg, rs, k0 = 1, k1 = .25) => { const p = geo.attributes.position, cv = geo.parameters.path, c = new THREE.Vector3(), v = new THREE.Vector3(); for (let i = 0; i <= seg; i++) { cv.getPointAt(i / seg, c); const f = k0 + (k1 - k0) * Math.pow(i / seg, .8); for (let j = 0; j <= rs; j++) { const n = i * (rs + 1) + j; v.fromBufferAttribute(p, n).sub(c).multiplyScalar(f).add(c); p.setXYZ(n, v.x, v.y, v.z); } } geo.computeVertexNormals(); return geo; };
  const roots = new THREE.Group(); F.S.add(roots); const tips = [];
  const curve = pts => new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  for (let k = 0; k < 4; k++) { const a = Math.atan2(C.z - tree.z, C.x - tree.x) + (k - 1.5) * .22, L = Math.hypot(C.x - tree.x, C.z - tree.z) + .2, dz = .12 + k * .16;
    const P = []; for (let i = 0; i <= 6; i++) { const s = i / 6; P.push([tree.x + Math.cos(a + Math.sin(s * 5 + k) * .12) * L * s, -(.05 + dz * Math.pow(s, .7) + .08 * Math.sin(s * 9 + k)), tree.z + Math.sin(a + Math.sin(s * 4 + k) * .12) * L * s]); }
    const cv = curve(P); roots.add(new THREE.Mesh(taper(new THREE.TubeGeometry(cv, 60, .042 - k * .006, 14), 60, 14, 1.2, .3), rootM)); roots.children.at(-1).castShadow = true;
    for (let j = 0; j < 9; j++) { const s = .45 + j * .06, p = cv.getPoint(Math.min(.99, s)); const Q = [[p.x, p.y, p.z]]; let x = p.x, y = p.y, z = p.z; for (let i = 0; i < 4; i++) { x += (hash1(k * 31 + j * 7 + i) - .5) * .35; y -= hash1(k * 13 + j * 3 + i) * .12; z += (hash1(k * 17 + j * 5 + i) - .5) * .35; Q.push([x, y, z]); } tips.push(new THREE.Vector3(x, y, z));
      roots.add(new THREE.Mesh(taper(new THREE.TubeGeometry(curve(Q), 16, .006, 5), 16, 5, 1, .2), fineM)); } }
  // 草の細い根（表土の上 10 cm ほどに密に）
  for (let k = 0; k < (mob ? 40 : 70); k++) { const a = hash1(k * 1.7) * 6.28, r = Math.sqrt(hash1(k * 2.9)) * RMAX * .95, x = C.x + Math.cos(a) * r, z = C.z + Math.sin(a) * r; const Q = [[x, 0, z]]; let y = 0, xx = x, zz = z;
    for (let i = 0; i < 4; i++) { y -= .02 + hash1(k * 7 + i) * .04; xx += (hash1(k * 11 + i) - .5) * .05; zz += (hash1(k * 13 + i) - .5) * .05; Q.push([xx, y, zz]); } roots.add(new THREE.Mesh(taper(new THREE.TubeGeometry(curve(Q), 10, .0024, 4), 10, 4, 1, .2), fineM)); }

  // 菌糸（根の先のまわりに広がる細い糸の網・模式）
  const hp = []; let hs = 0; const rnd = () => hash1(++hs * .731);
  const grow = (x, y, z, dx, dy, dz, n, depth) => { for (let i = 0; i < n; i++) { const nx = x + dx * .05 + (rnd() - .5) * .03, ny = y + dy * .05 + (rnd() - .5) * .02, nz = z + dz * .05 + (rnd() - .5) * .03; hp.push(x, y, z, nx, ny, nz); x = nx; y = ny; z = nz;
      if (depth < 3 && rnd() < .28) { const a = rnd() * 6.28; grow(x, y, z, Math.cos(a), (rnd() - .5) * .6, Math.sin(a), 4 + (rnd() * 4 | 0), depth + 1); } } };
  for (const t of tips) for (let i = 0; i < 3; i++) { const a = rnd() * 6.28; grow(t.x, t.y, t.z, Math.cos(a), (rnd() - .6) * .5, Math.sin(a), 6, 0); }
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3));
  const hM = F.patch(new THREE.LineBasicMaterial({ color: '#efe8d6', transparent: true, opacity: .3 }), inside('h'));
  const hyphae = new THREE.LineSegments(hg, hM); F.S.add(hyphae);

  // ミミズ（フトミミズのなかま・表土に近い所を動く。長さ 10〜15 cm ほど・模式）と、その通り道
  const segT = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 16; const g = c.getContext('2d'); g.fillStyle = '#a86058'; g.fillRect(0, 0, 512, 16);
    for (let i = 0; i < 110; i++) { const x = i / 110 * 512; g.fillStyle = 'rgba(70,30,28,.45)'; g.fillRect(x, 0, 1.4, 16); }   // 体節の環（フトミミズのなかまは 100 前後の体節）
    g.fillStyle = 'rgba(205,140,120,.85)'; g.fillRect(512 * .12, 0, 512 * .05, 16);   // 環帯（頭に近い、ふくらんだ明るい帯）
    const gr = g.createLinearGradient(0, 0, 0, 16); gr.addColorStop(0, 'rgba(60,25,25,.35)'); gr.addColorStop(.5, 'rgba(255,200,190,.12)'); gr.addColorStop(1, 'rgba(60,25,25,.35)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 16);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; })();
  const wormM = F.patch(new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: segT, roughness: .5, clearcoat: .9, clearcoatRoughness: .25, sheen: .3, sheenColor: new THREE.Color('#e6a89a') }), inside('w'));
  const worms = []; for (let k = 0; k < 4; k++) { const a = hash1(k * 9.1) * 6.28, r = .3 + hash1(k * 4.3) * (RMAX - .6), y = -.06 - hash1(k * 2.2) * .22;
    const base = new THREE.Vector3(C.x + Math.cos(a) * r, y, C.z + Math.sin(a) * r), dir = hash1(k * 6.6) * 6.28;
    const N = 14, pts = []; for (let i = 0; i < N; i++) pts.push(new THREE.Vector3());
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), wormM); F.S.add(mesh); worms.push({ base, dir, pts, mesh, ph: hash1(k) * 6, len: .13 + hash1(k * 3) * .04 }); }
  const burrowM = F.patch(new THREE.MeshStandardMaterial({ color: '#2e1e14', roughness: 1, normalMap: ptex('sand_grit_n', 2, 2, false) }), inside('b'));
  for (let k = 0; k < 10; k++) { const a = hash1(k * 4.1) * 6.28, r = hash1(k * 7.3) * RMAX * .9, x = C.x + Math.cos(a) * r, z = C.z + Math.sin(a) * r; const Q = [[x, 0, z]]; let xx = x, zz = z, y = 0; for (let i = 0; i < 5; i++) { y -= .05 + hash1(k * 3 + i) * .08; xx += (hash1(k * 5 + i) - .5) * .1; zz += (hash1(k * 9 + i) - .5) * .1; Q.push([xx, y, zz]); } F.S.add(new THREE.Mesh(new THREE.TubeGeometry(curve(Q), 16, .006, 4), burrowM)); }

  const tag = (txt, y) => { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); g.font = '600 26px "Hiragino Kaku Gothic ProN",sans-serif'; g.fillStyle = 'rgba(20,14,10,.6)'; g.fillRect(0, 10, 8 + g.measureText(txt).width + 14, 44); g.fillStyle = '#f2ead8'; g.fillText(txt, 12, 42);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthTest: false, transparent: true, opacity: 0 })); sp.scale.set(mob ? .78 : .72, mob ? .195 : .18, 1); sp.renderOrder = 9; sp.userData.y = y; F.S.add(sp); return sp; };
  const tags = [tag('落ち葉', -.01), tag('黒い表土', -.2), tag('ローム層', -.7)];
  const _a = new THREE.Vector3(); let target = 0, depth = 0;
  F.onFrame = (dt, t) => {
    F.lens.value += (target - F.lens.value) * Math.min(1, dt * 1.6);
    const L = F.lens.value; uR.value = L * RMAX; wall.scale.set(uR.value + .001, 1, uR.value + .001); floor.scale.set(uR.value + .001, 1, uR.value + .001);
    { _a.copy(C).sub(F.cam.position).setY(0).normalize(); const sx = Math.cos(F.look.yaw), sz = -Math.sin(F.look.yaw); for (const s of tags) { s.position.set(C.x + _a.x * uR.value * .9 - sz * 0 + _a.z * uR.value * (mob ? .05 : .55), s.userData.y, C.z + _a.z * uR.value * .9 - _a.x * uR.value * (mob ? .05 : .55)); s.material.opacity = Math.max(0, L * 1.4 - .4); s.visible = L > .3; } }
    const on = L > .01; wall.visible = floor.visible = crumbs.visible = roots.visible = hyphae.visible = on; glow.intensity = 1.6 * L;
    for (const w of worms) { w.mesh.visible = on; if (!on) continue;
      const head = w.ph + t * .05;   // ゆっくり進む（蠕動：のびちぢみ）
      for (let i = 0; i < w.pts.length; i++) { const s = i / (w.pts.length - 1), squeeze = 1 + .18 * Math.sin(t * 2.2 - s * 9), u = head - s * w.len * 6 * squeeze;
        w.pts[i].set(w.base.x + Math.cos(w.dir) * Math.sin(u) * .25 + Math.cos(w.dir + 1.57) * .05 * Math.sin(u * 3), w.base.y + .03 * Math.sin(u * 2), w.base.z + Math.sin(w.dir) * Math.sin(u) * .25 + Math.sin(w.dir + 1.57) * .05 * Math.sin(u * 3)); }
      w.mesh.geometry.dispose(); w.mesh.geometry = taper(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(w.pts), 28, .012, 10), 28, 10, .85, .55); }
  };
  return { F, set(v) { target = v ? 1 : 0; F.look.tp = v ? (mob ? -.92 : -.8) : -.18; F.look.ty = v ? (mob ? 0 : -.42) : 0; }, C };
}
