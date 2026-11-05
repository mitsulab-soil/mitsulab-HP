/* 人と機械の認知可能領域（仮の名）── 2026-11-06 mitsulab
   同じ参道の一角を、左は人の受けとり方、右は機械の受けとり方で。白い縁を動かすと境が動く。
   触れると鳴る（人の声と機械の声）。なぞると、その場所の記述が書き換わり、線が旋律になる。「外から」で自分の受けとり方が見える。
   描き方：①色の描画（人）②種類・日の当たり・距離の描画（機械のための記述）③二つを縁で合わせる ④線・帯・輪を上に重ねる */
import * as THREE from "three";
import { rng, growTree, plantTrees, leafMaterial, barkMaterial, WIND, poisson } from "./kit/vegetation.js";
import { installDapple, makeSightGrass, SIGHT_AIR } from "./kit/sight_look.js";
import { sightLeaf, sightBark, setSightSun } from "./kit/sight_trees.js";
import { CH, BANDS, SAY, AI_LABELS, REFS, wlHz } from "./data.js";
import { Music, PHRASE, GRID } from "./audio.js";

installDapple(THREE);
const $ = s => document.querySelector(s);
const mobile = matchMedia("(pointer:coarse)").matches || innerWidth < 760;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const V3 = THREE.Vector3, TAU = Math.PI * 2;
const COL = { human: 0xf4aa96, machine: 0xa8f2f6, both: 0xf4f7fb, nature: 0x7fe0b4, info: 0xb4a2ff };

/* ── 描き手 ── */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
let dpr = Math.min(devicePixelRatio || 1, mobile ? 1 : 1.5);
renderer.setPixelRatio(1); $("#stage").appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.fog = new THREE.Fog(SIGHT_AIR.color, SIGHT_AIR.near, 135);
const cam = new THREE.PerspectiveCamera(mobile ? 64 : 50, 1, .1, 600);
const EYE = new V3(0, 1.55, 7.2), LOOK = new V3(.5, 1.3, -12), OUTP = new V3(2.4, 5.4, 18.5), OUTL = new V3(-1.2, 1.5, 1.5);
cam.position.copy(EYE); cam.lookAt(LOOK); cam.layers.enable(1); cam.layers.enable(2);
const U = { mach: { value: 0 }, sunV: { value: new V3() } };
const SUN = new V3(-.62, .52, .38).normalize(); setSightSun(SUN);
scene.add(new THREE.HemisphereLight(0xdce8ee, 0x5a5040, 1.0));
{ // 空の光（環境）：空の色から小さく作る
  const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene(), sm = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: {}, vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }", fragmentShader: "varying vec3 vP; void main(){ float t = vP.y; vec3 c = t > 0. ? mix(vec3(.78,.84,.86), vec3(.42,.58,.74), t) : mix(vec3(.5,.46,.38), vec3(.22,.2,.16), -t); gl_FragColor = vec4(c, 1.); }" });
  es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), sm)); scene.environment = pm.fromScene(es, 0, .1, 50).texture; pm.dispose(); }
const sun = new THREE.DirectionalLight(0xffe3bc, 3.3);   // 秋の午後三時ごろの、低めの暖かい日差し sun.position.copy(SUN).multiplyScalar(60); scene.add(sun);

// 機械のための記述：種類（R）・日の当たり（G）・距離（B）を書き出す。同じ材質で、uMach のときだけ出す色を変える
function mpatch(m, kind) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = function (sh, r) { prev?.call(this, sh, r); sh.uniforms.uMach = U.mach; sh.uniforms.uSunV = U.sunV;
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uMach; uniform vec3 uSunV;")
      .replace("#include <dithering_fragment>", `#include <dithering_fragment>
  if (uMach > .5) { vec3 wq = cameraPosition + transpose(mat3(viewMatrix)) * (-vViewPosition);
    vec2 p = wq.xz * 1.25; vec2 q = p + vec2(sin(p.y * .7), cos(p.x * .6)) * .8;
    float n = sin(q.x * 1.7) * sin(q.y * 1.9) + .55 * sin(q.x * 3.9 + q.y * 1.3) * sin(q.y * 3.3 - q.x * .8) + .3 * sin(q.x * 7.1 - 2.) * sin(q.y * 6.7 + 1.);
    vec2 pb = wq.xz * .42 + vec2(3.1, 1.7); float nb = sin(pb.x * 1.3 + sin(pb.y * .9)) * sin(pb.y * 1.5 - .7) + .4 * sin(pb.x * 2.9 - pb.y * 1.1);
    float lit = smoothstep(.3, .7, (n * .5 + .5) * .62 + (nb * .5 + .5) * .38);
    float up = smoothstep(.1, .7, dot(normalize(normal), normalize(mat3(viewMatrix) * vec3(0., 1., 0.))));
    float dap = mix(1., .1 + .95 * lit, up * (1. - smoothstep(45., 90., length(vViewPosition))) * (1. - smoothstep(2.5, 6., wq.y - cameraPosition.y)));
    gl_FragColor = vec4(${kind}. / 8., clamp(dot(normalize(normal), uSunV) * dap, 0., 1.), clamp(length(vViewPosition) / 120., 0., 1.), 1.); }`); };   // 種類・日の当たり（木もれ日の影を含む）・中心からの距離
  const k0 = m.customProgramCacheKey; m.customProgramCacheKey = function () { return (k0 ? k0.call(this) : "") + "|mach" + kind; };
  m.needsUpdate = true; return m;
}
const aoiId = new THREE.MeshBasicMaterial();
aoiId.onBeforeCompile = sh => { sh.vertexShader = "varying float vD;\n" + sh.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\n vD = length(mvPosition.xyz);");
  sh.fragmentShader = "varying float vD;\n" + sh.fragmentShader.replace("#include <dithering_fragment>", "#include <dithering_fragment>\n gl_FragColor = vec4(6. / 8., .55, clamp(vD / 120., 0., 1.), 1.);"); };

/* ── 写真の質感（CC0・Poly Haven／ambientCG。Qualia/sight と同じもの） ── */
const TL = new THREE.TextureLoader();
const tex = (f, srgb = true, rep = [1, 1]) => { const t = TL.load("tex/" + f + ".webp"); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 4; return t; };

/* ── 場所：参道の一角（欅・灯籠・砂利・下草） ── */
const R = rng(20261106);
{ // 土
  const g = new THREE.PlaneGeometry(320, 320, 1, 1); g.rotateX(-Math.PI / 2);
  const m = mpatch(new THREE.MeshStandardMaterial({ map: tex("soil_forest", true, [80, 80]), color: 0x9a8f7c, roughness: 1 }), 7);
  scene.add(new THREE.Mesh(g, m));
  // 砂利の参道（幅 4.2 m）
  const pg = new THREE.PlaneGeometry(4.2, 140, 1, 1); pg.rotateX(-Math.PI / 2); pg.translate(0, .012, -45);
  const pm = mpatch(new THREE.MeshStandardMaterial({ map: tex("path_gravel", true, [1.6, 54]), normalMap: tex("sand_grit_n", false, [3, 100]), normalScale: new THREE.Vector2(.8, .8), color: 0xd9d2c4, roughness: .98, polygonOffset: true, polygonOffsetFactor: -2 }), 1);
  scene.add(new THREE.Mesh(pg, pm));
}
// 空（地平の色＝霞の色）
{ const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { a: { value: new THREE.Color(SIGHT_AIR.color) }, b: { value: new THREE.Color(0x7fa6c2) } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
    fragmentShader: "uniform vec3 a, b; varying vec3 vP; void main(){ float t = smoothstep(.03, .6, vP.y); gl_FragColor = vec4(mix(a, b, t), 1.); }" });
  const s = new THREE.Mesh(new THREE.SphereGeometry(450, 24, 12), m); s.layers.set(1); s.renderOrder = -1; scene.add(s); }
