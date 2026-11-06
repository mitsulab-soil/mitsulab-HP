/* © mitsulab. 抽象と具体のあわい ── 共通の舞台（2026-11-06・x/20 哲学・x/21 文学・x/22 計算機で使い回す）
   一つの軸「具体 ⇄ 抽象」を、上下になぞって行き来する。
   具体（0）＝朝の氷川参道の写実（Qualia/sight と同じ CC0 の質感・欅の並木・ツワブキ・落ち葉）。
   抽象（1）＝同じ場所が、高さの等高線と点の測りだけになり、地は紺へ沈む。あいだ＝写実の地に、事実の線。
   上へなぞると視点も昇り、下へなぞると目の高さへ降りる。触れる＝鳴る・碧が一行話す。
   線は事実にだけ引く：等高線＝高さ（0.5 m ごと）、点＝その場の形を測った点（測りの模式）。
   決まり＝12_ブランド/世界観と見た目_v1。重さ＝スマホ 100 描画・30 万三角形まで。 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { taperTube, leafMaterial, barkMaterial, rng, WIND } from "./vegetation.js";
import { fitRenderer } from "./atmosphere.js";
import { installDapple, makeSightGrass } from "./sight_look.js";
import { sightBark } from "./sight_trees.js";
installDapple(THREE);   // 木もれ日（線の霞で近くから掛かるときだけ効く）。材質を作る前に一度
// 11-06：このページでは木もれ日の斑を浅く（影の側も明るさを 4 割残す＝迷彩の斑に見えない）。sight のページには効かない（このページの中だけの書きかえ）
if (!THREE.ShaderChunk.__awDapSoft) { THREE.ShaderChunk.__awDapSoft = 1; THREE.ShaderChunk.lights_fragment_begin = THREE.ShaderChunk.lights_fragment_begin.replace("qDap = mix( 1.0, .12 + 1.05 * lit, k );", "qDap = mix( 1.0, .44 + .7 * lit, k );"); }
// 日の方角の霞は明るく温かく、背の側は青みに（空気遠近。2026-11-06）。霞の色に掛けるだけなので、抽象で紺へ沈むときは一緒に沈む
const SUN_GL = "-.482, .392, -.784";   // 日の向き（下の SUNW と同じ）
{ const C = THREE.ShaderChunk; if (!C.__awSunFog) { C.__awSunFog = 1;
  C.fog_pars_vertex = C.fog_pars_vertex.replace("varying float vFogDepth;", "varying float vFogDepth; varying vec3 vFogDir;");
  C.fog_vertex = C.fog_vertex.replace("vFogDepth = - mvPosition.z;", "vFogDepth = - mvPosition.z; vFogDir = ( vec4( mvPosition.xyz, 0. ) * viewMatrix ).xyz;");
  C.fog_pars_fragment = C.fog_pars_fragment.replace("varying float vFogDepth;", "varying float vFogDepth; varying vec3 vFogDir;");
  C.fog_fragment = C.fog_fragment.replace("gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );",
    `{ float sd_ = max( dot( normalize( vFogDir ), vec3( ${SUN_GL} ) ), 0. ); vec3 fc_ = fogColor * mix( vec3( .9, .95, 1.03 ), vec3( 1.3, 1.1, .82 ), pow( sd_, 2.5 ) ); gl_FragColor.rgb = mix( gl_FragColor.rgb, fc_, fogFactor ); }`); } }

const TAU = Math.PI * 2, clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const MOBILE = Math.min(innerWidth, innerHeight) < 700 || matchMedia("(pointer:coarse)").matches;
export const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
export { clamp, lerp, ss, TAU };

// ───────── 軸の値（すべての材質が同じ値を読む）
export const AW = {
  uAbs: { value: 0 }, uTime: { value: 0 },
  uInk: { value: new THREE.Color(0x060b16) }, uLineC: { value: new THREE.Color(0x8fd6e8) },
  uStep: { value: .5 }, uReach: { value: 60 },
};
const HAZE = new THREE.Color(0xcfd5d2), GREY = new THREE.Color(0x8f9aa3), NAVY = new THREE.Color(0x03060f);

/* 材質に「抽象へ移る」はたらきを足す。上の方から先に写実がほどけ（昇る向き）、等高線が浮かぶ。
   opts.lines=false で線を引かない（葉の板など、線がちらつくもの） */
