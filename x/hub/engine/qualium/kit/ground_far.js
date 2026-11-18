/* Qualium 共通：遠くの地面の材質（kit/ground_far.js・2026-10-27 夜 本人「遠くの地面が灰色の無地にならないように」）。
   地形の外の地面に、国土地理院のシームレス空中写真（z14・約 8 m/画素、出典は各アプリのクレジット）を貼る。作った模様は描かない（実在しない緑地を描かないため）。
   写真の外は写真の縁の色へなめらかに溶かし、霞に任せる。
   使い方：mesh.material = groundFarMat(THREE, { base: "#8d8a83", map: tex, rect: [x0, z0, x1, z1] })   rect＝写真の西・北・東・南の端をローカル座標（x 東・z 南）で */
export function groundFarMat(THREE, opt = {}) {
  const m = new THREE.MeshStandardMaterial({ color: opt.base || "#8d8a83", roughness: 1, metalness: 0, envMapIntensity: .3 });
  const U = { gfMap: { value: opt.map || null }, gfRect: { value: new THREE.Vector4(...(opt.rect || [0, 0, 1, 1])) }, gfOn: { value: opt.map ? 1 : 0 }, gfDim: { value: 0 }, gfHole: { value: new THREE.Vector4(...(opt.hole || [0, 0, 0, 0])) }, gfEdge: { value: opt.edge ?? .85 } };   /* hole＝内側の細かい地形の西・北・東・南。edge＝縁での沈め方（0〜1）。10-28 夜：内側と同じ明るさから 420 m かけて沈め、地図の縁の明るさの段をなくす */   /* gfDim：3D 地図のとき、地図の外の粗い写真を落ち着いた暗さへ沈め、細かい地図に目を集める */
  m.userData.gf = U;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vGf;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvGf=(modelMatrix*vec4(transformed,1.)).xz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vGf; uniform sampler2D gfMap; uniform vec4 gfRect; uniform float gfOn; uniform float gfDim; uniform vec4 gfHole; uniform float gfEdge; float gfN = 0., gfE = 0.;")
      .replace("#include <map_fragment>", `#include <map_fragment>
        if (gfOn > .5) {
          vec2 uv = (vGf - gfRect.xy) / (gfRect.zw - gfRect.xy);
          vec2 e = min(uv, 1. - uv); float inside = smoothstep(0., .18, min(e.x, e.y));
          vec3 ph = texture2D(gfMap, clamp(uv, .002, .998)).rgb; vec3 phB = texture2D(gfMap, clamp(uv, .002, .998), 7.).rgb;   // 写真の縁の外は、ぼかした写真の色へ溶かす（無地の灰の帯を作らない）
          float l = dot(ph, vec3(.333)); ph = mix(ph, vec3(l), .25) * vec3(.95, .95, .92);   // 写真の色を少し落ち着かせる
          diffuseColor.rgb = mix(mix(diffuseColor.rgb, phB * vec3(.9), .75), ph, inside);
        }
        { float l2 = dot(diffuseColor.rgb, vec3(.333)); vec2 hd = max(max(gfHole.xy - vGf, vGf - gfHole.zw), 0.); float hk = gfHole.z > gfHole.x ? mix(gfEdge, 1., smoothstep(0., 420., length(hd))) : 1.;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(l2) * vec3(.42, .46, .5), gfDim * .8 * hk);
          if (gfOn > .5 && gfHole.z > gfHole.x && gfDim > .01) {   // 10-28 夜 3：3D 地図のとき、地図の縁の外にも内側と同じ青みと細い線を薄く重ね、境目をなじませる。線は航空写真の明るさの境（実在の建物・道の輪郭）から取り、作った形は描かない
            vec2 uv2 = clamp((vGf - gfRect.xy) / (gfRect.zw - gfRect.xy), .002, .998); vec2 tx = 1. / vec2(textureSize(gfMap, 0));
            float lx = dot(texture2D(gfMap, uv2 + vec2(tx.x, 0.)).rgb - texture2D(gfMap, uv2 - vec2(tx.x, 0.)).rgb, vec3(.333));
            float lz = dot(texture2D(gfMap, uv2 + vec2(0., tx.y)).rgb - texture2D(gfMap, uv2 - vec2(0., tx.y)).rgb, vec3(.333));
            float edg = smoothstep(.13, .3, length(vec2(lx, lz))), nearH = 1. - smoothstep(60., 900., length(hd));
            gfN = gfDim * nearH; gfE = edg;   // 色は光と霞を当てたあとに重ねる（下の opaque_fragment の前）
          } }`).replace("#include <opaque_fragment>", `{ float lo = dot(outgoingLight, vec3(.333)); outgoingLight = mix(outgoingLight, vec3(.2, .27, .33) * (.5 + lo * .55), .85 * gfN) + vec3(.36, .66, .78) * gfE * .1 * gfN; }
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => "qualium-ground-far-photo6";
  return m;
}
