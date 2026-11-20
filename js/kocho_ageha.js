// © mitsulab. ナミアゲハ（Papilio xuthus）の翅を、形態にそって描き直す（HP の背景の蝶のための部品）。
// 外から取りこんだ画像・3D はない。翅の外形・翅脈・斑紋は、この画面の中で描く。
//   前翅：中室に細い黄白の条が 4 本と、その先に横の斑が 2 つ。中室の外に、翅脈で区切られた黄白の斑の帯。外縁にそって三日月の斑の列。
//   後翅：基半は黄白で黒い翅脈、外側に黒い帯。帯の中に青い鱗粉、その外に黄白の三日月の列。肛角に橙の斑。M3 脈の先が尾状突起。
//   裏面：地の黄白が淡く広く、黒は褐色がかる。後翅の黒帯の内側に橙の斑が並ぶ。
import { T, flatShape, smoothPts, shapeTex } from './creatures_kochou.js';

const L = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// 外形（x＝体から外へ、y＝頭の向き。単位は体の長さ）
const FW = smoothPts([[0, .03], [.3, .17], [.7, .33], [1.1, .47], [1.34, .545], [1.45, .55], [1.49, .5], [1.46, .38], [1.39, .21], [1.31, .05], [1.22, -.11], [1.13, -.25], [1.05, -.335], [.98, -.345], [.7, -.27], [.4, -.17], [.14, -.06]], 5, [0]);
const HW = smoothPts([[0, 0], [.3, .07], [.62, .06], [.88, -.01], [1.0, -.12], [1.045, -.24], [1.03, -.33], [1.075, -.43], [1.02, -.52], [1.025, -.62], [.955, -.69], [.915, -.775],
  [.912, -.97], [.932, -1.12], [.918, -1.2], [.878, -1.212], [.852, -1.14], [.862, -.975], [.838, -.84],
  [.74, -.84], [.68, -.915], [.6, -.89], [.52, -.955], [.45, -.9], [.38, -.905], [.325, -.84], [.27, -.66], [.2, -.45], [.1, -.22]], 5, [0]);
// 翅脈：[起点, 終点]。となり合う 2 本のあいだが「室」
const FV = [[[.8, .33], [1.3, .535]], [[.8, .33], [1.45, .548]], [[.8, .33], [1.485, .47]], [[.8, .33], [1.455, .36]], [[.74, .21], [1.385, .2]], [[.67, .08], [1.305, .04]], [[.52, .045], [1.215, -.12]], [[.34, .03], [1.125, -.26]], [[0, 0], [1.02, -.34]], [[0, -.02], [.9, -.335]]];
const HV = [[[0, 0], [.88, -.01]], [[.5, -.12], [1.045, -.24]], [[.5, -.12], [1.075, -.43]], [[.44, -.22], [1.025, -.62]], [[.38, -.33], [.87, -.8]], [[.3, -.3], [.68, -.915]], [[.2, -.2], [.52, -.955]], [[0, -.01], [.37, -.9]]];

