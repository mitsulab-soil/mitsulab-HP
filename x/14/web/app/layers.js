/* Qualia/walk 氷川 ── 層の物の形（2026-10-22）。mitsulab が three.js の基本形だけで組んだ 3D（外の模型は使っていない）。
   どの物も同じ骨組み：足もとの目盛りの輪（測る道具の目盛り）→ 細い光の柱 → 層ごとの形の頭 → 名札。
   形は層の中身から：樹木＝芽の形／土と水＝地層の重なり／生きもの＝まわる点／歴史＝碑／鳥居と石＝鳥居の線／
   参道の暮らし＝道と人の流れ／祭礼と暦＝輪と暦の目盛り／地名＝印／災害＝三角／Qualia/sight＝目／Qualia/sound＝音の輪。 */
import * as THREE from "three";

export const QLAYERS = [
  { id: "sight", name: "Qualia/sight", en: "UMWELT", color: "#c4b2ff", lead: "生きものを選んで、その身体の高さと手がかりへ入る", q: true },
  { id: "sound", name: "Qualia/sound", en: "SOUND", color: "#78b8ec", lead: "参道の音（葉ずれ・鳥と蟬の声・玉砂利・池の水）を、場所に重ねて形にする", q: true },
  { id: "sho", name: "Qualia/sho", en: "SHO", color: "#9aa3b8", lead: "上原光瑛の書が参道に浮かび、近づくと粒にほどけ、音が鳴る", q: true },
  { id: "touch", name: "Qualia/touch", en: "TOUCH", color: "#c2c7cc", lead: "樹皮・石・土・木に触れると、振動と音で手ざわりが返る", q: true },
];

let GLOW = null;
export function glowTex() {
  if (GLOW) return GLOW; const cv = document.createElement("canvas"); cv.width = cv.height = 64; const x = cv.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.18, "rgba(255,255,255,.55)"); gr.addColorStop(.5, "rgba(255,255,255,.12)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); GLOW = new THREE.CanvasTexture(cv); GLOW.colorSpace = THREE.SRGBColorSpace; return GLOW;
}
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const circ = (r, n = 64, z = 0) => Array.from({ length: n + 1 }, (_, i) => V(Math.cos(i / n * 6.2832) * r, Math.sin(i / n * 6.2832) * r, z));
function segs(pairs) { const g = new THREE.BufferGeometry().setFromPoints(pairs.flat()); return g; }

