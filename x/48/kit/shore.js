/* kit/shore.js ── 森の先の海辺（2026-11-23 本人「自然の中に、海辺の要素を入れてください」）。
   森の東（+x）で川が海へ出る。小さな入り江の砂浜・波打ち際（寄せては返す泡の線）・磯の岩・沖の水平線。
   共通の部品：Qualia/sight（x/02）・Qualia/hear（x/48）で同じものを使う（touch ほかでも使える形）。
   素材：砂 gravelly_sand（Poly Haven・CC0）・岩 rock_surface（Poly Haven・CC0。森と同じ）。ほかの形（波・泡・ウミネコ・イソガニ）はこの画面の中で描いた模式。
   生き物：ウミネコ（日本の海辺でふつうに見られるカモメの仲間。白い体・灰色の背・黒い尾の帯・黄色い嘴の先に赤と黒）／
   イソガニ（磯の岩のすき間にいる。甲は 3 cm ほど。はさみ 2・歩く脚 8・目は柄の先）。見やすさのため、カニは実物の 2 倍の大きさで描く。
   手がかり（M の uv・temp・echo）：水は超音波をよく返し、温かさは陸より低い（昼）。乾いた砂は日なたで温かい。値は見え方の模式。
   重さ：はじめは遠景（砂・海・岩・鳥）だけ。カニは近づいたときに組む。
   使い方：const S = buildShore({ M, tx, canvasTex, group, pick, sonic, mobile }); 毎こま S.update(t, dt, camPos)。S.shoreX(z)・S.blocked(x, z)。 */
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const TAU = Math.PI * 2;
// 汀線（波が引いたときの水ぎわ）：川口（z≈4）でいちばん陸へ入った入り江
export const shoreX = z => Math.min(56, 43.4 + .011 * (z - 4) * (z - 4) + .5 * Math.sin(z * .23));
export const edgeX = z => shoreX(z) - 7;   // 林のはし（ここから先は砂浜）
// 林のはしより海側の木・草を外す（幹ごと。幹のない草・石は位置で）。森の形（forest.js）はそのまま、組んだあとの面を畳むだけ
export function clearForest(forest, trunks, skip = [], only = null) {
  const cell = new Map(), K = 4, key = (x, z) => Math.floor(x / K) + "," + Math.floor(z / K);
  for (const t of trunks) if (t[0] > 20) { const k = key(t[0], t[1]); (cell.get(k) || cell.set(k, []).get(k)).push(t); }
  const owner = (x, z, R) => { let best = null, bd = R; const cx = Math.floor(x / K), cz = Math.floor(z / K); for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) for (const t of cell.get((cx + i) + "," + (cz + j)) || []) { const d = Math.hypot(x - t[0], z - t[1]); if (d < bd) { bd = d; best = t; } } return best; };
  const gone = (x, z, R) => { if (x < edgeX(z) - 9) return false; const o = owner(x, z, R); if (o && Math.hypot(x - o[0], z - o[1]) < 5.5) return o[0] > edgeX(o[1]); return x > edgeX(z) - .5; };   // 幹の近く＝その木と同じ扱い。幹の名簿にない木・草・石は位置で   // 幹から 5.5 m（枝先）まで、その木と同じ扱い（枝の切れ端が宙に残らない）
  const m4 = new THREE.Matrix4(), Z = new THREE.Matrix4().makeScale(0, 0, 0);
  const list = []; for (const it of only || [...forest.children]) { if (!it || skip.includes(it) || it.userData?.keep) continue; if (it.isMesh) list.push(it); else it.traverse?.(o => { if (o.isMesh && !skip.includes(o)) list.push(o); }); }   // 後から足す草花の組（Group）の中も見る（組は原点に置かれている）
  for (const o of list) {
    const g = o.geometry, p = g.attributes.position;
    if (o.isInstancedMesh) { let ch = false; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); const x = m4.elements[12], z = m4.elements[14]; if (gone(x, z, 5.5)) { o.setMatrixAt(i, Z); ch = true; } } if (ch) { o.instanceMatrix.needsUpdate = true; o.computeBoundingSphere?.(); } continue; }
    if (!p) continue;
    if (g.index) { if (o === forest.userData.ground || o.geometry.attributes.position.count > 20000) continue; g.computeBoundingBox(); if (g.boundingBox.max.x < 30) continue; let ch = false; const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); if (v.x > edgeX(v.z) - 1.5) { const w = v.clone(); w.y = -1.2; o.worldToLocal(w); p.setXYZ(i, w.x, w.y, w.z); ch = true; } }   // 川の先・濡れた岸の帯は、浜の砂の下へ沈める（波打ちぎわに暗い板が浮かない）
      if (ch) { p.needsUpdate = true; g.computeBoundingSphere(); } continue; }
    g.computeBoundingBox(); if (g.boundingBox.max.x < 20) continue;
    let ch = false; for (let i = 0; i < p.count; i += 3) { const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3; if (gone(x, z, 7)) { for (let k = 0; k < 3; k++) p.setXYZ(i + k, x, -50, z); ch = true; } }
    if (ch) { p.needsUpdate = true; g.computeBoundingSphere(); }
  }
}
export const ROCKS = { x: 46.5, z: -17, r: 5.5 };