function paint(c, path, fore, under, lite) {
  const Y = under ? '#f3edcb' : '#ece3ad', K = under ? '#2b2118' : '#15110d', V = fore ? FV : HV;
  const pt = (i, t, u) => L(L(V[i][0], V[i][1], t), L(V[i + 1][0], V[i + 1][1], t), u);
  const poly = (pts, col) => { c.fillStyle = col; c.strokeStyle = col; c.lineWidth = .012; c.lineJoin = 'round'; c.beginPath(); c.moveTo(...pts[0]); for (const p of pts.slice(1)) c.lineTo(...p); c.closePath(); c.fill(); c.stroke(); };
  const patch = (i, t0, t1, col = Y, ins = .13) => { const a = [], b = []; for (let k = 0; k <= 8; k++) { const t = t0 + (t1 - t0) * k / 8; a.push(pt(i, t, ins)); b.unshift(pt(i, t, 1 - ins)); } poly(a.concat(b), col); };
  const lunule = (i, t0, t1, col = Y) => { const a = [], b = [], d = t1 - t0; for (let k = 0; k <= 10; k++) { const u = .16 + .68 * k / 10, w = 4 * (k / 10) * (1 - k / 10); a.push(pt(i, t1 - d * w, u)); b.unshift(pt(i, t1 - d * .42 * w, u)); } poly(a.concat(b), col); };
  const line = (pts, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(...pts[0]); for (const p of pts.slice(1)) c.lineTo(...p); c.stroke(); };
  let seed = fore ? 3 : 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  c.fillStyle = K; c.fill(path);
  if (fore) {
    // 中室：細い条 4 本と、先の横の斑 2 つ
    const A = [.8, .33], B = [.66, .06], O = [0, .015];
    for (let k = 0; k < 4; k++) { const u = .16 + k * .22, e = L(A, B, u); line([L(O, e, .1), L(O, e, .6)], .017 - k * .002, Y); }
    for (const [t0, t1] of [[.68, .78], [.87, .95]]) poly([L(L(O, A, t0), L(O, B, t0), .1), L(L(O, A, t1), L(O, B, t1), .1), L(L(O, A, t1), L(O, B, t1), .9), L(L(O, A, t0), L(O, B, t0), .9)], Y);
    // 中室の外の斑の帯（前縁では小さく、後縁へ大きくなる）
    const band = under ? [[.5, .7], [.44, .68], [.34, .66], [.24, .64], [.16, .63], [.12, .65], [.08, .68], [.2, .74], [.2, .72]] : [[.55, .68], [.5, .66], [.4, .62], [.3, .6], [.22, .6], [.18, .62], [.12, .66], [.25, .72], [.22, .7]];
    band.forEach(([t0, t1], i) => patch(i, t0, t1, Y, i > 6 ? .2 : .13));
    for (let i = 1; i < 8; i++) lunule(i, .8, .885);            // 外縁の三日月
    for (let i = 0; i < 9; i++) patch(i, .972, 1.0, Y, .3);     // 縁毛の白い切れ目
    line([[.02, .05], [.9, .4]], .008, Y);                      // 前縁の細い条
  } else {
    // 基半の黄白（中室と各室）
    poly([[0, 0], [.5, -.12], [.44, -.22], [.38, -.33], [.2, -.2], [0, -.01]], Y);
    const ext = [.72, .56, .54, .52, .52, .5, .46];
    for (let i = 0; i < 7; i++) patch(i, i ? 0 : .08, ext[i], Y, .1);
    // 黒い帯の中：裏は橙の斑、表裏とも青い鱗粉、外に三日月
    if (under) for (let i = 2; i < 6; i++) patch(i, ext[i] + .05, ext[i] + .13, '#dc8a3c', .2);
    for (let i = 1; i < 7; i++) { const n = lite ? 70 : 150, t0 = under ? ext[i] + .16 : .65; for (let k = 0; k < n; k++) { const t = t0 + (rnd() + rnd() + rnd()) * .035, u = .14 + rnd() * .72, p = pt(i, t, u); c.fillStyle = `rgba(${78 + rnd() * 40 | 0},${128 + rnd() * 40 | 0},${225 + rnd() * 30 | 0},${.3 + rnd() * .45})`; c.beginPath(); c.arc(p[0], p[1], .003 + rnd() * .004, 0, 6.3); c.fill(); } }
    for (let i = 1; i < 6; i++) lunule(i, .83, .925);
    lunule(6, .8, .92, '#e0702c');                              // 肛角の手前の橙
    const g = c.createRadialGradient(.405, -.815, 0, .405, -.815, .07); g.addColorStop(0, '#f08a30'); g.addColorStop(.7, '#dd5e22'); g.addColorStop(1, 'rgba(221,94,34,0)'); c.fillStyle = g; c.beginPath(); c.arc(.405, -.815, .07, 0, 6.3); c.fill();   // 肛角の橙の斑
    c.fillStyle = K; c.beginPath(); c.arc(.41, -.83, .022, 0, 6.3); c.fill();
    line([[.34, -.74], [.4, -.755], [.455, -.74]], .012, 'rgba(96,146,236,.9)');   // 橙の上の青い弧
    for (let i = 0; i < 7; i++) patch(i, .975, 1.0, Y, .3);     // 縁毛
    // 内縁（腹に沿う側）：黒っぽく、淡い毛
    poly([[0, -.02], [.37, -.9], [.3, -.8], [.2, -.45], [.08, -.2]], under ? '#4a3d2c' : '#2a231a');
  }
  // 翅脈（黒）
  V.forEach(([o, e], i) => line([o, e], fore ? .011 : .012, K));
  if (fore) { line([[0, .03], [.8, .33], [.74, .21], [.67, .08]], .012, K); line([[0, 0], [.34, .03], [.52, .045], [.67, .08]], .012, K); }
  else { line([[0, 0], [.5, -.12], [.44, -.22], [.38, -.33], [.2, -.2], [0, -.01]], .012, K); line([[.87, -.8], [.89, -1.19]], .012, K); }
  // 黒い所に散る黄白の鱗粉・基部の毛の影
  for (let k = 0; k < (lite ? 500 : 1600); k++) { const x = rnd() * 1.5, y = fore ? rnd() * .95 - .38 : -rnd() * 1.25 + .08; c.fillStyle = `rgba(240,228,170,${rnd() * (under ? .3 : .16)})`; c.fillRect(x, y, .004, .004); }
  const gb = c.createRadialGradient(0, 0, 0, 0, 0, fore ? .34 : .28); gb.addColorStop(0, 'rgba(20,16,12,.85)'); gb.addColorStop(1, 'rgba(20,16,12,0)'); c.fillStyle = gb; c.fill(path);
  // 鱗粉の粒（細かな明暗のむら）
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'multiply'; c.fillStyle = c.createPattern(grain(), 'repeat'); c.fillRect(0, 0, c.canvas.width, c.canvas.height); c.restore();
}

