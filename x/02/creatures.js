/* © mitsulab. 生きものの写実の造形（2026-10-12）。
   図鑑・教科書の形態（脚・翅・羽・指の数と並び、模様）にそって、画面の中でその場で組み立てる。外から取りこんだ 3D はない。
   向き：頭が +Z、背が +Y。長さの単位は「体の長さ＝1」（呼ぶ側で縮める）。歩く生きものは足もとが y=0。
   形の根拠：資料/調べたこと/形態の確かめ.md（2026-10-12 追記）。 */
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2, clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// 折れ線の表：[[t, 値], …] を t で引く
const tab = rows => t => { if (t <= rows[0][0]) return rows[0][1]; for (let i = 1; i < rows.length; i++) if (t <= rows[i][0]) { const [a, va] = rows[i - 1], [b, vb] = rows[i]; const u = (t - a) / (b - a), s = u * u * (3 - 2 * u); return lerp(va, vb, s); } return rows[rows.length - 1][1]; };
const C = new T.Color(), C2 = new T.Color();
const mixc = (a, b, t) => C2.setHex(a).lerp(C.setHex(b), clamp(t, 0, 1)).clone();

// 既定の質感（呼ぶ側が受けとり方の質感を渡すときは、それを使う）
export function stdMat(hex, o = {}) {
  return new T.MeshStandardMaterial({ color: hex, map: o.map || null, vertexColors: !!o.vc, roughness: o.rough ?? .7, metalness: 0, side: o.side ?? T.FrontSide, transparent: !!o.transparent, alphaTest: o.alphaTest || 0 });
}
function mk(mat, hex, o = {}) {
  const m = mat(hex, { std: true, rough: .7, ...o });
  if (o.opacity != null) { m.opacity = o.opacity; m.transparent = true; }
  if (o.depthWrite === false) m.depthWrite = false;
  return m;
}

// ---------------------------------------------------------------- 絵の具（一度だけ描いて、みなで使う）
const TEX = {};
function ctex(key, w, h, draw, rep = [1, 1], srgb = true) {
  if (!TEX[key]) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); if (srgb) t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; TEX[key] = t; }
  const t = TEX[key]; if (rep[0] === 1 && rep[1] === 1) return t; const k = key + rep.join('x'); if (!TEX[k]) { TEX[k] = t.clone(); TEX[k].repeat.set(...rep); TEX[k].needsUpdate = true; } return TEX[k];
}
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
// 毛並み：細い筋の明暗（白に近い灰。頂点の色にかける）
const furTex = rep => ctex('fur', 128, 128, (g, w, h) => { g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const v = 150 + rnd() * 105 | 0; g.strokeStyle = `rgba(${v},${v},${v},.55)`; g.lineWidth = .8; const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - .5) * 2, y + 3 + rnd() * 5); g.stroke(); } }, rep);
// 羽：重なった小羽のうろこ
const plumeTex = rep => ctex('plume', 128, 128, (g, w, h) => { g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, w, h); for (let y = -8; y < h + 8; y += 8) for (let x = (y / 8 % 2) * 6 - 6; x < w + 8; x += 12) { const gr = g.createRadialGradient(x, y, 1, x, y + 3, 8); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(.75, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(60,60,60,.35)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y + 2, 7, 6, 0, 0, Math.PI); g.fill(); } }, rep);
// へびの鱗：竜骨のある菱形の並び
const scaleTex = rep => ctex('scale', 64, 64, (g, w, h) => { g.fillStyle = '#e0e0e0'; g.fillRect(0, 0, w, h); for (let y = 0; y <= h; y += 8) for (let x = (y / 8 % 2) * 8; x <= w; x += 16) { g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 7, y); g.lineTo(x, y + 7); g.lineTo(x - 7, y); g.closePath(); g.fill(); g.strokeStyle = 'rgba(40,40,40,.45)'; g.lineWidth = 1; g.stroke(); g.strokeStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x, y + 5); g.stroke(); } }, rep);

// ---------------------------------------------------------------- 形の道具
// 曲線にそって楕円の断面をつなぐ（体・首・頭・脚・尾）。colorFn(t, sx, cy, x, y, z)：sx＝横（+X 側が +1）、cy＝上が +1
function sweep(pts, rx, ry, colorFn, o = {}) {
  const curve = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p)), false, 'centripetal');
  const N = o.n ?? 28, R = o.r ?? 14, n = (N + 1) * (R + 1);
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  const P = new T.Vector3(), Tg = new T.Vector3(), side = new T.Vector3(), up = new T.Vector3(), ref = new T.Vector3(...(o.up || [0, 1, 0]));
  let k = 0;
  for (let i = 0; i <= N; i++) {
    const t = i / N; curve.getPointAt(t, P); curve.getTangentAt(t, Tg);
    side.crossVectors(ref, Tg); if (side.lengthSq() < 1e-8) side.set(1, 0, 0); side.normalize(); up.crossVectors(Tg, side).normalize();
    const ax = typeof rx === 'function' ? rx(t) : rx, ay = typeof ry === 'function' ? ry(t) : ry;
    for (let j = 0; j <= R; j++, k++) {
      const a = j / R * TAU, sx = Math.sin(a), cy = Math.cos(a), m = o.k ? o.k(t, sx, cy) : 1;
      const x = P.x + (side.x * sx * ax + up.x * cy * ay) * m, y = P.y + (side.y * sx * ax + up.y * cy * ay) * m, z = P.z + (side.z * sx * ax + up.z * cy * ay) * m;
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
      const c = colorFn ? colorFn(t, sx, cy, x, y, z) : 0xffffff; if (c.isColor) C.copy(c); else C.setHex(c);
      col[k * 3] = C.r; col[k * 3 + 1] = C.g; col[k * 3 + 2] = C.b; uv[k * 2] = t; uv[k * 2 + 1] = j / R;
    }
  }
  const idx = []; for (let i = 0; i < N; i++) for (let j = 0; j < R; j++) { const a = i * (R + 1) + j, b = a + R + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals(); seam(g, N, R); return g;
}
function seam(g, N, R) { const nr = g.attributes.normal; for (let i = 0; i <= N; i++) { const a = i * (R + 1), b = a + R; const x = nr.getX(a) + nr.getX(b), y = nr.getY(a) + nr.getY(b), z = nr.getZ(a) + nr.getZ(b), l = Math.hypot(x, y, z) || 1; nr.setXYZ(a, x / l, y / l, z / l); nr.setXYZ(b, x / l, y / l, z / l); } }
const ell = (mat, cx, cy, cz, rx, ry, rz, segs = 16) => { const m = new T.Mesh(new T.SphereGeometry(1, segs, Math.max(8, segs * .7 | 0)), mat); m.position.set(cx, cy, cz); m.scale.set(rx, ry, rz); return m; };
// 平らな形（翅・羽・耳）。2D（x＝外へ, y＝前へ）を 3D（x, 0, y）へ。uv は外形の枠に合わせる
function flatShape(pts, smoothN = 0) {
  const s = new T.Shape(); s.moveTo(...pts[0]); if (smoothN) s.splineThru(pts.slice(1).map(p => new T.Vector2(...p)).concat([new T.Vector2(...pts[0])])); else { for (const p of pts.slice(1)) s.lineTo(...p); s.closePath(); }
  const g = new T.ShapeGeometry(s, smoothN || 1); g.computeBoundingBox(); const bb = g.boundingBox, w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y, p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - bb.min.x) / w, (p.getY(i) - bb.min.y) / h);
  g.userData.bb = { x0: bb.min.x, x1: bb.max.x, y0: bb.min.y, y1: bb.max.y }; g.rotateX(Math.PI / 2); return g;
}
// 外形の枠の座標で描く絵の具
function shapeTex(key, geo, pts, draw, size = 512) {
  const bb0 = geo.userData.bb, ar = (bb0.y1 - bb0.y0) / (bb0.x1 - bb0.x0);
  return ctex(key, size, Math.max(32, Math.round(size * ar / 8) * 8), (g, W, H) => { const b = geo.userData.bb, sx = W / (b.x1 - b.x0), sy = H / (b.y1 - b.y0);
    g.setTransform(sx, 0, 0, -sy, -b.x0 * sx, b.y1 * sy); const path = new Path2D(); path.moveTo(...pts[0]); for (const p of pts.slice(1)) path.lineTo(...p); path.closePath();
    g.save(); g.clip(path); draw(g, path, 1 / sx); g.restore(); });
}
const tube = (mat, pts, r0, r1, colorFn, n = 10, rs = 6) => new T.Mesh(sweep(pts, t => lerp(r0, r1, t), t => lerp(r0, r1, t), colorFn, { n, r: rs }), mat);

