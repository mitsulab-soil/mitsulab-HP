/* sight_land.js ── 共通部品の地（樹・地面・空）を Qualia/sight の写実にそろえる（2026-11-10 本人「作り直す」）
   90 点への周回の 5 人に共通した指摘：①樹が同じ形の繰り返し ②地面が平らな面 ③霧と空が単色。
   どれも材質の shader に式を足すだけ（描画回数・頂点・テクスチャは増えない＝起動とスマホの軽さを保つ）。
   色は自然の色だけ（土・苔・枯れ草・樹皮の幅の中で揺らす。作った色を足さない）。
   使い方：
     import { installSkyFog, treeVariety, landTint, groundMottle } from ".../kit/sight_land.js";
     installSkyFog(THREE, { sun: dirVec3 })   // どの材質を作るより前に一度。霞の色を、地平は明るく・太陽の側は暖かく・上は青く
     treeVariety(m4, pos, rotY, s, seed)      // 一本ずつ、幅・高さ・傾きを変えた行列（同じ形の繰り返しを崩す）
     landTint(mat, { amt: .12 })              // InstancedMesh の材質：一本ずつ明るさと緑〜黄の幅をずらす
     groundMottle(mat, { relief: !mobile })   // 地面：4〜40 m の土・苔・枯れ草のむら、PC は凹凸の陰も */

/* ③ 霞と空。霞の色を見る向きで変える＝地平の明るい帯・太陽の側の暖かさ・上の青み。
   全ての材質の fog の部品を差し替える（一度だけ）。太陽の向きは起動時の値（30 分ほどで変わる程度の差は霞では見分けられない） */
export function installSkyFog(THREE, o = {}) {
  const C = THREE.ShaderChunk; if (C.__sightSkyFog) return; C.__sightSkyFog = 1;
  if (!C.fog_vertex.includes("#ifdef USE_FOG") || !C.fog_fragment.includes("gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );")) return;   // 目印がなければ何もしない
  const s = (o.sun || new THREE.Vector3(.4, .6, .3)).clone().normalize(); const f = v => v.toFixed(4);
  C.fog_pars_vertex = C.fog_pars_vertex.replace("#ifdef USE_FOG", "#ifdef USE_FOG\n\tvarying vec3 vSkyDir;");
  C.fog_vertex = C.fog_vertex.replace("#ifdef USE_FOG", "#ifdef USE_FOG\n\tvSkyDir = transpose( mat3( viewMatrix ) ) * mvPosition.xyz;");
  C.fog_pars_fragment = C.fog_pars_fragment.replace("#ifdef USE_FOG", "#ifdef USE_FOG\n\tvarying vec3 vSkyDir;");
  C.fog_fragment = C.fog_fragment.replace("gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );", `vec3 qD = normalize( vSkyDir ); float qE = qD.y; float qS = max( dot( qD, vec3( ${f(s.x)}, ${f(s.y)}, ${f(s.z)} ) ), 0. );
	float qL = dot( fogColor, vec3( .333 ) );
	vec3 qC = fogColor * mix( 1.07, .9, smoothstep( 0., .35, qE ) );            /* 地平は明るく、上へ行くほど深く */
	qC = mix( qC, qL * vec3( .82, .93, 1.1 ), .3 * smoothstep( .02, .4, qE ) );  /* 上は空の青み（彩度は霞の低さのまま） */
	qC += qL * vec3( .16, .1, .02 ) * pow( qS, 6. ) * ( 1. - smoothstep( .2, .6, qE ) );   /* 太陽の側の地平は暖かい */
	qC = mix( qC, qC * vec3( .95, .97, 1. ), smoothstep( -.02, -.25, qE ) );    /* 見下ろす霞は少し冷たく */
	gl_FragColor.rgb = mix( gl_FragColor.rgb, qC, fogFactor );`);
}

