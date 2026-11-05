/* sight_trees.js ── Qualium の木を Qualia/sight・ひとつの木（keyaki.js）と同じ写実にそろえる共通部品（2026-11-05）
   葉：日を透かす（逆光で黄緑）・樹冠の外側は明るく内側は暗い陰。樹皮：灰褐色の色味と凹凸を強める。
   材質の shader に足すだけ（描画回数・頂点は増えない）。InstancedMesh でも普通の Mesh でも使える。
   使い方：import { sightLeaf, sightBark, setSightSun } from "../kit/sight_trees.js";
     sightLeaf(mat, { crownY: 木の高さ×.62, crownR: 樹冠の半径, k: .9 })  ※葉の形は原点＝根元・y 上
     sightBark(mat)   setSightSun(sun.position)（太陽が動いたら呼ぶ） */
import * as THREE from "three";

const SUN = { value: new THREE.Vector3(8, 14, 6).normalize() };
export function setSightSun(v) { SUN.value.copy(v).normalize(); }

export function sightLeaf(m, o = {}) {
  if (!m || m.userData.sightLeaf) return m; m.userData.sightLeaf = true;
  const cy = o.crownY ?? 10, cr = o.crownR ?? 6, k = o.k ?? .9, prev = m.onBeforeCompile;
  m.onBeforeCompile = function (sh, r) { prev?.call(this, sh, r);
    sh.uniforms.uStSun = SUN; sh.uniforms.uStC = { value: new THREE.Vector2(cy, cr) }; sh.uniforms.uStK = { value: k };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform vec2 uStC; varying vec3 vStW; varying vec3 vStC; varying float vStR;")
      .replace("#include <project_vertex>", `#include <project_vertex>
{ mat4 M_ = modelMatrix;
#ifdef USE_INSTANCING
  M_ = modelMatrix * instanceMatrix;
#endif
  vStW = (M_ * vec4(transformed, 1.)).xyz; vStC = (M_ * vec4(0., uStC.x, 0., 1.)).xyz; vStR = uStC.y * length(M_[0].xyz); }`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uStSun; uniform float uStK; varying vec3 vStW; varying vec3 vStC; varying float vStR;")
      .replace("#include <color_fragment>", `#include <color_fragment>
{ float rr_ = length((vStW - vStC) * vec3(1., 1.35, 1.)) / max(vStR, .1);
  diffuseColor.rgb *= mix(.5, 1.04, smoothstep(.3, .95, rr_)); }`)   /* 樹冠の内側の陰（空が抜けず、葉の重なりが奥へ沈む） */
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
{ vec3 V_ = normalize(cameraPosition - vStW); vec3 out_ = normalize(vStW - vStC + vec3(0., .25 * vStR, 0.));
  float back_ = pow(max(dot(-V_, uStSun), 0.), 3.);
  float side_ = .5 + .5 * dot(out_, uStSun);
  float rim_ = .35 + .65 * smoothstep(-.2, .8, dot(out_, V_));
  float day_ = smoothstep(-.05, .25, uStSun.y);
  totalEmissiveRadiance += diffuseColor.rgb * vec3(1.2, 1.3, .55) * uStK * day_ * (.22 * rim_ + .9 * back_ * side_); }`);   /* 葉を透かす光（keyaki.js と同じ式） */
  };
  const k0 = m.customProgramCacheKey; m.customProgramCacheKey = function () { return (k0 ? k0.call(this) : "") + "|stLeaf"; };
  m.needsUpdate = true; return m;
}

export function sightBark(m, o = {}) {
  if (!m || m.userData.sightBark) return m; m.userData.sightBark = true;
  const prev = m.onBeforeCompile, g = o.gray ?? .62, c = o.contrast ?? 1.22;
  if (m.normalMap && m.normalScale) m.normalScale.multiplyScalar(o.relief ?? 1.5);   /* 樹皮の凹凸 */
  m.onBeforeCompile = function (sh, r) { prev?.call(this, sh, r);
    sh.fragmentShader = sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
{ float l_ = dot(diffuseColor.rgb, vec3(.3, .55, .15)); vec3 c_ = mix(vec3(l_) * vec3(1.02, 1., .96), diffuseColor.rgb, ${g.toFixed(3)});
  diffuseColor.rgb = max(vec3(0.), (c_ - l_) * ${c.toFixed(3)} + l_ + (l_ - .3) * .45); }`); };   /* 灰褐色・肌理の明暗をはっきり（ひとつの木の欅と同じ向き） */
  const k0 = m.customProgramCacheKey; m.customProgramCacheKey = function () { return (k0 ? k0.call(this) : "") + "|stBark"; };
  m.needsUpdate = true; return m;
}