// 欅
const TREES = [];
{
  const pts = poisson(R, { x0: -30, x1: 30, z0: -115, z1: 13, d: 5.6, ok: (x, z) => Math.abs(x) > 4.3 && !(z > 8 && Math.abs(x) < 8) });   // 外から見る位置の前はあける
  const far = [];
  for (const [x, z] of pts) { const d = Math.hypot(x - EYE.x, z - EYE.z); if (d < 2.5 || d > 70) continue;
    const sp = R() < .3 ? "konara" : "keyaki";   // 欅にコナラを混ぜる（同じ形を並べない）
    if (d < 30) TREES.push(growTree(sp, x, z, R, { det: d < 24, scale: .75 + R() * .5, q: mobile ? .6 : 1 })); else far.push([x, z, sp]); }
  const bark = mpatch(sightBark(barkMaterial(tex("bark_zelkova", true, [1, 1.6]), { normalMap: tex("bark_zelkova_n", false, [1, 1.6]), color: 0xb2ada6 }), { relief: 2.2, contrast: 1.25, gray: .38 }), 3);   // 樹皮の凹凸と肌理を強める
  const leaf = mpatch((leafMaterial((t => (t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping, t))(tex("leaf_spray")), { wind: .06 })), 4); leaf.envMapIntensity = .55; leaf.emissive = new THREE.Color(0x1a2410);
  const leaf2 = mpatch((leafMaterial((t => (t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping, t))(tex("leaf_spray2")), { wind: .07 })), 4); leaf2.envMapIntensity = .55; leaf2.emissive = new THREE.Color(0x1a2410);
  const LM = { default: leaf, konara: leaf2 };
  plantTrees(scene, TREES, { barkMat: { default: bark }, leafMats: LM, R });
  // 遠くの木は、最初の絵が出たあとに少しずつ植える（起動を待たせない）
  setTimeout(function more() { const R2 = rng(77 + far.length), part = far.splice(0, 12).map(([x, z, sp]) => growTree(sp, x, z, R2, { det: false, scale: .9 + R2() * .25, q: mobile ? .6 : 1 }));
    if (part.length) { TREES.push(...part); plantTrees(scene, part, { barkMat: { default: bark }, leafMats: LM, R: R2 }); }
    if (far.length) setTimeout(more, 60); }, 200);
}
// 灯籠（石。割り当てられた分類の名がない物の例）
const LANTERNS = [[-2.65, 1.2], [2.75, -9.5], [-2.65, -21]];
{ const parts = [];
  const add = (g, y) => { g.translate(0, y, 0); parts.push(g); };
  add(new THREE.BoxGeometry(.72, .24, .72), .12); add(new THREE.CylinderGeometry(.13, .16, 1.0, 10), .74);
  add(new THREE.BoxGeometry(.56, .12, .56), 1.30); add(new THREE.BoxGeometry(.4, .34, .4), 1.53);
  { const r = new THREE.ConeGeometry(.5, .3, 4); r.rotateY(Math.PI / 4); add(r, 1.85); } add(new THREE.SphereGeometry(.07, 8, 6), 2.05);
  const m = mpatch(new THREE.MeshStandardMaterial({ map: tex("rock_surface", true, [.8, .8]), normalMap: tex("rock_surface_n", false, [.8, .8]), color: 0xbab4a8, roughness: .95 }), 2);
  for (const [x, z] of LANTERNS) for (const g of parts) { const me = new THREE.Mesh(g, m); me.position.set(x, 0, z); scene.add(me); }
}
// 下草（sight と同じ細い葉）
const anchors = [];
for (let z = -46; z < 13; z += .55) for (const s of [-1, 1]) { const x = s * (2.35 + R() * 1.3); anchors.push(x, 0, z + R() * .4); }
for (const t of TREES) for (let i = 0; i < 4; i++) anchors.push(t.trunk[0] + (R() - .5) * 3, 0, t.trunk[1] + (R() - .5) * 3);
const grass = makeSightGrass(THREE, scene, { anchors, mobile, reduced }); mpatch(grass.mesh.material, 5);

/* ── 碧（3D）── */
let aoi = null; const AOI = mobile ? new V3(-.55, 0, 2.9) : new V3(-1.35, 0, 3.4);
setTimeout(async () => {
  try { const { loadAoi } = await import("./kit/aoi.js");
    aoi = await loadAoi("assets/aoi/aoi.vrm", { scene, renderer, camera: cam, reducedMotion: reduced });
    aoi.place(AOI.x, AOI.z, Math.atan2(EYE.x - AOI.x, EYE.z - AOI.z));
    const lay = () => aoi.root.traverse(o => o.layers.set(2)); lay(); setTimeout(lay, 1500);
  } catch (e) { console.warn("碧", e.message || e); }
}, 60);

