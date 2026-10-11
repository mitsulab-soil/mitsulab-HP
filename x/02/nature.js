/* 環世界の庭：草木と生きものの形（2026-10-08 作り込み）
   本人（コーディネーター経由）「3D の造形が素朴→花（花弁・雄しべ・葉の形と質感が種ごとに正しい）・木・草・池・石・生きもの…を豊かに。形態の正しさ（脚・翅・触角の数）を確かめる。スマホの軽さは保つ。」
   素材はすべてこの画面の中で描く（外から取りこんだ 3D・テクスチャなし）。形態の根拠＝調べたこと/形態の確かめ.md
   大きさ：草木は実物大。生きものは見やすさのため、小鳥・ネズミ 1.5 倍、蝶 2 倍、蜂 3 倍（README に明記）。 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { crownHook } from "./zen.js";

let M, canvasTex, tx;
// CC0 の写真の質感（Poly Haven・台帳 M-0793〜0796）。読めないときは、この画面で描いた質感のまま
export function photoTex(file, rx = 1, ry = 1) {
  const t = new THREE.TextureLoader().load("tex/" + file); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t;
}
const TAU = Math.PI * 2;
const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------- 形の部品
// 花びら・葉：長さ方向に v（0＝根もと → 1＝先）、幅方向に u。cup＝幅方向のくぼみ、curl＝長さ方向の反り
function bladeGeo(len, wid, { cup = .2, curl = 0, seg = 6, shape = t => Math.sin(Math.PI * Math.pow(t, .65)) } = {}) {
  const g = new THREE.PlaneGeometry(1, 1, 2, seg), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), t = p.getY(i) + .5, w = wid * shape(t);
    p.setXYZ(i, x * w, t * len, cup * w * (4 * x * x) + curl * len * t * t);
  }
  g.computeVertexNormals(); return g;
}
// 茎：ゆるく曲がった細い筒（先ほど細く）
function stemGeo(h, r0, r1, bend = .05, seg = 8) {
  const pts = []; for (let i = 0; i <= seg; i++) { const t = i / seg; pts.push(new THREE.Vector3(Math.sin(t * 2.1) * bend * t, t * h, Math.sin(t * 1.3) * bend * .6 * t)); }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg * 2, 1, 5, false), p = g.attributes.position, uv = g.attributes.uv;
  // 半径を根もと r0 → 先 r1 に（Tube は半径 1 で作り、中心線からの距離を縮める）
  const c = new THREE.CatmullRomCurve3(pts);
  for (let i = 0; i < p.count; i++) { const t = uv.getX(i), q = c.getPointAt(t), v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).sub(q).multiplyScalar(lerp(r0, r1, t)); p.setXYZ(i, q.x + v.x, q.y + v.y, q.z + v.z); }
  g.computeVertexNormals(); return { geo: g, curve: c };
}
// でこぼこの石（ノイズで押し出し、色の濃淡を頂点に）
function rockGeo(seed = 1, detail = 2) {
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position, col = [];
  const n = (x, y, z) => Math.sin(x * 2.1 + seed) * Math.sin(y * 2.7 + seed * 1.3) * Math.sin(z * 1.9 + seed * .7) + .5 * Math.sin(x * 5.3 + y * 4.1 + seed) * .3;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)), k = 1 + .22 * n(v.x, v.y, v.z);
    v.multiplyScalar(k); v.y *= .62; p.setXYZ(i, v.x, v.y, v.z);
    const s = .78 + .22 * n(v.z * 3, v.x * 3, v.y * 3), lichen = n(v.x * 6, v.z * 6, seed) > .62;
    col.push(...(lichen ? [s * .82, s * .86, s * .6] : [s * .9, s * .88, s * .84]));
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
const geoAt = (g, { s = 1, sx = s, sy = s, sz = s, rx = 0, ry = 0, rz = 0, x = 0, y = 0, z = 0 } = {}) => g.clone().scale(sx, sy, sz).rotateX(rx).rotateY(ry).rotateZ(rz).translate(x, y, z);

// ---------------------------------------------------------------- 絵の具（花びら・葉・樹皮・翅）
function petalTex(base, tip, vein, { blotch = null, edge = null } = {}) {
  return canvasTex(64, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, base); gr.addColorStop(1, tip); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = vein; g.globalAlpha = .35; for (let i = -3; i <= 3; i++) { g.lineWidth = i ? 1 : 1.6; g.beginPath(); g.moveTo(w / 2, h); g.quadraticCurveTo(w / 2 + i * 6, h * .5, w / 2 + i * 9, 0); g.stroke(); } g.globalAlpha = 1;
    if (blotch) { const b = g.createRadialGradient(w / 2, h, 2, w / 2, h, h * .3); b.addColorStop(0, blotch); b.addColorStop(.75, blotch); b.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = b; g.fillRect(0, h * .6, w, h * .4); if (edge) { g.strokeStyle = edge; g.lineWidth = 2; g.beginPath(); g.arc(w / 2, h, h * .24, Math.PI, TAU); g.stroke(); } }
  });
}
// 紫外の地図（白＝返す・黒＝吸う）：根もとから frac までが黒（ヒマワリ・ルドベキアの的）
const uvGrad = (frac, soft = .06) => canvasTex(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, "#000"); gr.addColorStop(Math.max(0, frac - soft), "#000"); gr.addColorStop(Math.min(1, frac + soft), "#fff"); gr.addColorStop(1, "#fff"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false);
// 葉：形を描き、外は透明（alphaTest）。主脈・側脈・縁のきざみ
function leafTex(kind) {
  return canvasTex(128, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const cx = w / 2, path = new Path2D();
    if (kind === "himawari") {          // 卵形〜心形・縁にあらい鋸歯（ヒマワリ）
      path.moveTo(cx, h); for (let i = 0; i <= 40; i++) { const t = i / 40, y = h - t * h, ww = w * .48 * Math.sin(Math.PI * Math.pow(t, .55)) * (t < .12 ? .7 + t * 2.5 : 1), sw = (i % 2 ? 4 : 0); path.lineTo(cx + ww + sw, y); }
      for (let i = 40; i >= 0; i--) { const t = i / 40, y = h - t * h, ww = w * .48 * Math.sin(Math.PI * Math.pow(t, .55)) * (t < .12 ? .7 + t * 2.5 : 1), sw = (i % 2 ? 4 : 0); path.lineTo(cx - ww - sw, y); }
    } else if (kind === "rudbeckia") {  // 披針形・へりはほぼ全縁（アラゲハンゴンソウ）
      path.moveTo(cx, h); for (let i = 0; i <= 30; i++) { const t = i / 30; path.lineTo(cx + w * .26 * Math.sin(Math.PI * Math.pow(t, .8)), h - t * h); } for (let i = 30; i >= 0; i--) { const t = i / 30; path.lineTo(cx - w * .26 * Math.sin(Math.PI * Math.pow(t, .8)), h - t * h); }
    } else if (kind === "hinageshi") {  // 羽状に深く裂ける（ヒナゲシ）
      path.moveTo(cx, h);
      const side = s => { for (let k = 0; k < 6; k++) { const y0 = h - (k + .5) / 6.2 * h, L = w * .44 * (1 - k / 8); path.lineTo(cx + s * w * .05, y0 + 10); path.lineTo(cx + s * L, y0 - 4); path.lineTo(cx + s * L * .7, y0 - 14); path.lineTo(cx + s * w * .05, y0 - 18); } path.lineTo(cx, 0); };
      side(1); path.moveTo(cx, h); side(-1);
    } else if (kind === "keyaki") {      // 欅の小枝：互生の卵形の葉・縁に弧を描く鋸歯
      for (const [ox, rot] of [[-22, -.25], [22, .25], [0, 0]]) {
      g.save(); g.translate(ox, 0); g.translate(cx, h); g.rotate(rot); g.translate(-cx, -h);
      g.strokeStyle = "#5b4a36"; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, h); g.lineTo(cx + 6, 0); g.stroke();
      for (let k = 0; k < 9; k++) { const y = h - (k + .7) * h / 9.6, s = k % 2 ? 1 : -1, L = 52 - k * 2.5;
        g.save(); g.translate(cx + 3, y); g.rotate(s * (.9 - k * .03)); const lp = new Path2D(); lp.moveTo(0, 0); for (let i = 0; i <= 14; i++) { const t = i / 14; lp.lineTo(-L * t, 9 * Math.sin(Math.PI * Math.pow(t, .7)) + (i % 2) * 1.5); } for (let i = 14; i >= 0; i--) { const t = i / 14; lp.lineTo(-L * t, -9 * Math.sin(Math.PI * Math.pow(t, .7)) - (i % 2) * 1.5); }
        g.fillStyle = `hsl(${95 + k * 3},45%,${30 + (k % 3) * 4}%)`; g.fill(lp); g.strokeStyle = "rgba(220,240,180,.35)"; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(-L, 0); g.stroke(); g.restore(); }
      g.restore(); }
      return;
    }
    const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, kind === "hinageshi" ? "#6a9a52" : "#4f8636"); gr.addColorStop(1, kind === "hinageshi" ? "#7aa95f" : "#68a046");
    g.fillStyle = gr; g.fill(path);
    g.save(); g.clip(path);
    g.strokeStyle = "rgba(200,230,170,.45)"; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, h); g.lineTo(cx, 6); g.stroke(); g.lineWidth = 1;
    for (let k = 1; k < 9; k++) { const y = h - k * h / 9.5; g.beginPath(); g.moveTo(cx, y + 8); g.quadraticCurveTo(cx + 20, y, cx + 50, y - 16); g.moveTo(cx, y + 8); g.quadraticCurveTo(cx - 20, y, cx - 50, y - 16); g.stroke(); }
    // 毛（ざらつき）
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(230,240,210,${Math.random() * .12})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
    g.restore();
  });
}
// 頭花のまん中（筒状花）：黄金角でならぶ小さな花（ヒマワリ＝らせん）
function discTex(c0, c1, rim, n = 600) {
  return canvasTex(256, 256, (g, w, h) => {
    const cx = w / 2, R = w / 2; g.fillStyle = c1; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) { const r = Math.sqrt(i / n) * R * .98, a = i * 2.39996, t = r / R; g.fillStyle = t > .86 && rim ? rim : t < .35 ? c0 : c1; g.beginPath(); g.arc(cx + r * Math.cos(a), cx + r * Math.sin(a), 2.2 + 3.2 * t, 0, TAU); g.fill(); g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.arc(cx + r * Math.cos(a) + 1, cx + r * Math.sin(a) + 1, 1 + t, 0, TAU); g.fill(); }
  });
}
function barkTex() {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = "#7d7468"; g.fillRect(0, 0, w, h);
    // 欅の樹皮：灰褐色でなめらか、古くなると鱗のようにはがれて斑になる
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(${150 + Math.random() * 40},${120 + Math.random() * 30},${90},${.35 + Math.random() * .3})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 14, 10 + Math.random() * 22, 0, 0, TAU); g.fill(); }
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(40,30,25,${Math.random() * .2})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 3); }
  });
}

// ---------------------------------------------------------------- 花：ヒマワリ・ルドベキア・ヒナゲシ
function makeFlowers(garden, sonic, BED) {
  const out = new THREE.Group(); garden.add(out);
  // 植え込み（塀ぎわ）へ置く：花壇の座標（x＝長さ・z＝奥行き）を、庭の座標へ
  out.rotation.y = BED.ry; out.position.set(BED.x, 0, BED.z);
  const stemM = M(0x557f38, { uv: .04, temp: .12, map: canvasTex(16, 64, (g, w, h) => { g.fillStyle = "#5c8740"; g.fillRect(0, 0, w, h); for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(230,240,210,${Math.random() * .25})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 2); } }) });
  const leafM = k => M(0xffffff, { map: leafTex(k), alphaTest: .45, side: THREE.DoubleSide, uv: .04, temp: .12 });
  const L = { himawari: leafM("himawari"), rudbeckia: leafM("rudbeckia"), hinageshi: leafM("hinageshi") };
  const leafGeo = (len, wid, curl) => bladeGeo(len, wid, { cup: .2, curl, shape: () => 1, seg: 4 });   // 形は絵（alpha）で、面は四角
  const heads = [];

  // ---- ヒマワリ（Helianthus annuus）：舌状花 21〜34 枚ほど（ここでは 2 列で 34）・筒状花はらせん・裏に総苞片・葉は互生の大きな卵形〜心形
  const sunPet = petalTex("#e9a50e", "#ffd23a", "#b07400"), sunUV = uvGrad(.42);
  const sunPetM = M(0xffffff, { map: sunPet, uvMap: sunUV, uv: .7, temp: .2, side: THREE.DoubleSide });
  const sunDiscM = M(0xffffff, { map: discTex("#5c6a2a", "#3a2412", "#6b4a16", 700), uv: .02, temp: .22 });
  const bractM = M(0x4c7a33, { uv: .04, temp: .15, side: THREE.DoubleSide });
  const himawariHead = () => {
    const R = .1, petals = [];
    for (let row = 0; row < 2; row++) for (let i = 0; i < 17; i++) { const a = (i + row * .5) / 17 * TAU; petals.push(geoAt(bladeGeo(.085 - row * .01, .028, { cup: .25, curl: -.05 + row * .04 }), { rx: .15 + row * .12 }).translate(0, R * .92, row * .004).rotateZ(a)); }
    const pet = new THREE.Mesh(mergeGeometries(petals), sunPetM);
    const dg = new THREE.RingGeometry(.0001, R, 40, 6), dp = dg.attributes.position; for (let i = 0; i < dp.count; i++) { const r = Math.hypot(dp.getX(i), dp.getY(i)) / R; dp.setZ(i, .022 * (1 - r * r)); } dg.computeVertexNormals();
    const disc = new THREE.Mesh(dg, sunDiscM); disc.position.z = .006;
    const bracts = []; for (let i = 0; i < 22; i++) bracts.push(geoAt(bladeGeo(.05, .018, { cup: .3, curl: .02 }), { rx: -1.9 }).translate(0, R * .75, -.01).rotateZ(i / 22 * TAU));
    const back = new THREE.Mesh(mergeGeometries([...bracts, geoAt(new THREE.SphereGeometry(R * .95, 16, 6, 0, TAU, 0, Math.PI / 2), { sz: .35, rx: -Math.PI / 2, z: -.004 })]), bractM);
    const g = new THREE.Group(); g.add(pet, disc, back); sonic.push(pet, disc); heads.push(pet); return g;
  };
  // ---- アラゲハンゴンソウ（ルドベキア・Rudbeckia hirta）：舌状花 8〜21 枚（ここでは 13）・やや下へ反る・筒状花は暗褐色で円錐に盛りあがる・全体に粗い毛
  const rudPetM = M(0xffffff, { map: petalTex("#d9780d", "#f4b21b", "#9a5a00"), uvMap: uvGrad(.4), uv: .7, temp: .2, side: THREE.DoubleSide });
  const rudDiscM = M(0xffffff, { map: discTex("#2a140a", "#3a1d0c", null, 300), uv: .02, temp: .22 });
  const rudHead = () => {
    const R = .016, petals = [];
    for (let i = 0; i < 13; i++) petals.push(geoAt(bladeGeo(.032, .011, { cup: .3, curl: .012 }), { rx: -.35 }).translate(0, R * .9, 0).rotateZ(i / 13 * TAU + rnd() * .1));
    const pet = new THREE.Mesh(mergeGeometries(petals), rudPetM);
    const cone = new THREE.Mesh(geoAt(new THREE.SphereGeometry(R, 14, 8, 0, TAU, 0, Math.PI / 2), { sy: 1.25, rx: Math.PI / 2 }), rudDiscM);
    const g = new THREE.Group(); g.add(pet, cone); sonic.push(pet, cone); heads.push(pet); return g;
  };
  // ---- ヒナゲシ（Papaver rhoeas）：花弁 4 枚（外の 2 枚が大きい）・根もとに黒い斑・雄しべは多数（黒い花糸と葯）・まん中に子房と放射状の柱頭・つぼみはうつむく・葉は羽状に裂ける
  const popPetM = M(0xffffff, { map: petalTex("#c8180f", "#e5291b", "#8a0c08", { blotch: "#160806", edge: "rgba(240,235,225,.7)" }), uvMap: canvasTex(16, 128, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#000"; g.fillRect(0, h * .82, w, h * .18); }, false), uv: .5, temp: .2, side: THREE.DoubleSide });
  const capM = M(0x9aa58a, { uv: .05, temp: .2 }), stigM = M(0x3a2240, { uv: .05, temp: .2 }), stamM = M(0x161214, { uv: .02, temp: .2 });
  const popHead = () => {
    const petals = [];
    for (let i = 0; i < 4; i++) { const big = i % 2 === 0, len = big ? .045 : .04; petals.push(geoAt(bladeGeo(len, .05, { cup: .55, curl: -.012, shape: t => Math.sin(Math.PI * Math.pow(t, .45)) }), { rx: big ? .55 : .75 }).rotateZ(i / 4 * TAU + (big ? 0 : .12))); }
    const pet = new THREE.Mesh(mergeGeometries(petals), popPetM);
    const cap = new THREE.Mesh(geoAt(new THREE.SphereGeometry(.007, 10, 8), { sz: 1.3, z: .008 }), capM);
    const st = new THREE.Mesh(geoAt(new THREE.CylinderGeometry(.0075, .0075, .0012, 10), { rx: Math.PI / 2, z: .0175 }), stigM);
    const stam = []; for (let i = 0; i < 40; i++) { const a = i * 2.39996, r = .008 + (i % 3) * .0012; stam.push(geoAt(new THREE.CylinderGeometry(.0004, .0004, .01, 3), { rx: Math.PI / 2 - .5, x: 0, y: 0, z: .006 }).translate(0, r, 0).rotateZ(a)); stam.push(geoAt(new THREE.SphereGeometry(.0011, 4, 3), { z: .012 }).translate(0, r + .004, 0).rotateZ(a)); }
    const g = new THREE.Group(); g.add(pet, cap, st, new THREE.Mesh(mergeGeometries(stam), stamM)); sonic.push(pet); heads.push(pet); return g;
  };
  const budM = M(0x6f8f4f, { uv: .04, temp: .15 });

  function plant(kind, x, z, h) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rnd() * TAU;
    const thick = kind === "himawari" ? .011 : kind === "rudbeckia" ? .0035 : .0022;
    const { geo, curve } = stemGeo(h, thick * 1.4, thick, kind === "hinageshi" ? .06 : .03);
    g.add(new THREE.Mesh(geo, stemM));
    const top = curve.getPointAt(1), head = kind === "himawari" ? himawariHead() : kind === "rudbeckia" ? rudHead() : popHead();
    head.position.copy(top);
    // 向き：ヒマワリは咲くと東向きでやや下を向く（ここでは見る人の側へ）。ルドベキアは横〜やや上、ヒナゲシは上向き
    head.rotation.set(kind === "himawari" ? .25 : kind === "rudbeckia" ? -.5 : -1.2, -g.rotation.y + (rnd() - .5) * .6, 0, "YXZ");
    g.add(head);
    // 葉：互生（らせんにずらす）
    const nL = kind === "himawari" ? 7 : kind === "rudbeckia" ? 5 : 3;
    for (let k = 0; k < nL; k++) {
      const t = kind === "hinageshi" ? .05 + k * .08 : .12 + k / nL * .72, p = curve.getPointAt(t), sz = kind === "himawari" ? .3 * (1 - t * .5) : kind === "rudbeckia" ? .1 : .11;
      // ヒマワリの葉は幅が広く（卵形〜心形）、長い葉柄で外へ張り出し、先がやや垂れる
      const lf = new THREE.Mesh(leafGeo(sz, sz * (kind === "himawari" ? .85 : .55), kind === "himawari" ? -.3 : -.18), L[kind]); lf.position.copy(p); lf.rotation.set(-1.25 - (kind === "hinageshi" ? .2 : 0), k * 2.4, 0, "YXZ");
      if (kind === "himawari") { lf.translateY(.06); const pet = new THREE.Mesh(geoAt(new THREE.CylinderGeometry(.003, .004, .07, 4), { y: .035 }), stemM); pet.position.copy(p); pet.rotation.copy(lf.rotation); g.add(pet); }
      g.add(lf);
    }
    if (kind === "hinageshi" && rnd() < .5) {   // うつむくつぼみ（細い毛の茎の先）
      const { geo: bg, curve: bc } = stemGeo(h * .7, .0018, .0015, .02); const bs = new THREE.Mesh(bg, stemM); bs.position.x = .04; g.add(bs);
      const bud = new THREE.Mesh(new THREE.SphereGeometry(.009, 8, 6), budM); bud.scale.set(1, 1.5, 1); const bp = bc.getPointAt(1); bud.position.set(bp.x + .04, bp.y - .008, bp.z); bud.rotation.z = 2.6; g.add(bud);
    }
    out.add(g); return g;
  }
  for (let i = 0; i < 7; i++) plant("himawari", -3 + (i % 4) * .62 + rnd() * .2, -1.4 + Math.floor(i / 4) * .9 + rnd() * .2, 1.3 + rnd() * .4);
  for (let i = 0; i < 16; i++) plant("rudbeckia", .3 + (i % 5) * .45 + rnd() * .15, -.9 + Math.floor(i / 5) * .5 + rnd() * .15, .5 + rnd() * .2);
  for (let i = 0; i < 14; i++) plant("hinageshi", 2.9 + (i % 4) * .36 + rnd() * .12, -.5 + Math.floor(i / 4) * .45 + rnd() * .12, .42 + rnd() * .15);
  // 動かない草花は、材質ごとに一つの形にまとめる（描く回数を減らして、スマホを軽く）
  out.updateMatrixWorld(true);
  const byMat = new Map();
  out.traverse(o => { if (!o.isMesh) return; const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld); for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k); (byMat.get(o.material) || byMat.set(o.material, []).get(o.material)).push(g); });
  for (const o of [...out.children]) out.remove(o);
  const sonicSet = new Set([sunPetM, rudPetM, popPetM, sunDiscM, rudDiscM]);
  for (let i = sonic.length - 1; i >= 0; i--) if (sonicSet.has(sonic[i].material)) sonic.splice(i, 1);
  out.rotation.y = 0; out.position.set(0, 0, 0);   // 形はもう庭の座標に焼いた
  for (const [mat, gs] of byMat) { const m = new THREE.Mesh(mergeGeometries(gs), mat); out.add(m); if (sonicSet.has(mat)) sonic.push(m); }
  return { group: out, heads };
}

// ---------------------------------------------------------------- 木（欅のような落葉樹）：低い位置で幾本にも分かれ、箒を逆さにしたような形
function makeTree(garden, sonic, TREE) {
  const g = new THREE.Group(); g.position.set(TREE.x, 0, TREE.z); garden.add(g);
  const barkM = M(0xd8d2c8, { std: true, map: photoTex("bark_zelkova.webp", 1, 3), nmap: tx("bark_zelkova_n.webp", 1, 3, false), ns: 1.3, orm: tx("bark_zelkova_orm.webp", 1, 3, false), rough: 1, env: .4, uv: .05, temp: .1 });   // 欅の樹皮の写真（Japanese Zelkova Bark・CC0）
  const parts = [], tips = [];
  const branch = (from, dir, len, r0, depth) => {
    const pts = [from.clone()]; let p = from.clone(), d = dir.clone();
    for (let i = 1; i <= 4; i++) { d.add(new THREE.Vector3((rnd() - .5) * .25, .05, (rnd() - .5) * .25)).normalize(); p = p.clone().addScaledVector(d, len / 4); pts.push(p); }
    const { geo } = { geo: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, r0, 6, false) };
    parts.push(geo);
    if (depth > 0) { const n = depth === 2 ? 3 : 2; for (let k = 0; k < n; k++) { const a = k / n * TAU + rnd(); branch(p, new THREE.Vector3(d.x + Math.cos(a) * .55, d.y + .25, d.z + Math.sin(a) * .55).normalize(), len * .62, r0 * .55, depth - 1); } }
    else tips.push(p);
  };
  const trunk = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(.03, .8, 0), new THREE.Vector3(0, 1.7, .02)];
  parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(trunk), 8, .2, 10, false));
  parts.push(geoAt(new THREE.CylinderGeometry(.2, .32, .3, 10), { y: .15 }));   // 根張り
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + .3; branch(new THREE.Vector3(0, 1.6, 0), new THREE.Vector3(Math.cos(a) * .55, 1, Math.sin(a) * .55).normalize(), 1.6, .1, 2); }
  const wood = new THREE.Mesh(mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p).map(p => { p.deleteAttribute?.("tangent"); return p; })), barkM); g.add(wood); sonic.push(wood);
  // 葉（2026-10-09 直し：一枚ずつの絵の葉 → 写真の葉を小枝に互生させた房の板）。葉は LeafSet014（ambientCG・CC0）の鋸歯のある卵形の葉。
  //   房は 0.42 m（葉一枚 約 8 cm＝欅の葉の 4〜7 cm よりやや大きめ）。枝先のまわりに、外と上へ向けて散らす。PC 2,600 房・スマホ 1,400 房。風で揺れる
  const spray = tx("leaf_spray.webp", 1, 1); spray.wrapS = spray.wrapT = THREE.ClampToEdgeWrapping;
  const leafMat = M(0xffffff, { std: true, map: spray, alphaTest: .45, side: THREE.DoubleSide, rough: .6, env: .45, uv: .04, temp: .09, wind: .05, windH: 6, key: "crown", hook: crownHook });
  const lg = new THREE.PlaneGeometry(.42, .42); lg.translate(0, .21, 0);
  const n = mobile() ? 1400 : 2600, im = new THREE.InstancedMesh(lg, leafMat, n), m4 = new THREE.Matrix4(), col = new THREE.Color(), ctrA = new Float32Array(n * 3);
  const xA = new THREE.Vector3(), yA = new THREE.Vector3(), zA = new THREE.Vector3(), rv = new THREE.Vector3(), ctr = tips.reduce((a, t) => a.add(t), new THREE.Vector3()).multiplyScalar(1 / tips.length);
  for (let i = 0; i < n; i++) {
    const t = tips[i % tips.length], out = t.clone().sub(ctr).normalize(), r = .1 + Math.pow(rnd(), .6) * 1.0;
    const v = t.clone().add(new THREE.Vector3(rnd() - .5, (rnd() - .5) * .8, rnd() - .5).normalize().multiplyScalar(r)).addScaledVector(out, .15);
    yA.copy(out).add(new THREE.Vector3((rnd() - .5) * 1.3, .3 + rnd() * .5, (rnd() - .5) * 1.3)).normalize(); rv.set(rnd() - .5, rnd() - .5, rnd() - .5); xA.crossVectors(yA, rv).normalize(); zA.crossVectors(xA, yA);
    const s = .8 + rnd() * .4; m4.makeBasis(xA.multiplyScalar(s), yA.multiplyScalar(s), zA.multiplyScalar(s)); m4.setPosition(v); im.setMatrixAt(i, m4);
    const l = .7 + rnd() * .3; col.setRGB(l * .86, l * .92, l * .78); im.setColorAt(i, col);
    ctrA.set([t.x + TREE.x, t.y, t.z + TREE.z], i * 3);
  }
  lg.setAttribute("aCtr", new THREE.InstancedBufferAttribute(ctrA, 3));
  im.userData.n = n;
  g.add(im); sonic.push(im);
  return { leafMat, leafIM: im, perchAt: g.localToWorld(tips[0].clone()) };
}
const mobile = () => matchMedia("(pointer:coarse)").matches;

// ---------------------------------------------------------------- 草（一枚ずつ曲がり、根もとが濃い）
function makeGrass(garden, sample) {
  const n = mobile() ? 900 : 1600, bl = new THREE.PlaneGeometry(.014, .26, 1, 3); bl.translate(0, .17, 0);
  const p = bl.attributes.position, col = [];
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), t = y / .34; if (t > .99) p.setX(i, 0); p.setZ(i, .06 * t * t); const c = .45 + .65 * t; col.push(c, c, c); }
  bl.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); bl.computeVertexNormals();
  const im = new THREE.InstancedMesh(bl, M(0xffffff, { side: THREE.DoubleSide, uv: .04, temp: .13, vc: true, wind: .035, windH: .35 }), n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const [x, z] = sample(rnd);
    e.set((rnd() - .5) * .4, rnd() * TAU, (rnd() - .5) * .4); q.setFromEuler(e); const s = .55 + rnd() * .9; m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * (.8 + rnd() * .6), s)); im.setMatrixAt(i, m4);
    c.setHSL(.22 + rnd() * .08, .42 + rnd() * .15, .3 + rnd() * .14); im.setColorAt(i, c);
  }
  garden.add(im); return im;
}

// ---------------------------------------------------------------- 池のまわり：縁石・ヨシ・日なたの石
function makePond(garden, sonic, POND) {
  const rockMap = photoTex("rock_surface.webp", 1, 1), rimG = [], stoneM = M(0xe2dcd2, { vc: true, map: rockMap, uv: .1, temp: .3 });   // 石の写真（Rock Surface・CC0）
  for (let i = 0; i < 30; i++) { const a = i / 30 * TAU, s = .2 + rnd() * .14; rimG.push(geoAt(rockGeo(i, 1), { s, ry: rnd() * 6, x: POND.x + Math.cos(a) * (POND.r + .12), y: s * .25, z: POND.z + Math.sin(a) * (POND.r + .12) })); }
  garden.add(new THREE.Mesh(mergeGeometries(rimG), stoneM));
  // ヨシ（池の奥の岸）：細長い葉と、先の穂
  const reedM = M(0x7f9a54, { side: THREE.DoubleSide, uv: .05, temp: .1 }), plumeM = M(0x8a6f58, { uv: .08, temp: .1 }), rg = [], pg = [];
  for (let i = 0; i < (mobile() ? 50 : 90); i++) { const a = Math.PI * (1.05 + rnd() * .8), r = POND.r + .3 + rnd() * .6, x = POND.x + Math.cos(a) * r, z = POND.z + Math.sin(a) * r, h = 1.2 + rnd() * .8;
    rg.push(geoAt(bladeGeo(h, .014, { cup: .1, curl: .05 + rnd() * .1, shape: t => 1 - t * .9 }), { ry: rnd() * 6, x, z }));
    if (i % 3 === 0) pg.push(geoAt(new THREE.ConeGeometry(.035, .28, 5), { rz: Math.PI, x, y: h + .06, z })); }
  garden.add(new THREE.Mesh(mergeGeometries(rg), reedM), new THREE.Mesh(mergeGeometries(pg), plumeM));
}

// ---------------------------------------------------------------- 生きもの
// 昆虫の脚：3 節（腿節・脛節・跗節）を 6 本（3 対・胸から）
function insectLegs(mat, s, spread = 1) {
  const parts = [];
  for (let side of [-1, 1]) for (let k = 0; k < 3; k++) {
    const z = (1 - k) * .0028 * s, fem = geoAt(new THREE.CylinderGeometry(.00045 * s, .0005 * s, .0045 * s, 4), { rz: side * 1.05 * spread, x: side * .0022 * s, y: -.0012 * s, z }).rotateY(side * (k - 1) * .45);
    const tib = geoAt(new THREE.CylinderGeometry(.0004 * s, .00045 * s, .005 * s, 4), { rz: side * .3, x: side * .0058 * s, y: -.0042 * s, z: z + (k - 1) * .0016 * s });
    parts.push(fem, tib);
  }
  return new THREE.Mesh(mergeGeometries(parts), mat);
}
// 触角：ミツバチ＝くの字（膝状）／チョウ＝先がこん棒状
function antennae(mat, kind, s) {
  const parts = [];
  for (const side of [-1, 1]) {
    if (kind === "bee") { parts.push(geoAt(new THREE.CylinderGeometry(.00028 * s, .00028 * s, .0018 * s, 4), { rx: -.6, rz: side * .35, x: side * .0007 * s, y: .0008 * s, z: .0006 * s }), geoAt(new THREE.CylinderGeometry(.00025 * s, .0003 * s, .003 * s, 4), { rx: .9, rz: side * .45, x: side * .0014 * s, y: .002 * s, z: .0024 * s })); }
    else { parts.push(geoAt(new THREE.CylinderGeometry(.0002 * s, .0002 * s, .012 * s, 4), { rx: -.5, rz: side * .32, x: side * .0018 * s, y: .005 * s, z: .0035 * s }), geoAt(new THREE.SphereGeometry(.00065 * s, 5, 4), { sy: 1.8, x: side * .0038 * s, y: .0103 * s, z: .0062 * s })); }
  }
  return new THREE.Mesh(mergeGeometries(parts), mat);
}
// セイヨウミツバチの働き蜂（体長 12〜15 mm）：頭・胸・腹、複眼 2 と単眼 3、膝状の触角 2、翅 4（前翅が大きい）、脚 6
function makeBee(s = 1) {
  const g = new THREE.Group(), fuzz = canvasTex(32, 32, (c, w, h) => { c.fillStyle = "#a07836"; c.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(${200 + Math.random() * 50},${170 + Math.random() * 40},110,${Math.random() * .6})`; c.fillRect(Math.random() * w, Math.random() * h, 1, 2); } });
  const thM = M(0xffffff, { map: fuzz, uv: .05, temp: .3 }), dark = M(0x231a12, { uv: .03, temp: .3 }), eyeM = M(0x1b1612, { uv: .05, temp: .3 });
  const abTex = canvasTex(16, 64, (c, w, h) => { for (let k = 0; k < 6; k++) { c.fillStyle = k % 2 ? "#2a1c10" : "#c88a22"; c.fillRect(0, k * h / 6, w, h / 6); c.fillStyle = "rgba(230,200,140,.6)"; c.fillRect(0, k * h / 6, w, 2); } });
  const abM = M(0xffffff, { map: abTex, uv: .04, temp: .3 });
  const ab = new THREE.Mesh(geoAt(new THREE.SphereGeometry(.0034 * s, 12, 10), { sz: 1.75, rx: Math.PI / 2 }).rotateX(-Math.PI / 2), abM); ab.position.z = -.0068 * s; ab.rotation.x = .18; g.add(ab);
  const th = new THREE.Mesh(new THREE.SphereGeometry(.0028 * s, 12, 10), thM); g.add(th);
  const hd = new THREE.Mesh(geoAt(new THREE.SphereGeometry(.0022 * s, 10, 8), { sx: 1.15, sy: 1.1, sz: .8 }), dark); hd.position.set(0, .0002 * s, .0038 * s); g.add(hd);
  const eyes = new THREE.Mesh(mergeGeometries([-1, 1].map(sd => geoAt(new THREE.SphereGeometry(.0013 * s, 8, 6), { sx: .55, sy: 1.15, x: sd * .0019 * s, y: .0003 * s, z: .0038 * s }))), eyeM); g.add(eyes);
  const ocelli = new THREE.Mesh(mergeGeometries([[-.0005, 0], [.0005, 0], [0, .0005]].map(([x, z]) => geoAt(new THREE.SphereGeometry(.00028 * s, 4, 3), { x: x * s, y: .0023 * s, z: (.0034 + z) * s }))), eyeM); g.add(ocelli);
  g.add(antennae(dark, "bee", s), insectLegs(dark, s));
  const wTex = canvasTex(64, 32, (c, w, h) => { c.fillStyle = "rgba(225,235,245,.5)"; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 2, 0, 0, TAU); c.fill(); c.strokeStyle = "rgba(60,50,40,.7)"; c.lineWidth = 1; for (const y of [.35, .55, .7]) { c.beginPath(); c.moveTo(2, h * y); c.quadraticCurveTo(w * .5, h * (y - .1), w - 4, h * .5); c.stroke(); } });
  const wM = M(0xffffff, { map: wTex, transparent: true, side: THREE.DoubleSide, uv: .2, temp: .3 }); wM.depthWrite = false;
  const L = new THREE.Group(), R = new THREE.Group();
  for (const [grp, sd] of [[L, 1], [R, -1]]) {
    const fw = new THREE.Mesh(geoAt(new THREE.PlaneGeometry(.0095 * s, .0034 * s), { x: .0047 * s }), wM);   // 前翅（大）
    const hw = new THREE.Mesh(geoAt(new THREE.PlaneGeometry(.0065 * s, .0024 * s), { x: .0032 * s, y: -.0018 * s }), wM);   // 後翅（小）
    // 内の組で翅を水平に寝かせ、外の組（L・Rw）の z 回転ではばたく（前翅と後翅は鉤でつながり、いっしょに動く）
    const inner = new THREE.Group(); inner.add(fw, hw); inner.rotation.x = Math.PI / 2; if (sd < 0) inner.scale.x = -1;
    grp.add(inner); grp.position.set(sd * .0012 * s, .0024 * s, -.0006 * s); g.add(grp);
  }
  g.userData = { L, Rw: R }; return g;
}
// 蝶の翅の絵：kind＝"monshiro-f"（雌：前翅に黒い斑 2）・"monshiro-m"（雄：斑 1）・"ageha"（ナミアゲハ）
function wingTexOf(kind, fore) {
  return canvasTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const shape = new Path2D();
    if (fore) { shape.moveTo(4, h - 6); shape.lineTo(w - 6, 6); shape.quadraticCurveTo(w - 2, h * .55, w * .62, h - 8); shape.closePath(); }
    else { shape.moveTo(4, 8); shape.quadraticCurveTo(w * .9, h * .05, w * .9, h * .55); if (kind === "ageha") { shape.lineTo(w * .74, h * .78); shape.lineTo(w * .7, h - 2); shape.lineTo(w * .62, h * .8); } shape.quadraticCurveTo(w * .4, h * .95, 6, h * .55); shape.closePath(); }
    g.save(); g.clip(shape);
    if (kind.startsWith("monshiro")) {
      g.fillStyle = "#f3f1e4"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(210,215,190,.6)"; g.fillRect(0, h * .75, w * .35, h * .25);
      if (fore) { g.fillStyle = "#3b3b3e"; g.beginPath(); g.moveTo(w * .62, 0); g.lineTo(w, 0); g.lineTo(w, h * .32); g.closePath(); g.fill();
        g.beginPath(); g.arc(w * .6, h * .42, 6, 0, TAU); g.fill();
        if (kind === "monshiro-f") { g.beginPath(); g.arc(w * .42, h * .64, 6, 0, TAU); g.fill(); g.fillRect(w * .1, h * .78, 14, 4); } }
      else { g.fillStyle = "#3b3b3e"; g.beginPath(); g.arc(w * .55, h * .14, 5, 0, TAU); g.fill(); }
    } else {
      g.fillStyle = "#f2e08a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#1c1a16"; g.fillStyle = "#1c1a16";
      g.lineWidth = 5; for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(0, h - k * 6); g.lineTo(w * (.3 + k * .1), 0 + (fore ? 0 : h * .1)); g.stroke(); }
      g.lineWidth = 14; g.strokeRect(-6, -6, w + 12, h + 12);
      g.fillRect(fore ? w * .7 : w * .55, 0, w, h); g.fillStyle = "#f2e08a"; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(fore ? w * .82 : w * .62 + k * 4, 10 + k * 18, 4, 0, TAU); g.fill(); }
      if (!fore) { g.fillStyle = "#3d64b8"; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(w * .66, h * .3 + k * 14, 4, 0, TAU); g.fill(); } g.fillStyle = "#e0602a"; g.beginPath(); g.arc(w * .2, h * .66, 7, 0, TAU); g.fill(); g.fillStyle = "#1c1a16"; g.beginPath(); g.arc(w * .2, h * .66, 3, 0, TAU); g.fill(); }
    }
    g.strokeStyle = "rgba(60,60,50,.35)"; g.lineWidth = 1; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(4, h - 6); g.lineTo(w * (.25 + k * .14), k < 3 ? 6 : h * .2 * (k - 2)); g.stroke(); }
    g.restore();
  });
}
// 蝶：翅 4（前翅・後翅が左右に）・脚 6・こん棒状の触角 2・巻いた口吻
function makeButterfly(kind, uv, s = 1) {
  const g = new THREE.Group(), bodyM = M(kind === "ageha" ? 0x2a2620 : 0x3a3a38, { uv: .03, temp: .2 });
  const wUV = canvasTex(8, 8, (c, w, h) => { c.fillStyle = "#fff"; c.fillRect(0, 0, w, h); }, false);
  const fM = M(0xffffff, { map: wingTexOf(kind, true), uvMap: wUV, uv, alphaTest: .3, side: THREE.DoubleSide, temp: .2 });
  const hM = M(0xffffff, { map: wingTexOf(kind, false), uvMap: wUV, uv, alphaTest: .3, side: THREE.DoubleSide, temp: .2 });
  const span = (kind === "ageha" ? .04 : .028) * s;      // 片側の翅の長さ（実物：アゲハ 開張 7〜9 cm、モンシロチョウ 4.5〜5.5 cm）
  const pl = new THREE.Group(), pr = new THREE.Group();
  for (const [grp, sd] of [[pl, -1], [pr, 1]]) {
    const fw = new THREE.Mesh(geoAt(new THREE.PlaneGeometry(span, span), { x: span / 2, y: span * .35 }), fM);
    const hw = new THREE.Mesh(geoAt(new THREE.PlaneGeometry(span * .85, span * .9), { x: span * .42, y: -span * .38 }), hM);
    const inner = new THREE.Group(); inner.add(fw, hw); inner.rotation.x = Math.PI / 2; if (sd < 0) inner.scale.x = -1;
    grp.add(inner); g.add(grp);
  }
  const body = new THREE.Mesh(geoAt(new THREE.CapsuleGeometry(.0018 * s, span * .7, 3, 6), { rx: Math.PI / 2 }), bodyM); g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.0022 * s, 8, 6), bodyM); head.position.z = span * .42; g.add(head);
  const ant = antennae(bodyM, "butterfly", s * (kind === "ageha" ? 1 : .8)); ant.position.z = span * .38; ant.rotation.x = -.6; g.add(ant);
  const legs = insectLegs(bodyM, s * 1.1, .8); legs.position.z = span * .1; g.add(legs);
  const prob = new THREE.Mesh(geoAt(new THREE.TorusGeometry(.0012 * s, .00025 * s, 3, 8, Math.PI * 1.6), { ry: Math.PI / 2, y: -.002 * s, z: span * .46 }), bodyM); g.add(prob);
  g.userData = { pl, pr }; return g;
}
// アオガラ（体長 約 12 cm）：頭頂の青・白い頬・黒い過眼線・首の濃い青の輪・黄色い腹・緑がかった背・青い翼に白い帯・青い尾・青灰色の脚（足指 4 本＝前 3・後 1）
function makeBlueTit(s = 1) {
  const g = new THREE.Group(), m = (c, uv = .06) => M(c, { uv, temp: .95 });
  const add = (geo, mat, o) => { const me = new THREE.Mesh(geoAt(geo, o), mat); g.add(me); return me; };
  add(new THREE.SphereGeometry(.03 * s, 14, 10), m(0xe2cf3e, .08), { sx: .95, sy: .95, sz: 1.3 });                                     // 腹（黄）
  add(new THREE.SphereGeometry(.029 * s, 14, 8, 0, TAU, 0, Math.PI / 2.1), m(0x9aa65f), { sx: .97, sy: .9, sz: 1.32, y: .003 * s });    // 背（緑がかる）
  const head = new THREE.Group(); head.position.set(0, .026 * s, .032 * s); g.add(head);
  const hadd = (geo, mat, o) => { const me = new THREE.Mesh(geoAt(geo, o), mat); head.add(me); return me; };
  hadd(new THREE.SphereGeometry(.019 * s, 12, 10), m(0xf3f3ee, .15), {});                                                                // 白い頬
  const cap = hadd(new THREE.SphereGeometry(.0196 * s, 12, 8, 0, TAU, 0, Math.PI / 3), m(0x3d83d6, .9), { y: .001 * s });                 // 頭頂の青（紫外を強く返す）
  hadd(new THREE.TorusGeometry(.0175 * s, .0028 * s, 5, 16, Math.PI * 1.1), m(0x1d2c55), { rx: Math.PI / 2, ry: 0, rz: -.05 * Math.PI, y: .0045 * s });   // 過眼線（黒〜紺）
  hadd(new THREE.TorusGeometry(.0185 * s, .003 * s, 5, 18), m(0x22346a), { rx: Math.PI / 2 + .5, y: -.008 * s });                          // 首の濃い青の輪
  hadd(new THREE.ConeGeometry(.0035 * s, .009 * s, 6), m(0x27272a, .02), { rx: Math.PI / 2, z: .021 * s, y: -.002 * s });                // 短い嘴
  hadd(new THREE.SphereGeometry(.0028 * s, 6, 5), m(0x0e0e10, .02), { x: .0145 * s, y: .003 * s, z: .009 * s }); hadd(new THREE.SphereGeometry(.0028 * s, 6, 5), m(0x0e0e10, .02), { x: -.0145 * s, y: .003 * s, z: .009 * s });
  const wingTex = canvasTex(64, 32, (c, w, h) => { c.fillStyle = "#3a6cb4"; c.fillRect(0, 0, w, h); c.fillStyle = "#f2f2ee"; c.fillRect(0, h * .3, w * .8, 4); c.fillStyle = "#24477e"; for (let i = 0; i < 6; i++) c.fillRect(w * .3 + i * 6, h * .55, 3, h * .45); });
  const wingM = M(0xffffff, { map: wingTex, uv: .5, temp: .9, side: THREE.DoubleSide });
  for (const sd of [-1, 1]) add(new THREE.SphereGeometry(.024 * s, 10, 6, 0, Math.PI), wingM, { sx: .3, sy: .7, sz: 1.35, ry: sd * Math.PI / 2, x: sd * .026 * s, y: .004 * s, z: -.006 * s });
  add(new THREE.BoxGeometry(.016 * s, .003 * s, .05 * s), m(0x2f5ea6, .5), { rx: .35, y: -.004 * s, z: -.055 * s });                      // 尾（青）
  // 脚と足指（前 3・後 1）
  const legM = m(0x5b6a86, .04), lp = [];
  for (const sd of [-1, 1]) { lp.push(geoAt(new THREE.CylinderGeometry(.0013 * s, .0013 * s, .018 * s, 4), { x: sd * .009 * s, y: -.03 * s }));
    for (const a of [-.45, 0, .45]) lp.push(geoAt(new THREE.CylinderGeometry(.0009 * s, .0009 * s, .011 * s, 3), { rx: Math.PI / 2, ry: a, x: sd * .009 * s, y: -.039 * s, z: .005 * s }));
    lp.push(geoAt(new THREE.CylinderGeometry(.0009 * s, .0009 * s, .009 * s, 3), { rx: Math.PI / 2, x: sd * .009 * s, y: -.039 * s, z: -.0045 * s })); }
  g.add(new THREE.Mesh(mergeGeometries(lp), legM));
  g.userData = { head, cap }; return g;
}
// アカネズミのような野ネズミ（頭胴 8〜13 cm）：赤褐色の背・白い腹・大きな耳と黒い目・長い尾・4 本の脚・ひげ
function makeMouse(s = 1) {
  const g = new THREE.Group(), fur = M(0xffffff, { uv: .04, temp: 1, map: canvasTex(32, 32, (c, w, h) => { c.fillStyle = "#8a5a36"; c.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(${60 + Math.random() * 80},${40 + Math.random() * 40},20,${Math.random() * .5})`; c.fillRect(Math.random() * w, Math.random() * h, 1, 3); } }) });
  const belly = M(0xe9e2d6, { uv: .08, temp: 1 }), pink = M(0xd9a89a, { uv: .05, temp: .85 }), eye = M(0x050505, { uv: .02, temp: .9 });
  const add = (geo, mat, o) => { const me = new THREE.Mesh(geoAt(geo, o), mat); g.add(me); return me; };
  add(new THREE.SphereGeometry(.026 * s, 14, 10), fur, { sx: .95, sy: .82, sz: 1.6, y: .024 * s });
  add(new THREE.SphereGeometry(.024 * s, 12, 8), belly, { sx: .9, sy: .6, sz: 1.4, y: .015 * s });
  add(new THREE.SphereGeometry(.016 * s, 12, 10), fur, { sx: .9, sy: .85, sz: 1.35, y: .032 * s, z: .045 * s });
  add(new THREE.SphereGeometry(.003 * s, 6, 5), pink, { y: .031 * s, z: .066 * s });
  for (const sd of [-1, 1]) {
    add(new THREE.CircleGeometry(.009 * s, 12), pink, { ry: sd * .7, rx: -.2, x: sd * .011 * s, y: .046 * s, z: .04 * s }).material.side = THREE.DoubleSide;
    add(new THREE.SphereGeometry(.0034 * s, 8, 6), eye, { x: sd * .0105 * s, y: .037 * s, z: .053 * s });
    for (const zz of [.03, -.02]) add(new THREE.CylinderGeometry(.003 * s, .0025 * s, .016 * s, 5), pink, { x: sd * .014 * s, y: .007 * s, z: zz * s });
  }
  const tail = []; for (let i = 0; i <= 10; i++) tail.push(new THREE.Vector3(Math.sin(i * .5) * .01 * s, .01 * s + Math.sin(i * .3) * .004 * s, (-.04 - i * .009) * s));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tail), 16, .0018 * s, 4), pink));
  const wh = []; for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) wh.push(geoAt(new THREE.CylinderGeometry(.0002 * s, .0002 * s, .03 * s, 3), { rz: sd * (1.3 + k * .12), ry: .3 * sd, x: sd * .012 * s, y: .031 * s, z: .06 * s }));
  g.add(new THREE.Mesh(mergeGeometries(wh), M(0x2a2420, { uv: .05, temp: .8 })));
  return g;
}

export function buildNature(ctx) {
  M = ctx.M; canvasTex = ctx.canvasTex; tx = ctx.tx;
  const { garden, sonic, TREE, POND, grassSample, BED, bed, MOUSE } = ctx;
  const flowers = makeFlowers(garden, sonic, BED);
  const tree = makeTree(garden, sonic, TREE);
  const grass = makeGrass(garden, grassSample); grass.userData.smallCast = true;
  makePond(garden, sonic, POND);
  // アオガラ（1.5 倍）：欅の低い枝に
  const bird = makeBlueTit(1.5); bird.position.set(TREE.x - .9, 2.55, TREE.z + .9); garden.add(bird); sonic.push(bird.userData.cap, ...bird.children.filter(c => c.isMesh).slice(0, 2));
  const perch = new THREE.Mesh(new THREE.CylinderGeometry(.018, .025, 1.4, 6), M(0x6d5f50, { uv: .05, temp: .1 })); perch.rotation.z = Math.PI / 2; perch.rotation.y = .7; perch.position.set(TREE.x - .7, 2.43 - .06, TREE.z + .75); garden.add(perch);
  // ネズミ（1.5 倍）
  const mouse = makeMouse(1.5); mouse.position.set(MOUSE.x, .06, MOUSE.z); mouse.rotation.y = 2.4; garden.add(mouse); sonic.push(...mouse.children.filter(c => c.isMesh).slice(0, 2));
  // モンシロチョウの雌雄（2 倍）と、ナミアゲハ（2 倍）
  const fem = makeButterfly("monshiro-f", .7, 2), mal = makeButterfly("monshiro-m", .02, 2), ageha = makeButterfly("ageha", .15, 2);
  fem.userData.sex = "雌"; fem.userData.ph = 0; mal.userData.sex = "雄"; mal.userData.ph = 2.1; ageha.userData.ph = 4.2; ageha.userData.ageha = true;
  for (const b of [fem, mal, ageha]) { garden.add(b); b.traverse(o => { if (o.isMesh && o.material.map) sonic.push(o); }); }
  // 蜂（3 倍）：ヒマワリの前
  const bee = makeBee(3); bee.position.copy(bed(-2.38, 1.43, -.82)); bee.rotation.y = BED.ry; garden.add(bee);
  return { flowers, leafMat: tree.leafMat, leafIM: tree.leafIM, grass, bird, mouse, butterflies: [fem, mal], ageha, bee };
}

export {makeTree,makeFlowers,makeGrass};
