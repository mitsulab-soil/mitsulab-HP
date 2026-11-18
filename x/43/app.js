// Qualia/meaning ── M＝意味づけ。夕方の館の四つの間（高座・唄・館・群れ）。© mitsulab. All rights reserved.
import { createWorld } from "../hub/engine/engine.js?v=1";
import { ENM } from "./enmoku.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
const SEED = +new URL(location.href).searchParams.get("seed") || 0; let _sd = SEED; // 採点の写真のときだけ乱数を固定（ふだんは自然な揺らぎ）
const rnd = SEED ? () => { _sd = _sd + 0x6D2B79F5 | 0; let t = Math.imul(_sd ^ _sd >>> 15, 1 | _sd); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; } : Math.random;
const GL = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const LABEL = { title: "Qualia/meaning", def: "意味づけ", koza: "高座", uta: "唄", kan: "館", mure: "群れ",
  mv: "杜で歌う", live: "舞台で歌う", calm: "群れを見る", eye: "一体の目", rain: "雨を降らす" };
const MEDIA = { rakugo: "https://mitsulab-soil.github.io/aoi-shizen-rakugo/video/", song: "https://mitsulab.jp/x/08/" };
const W = await createWorld({ title: LABEL.title, def: { sym: "M", text: LABEL.def }, haze: "#8e98a8", vegetation: false, bound: { x: 7, z0: -60, z1: 12 } });
const { THREE, scene } = W, V = (x, y, z) => new THREE.Vector3(x, y, z);
const Z0 = { koza: 0, uta: -16, kan: -32, mure: -48 };
// 四つの間の地面を平らに（池の縁・館の床にこぶを出さない）
if (W.flattenGround) { W.flattenGround({ x: 0, z: Z0.koza - 2, r: 6, y: 0, edge: 3 }); W.flattenGround({ x: 0, z: Z0.uta - 5, r: 8, y: 0, edge: 4 }); W.flattenGround({ x: 0, z: Z0.kan - 3, r: 7, y: 0, edge: 3 }); W.flattenGround({ x: 0, z: Z0.mure - 7, r: 16, y: 0, edge: 10 }); }
const Z = { koza: 0, uta: -16, kan: -32, mure: -48 };
const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: .9 });
const add = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); scene.add(o); return o; };
// 夕方の光（霞はエンジンの色のまま。光だけ暖かく）
scene.add(new THREE.HemisphereLight(0xffd9b8, 0x3b3034, .5));
// 高座：板の台と、噺の映る面
// 高座：座敷（畳）・高座（緋毛氈）・座布団・見台・めくり（質感は Poly Haven CC0）
let kozaBuilt = false, drawMekuri = () => {};
function buildKoza() { if (kozaBuilt) return; kozaBuilt = true;
  const TLk = new THREE.TextureLoader(), tk = (n, r, c) => { const t = TLk.load("tex/" + n + ".webp"); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(r[0], r[1]); if (c) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const pk = (n, r, o = {}) => new THREE.MeshStandardMaterial({ map: tk(n + "_diff", r, 1), normalMap: tk(n + "_nor", r), roughnessMap: tk(n + "_rough", r), roughness: 1, ...o });
  const g = new THREE.Group(); scene.add(g); const z0 = Z.koza - 3, MX = W.mobile ? .8 : 1.95;
  const P = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
  const tat = pk("tatami_mat", [1, 1]); const ft = new THREE.PlaneGeometry(.9, 1.8);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { const m = P(ft, tat, -2.25 + i * .9, .012, z0 + 1.6 + j * 1.8); m.rotation.x = -Math.PI / 2; }
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: .6 });
  const hi = new THREE.MeshStandardMaterial({ color: 0x8e2a26, roughness: .95 }); // 緋毛氈の色
  P(new THREE.BoxGeometry(2.8, .5, 1.8), hi, 0, .25, z0);
  const top = P(new THREE.PlaneGeometry(1.8, .9), tat, 0, .505, z0); top.rotation.x = -Math.PI / 2; top.rotation.z = Math.PI / 2;
  const zab = P(new THREE.BoxGeometry(.6, .08, .64, 4, 1, 4), pk("velour_velvet", [1, 1], { color: 0x5a3e64 }), 0, .55, z0);
  { const p = zab.geometry.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k) / .3, z = p.getZ(k) / .32; if (p.getY(k) > 0) p.setY(k, .04 * (1 - .5 * (x * x + z * z) ** 2) + .005); } zab.geometry.computeVertexNormals(); }
  P(new THREE.BoxGeometry(.5, .2, .22), wood, 0, .6, z0 + .55); // 見台
  // めくり（演目の名を書いた紙を掛ける台）
  P(new THREE.BoxGeometry(.05, 1.1, .05), wood, MX - .2, .55, z0 + .6); P(new THREE.BoxGeometry(.05, 1.1, .05), wood, MX + .2, .55, z0 + .6); P(new THREE.BoxGeometry(.5, .05, .05), wood, MX, 1.1, z0 + .6);
  const mc = document.createElement("canvas"); mc.width = 256; mc.height = 640; const mt = new THREE.CanvasTexture(mc); mt.colorSpace = THREE.SRGBColorSpace;
  P(new THREE.PlaneGeometry(.36, .9), new THREE.MeshStandardMaterial({ map: mt, roughness: .95 }), MX, .62, z0 + .63);
  drawMekuri = t => { const c = mc.getContext("2d"); c.fillStyle = "#efe6d2"; c.fillRect(0, 0, 256, 640); c.fillStyle = "#1e1a18"; c.font = "bold 92px 'Hiragino Mincho ProN',serif"; c.textAlign = "center"; [...t].forEach((ch, i) => c.fillText(ch, 128, 120 + i * 104)); mt.needsUpdate = true; };
  drawMekuri("高座");
  // 背の壁と柱（館と同じ漆喰の色）
  P(new THREE.PlaneGeometry(6, 3.6), new THREE.MeshStandardMaterial({ color: 0xd8d0c2, roughness: .95 }), 0, 1.8, z0 - 1.2);
  for (const x of [-3, 3]) P(new THREE.BoxGeometry(.2, 3.6, .2), new THREE.MeshStandardMaterial({ color: 0x8a7258, roughness: .7 }), x, 1.8, z0 - 1.1);
  const l = new THREE.SpotLight(0xffe0b8, 10, 8, .7, .5, 2); l.position.set(0, 3.4, z0 + 2.2); l.target.position.set(0, .6, z0); g.add(l, l.target); }