// ================================================================ ミツバチ（セイヨウミツバチの働き蜂・体長 12〜15 mm）
//   頭・胸・腹。複眼 2・単眼 3・膝状の触角 2。翅 4（前翅が大きい・前後は鉤でつながり一緒に動く）。脚 6（後脚の脛は平たい花粉かご）。
export function makeBee(mat = stdMat, o = {}) {
  const g = new T.Group(), parts = {};
  const vc = (o2 = {}) => mk(mat, 0xffffff, { vc: true, rough: .6, ...o2 });
  // 腹（6 節の背板。前の 3 節は琥珀色に黒い後縁、後ろの 3 節は黒褐色に淡い毛の帯）
  const ab = sweep([[0, .03, .13], [0, 0, -.05], [0, -.05, -.26], [0, -.1, -.45], [0, -.12, -.53]], tab([[0, .05], [.12, .13], [.32, .158], [.55, .14], [.8, .085], [1, 0]]), tab([[0, .05], [.12, .12], [.32, .145], [.55, .13], [.8, .08], [1, 0]]),
    (t, sx, cy) => { const s = clamp(t * 6.2, 0, 5.99), seg = s | 0, f = s - seg; if (cy < -.35) return mixc(0x8a6232, 0x4a3420, seg / 5); const amber = seg < 3; if (amber) return f > .62 ? 0x2a1c12 : f < .14 ? 0xd9b46a : 0xc98a2b; return f < .28 ? 0xb9a37a : 0x2c2016; }, { n: 40, r: 16 });
  g.add(new T.Mesh(ab, vc({ map: furTex([3, 2]), temp: .3 })));
  // 胸（茶褐色の毛でおおわれる。飛ぶ筋肉で温かい）と、毛の層
  const thC = (t, sx, cy) => cy > .2 ? 0xa98552 : cy < -.4 ? 0x5b4630 : 0x8a6a3f;
  g.add(new T.Mesh(sweep([[0, .02, .13], [0, .05, .25], [0, .03, .37]], tab([[0, .07], [.25, .13], [.6, .135], [1, .06]]), tab([[0, .07], [.25, .13], [.6, .13], [1, .06]]), thC, { n: 16, r: 16 }), vc({ temp: .6 })));
  const fuzz = new T.Mesh(sweep([[0, .02, .12], [0, .05, .25], [0, .03, .38]], tab([[0, .08], [.25, .15], [.6, .155], [1, .07]]), tab([[0, .08], [.25, .15], [.6, .15], [1, .07]]), thC, { n: 16, r: 16 }),
    vc({ map: ctex('beehair', 64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); for (let i = 0; i < 700; i++) { c.fillStyle = `rgba(${200 + rnd() * 55 | 0},${170 + rnd() * 50 | 0},120,1)`; c.fillRect(rnd() * w, rnd() * h, 1, 2); } }, [4, 4]), alphaTest: .5, temp: .6 }));
  g.add(fuzz);
  // 頭（前から見ると逆三角）
  const head = new T.Mesh(sweep([[0, .0, .39], [0, .02, .45], [0, .01, .52]], tab([[0, .05], [.35, .125], [.7, .115], [1, .04]]), tab([[0, .06], [.35, .14], [.7, .13], [1, .05]]), (t, sx, cy) => cy > .6 ? 0x3a2c1e : 0x2a2018,
    { n: 12, r: 16, k: (t, sx, cy) => 1 - .3 * Math.max(0, -cy) }), vc({ temp: .4 }));
  g.add(head);
  const eyeM = mk(mat, 0x2e2820, { rough: .35, uv: .05, temp: .35 });
  for (const s of [-1, 1]) { const e = ell(eyeM, s * .1, .04, .45, .045, .105, .07); e.rotation.y = s * .25; g.add(e); }
  for (const [x, y, z] of [[0, .155, .45], [-.035, .145, .425], [.035, .145, .425]]) g.add(ell(mk(mat, 0x15110c, { rough: .2 }), x, y, z, .013, .013, .013, 8));
  const dark = mk(mat, 0x2a2018, { rough: .55, temp: .3 });
  for (const s of [-1, 1]) {   // 触角：柄節（まっすぐ）→ ひじ → 鞭節
    g.add(tube(dark, [[s * .03, .05, .51], [s * .05, .13, .55], [s * .065, .19, .57]], .013, .011));
    g.add(tube(dark, [[s * .065, .19, .57], [s * .1, .2, .66], [s * .13, .15, .76], [s * .14, .1, .8]], .011, .009));
    g.add(ell(mk(mat, 0x5a3c1c, { rough: .5 }), s * .022, -.085, .495, .012, .022, .012, 8));   // 大あご
  }
  // 脚 6：基節・腿節・脛節・跗節。飛ぶときは垂らす
  const legs = new T.Group(); g.add(legs);
  const L = [[.32, [[.1, -.06, .05], [.12, -.17, .1], [.11, -.25, .13]], .016, false], [.25, [[.17, -.09, 0], [.22, -.22, -.04], [.24, -.32, -.07]], .017, false], [.17, [[.16, -.1, -.07], [.19, -.27, -.17], [.17, -.4, -.25]], .018, true]];
  for (const s of [-1, 1]) for (const [z, pts, r, hind] of L) {
    const a = [s * .055, -.07, z], P = [a, ...pts.map(([x, y, zz]) => [a[0] + s * x, a[1] + y, a[2] + zz])];
    legs.add(tube(dark, [P[0], P[1]], r * 1.15, r));
    if (hind) { const tb = new T.Mesh(sweep([P[1], P[2]], .02, .034, () => 0x3a2a1a, { n: 6, r: 8 }), dark); legs.add(tb); }   // 花粉かご（平たく幅の広い脛節）
    else legs.add(tube(dark, [P[1], P[2]], r, r * .85));
    legs.add(tube(dark, [P[2], P[3], [P[3][0] + s * .01, P[3][1] - .025, P[3][2] + .02]], r * .7, r * .45));
  }
  // 翅：前翅（長さ 0.68）と後翅（0.48）。翅脈の絵（前縁の太い脈・縁紋・亜縁室 3）
  const fwP = [[0, .01], [.18, .06], [.42, .085], [.6, .075], [.68, .04], [.67, -.005], [.6, -.05], [.44, -.1], [.24, -.105], [.09, -.06], [.02, -.03]];
  const hwP = [[0, 0], [.15, .03], [.34, .04], [.46, .02], [.48, -.012], [.42, -.05], [.26, -.08], [.1, -.06]];
  const fwG = flatShape(fwP), hwG = flatShape(hwP);
  const wingTex = (key, geo, pts, fore) => shapeTex(key, geo, pts, (c, path, px) => { c.fillStyle = 'rgba(232,238,244,.34)'; c.fill(path); c.strokeStyle = 'rgba(70,52,34,.85)'; c.lineWidth = 2.2 * px;
    if (fore) { c.lineWidth = 4.5 * px; c.beginPath(); c.moveTo(0, .01); c.lineTo(.42, .08); c.lineTo(.6, .07); c.stroke(); c.lineWidth = 2.2 * px;
      c.beginPath(); c.moveTo(0, -.005); c.lineTo(.3, .04); c.lineTo(.44, .055); c.lineTo(.6, .05); c.stroke();                        // 径脈と縁紋のつけね
      c.beginPath(); c.ellipse(.52, .052, .085, .016, .05, 0, TAU); c.stroke();                                                       // 縁室（細長い）
      for (const x of [.35, .42, .5]) { c.beginPath(); c.moveTo(x, .045); c.lineTo(x - .03, -.04); c.stroke(); }                     // 亜縁室を区切る脈
      c.beginPath(); c.moveTo(.05, -.02); c.lineTo(.25, -.02); c.lineTo(.32, -.045); c.lineTo(.47, -.04); c.stroke();
      c.beginPath(); c.moveTo(.12, .02); c.lineTo(.18, -.07); c.stroke(); c.beginPath(); c.moveTo(.25, -.02); c.lineTo(.28, -.09); c.stroke(); }
    else { c.beginPath(); c.moveTo(0, .0); c.lineTo(.34, .035); c.stroke(); c.beginPath(); c.moveTo(.02, -.01); c.lineTo(.22, -.02); c.lineTo(.32, -.05); c.stroke(); c.beginPath(); c.moveTo(.15, -.015); c.lineTo(.2, -.07); c.stroke(); } }, 256);
  const fwM = mk(mat, 0xffffff, { map: wingTex('beeFW', fwG, fwP, true), transparent: true, side: T.DoubleSide, depthWrite: false, rough: .25, uv: .25, temp: .3 });
  const hwM = mk(mat, 0xffffff, { map: wingTex('beeHW', hwG, hwP, false), transparent: true, side: T.DoubleSide, depthWrite: false, rough: .25, uv: .25, temp: .3 });
  // 羽ばたきの残像（1 秒に 200 回あまり。画面のこま数では止まって見えないので、扇のかすみで示す）
  const blurM = mk(mat, 0xe8eef2, { transparent: true, opacity: .05, side: T.DoubleSide, depthWrite: false, uv: .2, temp: .3 });
  const wings = [];
  for (const s of [-1, 1]) {
    const fw = new T.Group(), hw = new T.Group(); fw.position.set(s * .07, .12, .3); hw.position.set(s * .07, .105, .22);
    const fm = new T.Mesh(fwG, fwM), hm = new T.Mesh(hwG, hwM); if (s < 0) { fm.scale.x = -1; hm.scale.x = -1; } fw.add(fm); hw.add(hm);
    const blur = new T.Mesh(new T.CircleGeometry(.68, 18, -1.0, 2.0).rotateX(-Math.PI / 2), blurM); if (s < 0) blur.scale.x = -1; blur.visible = false; fw.add(blur);
    g.add(fw, hw); wings.push({ s, fw, hw, blur });
  }
  parts.wings = wings; parts.legs = legs;
  g.userData = { kind: 'hachi', parts, state: o.state || 'fly' };
  g.userData.animate = (t, moving = true) => {
    const fly = g.userData.state !== 'rest';
    for (const w of wings) {
      if (fly) { const ph = Math.random() * TAU, sw = .1 + .85 * Math.sin(ph); w.fw.rotation.set(0, -w.s * sw, w.s * (.12 + .1 * Math.cos(ph))); w.hw.rotation.copy(w.fw.rotation); w.blur.visible = true; w.blur.rotation.y = w.s * sw; }
      else { w.fw.rotation.set(0, w.s * 1.25, w.s * .1); w.hw.rotation.set(0, w.s * 1.2, w.s * .08); w.blur.visible = false; }
    }
    legs.rotation.x = fly ? .12 : 0;
  };
  g.userData.animate(0);
  return g;
}

