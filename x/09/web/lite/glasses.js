/* Qualia のグラス（mitsulab が three.js の基本形だけで組んだ 3D。外の模型は使っていない）
   層ごとにレンズの形と枠の色を変える：自然＝丸、歴史＝角、文化＝楕円、環世界＝六角（複眼の目のつくり）。
   色は tokens.css の層の色（--ml-l-nature・--ml-l-culture・--ml-l-people・--ml-l-info）。 */
import * as THREE from "three";

export const GLASSES = [
  { id: "nature", name: "自然のグラス", short: "自然", color: "#7fe0b4", lens: "round", lead: "木・土・水の手がかりが、風景に重なります。" },
  { id: "history", name: "歴史のグラス", short: "歴史", color: "#f2cf8c", lens: "square", lead: "記録に残る年と出来事が、その場所に重なります。" },
  { id: "culture", name: "文化のグラス", short: "文化", color: "#f4aa96", lens: "oval", lead: "祭り・暮らし・人の手が、道の上に重なります。" },
  { id: "umwelt", name: "環世界のグラス", short: "環世界", color: "#b4a2ff", lens: "hex", lead: "鳥・蝶・ミミズ・コウモリの手がかりが重なります。" },
];

function lensShape(kind, w, h) {
  const s = new THREE.Shape();
  if (kind === "round") { s.absellipse(0, 0, w * .5, w * .5, 0, Math.PI * 2, false, 0); }
  else if (kind === "oval") { s.absellipse(0, 0, w * .56, h * .5, 0, Math.PI * 2, false, 0); }
  else if (kind === "hex") { for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3, x = Math.cos(a) * w * .54, y = Math.sin(a) * w * .54; i ? s.lineTo(x, y) : s.moveTo(x, y); } s.closePath(); }
  else { const r = h * .16, x0 = -w * .5, y0 = -h * .5, x1 = w * .5, y1 = h * .5;
    s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r); s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1);
    s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0); }
  return s;
}
function ringFrom(shape, t) {   // レンズの形の外側に、太さ t の枠
  const pts = shape.getPoints(48), c = new THREE.Vector2();
  pts.forEach(p => c.add(p)); c.divideScalar(pts.length);
  const outer = new THREE.Shape(pts.map(p => p.clone().sub(c).multiplyScalar(1 + t / Math.max(.001, p.distanceTo(c))).add(c)));
  outer.holes.push(new THREE.Path(pts.slice().reverse()));
  return outer;
}

export function makeGlass(g, envMap = null) {
  const root = new THREE.Group(); root.name = "glass_" + g.id;
  const col = new THREE.Color(g.color);
  const frameM = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(.55), metalness: .85, roughness: .32, envMap, envMapIntensity: 1.1 });
  const lensM = new THREE.MeshStandardMaterial({ color: col.clone().lerp(new THREE.Color("#ffffff"), .35), metalness: .1, roughness: .04, transparent: true, opacity: .32, envMap, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false });
  const edgeM = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .9 });
  const w = .05, h = g.lens === "square" ? .034 : g.lens === "oval" ? .036 : .046, gap = .018, th = .0042;
  for (const side of [-1, 1]) {
    const sh = lensShape(g.lens, w, h);
    const lens = new THREE.Mesh(new THREE.ShapeGeometry(sh, 24), lensM); lens.position.x = side * (w * .5 + gap * .5); root.add(lens);
    const fr = new THREE.Mesh(new THREE.ExtrudeGeometry(ringFrom(sh, .0034), { depth: th, bevelEnabled: true, bevelThickness: .0008, bevelSize: .0006, bevelSegments: 1, curveSegments: 24 }), frameM);
    fr.position.set(lens.position.x, 0, -th * .5); root.add(fr);
    const edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(sh.getPoints(48).map(p => new THREE.Vector3(p.x, p.y, th * .6))), edgeM);
    edge.position.x = lens.position.x; root.add(edge);
    // つる（耳へかける棒）：枠の外から後ろへ
    const tg = new THREE.BoxGeometry(.0028, .0034, .1); tg.translate(0, 0, -.05);
    const temple = new THREE.Mesh(tg, frameM); temple.position.set(side * (w + gap * .5 + .002), h * .32, -th); temple.rotation.y = side * .06; root.add(temple);
  }
  // 鼻のつなぎ：ゆるい弧
  const br = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-gap * .5 - .002, h * .18, 0), new THREE.Vector3(0, h * .42, .004), new THREE.Vector3(gap * .5 + .002, h * .18, 0)), 12, .0016, 6, false), frameM);
  root.add(br);
  root.userData.mats = [frameM, lensM, edgeM];
  return root;
}

/* 道具の欄に出す絵：同じ描画の中で、小さな台の上のグラスを一枚ずつ写す（WebGL の場を増やさない） */
export function glassThumbs(renderer, envMap, size = [240, 150]) {
  const [W, H] = size, rt = new THREE.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
  const sc = new THREE.Scene(); sc.environment = envMap;
  const cam = new THREE.PerspectiveCamera(26, W / H, .01, 5); cam.position.set(.07, .05, .28); cam.lookAt(0, 0, 0);
  sc.add(new THREE.HemisphereLight("#dfe9ff", "#202634", 1.4)); const dl = new THREE.DirectionalLight("#ffffff", 2.2); dl.position.set(.3, .5, .6); sc.add(dl);
  const px = new Uint8Array(W * H * 4), cv = document.createElement("canvas"); cv.width = W; cv.height = H; const cx = cv.getContext("2d"), img = cx.createImageData(W, H);
  const out = {}, oldT = renderer.getRenderTarget(), oldC = new THREE.Color(), oldA = renderer.getClearAlpha(); renderer.getClearColor(oldC);
  for (const g of GLASSES) {
    const m = makeGlass(g, envMap); m.rotation.set(-.12, -.42, 0); sc.add(m);
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
    for (let y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    cx.putImageData(img, 0, 0); out[g.id] = cv.toDataURL("image/png");
    sc.remove(m); m.traverse(o => { o.geometry?.dispose(); });
  }
  renderer.setRenderTarget(oldT); renderer.setClearColor(oldC, oldA); rt.dispose();
  return out;
}