let scr = null; // 高座の面（videoPlane）
let scr2 = null; // 唄の面（videoPlane）
let drawPage = () => {}, hallBuilt = false, curl = 0;
function buildHall() { if (hallBuilt) return; hallBuilt = true;
// 館：杉の床と柱・漆喰の壁・書架・紙の頁（質感は Poly Haven CC0・物理ベース）
const TL = new THREE.TextureLoader(), tx = (n, rep, srgb) => { const t = srgb ? new THREE.Texture() : TL.load("tex/" + n + ".webp"); if (srgb) { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const g = c.getContext("2d"); g.filter = "saturate(.42) brightness(.92)"; g.drawImage(im, 0, 0); t.image = c; t.needsUpdate = true; }; im.src = "tex/" + n + ".webp"; } t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const pbr = (n, rep, o = {}) => new THREE.MeshStandardMaterial({ map: tx(n + "_diff", rep, 1), normalMap: tx(n + "_nor", rep), roughnessMap: tx(n + "_rough", rep), roughness: 1, ...o });
const K = Z.kan - 3, hall = new THREE.Group(); scene.add(hall);
const put = (g, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.rotation.y = ry; hall.add(o); return o; };
const floor = put(new THREE.PlaneGeometry(9, 10), pbr("japanese_cedar_planks", [3, 3], { color: 0xa89c8e }), 0, .02, K); floor.rotation.x = -Math.PI / 2;
const wallM = pbr("clay_plaster", [3, 1.4], { color: 0xfff6ea, emissive: 0x4a4640 });
put(new THREE.PlaneGeometry(9, 4.2), wallM, 0, 2.1, K - 5);
put(new THREE.PlaneGeometry(10, 4.2), wallM, -4.5, 2.1, K, Math.PI / 2); put(new THREE.PlaneGeometry(10, 4.2), wallM, 4.5, 2.1, K, -Math.PI / 2);
const pilM = pbr("japanese_cedar_planks", [.3, 2], { color: 0xd8c4a8 }), pil = new THREE.BoxGeometry(.24, 4.2, .24);
for (const x of [-4.4, -1.5, 1.5, 4.4]) for (const z of [K - 4.9, K + 4.6]) put(pil, pilM, x, 2.1, z);
put(new THREE.BoxGeometry(9, .22, .26), pilM, 0, 4.1, K - 4.9); // 長押
// 手前の面（中央を戸口にあける）と屋根
put(new THREE.PlaneGeometry(3, 4.2), wallM, -3, 2.1, K + 4.75, Math.PI); put(new THREE.PlaneGeometry(3, 4.2), wallM, 3, 2.1, K + 4.75, Math.PI);
put(new THREE.PlaneGeometry(3, 1.2), wallM, 0, 3.6, K + 4.75, Math.PI);
put(new THREE.BoxGeometry(9, .22, .26), pilM, 0, 4.1, K + 4.6); put(new THREE.BoxGeometry(.24, 3, .24), pilM, -1.5, 1.5, K + 4.75); put(new THREE.BoxGeometry(.24, 3, .24), pilM, 1.5, 1.5, K + 4.75);
const ceil = put(new THREE.PlaneGeometry(9, 10), pbr("japanese_cedar_planks", [3, 3], { color: 0xc9b496, emissive: 0x2e2822 }), 0, 4.2, K); ceil.rotation.x = Math.PI / 2;
const roofM = pbr("dark_wood", [4, 2], { color: 0x6a6460 });
for (const sd of [-1, 1]) { const r = put(new THREE.BoxGeometry(10.4, .12, 6.4), roofM, sd * 2.6, 5.1, K); r.rotation.z = sd * -.42; }
const shM = pbr("dark_wood", [1, 1]), books = []; 
for (const sx of [-3, 0, 3]) { const sh = new THREE.Group(); sh.position.set(sx, 0, K - 4.7); hall.add(sh);
  { const bb = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, .05), shM); bb.position.set(0, 1.3, -.2); sh.add(bb); }
  for (const y of [.05, .7, 1.35, 2, 2.6]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, .05, .45), shM); b.position.set(0, y, 0); sh.add(b); }
  for (const x of [-1.2, 1.2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.05, 2.6, .45), shM); b.position.set(x, 1.3, 0); sh.add(b); }
  for (const y of [.08, .73, 1.38, 2.03]) { let x = -1.15; while (x < 1.1) { const w = .03 + rnd() * .05, h = .42 + rnd() * .16; books.push([sx + x + w / 2, y + h / 2, K - 4.7 - .02, w, h]); x += w + .004; } } }
