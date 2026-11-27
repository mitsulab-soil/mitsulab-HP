// tower.js — Qualia/macroscope 天文台 と Qualia/microscope 微文台 の共通部品（2026-11-27）
// 塔の部屋を歩く → 望遠鏡・顕微鏡をのぞく → 指数でつながる大きさを連続してわたる。
// 大きさ・距離・時間の値は一次の出典（下の SRC）。形は事実にもとづく模式。強調しない（実寸の比のまま、見えにくい物は印で示す）。
import * as THREE from 'three';

const C = 299792458, LY = 9.4607e15, AU = 1.495978707e11;
const lg = Math.log10;

/* ---------- 出典 ---------- */
const SRC = {
  nasaP: ['NASA Planetary Fact Sheet', 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/'],
  nasaM: ['NASA Moon Fact Sheet', 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html'],
  iau: ['IAU 2012 Resolution B2（天文単位）', 'https://www.iau.org/static/resolutions/IAU2012_English.pdf'],
  prox: ['NASA Science: Proxima Centauri b', 'https://science.nasa.gov/exoplanet-catalog/proxima-centauri-b/'],
  naojG: ['国立天文台 天文学辞典「天の川銀河」', 'https://astro-dic.jp/milky-way-galaxy/'],
  vera: ['国立天文台 VERA（2020）天の川銀河の中心までの距離', 'https://www.nao.ac.jp/news/science/2020/20200806-mizusawa.html'],
  and: ['NASA Science: Andromeda Galaxy (M31)', 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-31/'],
  bmng: ['地球の画：NASA Earth Observatory Blue Marble: Next Generation', 'https://visibleearth.nasa.gov/collection/1484/blue-marble'],
  kankyo: ['環境省『花粉症環境保健マニュアル 2022』', 'https://www.env.go.jp/chemi/anzen/kafun/manual.html'],
  lib: ['Libbrecht K.G. (2005) The physics of snow crystals. Rep. Prog. Phys. 68, 855', 'https://doi.org/10.1088/0034-4885/68/4/R03'],
  bee: ['Streinzer M. et al. (2013) Sex and caste-specific variation in compound eye morphology of five honeybee species. PLoS ONE 8(2): e57702', 'https://doi.org/10.1371/journal.pone.0057702'],
  para: ['Wichterman R. (1986) The Biology of Paramecium, 2nd ed. Plenum Press', 'https://doi.org/10.1007/978-1-4757-0372-6'],
  fung: ['Fricker M.D. et al. (2017) The Mycelium as a Network. Microbiol. Spectr. 5(3)', 'https://doi.org/10.1128/microbiolspec.FUNK-0033-2017'],
  bnum: ['Milo R., Phillips R. (2015) Cell Biology by the Numbers（大腸菌の大きさ）', 'https://book.bionumbers.org/how-big-is-an-e-coli-cell-and-what-is-its-mass/'],
};

/* ---------- 文字の形 ---------- */
function fmtLen(m) {
  const a = Math.abs(m);
  if (a >= 0.5 * LY) { const y = m / LY; return y >= 1e4 ? '約 ' + (y / 1e4).toLocaleString('ja-JP', { maximumFractionDigits: y >= 1e5 ? 0 : 1 }) + ' 万光年' : '約 ' + y.toLocaleString('ja-JP', { maximumFractionDigits: y < 10 ? 1 : 0 }) + ' 光年'; }
  if (a >= 0.05 * AU) { const u = m / AU; return '約 ' + u.toLocaleString('ja-JP', { maximumFractionDigits: u < 10 ? 1 : 0 }) + ' 天文単位'; }
  if (a >= 1e7) return '約 ' + Math.round(m / 1e7).toLocaleString('ja-JP') + ' 万 km';
  if (a >= 1e3) return '約 ' + Math.round(m / 1e3).toLocaleString('ja-JP') + ' km';
  if (a >= 1) return '約 ' + (m < 10 ? m.toFixed(1) : Math.round(m)) + ' m';
  if (a >= 1e-2) return '約 ' + (m * 100).toFixed(m < 0.1 ? 1 : 0) + ' cm';
  if (a >= 1e-3) return '約 ' + (m * 1e3).toFixed(1) + ' mm';
  if (a >= 1e-6) return '約 ' + Math.round(m * 1e6) + ' μm';
  return '約 ' + (m * 1e9).toFixed(0) + ' nm';
}

/* ---------- 小さな道具 ---------- */
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const dotTex = canvasTex(64, 64, (g, w) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
function rnd(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function ringLine(r, col, op = .55, seg = 256) { const p = []; for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2; p.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); } const m = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op }); m.userData.op = op; return new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), m); }
function marker(col, px) { const m = new THREE.SpriteMaterial({ map: dotTex, color: col, transparent: true, depthWrite: false, sizeAttenuation: false }); m.userData.op = 1; const s = new THREE.Sprite(m); s.scale.set(px / 260, px / 260, 1); return s; }
function label(text, col = '#e9f2f1') { const t = canvasTex(512, 64, (g, w, h) => { g.font = '30px "Hiragino Mincho ProN","Yu Mincho",serif'; g.fillStyle = col; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 6; g.textBaseline = 'middle'; g.fillText(text, 8, h / 2); }); const m = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, sizeAttenuation: false }); m.userData.op = .9; const s = new THREE.Sprite(m); s.scale.set(.3, .0375, 1); s.center.set(-.03, .5); return s; }
function std(col, o = {}) { const m = new THREE.MeshStandardMaterial(Object.assign({ color: col, roughness: .8, metalness: 0, transparent: true }, o)); m.userData.op = o.opacity ?? 1; return m; }
function basic(col, o = {}) { const m = new THREE.MeshBasicMaterial(Object.assign({ color: col, transparent: true }, o)); m.userData.op = o.opacity ?? 1; return m; }

