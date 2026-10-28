/* Qualium 共通：遠くの地面の材質（kit/ground_far.js・2026-10-27 夜 本人「遠くの地面が灰色の無地にならないように」）。
   地形の外の地面に、国土地理院のシームレス空中写真（z14・約 8 m/画素、出典は各アプリのクレジット）を貼る。作った模様は描かない（実在しない緑地を描かないため）。
   写真の外は写真の縁の色へなめらかに溶かし、霞に任せる。
   使い方：mesh.material = groundFarMat(THREE, { base: "#8d8a83", map: tex, rect: [x0, z0, x1, z1] })   rect＝写真の西・北・東・南の端をローカル座標（x 東・z 南）で */
export function groundFarMat(THREE, opt = {}) {
  const m = new THREE.MeshStandardMaterial({ color: opt.base || "#8d8a83", roughness: 1, metalness: 0, envMapIntensity: .3 });
  const U = { gfMap: { value: opt.map || null }, gfRect: { value: new THREE.Vector4(...(opt.rect || [0, 0, 1, 1])) }, gfOn: { value: opt.map ? 1 : 0 }, gfDim: { value: 0 }, gfHole: { value: new THREE.Vector4(...(opt.hole || [0, 0, 0, 0])) } };   /* hole＝内側の細かい地形の西・北・東・南（10-28 夜：その縁から 350 m かけて沈める。縁で明るさが段になって見えていた） */   /* gfDim：3D 地図のとき、地図の外の粗い写真を落ち着いた暗さへ沈め、細かい地図に目を集める */
  m.userData.gf = U;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vGf;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvGf=(modelMatrix*vec4(transformed,1.)).xz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vGf; uniform sampler2D gfMap; uniform vec4 gfRect; uniform float gfOn; uniform float gfDim; uniform vec4 gfHole;")
      .replace("#include <map_fragment>", `#include <map_fragment>
        if (gfOn > .5) {
          vec2 uv = (vGf - gfRect.xy) / (gfRect.zw - gfRect.xy);
          vec2 e = min(uv, 1. - uv); float inside = smoothstep(0., .18, min(e.x, e.y));
          vec3 ph = texture2D(gfMap, clamp(uv, .002, .998)).rgb; vec3 phB = texture2D(gfMap, clamp(uv, .002, .998), 7.).rgb;   // 写真の縁の外は、ぼかした写真の色へ溶かす（無地の灰の帯を作らない）
          float l = dot(ph, vec3(.333)); ph = mix(ph, vec3(l), .25) * vec3(.95, .95, .92);   // 写真の色を少し落ち着かせる
          diffuseColor.rgb = mix(mix(diffuseColor.rgb, phB * vec3(.9), .75), ph, inside);
        }
        { float l2 = dot(diffuseColor.rgb, vec3(.333)); vec2 hd = max(max(gfHole.xy - vGf, vGf - gfHole.zw), 0.); float hk = gfHole.z > gfHole.x ? smoothstep(0., 350., length(hd)) : 1.;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(l2) * vec3(.42, .46, .5), gfDim * .8 * hk); }`);
  };
  m.customProgramCacheKey = () => "qualium-ground-far-photo3";
  return m;
}