/* ── 描き先と合わせ（人｜機械） ── */
const rtCol = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: mobile ? 0 : 2 });
const rtDat = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const post = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
  uniforms: { tCol: { value: rtCol.texture }, tDat: { value: rtDat.texture }, uRes: { value: new THREE.Vector2() }, uDRes: { value: new THREE.Vector2() }, uSeam: { value: mobile ? .58 : .64 }, uSeam2: { value: 1 },
    uCh: { value: 0 }, uT: { value: 0 }, uGust: { value: .5 }, uDpr: { value: 1 }, uInvProj: { value: new THREE.Matrix4() }, uCamW: { value: new THREE.Matrix4() },
    uSrc: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] }, uExp: { value: 1.08 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
  fragmentShader: /* glsl */`
uniform sampler2D tCol, tDat; uniform vec2 uRes, uDRes; uniform float uSeam, uSeam2, uCh, uT, uGust, uDpr, uExp; uniform mat4 uInvProj, uCamW; uniform vec4 uSrc[3]; varying vec2 vUv;
vec3 neutral(vec3 c){ float x = min(c.r, min(c.g, c.b)); float o = x < .08 ? x - 6.25 * x * x : .04; c -= o; float p = max(c.r, max(c.g, c.b)); if (p < .76) return c;
  float d = .24; float np = 1. - d * d / (p + d - .76); c *= np / p; float g = 1. - 1. / (.15 * (p - np) + 1.); return mix(c, vec3(np), g); }
vec3 srgb(vec3 c){ c = clamp(c, 0., 1.); return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
vec3 human(vec2 uv){ return srgb(neutral(texture2D(tCol, uv).rgb * uExp)); }
float lum(vec3 c){ return dot(c, vec3(.3, .59, .11)); }
float kOf(vec4 d){ return floor(d.r * 8. + .5); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 iron(float t){ t = clamp(t, 0., 1.); vec3 a = vec3(.02, .0, .07), b = vec3(.33, .03, .5), c = vec3(.82, .16, .27), d = vec3(.98, .58, .06), e = vec3(1., .96, .78);
  return t < .25 ? mix(a, b, t * 4.) : t < .5 ? mix(b, c, (t - .25) * 4.) : t < .75 ? mix(c, d, (t - .5) * 4.) : mix(d, e, (t - .75) * 4.); }
void main(){
  vec2 fc = vUv * uRes; float sx = uSeam * uRes.x; vec3 col;
  float sx2 = uSeam2 * uRes.x;
  if (fc.x >= sx2) {   // 鳥（模式）：紫外を含む四つの錐体。人に見えない紫外の明るさを青紫に写し、赤・緑・青を一段ずつ下へずらして見せる
    vec4 d = texture2D(tDat, vUv); float k = kOf(d); vec3 c = human(vUv);
    float uvr = k < .5 ? .85 - .3 * vUv.y : k == 4. ? .05 : k == 5. ? .06 : k == 3. ? .08 : k == 2. ? .14 : k == 1. ? .16 : k == 7. ? .1 : .2;
    col = c * vec3(.82, .92, .86) + vec3(.42, .3, .95) * uvr * 1.25;   // 色はそのまま少し沈め、紫外の明るさだけを青紫で重ねる
  } else if (fc.x < sx) col = human(vUv);
  else {
    int ch = int(uCh + .5); vec4 d = texture2D(tDat, vUv); float k = kOf(d); float sky = 1. - step(.5, k); float dist = d.b * 120.;
    if (ch == 0) {   // カメラ：縁の近くは一画素一色の原画（ベイヤー配列）、離れるほど色を埋めた画（デモザイク）。画素の拡大は模式
      float px = 3.5 * uDpr; vec2 cell = floor(fc / px); vec3 c = human((cell + .5) * px / uRes);
      vec2 sb = mod(cell, 2.); float id = sb.x + sb.y * 2.;
      vec3 raw = id < .5 ? vec3(c.r, 0., 0.) : id > 2.5 ? vec3(0., 0., c.b) : vec3(0., c.g, 0.);
      vec2 o1 = vec2(1.2 * uDpr / uRes.x, 0.); vec3 dm = vec3(human(vUv + o1).r, human(vUv).g, human(vUv - o1).b) * vec3(1.03, 1., .95) + (hash(fc + floor(uT * 30.)) - .5) * .03;   // 色を埋めた画：近くの画素から推して埋めるので、境にわずかな色のにじみ・雑音・色の違いが残る
      float nr = 1. - smoothstep(.04, .4, (fc.x - sx) / max(1., uRes.x - sx));
      vec2 f = fract(fc / px); float gl = step(1. / px, min(f.x, f.y));
      dm = floor(dm * 64. + .5) / 64.; dm = mix(vec3(lum(dm)), dm, 1.12) * vec3(1.02, 1., .97);   // 色を埋めた画にも、細かな画素の目と、わずかな色の違いが残る
      col = mix(dm * (.9 + .1 * gl), raw * 1.6 * (.8 + .2 * gl), nr);
    } else if (ch == 1) {   // 近赤外（可視を切るフィルター付き）：葉が明るく、空が暗い。霞は抜ける。明るさの差は強めた模式
      float rf = k == 4. ? .95 : k == 5. ? .85 : k == 3. ? .38 : k == 2. ? .32 : k == 1. ? .35 : k == 7. ? .28 : k == 6. ? .5 : .05;
      float L = sky > .5 ? .05 + .07 * (1. - vUv.y) : rf * (.3 + .9 * d.g) + .08 * lum(human(vUv));
      col = vec3(L) * vec3(1., .995, .985);
    } else if (ch == 2) {   // 熱：160×120 の画素の枠・温度の模式（木陰は低い・晴れた空は色の外）
      float cw = max(uRes.x / 160., uRes.y / 120.); vec2 cell = floor(fc / cw); vec2 cuv = (cell + .5) * cw / uRes; vec4 e = texture2D(tDat, cuv); float kk = kOf(e);
      float h = kk == 1. ? .95 : kk == 7. ? .7 : kk == 2. ? .85 : kk == 3. ? .4 : kk == 4. ? .1 : kk == 5. ? .2 : 0.;
      float T = kk < .5 ? -14. + 10. * (1. - cuv.y) : 15. + 17. * h * e.g + 1.2 * h;
      T -= kk > .5 ? 5. * smoothstep(8., 80., e.b * 120.) * h : 0.;   // 遠く斜めに見る地面ほど低く出る（放射率が下がる）
      T += (hash(cell + floor(uT * 9.)) - .5) * .25;
      col = iron((T - 5.) / 30.);
    } else if (ch == 3) {   // 点群：16 本・±15°・2° 刻み、横 0.2°。明るさ＝返りの強さ（903 nm の反射の模式）
      vec4 v = uInvProj * vec4(vUv * 2. - 1., 1., 1.); v /= v.w; vec3 dir = normalize((uCamW * vec4(v.xyz, 0.)).xyz);
      float el = degrees(asin(dir.y)), az = degrees(atan(dir.x, -dir.z));
      col = vec3(.006, .012, .028);
      if (sky < .5 && dist < 100. && abs(el) < 16.5) {
        float w = fwidth(el) / 2., ln = 0.;
        float nj = dist < 25. ? 5. : 2.;   // 歩きながら重ねた回転の模式：近い物ほど多くの回転が当たる（遠くは 16 本の隙間が残る）
        for (int j = 0; j < 5; j++) { if (float(j) >= nj) break;
          float e = (el + 15. - float(j) * .4) / 2.; float fe = abs(fract(e + .5) - .5);
          ln = max(ln, (1. - smoothstep(w * .5, w * 1.6, fe)) * (1. - float(j) * .12) * step(abs(e - 7.5), 8.)); }
        float edge = smoothstep(.08, .4, fwidth(dist));   // 物の縁（距離が跳ぶ所）は明るく
        float a = az / .2, dv = 1. - smoothstep(.12, .42, abs(fract(a + .5) - .5));
        float rf = k == 4. ? .9 : k == 5. ? .8 : k == 3. ? .45 : k == 2. ? .4 : k == 1. ? .45 : k == 7. ? .35 : k == 6. ? .6 : .3;
        float g = k == 4. ? .8 + .2 * sin(az * 3. + uT * 10.) * uGust : 1.;   // 風に揺れる葉の返りは少しちらつく
        col += mix(mix(vec3(1., .93, .78), vec3(.7, .97, 1.), clamp(dist / 26., 0., 1.)), vec3(.22, .4, .95), clamp((dist - 8.) / 45., 0., 1.)) * ln * (.35 + .65 * dv) * g * (.35 + .9 * rf) * (1.15 - dist / 110.) * (.55 + 2.2 * edge);
      }
    } else if (ch == 4) {   // 音：音の出どころから広がる輪（届く＝実線、どちらにも届かない＝破線）
      col = vec3(.03, .045, .08) + vec3(.05, .07, .1) * lum(human(vUv)) * 1.5;
      for (int i = 0; i < 3; i++) { vec4 s = uSrc[i]; if (s.w > 0.) { vec2 p = s.xy * uRes; float r = length(fc - p) / uRes.y;
        float ph = fract(r * 7. - uT * .55 - float(i) * .3); float ring = exp(-pow((ph - .5) * 15., 2.)) * exp(-r * 3.);
        if (s.w < 1.5) col += vec3(.55, .9, 1.) * ring * 1.6;
        else { float dash = step(.5, fract(atan(fc.y - p.y, fc.x - p.x) * 5. / 3.14159)); col += vec3(.96, .62, .5) * ring * dash * 1.1; } } }
    } else {   // 分類：粗い画素で決めた分類の色と境目（細い枝は空や木に溶ける）
      vec2 bs = 5. * uDpr / uRes; vec2 buv = (floor(vUv / bs) + .5) * bs; float kb = kOf(texture2D(tDat, buv));
      vec3 pal = kb == 4. ? vec3(.17, .33, .23) : kb == 3. ? vec3(.3, .22, .17) : kb == 2. ? vec3(.4, .37, .46) : kb == 1. ? vec3(.36, .31, .24) : kb == 7. ? vec3(.24, .2, .15) : kb == 5. ? vec3(.23, .37, .2) : kb == 6. ? vec3(.48, .3, .35) : vec3(.12, .17, .29);
      col = pal * (.72 + .5 * lum(human(vUv)));
      float k1 = kOf(texture2D(tDat, buv + vec2(bs.x, 0.))), k2 = kOf(texture2D(tDat, buv + vec2(0., bs.y)));
      vec2 fb = fract(vUv / bs); float edge = (step(.5, abs(k1 - kb)) * step(.75, fb.x) + step(.5, abs(k2 - kb)) * step(.75, fb.y));
      col = mix(col, vec3(.72, .65, 1.), clamp(edge, 0., 1.) * .8);
    }
  }
  float ln = 1. - smoothstep(.4, 1.4 * uDpr, abs(fc.x - sx)); col = mix(col, vec3(.95, .97, 1.), ln * .9 * step(.002, uSeam) * step(uSeam, .998));
  float l2 = 1. - smoothstep(.4, 1.4 * uDpr, abs(fc.x - sx2)); col = mix(col, vec3(.62, .95, .8), l2 * .9 * step(uSeam2, .998));
  gl_FragColor = vec4(col, 1.);
}` });
const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
{ const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const m = new THREE.Mesh(g, post); m.frustumCulled = false; postScene.add(m); }

/* ── 上に重ねる層（帯・線・輪・自分の形） ── */
const ov = new THREE.Scene(); ov.fog = scene.fog;
const lineM = (c, o) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: true, toneMapped: false });
const fillM = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide, toneMapped: false, fog: false });
const segs = (arr, mat) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3)); return new THREE.LineSegments(g, mat); };

// 札（HTML。3D の点に付いていく）
const LABS = [];
function lab(text, { cls = "", obj = null, pos = new V3(), side = "any", onTap = null, show = () => true } = {}) {
  const el = document.createElement(onTap ? "button" : "div"); el.className = "lab " + cls; el.innerHTML = text; $("#labs").appendChild(el);
  if (onTap) el.addEventListener("pointerdown", e => { e.stopPropagation(); onTap(); });
  const L = { el, obj, pos, side, show, w: new V3() }; LABS.push(L); return L;
}