/* 頭の形：線（LineSegments）と、うすい面（Mesh）と、点 */
function headShape(id) {
  const L = [], F = [];   // L＝線の組、F＝面の幾何
  const ring = (r, n, y = 0, rot = 0) => { const p = circ(r, n); for (let i = 0; i < n; i++) L.push([p[i].clone().applyAxisAngle(V(1, 0, 0), rot).add(V(0, y, 0)), p[i + 1].clone().applyAxisAngle(V(1, 0, 0), rot).add(V(0, y, 0))]); };
  if (id === "trees") {   // 芽：六角の両錐（縦に長い）
    const n = 6, r = .13, h = .34, top = V(0, h), bot = V(0, -h * .7), mid = Array.from({ length: n }, (_, i) => V(Math.cos(i / n * 6.283) * r, 0, Math.sin(i / n * 6.283) * r));
    mid.forEach((p, i) => { L.push([p, mid[(i + 1) % n]], [p, top], [p, bot]); });
    const g = new THREE.ConeGeometry(r, h, n, 1, true); g.translate(0, h / 2, 0); F.push(g);
  } else if (id === "ground") {   // 地層：かさなる三枚の円板
    for (const [y, r] of [[.16, .2], [0, .26], [-.16, .22]]) { const p = circ(r, 40); for (let i = 0; i < 40; i++) L.push([V(p[i].x, y, p[i].y), V(p[i + 1].x, y, p[i + 1].y)]); const g = new THREE.CylinderGeometry(r, r, .05, 40, 1, false); g.translate(0, y, 0); F.push(g); }
  } else if (id === "life") {   // 生きもの：二十面体のまわりを点がまわる（頭の外の点は別に動かす）
    const g = new THREE.IcosahedronGeometry(.17, 0); F.push(g); const e = new THREE.EdgesGeometry(g), p = e.attributes.position; for (let i = 0; i < p.count; i += 2) L.push([V(p.getX(i), p.getY(i), p.getZ(i)), V(p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1))]);
    ring(.3, 48, 0, 1.2);
  } else if (id === "history") {   // 碑：細い八面体
    const g = new THREE.OctahedronGeometry(.2, 0); g.scale(.7, 1.9, .7); F.push(g); const e = new THREE.EdgesGeometry(g), p = e.attributes.position; for (let i = 0; i < p.count; i += 2) L.push([V(p.getX(i), p.getY(i), p.getZ(i)), V(p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1))]);
  } else if (id === "tatemono") {   // 鳥居の線：笠木（反り）・島木・貫・二本の柱（明神鳥居の模式）
    const k = .24, curve = Array.from({ length: 13 }, (_, i) => { const t = i / 12 * 2 - 1; return V(t * k * 1.32, .3 + Math.pow(Math.abs(t), 2.4) * .05); });
    for (let i = 0; i < 12; i++) L.push([curve[i], curve[i + 1]]);
    L.push([V(-k * 1.12, .25), V(k * 1.12, .25)], [V(-k * 1.02, .13), V(k * 1.02, .13)], [V(-k * .8, .3), V(-k * .86, -.32)], [V(k * .8, .3), V(k * .86, -.32)], [V(0, .25), V(0, .13)]);
    const g = new THREE.PlaneGeometry(k * 1.7, .62); g.translate(0, -.01, 0); F.push(g);
  } else if (id === "road") {   // 道と人の流れ：二本の線と、山形の矢じり
    L.push([V(-.12, -.32), V(-.12, .32)], [V(.12, -.32), V(.12, .32)]);
    for (const y of [-.16, .04, .24]) L.push([V(-.07, y - .07), V(0, y)], [V(0, y), V(.07, y - .07)]);
    const g = new THREE.PlaneGeometry(.24, .64); F.push(g);
  } else if (id === "matsuri") {   // 祭礼と暦：輪と十二の目盛り
    ring(.24, 48); ring(.16, 48);
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; L.push([V(Math.cos(a) * .25, Math.sin(a) * .25), V(Math.cos(a) * .31, Math.sin(a) * .31)]); }
    const g = new THREE.RingGeometry(.16, .24, 48); F.push(g);
  } else if (id === "chimei") {   // 地名：印（四角の枠と中の点）
    const s = .2; L.push([V(-s, -s), V(s, -s)], [V(s, -s), V(s, s)], [V(s, s), V(-s, s)], [V(-s, s), V(-s, -s)]);
    const s2 = .13; L.push([V(-s2, -s2), V(s2, -s2)], [V(s2, -s2), V(s2, s2)], [V(s2, s2), V(-s2, s2)], [V(-s2, s2), V(-s2, -s2)]);
    const g = new THREE.PlaneGeometry(s * 2, s * 2); F.push(g);
  } else if (id === "saigai") {   // 災害：三角
    const a = V(0, .3), b = V(-.27, -.18), c = V(.27, -.18); L.push([a, b], [b, c], [c, a]); L.push([V(0, .14), V(0, -.02)], [V(0, -.08), V(0, -.1)]);
    const sh = new THREE.Shape([new THREE.Vector2(0, .3), new THREE.Vector2(-.27, -.18), new THREE.Vector2(.27, -.18)]); F.push(new THREE.ShapeGeometry(sh));
  } else if (id === "sight") {   // 目：二つの弧と瞳
    const top = Array.from({ length: 25 }, (_, i) => { const t = i / 24 * 2 - 1; return V(t * .3, (1 - t * t) * .14); }), bot = top.map(p => V(p.x, -p.y));
    for (let i = 0; i < 24; i++) L.push([top[i], top[i + 1]], [bot[i], bot[i + 1]]);
    ring(.08, 32);
    F.push(new THREE.CircleGeometry(.08, 32));
  } else if (id === "sound") {   // 音：三重の輪（縦）
    ring(.1, 40); ring(.19, 56); ring(.28, 64);
    F.push(new THREE.CircleGeometry(.1, 32));
  } else if (id === "sho") {   // 書：入りから払いへ、太さの変わる一画
    const p = Array.from({ length: 33 }, (_, i) => { const t = i / 32; return V(-.26 + t * .52, .18 - Math.sin(t * Math.PI * .9) * .3 + t * .05); });
    for (let i = 0; i < 32; i++) { L.push([p[i], p[i + 1]]); const w = .05 * Math.sin(i / 32 * Math.PI) + .008; L.push([p[i].clone().add(V(0, w)), p[i + 1].clone().add(V(0, w))]); }
    L.push([V(-.26, .18), V(-.24, .26)]);
    F.push(new THREE.CircleGeometry(.03, 12));
  } else if (id === "touch") {   // 触れる：指の腹の渦（三つの弧）
    for (const r of [.1, .18, .26]) { const p = Array.from({ length: 29 }, (_, i) => { const a = Math.PI * (.15 + 1.7 * i / 28); return V(Math.cos(a) * r, Math.sin(a) * r * 1.2 - .04); }); for (let i = 0; i < 28; i++) L.push([p[i], p[i + 1]]); }
    F.push(new THREE.CircleGeometry(.07, 24));
  } else if (id === "nature" || id === "history" || id === "culture") { return headShape({ nature: "trees", history: "history", culture: "matsuri" }[id]);
  } else { const g = new THREE.SphereGeometry(.2, 12, 8); F.push(g); }
  return { L, F };
}

