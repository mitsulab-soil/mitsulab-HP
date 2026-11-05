/* © mitsulab. 抽象と具体のあわい ── 参道の小さなもの（2026-11-06・x/20・21・22 で使い回す）
   ツワブキ（花期 10〜12 月・黄色い頭花・つやのある腎形の葉。社寺の木陰に多い）、気温の記録計、欅の一枚の葉、
   主体を包む球（閉じた世界の模式）、人の等高線の姿（人の形は線で描く＝世界観の決まり）、主体の輪。
   生き物（シジュウカラ・ミツバチ）は creatures_sight.js（図鑑の形態にそった写実）を使う。 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { awaiPatch, AW, MOBILE, TAU, clamp, lerp, ss } from "./awai.js";

const V3 = THREE.Vector3;

// ツワブキの葉の画：濃い緑の地に、付け根から放射する掌状の脈。縁ほど明るい（その場で描く・素材なし）
let tsuwaT = null;
function tsuwaTex() {
  if (tsuwaT) return tsuwaT; const S = 256, c = document.createElement("canvas"); c.width = c.height = S; const x = c.getContext("2d");
  const g = x.createRadialGradient(S / 2, S * .72, 4, S / 2, S * .5, S * .62); g.addColorStop(0, "#22401c"); g.addColorStop(.6, "#2f5a26"); g.addColorStop(1, "#4d7a36"); x.fillStyle = g; x.fillRect(0, 0, S, S);
  x.strokeStyle = "rgba(170,200,120,.5)"; x.lineCap = "round";
  for (let i = 0; i < 11; i++) { const a = -Math.PI * .95 + i / 10 * Math.PI * .9 - Math.PI * .05; x.lineWidth = i % 5 === 0 ? 2.4 : 1.6; x.beginPath(); x.moveTo(S / 2, S * .72); x.quadraticCurveTo(S / 2 + Math.cos(a) * S * .22, S * .72 + Math.sin(a) * S * .22, S / 2 + Math.cos(a) * S * .48, S * .72 + Math.sin(a) * S * .52); x.stroke(); }
  for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(${20 + Math.random() * 40 | 0},${50 + Math.random() * 50 | 0},20,.08)`; x.fillRect(Math.random() * S, Math.random() * S, 3, 3); }
  tsuwaT = new THREE.CanvasTexture(c); tsuwaT.colorSpace = THREE.SRGBColorSpace; return tsuwaT;
}

// ───────── ツワブキの株
export function tsuwabuki(R, { n = 9, spread = .45 } = {}) {
  const g = new THREE.Group(), leaves = [], stems = [], heads = [], rays = [];
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, r = Math.sqrt(R()) * spread * .8, h = .03 + R() * .05, W = .085 + R() * .05;
    // 葉：腎形（付け根に深い切れ込み）・縁にゆるい波。葉柄の先でやや外へ傾く
    const sh = new THREE.Shape(), N = 40, notch = .55;
    for (let k = 0; k <= N; k++) { const t = notch / 2 + (TAU - notch) * k / N, rr = W * (1 + .04 * Math.sin(t * 7)) * (t < 1 || t > TAU - 1 ? .85 + .15 * Math.abs(Math.sin(t)) : 1); const x = Math.sin(t) * rr, y = -Math.cos(t) * rr * .92 + W * .55; k ? sh.lineTo(x, y) : sh.moveTo(x, y); }
    const lg = new THREE.ShapeGeometry(sh, 2); { const u = lg.attributes.uv; for (let k = 0; k < u.count; k++) u.setXY(k, u.getX(k) / (2.2 * W) + .5, u.getY(k) / (2.2 * W) + .28); } lg.rotateX(-Math.PI / 2 + .3 + R() * .45); lg.rotateY(a + Math.PI); lg.translate(Math.cos(a) * r, h, Math.sin(a) * r);
    const p = lg.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k) - Math.cos(a) * r, z = p.getZ(k) - Math.sin(a) * r; p.setY(k, p.getY(k) - (x * x + z * z) * 2.2); }   // 葉は中央が高く縁が垂れる
    lg.computeVertexNormals(); leaves.push(lg.toNonIndexed());
    const st = new THREE.CylinderGeometry(.004, .006, h, 5); st.translate(Math.cos(a) * r, h / 2, Math.sin(a) * r); stems.push(st.toNonIndexed());
  }
  // 花茎と頭花（直径 4〜5 cm・舌状花 10〜13 枚）
  const nh = 3 + Math.floor(R() * 3), heads0 = [];
  for (let i = 0; i < nh; i++) {
    const a = R() * TAU, r = R() * spread * .5, H = .42 + R() * .2, top = new V3(Math.cos(a) * r, H, Math.sin(a) * r);
    const st = new THREE.CylinderGeometry(.003, .005, H, 5); st.translate(top.x, H / 2, top.z); stems.push(st.toNonIndexed());
    for (let k = 0; k < 2 + (R() < .5 ? 1 : 0); k++) {
      const c = top.clone().add(new V3((R() - .5) * .09, R() * .05, (R() - .5) * .09)); heads0.push(c);
      const nr = 10 + Math.floor(R() * 4);
      for (let j = 0; j < nr; j++) { const pg = new THREE.PlaneGeometry(.0075, .021); pg.translate(0, .016, 0); pg.rotateX(-Math.PI / 2 + .25); pg.rotateY(j / nr * TAU + R() * .2); pg.translate(c.x, c.y, c.z); rays.push(pg.toNonIndexed()); }
      const dg = new THREE.CylinderGeometry(.008, .006, .006, 10); dg.translate(c.x, c.y + .002, c.z); heads.push(dg.toNonIndexed());
    }
  }
  const leafM = awaiPatch(new THREE.MeshPhysicalMaterial({ map: tsuwaTex(), bumpMap: tsuwaTex(), bumpScale: 1.4, color: 0xffffff, roughness: .6, clearcoat: MOBILE ? 0 : .3, clearcoatRoughness: .35, side: THREE.DoubleSide }), { lines: false });
  const stemM = awaiPatch(new THREE.MeshStandardMaterial({ color: 0x5b5a3a, roughness: .8 }), { lines: false });
  const rayM = awaiPatch(new THREE.MeshStandardMaterial({ color: 0xf2c21c, roughness: .6, side: THREE.DoubleSide, emissive: 0x3a2a00, emissiveIntensity: .4 }), { lines: false, keep: .25 });
  const discM = awaiPatch(new THREE.MeshStandardMaterial({ color: 0xc79215, roughness: .9 }), { lines: false });
  g.add(new THREE.Mesh(mergeGeometries(leaves), leafM), new THREE.Mesh(mergeGeometries(stems), stemM), new THREE.Mesh(mergeGeometries(rays), rayM), new THREE.Mesh(mergeGeometries(heads), discM));
  g.userData.heads = heads0; return g;
}

// ───────── 気温の記録計（白い日よけの皿を重ねた筒・柱の上。高さ 1.5 m ほど）
export function sensorPost() {
  const g = new THREE.Group(), white = awaiPatch(new THREE.MeshStandardMaterial({ color: 0xe9e7df, roughness: .55 }), { lines: false, keep: .2 }), dark = awaiPatch(new THREE.MeshStandardMaterial({ color: 0x5f6266, roughness: .5, metalness: .3 }));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, 1.5, 10), dark); pole.position.y = .75; g.add(pole);
  for (let i = 0; i < 7; i++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(.075, .085, .012, 18), white); d.position.set(.09, 1.36 + i * .026, 0); g.add(d); }
  const arm = new THREE.Mesh(new THREE.BoxGeometry(.1, .02, .02), dark); arm.position.set(.05, 1.4, 0); g.add(arm);
  const box = new THREE.Mesh(new THREE.BoxGeometry(.09, .13, .05), white); box.position.set(0, 1.1, .04); g.add(box);
  g.userData.top = new V3(.09, 1.45, 0); return g;
}

// ───────── 欅の一枚の葉（卵形で先がとがる・縁に曲がった鋸歯・羽状の脈）。画はその場で描く（素材なし）
let leafTexC = null;
export function keyakiLeafTex() {
  if (leafTexC) return leafTexC;
  const W = 256, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
  const out = [], N = 120;
  for (let k = 0; k <= N; k++) {   // 右の縁 → 左の縁（先が上）
    const u = k / N, side = u < .5 ? 1 : -1, s = u < .5 ? u * 2 : (1 - u) * 2;   // s：0=付け根 1=先
    const y = H * .94 - s * H * .86;
    let w = Math.sin(Math.pow(s, .78) * Math.PI) * (1 - .55 * ss(.62, 1, s)) * W * .36;
    const teeth = 15, ph = (s * teeth) % 1, tooth = (s > .12 && s < .97) ? (ph < .7 ? ph / .7 : (1 - ph) / .3) * W * .022 * (1 - s * .4) : 0;
    out.push([W / 2 + side * (w + tooth), y]);
  }
  x.clearRect(0, 0, W, H); x.beginPath(); out.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.closePath(); x.save(); x.clip();
  const gr = x.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, "#b67a2c"); gr.addColorStop(.35, "#c98a2e"); gr.addColorStop(.7, "#b5602a"); gr.addColorStop(1, "#9a4a26"); x.fillStyle = gr; x.fillRect(0, 0, W, H);   // 黄から赤茶へ（欅の黄葉）
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${90 + Math.random() * 60 | 0},${50 + Math.random() * 40 | 0},20,${Math.random() * .12})`; x.beginPath(); x.arc(Math.random() * W, Math.random() * H, 1 + Math.random() * 5, 0, TAU); x.fill(); }
  for (let i = 0; i < 26; i++) { const px = W * (.3 + Math.random() * .4), py = H * (.2 + Math.random() * .6), r = 2 + Math.random() * 9; const g2 = x.createRadialGradient(px, py, 0, px, py, r); g2.addColorStop(0, "rgba(70,40,18,.55)"); g2.addColorStop(1, "rgba(70,40,18,0)"); x.fillStyle = g2; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); }   // 小さな斑（菌や虫の跡）
  x.strokeStyle = "rgba(250,222,150,.75)"; x.lineWidth = 3; x.beginPath(); x.moveTo(W / 2, H * .97); x.lineTo(W / 2 + 2, H * .1); x.stroke();   // 主脈
  x.lineWidth = 1.6; x.strokeStyle = "rgba(250,215,150,.6)";
  for (let i = 0; i < 12; i++) { const s = .1 + i * .068, y = H * .94 - s * H * .86; for (const sd of [1, -1]) { x.beginPath(); x.moveTo(W / 2, y); x.quadraticCurveTo(W / 2 + sd * W * .16, y - H * .03, W / 2 + sd * W * .3 * Math.sin(Math.min(1, s * 1.2) * Math.PI * .9), y - H * .075); x.stroke(); } }   // 側脈（ほぼ平行に縁の歯へ）
  x.restore();
  x.strokeStyle = "rgba(90,50,20,.5)"; x.lineWidth = 1.2; x.beginPath(); out.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.closePath(); x.stroke();
  x.fillStyle = "#6b4520"; x.fillRect(W / 2 - 2, H * .93, 4, H * .07);   // 葉柄
  leafTexC = new THREE.CanvasTexture(c); leafTexC.colorSpace = THREE.SRGBColorSpace; leafTexC.anisotropy = 8; return leafTexC;
}
export function keyakiLeaf(len = .07) {
  const g = new THREE.PlaneGeometry(len * .5, len, 6, 12), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (len * .25), y = p.getY(i) / len + .5; p.setZ(i, -x * x * len * .06 + Math.sin(y * Math.PI) * len * .05 - y * y * len * .04); }   // 主脈で少し折れ、先が反る
  g.computeVertexNormals();
  const m = awaiPatch(new THREE.MeshStandardMaterial({ map: keyakiLeafTex(), alphaTest: .4, side: THREE.DoubleSide, roughness: .7 }), { lines: false, keep: .55 });
  return new THREE.Mesh(g, m);
}

// ───────── 主体を包む球：閉じた世界の模式。内側に周りの色を映し、外とは交わらない。uOpen で窓がひらく（dir の向きに穴）
export function monad(color, r = .5) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uC: { value: new THREE.Color(color) }, uAbs: AW.uAbs, uOpen: { value: 0 }, uDir: { value: new V3(0, 0, 1) }, uT: AW.uTime, uLit: { value: 0 } },
    vertexShader: `varying vec3 vN, vV, vP; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vP = normalize(position); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uC, uDir; uniform float uAbs, uOpen, uT, uLit; varying vec3 vN, vV, vP;
      float gl(float x, float n){ float v = x * n; float d = abs(fract(v + .5) - .5); return 1. - smoothstep(0., fwidth(v) * 1.1, d); }
      void main(){ float f = pow(1. - abs(dot(normalize(vN), vV)), 3.);
        float cut = 1. - uOpen * 1.05; float cosA = dot(vP, normalize(uDir));
        if (uOpen > .001 && cosA > cut) discard;                                         // 窓＝ひらいた口
        float lat = gl(asin(clamp(vP.y, -1., 1.)) / 3.14159 + .5, 5.);                  // 緯線（5 本。地球儀に見えない）
        float lon = gl(atan(vP.z, vP.x) / 6.28318 + .5, 14.) * (1. - smoothstep(.9, .99, abs(vP.y)));   // 経線（14 本）
        float wire = max(lat, lon * 0.);
        float edge = uOpen > .001 ? 1. - smoothstep(0., .025, cut - cosA) : 0.;           // 口のふち
        float a = wire * mix(.22, .78, uAbs) + f * mix(.14, .2, uAbs) + edge * .85 + uLit * (wire * .5 + f * .15);
        vec3 c = mix(uC, vec3(1.), .25 + edge * .3);
        gl_FragColor = vec4(c, clamp(a, 0., .9)); }`,
  });
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, MOBILE ? 40 : 64, MOBILE ? 24 : 40), m); s.renderOrder = 3; return s;
}

// ───────── 人：等高線の姿（高さ 5 cm ごとの輪を重ねる＝人の形は線で）。脚と腕は付け根で振れる。描画は 5 回だけ
export function contourPerson(color = 0xf4aa96, H = 1.68, stepH = .05) {
  const g = new THREE.Group(), mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: .85, toneMapped: false });
  const ring = (arr, cx, h, rx, rz, n = 28) => { for (let i = 0; i < n; i++) { const a = i / n * TAU, b = (i + 1) / n * TAU; arr.push(cx + Math.cos(a) * rx, h, Math.sin(a) * rz, cx + Math.cos(b) * rx, h, Math.sin(b) * rz); } };
  const part = (arr, pivot) => { const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3)); gg.translate(-pivot.x, -pivot.y, -pivot.z); const l = new THREE.LineSegments(gg, mat); const p = new THREE.Group(); p.position.copy(pivot); p.add(l); g.add(p); return p; };
  const body = [], legL = [], legR = [], armL = [], armR = [], hip = .47 * H, sh = .8 * H;
  for (let h = .02; h < H; h += stepH) {
    const y = h / H;
    if (y < .47) { const rx = .055 + .02 * ss(0, .45, y), rz = .06 + .015 * ss(0, .45, y); ring(legL, -.09, h, rx, rz); ring(legR, .09, h, rx, rz); continue; }
    if (y < .52) { ring(body, 0, h, .17, .11); continue; }
    if (y < .8) { ring(body, 0, h, lerp(.15, .2, ss(.52, .78, y)), lerp(.1, .12, ss(.52, .78, y))); continue; }
    if (y < .84) { ring(body, 0, h, .17 - (y - .8) * 2.5, .1); continue; }
    if (y < .87) { ring(body, 0, h, .055, .055, 16); continue; }
    const q = Math.sqrt(Math.max(0, 1 - Math.pow((y - .935) / .068, 2))); ring(body, 0, h, .085 * q + .01, .095 * q + .01, 20);
  }
  for (let h = sh; h > .5 * H; h -= stepH) { ring(armL, -.225, h, .035, .04, 14); ring(armR, .225, h, .035, .04, 14); }
  part(body, new V3()); const LL = part(legL, new V3(-.09, hip, 0)), LR = part(legR, new V3(.09, hip, 0)), AL = part(armL, new V3(-.225, sh, 0)), AR = part(armR, new V3(.225, sh, 0));
  g.userData.walk = (t, k = 1) => { const s = Math.sin(t * Math.PI) * k; LL.rotation.x = s * .35; LR.rotation.x = -s * .35; AL.rotation.x = -s * .25; AR.rotation.x = s * .25; };
  g.userData.mat = mat; return g;
}

// ───────── 主体の輪（足もとの細い円と小さな点）
export function subjectRing(color, r = .35) {
  const pts = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU; pts.push(new V3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat); l.userData.mat = mat; return l;
}

// 生き物の材質にも「抽象へ」を（輪郭は残して沈む）
export function awaiCreature(obj, keep = .5) { obj.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) awaiPatch(m, { lines: false, keep }); }); return obj; }

// ───────── 描画の回数を減らす（2026-11-06）：動かない部品どうしを、同じ材質ごとに一つの形にまとめる。
//   まとめるのは「同じ親の直下・子を持たない・透けない・ひとつの材質」の形だけ（親ごと動く関節・翅・残像はそのまま動く）。
//   dropFur＝毛の層（画面の上で小さいと描かれない）を外す（スマホで小さな虫に使う）
export function bakeRigid(root, { dropFur = false } = {}) {
  const noop = THREE.Mesh.prototype.onBeforeRender;
  const visit = node => {
    if (dropFur) for (const c of [...node.children]) if (c.isMesh && c.userData.noCast && c.onBeforeRender !== noop) node.remove(c);
    for (const c of node.children) visit(c);
    const bins = new Map();
    for (const c of node.children) {
      if (!c.isMesh || c.isSkinnedMesh || c.isInstancedMesh || Array.isArray(c.material) || c.children.length || !c.visible || c.material.transparent || c.onBeforeRender !== noop || c.morphTargetInfluences) continue;
      const g = c.geometry, key = c.material.uuid + "|" + Object.keys(g.attributes).sort().join(",") + "|" + (g.index ? 1 : 0) + "|" + Object.keys(g.morphAttributes).length;
      (bins.get(key) || bins.set(key, []).get(key)).push(c);
    }
    for (const list of bins.values()) {
      if (list.length < 2) continue;
      const geos = list.map(c => { c.updateMatrix(); return c.geometry.clone().applyMatrix4(c.matrix); });
      const mg = mergeGeometries(geos, false); if (!mg) continue;
      const m = new THREE.Mesh(mg, list[0].material); m.castShadow = list[0].castShadow; m.receiveShadow = list[0].receiveShadow; m.renderOrder = list[0].renderOrder;
      for (const c of list) node.remove(c); node.add(m);
    }
  };
  visit(root); return root;
}

// スマホだけ（2026-11-06）：小さな生き物の、動かない部品を材質をこえて一つに（色は頂点の色に写す）。
//   画面の上で数ミリの虫や鳥では、材質ごとの照り（法線の地図・クリアコート）は見分けられないため。
//   wings＝鳥の翼の羽の段（材質の配列）を一つの材質で描く（形は毎こま組み直すまま）
let flatM = null;
export function flattenSmall(root, { wings = false, collapse = null, keep = [] } = {}) {
  const noop = THREE.Mesh.prototype.onBeforeRender;
  if (collapse) {   // 関節ごとの小さな動き（触角・腹の伸び縮み）を止め、体の中の動かない部品を体の直下へ集める
    const under = o => { for (let p = o; p && p !== collapse; p = p.parent) if (keep.includes(p)) return true; return false; };
    const ms = []; collapse.traverse(o => { if (o !== collapse && o.isMesh && !o.material.transparent && !Array.isArray(o.material) && !o.children.length && !under(o) && o.parent !== collapse) ms.push(o); });
    collapse.updateMatrixWorld(true); for (const m of ms) collapse.attach(m);
  }
  flatM ||= awaiPatch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .62, metalness: 0 }), { lines: false, keep: .5 });
  const visit = node => {
    for (const c of node.children) visit(c);
    if (wings) for (const c of node.children) if (c.isMesh && Array.isArray(c.material)) { c.material = c.material[0]; c.geometry.clearGroups(); }
    const list = node.children.filter(c => c.isMesh && !c.isSkinnedMesh && !c.isInstancedMesh && !Array.isArray(c.material) && !c.children.length && c.visible && !c.material.transparent && c.onBeforeRender === noop && !c.morphTargetInfluences);
    if (list.length < 2) return;
    const geos = list.map(c => { c.updateMatrix(); let g = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone(); g.applyMatrix4(c.matrix);
      const n = g.attributes.position.count, col = new Float32Array(n * 3), mc = c.material.color || new THREE.Color(1, 1, 1), vc = g.attributes.color;
      for (let i = 0; i < n; i++) { col[i * 3] = mc.r * (vc ? vc.getX(i) : 1); col[i * 3 + 1] = mc.g * (vc ? vc.getY(i) : 1); col[i * 3 + 2] = mc.b * (vc ? vc.getZ(i) : 1); }
      const out = new THREE.BufferGeometry(); out.setAttribute("position", g.attributes.position); out.setAttribute("normal", g.attributes.normal || (g.computeVertexNormals(), g.attributes.normal)); out.setAttribute("color", new THREE.BufferAttribute(col, 3)); return out; });
    const mg = mergeGeometries(geos, false); if (!mg) return;
    for (const c of list) node.remove(c); node.add(new THREE.Mesh(mg, flatM));
  };
  visit(root); return root;
}