// 帯＝認知可能領域（人の道・機械の道・重なり・どちらにも届かない所）
const BW = mobile ? 1.6 : 3.3, BANDG = {};
function bandX(b, v) { const a = Math.log10(b.min), z = Math.log10(b.max); return (Math.log10(v) - a) / (z - a) * BW - BW / 2; }
function inter(A, B) { const o = []; for (const [a, b] of A) for (const [c, d] of B) { const l = Math.max(a, c), r = Math.min(b, d); if (l < r) o.push([l, r]); } return o; }
function makeBand(key) {
  const b = BANDS[key], g = new THREE.Group(), L = [], vis = () => g.visible && g.userData.k > .3;
  g.userData = { k: 0, key, dots: [] }; ov.add(g);
  const LY = .075, LH = .05, OUTH = () => outK > .5;
  const lane = (ranges, y, c, o) => { for (const [a, z] of ranges) { const x0 = b.cats ? a : bandX(b, a), x1 = b.cats ? z : bandX(b, z), w = x1 - x0;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, LH), fillM(c, o)); m.position.set(x0 + w / 2, y, 0); g.add(m);
      g.add(segs([x0, y + LH / 2, 0, x1, y + LH / 2, 0, x0, y - LH / 2, 0, x1, y - LH / 2, 0, x0, y - LH / 2, 0, x0, y + LH / 2, 0, x1, y - LH / 2, 0, x1, y + LH / 2, 0], lineM(c, .75))); } };
  g.add(segs([-BW / 2, 0, 0, BW / 2, 0, 0], lineM(0xffffff, .28)));
  if (b.cats) {   // 意味：ことばの区画
    const n = b.cats.length, cw = BW / n;
    b.cats.forEach(([hj, me, hh, mm], i) => { const x0 = -BW / 2 + i * cw + .01, x1 = x0 + cw - .02;
      if (hh) lane([[x0, x1]], LY, COL.human, .2); if (mm) lane([[x0, x1]], -LY, COL.machine, .2 * mm);
      if (hh && mm) g.add(segs([x0 + cw / 2 - .01, -LY + LH / 2, 0, x0 + cw / 2 - .01, LY - LH / 2, 0], lineM(COL.both, .8)));
      const p = new V3(x0 + cw / 2, 0, 0);
      L.push(lab(`<b>${hj || "　"}</b><i>${me || "　"}</i>`, { cls: "cell" + (!hh && !mm ? " none" : ""), obj: g, pos: p, show: () => vis() && !OUTH(), onTap: null })); });
  } else {
    lane(b.h, LY, COL.human, .2); lane(b.m, -LY, COL.machine, .2);
    if (b.skin) for (const [a, z] of b.skin) { const x0 = bandX(b, a), x1 = bandX(b, z), arr = []; for (let x = x0; x < x1; x += .05) arr.push(x, LY, 0, Math.min(x + .025, x1), LY, 0); g.add(segs(arr, lineM(COL.human, .55))); }
    if (b.hsoft) { const x0 = bandX(b, b.hsoft[0][0]), x1 = bandX(b, b.hsoft[0][1]), arr = []; for (let x = x0; x < x1; x += .03) arr.push(x, LY - LH / 2, 0, x, LY + LH / 2, 0); const s = segs(arr, lineM(COL.human, .14)); g.add(s); }
    for (const [a, z] of inter(b.h, b.m)) { const x0 = bandX(b, a), x1 = bandX(b, z); g.add(segs([x0, -LY + LH / 2, 0, x0, LY - LH / 2, 0, x1, -LY + LH / 2, 0, x1, LY - LH / 2, 0, x0, 0, 0, x1, 0, 0], lineM(COL.both, .9)));
      L.push(lab("両方に届く", { cls: "rg", obj: g, pos: new V3((x0 + x1) / 2, mobile ? -LY - .44 : -LY - .2, 0), show: () => vis() && !OUTH() })); }
    for (const t of b.ticks) { const x = bandX(b, t); g.add(segs([x, -.02, 0, x, .02, 0], lineM(0xffffff, .5)));
      L.push(lab(t >= 1000 ? (t / 1000) + "k" : String(t), { cls: "tk", obj: g, pos: new V3(x, -LY - .08, 0), show: () => vis() && !OUTH() })); }
    for (const [v, s] of b.marks || []) { const x = bandX(b, v); g.add(segs([x, LY + LH / 2, 0, x, LY + .13, 0], lineM(0xffffff, .45))); L.push(lab(s, { cls: "mk", obj: g, pos: new V3(x, LY + .17, 0), show: () => vis() && !OUTH() })); }
    // どちらにも届かない所（いちばん広い隙間に札）
    const all = [...b.h, ...b.m, ...(b.hsoft || [])].sort((p, q) => p[0] - q[0]); let gaps = [], cur = b.min;
    for (const [a, z] of all) { if (a > cur) gaps.push([cur, a]); cur = Math.max(cur, z); } if (cur < b.max) gaps.push([cur, b.max]);
    gaps = gaps.filter(([a, z]) => bandX(b, z) - bandX(b, a) > .22); const wide = gaps.reduce((m, q) => (bandX(b, q[1]) - bandX(b, q[0]) > (m ? bandX(b, m[1]) - bandX(b, m[0]) : 0) ? q : m), null);
    for (const [a, z] of gaps) { const xc = (a === wide?.[0]) ? "" : " x"; const x0 = bandX(b, a), x1 = bandX(b, z), arr = []; for (let x = x0 + .02; x < x1 - .02; x += .06) arr.push(x, 0, 0, x + .02, 0, 0); g.add(segs(arr, lineM(0xffffff, .25)));
      L.push(lab("どちらにも届かない<u>＋</u>", { cls: "rg none" + xc, obj: g, pos: new V3((x0 + x1) / 2, -LY - (mobile ? .3 : .2), 0), show: () => vis() && !OUTH(), onTap: () => say("none") })); }
  }
  L.push(lab(`${b.title}${b.unit ? " <i>" + b.unit + "</i>" : ""}`, { cls: "bt", obj: g, pos: new V3(-BW / 2, LY + .2, 0), show: vis }));
  L.push(lab("人", { cls: "ln h", obj: g, pos: new V3(mobile ? -BW / 2 - .02 : BW / 2 + .02, LY, 0), show: () => vis() && !OUTH() })); L.push(lab("機械", { cls: "ln m", obj: g, pos: new V3(mobile ? -BW / 2 - .02 : BW / 2 + .02, -LY, 0), show: () => vis() && !OUTH() }));
  // 鳴った音の点（帯の上の、その高さの所）
  for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.CircleGeometry(.028, 16), fillM(0xffffff, 0)); g.add(d); g.userData.dots.push(d); }
  g.visible = false; BANDG[key] = g; return g;
}
for (const k of Object.keys(BANDS)) makeBand(k);
let dotI = 0;
function bandDot(key, v, who) {
  const g = BANDG[key], b = BANDS[key]; if (!g || !g.visible) return; const d = g.userData.dots[dotI++ % 6];
  const x = b.cats ? -BW / 2 + (v + .5) * BW / b.cats.length : bandX(b, Math.max(b.min * 1.01, Math.min(b.max * .99, v)));
  d.position.set(x, who === "h" ? .075 : who === "m" ? -.075 : 0, .001); d.material.color.setHex(who === "h" ? COL.human : who === "m" ? COL.machine : COL.both); d.userData.a = 1;
}

// 鳴ったところの輪（3D の点で広がる）
const RINGS = []; for (let i = 0; i < 28; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 56), fillM(0xffffff, 0)); m.visible = false; ov.add(m); RINGS.push(m); }
let ringI = 0;
function ring(p, c, { size = .6, life = 1.6, delay = 0 } = {}) { const r = RINGS[ringI++ % RINGS.length]; r.position.copy(p); r.material.color.setHex(c); r.userData = { t: -delay, life, size }; r.visible = true; }

// 注意の跡（触れた・目を向けた所）と、なぞった線（記述の書き換え）
const ATT = new Float32Array(900 * 3); let attN = 0;
const attG = new THREE.BufferGeometry(); attG.setAttribute("position", new THREE.BufferAttribute(ATT, 3)); attG.setDrawRange(0, 0);
const dotTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const ATC = new Float32Array(900 * 3).fill(1); attG.setAttribute("color", new THREE.BufferAttribute(ATC, 3));
const attP = new THREE.Points(attG, new THREE.PointsMaterial({ vertexColors: true, color: 0xffffff, size: .22, map: dotTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false }));
ov.add(attP);
const C_H = new THREE.Color(COL.human), C_W = new THREE.Color(0xffffff), C_B = new THREE.Color(COL.nature), cTmp = new THREE.Color();
// 結びのあと、注意を向けた点を「どの受けとり方に届くか」で色分けする（人だけ＝珊瑚・人と機械＝白・鳥にも＝緑みの白）
function tintAtt() { for (let i = 0; i < Math.min(attN, 900); i++) { const x = ATT[i * 3], y = ATT[i * 3 + 1], z = ATT[i * 3 + 2];
    const r = Math.hypot(x - DEV.x, z - DEV.z), el = Math.atan2(y - DEV.y, r) * 180 / Math.PI, mach = r < 100 && Math.abs(el) <= 15, bird = Math.hypot(x - BIRD.x, y - BIRD.y, z - BIRD.z) < 14;
    cTmp.copy(C_H); if (ended) { if (mach) cTmp.lerp(C_W, .8); if (bird) cTmp.lerp(C_B, .45); } ATC.set([cTmp.r, cTmp.g, cTmp.b], i * 3); } attG.attributes.color.needsUpdate = true; }
function attend(p) { ATC.set([C_H.r, C_H.g, C_H.b], (attN % 900) * 3); attG.attributes.color && (attG.attributes.color.needsUpdate = true); ATT.set([p.x, p.y + .03, p.z], (attN % 900) * 3); attN++; attG.setDrawRange(0, Math.min(attN, 900)); attG.attributes.position.needsUpdate = true; }
const STROKES = [];

