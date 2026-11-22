/* deep.js ── Qualia/deep：足もとの地面を透かして、土の中（根・菌糸・ミミズ・土の層）を重ねる模式。 */
import { create, THREE, hash1 } from './kit/qfield.js';

export function start(canvas) {
  const mob = matchMedia('(max-width:760px)').matches;
  const F = create(canvas, { pitch: -.18, pitchMin: -1.35 });
  const C = new THREE.Vector3(mob ? .6 : 1.4, 0, mob ? 1.7 : 1.5), RMAX = mob ? 1.35 : 1.75, DEP = 1.4;
  const uC = { value: C }, uR = { value: 0 };
  // 地面と参道：透かす円の内側を抜き、縁を淡く光らせる
  const hole = { key: 'dhole', vary: true, uniforms: { uC, uR }, pars: 'uniform vec3 uC; uniform float uR;',
    albedo: '{ float d_ = length( vQW.xz - uC.xz ); if ( d_ < uR ) discard; diffuseColor.rgb = mix( diffuseColor.rgb, vec3( .95, .86, .62 ), ( 1. - smoothstep( 0., .06, d_ - uR ) ) * step( .01, uR ) * .8 ); }' };
  F.patch(F.gMat, hole); F.patch(F.pMat, Object.assign({}, hole, { key: 'dhole2' }));
  // 中だけを見せる（円筒の外は描かない）
  const inside = k => ({ key: 'din' + k, vary: true, uniforms: { uC, uR }, pars: 'uniform vec3 uC; uniform float uR;', albedo: 'if ( length( vQW.xz - uC.xz ) > uR - .01 ) discard; diffuseColor.rgb = mix( diffuseColor.rgb, vec3( .2, .14, .1 ), clamp( -vQW.y * .5, 0., .55 ) );' });

  // 土の層の壁（上から：落ち葉・黒い表土〔黒ボク土〕・明るい褐色のローム層。厚さは模式）
  const wc = document.createElement('canvas'); wc.width = 512; wc.height = 512; { const g = wc.getContext('2d');
    const band = (y0, y1, c) => { g.fillStyle = c; g.fillRect(0, y0, 512, y1 - y0); };
    band(0, 12, '#5a4632'); band(12, 120, '#2a221c'); band(120, 175, '#4b3626'); band(175, 512, '#8a5a34');
    for (let i = 0; i < 9000; i++) { const y = Math.random() * 512, x = Math.random() * 512, dk = y < 120 ? 20 : y < 175 ? 50 : 110; g.fillStyle = `rgba(${dk + Math.random() * 70 | 0},${dk * .8 + Math.random() * 50 | 0},${dk * .5 + Math.random() * 30 | 0},.55)`; g.fillRect(x, y, 1 + Math.random() * 2.5, 1 + Math.random() * 2); }
    for (let i = 0; i < 260; i++) { const y = 20 + Math.random() * 480, x = Math.random() * 512; g.fillStyle = 'rgba(12,8,6,.55)'; g.beginPath(); g.arc(x, y, .8 + Math.random() * 2.2, 0, 7); g.fill(); }   // すき間（孔隙）
    for (let i = 0; i < 40; i++) { const y = 200 + Math.random() * 300, x = Math.random() * 512; g.fillStyle = 'rgba(70,40,20,.5)'; g.fillRect(x, y, 4 + Math.random() * 6, 2 + Math.random() * 4); } }
  const wT = new THREE.CanvasTexture(wc); wT.colorSpace = THREE.SRGBColorSpace; wT.wrapS = THREE.RepeatWrapping; wT.repeat.set(3, 1);
  const wallM = new THREE.MeshStandardMaterial({ map: wT, side: THREE.BackSide, roughness: 1 });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, DEP, 48, 1, true).translate(0, -DEP / 2, 0), wallM); wall.position.copy(C); F.S.add(wall);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#6e4728', roughness: 1 })); floor.position.set(C.x, -DEP, C.z); F.S.add(floor);
  const glow = new THREE.PointLight('#ffe9c8', 0, 4, 1.2); glow.position.set(C.x, -.35, C.z); F.S.add(glow);   // 中を見やすくする光（模式）

  // 根：右の並木の一本（ケヤキ）から伸びる太い根と、表土に多い細い根
  const tree = F.T.filter(t => t.x > 0).sort((a, b) => Math.hypot(a.x - C.x, a.z - C.z) - Math.hypot(b.x - C.x, b.z - C.z))[0];
  const rootM = F.patch(new THREE.MeshStandardMaterial({ color: '#7b5a3e', roughness: .8 }), inside('r'));
  const fineM = F.patch(new THREE.MeshStandardMaterial({ color: '#c9b08a', roughness: .7 }), inside('f'));
  const roots = new THREE.Group(); F.S.add(roots); const tips = [];
  const curve = pts => new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  for (let k = 0; k < 4; k++) { const a = Math.atan2(C.z - tree.z, C.x - tree.x) + (k - 1.5) * .22, L = Math.hypot(C.x - tree.x, C.z - tree.z) + .2, dz = .12 + k * .16;
    const P = []; for (let i = 0; i <= 6; i++) { const s = i / 6; P.push([tree.x + Math.cos(a + Math.sin(s * 5 + k) * .12) * L * s, -(.05 + dz * Math.pow(s, .7) + .08 * Math.sin(s * 9 + k)), tree.z + Math.sin(a + Math.sin(s * 4 + k) * .12) * L * s]); }
    const cv = curve(P); roots.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 40, .028 - k * .004, 6), rootM));
    for (let j = 0; j < 9; j++) { const s = .45 + j * .06, p = cv.getPoint(Math.min(.99, s)); const Q = [[p.x, p.y, p.z]]; let x = p.x, y = p.y, z = p.z; for (let i = 0; i < 4; i++) { x += (hash1(k * 31 + j * 7 + i) - .5) * .35; y -= hash1(k * 13 + j * 3 + i) * .12; z += (hash1(k * 17 + j * 5 + i) - .5) * .35; Q.push([x, y, z]); } tips.push(new THREE.Vector3(x, y, z));
      roots.add(new THREE.Mesh(new THREE.TubeGeometry(curve(Q), 12, .007, 4), fineM)); } }
  // 草の細い根（表土の上 10 cm ほどに密に）
  for (let k = 0; k < (mob ? 40 : 70); k++) { const a = hash1(k * 1.7) * 6.28, r = Math.sqrt(hash1(k * 2.9)) * RMAX * .95, x = C.x + Math.cos(a) * r, z = C.z + Math.sin(a) * r; const Q = [[x, 0, z]]; let y = 0, xx = x, zz = z;
    for (let i = 0; i < 4; i++) { y -= .02 + hash1(k * 7 + i) * .04; xx += (hash1(k * 11 + i) - .5) * .05; zz += (hash1(k * 13 + i) - .5) * .05; Q.push([xx, y, zz]); } roots.add(new THREE.Mesh(new THREE.TubeGeometry(curve(Q), 8, .0025, 3), fineM)); }

  // 菌糸（根の先のまわりに広がる細い糸の網・模式）
  const hp = []; let hs = 0; const rnd = () => hash1(++hs * .731);
  const grow = (x, y, z, dx, dy, dz, n, depth) => { for (let i = 0; i < n; i++) { const nx = x + dx * .05 + (rnd() - .5) * .03, ny = y + dy * .05 + (rnd() - .5) * .02, nz = z + dz * .05 + (rnd() - .5) * .03; hp.push(x, y, z, nx, ny, nz); x = nx; y = ny; z = nz;
      if (depth < 3 && rnd() < .28) { const a = rnd() * 6.28; grow(x, y, z, Math.cos(a), (rnd() - .5) * .6, Math.sin(a), 4 + (rnd() * 4 | 0), depth + 1); } } };
  for (const t of tips) for (let i = 0; i < 3; i++) { const a = rnd() * 6.28; grow(t.x, t.y, t.z, Math.cos(a), (rnd() - .6) * .5, Math.sin(a), 6, 0); }
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3));
  const hM = F.patch(new THREE.LineBasicMaterial({ color: '#f4efe2', transparent: true, opacity: .45 }), inside('h'));
  const hyphae = new THREE.LineSegments(hg, hM); F.S.add(hyphae);

  // ミミズ（フトミミズのなかま・表土に近い所を動く。長さ 10〜15 cm ほど・模式）と、その通り道
  const wormM = F.patch(new THREE.MeshStandardMaterial({ color: '#b0645a', roughness: .45, metalness: 0 }), inside('w'));
  const worms = []; for (let k = 0; k < 4; k++) { const a = hash1(k * 9.1) * 6.28, r = .3 + hash1(k * 4.3) * (RMAX - .6), y = -.06 - hash1(k * 2.2) * .22;
    const base = new THREE.Vector3(C.x + Math.cos(a) * r, y, C.z + Math.sin(a) * r), dir = hash1(k * 6.6) * 6.28;
    const N = 14, pts = []; for (let i = 0; i < N; i++) pts.push(new THREE.Vector3());
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), wormM); F.S.add(mesh); worms.push({ base, dir, pts, mesh, ph: hash1(k) * 6, len: .11 + hash1(k * 3) * .04 }); }
  const burrowM = F.patch(new THREE.MeshStandardMaterial({ color: '#4a3020', roughness: 1 }), inside('b'));
  for (let k = 0; k < 10; k++) { const a = hash1(k * 4.1) * 6.28, r = hash1(k * 7.3) * RMAX * .9, x = C.x + Math.cos(a) * r, z = C.z + Math.sin(a) * r; const Q = [[x, 0, z]]; let xx = x, zz = z, y = 0; for (let i = 0; i < 5; i++) { y -= .05 + hash1(k * 3 + i) * .08; xx += (hash1(k * 5 + i) - .5) * .1; zz += (hash1(k * 9 + i) - .5) * .1; Q.push([xx, y, zz]); } F.S.add(new THREE.Mesh(new THREE.TubeGeometry(curve(Q), 16, .006, 4), burrowM)); }

  const tag = (txt, y) => { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); g.font = '600 26px "Hiragino Kaku Gothic ProN",sans-serif'; g.fillStyle = 'rgba(20,14,10,.6)'; g.fillRect(0, 10, 8 + g.measureText(txt).width + 14, 44); g.fillStyle = '#f2ead8'; g.fillText(txt, 12, 42);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthTest: false, transparent: true, opacity: 0 })); sp.scale.set(mob ? .5 : .72, mob ? .125 : .18, 1); sp.renderOrder = 9; sp.userData.y = y; F.S.add(sp); return sp; };
  const tags = [tag('落ち葉', -.01), tag('黒い表土', -.14), tag('ローム層', -.6)];
  const _a = new THREE.Vector3(); let target = 0, depth = 0;
  F.onFrame = (dt, t) => {
    F.lens.value += (target - F.lens.value) * Math.min(1, dt * 1.6);
    const L = F.lens.value; uR.value = L * RMAX; wall.scale.set(uR.value + .001, 1, uR.value + .001); floor.scale.set(uR.value + .001, 1, uR.value + .001);
    { _a.copy(C).sub(F.cam.position).setY(0).normalize(); const sx = Math.cos(F.look.yaw), sz = -Math.sin(F.look.yaw); for (const s of tags) { s.position.set(C.x + _a.x * uR.value * .9 - sz * 0 + _a.z * uR.value * .55, s.userData.y, C.z + _a.z * uR.value * .9 - _a.x * uR.value * .55); s.material.opacity = Math.max(0, L * 1.4 - .4); s.visible = L > .3; } }
    const on = L > .01; wall.visible = floor.visible = roots.visible = hyphae.visible = on; glow.intensity = 3.5 * L;
    for (const w of worms) { w.mesh.visible = on; if (!on) continue;
      const head = w.ph + t * .05;   // ゆっくり進む（蠕動：のびちぢみ）
      for (let i = 0; i < w.pts.length; i++) { const s = i / (w.pts.length - 1), squeeze = 1 + .18 * Math.sin(t * 2.2 - s * 9), u = head - s * w.len * 6 * squeeze;
        w.pts[i].set(w.base.x + Math.cos(w.dir) * Math.sin(u) * .25 + Math.cos(w.dir + 1.57) * .05 * Math.sin(u * 3), w.base.y + .03 * Math.sin(u * 2), w.base.z + Math.sin(w.dir) * Math.sin(u) * .25 + Math.sin(w.dir + 1.57) * .05 * Math.sin(u * 3)); }
      w.mesh.geometry.dispose(); w.mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(w.pts), 20, .009, 6); }
  };
  return { F, set(v) { target = v ? 1 : 0; F.look.tp = v ? (mob ? -.95 : -.8) : -.18; F.look.ty = v ? (mob ? -.28 : -.42) : 0; }, C };
}