/* ---------- 大きい方：天文台の段 ---------- */
function macroStages(asset) {
  const S = [];
  // 1 参道の欅（模式）
  S.push({ id: 'tree', name: '参道の欅', w: 22, L: lg(30), fact: '天文台の外、参道の欅。高さ 20 m ほどの木（模式）。ここから外へ、視野を十倍ずつ広げる。', time: '光は 1 秒で、この木の高さの約 1,500 万倍を進む', src: [], build() {
    const g = new THREE.Group(), r = rnd(7), bark = std(0x5b4a3c, { roughness: .95 }), leaf = new THREE.PointsMaterial({ color: 0x6f8f4e, size: .012, transparent: true, depthWrite: false }); leaf.userData.op = .9;
    const pts = [];
    function br(p, d, len, rad, n) { const e = p.clone().addScaledVector(d, len); const cyl = new THREE.Mesh(new THREE.CylinderGeometry(rad * .7, rad, len, 6), bark); cyl.position.copy(p).addScaledVector(d, len / 2); cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); g.add(cyl); if (n <= 0) { for (let i = 0; i < 40; i++) pts.push(e.x + (r() - .5) * .09, e.y + (r() - .5) * .07, e.z + (r() - .5) * .09); return; } const k = n > 2 ? 3 : 2; for (let i = 0; i < k; i++) { const nd = d.clone().add(new THREE.Vector3((r() - .5) * 1.1, .25 + r() * .3, (r() - .5) * 1.1)).normalize(); br(e, nd, len * (.62 + r() * .12), rad * .62, n - 1); } }
    br(new THREE.Vector3(0, -.5, 0), new THREE.Vector3(0, 1, 0), .3, .028, 5);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.add(new THREE.Points(pg, leaf));
    const gr = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), std(0x6b6150, { roughness: 1 })); gr.rotation.x = -Math.PI / 2; gr.position.y = -.5; g.add(gr);
    g.userData.unit = 22; return g; } });
  // 2 地球
  S.push({ id: 'earth', name: '地球', w: 12742e3, L: lg(2.2e7), fact: '地球の直径は約 12,742 km。参道の欅は、この球の表面の一点にある。', time: '光は 1 秒で地球を約 7.5 周する', src: ['nasaP', 'bmng'], build() {
    const g = new THREE.Group(); const tex = new THREE.TextureLoader().load(asset('earth')); tex.colorSpace = THREE.SRGBColorSpace;
    const e = new THREE.Mesh(new THREE.SphereGeometry(.5, 96, 64), std(0xffffff, { map: tex, roughness: .9 })); e.rotation.set(.62, -2.45, 0); e.userData.spin = 1; g.add(e);
    const here = marker(0xe8cf96, 9); const lat = 35.9 * Math.PI / 180, lon = 139.63 * Math.PI / 180; here.position.set(.505 * Math.cos(lat) * Math.cos(lon), .505 * Math.sin(lat), -.505 * Math.cos(lat) * Math.sin(lon)); e.add(here);
    g.scale.setScalar(1); g.userData.unit = 12742e3; return g; } });
  // 3 地球と月
  S.push({ id: 'moon', name: '地球と月', w: 2 * 384400e3, L: lg(1.0e9), fact: '月までは平均約 38 万 4 千 km。月は太陽に照らされた半分を、地球からの見る角度で満ち欠けして見せる。満ち欠けの一巡は約 29.5 日。', time: '月の光は約 1.3 秒で届く', src: ['nasaM'], phase: true, build() {
    const g = new THREE.Group(); const R = .5, er = .5 * 6371 / 384400, mr = .5 * 1737.4 / 384400;
    g.add(ringLine(R, 0x9fb8c6, .35));
    const e = new THREE.Mesh(new THREE.SphereGeometry(er, 32, 16), std(0x6f9cc8)); g.add(e); g.add(marker(0x8fc2ea, 7));
    const mo = new THREE.Group(); const m = new THREE.Mesh(new THREE.SphereGeometry(mr, 24, 12), std(0xbdbab2)); mo.add(m); mo.add(marker(0xd9d6cc, 6)); g.add(mo); g.userData.moon = mo; g.userData.R = R;
    const l1 = label('月'); mo.add(l1); const l2 = label('地球'); g.add(l2);
    g.userData.unit = 2 * 384400e3; return g; } });
  // 4 太陽と内側の惑星
  const inner = [['水星', .387, 0xb7a99a], ['金星', .723, 0xe3d3a8], ['地球', 1, 0x8fc2ea], ['火星', 1.524, 0xd08a62]];
  const outer = [['木星', 5.20, 0xd9c09b], ['土星', 9.58, 0xe5d4a2], ['天王星', 19.2, 0xa9d8de], ['海王星', 30.07, 0x7ea3e0]];
  function orbits(list, unitAU, sunPx) { const g = new THREE.Group(); g.add(marker(0xfff1c8, sunPx)); const ls = label('太陽', '#fff1c8'); g.add(ls); g.userData.pl = [];
    list.forEach(([n, a, col], i) => { const R = a / unitAU * .5; g.add(ringLine(R, col, .32)); const p = new THREE.Group(); p.add(marker(col, 6)); p.add(label(n)); g.add(p); g.userData.pl.push({ p, R, per: Math.pow(a, 1.5), ph: i * 1.7 }); });
    return g; }
  S.push({ id: 'inner', name: '太陽と地球', w: 2 * 1.524 * AU, L: lg(3.6 * AU), fact: '地球と太陽のあいだは 1 天文単位＝149,597,870.7 km。惑星は太陽のまわりを回る（回る速さはケプラーの第三法則の比・時間は縮めて表示）。', time: '太陽の光は約 8 分 19 秒で地球に届く', src: ['iau', 'nasaP'], build() { const g = orbits(inner, 1.524, 10); g.rotation.x = .5; g.userData.unit = 2 * 1.524 * AU; return g; } });
  S.push({ id: 'outer', name: '海王星まで', w: 2 * 30.07 * AU, L: lg(70 * AU), fact: '海王星は太陽から約 30 天文単位。地球の軌道は中心の小さな輪の中に入る。', time: '太陽の光は海王星まで約 4 時間 10 分かかる', src: ['nasaP'], build() { const g = orbits(outer, 30.07, 8); g.add(ringLine(.5 / 30.07, 0x8fc2ea, .5)); g.rotation.x = .5; g.userData.unit = 2 * 30.07 * AU; return g; } });
  // 6 近くの恒星（向きは模式・距離は実際の値）
  const near = [['プロキシマ・ケンタウリ', 4.24, 0.3, 0xffb38a], ['バーナード星', 5.96, 2.1, 0xff9c7a], ['シリウス', 8.6, 3.9, 0xe0ecff]];
  S.push({ id: 'stars', name: '近くの恒星', w: 2 * 8.6 * LY, L: lg(22 * LY), fact: '太陽にいちばん近い恒星はプロキシマ・ケンタウリで、約 4.24 光年。太陽系は、この広さでは一点になる（距離は実際の値・向きは模式）。視野の端は 8.6 光年先のシリウス。', time: 'いま見えるプロキシマの光は、約 4.2 年前に出た光', src: ['prox'], build() {
    const g = new THREE.Group(); g.add(marker(0xfff1c8, 8)); g.add(label('太陽', '#fff1c8'));
    near.forEach(([n, d, a, col]) => { const R = d / 8.6 * .5; const p = new THREE.Group(); p.position.set(Math.cos(a) * R, Math.sin(a * 1.7) * R * .25, Math.sin(a) * R); p.add(marker(col, 7)); p.add(label(n)); g.add(p); const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), p.position]), new THREE.LineBasicMaterial({ color: 0x9fb8c6, transparent: true, opacity: .18 })); ln.material.userData.op = .18; g.add(ln); });
    g.rotation.x = .4; g.userData.unit = 2 * 8.6 * LY; return g; } });
  // 7 天の川銀河
  S.push({ id: 'galaxy', name: '天の川銀河', w: 1e5 * LY, L: lg(1.6e5 * LY), fact: '天の川銀河は直径約 10 万光年の円盤（端の数え方で幅がある）。太陽は中心から約 2 万 6 千光年の所にある（渦の形は模式）。', time: '銀河の中心の光は、約 2 万 6 千年前に出た光', src: ['naojG', 'vera'], build() {
    const g = new THREE.Group(), inner = new THREE.Group(); const r = rnd(11), N = innerWidth < 768 ? 16000 : 40000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const arm = i % 4, t = Math.pow(r(), .7), rad = .03 + t * .47, a = arm * Math.PI / 2 + Math.log(rad / .03) / .24 + (r() - .5) * .5 * (1 - t * .3); const s = (r() - .5) * .05 * (1 - t * .5); pos[i * 3] = Math.cos(a) * rad + s; pos[i * 3 + 1] = (r() - .5) * .012 * (1.2 - t); pos[i * 3 + 2] = Math.sin(a) * rad + s; const w = 1 - t; col[i * 3] = .75 + w * .25; col[i * 3 + 1] = .72 + w * .15; col[i * 3 + 2] = .8 - w * .2; }
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(pos, 3)); ge.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pm = new THREE.PointsMaterial({ size: .004, vertexColors: true, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending, map: dotTex }); pm.userData.op = .8; inner.add(new THREE.Points(ge, pm));
    const bulge = marker(0xfff0d0, 40); inner.add(bulge);
    inner.position.set(-.26, 0, 0); g.add(inner); g.add(marker(0xe8cf96, 8)); g.add(label('太陽', '#e8cf96'));
    g.rotation.x = .55; g.userData.unit = 1e5 * LY; return g; } });
  // 8 アンドロメダ銀河まで
  S.push({ id: 'local', name: 'アンドロメダ銀河', w: 2 * 2.5e6 * LY, L: lg(6.5e6 * LY), fact: 'アンドロメダ銀河までは約 250 万光年。天の川銀河は、ここでは一つの小さな円盤になる。', time: 'いま見えるアンドロメダ銀河の光は、約 250 万年前に出た光', src: ['and'], build() {
    const g = new THREE.Group(); const mw = marker(0xe8e0f0, 10); g.add(mw); g.add(label('天の川銀河'));
    const a = new THREE.Group(); a.position.set(-.3, .38, -.1); a.add(marker(0xe6dccd, 14)); a.add(label('アンドロメダ銀河')); g.add(a);
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), a.position]), Object.assign(new THREE.LineBasicMaterial({ color: 0x9fb8c6, transparent: true, opacity: .2 }), { userData: { op: .2 } })));
    g.userData.unit = 2 * 2.5e6 * LY; return g; } });
  return S;
}