/* ── 自分の受けとり方（外から見たとき） ── */
const selfG = new THREE.Group(); ov.add(selfG); selfG.visible = false;
const SELF_MATS = [];
const sm = (c, o) => { const m = lineM(c, o); m.userData.o = o; SELF_MATS.push(m); return m; };
const DEV = new V3(.2, 1.22, 6.95);
{
  const E = EYE, a = [];   // 人の形（線）
  for (let i = 0; i < 24; i++) { const t0 = i / 24 * TAU, t1 = (i + 1) / 24 * TAU; a.push(E.x + Math.cos(t0) * .11, 1.62 + Math.sin(t0) * .13, E.z, E.x + Math.cos(t1) * .11, 1.62 + Math.sin(t1) * .13, E.z); }
  a.push(E.x, 1.48, E.z, E.x, .92, E.z, E.x - .2, 1.42, E.z, E.x + .2, 1.42, E.z, E.x - .2, 1.42, E.z, E.x - .24, .98, E.z - .02, E.x + .2, 1.42, E.z, DEV.x, DEV.y, DEV.z,
    E.x, .92, E.z, E.x - .12, 0, E.z, E.x, .92, E.z, E.x + .12, 0, E.z + .03);
  const fig = segs(a, sm(COL.human, .45)); selfG.add(fig); selfG.userData.fig = fig;
  // 人の視野：左右およそ 200°・上下およそ 130°（上 60°・下 70°）
  const v = [], RR = 4.6, f = new V3().subVectors(LOOK, E).normalize(), yaw0 = Math.atan2(f.x, -f.z);
  const P = (az, el) => { const A = yaw0 + az * Math.PI / 180, B = el * Math.PI / 180; return [E.x + Math.sin(A) * Math.cos(B) * RR, E.y + Math.sin(B) * RR, E.z - Math.cos(A) * Math.cos(B) * RR]; };
  for (const az of [-100, 0, 100]) for (let el = -70; el < 60; el += 5) v.push(...P(az, el), ...P(az, el + 5));   // 縁と真ん中だけ（格子にしない）
  for (const el of [-70, 0, 60]) for (let az = -100; az < 100; az += 5) v.push(...P(az, el), ...P(az + 5, el));
  selfG.add(segs(v, sm(COL.human, .2)));
  // はっきり見える中心の約 2°
  const fv = [], far = 26, c0 = new V3().copy(E).addScaledVector(f, far), r = far * Math.tan(Math.PI / 180), up = new V3(0, 1, 0), sd = new V3().crossVectors(f, up).normalize();
  fv.push(E.x, E.y, E.z, c0.x, c0.y, c0.z);
  for (let i = 0; i < 32; i++) { const t0 = i / 32 * TAU, t1 = (i + 1) / 32 * TAU; const q0 = c0.clone().addScaledVector(sd, Math.cos(t0) * r).addScaledVector(up, Math.sin(t0) * r), q1 = c0.clone().addScaledVector(sd, Math.cos(t1) * r).addScaledVector(up, Math.sin(t1) * r); fv.push(q0.x, q0.y, q0.z, q1.x, q1.y, q1.z); }
  selfG.add(segs(fv, sm(COL.human, .9)));
  // 機械（手元の一台を想定した模式）：LiDAR の 16 本の輪と、カメラの視野
  const lv = [], H = DEV.y;
  for (let e = -15; e <= 15; e += 4) { const t = Math.tan(e * Math.PI / 180), rr = e < 0 ? Math.min(14, H / -t) : 14, y = H + t * rr;
    for (let i = 0; i < 72; i++) { const a0 = i / 72 * TAU, a1 = (i + 1) / 72 * TAU; lv.push(DEV.x + Math.cos(a0) * rr, y, DEV.z + Math.sin(a0) * rr, DEV.x + Math.cos(a1) * rr, y, DEV.z + Math.sin(a1) * rr); } }
  selfG.add(segs(lv, sm(COL.machine, .16)));
  const cv = [], hf = 35 * Math.PI / 180, vf = 25 * Math.PI / 180, D = 9;
  const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => DEV.clone().addScaledVector(f, D).addScaledVector(sd, x * Math.tan(hf) * D).addScaledVector(up, y * Math.tan(vf) * D));
  for (let i = 0; i < 4; i++) { const p = cs[i], q = cs[(i + 1) % 4]; cv.push(DEV.x, DEV.y, DEV.z, p.x, p.y, p.z, p.x, p.y, p.z, q.x, q.y, q.z); }
  /* カメラの視野の箱は出さない（層を増やさない） */
}
lab("この場に立つ人の視野（模式）<i>左右およそ 200°・上下およそ 130°</i>", { cls: "self h", pos: mobile ? new V3(1.5, 2.4, 4.4) : new V3(-3.4, 3.6, 4.6), show: () => outK > .6 && !ended });
lab("はっきり見えるのは中心のおよそ 1〜2°", { cls: "self h", pos: mobile ? new V3(.6, .9, -4) : new V3(.4, 1.6, -6), show: () => outK > .6 && !ended });
lab("機械<i>LiDAR 16 本（手元の一台の模式）</i>", { cls: "self m", pos: new V3(5.2, .2, 8.5), show: () => outK > .6 });
lab("注意を向けた所", { cls: "self h", obj: null, pos: new V3(), show: () => outK > .6 && attN > 0 && !ended, id: "att" });
const attLab = LABS[LABS.length - 1];
// その先：鳥の受けとり方（模式）が重なる
const birdG = new THREE.Group(); ov.add(birdG); birdG.visible = false;
const BIRD = new V3(-5.6, 7.4, -1.5);
{ const v = [], RR = 2.4; for (let az = -150; az <= 150; az += 25) for (let el = -60; el < 60; el += 12) { const p = (a, e) => [BIRD.x + Math.sin(a * Math.PI / 180) * Math.cos(e * Math.PI / 180) * RR, BIRD.y + Math.sin(e * Math.PI / 180) * RR, BIRD.z + Math.cos(a * Math.PI / 180) * Math.cos(e * Math.PI / 180) * RR]; v.push(...p(az, el), ...p(az, el + 12)); }
  birdG.add(segs(v, sm(COL.nature, .3))); }
lab("鳥<i>紫外まで感じる錐体（模式）</i>", { cls: "self n", pos: BIRD.clone().add(new V3(mobile ? 2.6 : 0, 1.4, 0)), show: () => outK > .6 && birdG.visible });

/* ── AI の札・音の出どころ ── */
const T0 = TREES.filter(t => t.trunk[0] < 0).sort((a, b) => Math.hypot(a.trunk[0] - EYE.x, a.trunk[1] - EYE.z) - Math.hypot(b.trunk[0] - EYE.x, b.trunk[1] - EYE.z))[0];
const AIP = { tree: new V3(T0.trunk[0], 2.2, T0.trunk[1]), path: new V3(.2, 0, -4), earth: new V3(-6.5, 0, -2), sky: new V3(-5, 22, -40), lantern: new V3(LANTERNS[0][0], 1.7, LANTERNS[0][1]), aoi: AOI.clone().setY(1.45), grass: new V3(2.9, .2, 4.4) };
for (const [k, p] of Object.entries(AIP)) { const [n, s] = AI_LABELS[k]; lab(`${n} <i>${s}</i>`, { cls: "ai", pos: p, side: "machine", show: () => chId() === "ai" && outK < .3 }); }
const SRC = [{ p: new V3(T0.trunk[0], 7.5, T0.trunk[1]), w: 1, t: "葉ずれ<i>耳にもマイクにも届く</i>" }, { p: new V3(.8, 9, -9), w: 2, t: "コウモリの声<i>どちらにも届かない（模式）</i>" }];
for (const s of SRC) lab(s.t, { cls: "ai snd", pos: s.p, side: "machine", show: () => chId() === "sound" && outK < .3 });

/* ── 触れたものの性質（人の色の波長・機械の値。数は data.js と資料） ── */
const KIND = {
  leaf: { wl: 550, nir: .86, heat: .12, ai: [0, 1], w: "欅の葉" }, bark: { wl: 600, nir: .34, heat: .42, ai: [0, 1], w: "欅の幹" },
  stone: { wl: 0, nir: .3, heat: .85, ai: [4, 0], w: "灯籠" }, path: { wl: 0, nir: .3, heat: .9, ai: [1, 1], w: "参道" },
  earth: { wl: 610, nir: .28, heat: .6, ai: [1, 1], w: "土" }, grass: { wl: 560, nir: .78, heat: .22, ai: [0, 1], w: "下草" },
  sky: { wl: 470, nir: .07, heat: 0, ai: [2, 1], w: "空" }, aoi: { wl: 490, nir: .5, heat: .1, ai: [3, .5], w: "碧" },
};
const GRAY = [470, 550, 610];   // 白っぽい物は、いくつもの波長が混ざる＝和音で
const BAYER = [460, 530, 600];  // カメラの三色の山（一例）