export function awaiPatch(m, { lines = true, keep = 0 } = {}) {
  if (!m || m.userData.awai) return m; m.userData.awai = true;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = function (sh, r) {
    prev?.call(this, sh, r);
    Object.assign(sh.uniforms, { uAbs: AW.uAbs, uInk: AW.uInk, uLineC: AW.uLineC, uStep: AW.uStep, uReach: AW.uReach, uKeep: { value: keep } });
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vAwW;")
      .replace("#include <fog_vertex>", `#include <fog_vertex>
{ vec4 aw_ = vec4(transformed, 1.);
#ifdef USE_INSTANCING
  aw_ = instanceMatrix * aw_;
#endif
  vAwW = (modelMatrix * aw_).xyz; }`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vAwW; uniform float uAbs, uStep, uReach, uKeep; uniform vec3 uInk, uLineC;")
      .replace("#include <tonemapping_fragment>", `{ float A = uAbs * (1. - uKeep);
  float up_ = clamp(vAwW.y / 14., 0., 1.);
  float k_ = smoothstep(0., 1., A * 1.45 - (1. - up_) * .45);            // 上から先にほどける
  float l_ = dot(gl_FragColor.rgb, vec3(.3, .59, .11));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uInk * (1. + l_ * 1.6), k_);
  ${lines ? `float hh_ = vAwW.y / uStep; float d_ = abs(fract(hh_ + .5) - .5); float w_ = fwidth(hh_);
  float ln_ = (1. - smoothstep(w_ * .2, w_ * .75, d_)) * step(w_, .25);
  float far_ = 1. - smoothstep(uReach * .5, uReach, length(vAwW - cameraPosition));
  gl_FragColor.rgb += uLineC * ln_ * far_ * smoothstep(.06, .4, A) * (.12 + .14 * k_);` : ""}
}
#include <tonemapping_fragment>`);
  };
  const k0 = m.customProgramCacheKey; m.customProgramCacheKey = function () { return (k0 ? k0.call(this) : "") + "|aw" + (lines ? 1 : 0) + keep; };
  m.needsUpdate = true; return m;
}

// 抽象の側で見えてくる線と点（不透明度が軸で変わる）。band＝[出はじめ, 濃い, 消えはじめ, 消える]
export function fadeBy(mat, band = [.15, .55, 2, 3], max = mat.opacity ?? 1) {
  mat.userData.fade = { band, max }; mat.transparent = true; FADERS.push(mat); return mat;
}
const FADERS = [];
const bandK = (b, a) => ss(b[0], b[1], a) * (1 - ss(b[2], b[3], a));

const dotTex = (() => { let t; return () => { if (t) return t; const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.3, "rgba(255,255,255,.6)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); t = new THREE.CanvasTexture(c); return t; }; })();
export { dotTex };
export const lineMat = (c, op = .6) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
export const pointMat = (c, size = .06, op = .8) => new THREE.PointsMaterial({ color: c, size, map: dotTex(), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, sizeAttenuation: true });

// 葉を透かす光（ひとつの木と同じ式：逆光で黄緑に透け、樹冠の内側は暗い）
const SUNW = new THREE.Vector3(-16, 13, -26).normalize();   // 参道の奥の左から低い日（十一月の朝・高さ約 23°）。葉は逆光で透ける
function translucent(m, k = 1) { const ob = m.onBeforeCompile; m.alphaTest = .3;
  m.onBeforeCompile = (sh, r) => { ob(sh, r); sh.uniforms.uSunW = { value: SUNW }; sh.uniforms.uTrK = { value: k };
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uSunW; uniform float uTrK;")
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
{ vec3 V_ = normalize(cameraPosition - vWP); vec3 out_ = normalize(vWP - vCtr + vec3(0., .25, 0.));
  float back_ = pow(max(dot(-V_, uSunW), 0.), 3.); float side_ = .5 + .5 * dot(out_, uSunW); float rim_ = .35 + .65 * smoothstep(-.2, .8, dot(out_, V_));
  totalEmissiveRadiance += diffuseColor.rgb * vec3(1.2, 1.3, .55) * uTrK * (.3 * rim_ + 1.0 * back_ * side_); }`); };
  const ck = m.customProgramCacheKey; m.customProgramCacheKey = () => ck() + "tr"; }

// ───────── 舞台
/* o: { title, en, tex（質感の道）, aoi（碧の VRM の道。null で出さない）, abs0（はじめの軸）, rig(a, yaw) → {pos, look}, credits: [行], hint } */
export async function createAwai(o) {
  const T0 = performance.now(), MK = window.__awaiMK = {}; const mk = n => MK[n] = Math.round(performance.now() - T0);
  const KY = await import(o.keyaki); mk("keyaki");
  const canvas = document.createElement("canvas"); canvas.id = "cv"; document.body.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.06; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .05, 700);
  const fit = fitRenderer(renderer, camera, document.body);
  scene.fog = new THREE.Fog(HAZE.clone(), 6, 120); scene.background = HAZE.clone();

  // 光：十一月の朝の低い日。参道は南北に通る＝南（入口の側）を向くと、日は奥の左（南東）の木立の上から、こちらへ影を伸ばす
  const hemi = new THREE.HemisphereLight(0xdfe8ee, 0x5e5242, 1.05); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe9cc, 2.3); sun.position.copy(SUNW).multiplyScalar(30); scene.add(sun, sun.target);

  // 空：天頂→地平。抽象へ行くほど紺へ
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uAbs: AW.uAbs, uFog: { value: scene.fog.color } },
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
    fragmentShader: `uniform float uAbs; uniform vec3 uFog; varying vec3 vD; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){ float y = clamp(vD.y, -1., 1.);
        vec3 top = mix(vec3(.30, .44, .58), vec3(.0004, .0012, .004), smoothstep(.0, .85, uAbs));   // 線形の色（天頂）
        vec3 c = mix(uFog, top, pow(smoothstep(0., 1., y), .55));                                    // 地平は霧の色と同じ＝境が出ない
        float sd = max(dot(vD, vec3(${SUN_GL})), 0.); c *= mix(vec3(.9, .95, 1.03), vec3(1.3, 1.1, .82), pow(sd, 2.5) * (1. - smoothstep(0., .5, y)));   // 霞と同じ、日の方角の温かさ
        c += vec3(1., .82, .58) * (pow(sd, 24.) * .55 + pow(sd, 6.) * .12) * (1. - smoothstep(.0, .7, uAbs));          // 霞の向こうの日（輪郭のない明るみ）
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb += (h(gl_FragCoord.xy) - .5) / 255.; }`,
  })); sky.frustumCulled = false; sky.renderOrder = -1; scene.add(sky);

  const TL = new THREE.TextureLoader(), texs = [];
  const tex = (n, rep = 1, srgb = true) => { const t = TL.load(o.tex + n + ".webp"); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MOBILE ? 2 : 8; texs.push(t); return t; };

  const world = new THREE.Group(); scene.add(world);
  const pending = new THREE.Group();   // 最初の絵のあとで組む（材質の組み立てを後ろへ回し、起動を軽く）
  const R = rng(o.seed ?? 1106), RA = rng((o.seed ?? 1106) + 7);   // RA＝色と湿りだけに使う（R の並びを変えない＝木と主体の置き場は前と同じ）
  const pathX = z => Math.sin(z * .021) * .35;   // 参道のごく緩い揺れ（まっすぐすぎない）

  // 地面：土と砂利の道を一枚で（境はぼかす）。落ち葉のまだらと湿りは頂点の色で
  {
    const S = 220, N = MOBILE ? 110 : 180, g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2); g.translate(0, 0, -40);
    const p = g.attributes.position, cs = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), dx = Math.abs(x - pathX(z));
      const roll = .05 * Math.sin(x * .19 + z * .07) + .04 * Math.sin(z * .11 - x * .05) + (dx > 7 ? (dx - 7) * .012 : 0);   // 木の根もとほどわずかに高い
      p.setY(i, roll - .03);
      const n = .5 + .5 * Math.sin(x * 1.7 + Math.sin(z * .9) * 2) * Math.sin(z * 1.3 - x * .4), wet = .86 + .14 * n;
      cs.push(.86 * wet, .82 * wet, .74 * wet);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(cs, 3)); g.computeVertexNormals();
    const soil = tex("soil_forest", S / 2.6), grav = tex("path_gravel", 1);
    const fc = document.createElement("canvas"); fc.width = fc.height = 4; { const x = fc.getContext("2d"); x.fillStyle = "rgb(128,128,255)"; x.fillRect(0, 0, 4, 4); } const flatN = new THREE.Texture(fc); flatN.needsUpdate = true;   /* 平らな法線（画だけをあとで差し替えられる普通の画） */ flatN.wrapS = flatN.wrapT = THREE.RepeatWrapping; flatN.repeat.set(S / 1.6, S / 1.6);
    const m = new THREE.MeshStandardMaterial({ map: soil, vertexColors: true, roughness: 1, normalMap: flatN, normalScale: new THREE.Vector2(.55, .55) });
    setTimeout(() => { TL.load(o.tex + "sand_grit_n.webp", t2 => { flatN.image = t2.image; flatN.anisotropy = MOBILE ? 2 : 8; flatN.needsUpdate = true; }); }, 1500);   /* 地の細かな凹凸は、最初の絵のあとで画だけ差し替える（材質は組み直さない＝こま落ちなし・起動を 1 秒以内に） */   // 11-06：地に細かな凹凸（CC0 の砂の法線。近景が平らな板に見えない）
    m.onBeforeCompile = sh => {
      sh.uniforms.uGrav = { value: grav };
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D uGrav;")
        .replace("#include <map_fragment>", `#ifdef USE_MAP
{ vec4 s1 = texture2D(map, vMapUv); vec4 s2 = mix(texture2D(uGrav, vAwW.xz * 1.05), texture2D(uGrav, vAwW.xz * .29 + .37), .45);
  float px = vAwW.x - sin(vAwW.z * .021) * .35; float edge = 2.05 + .25 * sin(vAwW.z * .8) * sin(vAwW.z * .31);
  float pm = 1. - smoothstep(edge - .35, edge + .45, abs(px));
  vec4 c = mix(s1 * vec4(.62, .58, .52, 1.), s2 * vec4(1.18, 1.2, 1.2, 1.), pm); c.rgb = mix(c.rgb, vec3(dot(c.rgb, vec3(.3,.59,.11))), .28);
  diffuseColor *= c; }
#endif`);
    };
    awaiPatch(m, { lines: false });
    const ground = new THREE.Mesh(g, m); world.add(ground);
  }

  // 欅の並木（参道の両側）。形＝ひとつの木と同じ作り方（低い所で太枝に分かれ、箒のように上へ開く）。近い 6 本だけ細かく
  const near = [], all = []; let grassUp = null;
  {
    const K = { taperTube }, spots = [];
    for (const side of [-1, 1]) for (let z = 12 + R() * 3, i = 0; z > -140; z -= 9 + R() * 3.5, i++) spots.push([pathX(z) + side * (5.4 + R() * 1.4), z, i < (MOBILE ? 2 : 3)]);
    for (const side of [-1, 1]) for (const [x0, dz] of (MOBILE ? [[13, 12], [24, 11]] : [[13, 11], [22, 9], [32, 8], [44, 8]])) for (let z = 10 + R() * 5; z > -120; z -= dz + R() * 6) spots.push([pathX(z) + side * (x0 + R() * 7), z, false, true]);
    for (const [x, z, det, back] of spots) {
      const sc = (back ? .8 : 1) * (.85 + R() * .35), d = det && Math.abs(z) < 30;
      const t = KY.growKeyaki(K, R, x, z, { det: d, r: .55 * sc * (.8 + R() * .5), hf: 3.1 * sc * (.75 + R() * .55), limbs: (d ? 6 : (MOBILE ? 4 : 5)) + Math.floor(R() * 3) - 1, len: [6.8 * sc, 8.4 * sc].map(l => l * (.8 + R() * .4)), tilt: .17 + R() * .2, levels: d && !MOBILE ? 3 : 2, forks: 2, decay: .64,
        sprigs: d ? (MOBILE ? 2600 : 5200) : (back ? 0 : (MOBILE ? 260 : 620)), back: d ? (MOBILE ? 420 : 800) : (MOBILE ? 220 : 380) });
      all.push(t); if (d) near.push(t);
    }
    mk("grow");
    const bark = barkMaterial(tex("bark_zelkova", 1), { normalMap: tex("bark_zelkova_n", 1, false) }); bark.color.setRGB(1.0, .96, .92); sightBark(bark, { gray: .45, contrast: 1.25 }); awaiPatch(bark);
    const wood = new THREE.Mesh(mergeGeometries(all.flatMap(t => t.wood).map(g => { for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k); return g; })), bark); world.add(wood);
    const one = TL.load(o.sprig); one.colorSpace = THREE.SRGBColorSpace; one.anisotropy = 4; one.wrapS = one.wrapT = THREE.ClampToEdgeWrapping;
    const leaf = leafMaterial(one); translucent(leaf, .85); awaiPatch(leaf, { lines: false });
    const tint = [1.3, .92, .42], tintB = [.95, .76, .4], tintN = [1.42, .86, .36];   // 近くの木ほど色づきが見える   // 十一月のはじめ：緑に黄と橙が混じる
    // 11-06 二版の後：欅の黄葉を、房ごとにはっきり混ぜる（黄・橙・錆。十一月のはじめの大宮の並木＝緑のなかに色づいた房が散る）
    const autumn = (im, frac) => { const c = new THREE.Color(); for (let i = 0; i < im.count; i++) { if (RA() > frac) continue; im.getColorAt(i, c); const k = RA(); c.multiply(k < .5 ? new THREE.Color(1.5, 1.22, .62) : k < .82 ? new THREE.Color(1.55, 1.0, .55) : new THREE.Color(1.3, .78, .5)); im.setColorAt(i, c); } im.instanceColor.needsUpdate = true; return im; };
    for (const t of near) world.add(autumn(KY.sprigMesh(t.sprigs, leaf, .62, tintN, t.ctr, R), .42));
    { const fs = all.filter(t => !near.includes(t) && t.sprigs.length).flatMap(t => t.sprigs.map(b => [b, t.ctr])); if (fs.length) { const im = KY.sprigMesh(fs.map(b => b[0]), leaf, .9, tint, new THREE.Vector3(), R); const a = im.geometry.attributes.aCtr; fs.forEach(([, c], i) => a.setXYZ(i, c.x, c.y, c.z)); world.add(autumn(im, .38)); } }   // 並木の枝先にも葉（枝先が槍に見えない）
    const backs = all.flatMap(t => t.back.map(b => [b, t.ctr]));
    const bIM = KY.sprigMesh(backs.map(b => b[0]), leaf, 1.05, tintB, new THREE.Vector3(), R); { const a = bIM.geometry.attributes.aCtr; backs.forEach(([, c], i) => a.setXYZ(i, c.x, c.y, c.z)); } world.add(autumn(bIM, .34));
    mk("trees");
  }
  // 草（道の外の縁）と落ち葉
  {
    const anchors = [], trunks = all.map(t => { const p = t.wood[0].attributes.position; return [p.getX(0), p.getZ(0)]; }).filter(([x, z]) => z > -40 && z < 16 && Math.abs(x) < 9);
    for (let i = 0; i < (MOBILE ? 380 : 700); i++) { if (R() < .55 && trunks.length) { const [x, z] = trunks[Math.floor(R() * trunks.length)], a = R() * TAU, r = .8 + R() * 2.6; anchors.push(x + Math.cos(a) * r, 0, z + Math.sin(a) * r); } else { const z = 14 - R() * 52, sd = R() < .5 ? -1 : 1, dx = 2.9 + Math.pow(R(), .6) * 7; anchors.push(pathX(z) + sd * dx, 0, z); } }
    const gr = makeSightGrass(THREE, pending, { anchors, mobile: MOBILE, reduced: RM, spread: .9 }); awaiPatch(gr.mesh.material, { lines: false });
    gr.mesh.scale.y = .58; const GMAX = MOBILE ? 1100 : 2600; grassUp = (c, dt) => { gr.update(c, dt); gr.mesh.count = Math.min(gr.mesh.count, GMAX); };
    const lt = tex("leaf_one", 1); lt.wrapS = lt.wrapT = THREE.ClampToEdgeWrapping;
    const lm = new THREE.MeshStandardMaterial({ map: lt, alphaTest: .5, side: THREE.DoubleSide, roughness: .85 });
    lm.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", "#ifdef USE_MAP\n{ vec4 tx_ = texture2D(map, vMapUv); diffuseColor *= vec4(vec3(dot(tx_.rgb, vec3(.3,.59,.11)) * 2.5), tx_.a); }\n#endif"); };
    awaiPatch(lm, { lines: false });
    const n0 = MOBILE ? 1100 : 2200, n = MOBILE ? 2000 : 4200, lg = new THREE.PlaneGeometry(.05, .1); lg.rotateX(-Math.PI / 2);   // 11-06 二版の後：落ち葉を倍に（十一月の参道の地が、むきだしの泥に見えない。足した分は RA で置く＝R の並びは前と同じ）   // 近くほど多く（足もとの地が、ただの土の面に見えない）
    const R0 = R, im = new THREE.InstancedMesh(lg, lm, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    for (let i = 0; i < n; i++) { const R = i < n0 ? R0 : RA;
      const z = 8 - Math.pow(R(), 1.5) * 46, onPath = R() < .42, x = pathX(z) + (onPath ? (R() - .5) * 3.6 : (R() < .5 ? -1 : 1) * (2.2 + R() * 5));
      e.set((R() - .5) * .5, R() * TAU, (R() - .5) * .5); q.setFromEuler(e); const s = .8 + R() * .7;
      m4.compose(new THREE.Vector3(x, .012 + R() * .01, z), q, new THREE.Vector3(s, s, s)); im.setMatrixAt(i, m4);
      const k = R(), wet = RA() < .25 ? .62 : 1; c.setRGB(lerp(.98, .58, k) * wet, lerp(.8, .4, k) * wet, lerp(.3, .2, k) * wet); im.setColorAt(i, c);   // 黄から茶へ（四分の一は湿って濃い）
    }
    pending.add(im);
  }

  // 測りの点（抽象の側で浮かぶ）：地面と近くの幹の形を測った点
  {
    const pts = [];
    for (let i = 0; i < (MOBILE ? 900 : 1600); i++) { const z = 8 - R() * 30, x = pathX(z) + (R() - .5) * 2 * (2.2 + R() * 1.2); pts.push(x, .02, z); }   // 道の面を測った点（道の内だけ・少なく）
    for (const t of near) { const g = t.wood[0], p = g.attributes.position; for (let i = 0; i < p.count; i += MOBILE ? 6 : 3) pts.push(p.getX(i), p.getY(i), p.getZ(i)); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const pm = fadeBy(pointMat(0xa8dcec, MOBILE ? .04 : .032, .45), [.2, .65, 2, 3]); pending.add(new THREE.Points(g, pm));
    // 樹冠＝葉の位置を測った点（葉は線にせず、点の雲として残る）
    const cp = []; for (const t of all) for (const [p] of [...t.sprigs, ...t.back]) if (R() < (MOBILE ? .35 : .6)) cp.push(p.x, p.y, p.z);
    const cg = new THREE.BufferGeometry(); cg.setAttribute("position", new THREE.Float32BufferAttribute(cp, 3));
    const cm = fadeBy(pointMat(0x9fe0c4, MOBILE ? .08 : .065, .42), [.25, .75, 2, 3]); pending.add(new THREE.Points(cg, cm));
  }

  // ───────── 画面（字幕・軸・題・音・出典）
  const ui = document.createElement("div"); ui.id = "aw-ui"; document.body.appendChild(ui);
  ui.innerHTML = `<div class="aw-mark"><b>${o.title}</b>${o.sub ? `<span class="aw-sub">${o.sub}</span>` : ""}<i>${o.en || ""}</i></div>
<div class="aw-axis" aria-hidden="true"><span class="aw-top">抽象</span><span class="aw-line"><em></em></span><span class="aw-bot">具体</span></div>
<p class="aw-cap" aria-live="polite"></p>
<button class="aw-snd" type="button" aria-pressed="false">音</button>
<details class="aw-fold"><summary>＋</summary><div>${(o.credits || []).map(l => `<p>${l}</p>`).join("")}<p>模式の表現です。ほかの生き物の受けとり方そのものではありません。</p><p>© mitsulab. All rights reserved.</p></div></details>`;
  const cap = ui.querySelector(".aw-cap"), knob = ui.querySelector(".aw-line em"), sndBtn = ui.querySelector(".aw-snd");
  const axisEl = ui.querySelector(".aw-axis");

  // 字幕：一行ずつ。重なったら順に
  const queue = []; let capT = 0, capOn = false, aoiRef = null;
  const esc = x => x.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  const capHTML = t => {   // 句読点のあとでだけ改行してよい（語の途中で割らない。Safari でも同じ）
    const parts = t.match(/[^。、]+[。、]?/g) || [t], narrow = innerWidth < 560, lim = narrow ? 17 : 34; let line = "", out = [];
    for (const p of parts) { if (line && (line + p).length > lim) { out.push(line); line = p; } else line += p; } if (line) out.push(line);
    return out.map(l => `<span style="display:inline-block">${esc(l)}</span>`).join(narrow ? "<br>" : "");
  };
  const say = (text, hold) => { queue.push([text, hold ?? clamp(1.6 + text.length * .085, 2.6, 7.5)]); };
  const sayNow = (text, hold) => { queue.length = 0; capT = 0; capOn = false; cap.classList.remove("on"); say(text, hold); };
  const capTick = dt => {
    if (capOn) { capT -= dt; if (capT <= 0) { capOn = false; cap.classList.remove("on"); capT = -.55; } return; }
    if (capT < 0) { capT += dt; return; }
    if (!queue.length) return;
    const [t, h] = queue.shift(); cap.innerHTML = capHTML(t); cap.classList.add("on"); capOn = true; capT = h;
    aoiRef?.talk?.({ dur: Math.min(h, 4.5) });
  };

  // ───────── 軸と視点
  let abs = o.abs0 ?? 0, absT = abs, yaw = 0, yawT = 0; AW.uAbs.value = abs;
  const rig = o.rig || ((a, y) => {
    const h = lerp(1.55, 11, ss(0, 1, a)), back = lerp(6, 19, ss(0, 1, a));
    return { pos: new THREE.Vector3(Math.sin(y) * back, h, Math.cos(y) * back + 0), look: new THREE.Vector3(0, lerp(1.4, .2, a), lerp(-6, -4, a)) };
  });

  // ───────── 触れる
  const touch = [], ray = new THREE.Raycaster(), nd = new THREE.Vector2();
  const addTouch = (obj, fn, r = .6) => {   // 当たりは見えない球（小さな生き物にも指が届く）
    const h = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); h.scale.setScalar(r); h.userData.fn = fn; h.userData.follow = obj;
    scene.add(h); touch.push(h); return h;
  };
  let onTapEmpty = null, onAbs = null, firstInput = null;
  const pick = (x, y) => {
    nd.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(nd, camera);
    const hit = ray.intersectObjects(touch, false)[0]; if (hit) { hit.object.userData.fn(hit); return true; }
    // 当たりのそばを押したときも拾う（画面の上で 44px 以内）
    let best = null, bd = 44 * 44; const v = new THREE.Vector3();
    for (const h of touch) { v.copy(h.position).project(camera); if (v.z > 1) continue; const sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight, d = (sx - x) ** 2 + (sy - y) ** 2; if (d < bd) { bd = d; best = h; } }
    if (best) { best.userData.fn({ object: best, point: best.position.clone() }); return true; }
    return false;
  };
  let down = null;
  canvas.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, a: absT, yw: yawT, t: performance.now(), moved: false }; try { canvas.setPointerCapture?.(e.pointerId); } catch (_) { } firstInput?.(); });
  canvas.addEventListener("pointermove", e => {
    if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!down.moved && dx * dx + dy * dy > 81) down.moved = true;
    if (down.moved) { absT = clamp(down.a - dy / (innerHeight * .62), 0, 1); yawT = clamp(down.yw - dx / innerWidth * 1.1, -.55, .55); }
  });
  const up = e => { if (!down) return; const d = down; down = null; if (!d.moved && performance.now() - d.t < 600) { if (!pick(e.clientX, e.clientY)) onTapEmpty?.(e); } };
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", () => { down = null; });
  addEventListener("wheel", e => { absT = clamp(absT + e.deltaY * .0011, 0, 1); firstInput?.(); }, { passive: true });
  addEventListener("keydown", e => { if (e.key === "ArrowUp") absT = clamp(absT + .1, 0, 1); if (e.key === "ArrowDown") absT = clamp(absT - .1, 0, 1); if (e.key === "ArrowLeft") yawT = clamp(yawT + .1, -.55, .55); if (e.key === "ArrowRight") yawT = clamp(yawT - .1, -.55, .55); });
  // 軸そのものをなぞってもよい
  axisEl.addEventListener("pointerdown", e => { const r = axisEl.querySelector(".aw-line").getBoundingClientRect(); const f = q => { absT = clamp(1 - (q.clientY - r.top) / r.height, 0, 1); }; f(e); const mv = ev => f(ev), u2 = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", u2); }; addEventListener("pointermove", mv); addEventListener("pointerup", u2); firstInput?.(); });

  // ───────── 毎こま
  let focT = null, focK = 0, focUntil = 0; const focP = new THREE.Vector3();
  const frames = [], readyFns = []; let last = performance.now(), t = 0, firstFrame = 0, fpsN = 0, fpsT = 0, fps = 60;
  const tmpC = new THREE.Color();
  const loop = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
    abs += (absT - abs) * (1 - Math.exp(-dt * (RM ? 30 : 3.2))); yaw += (yawT - yaw) * (1 - Math.exp(-dt * 3));
    AW.uAbs.value = abs; AW.uTime.value = t; WIND.uTime.value = RM ? 0 : t;
    scene.fog.color.copy(abs < .35 ? tmpC.copy(HAZE).lerp(GREY, ss(0, .35, abs)) : tmpC.copy(GREY).lerp(NAVY, ss(.35, .8, abs)));   // 霞 → 冷たい灰 → 紺（あいだで泥の色にならない）
    scene.fog.near = lerp(6, 40, abs); scene.fog.far = lerp(120, 170, abs); grassUp?.(camera.position, dt); scene.background.copy(scene.fog.color);   // 11-06 二版の後：注釈の後ろに入って効いていなかった（草が 0 本・霞が変わらない）のを直した
    hemi.intensity = lerp(1.22, .5, abs);   // 具体の影を少し浅く（木陰の斑が迷彩に見えない）
    sun.intensity = lerp(1.9, .6, abs);   // 木陰の斑が迷彩に見えないよう、日をやや弱く
    for (const m of FADERS) { const f = m.userData.fade; m.opacity = f.max * bandK(f.band, abs); m.visible = m.opacity > .003; }
    const r = rig(abs, yaw, t); const sway = RM ? 0 : 1;
    focK += ((focT ? 1 : 0) - focK) * (1 - Math.exp(-dt * 1.6)); if (focT) { focP.lerp(focT, 1 - Math.exp(-dt * 3)); if (t > focUntil) focT = null; } if (focK > .001) { r.look.lerp(focP, focK * .45 * (1 - abs)); r.pos.lerp(focP.clone().add(r.pos.clone().sub(focP).multiplyScalar(.45)), focK * .6 * (1 - abs)); }
    if (camera.aspect < .8) r.pos.sub(r.look).multiplyScalar(lerp(1, o.portrait ?? 1.6, clamp((.8 - camera.aspect) / .34, 0, 1) * (1 - ss(.2, .8, abs)))).add(r.look);   // 縦長の画面は一歩引いて、横の広がりを入れる
    camera.position.copy(r.pos).add(new THREE.Vector3(Math.sin(t * .21) * .05 * sway, Math.sin(t * .37) * .025 * sway, 0)); camera.lookAt(r.look);
    knob.style.top = ((1 - abs) * 100).toFixed(2) + "%";
    for (const h of touch) { const f = h.userData.follow; if (f?.getWorldPosition) f.getWorldPosition(h.position); }
    capTick(dt); onAbs?.(abs);
    for (const f of frames) f(dt, t, abs);
    renderer.render(scene, camera);
    fit.frame(dt * 1000);
    if (!firstFrame) { firstFrame = performance.now() - T0; window.__awai.first = Math.round(firstFrame); document.documentElement.classList.add("aw-ready");
      setTimeout(() => renderer.compileAsync(pending, camera, scene).catch(() => {}).then(() => { while (pending.children.length) scene.add(pending.children[0]); window.__awai.full = Math.round(performance.now() - T0); readyFns.forEach(f => f()); }), 30); }
    fpsN++; fpsT += dt; if (fpsT > 1) { fps = fpsN / fpsT; fpsN = 0; fpsT = 0; window.__awai.fps = Math.round(fps); }
    requestAnimationFrame(loop);
  };
  window.__awai = { t0: Math.round(T0) };

  // 碧：最初の絵のあとで読む（起動を軽く）。抽象の側でも碧だけは姿のまま＝二つのあいだに立つ
  const aoiP = new Promise(res => {
    if (!o.aoi) return res(null);
    const go = async () => {
      try {
        const { loadAoi } = await import("./aoi.js");
        const a = await loadAoi(o.aoi, { scene, renderer, camera, quality: MOBILE ? "low" : "auto" });
        if (MOBILE) a.root.traverse(m => { if (m.isMesh) for (const mt of [].concat(m.material)) if (mt.isOutline) mt.visible = false; });   // スマホは輪郭線の描画を省く（小さな画面では見分けがつかない・描画が 18 回減る）
        const p = o.aoiAt || [1.4, -1.2, -.4]; a.place(p[0], p[1], p[2]); aoiRef = a; frames.push(dt => a.tick(dt, camera)); window.__awai.aoi = Math.round(performance.now() - T0); res(a);
      } catch (e) { console.warn("碧の読み込みを見送りました", e); res(null); }
    };
    setTimeout(go, 350);
  });

  mk("built"); requestAnimationFrame(loop);
  return {
    THREE, scene, camera, renderer, world, sun, R, pathX, tex, near,
    say, sayNow, addTouch, aoi: aoiP, get abs() { return abs; }, setAbs(v, now) { absT = clamp(v, 0, 1); if (now) abs = absT; },
    get absTarget() { return absT; }, get yaw() { return yaw; },
    focus(v, sec = 6) { focT = v.clone(); if (focK < .01) focP.copy(v); focUntil = t + sec; },
    onFrame(f) { frames.push(f); }, add(obj) { pending.add(obj); return obj; }, onReady(f) { readyFns.push(f); }, onTapEmpty(f) { onTapEmpty = f; }, onAbs(f) { onAbs = f; }, onFirstInput(f) { firstInput = f; },
    sndBtn, ui, MOBILE, RM,
  };
}