const bk = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, .32), new THREE.MeshStandardMaterial({ roughness: .8 }), books.length), bo = new THREE.Object3D(), bc = new THREE.Color();
const tones = [0x6b3a2e, 0x2f4a3c, 0x384560, 0x8a6a3a, 0x5a4a44, 0xc8b89a];
books.forEach((b, i) => { bo.position.set(b[0], b[1], b[2]); bo.scale.set(b[3], b[4], 1); bo.updateMatrix(); bk.setMatrixAt(i, bo.matrix); bk.setColorAt(i, bc.setHex(tones[i % 6]).multiplyScalar(.7 + rnd() * .4)); }); hall.add(bk);
// 見台と、ひらいた本（紙の頁は canvas に描く）
put(new THREE.BoxGeometry(.7, 1, .5), shM, 0, .5, K - 1.2);
const pc = document.createElement("canvas"); pc.width = 1024; pc.height = 640; const pg2 = pc.getContext("2d"), ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace; ptex.anisotropy = 8;
drawPage = function (h, lines) { curl = 1; const g = pg2; g.fillStyle = "#efe6d2"; g.fillRect(0, 0, 1024, 640); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(120,100,70,${rnd() * .05})`; g.fillRect(rnd() * 1024, rnd() * 640, 2, 2); }
  const sh = g.createLinearGradient(452, 0, 572, 0); sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(.5, "rgba(60,40,20,.25)"); sh.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = sh; g.fillRect(452, 0, 120, 640);
  g.fillStyle = "#2a2420"; g.font = "bold 44px 'Hiragino Mincho ProN',serif"; g.fillText(h || "", 60, 90); g.font = "26px 'Hiragino Mincho ProN',serif";
  let y = 150; const col = (t, x0) => { for (const line of t.match(/.{1,15}/g) || []) { if (y > 600) { if (x0 < 500) { y = 90; x0 = 572; } else return; } g.fillText(line, x0, y); y += 40; } return x0; };
  let x = 60; for (const l of lines || []) x = col(l, x) || x; ptex.needsUpdate = true; };
drawPage("つち百景", ["左に絵、右に文。押すと、碧が読みます。"]);
const pageG = new THREE.PlaneGeometry(1.1, .69, 8, 1); const pp = pageG.attributes.position; for (let i = 0; i < pp.count; i++) pp.setZ(i, .05 * Math.sin(Math.abs(pp.getX(i)) / .55 * Math.PI / 2)); pageG.computeVertexNormals();
const page3 = put(pageG, new THREE.MeshStandardMaterial({ map: ptex, roughness: .95, side: THREE.DoubleSide }), 0, 1.3, K - 1.05); page3.rotation.x = -.85; if (W.mobile) page3.scale.setScalar(.8);
const lamp = new THREE.SpotLight(0xffd2a0, 8, 7, .6, .6, 2); W.on("frame", ({ t }) => { if (modeNow !== "kan") return; lamp.intensity = 8 + Math.sin(t * 1.7) * .25 + Math.sin(t * 4.3) * .12; if (curl > 0) { curl = Math.max(0, curl - .04); page3.rotation.x = -.85 + Math.sin(curl * Math.PI) * .12; } }); lamp.position.set(0, 3.9, K - 1); lamp.target.position.set(0, 1, K - 1.2); hall.add(lamp, lamp.target);
}
// 群れ：水際と群れ（Reynolds 1987 の三つの決まり）。選んだときに作る
let water = null, birds = null, rain = null, steam = null, steamP = [], sitM = [], flyM = [], treesM = [], dry = 0, B = [], ride = false, wet = 0;
const lead = new THREE.Object3D(); scene.add(lead);
const m4 = new THREE.Object3D(), ctr = V(W.mobile ? -.9 : 0, W.mobile ? 3.0 : 3.1, Z.mure - (W.mobile ? 8 : 2.5)), N = 18; const ctrEye = V(W.mobile ? -.3 : 0, 6.5, Z.mure - 8);
function pondShore() { const t = new THREE.TextureLoader().load("../hub/engine/tex/soil_forest.webp"); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 8); return new THREE.MeshStandardMaterial({ map: t, color: 0x9a8a78, roughness: .95 }); }
function buildMure() { if (birds) return; birds = true;
  water = add(new THREE.PlaneGeometry(14, 9), new THREE.MeshPhysicalMaterial({ color: 0x506e82, roughness: .12, metalness: 0, clearcoat: 1, clearcoatRoughness: .1 }), 0, .04, Z.mure - 7); water.rotation.x = -Math.PI / 2;
  { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); const im = g.createImageData(256, 256); for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const a = Math.sin(x * .15 + Math.sin(y * .07) * 2) * .5 + Math.sin(y * .21 + x * .03) * .5, k = (y * 256 + x) * 4; im.data[k] = 128 + a * 40; im.data[k + 1] = 128 + Math.cos(y * .19 + x * .05) * 40; im.data[k + 2] = 255; im.data[k + 3] = 255; } g.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 4); water.material.normalMap = t; water.material.normalScale.set(.35, .35); water.material.needsUpdate = true; W.on("frame", ({ dt }) => { t.offset.x += dt * .01; t.offset.y += dt * .006; }); }
  const shore = add(new THREE.RingGeometry(4.6, 6.2, 64), pondShore(), 0, .03, Z.mure - 7); shore.rotation.x = -Math.PI / 2; shore.scale.set(1.5, 1, 1);
  B = [...Array(N)].map((_, i) => { const a = (i / N) * Math.PI * 2 + rnd() * .3, r = 5.1 + rnd() * .9; const h = V(Math.cos(a) * r * 1.5 + (rnd() - .5) * .6, .02, Z.mure - 7 + Math.sin(a) * r); return { home: h, perch: h.clone(), p: h.clone(), v: V(0, 0, 0), yaw: rnd() * 6.3, ph: rnd() * 9, k: .7 + rnd() * .6 }; });
  sitM = []; GL.load("models/suzume.glb", g => { g.scene.traverse(o => { if (o.isMesh && /suzume/i.test(o.name + (o.parent && o.parent.name))) { const im = new THREE.InstancedMesh(o.geometry, o.material, N); im.frustumCulled = false; scene.add(im); sitM.push(im); } }); });
  // 飛ぶ形：mitsulab が手続きで作った模式（体と、羽ばたく左右の翼）
  const brown = new THREE.MeshStandardMaterial({ color: 0x8a6446, roughness: .9 }), wingM = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: .9, side: THREE.DoubleSide }), headM = new THREE.MeshStandardMaterial({ color: 0x7a4a2e, roughness: .9 }), dark = new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: .9, side: THREE.DoubleSide });
  const body = new THREE.SphereGeometry(.05, 14, 10); { const p = body.attributes.position; for (let k = 0; k < p.count; k++) { const z = p.getZ(k); if (z < 0) { const f = 1 + z * 6; p.setX(k, p.getX(k) * Math.max(.55, f)); p.setY(k, p.getY(k) * Math.max(.6, f)); } } body.computeVertexNormals(); } body.scale(.9, .8, 1.45); // 丸みのある紡錘形（スズメの体長およそ 14 cm を模式に）
  const head = new THREE.SphereGeometry(.032, 12, 8); head.translate(0, .006, .072);
  const beak = new THREE.ConeGeometry(.011, .03, 6); beak.rotateX(Math.PI / 2); beak.translate(0, .002, .112); // 前向きの短いくちばし
  const cheek = new THREE.SphereGeometry(.013, 8, 6); cheek.scale(.5, 1, 1); const ck = cheek.clone(); cheek.translate(.026, 0, .074); ck.translate(-.026, 0, .074); // スズメの白い頬（模式）
  const cheekM = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: .9 });
  const ws = new THREE.Shape(); ws.moveTo(0, .042); ws.quadraticCurveTo(.06, .04, .13, .006); ws.quadraticCurveTo(.1, -.012, .06, -.03); ws.quadraticCurveTo(.03, -.045, 0, -.035); // 短く先の丸い翼
  const wing = new THREE.ExtrudeGeometry(ws, { depth: .006, bevelEnabled: true, bevelThickness: .003, bevelSize: .003, bevelSegments: 1, curveSegments: 6 }); wing.rotateX(-Math.PI / 2); wing.scale(1.35, 1, .7); wing.translate(.012, .01, 0);
  const tail = new THREE.BoxGeometry(.034, .006, .045); tail.translate(0, .006, -.088); // 平たく短い尾
  flyM = [[body, brown], [wing, wingM], [wing.clone().scale(-1, 1, 1), wingM], [head, headM], [tail, wingM], [beak, dark], [cheek, cheekM], [ck, cheekM]].map(([geo, mt]) => { const im = new THREE.InstancedMesh(geo, mt, N); im.frustumCulled = false; im.visible = false; scene.add(im); return im; });
  // 蒸散の線（太さのある細い帯。光の玉にはしない）
  const sgeo = new THREE.PlaneGeometry(.03, 1.1, 1, 12); { const p = sgeo.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setX(k, p.getX(k) * (1 - (y + .55) / 1.3) + Math.sin(y * 9) * .05); } }
  const SG = 110; steam = new THREE.InstancedMesh(sgeo, new THREE.MeshBasicMaterial({ color: 0xe2f4fb, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), SG); steam.frustumCulled = false; scene.add(steam);
  const tL = treesM.filter(t => t[0] < 0), tR = treesM.filter(t => t[0] > 0);
  steamP = [...Array(SG)].map((_, k) => { const side = k % 2 ? tL : tR, t = side[Math.floor(rnd() * side.length)] || treesM[0] || [6, Z.mure - 6]; return V(t[0] + (rnd() - .5) * 3, 4.2 + rnd() * 2.2, t[1] + (rnd() - .5) * 3); });
  const rg = new THREE.BufferGeometry(), rp = new Float32Array(900 * 3); for (let k = 0; k < 900; k++) { rp[k * 3] = rnd() * 14 - 7; rp[k * 3 + 1] = rnd() * 8; rp[k * 3 + 2] = Z.mure - 2 - rnd() * 12; }
  rg.setAttribute("position", new THREE.BufferAttribute(rp, 3)); rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xc8d0da, transparent: true, opacity: 0 })); scene.add(rain); }
// 杜と水際の木（種を確かめた並木の場所ではないので、名は出さない）
let stage = null, curtains = []; function buildStage() { if (stage) return; stage = new THREE.Group(); scene.add(stage);
  const TLs = new THREE.TextureLoader(), ts = (n, r, c) => { const t = TLs.load("tex/" + n + ".webp"); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(r[0], r[1]); if (c) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const ps = (n, r, o = {}) => new THREE.MeshStandardMaterial({ map: ts(n + "_diff", r, 1), normalMap: ts(n + "_nor", r), roughnessMap: ts(n + "_rough", r), roughness: 1, ...o });
  const floor = ps("japanese_cedar_planks", [2, 1], { color: 0xa89c8e }), wood = ps("dark_wood", [1, 2], { color: 0x9a8a80 }), z = Z.uta - 4.4;
  const top = new THREE.Mesh(new THREE.BoxGeometry(4.4, .45, 2.6), wood); top.position.set(0, .225, z + .6); stage.add(top);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 2.5), floor); fl.rotation.x = -Math.PI / 2; fl.position.set(0, .452, z + .6); stage.add(fl);
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.4, .2, .5), wood); step.position.set(0, .1, z + 2.1); stage.add(step);
  const back = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.2, .12), wood); back.position.set(0, 2, z - .7); stage.add(back);
  const curtM = ps("velour_velvet", [2, 3], { color: 0x5a2a30 });
  for (const sd of [-1, 1]) { const cg = new THREE.PlaneGeometry(.9, 3.5, 24, 1); const p = cg.attributes.position; for (let k = 0; k < p.count; k++) p.setZ(k, Math.sin(p.getX(k) * 22) * .06); cg.computeVertexNormals(); const c = new THREE.Mesh(cg, curtM); c.position.set(sd * 1.75, 2.2, z + 1.7); stage.add(c); curtains.push(c); }
  W.on("frame", ({ t }) => { if (modeNow !== "uta" || !stage.visible) return; curtains.forEach((c, k) => { c.rotation.y = Math.sin(t * .6 + k * 2) * .04; c.position.z = z + 1.7 + Math.sin(t * .9 + k) * .02; }); });
  for (const x of [-2.1, 2.1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.18, 3.6, .18), wood); p.position.set(x, 2.25, z + 1.8); stage.add(p); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(4.6, .2, .2), wood); beam.position.set(0, 4.05, z + 1.8); stage.add(beam);
  const sl = new THREE.SpotLight(0xffe2c0, 9, 9, .55, .5, 2); sl.position.set(0, 4, z + 3.5); sl.target.position.set(0, 1.5, z); stage.add(sl, sl.target); }
let vegDone = false; function plantVeg() { if (vegDone) return; vegDone = true; const tr = [], sh = [];
  for (let k = 0; k < 14; k++) { const sd = k % 2 ? 1 : -1; tr.push([sd * (4 + rnd() * 3), Z.uta - 2 - rnd() * 9]); }
  for (let k = 0; k < 6; k++) { const t = [(k % 2 ? 1 : -1) * (6 + rnd() * 3), Z.mure - 3 - rnd() * 9]; tr.push(t); treesM.push(t); }
  for (let k = 0; k < 24; k++) sh.push([(k % 2 ? 1 : -1) * (2.4 + rnd() * 4), Z.uta - rnd() * 10]);
  const mu = n => new URL("models/" + n, location.href).href;
  W.setVegetation([{ file: mu("tree_small_02.glb"), pts: tr, h: [5, 8] }, { file: mu("shrub_04.glb"), pts: sh.filter((_, k) => k % 3 === 0), h: [.8, 1.4] }, { file: "fern_02.glb", pts: sh, h: [.4, .8] }]).catch(() => {}); }
let modeNow = "", saidDry = false, st = "sit", inMure = 0; // sit（岸）→ fly → tree（雨で木へ）
W.on("mode", e => { modeNow = e.id; document.body.classList.toggle("capTop", e.id === "kan"); const sb = document.getElementById("qeSub"); requestAnimationFrame(() => document.body.classList.toggle("subMore", !!sb && sb.scrollWidth > sb.clientWidth + 4)); });
const takeOff = () => { if (st === "fly") return; st = "fly"; for (const b of B) b.v.set((rnd() - .5) * .8, 2 + rnd(), -1 - rnd()); W.say("一羽が飛ぶと、まわりもいっしょに飛び立つ。", 5000); };
const _a = V(), _c = V(), _s = V(), _t = V(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const setSit = () => { B.forEach((b, i) => { b.ph += .016; const hop = st === "sit" ? Math.max(0, Math.sin(b.ph * 3)) * .04 : 0; m4.position.set(b.p.x, b.p.y + hop, b.p.z); m4.rotation.set(0, b.yaw + Math.sin(b.ph * .7) * .3, 0); m4.scale.setScalar(.3); m4.updateMatrix(); for (const im of sitM) im.setMatrixAt(i, m4.matrix); }); for (const im of sitM) { im.instanceMatrix.needsUpdate = true; im.visible = true; } flyM.forEach(m => m.visible = false); };
const hideSteamTop = () => { if (!steam || !steam.visible) return; const m = new THREE.Matrix4(); steamP.forEach((p, k) => { m4.position.copy(p); m4.rotation.set(0, Math.atan2(W.camera.position.x - p.x, W.camera.position.z - p.z), 0); _t.copy(p).setY(p.y + .55).project(W.camera); m4.scale.setScalar(_t.y > .64 ? 0 : 1); m4.updateMatrix(); steam.setMatrixAt(k, m4.matrix); }); steam.instanceMatrix.needsUpdate = true; };
let warm = false; W.on("frame", ({ dt, t }) => { if (SEED && birds && modeNow === "mure") { if (warm) { hideSteamTop(); if (st !== "fly" && sitM.length) setSit(); return; } warm = true; try { for (let k = 0; k < 600; k++) mureFrame(1 / 60, k / 60); } catch (er) { console.error(er); } return; } try { mureFrame(dt, t); } catch (er) { if (!window.__e) { window.__e = String(er.stack); console.error(window.__e); } } });
function mureFrame(dt, t) { if (!birds || modeNow !== "mure") return; inMure += dt; if (st === "sit" && inMure > 4) takeOff();
  if (st === "sit") { B.forEach(b => b.p.copy(b.home)); setSit(); lead.position.copy(B[0].p); }
  else if (st === "tree") { let all = true; B.forEach(b => { _t.subVectors(b.perch, b.p); const L = _t.length(); if (L > .05) { all = false; b.p.addScaledVector(_t.normalize(), Math.min(L, dt * 5)); b.v.copy(_t).multiplyScalar(3); } }); if (all) setSit(); else drawFly(t); }
  else { for (const b of B) { _a.set(0, 0, 0); _c.set(0, 0, 0); _s.set(0, 0, 0); let n = 0;
      for (const o of B) { if (o === b) continue; const d = o.p.distanceToSquared(b.p); if (d < 9) { n++; _a.add(o.v); _c.add(o.p); if (d < 2.25) _s.add(_t.subVectors(b.p, o.p).divideScalar(d + .05)); } }
      if (n) { b.v.lerp(_a.divideScalar(n), .05); b.v.addScaledVector(_c.divideScalar(n).sub(b.p), .01); b.v.addScaledVector(_s, .05 * b.k); }
      _t.subVectors(ride ? ctrEye : ctr, b.p); b.v.addScaledVector(_t, _t.length() > (W.mobile ? 2.2 : 3) ? .08 : .006); b.v.clampLength(2 * b.k, 4 * b.k); b.v.y += Math.sin(t * 1.3 + b.ph) * .02; b.p.addScaledVector(b.v, dt); }
    drawFly(t); }
  lead.position.copy(B[0].p); lead.lookAt(_t.set(B[0].p.x - B[0].v.x, B[0].p.y - .25, B[0].p.z - B[0].v.z));
  wet = Math.max(0, wet - dt * .08); water.material.color.setRGB(.31 - wet * .08, .43 - wet * .05, .51 + wet * .1);
  if (wet > 0 && wet < .5) dry = Math.min(1, dry + dt * .6); else dry = Math.max(0, dry - dt * .12);
  steam.material.opacity = dry; steam.visible = dry > 0; if (dry > 0) { steamP.forEach((p, k) => { p.y += dt * .45; if (p.y > 7.4) p.y = 4.2; m4.position.copy(p); m4.rotation.set(0, Math.atan2(W.camera.position.x - p.x, W.camera.position.z - p.z), 0); _t.copy(p).setY(p.y + .55).project(W.camera); m4.scale.setScalar(_t.y > .64 ? 0 : 1); m4.updateMatrix(); steam.setMatrixAt(k, m4.matrix); }); steam.instanceMatrix.needsUpdate = true;
    if (dry > .95 && !saidDry) { saidDry = true; W.say("雨のあと、土の水は根から木を通って、葉から空へ戻っていく（蒸散。見えない水蒸気を線で描いた模式）。", 7000); } }
  rain.material.opacity = wet * .5; rain.visible = wet > 0; if (wet > 0) { const p = rain.geometry.attributes.position; for (let k = 0; k < p.count; k += 2) { let y = p.getY(k) - dt * 9; if (y < 0) y += 8; p.setY(k, y); p.setY(k + 1, y + .25); p.setX(k + 1, p.getX(k)); p.setZ(k + 1, p.getZ(k)); } p.needsUpdate = true; }
}
function drawFly(t) { for (const im of sitM) im.visible = false; flyM.forEach(m => m.visible = true);
  B.forEach((b, i) => { m4.position.copy(b.p); m4.lookAt(_t.copy(b.p).add(b.v)); m4.scale.setScalar(ride && b !== B[0] && b.p.distanceTo(W.camera.position) < 3 ? 0 : 1.6); m4.updateMatrix(); flyM[0].setMatrixAt(i, m4.matrix); flyM[3].setMatrixAt(i, m4.matrix); flyM[4].setMatrixAt(i, m4.matrix); flyM[5].setMatrixAt(i, m4.matrix); flyM[6].setMatrixAt(i, m4.matrix); flyM[7].setMatrixAt(i, m4.matrix);
    const f = Math.sin(t * 22 + b.ph) * .45 + .1; for (const [k, sg] of [[1, 1], [2, -1]]) { const w = m4.clone(); w.rotateZ(-sg * f); w.updateMatrix(); flyM[k].setMatrixAt(i, w.matrix); } });
  flyM.forEach(m => m.instanceMatrix.needsUpdate = true); }
// 間を移る：近ければ歩く（2 秒以内）、遠ければ霞で場面を移す（約 0.6 秒）
const veil = document.createElement("div"); veil.style.cssText = "position:fixed;inset:0;background:#8e98a8;opacity:0;pointer-events:none;transition:opacity .28s;z-index:5"; document.body.append(veil);
const moveTo = p => { const C = W.camera; if (C.position.distanceTo(p) < 5) { W.walkTo(p); return; }
  veil.style.opacity = 1; setTimeout(() => { C.position.copy(p); W.aoi.root.position.set(p.x + 1, 0, p.z - 2.4); W.walkTo(p); veil.style.opacity = 0; }, 300); };
const go = z => moveTo(V(0, 1.55, z + 4));
let curV = null;
const PL = new THREE.TextureLoader(), PT = {};
const getP = u => { if (!PT[u]) { const t = new THREE.Texture(); t.colorSpace = THREE.SRGBColorSpace; t.ready = false; const im = new Image(); im.onload = () => { t.image = im; t.needsUpdate = true; t.ready = true; (t.cb || []).forEach(f => f()); }; im.src = u; PT[u] = t; } return PT[u]; };
getP("poster/hachi_poster.webp"); // 最初の一席は幕の前に先読み
const play = (url, z, poster) => { stop(); const m = W.videoPlane(url, 3.2, 1.8, { autoplay: true }); m.position.set(0, 1.9, z); scene.add(m); curV = m; const v = m.userData.video;
  const vmap = m.material.map; m.visible = false; if (poster) { const t = getP(poster), put = () => { if (curV !== m || v.readyState >= 2 && v.currentTime > 0) return; m.material.map = t; m.material.needsUpdate = true; m.visible = true; }; if (t.ready) put(); else (t.cb = t.cb || []).push(put); }
  const show = () => { if (curV !== m) return; m.material.map = vmap; m.material.needsUpdate = true; m.visible = true; }; v.addEventListener("playing", show, { once: true }); v.addEventListener("seeked", show, { once: true }); v.addEventListener("error", () => { if (curV === m) { stop(); W.say("映像を読みこめませんでした。回線を確かめて、もう一度選んでください。", 6000); } }, { once: true }); W.unlockAudio && W.unlockAudio(); v.muted = false; v.play().catch(() => { v.muted = true; v.play().catch(() => {}); }); };
const stop = () => { if (!curV) return; const v = curV.userData.video; v.pause(); v.removeAttribute("src"); v.load(); scene.remove(curV); curV.geometry.dispose(); curV.material.map && curV.material.map.dispose(); curV.material.dispose(); curV = null; };
const vt = () => (W.mobile ? "v540" : "h720"), pst = e => "poster/" + e.slug + "_poster.webp";
const src = e => `<p>${e.fic}</p>` + e.src.map(s => `<p>${s[0]}<br>${s[1]}</p>`).join("") + (e.warn ? `<p>${e.warn}</p>` : "");
W.addMode({ id: "koza", label: LABEL.koza, name: "rakugo", icon: "ask",
  subs: ENM.map(e => ({ label: e.t, info: { title: e.t, body: e.lead + "<br>" + e.invite, src: src(e) } })),
  info: { title: "高座", body: "演目を選ぶと、その場で噺がはじまる。" },
  enter(w, sub, changed) { buildKoza(); if (W.mobile) moveTo(V(0, 1.55, Z.koza + 2.2)); else go(Z.koza); setTimeout(() => W.setAoi({ pos: W.mobile ? [-1.55, 0, Z.koza - 2.3] : [2.9, 0, Z.koza - 1.2], lookAt: [0, 1.4, Z.koza + 4] }), 650); const e = ENM[sub]; if (changed && !new URL(location.href).searchParams.has("s")) { w.say("高座。演目を選ぶと、噺がはじまるよ。"); setTimeout(() => { if (curV || modeNow !== "koza") return; play(MEDIA.rakugo + ENM[0].slug + "_" + vt() + ".mp4", Z.koza - 4.1, pst(ENM[0])); drawMekuri(ENM[0].t); if (curV) { curV.position.y = 2.2; if (W.mobile) curV.scale.setScalar(1.3); const v = curV.userData.video; v.muted = true; v.addEventListener("loadeddata", () => { v.currentTime = 6; v.pause(); }, { once: true }); } }, 900); return; } play(MEDIA.rakugo + e.slug + "_" + vt() + ".mp4", Z.koza - 4.1, pst(e)); drawMekuri(e.t); if (curV) { curV.position.y = 2.2; if (W.mobile) curV.scale.setScalar(1.3); } w.say(e.lead, 7000); }, exit() { stop(); W.follow(); } });
W.addMode({ id: "uta", label: LABEL.uta, name: "song", icon: "ear",
  subs: [{ label: LABEL.mv }, { label: LABEL.live }],
  info: { title: "《Breathing OS》", body: "碧がうたう、杜の息づかいの歌。1分45秒・音が出ます。息づかい＝湿った土と風のゆらぎのたとえ。", src: "楽曲：Suno（Pro Plan）／Hamza & Anderson 2005・Tyree & Zimmermann 2002・『神道事典』1994" },
  enter(w, sub) { plantVeg(); buildStage(); stage.visible = sub === 1; go(Z.uta); play(MEDIA.song + (sub ? "live" : "mv") + "_540.mp4", sub ? Z.uta - 4.5 : Z.uta - 4, (sub ? "poster/live.webp" : "poster/mv.webp")); if (sub && curV) curV.position.y = 2.2; w.say(sub ? "同じ歌を、舞台で。" : "同じ歌を、杜で。"); }, exit: stop });
let pages = null;
W.addMode({ id: "kan", label: LABEL.kan, name: "museum", icon: "book",
  subs: [{ label: "つち百景" }, { label: "蜂の本" }, { label: "蛾の本" }, { label: "歌の本" }],
  info: { title: "館", body: "書架の本をひらくと、碧が頁を読む。押すたびに次の頁。" },
  async enter(w, sub) { buildHall(); moveTo(V(-.35, 1.55, Z.kan - 3 - 1.2 + 1.35)); setTimeout(() => W.setAoi({ pos: [-1.15, 0, Z.kan - 3 - 2.6], lookAt: [-.35, 1.4, Z.kan - 3 + .15] }), 650); pages = pages || await (await fetch("data/museum-pages.json")).json().catch(() => ({}));
    const LINK = [null, { e: 0, to: ["koza", 0], go: "高座で「蜂の目」を聞く" }, { e: 2, to: ["koza", 2], go: "高座で「蛾の恋文」を聞く" }, { song: 1, to: ["uta", 0], go: "中庭の杜で歌を聴く" }];
    const L = LINK[sub || 0];
    if (L) { const e = L.e != null ? ENM[L.e] : null; const h = e ? e.t : "《Breathing OS》";
      const lines = e ? [e.lead, e.invite, "本を閉じて、" + L.go + "。"] : ["碧がうたう、杜の息づかいの歌。", "息づかいは、湿った土と風のゆらぎのたとえ。", "本を閉じて、" + L.go + "。"];
      drawPage(h, lines); w.sayLines(lines, { hint: "押して進む → " + L.go, done: () => W.setMode(L.to[0], L.to[1]) }); return; }
    const pg = (pages.tsuchi || []).filter(p => !(p.R && p.R.t === "toc")); let i = 0;
    const show = () => { const p = pg[i]; if (!p) return; drawPage(p.h, p.say); w.sayLines(p.say || [], { hint: p.h, done: () => { i = (i + 1) % pg.length; show(); } }); }; show();
  }, exit() { W.follow(); } });
W.addMode({ id: "mure", label: LABEL.mure, name: "swarm", icon: "eye",
  subs: [{ label: LABEL.calm }, { label: LABEL.eye }, { label: LABEL.rain }],
  info: { title: "群れ", body: "群れは三つの決まり（離れる・そろう・寄る）で動く模式。飛ぶ形は模式（体と翼だけ）。雨は土にしみ、木から空へ戻る（模式）。", src: "Reynolds 1987, Computer Graphics 21(4): 25–34／Horton 1933／Jasechko ほか 2013, Nature 496<br>とまっている 3D：\"スズメ Tree sparrow\" by Tit_birdy, CC BY 4.0／飛ぶ形：mitsulab が手続きで作った模式" },
  enter(w, sub) { plantVeg(); buildMure(); ride = sub === 1; if (ride) takeOff(); w.attachEye(ride ? lead : null, [0, 1.2, 4.5]); W.aoi.root.visible = !ride; W.camera.near = ride ? 1.2 : .03; W.camera.updateProjectionMatrix(); if (!ride) { go(Z.mure); setTimeout(() => { if (modeNow === "mure" && !ride) W.setAoi({ pos: [W.mobile ? 1.2 : 2.5, 0, Z.mure - .6], lookAt: [0, 1.4, Z.mure + 4] }); }, 700); }
    if (sub === 2) { wet = 1; saidDry = false; const near = treesM.slice().sort((a, b) => (b[1] - a[1])).slice(0, 2); B.forEach((b, i) => { const tt = i < 4 ? near[i % near.length] || [6, Z.mure - 6] : treesM[Math.floor(rnd() * treesM.length)] || [6, Z.mure - 6]; if (i < 4) b.perch.set(tt[0] - Math.sign(tt[0]) * (.5 + (i >> 1) * .6 + rnd() * .2) * (tt[0] > 0 ? 1.6 : 1), 2.2 + (i >> 1) * 1.2 + rnd() * .3, tt[1] + .3 + (i >> 1) * 1.2); else b.perch.set(tt[0] + (rnd() - .5) * 2.4, 2.6 + rnd() * 2.2, tt[1] + (rnd() - .5) * 2.4); });
      if (st === "sit") { B.forEach(b => b.v.set(0, 2, 0)); } st = "tree"; w.say("雨。スズメは木の中へ退いて、雨がやむのを待つ。雨は土にしみて、やがて木から空へ戻っていく（模式）。"); }
    else { if (sub === 0 && st === "tree") { st = "fly"; } w.say(ride ? "一羽のすぐ後ろから。近くの数羽に合わせて向きを変える（模式）。" : "岸にスズメの群れ。だれかが指図しているわけではないのに、飛ぶと向きがそろう。", ride ? 12000 : 6000); } },
  exit(w) { ride = false; w.attachEye(null); W.aoi.root.visible = true; W.follow(); W.camera.near = .03; W.camera.updateProjectionMatrix(); } });
const u = new URL(location.href).searchParams; W.setMode(u.get("m") || "koza", +(u.get("s") || 0));
if (!u.get("m")) setTimeout(() => W.say("同じ蜂や土でも、\n噺で聞くか、歌で聴くか、\n本で読むか、群れで見るかで、\n受けとる意味が変わる。\n四つの間で、くらべてみて。", 7000), 1200);
if (!u.get("m")) setTimeout(() => W.say("場所を選ばない道具。どこにいても、意味づけの型を持ち歩ける。", 6000), 8400);
