/* デジタルの層（デジタルリアルの側）。v1・2026-10-12
   決まり＝世界観と見た目_v1 §5。HP の TOP の線の世界と同じ作法：
   - 形は「線」と「点」で描く。面は、ごく薄い半透明の板（不透明度 0.04〜0.08）に細い縁線だけ
   - 線は加算で重ね、霧に沈む（遠くの線は消える）。光のにじみ（ブルーム）は使わない
   - 線は「その場所の事実」にだけ引く：等高線は標高から、柱は観察記録の位置から。飾りの線・意味のない格子は引かない
   - 粒はゆっくり（秒速 0.05〜0.3 m）。ランダムにきらめかせない。粒の数は PC 1000／スマホ 420 まで（HP と同じ） */
import * as THREE from "three";

export const LAYER = { nature: 0x7fe0b4, water: 0x78d6ec, culture: 0xf2cf8c, people: 0xf4aa96, info: 0xb4a2ff, aoi: 0xa8f2f6, base: 0x5fb8d0 };

export const lineMaterial = (color = LAYER.aoi, opacity = .5) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: true, toneMapped: false });

let DOT = null;
const dotTex = () => { if (DOT) return DOT; const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.3, "rgba(255,255,255,.8)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return DOT = new THREE.CanvasTexture(c); };
export const pointMaterial = (color = LAYER.aoi, size = .06, opacity = .85) => new THREE.PointsMaterial({ color, size, map: dotTex(), sizeAttenuation: true, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: true });

const geo = arr => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3)); return g; };

// 等高線：高さの関数から、マーチングスクエアで線を引く（標高の事実を線にする。HP の等高線と同じ考え）
export function contours(heightAt, { x0 = -20, x1 = 20, z0 = -20, z1 = 20, cell = .5, step = .25, lift = .03, color = LAYER.base, opacity = .38 } = {}) {
  const nx = Math.ceil((x1 - x0) / cell), nz = Math.ceil((z1 - z0) / cell), H = new Float32Array((nx + 1) * (nz + 1));
  let lo = 1e9, hi = -1e9;
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const h = heightAt(x0 + i * cell, z0 + j * cell); H[j * (nx + 1) + i] = h; lo = Math.min(lo, h); hi = Math.max(hi, h); }
  const out = [], at = (i, j) => H[j * (nx + 1) + i];
  for (let lv = Math.ceil(lo / step) * step; lv <= hi; lv += step) for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const c = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)], P = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], hits = [];
    for (let e = 0; e < 4; e++) { const a = c[e], b = c[(e + 1) % 4]; if ((a < lv) !== (b < lv)) { const t = (lv - a) / (b - a), pa = P[e], pb = P[(e + 1) % 4]; hits.push([x0 + (pa[0] + (pb[0] - pa[0]) * t) * cell, z0 + (pa[1] + (pb[1] - pa[1]) * t) * cell]); } }
    for (let k = 0; k + 1 < hits.length; k += 2) out.push(hits[k][0], lv + lift, hits[k][1], hits[k + 1][0], lv + lift, hits[k + 1][1]);
  }
  return new THREE.LineSegments(geo(out), lineMaterial(color, opacity));
}

// 光の柱：記録のある場所（観察・測定）に立てる細い線と、上の点
export function pillars(points, { height = 3, color = LAYER.info, opacity = .7 } = {}) {
  const l = [], p = []; for (const [x, y, z] of points) { l.push(x, y, z, x, y + height, z); p.push(x, y + height, z); }
  const g = new THREE.Group(); g.add(new THREE.LineSegments(geo(l), lineMaterial(color, opacity)), new THREE.Points(geo(p), pointMaterial(color, .14, .95))); return g;
}