// ───────── 字幕と画面の部品の見た目（tokens と同じ値）。index.html の <style> の代わりに一度だけ入れる
export const AWAI_CSS = `
:root{--aw-ink:#eef5fb;--aw-soft:#c3cce0;--aw-note:#8f9bb4;--aw-aoi:#5cc8e0;--aw-aoi2:#9bdcf0}
html,body{margin:0;height:100%;overflow:hidden;background:#cfd5d2;-webkit-user-select:none;user-select:none;touch-action:none;-webkit-tap-highlight-color:transparent}
#cv{position:fixed;inset:0;width:100%;height:100%;display:block;cursor:grab}
#aw-ui::before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse 75% 70% at 50% 46%,rgba(3,5,12,0) 58%,rgba(3,5,12,.34) 100%)}
#aw-ui{position:fixed;inset:0;pointer-events:none;font-family:"Shippori Mincho","Hiragino Mincho ProN","Yu Mincho",serif;color:var(--aw-ink)}
.aw-mark{padding:6px 10px 7px;margin:-6px 0 0 -10px;background:radial-gradient(ellipse at 30% 50%,rgba(3,6,15,.32),rgba(3,6,15,0) 72%);position:absolute;left:max(16px,env(safe-area-inset-left));top:calc(14px + env(safe-area-inset-top));display:flex;flex-direction:column;gap:3px;text-shadow:0 0 10px rgba(0,0,0,.35)}
.aw-mark b{font-weight:600;font-size:16px;letter-spacing:.08em;text-shadow:0 0 10px rgba(20,24,30,.6),0 0 2px rgba(20,24,30,.5)}
.aw-mark .aw-sub{font-size:12px;letter-spacing:.22em;color:var(--aw-ink);opacity:.86;text-shadow:0 0 8px rgba(20,24,30,.55)}
.aw-mark i{font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--aw-ink);opacity:.88;text-shadow:0 0 2px rgba(2,4,10,.95),0 0 8px rgba(2,4,10,.8)}   /* 明るい空の上でも英題が読める */
.aw-axis{position:absolute;right:max(14px,env(safe-area-inset-right));top:50%;transform:translateY(-50%);height:min(46vh,360px);width:44px;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:auto;cursor:ns-resize}
.aw-axis span{font-size:11px;letter-spacing:.3em;writing-mode:vertical-rl;color:var(--aw-ink);text-shadow:0 0 2px rgba(0,0,0,1),0 0 5px rgba(0,0,0,.95),0 0 12px rgba(0,0,0,.8)}   /* 幹や空の上でも、文字の影で読める（下地の帯は付けない） */
.aw-line{flex:1;position:relative;width:1px;background:linear-gradient(rgba(155,220,240,.0),rgba(155,220,240,.55) 12%,rgba(155,220,240,.55) 88%,rgba(155,220,240,0));writing-mode:horizontal-tb!important}
.aw-line em{position:absolute;left:50%;width:9px;height:9px;margin:-5px 0 0 -5px;border:1px solid var(--aw-aoi2);border-radius:50%;background:rgba(6,10,18,.4);box-shadow:0 0 0 4px rgba(155,220,240,.08)}
.aw-cap{text-wrap:balance;word-break:auto-phrase;line-break:strict;position:absolute;left:50%;bottom:calc(30px + env(safe-area-inset-bottom));transform:translateX(-50%);margin:0;width:min(86vw,640px);text-align:center;font-size:15px;line-height:1.85;letter-spacing:.06em;padding:10px 18px;text-shadow:0 0 2px rgba(2,4,10,1),0 0 5px rgba(2,4,10,.95),0 0 12px rgba(2,4,10,.9),0 0 26px rgba(2,4,10,.7);opacity:0;transition:opacity .7s ease;
 background:radial-gradient(ellipse at center,rgba(3,6,15,.36) 0%,rgba(3,6,15,.15) 55%,rgba(3,6,15,0) 80%)}   /* 帯に見えない、ごく薄いにじみだけ。読ませるのは文字の影 */
.aw-cap.on{opacity:1}
.aw-snd{position:absolute;right:max(14px,env(safe-area-inset-right));top:calc(10px + env(safe-area-inset-top));pointer-events:auto;min-width:44px;height:44px;background:none;border:0;color:var(--aw-soft);font:inherit;font-size:12px;letter-spacing:.2em;cursor:pointer;text-decoration:line-through;text-decoration-color:rgba(195,204,224,.6);text-shadow:0 0 8px rgba(0,0,0,.4)}
.aw-snd[aria-pressed="true"]{text-decoration:none;color:var(--aw-ink)}
.aw-fold{position:absolute;right:max(14px,env(safe-area-inset-right));bottom:calc(8px + env(safe-area-inset-bottom));pointer-events:auto;max-width:min(78vw,420px);font-family:Inter,"Hiragino Sans",sans-serif;font-size:11px;line-height:1.7;color:var(--aw-soft);text-align:right}
.aw-fold summary{list-style:none;cursor:pointer;width:44px;height:44px;margin-left:auto;display:grid;place-items:center;font-size:16px;color:var(--aw-soft);text-shadow:0 0 8px rgba(0,0,0,.4)}
.aw-fold summary::-webkit-details-marker{display:none}
.aw-fold div{background:rgba(6,10,18,.78);border:1px solid rgba(150,170,240,.18);border-radius:2px;padding:10px 14px;text-align:left;max-height:50vh;overflow:auto;margin-bottom:4px}
.aw-fold p{margin:.2em 0}
#aw-ld{position:fixed;inset:0;background:#cfd5d2;transition:opacity .9s ease;pointer-events:none;z-index:5}
.aw-ready #aw-ld{opacity:0}
@media (max-width:520px){.aw-cap{font-size:14px;bottom:calc(22px + env(safe-area-inset-bottom));width:calc(100vw - 92px);left:calc(50% - 22px)}.aw-axis{height:38vh}.aw-fold{max-width:calc(100vw - 32px)}}
@media (prefers-reduced-motion:reduce){.aw-cap{transition:none}}
`;
export function injectCSS() { const s = document.createElement("style"); s.textContent = AWAI_CSS; document.head.appendChild(s); }