/* 物ひとつ：足もとの目盛りの輪・光の柱・頭・光 */
const TICKS = (() => { const P = []; for (let i = 0; i < 36; i++) { const a = i / 36 * 6.2832, r0 = i % 9 === 0 ? .27 : .31; P.push(V(Math.cos(a) * r0, 0, Math.sin(a) * r0), V(Math.cos(a) * .34, 0, Math.sin(a) * .34)); } return new THREE.BufferGeometry().setFromPoints(P); })();
const RING = (() => { const p = circ(.34, 72).map(q => V(q.x, 0, q.y)); return new THREE.BufferGeometry().setFromPoints(p); })();
const RING2 = (() => { const p = circ(.2, 48).map(q => V(q.x, 0, q.y)); return new THREE.BufferGeometry().setFromPoints(p); })();
let BEAM_G = null;
function beamGeo() {   // 下が明るく、上へ消える光の柱（頂点の色で）
  if (BEAM_G) return BEAM_G; const g = new THREE.CylinderGeometry(.012, .012, 1, 6, 4, true); g.translate(0, .5, 0);
  const p = g.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const k = Math.pow(1 - p.getY(i), 1.6); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = k; }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3)); BEAM_G = g; return g;
}
const HEADS = {};
export function makeMarker(id, color, h, mobile = false) {
  const c = new THREE.Color(color), root = new THREE.Group(), glyph = new THREE.Group();
  const lm = new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: .95, depthWrite: false, fog: true });
  const fm = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide, fog: true });
  const H = HEADS[id] ||= (() => { const s = headShape(id); return { lines: segs(s.L), faces: s.F }; })();
  glyph.add(new THREE.LineSegments(H.lines, lm)); const faces = []; for (const f of H.faces) { const fmsh = new THREE.Mesh(f, fm); glyph.add(fmsh); faces.push(fmsh); }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: c.clone().lerp(new THREE.Color("#ffffff"), .35), transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }));
  sp.scale.setScalar(.5); glyph.add(sp);
  let orb = null;
  if (id === "life") { orb = new THREE.Points(new THREE.BufferGeometry().setFromPoints([V(.3, 0, 0)]), new THREE.PointsMaterial({ color: "#ffffff", size: mobile ? 4 : 3.2, sizeAttenuation: false, transparent: true, depthWrite: false })); glyph.add(orb); }
  glyph.position.y = h; root.add(glyph);
  const bm = new THREE.MeshBasicMaterial({ color: c, vertexColors: true, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
  const beam = new THREE.Mesh(beamGeo(), bm); beam.scale.y = Math.max(.05, h - .25); root.add(beam);
  const tm = new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: .8, depthWrite: false, fog: true });
  const base = new THREE.Group(); base.add(new THREE.LineSegments(TICKS, tm), new THREE.Line(RING, tm), new THREE.Line(RING2, tm)); base.position.y = .03; root.add(base);
  return { root, glyph, base, beam, faces, glow: sp, orb, mats: [lm, fm, bm, tm], lm, fm, bm, tm };
}