let GR = null;
function grain() { if (GR) return GR; GR = document.createElement('canvas'); GR.width = GR.height = 128; const g = GR.getContext('2d'), d = g.createImageData(128, 128), a = d.data; let s = 5;
  for (let i = 0; i < a.length; i += 4) { s = (s * 16807) % 2147483647; const v = 215 + (s % 41); a[i] = a[i + 1] = a[i + 2] = v; a[i + 3] = 255; } g.putImageData(d, 0, 0); return GR; }
let GEO = null;
// makeButterfly('ageha') の翅を、上の外形と絵に入れ替える。photo＝写実の材質（透け・鱗粉の照り）も入れる
export function upgradeAgeha(m, { photo = false, lite = false } = {}) {
  GEO ||= { f: flatShape(FW), h: flatShape(HW) };
  const size = lite ? 512 : 768;
  const tex = (fore, under) => { const t = shapeTex(`ag3${fore ? 'F' : 'H'}${under ? 'u' : ''}${size}`, fore ? GEO.f : GEO.h, fore ? FW : HW, (c, path) => paint(c, path, fore, under, lite), size); t.anisotropy = 8; return t; };
  for (const w of m.userData.wings || []) [[w.piv, true], [w.hp, false]].forEach(([g, fore]) => g.children.forEach((o, k) => {
    if (!o.isMesh) return; o.geometry = fore ? GEO.f : GEO.h; const mt = o.material.clone(); mt.map = tex(fore, k === 1); mt.sheenColorMap = null;
    if (photo) { mt.roughness = .74; mt.sheen = .7; mt.sheenRoughness = .5; mt.sheenColor = new T.Color(k === 1 ? 0x3a3020 : 0x4a4636); mt.normalScale.set(.42, .42);
      mt.emissive = new T.Color(0xffffff); mt.emissiveMap = mt.map; mt.emissiveIntensity = .14; }   // 翅は薄く、光が淡く透ける（影の側でも模様が沈みきらない）
    o.material = mt; }));
  return m;
}