/* 決まった種からの 0〜1（同じ木はいつも同じ形） */
export function hash1(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

/* ① 一本ずつの形。幅 ±14%・高さ ±12%・傾き 3.5° まで（実際の並木の個体差の範囲で、倒れて見えない） */
const _q1 = { a: null, b: null };
export function treeVariety(THREE, m4, pos, rotY, s, seed) {
  const a = hash1(seed), b = hash1(seed + 17.3), c = hash1(seed + 41.9), d = hash1(seed + 73.1);
  const w = s * (.86 + .28 * a), h = s * (.88 + .24 * b), lean = (c - .5) * .12, dir = d * 6.2832;
  _q1.a ||= new THREE.Quaternion(); _q1.b ||= new THREE.Quaternion(); _q1.ax ||= new THREE.Vector3(); _q1.sc ||= new THREE.Vector3(); _q1.up ||= new THREE.Vector3(0, 1, 0);
  _q1.a.setFromAxisAngle(_q1.ax.set(Math.cos(dir), 0, Math.sin(dir)), lean); _q1.b.setFromAxisAngle(_q1.up, rotY); _q1.a.multiply(_q1.b);
  return m4.compose(pos, _q1.a, _q1.sc.set(w, h, w));
}

/* ① 一本ずつの色。インスタンスの根もとの位置から種を取り、明るさ（±amt）と緑〜黄の幅をずらす。葉にも幹にも使える */
export function landTint(m, o = {}) {
  if (!m || m.userData.landTint) return m; m.userData.landTint = true;
  const amt = (o.amt ?? .12).toFixed(3), prev = m.onBeforeCompile;
  m.onBeforeCompile = function (sh, r) { prev?.call(this, sh, r);
    if (!sh.vertexShader.includes("#include <begin_vertex>")) return;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying float vLandH;").replace("#include <begin_vertex>", `#include <begin_vertex>
#ifdef USE_INSTANCING
{ vec3 o_ = instanceMatrix[3].xyz; vLandH = fract( sin( dot( floor( o_.xz * 2. ), vec2( 12.99, 78.23 ) ) ) * 43758.55 ); }
#else
vLandH = .5;
#endif`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vLandH;").replace("#include <color_fragment>", `#include <color_fragment>
{ float h_ = vLandH - .5; diffuseColor.rgb *= 1. + h_ * 2. * ${amt}; diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 1.06, 1.02, .86 ), max( fract( vLandH * 7.31 ) - .55, 0. ) * 1.4 ); }`);
  };
  const k0 = m.customProgramCacheKey; m.customProgramCacheKey = function () { return (k0 ? k0.call(this) : "") + "|landTint"; };
  m.needsUpdate = true; return m;
}

/* ② 地面のむら。4〜40 m の大きさで、土（暗く暖かい）・苔（暗い緑）・枯れ草（明るい黄土）を重ねる。
   relief＝PC だけ、同じ式の傾きで法線を曲げて凹凸の陰を付ける（近く 30 m まで） */
export function groundMottle(m, o = {}) {
  if (!m || m.userData.groundMottle) return m; m.userData.groundMottle = true;
  const relief = !!o.relief, k = (o.k ?? 1).toFixed(3), prev = m.onBeforeCompile;
  m.onBeforeCompile = function (sh, r) { prev?.call(this, sh, r);
    if (!sh.vertexShader.includes("#include <worldpos_vertex>")) return;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vGmW;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvGmW = ( modelMatrix * vec4( transformed, 1. ) ).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vGmW; float gmH( vec2 p ){ return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.55 ); }
float gmN( vec2 p ){ vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3. - 2. * f ); return mix( mix( gmH( i ), gmH( i + vec2( 1, 0 ) ), f.x ), mix( gmH( i + vec2( 0, 1 ) ), gmH( i + vec2( 1, 1 ) ), f.x ), f.y ); }
float gmF( vec2 p ){ return gmN( p * .025 ) * .5 + gmN( p * .09 + 3.1 ) * .3 + gmN( p * .27 - 7.7 ) * .2; }
float gmRel = 0.;`).replace("#include <color_fragment>", `#include <color_fragment>
{ vec2 p_ = vGmW.xz; float a_ = gmF( p_ ), b_ = gmN( p_ * .06 + 11.3 ), d_ = length( vGmW - cameraPosition );
  float wet_ = smoothstep( .45, .2, a_ ), dry_ = smoothstep( .55, .8, a_ ) * ( 1. - b_ * .6 ), moss_ = smoothstep( .6, .85, b_ ) * ( 1. - dry_ );
  vec3 c_ = diffuseColor.rgb;
  c_ = mix( c_, c_ * vec3( .78, .74, .7 ), wet_ * .55 * ${k} );          /* 湿った土：暗く */
  c_ = mix( c_, c_ * vec3( 1.16, 1.1, .9 ), dry_ * .45 * ${k} );         /* 乾いた所・枯れ草：明るい黄土 */
  c_ = mix( c_, c_ * vec3( .84, .97, .78 ), moss_ * .35 * ${k} );        /* 苔：暗い緑 */
  c_ *= .94 + .12 * gmN( p_ * 1.3 );                                    /* 1 m ほどの細かい斑 */
  diffuseColor.rgb = mix( diffuseColor.rgb, c_, 1. - smoothstep( 300., 900., d_ ) );
  gmRel = ( a_ * .7 + gmN( p_ * .8 ) * .3 ) * ( 1. - smoothstep( 10., 30., d_ ) ); }`);
    if (relief) sh.fragmentShader = sh.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
{ vec3 sx_ = dFdx( -vViewPosition ), sy_ = dFdy( -vViewPosition ); vec3 r1_ = cross( sy_, normal ), r2_ = cross( normal, sx_ ); float det_ = dot( sx_, r1_ );
  if ( abs( det_ ) > 1e-10 ) { vec3 g_ = sign( det_ ) * ( dFdx( gmRel * .35 ) * r1_ + dFdy( gmRel * .35 ) * r2_ ); normal = normalize( abs( det_ ) * normal - g_ ); } }`);
  };
  const k0 = m.customProgramCacheKey; m.customProgramCacheKey = function () { return (k0 ? k0.call(this) : "") + "|gm" + (relief ? 1 : 0); };
  m.needsUpdate = true; return m;
}