export function buildShore({ M, tx, canvasTex, group, pick, sonic, mobile }) {
  let seed = 4242; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const root = new THREE.Group(); root.name = "海辺"; root.userData.keep = true; group.add(root);
  // ---------------------------------------------------------------- 砂浜（森の土から砂へ、ゆるやかに移る。水ぎわは濡れて暗い）
  const sand = tx("sand_grit.webp", 1, 1), sandN = tx("sand_grit_n.webp", 1, 1, false);   // 白っぽい砂の粒（森の禅庭と同じ CC0 の写真）
  { const X0 = 30, X1 = 64, Z0 = -40, Z1 = 44, nx = mobile ? 40 : 64, nz = mobile ? 60 : 96, g = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, nx, nz); g.rotateX(-Math.PI / 2); g.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
    const p = g.attributes.position, uv = g.attributes.uv, col = [];
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), sx = shoreX(z), d = sx - x;   // d＝水ぎわまでの距離
      const y = d > 0 ? .03 + Math.min(.25, d * .025) * Math.min(1, (x - X0) / 8) : -.06 + d * .03; p.setY(i, y);   // 浜は水ぎわへ下がる
      uv.setXY(i, x / 3, z / 3);
      const fade = Math.min(1, Math.max(0, (x - edgeX(z) + 3) / 5)), wet = d < 0 ? 1 : Math.max(0, 1 - d / 3.2), k = 1 - wet * .42;
      col.push(.96 * k, .9 * k, .78 * k, fade); }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 4)); g.computeVertexNormals();
    const m = M(0xffffff, { std: true, map: sand, nmap: sandN, ns: 1, vc: true, transparent: true, rough: .95, env: .3, uv: .3, temp: .45, echo: .5 }); m.depthWrite = true;
    const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; mesh.renderOrder = 1; root.add(mesh); pick.push(mesh); sonic.push(mesh); }
  // ---------------------------------------------------------------- 海（2026-11-23 本人「うみをもっとリアルに」）
  //   うねり（長い波）とさざ波（短い波）の二枚の凹凸を、向きと速さを変えて流す。水は金属でなく、空と夕日は浅い角度ほど強く映る（フレネル＝物理ベースの材質のまま）。
  //   岸は浅く、下の濡れた砂が透けて青緑に明るい。沖ほど深い紺。水平線はかすみに溶ける（霧）。色と映り込みは見え方の模式。
  const waveN = (() => { const n = 256, cv = document.createElement("canvas"); cv.width = cv.height = n; const g = cv.getContext("2d"), H = new Float32Array(n * n);
    const W = []; let s2 = 77; const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647; for (let k = 0; k < 26; k++) { const f = 1 + Math.floor(Math.pow(r2(), 1.6) * 14), a = r2() * TAU; W.push([Math.round(Math.cos(a) * f), Math.round(Math.sin(a) * f), 1 / Math.pow(f, 1.15), r2() * TAU]); }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let h = 0; for (const [a, b, A, ph] of W) { const s = Math.sin((a * x + b * y) / n * TAU + ph); h += A * (1 - Math.abs(s)) ; } H[y * n + x] = h; }   // 1−|sin|＝とがった山と丸い谷（水の波の形）
    const im = g.createImageData(n, n), at = (x, y) => H[((y + n) % n) * n + (x + n) % n]; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const k = (y * n + x) * 4; im.data[k] = Math.max(0, Math.min(255, 128 - (at(x + 1, y) - at(x - 1, y)) * 90)); im.data[k + 1] = Math.max(0, Math.min(255, 128 - (at(x, y + 1) - at(x, y - 1)) * 90)); im.data[k + 2] = 255; im.data[k + 3] = 255; }
    g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(26, 26); t.anisotropy = 8; return t; })();
  const HZ = new THREE.Color(0x6f8ea0);
  const UW = { uSeaT: { value: 0 }, uHaze: { value: new THREE.Color(0xc8d4dc) } };
  const seaHook = sh => { sh.uniforms.uSeaT = UW.uSeaT; sh.uniforms.uHaze = UW.uHaze;
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uSeaT; uniform vec3 uHaze;")
      .replace("#include <fog_fragment>", "float hz_ = smoothstep( 40.0, 460.0, length( vViewPosition ) );\ngl_FragColor.rgb = mix( gl_FragColor.rgb, uHaze, hz_ * .78 );\n#include <fog_fragment>")   // 霧の代わりに、遠くほど空の地平の色へ（水平線がくっきり残る）
      .replace("vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;",
        "vec3 n1_ = texture2D( normalMap, vNormalMapUv * .11 + vec2( uSeaT * .0012, uSeaT * .0026 ) ).xyz * 2.0 - 1.0;\n" +
        "vec3 n2_ = texture2D( normalMap, vNormalMapUv + vec2( -uSeaT * .011, uSeaT * .006 ) ).xyz * 2.0 - 1.0;\n" +
        "vec3 n3_ = texture2D( normalMap, vNormalMapUv * 2.7 + vec2( uSeaT * .019, -uSeaT * .013 ) ).xyz * 2.0 - 1.0;\n" +
        "float fd_ = clamp( length( vViewPosition ) / 140.0, 0.0, 1.0 );\n" +
        "vec3 mapN = normalize( vec3( ( n1_.xy * 1.3 * ( 1.0 - fd_ * .6 ) + n2_.xy * .8 * ( 1.0 - fd_ * .85 ) + n3_.xy * .45 * ( 1.0 - fd_ ) ), 1.0 ) );");   // 遠くほど細かな凹凸を消す（同じ形のくり返しを見せない）
  };
  const seaM = M(0xffffff, { fog: false, std: true, rough: .06, metal: 0, env: 1.15, nmap: waveN, ns: .55, vc: true, transparent: true, uv: .12, temp: .02, echo: .95, hook: seaHook, key: "sea" });
  { const S = 560, nx = mobile ? 70 : 110, nz = mobile ? 60 : 90, g = new THREE.PlaneGeometry(1, S, nx, nz); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, col = [], deep = new THREE.Color(0x0b2a3a), mid = new THREE.Color(0x15505c), shal = new THREE.Color(0x3f8f8a), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const u = p.getX(i) + .5, z = p.getZ(i), x = shoreX(z) - .6 + 520 * Math.pow(u, 2.4); p.setX(i, x); p.setY(i, .02);   // 岸の近くほど細かく
      const d = x - shoreX(z), k1 = Math.min(1, Math.max(0, d / 7)), k2 = Math.min(1, Math.max(0, (d - 7) / 60));
      c.copy(shal).lerp(mid, k1).lerp(deep, k2); col.push(c.r, c.g, c.b, Math.min(1, Math.max(0, (d + .6) / 1.4)) * (.42 + .58 * Math.min(1, Math.max(0, d / 4.5)))); }   // 水のはしは透明から始める（砂の上に板の縁を見せない）   // 浅瀬は下の砂が透ける
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 4)); g.computeVertexNormals();
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 20, p.getZ(i) / 20);
    waveN.repeat.set(1, 1);
    const sea = new THREE.Mesh(g, seaM); sea.receiveShadow = true; sea.renderOrder = 2; sea.name = "海"; root.add(sea); sonic.push(sea); }
  // ---------------------------------------------------------------- 波打ち際：寄せては返す泡の線（約 8 秒の周期・模式）
  const foamTex = canvasTex(256, 64, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const y = h * (.35 + .5 * Math.pow(Math.random(), 1.6)), x = Math.random() * w, r = .6 + Math.random() * 2.2; g.fillStyle = `rgba(255,255,255,${.25 + Math.random() * .6})`; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(.75, "rgba(255,255,255,.55)"); gr.addColorStop(.9, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  foamTex.wrapS = THREE.RepeatWrapping;
  const foams = [];
  for (let k = 0; k < 3; k++) { const Z0 = -40, Z1 = 44, n = 80, P = [], U = [], I = [];
    for (let i = 0; i <= n; i++) { const z = Z0 + (Z1 - Z0) * i / n; P.push(0, 0, z, 0, 0, z); U.push(i / n * 14, 0, i / n * 14, 1); if (i < n) { const a = i * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals();
    const m = new THREE.MeshBasicMaterial({ map: foamTex, transparent: true, depthWrite: false, opacity: .9, side: THREE.DoubleSide }); const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 3; mesh.frustumCulled = false; root.add(mesh); foams.push({ mesh, ph: k === 2 ? 1 : k * .5 }); }
  const placeFoam = (f, t) => { if (f.ph > .9) { const u = (t / 8 + .3) % 1, p = f.mesh.geometry.attributes.position; for (let i = 0; i < p.count / 2; i++) { const z = p.getZ(i * 2), x0 = shoreX(z) + 7 - u * 5 + .4 * Math.sin(z * .4 + t * .2); p.setXYZ(i * 2, x0, .035, z); p.setXYZ(i * 2 + 1, x0 + .7 + u, .035, z); } p.needsUpdate = true; f.mesh.material.opacity = .45 * Math.sin(u * Math.PI); return; }   // 沖で砕ける波の白い線
    const u = ((t / 8 + f.ph) % 1), run = Math.sin(u * Math.PI);   // 0→1→0：寄せて、返す
    const p = f.mesh.geometry.attributes.position; for (let i = 0; i < p.count / 2; i++) { const z = p.getZ(i * 2), sx = shoreX(z), front = sx - .3 - run * 2.4 + .25 * Math.sin(z * .7 + t * .3), back = front + 1.1 + run * .6; p.setXYZ(i * 2, front, .03 + run * .02, z); p.setXYZ(i * 2 + 1, back, .03, z); }
    p.needsUpdate = true; f.mesh.material.opacity = .25 + .65 * Math.min(1, run * 1.6) * (u < .5 ? 1 : 1 - (u - .5) * 1.2); };
  // ---------------------------------------------------------------- 磯の岩（森の岩と同じ写真の質感）
  const rocks = [];
  { const rockM = M(0xb9b3a8, { vc: true, std: true, map: tx("rock_surface.webp", 2, 2), nmap: tx("rock_surface_n.webp", 2, 2, false), ns: 1.2, rough: .85, env: .5, uv: .1, temp: .35, echo: .95 });
    const wetM = M(0xa59d92, { std: true, map: tx("rock_surface.webp", 2, 2), nmap: tx("rock_surface_n.webp", 2, 2, false), ns: 1.2, vc: true, rough: .22, env: 1.1, uv: .06, temp: .15, echo: .95 });   // 波をかぶる岩は濡れて暗く、艶がある
    const gs = [], ws = [];
    for (let i = 0; i < (mobile ? 14 : 24); i++) { const a = R() * TAU, r = Math.pow(R(), .7) * ROCKS.r, x = ROCKS.x + Math.cos(a) * r * 1.3, z = ROCKS.z + Math.sin(a) * r, s = .5 + R() * 1.4 * (1 - r / ROCKS.r * .6);
      const g = mergeVertices(new THREE.IcosahedronGeometry(1, 3)), p = g.attributes.position, v = new THREE.Vector3(), ph = R() * 9;
      for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); const n = 1 + .22 * Math.sin(v.x * 3 + ph) * Math.cos(v.z * 2.6 + ph * .7) + .1 * Math.sin(v.y * 7 + v.x * 5); v.multiplyScalar(n); v.y = v.y * .55; p.setXYZ(k, v.x, v.y, v.z); }
      g.computeVertexNormals(); g.scale(s * 1.2, s, s); g.rotateY(R() * TAU); g.translate(x, s * .18, z);
      { const q = g.attributes.position, cc = []; for (let k = 0; k < q.count; k++) { const wy = q.getY(k), wet = Math.max(0, Math.min(1, (.45 - wy) / .35)), l = 1 - wet * .45; cc.push(l * (1 - wet * .08), l, l * (1 - wet * .05)); } g.setAttribute("color", new THREE.Float32BufferAttribute(cc, 3)); }
      (x > shoreX(z) - .3 ? ws : gs).push(g); rocks.push([x, z, s * 1.1]); }   // 下ほど濡れて暗い（波のかかる高さ）
    if (gs.length) { const m = new THREE.Mesh(mergeGeometries(gs), rockM); m.castShadow = m.receiveShadow = true; root.add(m); sonic.push(m); }
    if (ws.length) { const m = new THREE.Mesh(mergeGeometries(ws), wetM); m.castShadow = m.receiveShadow = true; root.add(m); sonic.push(m); } }
  // ---------------------------------------------------------------- 岩のすその海藻・浜の漂着物（流木・貝殻）・足あと
  { const weedT = canvasTex(64, 128, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 9; i++) { const x0 = 6 + Math.random() * (w - 12); g.strokeStyle = `rgba(${60 + Math.random() * 30},${70 + Math.random() * 30},${25 + Math.random() * 15},.95)`; g.lineWidth = 3 + Math.random() * 4; g.beginPath(); g.moveTo(x0, h); g.bezierCurveTo(x0 + (Math.random() - .5) * 30, h * .6, x0 + (Math.random() - .5) * 30, h * .3, x0 + (Math.random() - .5) * 24, h * (.05 + Math.random() * .3)); g.stroke(); } });
    const wm = M(0xffffff, { std: true, map: weedT, alphaTest: .4, side: THREE.DoubleSide, rough: .3, env: .8, uv: .04, temp: .1, echo: .5 }), wg = new THREE.PlaneGeometry(.35, .3); wg.translate(0, .15, 0);
    const n = mobile ? 60 : 140, im = new THREE.InstancedMesh(wg, wm, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let k = 0;
    for (let i = 0; i < 4000 && k < n; i++) { const [rx, rz, rs] = rocks[i % rocks.length], a = R() * TAU, x = rx + Math.cos(a) * rs * 1.15, z = rz + Math.sin(a) * rs * 1.0; if (x < shoreX(z) - 1.2) continue;   // 波打ち際より海側の岩のすそだけ
      e.set((R() - .5) * .5, R() * TAU, (R() - .5) * .5); q.setFromEuler(e); const sc = .6 + R() * .9; m4.compose(new THREE.Vector3(x, -.02, z), q, new THREE.Vector3(sc, sc, sc)); im.setMatrixAt(k++, m4); }
    im.count = k; root.add(im); sonic.push(im);
    // 流木（白っぽく乾いた木。森の木と同じ樹皮の写真を、色を抜いて）
    const dw = M(0xd9d4ca, { std: true, map: tx("bark_zelkova.webp", 1, 2), nmap: tx("bark_zelkova_n.webp", 1, 2, false), ns: 1.4, rough: .95, env: .3, uv: .25, temp: .4, echo: .6 }), dg = [];
    for (const [x, z, L, r, ry] of [[40.5, -7, 3.2, .11, .5], [41.8, 12, 2.1, .08, 2.2], [39.6, 18, 1.4, .06, 1.1]]) { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-L / 2, r * .7, 0), new THREE.Vector3(-L / 6, r * .8, .12), new THREE.Vector3(L / 6, r * .75, -.08), new THREE.Vector3(L / 2, r * .6, .05)]);
      const g = new THREE.TubeGeometry(c, 16, r, 8, false); g.rotateY(ry); g.translate(x, 0, z); dg.push(g); }
    const dwm = new THREE.Mesh(mergeGeometries(dg), dw); dwm.castShadow = dwm.receiveShadow = true; root.add(dwm); sonic.push(dwm);
    // 貝殻（二枚貝の殻の片方。放射状のすじ。白・薄紅・灰）
    const shT = canvasTex(64, 64, (g, w, h) => { g.fillStyle = "#efe7dc"; g.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) { g.strokeStyle = "rgba(150,120,100,.45)"; g.lineWidth = 1.3; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(i / 15 * w, 0); g.stroke(); } });
    const sg = new THREE.SphereGeometry(.025, 10, 6, 0, TAU, 0, Math.PI / 2); sg.scale(1, .35, .85);
    const sm = M(0xffffff, { std: true, map: shT, rough: .45, env: .9, uv: .5, temp: .35, echo: .7 }), ns = mobile ? 30 : 60, sim = new THREE.InstancedMesh(sg, sm, ns), col = new THREE.Color(), C3 = [0xffffff, 0xf3d7cf, 0xc9c4bd, 0xe9dcc4];
    for (let i = 0; i < ns; i++) { const z = -30 + R() * 64, x = shoreX(z) - .4 - Math.pow(R(), 1.5) * 4.5; e.set(0, R() * TAU, 0); q.setFromEuler(e); const sc = .6 + R() * .9; m4.compose(new THREE.Vector3(x, .03 + Math.min(.1, (shoreX(z) - x) * .025), z), q, new THREE.Vector3(sc, sc, sc)); sim.setMatrixAt(i, m4); sim.setColorAt(i, col.set(C3[i % 4])); }
    sim.castShadow = true; root.add(sim);
    // 足あと（浜を歩いた人の跡。少しくぼんだ影）
    const fpT = canvasTex(32, 64, (g, w, h) => { g.clearRect(0, 0, w, h); const gr = g.createRadialGradient(w / 2, h * .35, 2, w / 2, h * .35, w * .48); gr.addColorStop(0, "rgba(70,55,40,.42)"); gr.addColorStop(1, "rgba(70,55,40,0)"); g.fillStyle = gr; g.beginPath(); g.ellipse(w / 2, h * .33, w * .42, h * .3, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(w / 2, h * .8, w * .3, h * .16, 0, 0, TAU); g.fill(); });
    const fg = new THREE.PlaneGeometry(.12, .27); fg.rotateX(-Math.PI / 2); const fm = new THREE.MeshBasicMaterial({ map: fpT, transparent: true, depthWrite: false, fog: true }), nf = 36, fim = new THREE.InstancedMesh(fg, fm, nf);
    for (let i = 0; i < nf; i++) { const z = 20 - i * .72, x = shoreX(z) - 3.2 + Math.sin(i * .25) * .6 + (i % 2 ? .13 : -.13), y = .03 + Math.min(.25, (shoreX(z) - x) * .025) + .006; e.set(0, Math.PI + Math.sin(i * .25) * .2, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)); fim.setMatrixAt(i, m4); }
    fim.renderOrder = 2; root.add(fim);
    // 浜の草（コウボウムギのような、海辺の砂地の草の株。林のはしに）
    const bg = new THREE.PlaneGeometry(.011, .42, 1, 3); bg.translate(0, .22, 0); { const p = bg.attributes.position; for (let i = 0; i < p.count; i++) { const t = p.getY(i) / .45; p.setZ(i, .08 * t * t); if (t > .99) p.setX(i, 0); } }
    const bm = M(0x8a9560, { side: THREE.DoubleSide, uv: .05, temp: .2, echo: .3, wind: .06, windH: .5 }), nb = mobile ? 900 : 1800, bim = new THREE.InstancedMesh(bg, bm, nb);
    for (let i = 0; i < nb; i++) { const cz = -28 + Math.floor(i / 30) * 1.1 + R() * .5, cl = edgeX(cz) + .2 + Math.pow(R(), 1.8) * 3.5, x = cl + (R() - .5) * .35, z = cz + (R() - .5) * .35; e.set((R() - .5) * .5, R() * TAU, (R() - .5) * .5); q.setFromEuler(e); const sc = .6 + R() * .8; m4.compose(new THREE.Vector3(x, .03 + Math.min(.25, (shoreX(z) - x) * .025), z), q, new THREE.Vector3(sc, sc, sc)); bim.setMatrixAt(i, m4); bim.setColorAt(i, col.setHSL(.14 + R() * .07, .3, .45 + R() * .15)); }
    root.add(bim);
  }
  // ---------------------------------------------------------------- ウミネコ（2 羽。沖の上をゆっくり旋回し、ときどき羽ばたく）
  const gulls = [];
  { const white = M(0xf4f4f0, { std: true, rough: .7, uv: .55, temp: .55, echo: .6 }), grey = M(0x6f747a, { std: true, rough: .7, uv: .2, temp: .5, echo: .6 }), black = M(0x16171a, { rough: .7, uv: .03, temp: .5 }), bill = M(0xe8c23a, { rough: .5, uv: .1, temp: .5 }), red = M(0xc0281e, { uv: .05, temp: .5 });
    const mk = () => { const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(.11, 14, 10), white); body.scale.set(1, .85, 2.3); g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.075, 12, 10), white); head.position.set(0, .05, -.27); g.add(head);
      const b1 = new THREE.Mesh(new THREE.ConeGeometry(.018, .09, 8), bill); b1.rotation.x = -Math.PI / 2; b1.position.set(0, .04, -.38); g.add(b1);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(.012, 6, 6), red); tip.position.set(0, .035, -.41); g.add(tip);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(.16, .015, .1), black); tail.position.set(0, .0, .27); g.add(tail);   // ウミネコの尾の黒い帯
      const wings = [];
      for (const sd of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(sd * .07, .03, -.02); g.add(piv);
        const inner = new THREE.Mesh(new THREE.BoxGeometry(.42, .015, .17), grey); inner.position.x = sd * .21; piv.add(inner);
        const outer = new THREE.Group(); outer.position.x = sd * .42; piv.add(outer);
        const o = new THREE.Mesh(new THREE.BoxGeometry(.36, .012, .13), grey); o.position.set(sd * .18, 0, .015); outer.add(o);
        const t = new THREE.Mesh(new THREE.BoxGeometry(.14, .013, .11), black); t.position.set(sd * .41, 0, .02); outer.add(t);   // 翼の先は黒
        wings.push({ piv, outer, sd }); }
      g.traverse(o => { if (o.isMesh) { o.castShadow = true; sonic.push(o); } }); root.add(g); return { g, wings }; };
    for (let i = 0; i < 3; i++) { const G = mk(); G.g.scale.setScalar(.6); gulls.push({ ...G, c: [60 + i * 8, -8 + i * 10], r: 10 + i * 4, h: 9 + i * 2.5, w: .1 + i * .025, ph: i * 2.1 }); } }   // 翼を広げて約 1.2 m（ウミネコ）。沖の高い所を滑る
  // ---------------------------------------------------------------- イソガニ（近づいたら組む）
  let crabs = null;
  const makeCrabs = () => { crabs = []; const shell = M(0x5a4a3e, { std: true, rough: .45, env: .7, uv: .05, temp: .3, echo: .8 }), legM = M(0x6c5646, { rough: .6, uv: .05, temp: .3 }), eyeM = M(0x111111, { rough: .3, uv: .03, temp: .3 });
    for (let i = 0; i < 5; i++) { const g = new THREE.Group(), S = .06;   // 甲幅 3 cm の 2 倍
      const cp = new THREE.Mesh(new THREE.SphereGeometry(S * .5, 14, 8, 0, TAU, 0, Math.PI / 2), shell); cp.scale.set(1.1, .45, .9); g.add(cp);   // 四角みのある甲
      for (const sd of [-1, 1]) {
        for (let k = 0; k < 4; k++) { const leg = new THREE.Group(); leg.position.set(sd * S * .48, .006, (k - 1.5) * S * .2); leg.rotation.y = sd * (k - 1.5) * .25; g.add(leg);   // 歩く脚 4 対
          const a = new THREE.Mesh(new THREE.CylinderGeometry(.0035, .004, S * .55, 5), legM); a.rotation.z = sd * 1.1; a.position.set(sd * S * .22, .01, 0); leg.add(a);
          const b = new THREE.Mesh(new THREE.CylinderGeometry(.0025, .0035, S * .5, 5), legM); b.rotation.z = -sd * .5; b.position.set(sd * S * .5, -.005, 0); leg.add(b); }
        const ch = new THREE.Group(); ch.position.set(sd * S * .38, .01, -S * .42); g.add(ch);   // はさみ 1 対
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(.005, .006, S * .35, 6), shell); arm.rotation.x = Math.PI / 2; arm.rotation.z = sd * .5; ch.add(arm);
        const claw = new THREE.Mesh(new THREE.SphereGeometry(S * .16, 8, 6), shell); claw.scale.set(.8, .6, 1.3); claw.position.set(sd * S * .06, 0, -S * .2); ch.add(claw);
        const eye = new THREE.Mesh(new THREE.CylinderGeometry(.002, .002, .012, 4), legM); eye.position.set(sd * S * .14, .018, -S * .38); g.add(eye);   // 目は柄の先
        const ball = new THREE.Mesh(new THREE.SphereGeometry(.0035, 6, 6), eyeM); ball.position.set(sd * S * .14, .025, -S * .38); g.add(ball); }
      const [x, z, s] = rocks[(i * 3) % rocks.length]; const a = R() * TAU; g.position.set(x + Math.cos(a) * (s + .15), .02, z + Math.sin(a) * (s + .15)); g.rotation.y = R() * TAU;
      g.traverse(o => { if (o.isMesh) { o.castShadow = true; sonic.push(o); } }); root.add(g); crabs.push({ g, x0: g.position.x, ph: R() * 9 }); } };
  // ---------------------------------------------------------------- 毎こま
  const out = {
    root, shoreX, rocks, gulls, get crabs() { return crabs; },
    edgeX, blocked(x, z, pad = .3) { if (x > shoreX(z) + .4) return true; for (const [rx, rz, rs] of rocks) if (Math.hypot(x - rx, z - rz) < rs * 1.1 + pad) return true; return false; },
    update(t, dt, cam) {
      for (const f of foams) placeFoam(f, t);
      UW.uSeaT.value = t; { const sc = root.parent?.parent; if (sc?.fog) UW.uHaze.value.copy(sc.fog.color).lerp(HZ, .3); }   // 地平は少し青みに寄せ、白く飛ばさない
      for (const G of gulls) { const a = G.ph + t * G.w; G.g.position.set(G.c[0] + Math.cos(a) * G.r, G.h + Math.sin(a * 1.7) * .6, G.c[1] + Math.sin(a) * G.r); G.g.rotation.set(0, -a + Math.PI, Math.sin(a) * .25 + .3);
        const flap = (Math.sin(t * .35 + G.ph) > .55) ? Math.sin(t * 9 + G.ph) * .55 : .06 * Math.sin(t * 1.3);   // ほとんどは翼を広げて滑り、ときどき羽ばたく
        for (const W of G.wings) { W.piv.rotation.z = W.sd * (flap + .12); W.outer.rotation.z = W.sd * (flap * .6 - .38); } }   // カモメの仲間の翼は、肘で上がり手先で下がる（M の字の形）。コウモリの細かな羽ばたきと見分けられる
      if (!crabs && cam && cam.x > 30) makeCrabs();
      if (crabs) for (const C of crabs) { const k = Math.sin(t * .4 + C.ph); C.g.position.x = C.x0 + (k > .7 ? (k - .7) * .5 : 0); }   // ときどき横に歩く
    },
  };
  return out;
}