/* ── 碧のことば ── */
const said = new Set(); let capT = 0, capQ = [];
function say(k, { once = false } = {}) {
  if (once && said.has(k)) return; said.add(k);
  if (capT > .6 && (capQ.length < 2 || k.startsWith("common")) && !capQ.includes(k)) { capQ.push(k); return; } show(k);
}
function show(k) { const s = SAY[k]; if (!s) return; const el = $("#cap"); el.textContent = s; el.classList.add("on"); capT = 2.2 + s.length * .09;
  aoi?.speak({ text: s, dur: Math.min(6, s.length * .09) }); }

/* ── 状態 ── */
let seamKeep = .6, ch = 0, outK = 0, outOn = false, seam = post.uniforms.uSeam.value; const seen = new Set();
const chId = () => CH[ch].id;
const music = new Music();
const SPOTS = mobile ? [[-.55, 2.9], [-.25, 2.3], [-.8, 3.5]] : [[-1.35, 3.4], [-.7, 2.5], [-1.9, 2.1]];
function setCh(i) {
  if (aoi && i) { const [x, z] = SPOTS[i % 3]; aoi.walkTo(new V3(x, 0, z)); AIP.aoi.set(x, 1.45, z); }   // 受けとり方を替えるたびに、碧は少し場所を変える
  ch = i; post.uniforms.uCh.value = i; seen.add(CH[i].id);
  document.querySelectorAll("#chs button").forEach((b, j) => b.classList.toggle("on", j === i));
  $("#sl").innerHTML = CH[i].name + "<i>" + CH[i].en + "</i>"; $("#spec").textContent = BANDS[CH[i].band].note;
  $("#heatbar").classList.toggle("on", CH[i].id === "heat");
  if (seam > .985) { seam = mobile ? .58 : .64; }
  capQ = capQ.filter(k => k === "hint"); if (!said.has(CH[i].id)) { said.add(CH[i].id); show(CH[i].id); if (CH[i].id === "heat") say("heatAoi", { once: true }); } else if (seen.size >= 3) say("uexkull", { once: true });
  $("#chs").children[i + 1]?.classList.add("seen");
}
$("#chs").innerHTML = `<span class="end">具体から</span>` + CH.map((c, i) => `<button data-i="${i}">${c.name}</button>`).join("") + `<span class="end">抽象へ</span>`;
document.querySelectorAll("#chs button").forEach(b => b.addEventListener("click", e => { music.start(); setCh(+b.dataset.i); }));
$("#out").addEventListener("click", () => { music.start(); outOn = !outOn; if (outOn) { seamKeep = seam; seam = 1; } else seam = seamKeep; $("#out").textContent = outOn ? "戻る" : "外から"; document.body.classList.toggle("out", outOn); $("#out").classList.remove("hint");
  capQ = capQ.filter(k => k === "hint"); if (outOn) { const fin = seen.size >= 4 && STROKES.length >= 1; if (!said.has("self")) { said.add("self"); show("self"); if (!fin) say("self2", { once: true }); } else if (!fin) say("kant", { once: true }); checkEnd(); } });
$("#snd").addEventListener("click", () => { music.start(); music.setMuted(!music.muted); $("#snd").classList.toggle("off", music.muted); });
document.addEventListener("visibilitychange", () => { if (!music.ctx) return; document.hidden ? music.ctx.suspend() : (!music.muted && music.ctx.resume()); });
$("#plus").addEventListener("click", () => $("#fold").classList.toggle("on"));
$("#refs").innerHTML = REFS.map(r => `<li>${r}</li>`).join("");
let ended = false;
function checkEnd() {
  if (seen.size >= 4 && STROKES.length >= 1 && said.has("self")) { if (!outOn) $("#out").classList.add("hint"); else if (!birdG.visible) { birdG.visible = true; ended = true; tintAtt(); say("common", { once: true }); say("common2", { once: true }); say("common3", { once: true }); say("common4", { once: true }); } }
}

