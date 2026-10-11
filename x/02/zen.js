/* 環世界の庭：閉じた禅の庭（2026-10-09）
   本人「無限遠まで世界が続いていてよくないので、瀧安寺の禅庭のような表現にして、かつ、3D モデルはリアルに表現してください。」
   本人「環世界の庭について、よりリアルに描いてください。」（同日・写実の作り込み）
   特定の庭の写しではなく、禅庭の作法（土塀で囲う・白砂に砂紋・石組み・苔・縁側から眺める）に沿ったオリジナルの庭（README）。
   写真の質感（CC0）：白砂＝Gravelly Sand、石＝Rock Surface、土塀の肌＝White Plaster 02 の法線、縁側＝Japanese Cedar Planks、
   柱と垂木＝Hinoki Planks、小壁＝White Plaster 02、塀の向こうの木＝Japanese Camphor Bark と LeafSet014（ambientCG）。
   砂紋の溝・苔の株・瓦の丸み・土塀の層は、この画面の中で描く（法線の地図も）。 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const TAU = Math.PI * 2;
const rnd = (() => { let s = 23; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
// なめらかなノイズ（値ノイズ・3 段）
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
const fbm = (x, y) => vnoise(x, y) * .55 + vnoise(x * 2.1, y * 2.1) * .3 + vnoise(x * 4.3, y * 4.3) * .15;

// 庭の大きさ（m）。塀の内側
export const YARD = { x0: -11.6, x1: 11.6, z0: -11.6, z1: 10.2 };
export const ENGAWA = { z0: 10.3, z1: 12.4, h: .45 };   // 縁側（床の高さ 45 cm）
export const STONES = [ { x: -3.6, z: -1.6, r: 1.5 }, { x: 3.2, z: -5.2, r: 1.6 }, { x: 4.0, z: 3.4, r: 1.1 } ];   // 石組み（三群）と、そのまわりの苔の島
// 石組みの一つずつ：[x, z, 幅, 高さ, 奥行, 向き, 沈め, 種]
const ROCKS = [
  [-3.9, -1.9, .75, 1.15, .6, .4, .35, 1], [-3.0, -1.2, .6, .5, .5, 1.2, .4, 2], [-4.4, -.9, .45, .35, .55, 2.1, .4, 3],      // 一群目：立石（主）と添え石二つ
  [3.0, -5.4, 1.2, .55, .7, .2, .4, 4], [3.9, -4.6, .55, .85, .5, 1.6, .35, 5], [2.2, -4.5, .4, .3, .45, .9, .45, 6],          // 二群目：横に長い伏石と、低い立石
  [4.1, 3.3, .6, .6, .5, .7, .4, 7], [3.5, 3.8, .4, .32, .45, 2.4, .45, 8],                                                        // 三群目：小さな二石
];
const STEPS = Array.from({ length: 6 }, (_, k) => [-.6 + Math.sin(k * 1.3) * .5, 9.4 - k * 1.05]);   // 縁側からおりる飛び石

// 葉の房（小枝に葉が互生した写真の板）を、房のまん中から外へ向く丸い面として照らす（板が平らに光らない）
export const crownHook = sh => {
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec3 aCtr; varying vec3 vCtr;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvCtr = aCtr;");
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vCtr;")
    .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
{ vec3 cn_ = normalize((viewMatrix * vec4(normalize(vWP - vCtr + vec3(0.0, .25, 0.0)), 0.0)).xyz); normal = normalize(mix(normal, cn_, .72)); }`);
};

// 高さの値から、法線の地図をつくる（線形・OpenGL の向き）
function nrmTex(w, h, H, k = 2) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"), img = g.createImageData(w, h), d = img.data;
  const at = (i, j) => H[((j + h) % h) * w + ((i + w) % w)];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const dx = (at(i + 1, j) - at(i - 1, j)) * k, dy = (at(i, j + 1) - at(i, j - 1)) * k, l = Math.hypot(dx, dy, 1), o = (j * w + i) * 4;
    d[o] = (-dx / l * .5 + .5) * 255; d[o + 1] = (dy / l * .5 + .5) * 255; d[o + 2] = (1 / l * .5 + .5) * 255; d[o + 3] = 255; }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

export function buildZen({ M, canvasTex, tx, garden, pick, sonic, POND, mobile }) {
  const W = YARD.x1 - YARD.x0, D = YARD.z1 - YARD.z0;
  // ---------------------------------------------------------------- 白砂と砂紋
  //   熊手で引いた溝（間隔 7.5 cm・深さ 1.5 cm ほど）は、シェーダーで一つずつの溝の傾きとして描く（近くでも遠くでも細かさがくずれない）。
  //   石と池のまわりは同心の輪、ほかは横にまっすぐ。砂の粒は白川砂のような白い砂利の写真（Gravelly Sand の明るさを白へ）。
  //   石・塀・縁側の足もとの、空の光がとどきにくいところ（環境光の遮蔽）は、絵に焼いて aoMap に
  const aoTex = canvasTex(512, Math.round(512 * D / W), (g, w, h) => {
    const sx = w / W, sz = h / D, X = x => (x - YARD.x0) * sx, Z = z => (z - YARD.z0) * sz;
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
    const blob = (x, z, rx, rz, ry, a) => { g.save(); g.translate(X(x), Z(z)); g.rotate(-ry); g.scale(rx * sx, rz * sz);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(.62, `rgba(0,0,0,${a * .7})`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore(); };
    for (const s of STONES) blob(s.x, s.z, s.r + .85, s.r + .85, 0, .28);         // 苔の島のふち
    blob(POND.x, POND.z, POND.r + .8, POND.r + .8, 0, .3);
    for (const [x, z] of STEPS) blob(x, z, .55, .48, 0, .55);
    blob(0, 10.05, 1.25, .7, 0, .6);
    const strip = (x0, z0, x1, z1, a) => { const gr = g.createLinearGradient(X(x0), Z(z0), X(x1), Z(z1)); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); };
    strip(YARD.x0, 0, YARD.x0 + .9, 0, .55); strip(YARD.x1, 0, YARD.x1 - .9, 0, .55); strip(0, YARD.z0, 0, YARD.z0 + .9, .55); strip(0, YARD.z1 + .1, 0, YARD.z1 - .7, .5);   // 塀ぎわと縁側の下
  }, false);
  const SF = [...STONES.map(s => new THREE.Vector3(s.x, s.z, s.r + .55)), new THREE.Vector3(POND.x, POND.z, POND.r + .45)];
  const sandM = M(0xffffff, { std: true, map: tx("sand_grit.webp", W / .9, D / .9), nmap: tx("sand_grit_n.webp", W / .9, D / .9, false), ns: .55, ao: aoTex, aoK: 1, rough: .97, env: .55, uv: .35, temp: .26, key: "sand",   // 白砂は紫外をそこそこ返す（目安）
    hook: sh => {
      sh.uniforms.uF = { value: SF };
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
uniform vec3 uF[4];
vec3 rakeAt(vec2 p) {            // 返す値：x＝溝の位相（溝の本数）、yz＝位相の傾き（1 m あたり）
  float best = 1e9; vec2 bd = vec2(0.0, 1.0);
  for (int i = 0; i < 4; i++) { vec2 q = p - uF[i].xy; float l = length(q); float e = l - uF[i].z; if (e < best) { best = e; bd = q / max(l, 1e-4); } }
  const float SP = .075;
  if (best < 5.0 * SP) return vec3(max(best, 0.0) / SP, bd / SP);
  return vec3((p.y + 11.6 + .02 * sin(p.x * .7)) / SP, .014 * cos(p.x * .7) / SP, 1.0 / SP);
}`)
        .replace("#include <map_fragment>", `#include <map_fragment>
vec3 rk_ = rakeAt(vWP.xz);
float fade_ = 1.0 - smoothstep(.16, .48, fwidth(rk_.x));
float cv_ = cos(6.2832 * rk_.x);
diffuseColor.rgb *= 1.0 + fade_ * (.045 * cv_ - .01) - (1.0 - fade_) * .012;`)
        .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
{ float sl_ = -.0065 * 6.2832 * sin(6.2832 * rk_.x) * fade_;
  vec3 nW_ = normalize(vec3(-sl_ * rk_.y, 1.0, -sl_ * rk_.z));
  vec3 up_ = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  normal = normalize((viewMatrix * vec4(nW_, 0.0)).xyz + (normal - up_)); }`);
    } });
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(W, D), sandM);
  sand.rotation.x = -Math.PI / 2; sand.position.set((YARD.x0 + YARD.x1) / 2, .001, (YARD.z0 + YARD.z1) / 2); sand.userData.noCast = true; garden.add(sand); pick.push(sand);

  // ---------------------------------------------------------------- 苔の島：株の起伏（3〜12 cm のむら）と、細かい毛羽（重ねた薄い層）
  const MS = 256, mh = new Float32Array(MS * MS);
  { const bumps = []; for (let i = 0; i < 1100; i++) bumps.push([Math.random() * MS, Math.random() * MS, 2.5 + Math.random() * 6]);
    for (let j = 0; j < MS; j++) for (let i = 0; i < MS; i++) { let v = 0; for (const [x, y, r] of bumps) { let dx = Math.abs(i - x), dy = Math.abs(j - y); dx = Math.min(dx, MS - dx); dy = Math.min(dy, MS - dy); const d2 = (dx * dx + dy * dy) / (r * r); if (d2 < 1) v = Math.max(v, Math.sqrt(1 - d2) * r / 8.5); }
      mh[j * MS + i] = v + .15 * hash(i, j); } }
  const mossTex = canvasTex(MS, MS, (g, w, h) => {
    const img = g.createImageData(w, h), d = img.data;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const v = mh[j * w + i], n = hash(i * 3, j * 7), o = (j * w + i) * 4, dry = fbm(i / 40 + 3, j / 40) > .68 ? 1 : 0;
      const l = .72 + .32 * v + .2 * (n - .5) + .18 * (fbm(i / 28, j / 28) - .5); d[o] = (dry ? 112 : 84 + 26 * v) * l; d[o + 1] = (dry ? 96 : 104 + 34 * v) * l; d[o + 2] = (dry ? 52 : 40 + 8 * v) * l; d[o + 3] = 255; }
    g.putImageData(img, 0, 0); });
  mossTex.wrapS = mossTex.wrapT = THREE.RepeatWrapping; mossTex.repeat.set(2.5, 2.5);
  const mossN = nrmTex(MS, MS, mh, 3); mossN.repeat.set(2.5, 2.5);
  const mossM = M(0xd2d6b6, { std: true, map: mossTex, nmap: mossN, ns: 1.2, rough: .95, env: .45, uv: .04, temp: .14, vc: true });   // 芝のような濃い緑にならないよう、黄味とくすみ
  const near = (x, z) => { let b = 9; for (const [rx, rz, w_, , d_] of ROCKS) b = Math.min(b, Math.hypot((x - rx) / (w_ + .05), (z - rz) / (d_ + .05)) - 1); return b; };   // 石の足もとからの近さ（石の大きさで割った値）
  const moss = [];
  const island = (cx, cz, R, seed) => {
    const rings = 22, pos = [], uv = [], col = [], idx = [];
    for (let r = 0; r <= rings; r++) for (let a = 0; a <= 72; a++) { const t = r / rings, ang = a / 72 * TAU, edge = R * (1 + .22 * (fbm(Math.cos(ang) * 2 + seed, Math.sin(ang) * 2) - .5) * 2);
      const x = cx + Math.cos(ang) * edge * t, z = cz + Math.sin(ang) * edge * t, y = .02 + .07 * Math.pow(1 - t * t, .6) + .045 * (fbm(x * 3, z * 3) - .5) + .025 * (vnoise(x * 11, z * 11) - .5);
      pos.push(x, Math.max(.005, y), z); uv.push(x / 1.2, z / 1.2);
      const ao = .55 + .45 * Math.min(1, Math.max(0, near(x, z) / .45)), c = ((t > .92 ? .72 : .95) + .45 * (fbm(x * 2.2, z * 2.2) - .5) + .16 * (vnoise(x * 13, z * 13) - .5)) * ao, yl = .1 * (fbm(x * 1.3 + 7, z * 1.3) - .5);
      col.push(c * (.97 + yl), c, c * (.88 - yl)); }
    for (let r = 0; r < rings; r++) for (let a = 0; a < 72; a++) { const i0 = r * 73 + a, i1 = i0 + 1, i2 = i0 + 73, i3 = i2 + 1; idx.push(i0, i1, i2, i1, i3, i2); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    moss.push(geo);
  };
  STONES.forEach((s, i) => island(s.x, s.z, s.r + .5, i * 3.1));
  island(POND.x, POND.z, POND.r + .7, 9.3);
  island(9.9, 0, 1.6, 4.4); island(9.9, -2.6, 1.5, 5.2); island(9.9, 2.6, 1.5, 6.1);   // 塀ぎわの苔の帯（植え込みの前）
  const mossGeo = mergeGeometries(moss), mossMesh = new THREE.Mesh(mossGeo, mossM); mossMesh.userData.noCast = true; garden.add(mossMesh); pick.push(mossMesh);
  // 毛羽：同じ形を 4〜12 mm 浮かせた薄い層に、茎葉の先の点だけを残す（層ごとに点を減らす）
  const fuzz = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const a = Math.random(); g.fillStyle = `rgba(${120 + a * 70},${150 + a * 60},${60 + a * 30},${a})`; g.fillRect(Math.random() * w, Math.random() * h, 1.3, 1.3); } });
  fuzz.wrapS = fuzz.wrapT = THREE.RepeatWrapping; fuzz.repeat.set(5, 5);
  const shells = mobile ? [[.006, .45]] : [[.004, .35], [.009, .6], [.014, .82]];
  for (const [off, cut] of shells) {
    const sg = mossGeo.clone(), p = sg.attributes.position, n = sg.attributes.normal; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * off, p.getY(i) + n.getY(i) * off, p.getZ(i) + n.getZ(i) * off);
    const sm = new THREE.Mesh(sg, M(0xc8d0a0, { std: true, map: fuzz, alphaTest: cut, rough: .9, env: .4, uv: .04, temp: .14, vc: true, key: "fz" + cut })); sm.userData.noCast = true; garden.add(sm);
  }

  // ---------------------------------------------------------------- 石組み（立石・伏石。砂と苔に沈める）
  const stoneM = M(0xf0f4f6, { std: true, vc: true, map: tx("rock_surface.webp", 1, 1), nmap: tx("rock_surface_n.webp", 1, 1, false), ns: 1.4, orm: tx("rock_surface_orm.webp", 1, 1, false), rough: 1, env: .6, uv: .1, temp: .45 });   // 写真の茶を灰へ寄せる（庭石の青灰）
  const cuts = seed => { const out = [], r = (k) => hash(seed * 7.3 + k, seed * 1.7 - k); for (let k = 0; k < 7; k++) { const a = r(k) * TAU, e = (r(k + 9) - .3) * 1.2, n = [Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)]; out.push([...n, .56 + r(k + 3) * .28]); } return out; };
  const stoneGeo = (seed, sx, sy, sz, detail) => {
    const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position, col = [];
    for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)), n = fbm(v.x * 1.4 + seed, v.z * 1.4 + v.y * 1.1) - .5, f = fbm(v.x * 4 + seed, v.y * 4 + v.z * 3) - .5;
      // 大きなかたまり＋割れ目の面＋細かい凹凸。卵形に見えないよう、上の方ほどかたまりを大きくゆがめる（山石の肩・稜）
      const top = Math.max(0, v.y), m = fbm(v.x * .8 - seed, v.z * .8 + v.y * .6) - .5;
      v.multiplyScalar(1 + .3 * n + .18 * m * (1 + top) + .05 * f + .05 * Math.abs(vnoise(v.x * 6 + seed, v.z * 6 + v.y * 5) - .5));
      if (v.y > .55) v.y = .55 + (v.y - .55) * .45;   // 頭を少し平らに（風化して丸まった割れ面）
      for (const [nx, ny, nz, c] of cuts(seed)) { const dp = v.x * nx + v.y * ny + v.z * nz; if (dp > c) { v.x -= nx * (dp - c); v.y -= ny * (dp - c); v.z -= nz * (dp - c); } }   // 割れた面（山石の角ばった姿）
      v.set(v.x * sx, v.y * sy, v.z * sz); p.setXYZ(i, v.x, v.y, v.z);
      const s = .82 + .3 * (fbm(v.x * 2 + seed, v.z * 2) - .5); const lichen = fbm(v.x * 5 + seed, v.y * 5) > .66 && v.y > 0; col.push(...(lichen ? [s * .92, s * .95, s * .72] : [s, s * .98, s * .94])); }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  };
  // 足もとほど暗く（土と苔に接するところの、環境光の遮蔽）。石の下のほうには土のしみ
  const groundAO = g => { const p = g.attributes.position, c = g.attributes.color; for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = .65 + .35 * Math.min(1, Math.max(0, y / .3)); c.setXYZ(i, c.getX(i) * k * (y < .12 ? .92 : 1), c.getY(i) * k * (y < .12 ? .88 : 1), c.getZ(i) * k * (y < .12 ? .8 : 1)); } };
  const det = mobile ? 3 : 4, sg = [];
  for (const [x, z, sx, sy, sz, ry, sink, seed] of ROCKS) { const g = stoneGeo(seed, sx, sy, sz, det); g.rotateY(ry); g.translate(x, sy * (1 - sink) * .9, z); groundAO(g); sg.push(g); }
  const stones = new THREE.Mesh(mergeGeometries(sg), stoneM); garden.add(stones); sonic.push(stones);
  const steps = []; STEPS.forEach(([x, z], k) => { const g = stoneGeo(20 + k, .38, .12, .32, 3); g.translate(x, .05, z); groundAO(g); steps.push(g); });
  { const g = stoneGeo(31, .9, .22, .45, 3); g.translate(0, .2, 10.05); groundAO(g); steps.push(g); }   // 沓脱石
  garden.add(new THREE.Mesh(mergeGeometries(steps), stoneM));

  // ---------------------------------------------------------------- 土塀（油土塀の風合い：版築の層・雨だれのしみ・足もとの暗さ）と瓦の笠
  const clayTex = canvasTex(1024, 512, (g, w, h) => {
    const img = g.createImageData(w, h), d = img.data;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const x = i / w * 6, y = j / h * 3, layer = .5 + .5 * Math.sin(y * 13 + fbm(x * 1.5, y * 2) * 2.2), seam = Math.pow(Math.abs(Math.sin(y * 6.5 + fbm(x * 2, 3) * .8)), 40), n = fbm(x * 3, y * 3), fine = hash(i, j);
      const streak = Math.pow(fbm(x * 9, 0.3), 4) * 1.1 * Math.max(0, 1 - y / 1.4) * (.6 + .8 * fbm(x * 2, y * 3));   // 笠の下だけの短い雨だれ
      const oil = Math.pow(fbm(x * 1.2 + 5, y * 1.6), 2.2);    // 油がしみた濃い斑
      const v = j / h, ao = (1 - .38 * Math.pow(Math.max(0, (v - .82) / .18), 1.6)) * (1 - .3 * Math.pow(Math.max(0, (.07 - v) / .07), 1.2));   // 足もと（地面ぎわ）と笠の下
      const k = (.8 + .09 * layer - .16 * seam + .18 * (n - .5) + .08 * (fine - .5) - .3 * streak - .22 * oil) * ao;
      const o = (j * w + i) * 4; d[o] = 200 * k; d[o + 1] = 166 * k; d[o + 2] = 122 * k; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(70,50,30,${Math.random() * .25})`; g.fillRect(Math.random() * w, h - Math.random() * 60, 2, 2); }   // 泥はね
  });
  clayTex.wrapS = clayTex.wrapT = THREE.RepeatWrapping; clayTex.flipY = false;
  // いぶし瓦（本瓦葺き）：丸瓦の凸と平瓦の凹がくり返す。色と法線を同じ形から描く（一枚の絵＝幅 0.9 m に 3 列）
  const TW = 192, TH = 128, th = new Float32Array(TW * TH);
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) { const u = (i / TW * 3) % 1, v = j / TH * 3 % 1;
    const round = u < .32 ? Math.sqrt(Math.max(0, 1 - Math.pow((u - .16) / .16, 2))) * .9 + .2 : 0, flat = u >= .32 ? .12 * (1 - Math.pow((u - .66) / .34, 2)) * -1 + .1 : 0;
    th[j * TW + i] = (round || flat) + .18 * v; }   // 一枚ずつの重なり（下の瓦の上に次の瓦が乗る段）
  const tileN = nrmTex(TW, TH, th, 2.2);
  const tileTex = canvasTex(TW, TH, (g, w, h) => { const img = g.createImageData(w, h), d = img.data;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const t = th[j * w + i], n = hash(i * 1.3, j * 2.1), o = (j * w + i) * 4, k = .62 + .3 * t + .08 * (n - .5) - .1 * (fbm(i / 30, j / 30) - .5);
      d[o] = 92 * k; d[o + 1] = 96 * k; d[o + 2] = 102 * k; d[o + 3] = 255; }
    g.putImageData(img, 0, 0); });
  tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
  const tileOpts = { std: true, map: tileTex, nmap: tileN, ns: 1.6, rough: .58, metal: .06, env: .8, uv: .06, temp: .35 };   // いぶし銀のにぶい艶
  const wallH = 2.3, wallT = .42;
  const walls = [], caps = [], eaves = [];
  const wallSeg = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(z1 - z0, x1 - x0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const g = new THREE.BoxGeometry(L, wallH, wallT); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L / 4, 1 - uv.getY(i)); g.rotateY(-a).translate(cx, wallH / 2, cz); walls.push(g);
    // 瓦の笠：両側へ流れる屋根（切妻）。uv の u＝塀に沿う向き（瓦の列）、v＝流れの向き
    const roof = new THREE.BufferGeometry(), hw = wallT / 2 + .28, top = wallH + .32, eave = wallH + .02, l = L / 2 + .15;
    const P = [[-l, eave, -hw], [l, eave, -hw], [l, top, 0], [-l, top, 0], [-l, top, 0], [l, top, 0], [l, eave, hw], [-l, eave, hw]];
    roof.setAttribute("position", new THREE.Float32BufferAttribute(P.flat(), 3)); roof.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, L / .9, 0, L / .9, 1, 0, 1, 0, 1, L / .9, 1, L / .9, 0, 0, 0], 2));
    roof.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]); roof.computeVertexNormals(); roof.rotateY(-a).translate(cx, 0, cz); caps.push(roof);
    const ridge = new THREE.CylinderGeometry(.08, .08, L + .3, 10); ridge.rotateZ(Math.PI / 2).rotateY(-a).translate(cx, top + .03, cz); caps.push(ridge);
    // 軒先の丸瓦の端（巴瓦）：0.3 m ごと、両側
    for (let s = -l + .05; s < l; s += .3) for (const sd of [-1, 1]) eaves.push([cx + Math.cos(a) * s - Math.sin(a) * sd * (hw + .01) * -1, eave + .02, cz + Math.sin(a) * s + Math.cos(a) * sd * (hw + .01), -a + (sd > 0 ? 0 : Math.PI)]);
  };
  const X0 = YARD.x0 - wallT / 2, X1 = YARD.x1 + wallT / 2, Z0 = YARD.z0 - wallT / 2, Z1 = ENGAWA.z0 + .1;
  wallSeg(X0, Z0, X1, Z0); wallSeg(X0, Z0, X0, Z1); wallSeg(X1, Z0, X1, Z1);
  const plasterN = tx("plaster_n.webp", 1, 1, false); plasterN.repeat.set(2, 1);
  const wallMesh = new THREE.Mesh(mergeGeometries(walls), M(0xffffff, { std: true, map: clayTex, nmap: plasterN, ns: 1.3, rough: .95, env: .4, uv: .08, temp: .3 })); garden.add(wallMesh); sonic.push(wallMesh);
  garden.add(new THREE.Mesh(mergeGeometries(caps.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!["position", "uv"].includes(k)) n.deleteAttribute(k); n.computeVertexNormals(); return n; })), M(0xffffff, { ...tileOpts, side: THREE.DoubleSide })));
  { const eg = new THREE.CylinderGeometry(.075, .075, .06, 12).rotateX(Math.PI / 2), im = new THREE.InstancedMesh(eg, M(0x50545a, { std: true, rough: .65, env: .5, uv: .06, temp: .35 }), eaves.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    eaves.forEach(([x, y, z, ry], i) => { q.setFromEuler(new THREE.Euler(.5, ry, 0, "YXZ")); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m4); });
    im.userData.smallCast = true; garden.add(im); }

  // ---------------------------------------------------------------- 縁側（床板・柱・深い軒）。見る人はここから庭を眺めて、おりて歩く
  const plankM = M(0xe8dcc8, { std: true, map: tx("planks_cedar.webp", 6, 1), nmap: tx("planks_cedar_n.webp", 6, 1, false), orm: tx("planks_cedar_orm.webp", 6, 1, false), rough: .62, env: .9, uv: .06, temp: .25 });   // 磨かれた板（空がうすく映る）
  const woodM = M(0x8a7058, { std: true, map: tx("hinoki.webp", 1, 1), nmap: tx("hinoki_n.webp", 1, 1, false), orm: tx("hinoki_orm.webp", 1, 1, false), rough: .85, env: .5, uv: .05, temp: .2 });   // 古びた檜の色
  const engawa = new THREE.Mesh(new THREE.BoxGeometry(YARD.x1 - YARD.x0 + .9, .08, ENGAWA.z1 - ENGAWA.z0).translate(0, ENGAWA.h - .04, (ENGAWA.z0 + ENGAWA.z1) / 2), plankM); garden.add(engawa); pick.push(engawa);
  const wd = [];
  wd.push(new THREE.BoxGeometry(YARD.x1 - YARD.x0 + .9, ENGAWA.h - .08, .12).translate(0, (ENGAWA.h - .08) / 2, ENGAWA.z0 + .06));   // 縁の框
  for (let k = -3; k < 3; k++) wd.push(new THREE.BoxGeometry(.18, 3.0, .18).translate((k + .5) * 3.9, 1.5 + ENGAWA.h - .05, ENGAWA.z0 + .25));   // 柱
  wd.push(new THREE.BoxGeometry(YARD.x1 - YARD.x0 + .9, .22, .2).translate(0, 3.0 + ENGAWA.h - .1, ENGAWA.z0 + .25));   // 桁
  for (let k = -30; k <= 30; k++) wd.push(new THREE.BoxGeometry(.07, .09, 2.6).rotateX(-.28).translate(k * .4, 3.55 + ENGAWA.h, ENGAWA.z0 + .65));   // 垂木
  garden.add(new THREE.Mesh(mergeGeometries(wd.map(g => g.index ? g.toNonIndexed() : g)), woodM));
  const roofG = new THREE.PlaneGeometry(YARD.x1 - YARD.x0 + 2, 3.2); { const u = roofG.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * (YARD.x1 - YARD.x0 + 2) / .9, u.getY(i) * 3.2 / .9); }
  roofG.rotateX(-Math.PI / 2 - .28).translate(0, 3.72 + ENGAWA.h, ENGAWA.z0 + .6);
  garden.add(new THREE.Mesh(roofG, M(0xffffff, { ...tileOpts, side: THREE.DoubleSide })));
  // 奥の障子
  const shojiTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#efe9da"; g.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(160,150,120,${Math.random() * .08})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 1); }
    g.strokeStyle = "#6a5440"; g.lineWidth = 5; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); } for (let j = 0; j <= 6; j++) { g.beginPath(); g.moveTo(0, j * h / 6); g.lineTo(w, j * h / 6); g.stroke(); } });
  shojiTex.wrapS = THREE.RepeatWrapping; shojiTex.repeat.set(10, 1);
  const shoji = new THREE.Mesh(new THREE.PlaneGeometry(YARD.x1 - YARD.x0 + .9, 2.6), M(0xffffff, { map: shojiTex, uv: .2, temp: .25, side: THREE.DoubleSide })); shoji.position.set(0, ENGAWA.h + 1.3, ENGAWA.z1); garden.add(shoji);

  // 縁側の奥の建物（障子の上の小壁・母屋の大屋根・両端の妻壁）。振り返っても空が抜けず、建物の中から眺めている形にする
  { const BW = YARD.x1 - YARD.x0 + .9, z1 = ENGAWA.z1, yTop = ENGAWA.h + 2.6, eaveY = 4.62, ridgeZ = z1 + 5.2, ridgeY = 7.2;
    const plaster = M(0xf2ede2, { std: true, map: tx("plaster.webp", BW / 2, 1), nmap: tx("plaster_n.webp", BW / 2, 1, false), rough: .95, env: .4, uv: .2, temp: .25, side: THREE.DoubleSide });
    const kabe = new THREE.Mesh(new THREE.PlaneGeometry(BW, eaveY - yTop), plaster); kabe.position.set(0, (yTop + eaveY) / 2, z1 + .01); garden.add(kabe);   // 小壁（白い漆喰）
    const L = Math.hypot(ridgeZ - z1, ridgeY - eaveY), ang = Math.atan2(ridgeY - eaveY, ridgeZ - z1);
    const big = new THREE.PlaneGeometry(BW + 1.2, L + .4); const uvb = big.attributes.uv; for (let i = 0; i < uvb.count; i++) uvb.setXY(i, uvb.getX(i) * (BW + 1.2) / .9, uvb.getY(i) * (L + .4) / .9);
    big.rotateX(-Math.PI / 2 + ang).translate(0, (eaveY + ridgeY) / 2, (z1 + ridgeZ) / 2 - .1);
    garden.add(new THREE.Mesh(big, M(0xffffff, { ...tileOpts, side: THREE.DoubleSide })));
    const sh = new THREE.Shape([new THREE.Vector2(z1, 0), new THREE.Vector2(ridgeZ + 3, 0), new THREE.Vector2(ridgeZ + 3, ridgeY), new THREE.Vector2(ridgeZ, ridgeY), new THREE.Vector2(z1, eaveY)]);
    for (const sx of [-1, 1]) { const g = new THREE.ShapeGeometry(sh); g.rotateY(-Math.PI / 2).translate(sx * BW / 2, 0, 0); garden.add(new THREE.Mesh(g, M(0xffffff, { map: clayTex, uv: .08, temp: .3, side: THREE.DoubleSide }))); }
    const ridge = new THREE.CylinderGeometry(.12, .12, BW + 1.4, 10); ridge.rotateZ(Math.PI / 2).translate(0, ridgeY + .06, ridgeZ); garden.add(new THREE.Mesh(ridge, M(0x2e3032, { std: true, rough: .5, metal: .2, uv: .05, temp: .3 })));
  }

  // ---------------------------------------------------------------- 塀の向こう：3D の木（枝分かれした幹と枝・葉の房の板・風で揺れる）。地平線は見せない
  //   樹皮＝Japanese Camphor Bark、葉＝LeafSet014 の葉を小枝に互生させた房（_dev/tex_prep.py）。寺の森の常緑・落葉の広葉樹のつもり（種は決めない）
  const barkM = M(0x857c72, { std: true, map: tx("bark_camphor.webp", 1, 1), nmap: tx("bark_camphor_n.webp", 1, 1, false), ns: 1.2, orm: tx("bark_camphor_orm.webp", 1, 1, false), rough: 1, env: .4, uv: .05, temp: .1 });
  //   板は小枝の房 4 本を扇に重ねた写真（leaf_cluster.webp・幅 1：高さ 0.56）。葉一枚は 9〜13 cm（実物の 5〜10 cm ほど）
  const sprayM = ["leaf_cluster.webp", "leaf_cluster.webp"].map((f, k) => { const t = tx(f, 1, 1); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return M(0xffffff, { std: true, map: t, alphaTest: .45, side: THREE.DoubleSide, rough: .62, env: .45, uv: .04, temp: .1, wind: .09, windH: 12, key: "crown", hook: crownHook }); });
  const wood = [], cards = [[], []];
  const seg = (a, b, r0, r1) => { const d = b.clone().sub(a), L = d.length(), g = new THREE.CylinderGeometry(r1, r0, L, 7, 1, true), u = g.attributes.uv;
    for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * Math.max(1, r0 * 12), u.getY(i) * L / 1.2);
    g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); wood.push(g); };
  const tree = (x, z, H, nCards) => {
    const tips = [], ctr = new THREE.Vector3(x, H * .62, z);
    const branch = (p, dir, len, r, depth) => { let q = p.clone(), d = dir.clone();
      for (let i = 0; i < 3; i++) { d.add(new THREE.Vector3((rnd() - .5) * .35, .06, (rnd() - .5) * .35)).normalize(); const n = q.clone().addScaledVector(d, len / 3); seg(q, n, r * (1 - i * .22), r * (1 - (i + 1) * .22)); q = n;
        if (depth <= 1 || i >= 1) tips.push(q.clone()); }   // 葉をつける点：細い枝の途中と先（太い枝は裸のまま見せない）
      if (depth > 0) { const k = depth === 2 ? 3 : 2 + (rnd() < .4 ? 1 : 0); for (let j = 0; j < k; j++) { const a = j / k * TAU + rnd() * 1.2, out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        branch(q, d.clone().multiplyScalar(.6).addScaledVector(out, .75).add(new THREE.Vector3(0, .35, 0)).normalize(), len * .68, r * .32, depth - 1); } } };
    const t0 = new THREE.Vector3(x, 0, z), t1 = new THREE.Vector3(x + (rnd() - .5) * .8, H * .24, z + (rnd() - .5) * .8), r0 = .14 + H * .011;
    seg(t0.clone().setY(-.2), t1, r0 * 1.3, r0 * .85);
    for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + rnd(); branch(t1, new THREE.Vector3(Math.cos(a) * 1.1, 1, Math.sin(a) * 1.1).normalize(), H * .4, r0 * .5, 2); }
    // 葉の房：枝先のまわりに、外と上へ向けて（房の大きさ 0.45〜0.7 m＝葉一枚 7〜10 cm）
    const m4 = new THREE.Matrix4(), xA = new THREE.Vector3(), yA = new THREE.Vector3(), zA = new THREE.Vector3(), rv = new THREE.Vector3();
    for (let i = 0; i < nCards; i++) { const tp = tips[Math.floor(rnd() * tips.length)], out = tp.clone().sub(ctr).normalize();
      const pos = tp.clone().add(new THREE.Vector3(rnd() - .5, rnd() - .5, rnd() - .5).multiplyScalar(1.7)).addScaledVector(out, .15 + rnd() * .5);
      yA.copy(out).add(new THREE.Vector3((rnd() - .5) * 1.2, .35 + rnd() * .5, (rnd() - .5) * 1.2)).normalize();
      rv.set(rnd() - .5, rnd() - .5, rnd() - .5); xA.crossVectors(yA, rv).normalize(); zA.crossVectors(xA, yA);
      const s = .6 + rnd() * .25; m4.makeBasis(xA.multiplyScalar(s), yA.multiplyScalar(s), zA.multiplyScalar(s)); m4.setPosition(pos);
      cards[i % 2].push([m4.clone(), tp, .5 + rnd() * .34 + .12 * Math.max(0, out.y)]); }   // 上の房ほど明るい若葉
  };
  const nT = mobile ? 12 : 20, per = mobile ? 1100 : 2300;
  for (let i = 0; i < nT; i++) {
    const side = i % 3, t = (Math.floor(i / 3) + rnd() * .8) / Math.ceil(nT / 3), far = rnd() < .45 ? 7 : 2.8;
    let x, z; if (side === 0) { x = YARD.x0 - 3 + t * (W + 6); z = YARD.z0 - far - rnd() * 3; } else { x = side === 1 ? YARD.x0 - far - rnd() * 3 : YARD.x1 + far + rnd() * 3; z = YARD.z0 - 2 + t * (D + 1); }
    tree(x, z, 9 + rnd() * 6 + (far > 5 ? 2 : 0), per);
  }
  const trunkMesh = new THREE.Mesh(mergeGeometries(wood), barkM); garden.add(trunkMesh);
  const col = new THREE.Color();
  cards.forEach((list, k) => { const geo = new THREE.PlaneGeometry(1, .56).translate(0, .28, 0), ctrA = new Float32Array(list.length * 3), im = new THREE.InstancedMesh(geo, sprayM[k], list.length);
    list.forEach(([m4, tp, l], i) => { im.setMatrixAt(i, m4); ctrA.set([tp.x, tp.y, tp.z], i * 3); col.setRGB(l * (.78 + rnd() * .1), l * (.86 + rnd() * .08), l * .72); im.setColorAt(i, col); });   // 房ごとの濃淡（常緑の濃い緑〜若い葉）
    geo.setAttribute("aCtr", new THREE.InstancedBufferAttribute(ctrA, 3)); im.frustumCulled = false; garden.add(im); });
  // 塀の外の地面（見えないが、空の下に穴をつくらない）
  const outG = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), M(0x3a3528, { uv: .03, temp: .1 })); outG.rotation.x = -Math.PI / 2; outG.position.y = -.02; outG.userData.noShadow = true; garden.add(outG);
  return { sand, engawa };
}