// ================================================================ 蝶（ナミアゲハ・モンシロチョウの雌雄）と夜の蛾
//   翅 4（前翅・後翅）・脚 6（アゲハチョウ科もシロチョウ科も 6 本とも歩く脚）・先がこん棒状の触角 2・巻いた口吻。蛾の触角は糸状。
const WING = {
  ageha: { fw: [[0, .02], [.35, .2], [.8, .37], [1.2, .5], [1.45, .56], [1.42, .4], [1.33, .1], [1.2, -.18], [1.08, -.34], [.75, -.3], [.4, -.18], [.12, -.06]],
    hw: (() => { const o = [[0, 0], [.4, .05], [.8, .02], [1.0, -.12], [1.04, -.32]]; const sc = [[1.0, -.48], [.93, -.64]]; for (const p of sc) o.push(p); o.push([.86, -.72], [.82, -1.18], [.76, -1.22], [.72, -.82], [.6, -.88], [.48, -.92], [.38, -.86], [.3, -.72], [.2, -.5], [.08, -.24]); return o; })(), len: 1.45 },
  monshiro: { fw: [[0, .02], [.35, .17], [.75, .3], [1.05, .38], [1.2, .36], [1.18, .15], [1.06, -.12], [.9, -.3], [.6, -.28], [.3, -.16], [.08, -.05]],
    hw: [[0, 0], [.35, .05], [.7, .0], [.88, -.15], [.9, -.38], [.8, -.6], [.6, -.72], [.38, -.7], [.2, -.52], [.07, -.24]], len: 1.2 },
  moth: { fw: [[0, .02], [.3, .12], [.7, .2], [.95, .22], [1.05, .12], [.95, -.12], [.75, -.26], [.45, -.22], [.15, -.08]],
    hw: [[0, 0], [.3, .02], [.6, -.06], [.72, -.22], [.62, -.4], [.4, -.46], [.18, -.34], [.05, -.15]], len: 1.05 },
};
function paintWing(kind, fore, c, path, px) {
  const line = (pts, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(...pts[0]); for (const p of pts.slice(1)) c.lineTo(...p); c.stroke(); };
  const dot = (x, y, r, col, sy = 1) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, r, r * sy, 0, 0, TAU); c.fill(); };
  const veinsTo = (ends, w, col) => { for (const e of ends) line([[0, 0], [e[0] * .55, e[1] * .55], e], w, col); };
  if (kind === 'ageha') {
    const Y = '#f2e39c', K = '#16130f';
    c.fillStyle = Y; c.fill(path);
    if (fore) {
      // 基部：黄色地に黒い縦の筋（ナミアゲハ。キアゲハは基部が黒く塗りつぶされる）
      c.save(); c.clip(new Path2D('M0 0')); c.restore();
      for (let k = 0; k < 6; k++) line([[0, .01 - k * .03], [.62, .2 - k * .07]], 9 * px, K);
      line([[0, .03], [1.45, .56]], 22 * px, K);                                                                // 前縁の黒
      for (const x of [.62, .8]) line([[x, .32 + (x - .62) * .3], [x + .08, -.02]], 18 * px, K);              // 中室の端の黒い横帯
      c.fillStyle = K; c.beginPath(); c.moveTo(1.0, .5); c.lineTo(1.5, .6); c.lineTo(1.35, .1); c.lineTo(1.12, -.4); c.lineTo(.92, -.36); c.lineTo(1.03, .05); c.closePath(); c.fill();   // 外側の黒帯
      for (let k = 0; k < 8; k++) { const u = k / 7; dot(lerp(1.3, 1.05, u) + .02, lerp(.42, -.26, u), .028, Y, 1.3); }     // 外縁にそった黄色い斑
      for (let k = 0; k < 7; k++) { const u = k / 6; dot(lerp(1.13, .9, u), lerp(.38, -.22, u), .05 - u * .012, Y, .75); }    // 黒帯の内の黄色い斑
      veinsTo([[1.45, .5], [1.42, .35], [1.36, .15], [1.28, -.02], [1.2, -.18], [1.12, -.3], [.9, -.32]], 4 * px, K);
    } else {
      line([[0, -.02], [.28, -.72], [.4, -.9]], 30 * px, K);                                                     // 内縁（腹の側）の黒
      c.fillStyle = K; c.beginPath(); c.moveTo(.98, .02); c.lineTo(1.08, -.35); c.lineTo(.9, -.78); c.lineTo(.42, -.95); c.lineTo(.38, -.78); c.lineTo(.72, -.62); c.lineTo(.86, -.3); c.lineTo(.84, -.05); c.closePath(); c.fill();   // 外側の黒帯
      for (let k = 0; k < 5; k++) { const u = k / 4; dot(lerp(.92, .62, u), lerp(-.25, -.7, u), .045, '#4a6fc0', .7); }         // 黒帯の中の青い斑
      for (let k = 0; k < 6; k++) { const u = k / 5; dot(lerp(1.02, .55, u), lerp(-.3, -.88, u), .03, Y, .6); }                // 外縁の黄色い三日月
      dot(.36, -.82, .065, '#e2632a'); dot(.36, -.82, .03, K);                                                                  // 後角の橙の目玉もよう
      c.fillStyle = K; c.fillRect(.7, -1.25, .14, .45);                                                                         // 尾状突起（黒）
      veinsTo([[.98, -.1], [1.0, -.32], [.92, -.55], [.82, -.72], [.65, -.82], [.5, -.9]], 4 * px, K);
    }
  } else if (kind.startsWith('monshiro')) {
    const W = '#f4f2e8', K = '#2f2f31', fem = kind === 'monshiro-f';
    c.fillStyle = W; c.fill(path);
    const gr = c.createRadialGradient(0, 0, 0, 0, 0, fore ? .38 : .3); gr.addColorStop(0, fem ? 'rgba(70,72,72,.75)' : 'rgba(80,82,82,.5)'); gr.addColorStop(1, 'rgba(80,82,82,0)'); c.fillStyle = gr; c.fill(path);   // 付け根の黒っぽい鱗粉（雌で広い）
    if (fore) {
      c.fillStyle = K; c.beginPath(); c.moveTo(.85, .36); c.lineTo(1.25, .4); c.lineTo(1.16, .08); c.quadraticCurveTo(1.02, .2, .85, .36); c.fill();   // 前翅の先の黒
      dot(.82, .02, fem ? .06 : .045, K);                                                                                     // 黒い斑（雄は 1 つ）
      if (fem) { dot(.72, -.17, .055, K); line([[.25, -.17], [.5, -.25]], 14 * px, K); }                                     // 雌：もう 1 つと、内縁の黒い帯
    } else dot(.55, .02, .045, K);                                                                                             // 後翅の前縁の小さな黒斑
    c.strokeStyle = 'rgba(110,112,100,.35)'; c.lineWidth = 2 * px; for (const e of fore ? [[1.2, .3], [1.15, .1], [1.05, -.12], [.9, -.28]] : [[.85, -.2], [.8, -.55], [.55, -.7]]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(...e); c.stroke(); }
  } else {
    c.fillStyle = fore ? '#7d6b55' : '#a19685'; c.fill(path);
    for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(${40 + rnd() * 80 | 0},${30 + rnd() * 60 | 0},20,${rnd() * .35})`; c.beginPath(); c.arc(rnd() * 1.1, rnd() * .8 - .45, .01 + rnd() * .02, 0, TAU); c.fill(); }
    if (fore) { for (const x of [.35, .7]) { c.strokeStyle = 'rgba(40,30,20,.6)'; c.lineWidth = 5 * px; c.beginPath(); c.moveTo(x, .2); for (let y = .2; y > -.3; y -= .1) c.lineTo(x + Math.sin(y * 20) * .03, y); c.stroke(); } dot(.55, .02, .035, 'rgba(40,30,20,.7)'); }
  }
}
export function makeButterfly(kind = 'ageha', mat = stdMat, o = {}) {
  const key = kind.startsWith('monshiro') ? 'monshiro' : kind, W = WING[key], uvW = o.uv ?? (kind === 'monshiro-f' ? .7 : kind === 'monshiro-m' ? .02 : .15);
  const g = new T.Group();
  const vc = (o2 = {}) => mk(mat, 0xffffff, { vc: true, rough: .65, map: furTex([3, 2]), temp: .35, uv: .05, ...o2 });
  const ag = kind === 'ageha', moth = kind === 'moth';
  // 腹・胸・頭
  g.add(new T.Mesh(sweep([[0, .05, .22], [0, .02, 0], [0, -.03, -.3], [0, -.05, -.5]], tab([[0, .06], [.15, .075], [.6, .06], [1, .012]]), tab([[0, .065], [.15, .08], [.6, .062], [1, .012]]),
    (t, sx, cy) => ag ? (cy > .45 ? 0x17140f : Math.abs(Math.abs(sx) - .8) < .12 && cy > -.4 ? 0x2a2418 : 0xe6d58c) : moth ? 0x6e5c48 : (cy > .2 ? 0x3a3a3c : 0xe9e7e0), { n: 20, r: 12 }), vc()));
  g.add(new T.Mesh(sweep([[0, .05, .2], [0, .07, .3], [0, .06, .41]], tab([[0, .06], [.4, .1], [1, .06]]), tab([[0, .06], [.4, .1], [1, .07]]),
    (t, sx, cy) => ag ? (Math.abs(sx) > .55 && cy > -.2 && cy < .5 ? 0xe9d98e : 0x17140f) : moth ? 0x7a6650 : 0x45464a, { n: 12, r: 14 }), vc()));
  g.add(ell(mk(mat, ag ? 0x1d1a14 : moth ? 0x6a5844 : 0x3a3b3d, { rough: .7, temp: .3 }), 0, .065, .46, .07, .07, .065, 12));
  const eyeM = mk(mat, ag ? 0x3b3325 : moth ? 0x2a2018 : 0x6e7466, { rough: .3, temp: .3 });
  for (const s of [-1, 1]) g.add(ell(eyeM, s * .055, .07, .48, .045, .055, .05, 10));
  const dk = mk(mat, ag ? 0x1d1a14 : 0x2e2e30, { rough: .6, temp: .3 });
  for (const s of [-1, 1]) {
    const tip = moth ? [s * .28, .22, .72] : [s * .2, .42, .98];
    g.add(tube(dk, [[s * .025, .11, .5], [s * .08, .26, .68], tip], .009, moth ? .004 : .007));
    if (!moth) g.add(ell(dk, tip[0] * 1.03, tip[1] * 1.02, tip[2] * 1.02, .018, .018, .045, 8));                       // こん棒（先がふくらむ）
  }
  { const sp = []; for (let i = 0; i <= 20; i++) { const a = i / 20 * TAU * 1.6, r = .035 * (1 - i / 26); sp.push([0, -.02 - r * Math.cos(a) - .02, .52 + r * Math.sin(a)]); } g.add(tube(dk, sp, .006, .005, null, 24, 4)); }   // 巻いた口吻
  const legs = new T.Group(); g.add(legs);
  for (const s of [-1, 1]) for (const [z, dz, dy] of [[.36, .12, -.12], [.3, -.02, -.16], [.24, -.12, -.15]]) legs.add(tube(dk, [[s * .04, .0, z], [s * .1, -.06, z + dz * .4], [s * .12, dy, z + dz]], .009, .005, null, 8, 4));
  // 翅
  const fwG = flatShape(W.fw), hwG = flatShape(W.hw);
  const mats = [true, false].map(fore => mk(mat, 0xffffff, { map: shapeTex(`${kind}${fore ? 'F' : 'H'}`, fore ? fwG : hwG, fore ? W.fw : W.hw, (c, path, px) => paintWing(kind, fore, c, path, px)), side: T.DoubleSide, rough: .8, uv: uvW, temp: .2 }));
  const wings = [];
  for (const s of [-1, 1]) {
    const piv = new T.Group(); piv.position.set(s * .045, .1, .3);
    const f = new T.Mesh(fwG, mats[0]), h = new T.Mesh(hwG, mats[1]); h.position.set(0, -.004, -.04); f.rotation.y = -.12; if (s < 0) { f.scale.x = -1; h.scale.x = -1; f.rotation.y = .12; }
    piv.add(f, h); g.add(piv); wings.push({ s, piv });
  }
  g.userData = { kind: moth ? 'ga' : 'chou', wings, ph: o.ph || 0, state: o.state || 'fly' };
  // 羽ばたき：下ろす（-25°）〜上げる（+75°）。アゲハは時おり滑空する
  g.userData.flap = (t, k = 1) => { const f = ag ? 6.5 : moth ? 11 : 8.5, glide = ag ? sstep(.55, .8, Math.sin(t * .9 + g.userData.ph)) : 0;
    const a = (1 - glide) * (Math.sin(t * f * TAU / 2) * .5 + .5), ang = lerp(-.42, 1.3, a) * k + glide * .08;
    for (const w of wings) w.piv.rotation.z = w.s * ang; return a; };
  g.userData.animate = (t, moving = true) => { if (g.userData.state === 'rest') { for (const w of wings) w.piv.rotation.z = w.s * 1.45; return; } g.userData.flap(t); };
  g.userData.pl = wings[0].piv; g.userData.pr = wings[1].piv;
  g.userData.animate(0);
  return g;
}

// ================================================================ シジュウカラ（Parus minor・全長 約 14.5 cm）
//   黒い頭・白い頬・うなじの白い斑・のどから腹の中央へ黒いネクタイ・背の上は黄緑・腰は青灰・腹は白っぽい灰。
//   翼は青灰で、大雨覆の先が白い帯になる。尾は 12 枚（いちばん外は白が多い）。足指 4 本（前 3・後 1）。
//   飛び方：数回はばたいては翼をたたむ、波形の飛び方。
const FEATHER = (len, wid, asym = 0) => { const p = []; for (const [u, v] of [[0, -.28], [.25, -.5], [.6, -.48], [.85, -.34], [.97, -.12], [1, 0], [.97, .14], [.85, .36], [.6, .5], [.25, .5], [0, .28]]) p.push([v * wid * (v < 0 ? 1 - asym : 1 + asym), u * len]); return p; };
function featherGeo(len, wid, asym) { const pts = FEATHER(len, wid, asym), s = new T.Shape(); s.moveTo(...pts[0]); for (const p of pts.slice(1)) s.lineTo(...p); s.closePath(); const g = new T.ShapeGeometry(s); const P = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, P.getX(i) / wid * .5 + .5, P.getY(i) / len); g.rotateX(-Math.PI / 2); return g; }   // 根もとが原点、羽の先が -Z
const featherTex = (key, base, edge, tip, tipW) => ctex(key, 64, 128, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, edge); gr.addColorStop(.42, base); gr.addColorStop(.5, '#2a2c30'); gr.addColorStop(.58, base); gr.addColorStop(1, base); c.fillStyle = gr; c.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) { c.strokeStyle = 'rgba(0,0,0,.08)'; c.beginPath(); c.moveTo(0, y + 6); c.lineTo(w / 2, y); c.lineTo(w, y + 6); c.stroke(); }
  if (tip) { c.fillStyle = tip; c.fillRect(0, 0, w, h * tipW); } }, [1, 1]);
export function makeTit(mat = stdMat, o = {}) {
  const g = new T.Group(), body = new T.Group(); g.add(body);
  const K = 0x141518, Wt = 0xeceee8, GRN = 0x96a05a, BG = 0x74818f, BEL = 0xdfe1db, FL = 0xc6c9c0;
  const col = (t, sx, cy, x, y, z) => {
    if (z > .175) {   // 頭
      if (z > .215 && z < .322 && cy < -.02 && cy > -.52) return Wt;   // 白い頬（目より下。目は黒い頭の中）
      if (z < .215 && cy > .72) return 0xd9dcd2;                    // うなじの白い斑
      return K;
    }
    if (cy < -.5 && Math.abs(sx) < (z > .08 ? .62 : .42)) return K;  // 黒いネクタイ（雄は太く、腹の下まで）
    if (cy < -.15) return z < -.1 ? 0xf2f2ee : BEL;                  // 腹（下尾筒は白）
    if (cy < .35) return z < -.05 ? 0xb8bcb4 : FL;                   // わき
    return z > 0 ? GRN : BG;                                         // 背の上は黄緑・腰は青灰
  };
  const bodyG = sweep([[0, -.015, -.2], [0, 0, -.09], [0, .02, .05], [0, .05, .16], [0, .08, .245], [0, .085, .3], [0, .078, .338]],
    tab([[0, .022], [.1, .07], [.32, .098], [.52, .09], [.66, .066], [.8, .068], [.93, .05], [1, .018]]), tab([[0, .02], [.1, .072], [.32, .108], [.52, .095], [.66, .07], [.8, .071], [.93, .05], [1, .018]]), col,
    { n: 44, r: 24, k: (t, sx, cy) => 1 + .07 * Math.max(0, -cy) * sstep(.15, .35, t) * (1 - sstep(.45, .6, t)) });
  const bm = new T.Mesh(bodyG, mk(mat, 0xffffff, { vc: true, map: plumeTex([7, 5]), rough: .78, temp: .95, uv: .06 })); body.add(bm);
  const bill = new T.Mesh(sweep([[0, .074, .33], [0, .07, .37], [0, .064, .392]], tab([[0, .02], [1, .002]]), tab([[0, .018], [1, .002]]), () => 0x1d1e21, { n: 6, r: 8 }), mk(mat, 0xffffff, { vc: true, rough: .35, temp: .6, uv: .04 })); body.add(bill);
  const eyeM = mk(mat, 0x050506, { rough: .12, temp: .9 }); for (const s of [-1, 1]) body.add(ell(eyeM, s * .057, .1, .287, .014, .016, .015, 10));
  // 尾：12 枚の扇（外側ほど白い）
  const tailGeos = [];
  for (let i = 0; i < 12; i++) { const u = i / 11 - .5, fg = featherGeo(.35, .055, 0); fg.rotateY(-u * .5); fg.translate(u * .05, -.004 + Math.abs(u) * -.006, -.15 - .002 * Math.abs(u)); const w = Math.abs(u) > .44 ? 1 : 0; const n = fg.attributes.position.count; fg.setAttribute('color', new T.BufferAttribute(new Float32Array(n * 3).fill(0), 3)); const cA = fg.attributes.color, cc = new T.Color(w ? 0xe8e8e2 : 0x56606e); for (let k = 0; k < n; k++) cA.setXYZ(k, cc.r, cc.g, cc.b); tailGeos.push(fg); }
  const tail = new T.Mesh(mergeGeometries(tailGeos), mk(mat, 0xffffff, { vc: true, map: featherTex('tf', '#c9cdd4', '#e8ebee', null), side: T.DoubleSide, rough: .8, temp: .8, uv: .2 }));
  const tailPiv = new T.Group(); tailPiv.position.set(0, -.005, -.15); tail.position.set(0, .005, .15); tailPiv.add(tail); body.add(tailPiv);
  // 脚と足指（前 3・後 1）
  const legs = new T.Group(); body.add(legs); const legM = mk(mat, 0x5d636d, { rough: .5, temp: .7 });
  for (const s of [-1, 1]) { legs.add(tube(legM, [[s * .03, -.06, .03], [s * .032, -.12, .045], [s * .032, -.155, .05]], .008, .006, null, 4, 5));
    for (const a of [-.4, 0, .4]) legs.add(tube(legM, [[s * .032, -.155, .05], [s * .032 + Math.sin(a) * .05, -.165, .05 + Math.cos(a) * .05]], .005, .003, null, 3, 4));
    legs.add(tube(legM, [[s * .032, -.155, .05], [s * .032, -.165, .005]], .005, .003, null, 3, 4)); }
  // 翼：はばたき・たたみを、羽一枚ずつの位置から毎こま組み直す（一枚の形にまとめて描く）
  const F = []; // { seg, x, ang0, angF, len, wid, asym, layer, tex }
  for (let i = 0; i < 3; i++) F.push({ seg: 0, x: .05 + i * .045, a0: .12 - i * .05, aF: -1.15, len: .2, wid: .07, layer: .006, m: 1 });            // 三列風切
  for (let i = 0; i < 8; i++) F.push({ seg: 1, x: i * .02, a0: -.05 - i * .03, aF: 1.35, len: .25, wid: .065, layer: .004 - i * .0002, m: 0 });       // 次列風切
  for (let i = 0; i < 9; i++) F.push({ seg: 2, x: i * .006, a0: -.4 - i * .13, aF: -1.45 + i * .01, len: .25 + .12 * Math.sin(Math.min(1, i / 7) * Math.PI / 2), wid: .06, asym: .3, layer: -.002 * i, m: 0 });   // 初列風切
  for (let i = 0; i < 8; i++) F.push({ seg: 1, x: i * .02, a0: -.05 - i * .03, aF: 1.35, len: .11, wid: .06, layer: .012, m: 2 });                      // 大雨覆（先が白い＝翼の帯）
  for (let i = 0; i < 5; i++) F.push({ seg: 2, x: i * .008, a0: -.5 - i * .2, aF: -1.45, len: .1, wid: .05, layer: .01, m: 1 });                          // 初列雨覆
  F.push({ seg: 0, x: .0, a0: -.2, aF: -1.1, len: .14, wid: .17, layer: .016, m: 3 }, { seg: 1, x: .02, a0: -.2, aF: 1.3, len: .09, wid: .16, layer: .018, m: 3 });   // 小・中雨覆（前縁）
  const texs = [featherTex('wf', '#5c6878', '#9fb0c2', null), featherTex('wt', '#3c4450', '#eef0ea', null), featherTex('wc', '#6c7a8c', '#8394a8', '#f0f0ea', .32), featherTex('wl', '#7a8898', '#8696a8', null)];
  const wingMats = texs.map(tx => mk(mat, 0xffffff, { map: tx, side: T.DoubleSide, rough: .8, temp: .85, uv: .18 }));
  function wingMesh(side) {
    const geos = [], base = [];
    for (const f of F) { const fg = featherGeo(f.len, f.wid, f.asym || 0); base.push(Float32Array.from(fg.attributes.position.array)); geos.push(fg); }
    const groups = [0, 1, 2, 3].map(m => F.map((f, i) => [f, i]).filter(([f]) => f.m === m));
    const ordered = groups.flat(), geo = mergeGeometries(ordered.map(([, i]) => geos[i]), true);
    { const gs = geo.groups.slice(); geo.clearGroups(); let gi = 0; for (let m = 0; m < 4; m++) { let start = null, count = 0; for (let q = 0; q < groups[m].length; q++, gi++) { if (start == null) start = gs[gi].start; count += gs[gi].count; } if (count) geo.addGroup(start, count, m); } }
    const mesh = new T.Mesh(geo, wingMats); mesh.userData = { side, F: ordered.map(([f, i]) => ({ f, b: base[i] })) }; mesh.frustumCulled = false; return mesh;
  }
  const wings = [wingMesh(-1), wingMesh(1)]; body.add(...wings);
  const SH = [.072, .065, .12], LH = .15, LF = .15;
  const v = new T.Vector3();
  function poseWing(mesh, elev, fold, sweepK = 0) {
    const s = mesh.userData.side, P = mesh.geometry.attributes.position, N = mesh.geometry.attributes.normal;
    const a1 = lerp(-.05 + sweepK, 1.25, fold), a2 = lerp(.05, -2.7, fold), a3 = lerp(-.02, 2.9, fold);
    const E = [LH * Math.cos(a1), -LH * Math.sin(a1)], W2 = [E[0] + LF * Math.cos(a1 + a2), E[1] - LF * Math.sin(a1 + a2)];
    const ce = Math.cos(elev), se = Math.sin(elev), nx = -se, ny = ce;
    let k = 0;
    for (const { f, b } of mesh.userData.F) {
      const segA = f.seg === 0 ? a1 : f.seg === 1 ? a1 + a2 : a1 + a2 + a3, root = f.seg === 0 ? [0, 0] : f.seg === 1 ? E : W2;
      const rx = root[0] + f.x * Math.cos(segA), rz = root[1] - f.x * Math.sin(segA), ang = segA + lerp(f.a0, f.aF, fold), ca = Math.cos(ang), sa = Math.sin(ang);
      for (let q = 0; q < b.length; q += 3, k++) {
        const fx = b[q], fy = b[q + 1] + f.layer + fold * (f.layer * 1.5), fz = b[q + 2];
        const lx = rx + fx * ca + fz * sa, lz = rz - fx * sa + fz * ca;   // 羽を回して、根もとへ
        const wx = lx * ce - fy * se, wy = lx * se + fy * ce;             // はばたき（肩を軸に上下）
        P.setXYZ(k, s * (SH[0] + wx), SH[1] + wy, SH[2] + lz); N.setXYZ(k, nx, s * ny, 0);
      }
    }
    P.needsUpdate = true; N.needsUpdate = true;
  }
  g.userData = { kind: 'tori', body, wings, tailPiv, legs, head: null, cap: bm, state: o.state || 'fly', ph: o.ph || 0 };
  // はばたき（見やすさのため 1 秒に約 9 回にゆっくりしてある）と、たたんで弾む「波形の飛び方」
  g.userData.animate = (t, moving = true) => {
    const st = g.userData.state;
    if (st === 'perch') { for (const w of wings) poseWing(w, -.32, 1); legs.visible = true; tailPiv.rotation.x = -.1 + .05 * Math.sin(t * 1.7); return 0; }
    legs.visible = false;
    const cyc = (t + g.userData.ph) * 9, beat = cyc % 6;               // 4 回はばたいて、2 拍ぶんたたむ
    if (beat > 4 && moving !== 'hover') { const u = sstep(4, 4.3, beat) * (1 - sstep(5.7, 6, beat)); for (const w of wings) poseWing(w, lerp(.3, -.28, u), u); tailPiv.rotation.x = .05; return -1; }
    const p = cyc * TAU, s1 = Math.sin(p), up = Math.cos(p) > 0 ? 0 : 1;   // 下ろすときは広げ、上げるときは少したたむ
    const elev = .25 + .85 * s1, fold = .38 * Math.max(0, -Math.cos(p));
    for (const w of wings) poseWing(w, elev, fold, -.1 * Math.max(0, s1));
    tailPiv.rotation.x = .08 * Math.sin(p + 1); return s1;
  };
  g.userData.animate(0);
  return g;
}

// ================================================================ 犬（柴犬・体高 35〜41 cm）
//   赤毛に「裏白」（頬・のど・胸・腹・脚の内・尾の裏が白っぽい）。立った三角の耳、巻いた尾、黒い鼻、奥まった三角の目。
export function makeDog(mat = stdMat, o = {}) {
  const g = new T.Group(); const R = 0xc06a2c, Cr = 0xf0e3c9, RD = 0xa85a24;
  const fur = mk(mat, 0xffffff, { vc: true, map: furTex([8, 4]), rough: .85, temp: .95, uv: .04 });
  const urajiro = (cyLim) => (t, sx, cy) => cy < cyLim ? Cr : cy < cyLim + .18 ? mixc(Cr, R, (cy - cyLim) / .18) : cy > .6 ? RD : R;
  g.add(new T.Mesh(sweep([[0, .63, -.5], [0, .66, -.36], [0, .65, -.12], [0, .64, .14], [0, .63, .33], [0, .62, .47]],
    tab([[0, .03], [.06, .12], [.2, .13], [.42, .115], [.7, .145], [.9, .13], [1, .05]]), tab([[0, .03], [.06, .15], [.2, .165], [.42, .14], [.7, .2], [.9, .19], [1, .06]]),
    (t, sx, cy) => t > .82 && cy < .25 ? Cr : urajiro(-.42)(t, sx, cy), { n: 30, r: 18 }), fur));
  g.add(new T.Mesh(sweep([[0, .7, .3], [0, .82, .42], [0, .9, .5]], tab([[0, .11], [1, .095]]), tab([[0, .14], [1, .1]]), (t, sx, cy) => cy < -.2 ? Cr : R, { n: 10, r: 16 }), fur));
  // 頭：額（ストップ）でくぼみ、細めのマズル
  const head = new T.Group(); head.position.set(0, .93, .5); g.add(head);
  head.add(new T.Mesh(sweep([[0, .02, -.07], [0, .035, .04], [0, .01, .13], [0, -.03, .22], [0, -.04, .27]], tab([[0, .07], [.25, .112], [.5, .09], [.66, .066], [.92, .05], [1, .012]]), tab([[0, .07], [.25, .1], [.5, .08], [.66, .058], [.92, .044], [1, .012]]),
    (t, sx, cy, x, y, z) => { if (t > .5 && cy < -.05) return Cr; if (t > .3 && t < .52 && cy < .25 && Math.abs(sx) > .5) return Cr; if (t > .38 && t < .5 && cy > .55 && Math.abs(sx) > .35 && Math.abs(sx) < .7) return Cr; return t > .55 ? mixc(R, 0xd08a50, (t - .55) * 2) : R; }, { n: 24, r: 16, k: (t, sx, cy) => 1 - .12 * Math.max(0, cy) * sstep(.45, .6, t) }), fur));
  head.add(ell(mk(mat, 0x121214, { rough: .3, temp: .9 }), 0, -.03, .275, .028, .022, .022, 12));        // 鼻
  const eyeM = mk(mat, 0x2a1a10, { rough: .1, temp: .9 }); for (const s of [-1, 1]) { const e = ell(eyeM, s * .06, .05, .125, .018, .012, .012, 10); e.rotation.z = s * -.25; e.rotation.y = s * .4; head.add(e); }
  const earM = mk(mat, 0xffffff, { vc: true, map: furTex([2, 2]), rough: .85, temp: .9, side: T.DoubleSide });
  for (const s of [-1, 1]) { const ear = new T.Mesh(sweep([[0, 0, 0], [0, .06, .01], [0, .12, .02]], tab([[0, .055], [1, .003]]), tab([[0, .02], [1, .002]]), (t, sx, cy) => cy > .2 ? Cr : R, { n: 6, r: 8, up: [0, 0, 1] }), earM); ear.position.set(s * .068, .1, .0); ear.rotation.set(.25, 0, -s * .25); head.add(ear); }
  // 脚：前は肩→肘→手首→足、後ろは腰→膝→かかと→足。肘と膝で曲げる
  const legs = [];
  const leg = (s, front) => { const top = new T.Group(); top.position.set(s * (front ? .085 : .095), front ? .6 : .63, front ? .32 : -.38); g.add(top);
    const up = new T.Mesh(sweep(front ? [[0, 0, 0], [0, -.1, -.03], [0, -.2, -.02]] : [[0, 0, 0], [0, -.12, .06], [0, -.24, .08]], tab([[0, .07], [1, .045]]), tab([[0, .08], [1, .05]]), (t, sx, cy) => s * sx < -.3 ? Cr : R, { n: 8, r: 12, up: [0, 0, 1] }), fur); top.add(up);
    const knee = new T.Group(); knee.position.set(0, front ? -.2 : -.24, front ? -.02 : .08); top.add(knee);
    const lo = new T.Mesh(sweep(front ? [[0, 0, 0], [0, -.18, .01], [0, -.33, .03]] : [[0, 0, 0], [0, -.12, -.1], [0, -.22, -.14]], tab([[0, .042], [1, .032]]), tab([[0, .045], [1, .034]]), (t, sx, cy) => t > .55 || s * sx < -.2 ? Cr : R, { n: 8, r: 10, up: [0, 0, 1] }), fur); knee.add(lo);
    const ank = new T.Group(); ank.position.set(0, front ? -.33 : -.22, front ? .03 : -.14); knee.add(ank);
    if (!front) ank.add(new T.Mesh(sweep([[0, 0, 0], [0, -.09, .03], [0, -.16, .06]], .03, .033, () => Cr, { n: 5, r: 8, up: [0, 0, 1] }), fur));
    const paw = ell(fur, 0, front ? -.045 : -.135, front ? .045 : .09, .045, .028, .06, 12); paw.geometry = paw.geometry.clone(); { const n = paw.geometry.attributes.position.count, cA = new Float32Array(n * 3), cc = new T.Color(Cr); for (let i = 0; i < n; i++) cA.set([cc.r, cc.g, cc.b], i * 3); paw.geometry.setAttribute('color', new T.BufferAttribute(cA, 3)); }
    ank.add(paw); legs.push({ top, knee, ank, s, front, off: (front ? 0 : Math.PI) + (s > 0 ? 0 : Math.PI) }); };
  for (const s of [-1, 1]) { leg(s, true); leg(s, false); }
  // 巻いた尾（背の上で巻く。裏は白い）
  g.add(new T.Mesh(sweep([[0, .74, -.48], [0, .92, -.56], [0, 1.03, -.46], [.03, 1.02, -.33], [.08, .93, -.31], [.1, .87, -.38]], tab([[0, .055], [.5, .06], [1, .025]]), tab([[0, .055], [.5, .065], [1, .025]]), (t, sx, cy) => cy < -.1 ? Cr : R, { n: 20, r: 12 }), fur));
  g.userData = { kind: 'inu', head, legs };
  // 速足（トロット）：対角の前後の脚が一緒に動く
  g.userData.animate = (t, moving = true) => {
    const p = t * 2 * TAU;
    for (const L of legs) { const ph = p + (L.front ? 0 : Math.PI) + (L.s > 0 ? 0 : Math.PI), sw = moving ? Math.sin(ph) : 0, lift = moving ? Math.max(0, Math.cos(ph)) : 0;
      L.top.rotation.x = sw * .42; L.knee.rotation.x = L.front ? -lift * .9 : lift * .7; L.ank.rotation.x = L.front ? lift * .5 : -lift * .4; }
    head.rotation.x = moving ? Math.sin(p * 2) * .03 : Math.sin(t * .7) * .05; head.rotation.y = moving ? 0 : Math.sin(t * .4) * .25;
  };
  g.userData.animate(0, false);
  return g;
}

// ================================================================ ヘビとミミズ：背骨にそって毎こま組み直す体
function spineBody(mat, opts) {
  const { N, R, radius, color, map, len = 1 } = opts, n = (N + 1) * (R + 1);
  const g = new T.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = [];
  for (let i = 0; i <= N; i++) for (let j = 0; j <= R; j++) { const k = i * (R + 1) + j, c = new T.Color(color(i / N, j / R)); col.set([c.r, c.g, c.b], k * 3); uv.set([i / N, j / R], k * 2); }
  for (let i = 0; i < N; i++) for (let j = 0; j < R; j++) { const a = i * (R + 1) + j, b = a + R + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setIndex(idx);
  const mesh = new T.Mesh(g, mk(mat, 0xffffff, { vc: true, map, rough: opts.rough ?? .5, temp: opts.temp ?? .3, uv: .04 })); mesh.frustumCulled = false;
  const S = Array.from({ length: N + 1 }, () => ({ p: new T.Vector3(), t: new T.Vector3(), r: 1 }));
  // shape(i/N, S) で背骨を決めたら update で肉づけ
  mesh.userData.update = (rMul = () => 1, flat = .85) => {
    const side = new T.Vector3(), up = new T.Vector3(), Y = new T.Vector3(0, 1, 0);
    for (let i = 0; i <= N; i++) { const s = S[i], u = i / N, r = radius(u) * rMul(u);
      side.crossVectors(Y, s.t).normalize(); up.crossVectors(s.t, side).normalize();
      for (let j = 0; j <= R; j++) { const a = j / R * TAU, sx = Math.sin(a), cy = Math.cos(a), k = (i * (R + 1) + j) * 3, yy = cy < 0 ? cy * flat * .9 : cy * flat;
        pos[k] = s.p.x + side.x * sx * r + up.x * yy * r; pos[k + 1] = s.p.y + side.y * sx * r + up.y * yy * r + r * flat * .9; pos[k + 2] = s.p.z + side.z * sx * r + up.z * yy * r; } }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals(); seam(g, N, R);
  };
  return { mesh, S };
}
// 体の向き（角度）の列から背骨をつなぐ：頭（u=1）から尾（u=0）へ積み上げる
function lay(S, len, ang, headPos = [0, 0, .45]) {
  const N = S.length - 1, ds = len / N; let x = headPos[0], z = headPos[2];
  for (let i = N; i >= 0; i--) { const a = ang(i / N); S[i].p.set(x, 0, z); S[i].t.set(Math.sin(a), 0, Math.cos(a)); x -= Math.sin(a) * ds; z -= Math.cos(a) * ds; }
}

// ================================================================ マムシ（Gloydius blomhoffii・全長 45〜60 cm）
//   太く短い体・短い尾・三角の頭。目と鼻孔のあいだにピット（熱を感じるくぼみ）。目は縦長の瞳。
//   背に、ふちの黒い丸い斑（銭形）が左右に並ぶ。目の後ろに黒い帯。
export function makeMamushi(mat = stdMat, o = {}) {
  const g = new T.Group(); const N = 90, R = 12;
  const tex = ctex('mamushi', 1024, 128, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8f7c60'); gr.addColorStop(.3, '#a08c6c'); gr.addColorStop(.42, '#5a5048'); gr.addColorStop(.5, '#3a3530'); gr.addColorStop(.58, '#5a5048'); gr.addColorStop(.7, '#a08c6c'); gr.addColorStop(1, '#8f7c60'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { const u = (.06 + i * .036) * w; for (const [v, off] of [[.16, 0], [.84, .018]]) { const x = u + off * w, y = v * h; c.fillStyle = '#2e241b'; c.beginPath(); c.ellipse(x, y, 15, 13, 0, 0, TAU); c.fill(); c.fillStyle = '#8a7558'; c.beginPath(); c.ellipse(x, y, 9.5, 8, 0, 0, TAU); c.fill(); c.fillStyle = '#4a3a2c'; c.beginPath(); c.ellipse(x - 1, y, 3, 3, 0, 0, TAU); c.fill(); } }
    for (let i = 0; i < 60; i++) { c.fillStyle = 'rgba(30,26,22,.6)'; c.beginPath(); c.arc((i / 60) * w, h * .5 + (i % 2 ? 6 : -6), 3, 0, TAU); c.fill(); }   // 腹の斑
  }, [1, 1]);
  const radius = u => .029 * Math.pow(sstep(0, .15, u), .7) * (1 - .4 * sstep(.9, 1, u)) + .0015;
  const { mesh, S } = spineBody(mat, { N, R, radius, color: () => 0xffffff, map: tex, rough: .45, temp: .3 });
  mesh.material.map = tex; const sc = mk(mat, 0xffffff, { map: scaleTex([60, 6]), transparent: true, opacity: .35, rough: .4, temp: .3, depthWrite: false }); mesh.add(new T.Mesh(mesh.geometry, sc)); g.add(mesh);
  // 頭
  const head = new T.Group(); g.add(head);
  const hc = (t, sx, cy) => { if (cy < -.3) return 0xd8cdb4; if (t > .3 && t < .78 && cy > -.25 && cy < .2 && Math.abs(sx) > .55) return 0x231b14; if (t > .3 && t < .8 && cy > .2 && cy < .38 && Math.abs(sx) > .5) return 0xcfc2a2; return 0x84705a; };
  head.add(new T.Mesh(sweep([[0, .0, -.01], [0, .002, .03], [0, .0, .065], [0, -.002, .08]], tab([[0, .017], [.35, .027], [.75, .02], [1, .006]]), tab([[0, .015], [.35, .014], [.75, .011], [1, .005]]), hc, { n: 16, r: 14, k: (t, sx, cy) => cy > .5 ? .95 : 1 }), mk(mat, 0xffffff, { vc: true, map: scaleTex([6, 3]), rough: .45, temp: .3 })));
  const eyeM = mk(mat, 0xb88a3a, { rough: .12, temp: .3 }), pupM = mk(mat, 0x050505, { rough: .1 }), pitM = mk(mat, 0x0c0907, { rough: .9 });
  for (const s of [-1, 1]) { head.add(ell(eyeM, s * .019, .009, .05, .006, .0065, .0065, 10)); head.add(ell(pupM, s * .0245, .009, .051, .0012, .0052, .0022, 6));   // 縦長の瞳
    head.add(ell(pitM, s * .0175, .002, .064, .0028, .0024, .002, 8)); head.add(ell(pitM, s * .009, .006, .077, .0018, .0015, .0015, 6)); }   // ピット・鼻孔
  const tongue = new T.Group(); tongue.position.set(0, -.002, .08); head.add(tongue); const tM = mk(mat, 0x1a1214, { rough: .4 });
  tongue.add(tube(tM, [[0, 0, 0], [0, -.002, .018]], .0012, .001, null, 3, 4)); for (const s of [-1, 1]) tongue.add(tube(tM, [[0, -.002, .018], [s * .004, -.004, .028]], .001, .0006, null, 3, 4));
  g.userData = { kind: 'hebi', head };
  let ph = 0, lastT = 0;
  g.userData.animate = (t, moving = true) => { const dt = clamp(t - lastT, 0, .1); lastT = t; ph += dt * (moving ? 1.6 : .15);
    // 蛇行：体にそって、頭から尾へ波が伝わる（体は同じ道すじをたどる）
    lay(S, 1, u => (.55 * sstep(.0, .25, u) * (1 - .7 * sstep(.75, 1, u)) + .1) * Math.sin(TAU * (1.25 * u + ph)) * (moving ? 1 : .55), [0, 0, .42]);
    mesh.userData.update(u => 1 + .02 * Math.sin(t * 1.5), .78);
    const hd = S[N]; head.position.set(hd.p.x, radius(1) * .2 + .012, hd.p.z); head.rotation.y = Math.atan2(hd.t.x, hd.t.z);
    const fl = (t * .7) % 2.4; tongue.visible = fl < .45; tongue.scale.setScalar(.6 + .4 * Math.sin(fl * 14)); };
  g.userData.animate(0, false);
  return g;
}

// ================================================================ ミミズ（フトミミズのなかま・体長 10〜20 cm）
//   目はない。体は百あまりの体節の輪。頭の側から 14〜16 節めに輪の形の環帯（色と太さが違う）。
//   はう：輪の筋がしまって細く長く、縦の筋がしまって太く短く、その波が頭から尾へ伝わる（蠕動）。
export function makeWorm(mat = stdMat, o = {}) {
  const g = new T.Group(); const N = 120, R = 10;
  const tex = ctex('worm', 1024, 64, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8a4a40'); gr.addColorStop(.35, '#a8665a'); gr.addColorStop(.5, '#d0a294'); gr.addColorStop(.65, '#a8665a'); gr.addColorStop(1, '#8a4a40'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(214,150,118,.95)'; c.fillRect(w * .84, 0, w * .035, h);                                    // 環帯（頭の側から 14〜16 節）
    for (let i = 0; i < 115; i++) { const x = i / 115 * w; c.fillStyle = 'rgba(60,24,20,.4)'; c.fillRect(x, 0, 1.2, h); } }, [1, 1]);
  const radius = u => .018 * Math.pow(sstep(0, .06, u), .5) * Math.pow(1 - sstep(.955, 1, u), .45) * (1 - .3 * sstep(.9, .97, u)) * (1 + .12 * sstep(.835, .845, u) * (1 - sstep(.87, .88, u))) + .002;
  const { mesh, S } = spineBody(mat, { N, R, radius, color: () => 0xffffff, map: tex, rough: .32, temp: .15 }); mesh.material.map = tex; g.add(mesh);
  g.userData = { kind: 'mimizu' };
  let ph = 0, lastT = 0;
  g.userData.animate = (t, moving = true) => { const dt = clamp(t - lastT, 0, .1); lastT = t; ph += dt * (moving ? 1.1 : .25);
    lay(S, 1, u => .18 * Math.sin(TAU * (.6 * u + t * .08)) + .06 * Math.sin(t * .5 + u * 3), [0, 0, .5]);
    mesh.userData.update(u => 1 + .28 * Math.sin(TAU * (3 * (1 - u) - ph)), .92); };
  g.userData.animate(0);
  return g;
}

// ================================================================ コウモリ（アブラコウモリ・頭胴 4〜6 cm・前腕 3〜3.6 cm・翼開長 約 20 cm）
//   翼は、長く伸びた指（第 2〜5 指）と前腕・後ろ脚のあいだに張った皮膜。親指は外に出て爪がある。
//   尾は脚のあいだの膜（腿間膜）に包まれ、かかとの軟骨（距）が膜のふちを支える。
export function makeBat(mat = stdMat, o = {}) {
  const g = new T.Group();
  const fur = mk(mat, 0xffffff, { vc: true, map: furTex([4, 3]), rough: .9, temp: .95, uv: .03 });
  g.add(new T.Mesh(sweep([[0, .0, -.42], [0, .02, -.2], [0, .03, .05], [0, .03, .22]], tab([[0, .04], [.2, .12], [.55, .145], [1, .1]]), tab([[0, .04], [.2, .11], [.55, .13], [1, .1]]), (t, sx, cy) => cy > -.1 ? 0x4b3a2c : 0x7a6654, { n: 16, r: 14 }), fur));
  const head = new T.Group(); head.position.set(0, .05, .27); g.add(head);
  head.add(new T.Mesh(sweep([[0, 0, -.04], [0, .01, .08], [0, -.01, .2], [0, -.02, .25]], tab([[0, .09], [.4, .1], [.8, .055], [1, .02]]), tab([[0, .09], [.4, .095], [.8, .05], [1, .02]]), (t, sx, cy) => t > .65 ? 0x2a2019 : 0x4b3a2c, { n: 12, r: 14 }), fur));
  const skin = mk(mat, 0x2b201b, { rough: .7, temp: .8, side: T.DoubleSide });
  for (const s of [-1, 1]) { const ear = new T.Mesh(sweep([[0, 0, 0], [0, .07, .0], [0, .13, -.01]], tab([[0, .055], [.6, .045], [1, .008]]), tab([[0, .02], [1, .004]]), () => 0x2b201b, { n: 6, r: 8, up: [0, 0, 1] }), skin); ear.position.set(s * .06, .07, .04); ear.rotation.set(-.2, s * -.5, s * -.35); head.add(ear);
    head.add(ell(mk(mat, 0x060606, { rough: .15 }), s * .055, .025, .17, .013, .013, .013, 8)); }
  // 皮膜と骨
  const memM = mk(mat, 0x2a1f1b, { rough: .75, side: T.DoubleSide, temp: .55, uv: .03 }), boneM = mk(mat, 0x3a2c24, { rough: .6, temp: .7 });
  const NB = 16, bones = [];
  for (let i = 0; i < NB * 2; i++) { const b = new T.Mesh(new T.CylinderGeometry(1, 1, 1, 5).translate(0, .5, 0).rotateX(Math.PI / 2), boneM); g.add(b); bones.push(b); }
  const patches = [];
  const patch = (nA, nB) => { const n = (nA + 1) * (nB + 1), geo = new T.BufferGeometry(), idx = []; geo.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3));
    for (let i = 0; i < nA; i++) for (let j = 0; j < nB; j++) { const a = i * (nB + 1) + j, b = a + nB + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); } geo.setIndex(idx); const m = new T.Mesh(geo, memM); m.frustumCulled = false; g.add(m); return { m, nA, nB }; };
  for (let s = 0; s < 2; s++) patches.push([patch(10, 6), patch(6, 5), patch(6, 5), patch(6, 4)]);
  const uro = patch(6, 6);
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const fillStrip = (P, A, B, scal = 0, toward = null, bulge = 0) => {   // A・B の折れ線のあいだに膜を張る。最後の列（後ろのふち）を内へ弧に
    const pos = P.m.geometry.attributes.position, pa = poly(A, P.nA), pb = poly(B, P.nA);
    for (let i = 0; i <= P.nA; i++) for (let j = 0; j <= P.nB; j++) { const u = j / P.nB, p = pa[i].clone().lerp(pb[i], u);
      if (scal && toward && i === P.nA) p.lerp(toward, scal * Math.sin(Math.PI * u)); else if (scal && toward) p.lerp(toward, scal * Math.sin(Math.PI * u) * Math.pow(i / P.nA, 3));
      p.y += bulge * Math.sin(Math.PI * u) * Math.sin(Math.PI * i / P.nA); pos.setXYZ(i * (P.nB + 1) + j, p.x, p.y, p.z); }
    pos.needsUpdate = true; P.m.geometry.computeVertexNormals(); };
  function poly(pts, n) { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1])); const out = []; for (let i = 0; i <= n; i++) { const d = L[L.length - 1] * i / n; let k = 1; while (k < pts.length - 1 && L[k] < d) k++; const u = (d - L[k - 1]) / ((L[k] - L[k - 1]) || 1); out.push(pts[k - 1].clone().lerp(pts[k], clamp(u, 0, 1))); } return out; }
  let bi = 0; const bone = (a, b, r) => { const m = bones[bi++]; m.position.copy(a); m.lookAt(b); m.scale.set(r, r, a.distanceTo(b)); };
  function pose(elev, fold) {
    bi = 0;
    const A = [];
    for (const s of [-1, 1]) {
      const rot = (x, y, z) => { const c = Math.cos(elev), sn = Math.sin(elev), X = x * c - y * sn, Y = x * sn + y * c; return V(s * (.1 + X), .04 + Y, .1 + z); };
      const pl = (x, z, y = 0) => rot(x, y, z);
      const fa = lerp(0, .9, fold), E = [.36 * Math.cos(.25 + fa * .3), -.36 * Math.sin(.25 + fa * .3)], fwA = lerp(-.12, -1.2, fold);
      const W = [E[0] + .68 * Math.cos(fwA), E[1] - .68 * Math.sin(fwA)];
      const dig = (ang, len, sag) => { const a = ang + lerp(0, -.9 - ang * .5, fold), l = len * lerp(1, .75, fold), m = [W[0] + l * .55 * Math.cos(a), W[1] - l * .55 * Math.sin(a)], tip = [W[0] + l * Math.cos(a - .08), W[1] - l * Math.sin(a - .08)]; return [pl(m[0], m[1], -sag * .5), pl(tip[0], tip[1], -sag)]; };
      const Sh = pl(0, 0), El = pl(...E), Wr = pl(...W), [d2m, d2] = dig(.42, .72, .02), [d3m, d3] = dig(.12, 1.2, .07), [d4m, d4] = dig(-.5, .95, .06), [d5m, d5] = dig(-1.12, .82, .05);
      const hip = V(s * .07, -.02, -.3), knee = V(s * .2, -.03, -.36), ank = V(s * .24, -.06, -.5), calc = V(s * .14, -.07, -.66);
      bone(Sh, El, .028); bone(El, Wr, .022); bone(Wr, d2m, .01); bone(d2m, d2, .008); bone(Wr, d3m, .012); bone(d3m, d3, .009); bone(Wr, d4m, .011); bone(d4m, d4, .008); bone(Wr, d5m, .011); bone(d5m, d5, .008);
      bone(Wr, pl(W[0] + .06, W[1] + .1, .03), .012);    // 親指
      bone(hip, knee, .02); bone(knee, ank, .016); bone(ank, calc, .007);
      const P = patches[s < 0 ? 0 : 1], toW = Wr.clone();
      fillStrip(P[0], [Sh, El, Wr], [V(s * .1, .0, .05), hip, knee, ank, d5], .18, toW, .03 * (1 - fold));     // 腕と脚のあいだ
      fillStrip(P[1], [Wr, d5m, d5], [Wr, d4m, d4], .22, toW, .02);
      fillStrip(P[2], [Wr, d4m, d4], [Wr, d3m, d3], .22, toW, .02);
      fillStrip(P[3], [Sh, El, Wr, d2m, d2], [Sh.clone().add(V(0, .0, .05)), El.clone().add(V(0, 0, .06)), Wr.clone().add(V(0, 0, .03)), d3m, d3], 0, null, 0);   // 腕の前・第 2〜3 指のあいだ
      A.push({ ank, calc });
    }
    const tb = V(0, -.02, -.42), tm = V(0, -.04, -.7), tt = V(0, -.06, -.95); bone(tb, tm, .012); bone(tm, tt, .009);
    fillStrip(uro, [A[0].ank, A[0].calc, tt], [A[1].ank, A[1].calc, tt], .1, tb, -.02);
    for (let k = 0; k < bones.length; k++) bones[k].visible = k < bi;
  }
  g.userData = { kind: 'koumori', head };
  g.userData.animate = (t, moving = true) => { const p = t * 7.5 * TAU, s1 = Math.sin(p); pose(lerp(.35, -.5, (s1 + 1) / 2) * -1 + .0, .45 * Math.max(0, Math.cos(p + .6))); };
  g.userData.animate(0);
  return g;
}