/* ── 触れる・なぞる ── */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function hitAt(cx, cy) {
  ndc.set(cx / innerWidth * 2 - 1, -cy / innerHeight * 2 + 1); ray.setFromCamera(ndc, cam); const o = ray.ray.origin, d = ray.ray.direction;
  let best = { t: 1e9, kind: "sky" };
  const tryT = (t, kind) => { if (t > .2 && t < best.t) best = { t, kind }; };
  if (d.y < -1e-4) { const t = -o.y / d.y, x = o.x + d.x * t; tryT(t, Math.abs(x) < 2.1 ? "path" : Math.abs(x) < 3.7 && o.z + d.z * t > -46 ? "grass" : "earth"); }
  const cyl = (x, z, r, h, kind) => { const ox = o.x - x, oz = o.z - z, a = d.x * d.x + d.z * d.z, b = 2 * (ox * d.x + oz * d.z), c = ox * ox + oz * oz - r * r, D = b * b - 4 * a * c; if (D < 0) return; const t = (-b - Math.sqrt(D)) / (2 * a), y = o.y + d.y * t; if (y > 0 && y < h) tryT(t, kind); };
  const sph = (c, r, kind) => { const oc = new V3().subVectors(o, c), b = oc.dot(d), q = oc.lengthSq() - r * r, D = b * b - q; if (D < 0) return; tryT(-b - Math.sqrt(D), kind); };
  for (const t of TREES) { const dd = Math.hypot(t.trunk[0] - o.x, t.trunk[1] - o.z); if (dd > 60) continue; cyl(t.trunk[0], t.trunk[1], t.trunk[2] + .08, 3.6, "bark"); sph(new V3(t.trunk[0], 7.8, t.trunk[1]), 4.3, "leaf"); }
  for (const [x, z] of LANTERNS) cyl(x, z, .34, 2.1, "stone");
  { const ap = aoi ? aoi.root.position : AOI; cyl(ap.x, ap.z, .26, 1.62, "aoi"); }
  best.p = best.t < 1e8 ? o.clone().addScaledVector(d, best.t) : o.clone().addScaledVector(d, 60);
  best.pan = cx / innerWidth * 2 - 1; best.left = cx < seam * innerWidth; return best;
}
const hz = h => h.kind === "sky" ? wlHz(470) : wlHz(KIND[h.kind].wl || 550);
// 一つの点を、人と機械の両方の声で鳴らす（t＝鳴らす時刻）
function sound(h, t, { glide = null, quiet = 1 } = {}) {
  const K = KIND[h.kind], id = chId(), pan = h.pan * .8, now = music.now(), dl = Math.max(0, t - now);
  // 人
  if (id === "sound") { /* 音の受けとり方では、人の声も機械の声も、その場所の音（下の grain）だけ */ }
  else if (K.wl) { music.human(wlHz(K.wl), { t, pan, gain: .15 * quiet, glide }); bandDot(CH[ch].band === "mean" ? "mean" : "light", K.wl, "h"); }
  else for (const w of GRAY) music.human(wlHz(w), { t, pan, gain: .07 * quiet });
  ring(h.p, COL.human, { delay: dl });
  // 機械
  let rest = false;
  if (id === "cam") { const ws = K.wl ? [BAYER.reduce((a, b) => Math.abs(b - K.wl) < Math.abs(a - K.wl) ? b : a)] : BAYER; for (const w of ws) { music.machine(wlHz(w), { t, pan, gain: .06 * quiet, dur: 1.0, lag: .05 }); bandDot("light", w, "m"); } }
  else if (id === "nir") { music.machine(wlHz(850), { t, pan, gain: .1 * K.nir * quiet, lag: .05 }); bandDot("light2", 850, "m"); if (K.wl) bandDot("light2", K.wl, "h"); }
  else if (id === "heat") { if (h.kind === "sky") rest = true; else music.heat(K.heat, { t, pan }); if (h.kind === "aoi") say("heatAoi", { once: true }); bandDot("heat", 10, "m"); bandDot("heat", 3, "h"); }
  else if (id === "lidar") { if (h.kind === "sky" || h.t > 100) rest = true; else for (let i = 0; i < 4; i++) music.tick(1 - h.t / 110, { t: t + i * GRID, pan }); bandDot("dist", Math.max(.2, Math.min(900, h.t)), rest ? "h" : "both"); }
  else if (id === "sound") { const fc = SND[h.kind]; if (!fc) { rest = true; if (h.kind === "sky") { music.bat({ t: t + .2, pan }); bandDot("sound", 45000, "none"); say("bat", { once: true }); if (said.has("bat")) say("nagel", { once: true }); } } else { music.grain(fc, { t, pan }); music.grain(fc, { t: music.grid(t + GRID), pan, gain: .09 }); bandDot("sound", fc, "both"); } }
  else { const [ci, mm] = K.ai; const f0 = K.wl ? wlHz(K.wl) : wlHz(550); music.machine(f0 * (mm >= 1 ? 1.5 : mm > 0 ? 1.414 : 1.0595), { t, pan, gain: .06 * quiet, lag: .05 }); bandDot("mean", ci, mm >= 1 ? "both" : mm > 0 ? "m" : "h"); }
  if (!rest) ring(h.p, COL.machine, { delay: dl + .05, size: .45 });
}
let drag = null, lastHover = 0, lookTO = 0, lastTouch = -99;
const cv = renderer.domElement;
cv.addEventListener("pointerdown", e => {
  music.start(); lastTouch = clock(); const sx = seam * innerWidth;
  if (Math.abs(e.clientX - sx) < (mobile ? 30 : 22)) drag = { seam: true }; else drag = { x: e.clientX, y: e.clientY, pts: [], mv: false };
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener("pointermove", e => {
  if (!drag) { if (!mobile && performance.now() - lastHover > 160) { lastHover = performance.now(); const h = hitAt(e.clientX, e.clientY); if (h.kind !== "sky") attend(h.p); } return; }
  if (drag.seam) { setSeam(e.clientX / innerWidth); return; }
  if (!drag.mv && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 10) drag.mv = true;
  if (drag.mv) { const lp = drag.pts[drag.pts.length - 1]; if (!lp || Math.hypot(e.clientX - lp.cx, e.clientY - lp.cy) > 12) { const h = hitAt(e.clientX, e.clientY); if (h.kind !== "sky") { h.cx = e.clientX; h.cy = e.clientY; drag.pts.push(h); attend(h.p); growStroke(drag); } } }
});
const end = e => {
  music.start(); if (!drag) return; const d = drag; drag = null;
  if (d.seam) return;
  if (d.mv && d.pts.length >= 3) { finishStroke(d); return; }
  if (d.line) { ov.remove(d.line); }
  const h = hitAt(e.clientX, e.clientY); if (h.kind !== "sky") attend(h.p);
  sound(h, music.now()); say("touch", { once: true }); if (aoi && h.kind !== "sky") { aoi.motion.lookAt(h.p.clone()); clearTimeout(lookTO); lookTO = setTimeout(() => aoi?.motion.lookAt(null), 2600); }
  if (chId() === "ai" && said.has("ai")) { say("ai2", { once: true }); if (said.has("ai2")) say("quine", { once: true }); }
  if (chId() === "cam" && said.has("cam")) say("cam2", { once: true });
};
cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", () => { if (drag?.line) ov.remove(drag.line); drag = null; });
function setSeam(x) { const was = seam; seam = Math.max(0, Math.min(1, x)); if (Math.abs(was - seam) > .02) { say(chId(), { once: true }); say("hint", { once: true }); } }
function growStroke(d) {
  const arr = d.pts.flatMap(h => [h.p.x, h.p.y + .03, h.p.z]);
  if (d.line) { d.line.geometry.dispose(); d.line.geometry = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(arr, 3)); }
  else { d.line = new THREE.Line(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(arr, 3)), lineM(0xa8f2f6, .85)); ov.add(d.line); }
}
function finishStroke(d) {
  const pts = d.pts, n = pts.length, cols = new Float32Array(n * 3).fill(.55);
  const g = d.line.geometry; g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  d.line.material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false });
  // 機械の記述：線を 0.5 m の目にそろえた点（座標）として写す
  const q = pts.map(h => [Math.round(h.p.x * 2) / 2, Math.round(h.p.y * 2) / 2 + .04, Math.round(h.p.z * 2) / 2]).filter((v, i, a) => !i || v.join() !== a[i - 1].join());
  const qg = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(q.flat(), 3));
  const qp = new THREE.Points(qg, new THREE.PointsMaterial({ color: COL.machine, size: .12, map: dotTex, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false }));
  const ql = new THREE.Line(qg, lineM(COL.machine, .35)); ov.add(qp, ql);
  STROKES.push({ pts, line: d.line, cols, qp, ql }); if (STROKES.length > 5) { const s = STROKES.shift(); ov.remove(s.line, s.qp, s.ql); }
  if (STROKES.length === 1) { say("trace", { once: true }); say("trace2", { once: true }); } else say("melody", { once: true });
  playStroke(STROKES[STROKES.length - 1], music.now() + .05); nextPhrase = clock() + PHRASE; lastStrokeP = phraseI + 1; checkEnd();
}
// 線を旋律に：人はなめらかに（すべる高さ）、機械は 0.1 秒の目にそろえた階段で
const FLASH = [];
function playStroke(s, t0, fade = 1) {
  const N = Math.min(8, s.pts.length), step = PHRASE * .75 / N, ids = Array.from({ length: N }, (_, i) => Math.round(i * (s.pts.length - 1) / Math.max(1, N - 1)));
  const fOf = h => (KIND[h.kind].wl ? wlHz(KIND[h.kind].wl) : wlHz(550)) * Math.pow(2, Math.max(-1, Math.min(2, h.p.y)) / 6);
  if (music.on) { const glide = ids.slice(1).map((j, i) => [t0 + (i + 1) * step, fOf(s.pts[j])]); music.human(fOf(s.pts[ids[0]]), { t: t0, dur: PHRASE * .75, gain: .1 * fade, pan: s.pts[ids[0]].pan * .8, glide, hold: .9 }); }
  ids.forEach((j, i) => { const h = s.pts[j], t = t0 + i * step;
    if (music.on) { const tt = music.machine(fOf(h) * (chId() === "ai" && KIND[h.kind].ai[1] < 1 ? 1.0595 : 1), { t, pan: h.pan * .8, gain: .05 * fade }); }
    FLASH.push({ s, j, at: (music.on ? t : clock() + i * step) }); ring(h.p, COL.machine, { delay: Math.max(0, t - music.now()), size: .35, life: 1.1 }); });
  if (STROKES.length && said.has("melody")) setTimeout(() => say("loop", { once: true }), PHRASE * 1000);
}
const clock = () => music.on ? music.now() : performance.now() / 1000;
let nextPhrase = 1e9, phraseI = 0, lastStrokeP = -99, nextTick = 0, windT = 0;
const SND = { leaf: 2600, grass: 3200, path: 3000, earth: 900, bark: 820, stone: 1500 };   // 触れた物の音（葉ずれ・砂利・土・叩いた幹や石）の帯域の中心。模式

/* ── 大きさ ── */
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setPixelRatio(dpr); renderer.setSize(w, h);
  const W = Math.floor(w * dpr), H = Math.floor(h * dpr); rtCol.setSize(W, H); rtDat.setSize(Math.ceil(W / 2), Math.ceil(H / 2));
  post.uniforms.uRes.value.set(W, H); post.uniforms.uDRes.value.set(Math.ceil(W / 2), Math.ceil(H / 2)); post.uniforms.uDpr.value = dpr;
  cam.aspect = w / h; cam.fov = w / h < .8 ? 64 : 50; cam.updateProjectionMatrix();
}
addEventListener("resize", resize); resize();

