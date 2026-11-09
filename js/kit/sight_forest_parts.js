/* sight_forest_parts.js ── Qualia/sight（x/02 forest.js・zen.js・umwelt.js）の樹冠の作り方を、HP で使える独立した部品に写したもの（2026-11-09）。
   sight 側のファイルは書き換えない。材質の shader に足すだけ（描画回数・頂点は増えない）。
   sightCrownNormal(m, k)：葉の房を、房のまん中から外へ向く丸い面として照らす（zen.js の crownHook と同じ考え。k＝0.72 が sight の値）。aCtr（房の中心）の属性が要る。
   sightWind(m, {amp, h})：風で枝先ほど揺れる（umwelt.js の WIND と同じ式）。setSightTime(t) を毎フレーム呼ぶ。 */
import * as THREE from "three";
export const SIGHT_TIME = { value: 0 };
export function setSightTime(t) { SIGHT_TIME.value = t; }
export function sightCrownNormal(m, k = .72) {
  if (!m || m.userData.sightCrown) return m; m.userData.sightCrown = true; const prev = m.onBeforeCompile;
  m.onBeforeCompile = function (sh, r) { prev?.call(this, sh, r);
    if (!/attribute vec3 aCtr/.test(sh.vertexShader)) sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec3 aCtr;");
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vScN;").replace("#include <project_vertex>", `#include <project_vertex>
{ mat4 M2_ = modelMatrix;
#ifdef USE_INSTANCING
  M2_ = modelMatrix * instanceMatrix;
#endif
  vec3 w_ = (M2_ * vec4(transformed, 1.)).xyz, c_ = (modelMatrix * vec4(aCtr, 1.)).xyz; vScN = normalize((viewMatrix * vec4(normalize(w_ - c_ + vec3(0., .25, 0.)), 0.)).xyz); }`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vScN;").replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>\nnormal = normalize(mix(normal, normalize(vScN), ${k.toFixed(3)}));`); };
  const k0 = m.customProgramCacheKey; m.customProgramCacheKey = function () { return (k0 ? k0.call(this) : "") + "|scN"; }; m.needsUpdate = true; return m;
}
export function sightWind(m, o = {}) {
  if (!m || m.userData.sightWind) return m; m.userData.sightWind = true; const prev = m.onBeforeCompile, amp = o.amp ?? .05, H = o.h ?? 9;
  m.onBeforeCompile = function (sh, r) { prev?.call(this, sh, r); sh.uniforms.uScT = SIGHT_TIME;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uScT;").replace("#include <project_vertex>", `#include <project_vertex>
{ vec4 p_ = vec4(transformed, 1.);
#ifdef USE_INSTANCING
  p_ = instanceMatrix * p_; vec3 ip_ = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.)).xyz;
#else
  vec3 ip_ = (modelMatrix * vec4(0., 0., 0., 1.)).xyz;
#endif
  vec4 wq_ = modelMatrix * p_; float ph_ = dot(ip_.xz, vec2(.37, .61)) + ip_.y * .2; float sw_ = ${amp.toFixed(3)} * clamp(wq_.y / ${H.toFixed(2)}, 0., 1.);
  float gust_ = .65 + .35 * sin(uScT * .23 + ip_.x * .05);
  wq_.x += sw_ * gust_ * (sin(uScT * 1.1 + ph_) * .6 + sin(uScT * 2.7 + ph_ * 1.7) * .22); wq_.z += sw_ * gust_ * cos(uScT * .9 + ph_ * 1.3) * .45;
  mvPosition = viewMatrix * wq_; gl_Position = projectionMatrix * mvPosition; }`); };
  const k0 = m.customProgramCacheKey; m.customProgramCacheKey = function () { return (k0 ? k0.call(this) : "") + "|scW"; }; m.needsUpdate = true; return m;
}
/* 草の葉：sight（x/02/nature.js の bladeGeo）と同じ作り＝葉の幅が先へ細り、中ほどがくぼみ（cup）、先が反る（curl）。
   一株＝葉 5 枚を根もとから扇に開いて一つの形にまとめる（平たい板の繰り返しにしない）。 */
export function sightBlade(len, wid, { cup = .2, curl = 0, seg = 6, shape = t => Math.sin(Math.PI * Math.pow(t, .65)) } = {}) {
  const g = new THREE.PlaneGeometry(1, 1, 2, seg), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), t = p.getY(i) + .5, w = wid * shape(t); p.setXYZ(i, x * w, t * len, cup * w * (4 * x * x) + curl * len * t * t); }
  g.computeVertexNormals(); return g;
}
export function sightTuft(mergeGeometries, n = 5) {
  const parts = [];
  for (let k = 0; k < n; k++) { const L = .2 + .14 * ((k * 37) % 7) / 7, g = sightBlade(L, .012 + .004 * (k % 2), { cup: .35, curl: .1 + .06 * (k % 3), seg: 5, shape: t => (t < .06 ? .5 + t * 8 : 1) * (1 - t * .8) });
    g.rotateX(-.12 - .1 * (k % 3)); g.rotateY(k / n * Math.PI * 2 + .3 * k);
    const p = g.attributes.position, cs = []; for (let i = 0; i < p.count; i++) { const c = .4 + .7 * Math.min(1, p.getY(i) / L); cs.push(c, c, c); } g.setAttribute("color", new THREE.Float32BufferAttribute(cs, 3)); g.deleteAttribute("uv"); parts.push(g); }
  return mergeGeometries(parts);
}