// 漂う粒：ゆっくり上る（または流れる）。update(dt) を毎こま呼ぶ
export function drift({ count = 400, box = [[-10, 0, -10], [10, 6, 10]], color = LAYER.aoi, size = .05, speed = [.05, .25], opacity = .6 } = {}) {
  const [a, b] = box, P = new Float32Array(count * 3), S = new Float32Array(count);
  for (let i = 0; i < count; i++) { for (let k = 0; k < 3; k++) P[3 * i + k] = a[k] + Math.random() * (b[k] - a[k]); S[i] = speed[0] + Math.random() * (speed[1] - speed[0]); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(P, 3));
  const pts = new THREE.Points(g, pointMaterial(color, size, opacity)); pts.frustumCulled = false;
  pts.userData.update = dt => { for (let i = 0; i < count; i++) { P[3 * i + 1] += S[i] * dt; if (P[3 * i + 1] > b[1]) P[3 * i + 1] = a[1]; } g.attributes.position.needsUpdate = true; };
  return pts;
}

// 半透明の面（層の一枚）：ごく薄い板＋縁の線＋四隅の印＋札。HP の使命の場面の板と同じ形
export function layerPlane({ w = 4, h = 2.4, color = LAYER.aoi, fill = .05, label = "", sub = "", font = '600 44px "Shippori Mincho","Hiragino Mincho ProN",serif' } = {}) {
  const g = new THREE.Group();
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: fill, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: true }));
  g.add(plane);
  const W = w / 2, H = h / 2, k = Math.min(w, h) * .08, edge = [-W, -H, 0, W, -H, 0, W, -H, 0, W, H, 0, W, H, 0, -W, H, 0, -W, H, 0, -W, -H, 0];
  g.add(new THREE.LineSegments(geo(edge), lineMaterial(color, .28)));
  const cr = []; for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = sx * W, y = sy * H; cr.push(x, y, 0, x - sx * k, y, 0, x, y, 0, x, y - sy * k, 0); }
  g.add(new THREE.LineSegments(geo(cr), lineMaterial(color, .9)));
  if (label) { const s = textSprite(label, { sub, font, color }); s.position.set(-W + s.scale.x / 2 + k * .6, H + s.scale.y * .55, 0); g.add(s); }
  return g;
}

// 札（3D の中の語）。明朝の字＋小さな英字。光らせない（縁のにじみなし）
export function textSprite(text, { sub = "", font = '600 44px "Shippori Mincho","Hiragino Mincho ProN",serif', color = LAYER.aoi, height = .32 } = {}) {
  const c = document.createElement("canvas"), x = c.getContext("2d"); x.font = font; const w1 = x.measureText(text).width;
  const subFont = 'italic 500 26px "Cormorant Garamond","Times New Roman",serif'; x.font = subFont; const w2 = sub ? x.measureText(sub.toUpperCase()).width + sub.length * 4 : 0;
  c.width = Math.ceil(Math.max(w1, w2) + 24); c.height = sub ? 96 : 64;
  x.font = font; x.fillStyle = "#eef5fb"; x.textBaseline = "top"; x.fillText(text, 12, 6);
  if (sub) { x.font = subFont; x.fillStyle = "#" + new THREE.Color(color).getHexString(); x.letterSpacing = "4px"; x.fillText(sub.toUpperCase(), 12, 60); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, fog: true }));
  s.scale.set(height * c.width / c.height, height, 1); return s;
}

// 碧のまわりの輪（HP の Qualium の五つの段の輪と同じ形：細い円と五つの点）
export function aoiRing({ r = .9, y = .02, color = LAYER.aoi, n = 5 } = {}) {
  const g = new THREE.Group(), ring = [];
  for (let k = 0; k < 72; k++) { const a = k / 72 * Math.PI * 2, b = (k + 1) / 72 * Math.PI * 2; ring.push(Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(b) * r, y, Math.sin(b) * r); }
  g.add(new THREE.LineSegments(geo(ring), lineMaterial(color, .35)));
  const p = []; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; p.push(Math.cos(a) * r, y, Math.sin(a) * r); }
  g.add(new THREE.Points(geo(p), pointMaterial(color, .07, 1))); return g;
}