/* 名札（明朝）：層の番号と名前・物の名前。近くに来たときだけ出す */
const FONT = '"Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho",serif';
const MONO = '"JetBrains Mono",ui-monospace,"SF Mono",Menlo,monospace';
function mixHex(a, b, t) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return "rgb(" + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",") + ")"; }
export function makeLabel(no, layer, title, color) {
  const W = 512, H = 128, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const x = cv.getContext("2d");
  // 2026-10-22 箱をやめ、視野に重なる札に：左の細い線と角だけ。字の下だけ、横にうすく暗く（明るい空や地面でも読める）
  const gr = x.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, "rgba(3,6,15,.72)"); gr.addColorStop(.7, "rgba(3,6,15,.4)"); gr.addColorStop(1, "rgba(3,6,15,0)");
  x.fillStyle = gr; x.fillRect(0, 22, W, 84);
  x.fillStyle = color; x.fillRect(0, 18, 3, 92); x.fillRect(0, 18, 22, 2); x.fillRect(0, 108, 22, 2);
  // 2026-10-22 夜 電脳の HUD の字：番号と層は細いモノスペースで層の色に光り、名前は層の色を帯びた明朝。暗い影の上に、色のにじむ光を重ねる
  const glow = (txt, px, py, fill, blur) => { x.shadowOffsetY = 1; x.shadowColor = "rgba(0,6,14,.95)"; x.shadowBlur = 6; x.fillStyle = fill; x.fillText(txt, px, py); x.shadowOffsetY = 0; x.shadowColor = color; x.shadowBlur = blur; x.fillText(txt, px, py); };
  x.font = `300 20px ${MONO}`; glow(`L${String(no).padStart(2, "0")} ⁄ `, 22, 50, color, 10);
  const w0 = x.measureText(`L${String(no).padStart(2, "0")} ⁄ `).width; x.font = `500 21px ${FONT}`; glow(layer, 22 + w0, 50, color, 10);
  x.fillStyle = color; for (let i = 0; i < 6; i++) x.fillRect(W - 120 + i * 9, 40, 5, 2);   // 右の小さな刻み
  let fs = 38; x.font = `600 ${fs}px ${FONT}`; while (x.measureText(title).width > W - 44 && fs > 22) { fs -= 2; x.font = `600 ${fs}px ${FONT}`; }
  glow(title, 22, 94, mixHex(color, "#f2fbff", .7), 14);
  x.shadowBlur = 0; x.shadowColor = "transparent";
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: true, fog: false }));   // 2026-10-26 遠くの札が霧で淡くならないように
  s.center.set(0, 0); s.scale.set(1.6, .4, 1); s.renderOrder = 6; return s;
}

/* 層の欄の絵：うすいガラスの板の上に、その層の頭の形（同じ描画の中で一枚ずつ写す） */
export function layerThumbs(renderer, envMap, layers, size = [168, 120]) {
  const [W, H] = size, rt = new THREE.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
  const sc = new THREE.Scene(); sc.environment = envMap;
  const cam = new THREE.PerspectiveCamera(30, W / H, .01, 10); cam.position.set(.55, .5, 1.25); cam.lookAt(0, .08, 0);
  sc.add(new THREE.HemisphereLight("#dfe9ff", "#202634", 1.2)); const dl = new THREE.DirectionalLight("#ffffff", 2); dl.position.set(.4, 1, .6); sc.add(dl);
  const plateG = new THREE.BoxGeometry(.9, .018, .62);
  const px = new Uint8Array(W * H * 4), cv = document.createElement("canvas"); cv.width = W; cv.height = H; const cx = cv.getContext("2d"), img = cx.createImageData(W, H);
  const out = {}, oldT = renderer.getRenderTarget(), oldC = new THREE.Color(), oldA = renderer.getClearAlpha(); renderer.getClearColor(oldC);
  for (const L of layers) {
    const g = new THREE.Group(), c = new THREE.Color(L.color);
    const plate = new THREE.Mesh(plateG, new THREE.MeshPhysicalMaterial({ color: c.clone().lerp(new THREE.Color("#ffffff"), .5), metalness: 0, roughness: .08, transmission: 0, transparent: true, opacity: .28, envMapIntensity: 1.4 }));
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(plateG), new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: .9 }));
    g.add(plate, edge);
    const m = makeMarker(L.id, L.color, .42); m.glow.scale.setScalar(.34); m.root.scale.setScalar(.9); g.add(m.root);
    sc.add(g); renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
    for (let y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    cx.putImageData(img, 0, 0); out[L.id] = cv.toDataURL("image/png"); sc.remove(g);
  }
  renderer.setRenderTarget(oldT); renderer.setClearColor(oldC, oldA); rt.dispose();
  return out;
}
