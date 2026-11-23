/* kit/surface.js ── 面の「むら」（2026-11-23 夜。共通の森・都市・浜の部品を磨く）
   同じ写真を敷きつめると、柄のくり返しが目立つ（敷石・砂・壁）。世界の位置から作るゆるいむら（値ノイズ）を重ねて、くり返しを消す。
   どの道具の材質（sight・hear・touch の M）にも、あとから足せる形（onBeforeCompile をつなぐ）。重さ：計算は数回の hash だけ。
   使い方：surface(m, "sand", (sh) => { sh.fragmentShader = sh.fragmentShader.replace(...) }) ── 断片の中で vKw（世界の位置）と kN_()・kF_() が使える。 */
const NOISE = `
float kH_(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float kN_(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(kH_(i), kH_(i + vec2(1.0, 0.0)), f.x), mix(kH_(i + vec2(0.0, 1.0)), kH_(i + 1.0), f.x), f.y); }
float kF_(vec2 p){ return kN_(p) * .55 + kN_(p * 2.03 + 7.1) * .3 + kN_(p * 4.1 + 3.7) * .15; }
`;
export function surface(m, key, fn) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vKw;")
      .replace("#include <fog_vertex>", "#include <fog_vertex>\n{ vec4 kw_ = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nkw_ = instanceMatrix * kw_;\n#endif\nvKw = (modelMatrix * kw_).xyz; }");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vKw;\n" + NOISE);
    fn(sh);
  };
  const ck = m.customProgramCacheKey.bind(m); m.customProgramCacheKey = () => ck() + "|s" + key;
  m.needsUpdate = true; return m;
}
// 敷きつめた地面（敷石・アスファルト・縁石）：大きなむら（日焼け・汚れ）と小さなむら
export const groundMura = (m, k = 1) => surface(m, "g" + k, sh => { sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
{ vec2 q_ = vKw.xz; diffuseColor.rgb *= mix(1.0, (.8 + .32 * kF_(q_ * .12)) * (.92 + .12 * kN_(q_ * 1.9 + 3.3)), ${k.toFixed(2)}); }`); });
// 建物の壁：足もとの汚れ・雨だれのすじ・面ごとの色むら（のっぺりした壁にしない）
export const wallMura = m => surface(m, "w", sh => { sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
{ float y_ = vKw.y; float s_ = vKw.x * .71 + vKw.z * .71;
  float streak_ = kN_(vec2(s_ * 2.6, y_ * .05));
  float patch_ = kF_(vec2(s_ * .06, y_ * .045) + vKw.xz * .01);
  float foot_ = smoothstep(0.0, 2.8, y_);
  diffuseColor.rgb *= (.78 + .22 * foot_) * (.9 + .15 * streak_) * (.84 + .26 * patch_); }`); });