/* ---------- 小さい方：微文台の段 ---------- */
function microStages() {
  const S = [];
  S.push({ id: 'flower', name: '花', w: .03, L: lg(.045), bg: 0x1d2420, fact: '参道の植え込みの花（模式・直径 3 cm ほど）。ここから中へ、視野を十分の一ずつ狭めていく。', src: [], build() {
    const g = new THREE.Group(); const pet = std(0xe9d7e2, { roughness: .7, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(.12, .1, .14, .34, 0, .42); sh.bezierCurveTo(-.14, .34, -.12, .1, 0, 0); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh, 16), pet); m.rotation.z = i / 5 * Math.PI * 2; m.rotation.x = -.12; g.add(m); }
    const r = rnd(3); for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = .03 + r() * .05; const st = new THREE.Mesh(new THREE.CylinderGeometry(.003, .003, .08, 4), std(0xe8e0b0)); st.position.set(Math.cos(a) * d, Math.sin(a) * d, .04); st.rotation.x = Math.PI / 2; g.add(st); const an = new THREE.Mesh(new THREE.SphereGeometry(.009, 8, 6), std(0xd9a83a)); an.position.set(Math.cos(a) * d, Math.sin(a) * d, .08); g.add(an); }
    g.scale.setScalar(1 / .84); g.userData.unit = .03; return g; } });
  S.push({ id: 'snow', name: '雪の結晶', w: .004, L: lg(.006), bg: 0x16202b, fact: '冬、花に落ちた雪の結晶。樹枝状の結晶は直径数 mm で、六つの枝はほぼ同じ形に育つ（模式）。', src: ['lib'], build() {
    const g = new THREE.Group(); const ice = basic(0xdff0ff, { opacity: .85 }); ice.userData.op = .85;
    function arm(rot) { const a = new THREE.Group(); a.rotation.z = rot; const main = new THREE.Mesh(new THREE.PlaneGeometry(.5, .026), ice); main.position.x = .25; a.add(main); for (let k = 1; k <= 5; k++) { const x = k * .08, L = .11 * (1 - k / 7); [1, -1].forEach(s => { const b = new THREE.Mesh(new THREE.PlaneGeometry(L, .016), ice); b.position.set(x + L / 2 * Math.cos(Math.PI / 3), s * L / 2 * Math.sin(Math.PI / 3), 0); b.rotation.z = s * Math.PI / 3; a.add(b); }); } return a; }
    for (let i = 0; i < 6; i++) g.add(arm(i * Math.PI / 3));
    g.add(new THREE.Mesh(new THREE.CircleGeometry(.05, 6), ice)); g.userData.unit = .004; return g; } });
  S.push({ id: 'beeeye', name: 'ミツバチの複眼', w: .0007, L: lg(.0007), bg: 0x1b1712, fact: 'ミツバチ（働きバチ）の複眼の一部。片目に数千の個眼が六角に並び、一つの個眼の直径は 20 μm ほど（模式）。', src: ['bee'], build() {
    const g = new THREE.Group(); const n = 34, f = 1 / n; const geo = new THREE.CircleGeometry(f * .47, 6); const mat = std(0xb08a58, { roughness: .3, metalness: .1 }); const im = new THREE.InstancedMesh(geo, mat, n * n * 2); let k = 0; const o = new THREE.Object3D();
    for (let y = -n / 2; y < n / 2; y++) for (let x = -n / 2; x < n / 2; x++) { const px = (x + (y & 1) * .5) * f, py = y * f * .866; if (px * px + py * py > .25 || k >= im.count) continue; const z = -(px * px + py * py) * .8; o.position.set(px, py, z); o.rotation.set(py * 1.6, -px * 1.6, Math.PI / 6); o.updateMatrix(); im.setMatrixAt(k++, o.matrix); }
    im.count = k; g.add(im); g.userData.unit = .0007; return g; } });
  S.push({ id: 'para', name: 'ゾウリムシ', w: .00022, L: lg(.0003), bg: 0x0f2229, fact: '池の水の中のゾウリムシ。体長 0.2 mm ほどの一つの細胞で、表面の繊毛を波打たせて泳ぐ（模式）。', src: ['para'], build() {
    const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(.5, 48, 24), std(0xa9d6cf, { opacity: .55, roughness: .3 })); body.scale.set(1, .32, .26); g.add(body);
    const nuc = new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 12), std(0x6e8f8a, { opacity: .7 })); nuc.position.set(.05, 0, 0); g.add(nuc);
    const cil = []; for (let i = 0; i < 160; i++) { const a = i / 160 * Math.PI * 2; const x = Math.cos(a) * .5, y = Math.sin(a) * .16; cil.push(x, y, 0, x * 1.06, y * 1.2, 0); }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cil, 3)); const cm = new THREE.LineBasicMaterial({ color: 0xcfeee8, transparent: true, opacity: .5 }); cm.userData.op = .5; const cl = new THREE.LineSegments(cg, cm); g.add(cl); g.userData.cil = cl;
    g.userData.unit = .00022; return g; } });
  S.push({ id: 'pollen', name: 'スギ花粉', w: 3e-5, L: lg(4.2e-5), bg: 0x24221a, fact: 'スギの花粉は直径約 30 μm の球に近い形で、小さな突起（パピラ）が一つある（模式）。', src: ['kankyo'], build() {
    const g = new THREE.Group(); const ge = new THREE.SphereGeometry(.5, 72, 48); const p = ge.attributes.position, r = rnd(5); for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); v.multiplyScalar(1 + .012 * Math.sin(v.x * 61) * Math.sin(v.y * 57) * Math.sin(v.z * 53)); p.setXYZ(i, v.x, v.y, v.z); } ge.computeVertexNormals();
    g.add(new THREE.Mesh(ge, std(0xd8c48e, { roughness: .9 }))); const pa = new THREE.Mesh(new THREE.ConeGeometry(.06, .16, 16), std(0xd8c48e)); pa.position.set(.24, .4, .1); pa.lookAt(.6, 1, .25); pa.rotateX(Math.PI / 2); g.add(pa);
    g.userData.unit = 3e-5; return g; } });
  S.push({ id: 'hypha', name: '土の中の菌糸', w: 1.2e-5, L: lg(1.2e-5), bg: 0x241a12, fact: '土の中の菌糸。太さは数 μm の管で、枝分かれしながら網のように伸び、土の粒をつなぐ（模式）。', src: ['fung'], build() {
    const g = new THREE.Group(); const m = std(0xeee4cf, { roughness: .5 }), r = rnd(9);
    function tube(a, b, rad) { const d = b.clone().sub(a); const c = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, d.length() + rad, 12), m); c.position.copy(a).add(b).multiplyScalar(.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(c); }
    function grow(p, dir, n) { let q = p.clone(); for (let i = 0; i < 6; i++) { dir.add(new THREE.Vector3((r() - .5) * .6, (r() - .5) * .6, (r() - .5) * .2)).normalize(); const nq = q.clone().addScaledVector(dir, .2); tube(q, nq, .07); q = nq; if (n > 0 && r() < .22) grow(q, dir.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), (r() < .5 ? 1 : -1) * .9), n - 1); } }
    grow(new THREE.Vector3(-1.1, -.3, 0), new THREE.Vector3(1, .2, 0), 2); grow(new THREE.Vector3(.9, -.9, -.1), new THREE.Vector3(-.4, 1, 0), 1);
    for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.DodecahedronGeometry(.08 + r() * .12, 0), std(0x6b5640, { roughness: 1 })); s.position.set((r() - .5) * 1.4, (r() - .5) * 1.1, -.15 - r() * .2); g.add(s); }
    g.scale.setScalar(.5); g.userData.unit = 1.2e-5 * 2; return g; } });
  S.push({ id: 'bact', name: '細菌', w: 2e-6, L: lg(4.5e-6), bg: 0x14202a, fact: '水や土の中にいる細菌。大腸菌は長さ約 2 μm、太さ約 1 μm の棒の形（模式）。光の顕微鏡では、この大きさから形の細部が見えにくくなる。', src: ['bnum'], build() {
    const g = new THREE.Group(); const r = rnd(13), m = std(0xb9d7a8, { roughness: .45, opacity: .9 });
    for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.CapsuleGeometry(.11, .22, 6, 16), m); c.position.set((r() - .5) * 1.6, (r() - .5) * 1.2, (r() - .5) * .3); c.rotation.set(r() * 3, r() * 3, r() * 3); if (i === 0) { c.position.set(0, 0, 0); c.rotation.set(0, 0, Math.PI / 2); } g.add(c); }
    g.scale.setScalar(1 / .44 * .5); g.userData.unit = 2e-6 * 2; return g; } });
  return S;
}