/* ── 毎こま ── */
const clk = new THREE.Clock(); let first = true, slow = 0, t = 0;
const tmp = new V3(), camT = new V3(), lookT = new V3();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, clk.getDelta()); t += dt;
  // 風（フィジカル）。強さが葉を揺らし、葉ずれを鳴らし、点群の葉の返りをちらつかせる
  const gust = .5 + .5 * Math.sin(t * .23) * Math.sin(t * .071 + 1.3); WIND.uTime.value = reduced ? 0 : t; WIND.uGust.value = .55 + .7 * gust; post.uniforms.uGust.value = gust; if (t - windT > .1) { windT = t; music.wind(gust, clock() - lastTouch > 8 ? .6 : 1); }   // 触れていないあいだ葉ずれは 0.6 倍
  const idle = Math.max(0, clock() - lastTouch - 8), quietK = Math.exp(-idle / 3);   // 触れずに 8 秒たつと、刻みとコウモリは弱まり休符へ
  if (music.on && seamShown < .97 && chId() === "lidar" && outK < .5 && quietK > .03) { const n0 = music.now(); if (nextTick < n0) nextTick = music.grid(n0 + .02); while (nextTick < n0 + .12) { music.tick((.2 + .5 * gust) * quietK, { t: nextTick, pan: .3 }); nextTick += GRID; } }   // 毎秒 10 回転＝0.1 秒ごとの刻み（返りの強さは風で揺れる葉で変わる）
  // 見る位置（内 ⇄ 外）
  outK += ((outOn ? 1 : 0) - outK) * Math.min(1, dt * 2.2);
  const e = outK * outK * (3 - 2 * outK);
  camT.lerpVectors(EYE, OUTP, e); lookT.lerpVectors(LOOK, OUTL, e);
  if (!reduced) camT.x += Math.sin(t * .13) * .05 * (1 - e), camT.y += Math.sin(t * .21) * .02;
  cam.position.copy(camT); cam.lookAt(lookT); cam.updateMatrixWorld();
  U.sunV.value.copy(SUN).transformDirection(cam.matrixWorldInverse);
  aoi?.tick(dt, cam); grass.update(cam.position, dt);
  // 帯：いまの受けとり方の帯を、空に一本（外からは六本を譜のように縦に重ねる）
  const keys = Object.keys(BANDG), cur = CH[ch].band;
  keys.forEach((k, i) => { const g = BANDG[k]; const on = outK > .5 ? ended : k === cur; g.userData.k += ((on ? 1 : 0) - g.userData.k) * Math.min(1, dt * 3); g.visible = g.userData.k > .02;
    if (!g.visible) return;
    const pIn = tmp.set(mobile ? .32 : -.1, mobile ? 2.62 : 2.85, mobile ? 2.8 : 1.2), pOut = mobile ? new V3(-1.9, 2.9 + i * .5, 6.2) : new V3(-5.4, .9 + i * .95, 2.4);
    const lane = keys.indexOf(cur); g.position.lerpVectors(pIn, pOut, e); if (outK < .5 && k !== cur) g.position.y += (i - lane) * .5;
    g.lookAt(cam.position); g.scale.setScalar(1 + e * (mobile ? -.25 : .6));
    g.traverse(o => { if (o.material && o !== g) { if (o.material.userData.o0 === undefined) o.material.userData.o0 = o.material.opacity; if (!g.userData.dots.includes(o)) o.material.opacity = o.material.userData.o0 * g.userData.k; } });
    for (const d of g.userData.dots) { d.userData.a = Math.max(0, (d.userData.a || 0) - dt * .8); d.material.opacity = d.userData.a * g.userData.k; d.scale.setScalar(1 + (1 - d.userData.a) * 1.5); }
  });
  // 輪
  for (const r of RINGS) { if (!r.visible) continue; const u = r.userData; u.t += dt; if (u.t < 0) { r.material.opacity = 0; continue; } const k = u.t / u.life; if (k >= 1) { r.visible = false; continue; }
    r.quaternion.copy(cam.quaternion); r.scale.setScalar(.05 + u.size * Math.sqrt(k)); r.material.opacity = (1 - k) * .8; }
  // 線の点が鳴る（光る）
  const now = clock();
  for (let i = FLASH.length - 1; i >= 0; i--) { const f = FLASH[i]; if (now >= f.at) { f.s.cols.fill(1, f.j * 3, f.j * 3 + 3); for (let q = Math.max(0, f.j - 2); q <= Math.min(f.s.pts.length - 1, f.j + 2); q++) f.s.cols[q * 3] = f.s.cols[q * 3 + 1] = f.s.cols[q * 3 + 2] = Math.max(f.s.cols[q * 3], .9); FLASH.splice(i, 1); } }
  for (const s of STROKES) { for (let q = 0; q < s.cols.length; q++) s.cols[q] = Math.max(.42, s.cols[q] - dt * .9); s.line.geometry.attributes.color.needsUpdate = true; }
  // 句（4 秒）ごとに、書き換えた線をもう一度鳴らす。機械の声部は LiDAR の目で刻み、音の受けとり方ではコウモリの声の模式
  if (now >= nextPhrase) { nextPhrase = now + PHRASE; phraseI++;
    const age = phraseI - lastStrokeP;   // 新しく書かなければ、回るたびに小さくなり、6 句で休符へ戻る
    if (STROKES.length && age < 6) playStroke(STROKES[phraseI % STROKES.length], now + .05, Math.pow(.78, age));
    if (music.on && seam < .97 && chId() === "sound" && clock() - lastTouch < 12) music.bat({ t: now + .4, pan: .1 });
  }
  if (music.on && nextPhrase > 1e8) nextPhrase = now + PHRASE;
  // 外からの層
  selfG.visible = outK > .02; if (selfG.userData.fig) selfG.userData.fig.visible = !ended; for (const m of SELF_MATS) m.opacity = m.userData.o * outK;
  attP.material.opacity = .15 + .75 * outK;
  if (attN) { const j = ((attN - 1) % 900) * 3; attLab.pos.set(ATT[j], ATT[j + 1] + .4, ATT[j + 2]); }
  // 合わせ
  { const want = ended && !outOn ? (mobile ? .8 : .78) : 1; post.uniforms.uSeam2.value += (want - post.uniforms.uSeam2.value) * Math.min(1, dt * 3); if (seam > post.uniforms.uSeam2.value - .02 && want < 1) seam = post.uniforms.uSeam2.value - .14; $("#birdT").classList.toggle("on", want < 1); $("#birdT").style.transform = `translate(${(post.uniforms.uSeam2.value * innerWidth + 10) | 0}px,${(innerHeight * .2) | 0}px)`; }
  seamShown += (seam - seamShown) * Math.min(1, dt * 14); post.uniforms.uSeam.value = seamShown; post.uniforms.uT.value = t;
  post.uniforms.uInvProj.value.copy(cam.projectionMatrixInverse); post.uniforms.uCamW.value.copy(cam.matrixWorld);
  { let i = 0; for (const s of SRC) { tmp.copy(s.p).project(cam); post.uniforms.uSrc.value[i++].set(tmp.x * .5 + .5, tmp.y * .5 + .5, 0, tmp.z < 1 ? s.w : 0); } }
  // ① 人
  U.mach.value = 0; cam.layers.mask = 1 | 2 | 4; renderer.setRenderTarget(rtCol); renderer.setClearColor(0x000000, 1); renderer.render(scene, cam);
  // ② 機械のための記述
  if (seamShown < .998) { U.mach.value = 1; cam.layers.set(0); renderer.setRenderTarget(rtDat); renderer.setClearColor(0x0000ff, 1); renderer.render(scene, cam);
    if (aoi) { cam.layers.set(2); scene.overrideMaterial = aoiId; renderer.autoClear = false; renderer.render(scene, cam); renderer.autoClear = true; scene.overrideMaterial = null; }
    cam.layers.mask = 1 | 2 | 4; U.mach.value = 0; renderer.setClearColor(0x000000, 1); }
  // ③ 合わせ ④ 層
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  renderer.autoClear = false; renderer.clearDepth(); renderer.render(ov, cam); renderer.autoClear = true;
  // 札
  const W = innerWidth, H = innerHeight;
  for (const L of LABS) { let ok = L.show(); if (ok) { L.w.copy(L.pos); if (L.obj) L.obj.localToWorld(L.w); L.w.project(cam); ok = L.w.z < 1 && Math.abs(L.w.x) < 1.1 && Math.abs(L.w.y) < 1.1; }
    const x = (L.w.x * .5 + .5) * W, y = (-L.w.y * .5 + .5) * H; if (ok && L.side === "machine" && x < seamShown * W) ok = false;
    if (ok !== L.on) { L.on = ok; L.el.classList.toggle("on", ok); } if (ok) L.el.style.transform = `translate(${x | 0}px,${y | 0}px)`; }
  { const on = chId() === "cam" && outK < .3 && seamShown < .9, a = $("#camA"), b = $("#camB"); a.classList.toggle("on", on); b.classList.toggle("on", on);
    if (on) { const rw = W - seamShown * W; a.style.transform = `translate(${(seamShown * W + 10) | 0}px,${(H * .66) | 0}px)`; b.style.transform = `translate(${(W - 16) | 0}px,${(H * (mobile ? .72 : .66)) | 0}px)`; } }
  const hx = seamShown * W; $("#seam").style.transform = `translateX(${hx | 0}px)`; $("#seam").classList.toggle("edge", seamShown > .97 || seamShown < .03);
  // 字幕
  if (capT > 0) { capT -= dt; if (capT <= 0) { $("#cap").classList.remove("on"); if (capQ.length) setTimeout(() => show(capQ.shift()), 500); } }
  // 重いときは画素を下げる
  if (dt > .045) slow += dt; else slow = Math.max(0, slow - dt * .5);
  if (slow > 1.5 && dpr > .7) { dpr = Math.max(.7, dpr - .2); slow = 0; resize(); }
  if (first) { first = false; window.MLLoader?.done(); window.__ready = performance.now(); setTimeout(() => say("open"), 900); }
}
let seamShown = seam;
setCh(0); said.delete("cam"); capT = 0; $("#cap").classList.remove("on"); capQ = [];
frame();
window.__app = { dpr: v => { dpr = v; resize(); }, size: () => [renderer.domElement.width, renderer.domElement.height, innerWidth, innerHeight, dpr], setCh, setSeam: x => { seam = x; }, out: v => { outOn = v; }, STROKES, hitAt, said, finishStroke, growStroke, attend };