/* ---------- 本体 ---------- */
export function run(cfg) {
  const macro = cfg.kind === 'macro';
  const $ = s => document.querySelector(s);
  const R = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  R.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 768 ? 1.75 : 2)); R.setSize(innerWidth, innerHeight); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.prepend(R.domElement);
  const cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .01, 400);

  /* 塔の部屋 */
  const room = new THREE.Scene(); room.background = new THREE.Color(macro ? 0x070b14 : 0x15120e);
  room.add(new THREE.HemisphereLight(macro ? 0x8aa6c8 : 0xf0dcc0, 0x2a2420, macro ? .9 : 1.1));
  const lamp = new THREE.PointLight(macro ? 0x9fc4e8 : 0xffd9a8, macro ? 14 : 22, 12, 1.6); lamp.position.set(0, 3.2, -1); room.add(lamp);
  const RAD = 4.2;
  const stoneTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = macro ? '#3a3d44' : '#5a4c3c'; g.fillRect(0, 0, w, h); const r = rnd(21); for (let y = 0; y < h; y += 32) for (let x = (y / 32 & 1) * 32; x < w; x += 64) { g.fillStyle = `rgba(${macro ? '200,210,230' : '230,210,180'},${.04 + r() * .06})`; g.fillRect(x + 1, y + 1, 62, 30); } g.strokeStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
  stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping; stoneTex.repeat.set(4, 2);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(RAD, RAD, 4, 64, 1, true), new THREE.MeshStandardMaterial({ map: stoneTex, side: THREE.BackSide, roughness: .95 })); wall.position.y = 2; room.add(wall);
  const floorTex = canvasTex(512, 512, (g, w) => { g.fillStyle = macro ? '#23262c' : '#3b3026'; g.fillRect(0, 0, w, w); g.strokeStyle = macro ? 'rgba(160,200,230,.22)' : 'rgba(230,200,150,.22)'; g.lineWidth = 2; for (let i = 1; i < 7; i++) { g.beginPath(); g.arc(w / 2, w / 2, i * 36, 0, 7); g.stroke(); } for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * 36, w / 2 + Math.sin(a) * 36); g.lineTo(w / 2 + Math.cos(a) * 250, w / 2 + Math.sin(a) * 250); g.stroke(); } });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(RAD, 64), new THREE.MeshStandardMaterial({ map: floorTex, roughness: .9 })); floor.rotation.x = -Math.PI / 2; room.add(floor);
  // 天井：天文台は割れ目のある丸屋根から星、微文台は閉じた丸天井
  const dome = new THREE.Mesh(new THREE.SphereGeometry(RAD, 64, 24, macro ? .35 : 0, macro ? Math.PI * 2 - .7 : Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: macro ? 0x2b2f38 : 0x4a3d30, side: THREE.BackSide, roughness: 1 })); dome.position.y = 4; room.add(dome);
  if (macro) { const r = rnd(5), N = 1500, p = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const a = r() * 6.28, b = Math.acos(r()), d = 60; p[i * 3] = Math.sin(b) * Math.cos(a) * d; p[i * 3 + 1] = Math.cos(b) * d; p[i * 3 + 2] = Math.sin(b) * Math.sin(a) * d; } const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(p, 3)); room.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: .5, map: dotTex, transparent: true, depthWrite: false, color: 0xe6eefc }))); }
  // 器具
  const inst = new THREE.Group(); inst.position.set(0, 0, -1.6); room.add(inst);
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08d57, metalness: .85, roughness: .35 }), dark = new THREE.MeshStandardMaterial({ color: 0x1c1f24, metalness: .5, roughness: .45 });
  function cyl(r1, r2, h, mat, x, y, z, rx = 0, rz = 0) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 32), mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); inst.add(m); return m; }
  if (macro) { cyl(.06, .09, 1.1, dark, 0, .55, 0); [0, 2.09, 4.19].forEach(a => { const l = cyl(.025, .025, .9, dark, Math.cos(a) * .3, .3, Math.sin(a) * .3); l.lookAt(0, 1.2, 0); l.rotateX(Math.PI / 2); }); cyl(.17, .17, 1.9, brass, 0, 1.55, 0, -.9); cyl(.19, .19, .08, dark, 0, 1.55 + Math.cos(.9) * .95, -Math.sin(.9) * .95, -.9); cyl(.035, .035, .2, dark, 0, 1.55 - Math.cos(.9) * .95 + .02, Math.sin(.9) * .95 + .06, -.9); }
  else { const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, .9, .9), new THREE.MeshStandardMaterial({ color: 0x4b3a2a, roughness: .7 })); base.position.y = .45; inst.add(base); cyl(.18, .22, .06, dark, 0, .93, 0); const arm = new THREE.Mesh(new THREE.TorusGeometry(.28, .045, 12, 32, Math.PI * .9), dark); arm.position.set(0, 1.25, .1); arm.rotation.y = Math.PI / 2; inst.add(arm); const stg = new THREE.Mesh(new THREE.BoxGeometry(.36, .03, .3), dark); stg.position.set(0, 1.1, -.08); inst.add(stg); cyl(.06, .06, .5, brass, 0, 1.45, -.06, .35); cyl(.04, .04, .18, dark, 0, 1.72, .04, .35); cyl(.035, .02, .12, brass, 0, 1.18, -.1); const slide = new THREE.Mesh(new THREE.BoxGeometry(.25, .006, .08), new THREE.MeshStandardMaterial({ color: 0xcfe6ee, transparent: true, opacity: .6 })); slide.position.set(0, 1.12, -.08); inst.add(slide); }
  const instHit = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, 2.4, 12), new THREE.MeshBasicMaterial({ visible: false })); instHit.position.y = 1.2; inst.add(instHit);
  // もう一つの塔への扉
  const door = new THREE.Group(); door.position.set(0, 0, RAD - .05); room.add(door);
  const arch = new THREE.Shape(); arch.moveTo(-.6, 0); arch.lineTo(-.6, 1.8); arch.absarc(0, 1.8, .6, Math.PI, 0, true); arch.lineTo(.6, 0); arch.lineTo(-.6, 0);
  const doorTex = canvasTex(256, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); if (macro) { gr.addColorStop(0, '#3b3020'); gr.addColorStop(1, '#d7b98a'); } else { gr.addColorStop(0, '#05070f'); gr.addColorStop(1, '#1d2b4a'); } g.fillStyle = gr; g.fillRect(0, 0, w, h); const r = rnd(macro ? 2 : 4); for (let i = 0; i < 60; i++) { g.fillStyle = macro ? `rgba(255,240,210,${r() * .5})` : `rgba(230,240,255,${r() * .9})`; g.beginPath(); g.arc(r() * w, r() * h, macro ? 1 + r() * 4 : r() * 1.6, 0, 7); g.fill(); } });
  const dm = new THREE.Mesh(new THREE.ShapeGeometry(arch, 24), new THREE.MeshBasicMaterial({ map: doorTex })); dm.rotation.y = Math.PI; dm.position.z = -.01; door.add(dm);
  const dframe = new THREE.Mesh(new THREE.ShapeGeometry(arch, 24), new THREE.MeshStandardMaterial({ color: 0x8f7a5a, metalness: .6, roughness: .4 })); dframe.scale.set(1.1, 1.05, 1); dframe.rotation.y = Math.PI; dframe.position.z = .005; door.add(dframe);
  const doorLbl = label(macro ? '微文台へ ── 小さい方の端' : '天文台へ ── 大きい方の端', '#e8cf96'); doorLbl.scale.set(.32, .04, 1); doorLbl.material.sizeAttenuation = true; doorLbl.scale.set(1.9, .24, 1); doorLbl.center.set(.5, .5); doorLbl.position.set(0, 2.75, -.1); door.add(doorLbl);
  const instLbl = label(macro ? '望遠鏡 ── のぞく' : '顕微鏡 ── のぞく', '#e9f2f1'); instLbl.material.sizeAttenuation = true; instLbl.scale.set(1.7, .21, 1); instLbl.center.set(.5, .5); instLbl.position.set(0, macro ? 2.75 : 2.2, 0); inst.add(instLbl);

  /* 蝶（一匹・飛ぶと場面が変わる） */
  const wingTex = canvasTex(128, 128, (g, w) => { g.translate(0, w / 2); const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#2a2c30'); gr.addColorStop(.55, macro ? '#8aa0b8' : '#b7a48a'); gr.addColorStop(1, '#5a5e66'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(w * .3, -w * .55, w * .95, -w * .5, w * .9, -w * .1); g.bezierCurveTo(w, w * .05, w * .7, w * .2, w * .55, w * .08); g.bezierCurveTo(w * .6, w * .35, w * .3, w * .45, 0, 0); g.fill(); g.strokeStyle = 'rgba(20,20,24,.6)'; g.lineWidth = 3; g.stroke(); });
  const fly = new THREE.Group(); const wm = new THREE.MeshBasicMaterial({ map: wingTex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const wL = new THREE.Mesh(new THREE.PlaneGeometry(.16, .16).translate(.08, 0, 0), wm), wR = wL.clone(); wR.scale.x = -1; [wL, wR].forEach(w => { const p = new THREE.Group(); p.add(w); w.rotation.x = -Math.PI / 2; fly.add(p); }); room.add(fly);
  let flyT = 0, flyTo = null; fly.position.set(-1.2, 1.9, -.6);

  /* わたる世界 */
  const sky = new THREE.Scene(); sky.background = new THREE.Color(macro ? 0x03050b : 0x1d2420);
  const sun = new THREE.DirectionalLight(0xffffff, macro ? 3.2 : 2.2); sun.position.set(macro ? 1 : .4, macro ? .15 : .8, macro ? .2 : 1); sky.add(sun); sky.add(new THREE.AmbientLight(0xffffff, macro ? .12 : .9));
  if (macro) { const r = rnd(77), N = 2500, p = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const a = r() * 6.28, b = Math.acos(2 * r() - 1); p[i * 3] = Math.sin(b) * Math.cos(a) * 80; p[i * 3 + 1] = Math.cos(b) * 80; p[i * 3 + 2] = Math.sin(b) * Math.sin(a) * 80; } const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(p, 3)); const st = new THREE.Points(ge, new THREE.PointsMaterial({ size: .35, map: dotTex, transparent: true, opacity: .7, depthWrite: false })); st.userData.bg = 1; sky.add(st); sky.userData.stars = st; }
  const ST = macro ? macroStages(cfg.asset) : microStages();
  const built = ST.map(s => { const g = s.build(); g.userData.norm = g.scale.x; g.visible = false; sky.add(g); const mats = []; g.traverse(o => { if (o.material) mats.push(o.material); }); return { s, g, mats }; });
  const Lmin = macro ? ST[0].L - .3 : ST[ST.length - 1].L - .35, Lmax = macro ? ST[ST.length - 1].L + .35 : ST[0].L + .3;
  let L = macro ? ST[0].L : ST[0].L, Lt = L;
  const DIST = .5 / Math.tan(30 * Math.PI / 180) * 1.0; // 幅 1 の物が視野の幅に入る距離
  let orbitA = 0;
  const here = new THREE.Group(); here.add(marker(0xe8cf96, 8)); { const hl = label(macro ? 'ここ（参道）' : 'ここ', '#e8cf96'); here.add(hl); } sky.add(here); const hereM = []; here.traverse(o => { if (o.material) hereM.push(o.material); });

  /* 画面の部品 */
  const cap = $('#cap'), capN = $('#capN'), capT = $('#capT'), capF = $('#capF'), rul = $('#rul'), mk = $('#rulMk'), wtxt = $('#wtxt'), go = $('#go'), stages = $('#stages'), srcL = $('#srcL'), phaseC = $('#phase');
  ST.forEach((s, i) => { const b = document.createElement('button'); b.className = 'st'; b.type = 'button'; b.textContent = s.name; b.addEventListener('click', () => { if (mode !== 'sky') enter(true); Lt = s.L; }); stages.appendChild(b); });
  // 目盛り（十倍ごと）
  const stp = Lmax - Lmin > 10 ? 3 : 1; for (let k = Math.ceil(Lmin / stp) * stp; k <= Math.floor(Lmax); k += stp) { const t = document.createElement('i'); t.style.top = (100 * (Lmax - k) / (Lmax - Lmin)) + '%'; t.innerHTML = '10<sup>' + (k < 0 ? '−' + (-k) : k) + '</sup> m'; rul.appendChild(t); }
  function sup(n) { const m = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }; return String(n).split('').map(c => m[c]).join(''); }
  const used = new Set(); ST.forEach(s => s.src.forEach(k => used.add(k)));
  srcL.innerHTML = [...used].map(k => `<li><a href="${SRC[k][1]}" target="_blank" rel="noopener">${SRC[k][0]}</a></li>`).join('');

  /* 動かし方 */
  let mode = 'room', yaw = 0, pitch = macro ? .08 : -.05, pos = new THREE.Vector3(0, 1.6, 2.2), walkTo = null, fade = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let dn = null, pin = null;
  const cv = R.domElement;
  cv.addEventListener('pointerdown', e => { dn = { x: e.clientX, y: e.clientY, yaw, pitch, Lt, m: 0, id: e.pointerId }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (!dn || e.pointerId !== dn.id) return; const dx = e.clientX - dn.x, dy = e.clientY - dn.y; dn.m = Math.max(dn.m, Math.abs(dx) + Math.abs(dy)); if (mode === 'room') { yaw = dn.yaw - dx * .005; pitch = Math.max(-.6, Math.min(.9, dn.pitch + dy * .004)); } else { Lt = clampL(dn.Lt + (macro ? 1 : -1) * dy * .012); } });
  cv.addEventListener('pointerup', e => { if (dn && dn.m < 7) tap(e); dn = null; });
  cv.addEventListener('wheel', e => { e.preventDefault(); if (mode === 'sky') Lt = clampL(Lt + (macro ? 1 : -1) * e.deltaY * .0025); }, { passive: false });
  const tch = new Map();
  cv.addEventListener('touchstart', e => { if (e.touches.length === 2) { const [a, b] = e.touches; pin = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), Lt }; dn = null; } }, { passive: true });
  cv.addEventListener('touchmove', e => { if (pin && e.touches.length === 2 && mode === 'sky') { const [a, b] = e.touches; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); Lt = clampL(pin.Lt - lg(d / pin.d) * 2.2); } }, { passive: true });
  cv.addEventListener('touchend', () => { pin = null; });
  addEventListener('keydown', e => { if (mode === 'sky' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) Lt = clampL(Lt + ((e.key === 'ArrowUp') === macro ? .2 : -.2)); if (e.key === 'Escape' && mode === 'sky') leave(); });
  function clampL(v) { return Math.max(Lmin, Math.min(Lmax, v)); }
  function tap(e) {
    if (mode !== 'room') return; ndc.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(ndc, cam);
    if (ray.intersectObjects([instHit, ...inst.children], true).length) { enter(); return; }
    if (ray.intersectObject(door, true).length) { toOther(); return; }
    const h = ray.intersectObject(floor)[0]; if (h) { const p = h.point; const d = Math.hypot(p.x, p.z); if (d > RAD - .5) p.multiplyScalar((RAD - .5) / d); walkTo = new THREE.Vector3(p.x, 1.6, p.z); }
  }
  function toOther() { flyTo = door.position.clone().setY(1.6); setTimeout(() => { location.href = cfg.other; }, 900); }
  function enter(now) {
    if (mode !== 'room') return; mode = 'going';
    flyTo = inst.localToWorld(new THREE.Vector3(0, macro ? 2.2 : 1.75, macro ? -.6 : 0));
    setText(); go.textContent = '塔にもどる'; go.setAttribute('aria-label', '塔の部屋にもどる');
    const t0 = performance.now(), d = now ? 200 : 1000; (function step() { const k = Math.min(1, (performance.now() - t0) / d); fade = k; if (k < 1) requestAnimationFrame(step); else { mode = 'sky'; L = Lt; document.body.classList.add('sky'); setTimeout(() => { fade = 0; }, 30); } })();
  }
  function leave() { mode = 'room'; document.body.classList.remove('sky'); go.textContent = macro ? '望遠鏡をのぞく' : '顕微鏡をのぞく'; go.setAttribute('aria-label', go.textContent); flyTo = null; fly.visible = true; cap.classList.remove('on'); }
  go.addEventListener('click', () => { mode === 'sky' ? leave() : enter(); });
  $('#other').addEventListener('click', e => { e.preventDefault(); toOther(); });

  /* 字幕 */
  let curStage = -1;
  function nearest() { let b = 0, bd = 1e9; ST.forEach((s, i) => { const d = Math.abs(s.L - L); if (d < bd) { bd = d; b = i; } }); return b; }
  function setText() { const i = nearest(); if (i === curStage) return; curStage = i; const s = ST[i]; capN.textContent = s.name; capF.textContent = s.fact; capT.textContent = s.time || ''; capT.hidden = !s.time; [...stages.children].forEach((b, k) => b.classList.toggle('on', k === i)); cap.classList.add('on'); phaseC.hidden = !s.phase; const end = macro ? i === 0 : i === 0; $('#endHint').hidden = !end; }

  /* 月の満ち欠け（地球から見た形） */
  const pg = phaseC.getContext('2d');
  function drawPhase(a) { const w = phaseC.width, r = w * .36, c = w / 2, k = Math.cos(a), wax = Math.sin(a) > 0; pg.clearRect(0, 0, w, w);
    pg.fillStyle = '#20242c'; pg.beginPath(); pg.arc(c, c, r, 0, 7); pg.fill();
    pg.fillStyle = '#dcd8cc'; pg.beginPath(); pg.arc(c, c, r, -Math.PI / 2, Math.PI / 2, !wax); pg.closePath(); pg.fill();
    pg.fillStyle = k > 0 ? '#20242c' : '#dcd8cc'; pg.beginPath(); pg.ellipse(c, c, Math.abs(k) * r + .5, r + .5, 0, 0, 7); pg.fill(); }

  /* こま */
  const clock = new THREE.Clock(); let fr = 0;
  function resize() { R.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
  addEventListener('resize', resize);
  function frame() {
    const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
    if (mode === 'room' || mode === 'going') {
      if (walkTo) { pos.lerp(walkTo, Math.min(1, dt * 2.2)); if (pos.distanceTo(walkTo) < .02) walkTo = null; }
      cam.position.copy(pos); cam.rotation.set(0, 0, 0, 'YXZ'); cam.rotation.order = 'YXZ'; cam.rotation.y = yaw; cam.rotation.x = pitch; cam.near = .01; cam.far = 400; cam.fov = 60 - fade * 40; cam.updateProjectionMatrix();
      // 蝶：ゆっくり部屋を舞う。のぞく・扉のときは先に飛んでいく
      flyT += dt; const tgt = flyTo || new THREE.Vector3(Math.sin(flyT * .21) * 1.6, 1.75 + Math.sin(flyT * .37) * .35, -.4 + Math.cos(flyT * .17) * 1.1);
      const prev = fly.position.clone(); fly.position.lerp(tgt, flyTo ? dt * 1.8 : dt * .9); const v = fly.position.clone().sub(prev); if (v.lengthSq() > 1e-8) fly.rotation.y = Math.atan2(v.x, v.z);
      const flap = Math.sin(t * (flyTo ? 9 : 6)) * .9; fly.children[0].rotation.z = flap; fly.children[1].rotation.z = -flap;
      R.render(room, cam);
      if (fade > 0) { /* のぞき込むときは視野を絞る */ }
    } else {
      L += (Lt - L) * Math.min(1, dt * 4);
      const D = DIST / Math.min(1, cam.aspect * 1.05); cam.position.set(0, 0, D); cam.rotation.set(0, 0, 0); cam.near = D * 1e-3; cam.far = D * 400; cam.fov = 60; cam.updateProjectionMatrix();
      orbitA += dt;
      let bg = null, amax = 0;
      built.forEach(({ s, g, mats }, i) => {
        const d = L - s.L, a = Math.max(0, 1 - Math.abs(d) / (macro ? .75 : .42)); amax = Math.max(amax, a); const vis = a > .002; g.visible = vis; if (!vis) return;
        g.scale.setScalar(g.userData.norm * (g.userData.unit || s.w) / Math.pow(10, L));
        mats.forEach(m => { m.opacity = (m.userData.op ?? 1) * Math.min(1, a * 1.6); });
        g.traverse(o => { if (o.userData.spin) o.rotation.y += dt * .05; });
        if (g.userData.cil) { g.userData.cil.rotation.z = Math.sin(t * 6) * .01; g.position.x = Math.sin(t * .3) * .02; }
        if (g.userData.moon) { const A = orbitA * (2 * Math.PI / 30); const R0 = g.userData.R; g.userData.moon.position.set(Math.cos(A) * R0, 0, -Math.sin(A) * R0); g.rotation.x = .35; drawPhase(A); }
        if (g.userData.pl) g.userData.pl.forEach(p => { const A = p.ph + orbitA * 1.2 / p.per; p.p.position.set(Math.cos(A) * p.R, 0, -Math.sin(A) * p.R); });
        if (s.bg !== undefined && a > .5) bg = s.bg;
      });
      { const hv = macro ? Math.max(0, 1 - amax * 2.2) : 0; here.visible = hv > .01; hereM.forEach(m => m.opacity = hv * (m.userData.op ?? 1)); }
      if (!macro && bg !== null) sky.background.lerp(new THREE.Color(bg), dt * 2);
      R.render(sky, cam);
      setText();
      const w = Math.pow(10, L); wtxt.textContent = '視野の幅 ' + fmtLen(w);
      mk.style.top = (100 * (Lmax - L) / (Lmax - Lmin)) + '%';
    }
    if (++fr === 2) document.body.classList.add('ready');
    requestAnimationFrame(frame);
  }
  // のぞき込みの絞り：fov を狭めつつ器具へ寄る
  // 確認用
  window.__setL = v => { if (mode !== 'sky') enter(true); Lt = L = v; };
  window.__setLt = v => { Lt = clampL(v); };
  window.__enter = () => enter(true);
  frame();
  // 札（qgui）
  if (window.qgUnify) try { qgUnify({ menu: '#qgMenu', main: '#go', group: '#stages', item: '.st', groupName: '段', name: '.brand', drawerEl: '#drawer' }); } catch (e) { }
}
