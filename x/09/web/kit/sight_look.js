/* sight の風景の質感（共通部品・2026-11-05）
   本人「Qualium について、Qualia/sight のような風景の質感がいいです。草や樹の感じ、カメラアングルなど全面的に Qualia/sight に近づけてください。」
   Qualia/sight（umwelt.js・nature.js・forest.js）から、質感を作っている所だけを取り出した部品。
   ①木もれ日：太陽の光だけを、上を向いた面で、葉の影のまだらに落とす（影の地図を使わない＝軽い）。霞が近くから掛かる見方（歩く）でだけ効く
   ②草：sight と同じ細い葉（幅 1.4 cm・根もと暗く先が明るい・先が反る）を株にして、近くの地面に散らす。風で揺れる（スマホは数を減らす）
   ③霞：sight の大気の色（#c8d4dc 系）を、近くから淡く掛ける
   ④目の高さ 1.55 m と、歩くときの上下の揺れ（sight の人：0.025 m・9 rad/s、立ち止まると 0.18 倍＝息づかい）
   使い方：import { installDapple, makeSightGrass, SIGHT_AIR, sightBob } from ".../sight_look.js"
   installDapple(THREE) はどの材質を作るより前に一度だけ呼ぶ。 */

export const SIGHT_AIR = { color: 0xc9d3d6, near: 4, far: 240 };   // sight の FogExp2(0xc8d4dc, .011) を、参道の長い見通しに合わせて線の霞に置きかえた値
export const SIGHT_EYE = 1.55, SIGHT_BOB = { amp: .025, freq: 9, still: .18 };
export function sightBob(t, moving) { return Math.sin(t * SIGHT_BOB.freq) * SIGHT_BOB.amp * (moving ? 1 : SIGHT_BOB.still); }

export const CANOPY = {};   // 11-11 樹冠の陰の絵（setCanopy で一度だけ焼く）
/* ① 木もれ日。霞の near が 50 m より手前のとき（歩く）だけ効く＝見方を切りかえるための値を別に持たない */
export function installDapple(THREE) {
  if (THREE.ShaderChunk.__sightDap) return; THREE.ShaderChunk.__sightDap = 1;
  const C = THREE.ShaderChunk, key = "getDirectionalLightInfo( directionalLight, directLight );";
  if (!C.lights_fragment_begin.includes(key)) return;   // 目印が見つからなければ何もしない
  if (!C.lights_pars_begin.includes("qCanT")) C.lights_pars_begin = "#define Q_CAN 1\nuniform sampler2D qCanT; uniform vec4 qCanB; uniform vec4 qCanS; uniform sampler2D qCanN; uniform vec4 qCanNB;\n" + C.lights_pars_begin;
  /* 樹冠の陰の絵は一つを全部の材質で共有する（材質ごとの写しを作らせない＝clone で自分を返す） */
  const keep = o => { o.clone = () => o; return o; };
  CANOPY.tex = keep(new THREE.DataTexture(new Uint8Array(4), 1, 1)); CANOPY.tex.needsUpdate = true; CANOPY.box = keep(new THREE.Vector4(0, 0, 0, 0)); CANOPY.sun = keep(new THREE.Vector4(1, 0, 1, 0)); CANOPY.ntex = keep(new THREE.DataTexture(new Uint8Array(4), 1, 1)); CANOPY.ntex.needsUpdate = true; CANOPY.nbox = keep(new THREE.Vector4(0, 0, 0, 0));
  for (const k of ["standard", "physical", "lambert", "phong"]) { const L = THREE.ShaderLib[k]; if (L) Object.assign(L.uniforms, { qCanT: { value: CANOPY.tex }, qCanB: { value: CANOPY.box }, qCanS: { value: CANOPY.sun }, qCanN: { value: CANOPY.ntex }, qCanNB: { value: CANOPY.nbox } }); }
  C.lights_fragment_begin = C.lights_fragment_begin.replace("#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )", `float qDap = 1.0;
#define Q_DAP 1
#if defined( USE_FOG ) && !defined( FOG_EXP2 ) && ( NUM_DIR_LIGHTS > 0 )
{ float on = 1.0 - smoothstep( 20.0, 50.0, fogNear );
  if ( on > 0.0 ) {
    vec3 wp = cameraPosition + transpose( mat3( viewMatrix ) ) * ( -vViewPosition );
    float dist = length( wp - cameraPosition );
    float up = smoothstep( .1, .7, dot( normal, normalize( mat3( viewMatrix ) * vec3( 0., 1., 0. ) ) ) );
    float k = on * up * ( 1.0 - smoothstep( 45.0, 90.0, dist ) ) * ( 1.0 - smoothstep( 2.5, 6.0, wp.y - cameraPosition.y ) );
    if ( k > 0.0 ) {
      vec2 p = wp.xz * 1.25; vec2 q = p + vec2( sin( p.y * .7 ), cos( p.x * .6 ) ) * .8;
      float n = sin( q.x * 1.7 ) * sin( q.y * 1.9 ) + .55 * sin( q.x * 3.9 + q.y * 1.3 ) * sin( q.y * 3.3 - q.x * .8 ) + .3 * sin( q.x * 7.1 - 2. ) * sin( q.y * 6.7 + 1. );
      vec2 pb = wp.xz * .42 + vec2( 3.1, 1.7 ); float nb = sin( pb.x * 1.3 + sin( pb.y * .9 ) ) * sin( pb.y * 1.5 - .7 ) + .4 * sin( pb.x * 2.9 - pb.y * 1.1 );
      float cov = smoothstep( .25, .75, nb * .5 + .5 );
      float qGap = -1.;
      if ( qCanB.w > 0.5 ) {   /* 11-11 採点 2 人「陰が木の位置から落ちていない・斑が型押し」：並木の位置と日の向きから焼いた樹冠の陰の絵（R＝陰の濃さ・G＝葉の透き間の大きさ） */
        vec2 cu = ( wp.xz - qCanB.xy ) * qCanB.z; vec4 ct = texture2D( qCanT, cu );
        float inB = step( 0., cu.x ) * step( cu.x, 1. ) * step( 0., cu.y ) * step( cu.y, 1. );
        cov = inB * smoothstep( .08, .7, ct.r + ( n * .5 + .5 - .5 ) * .18 ); qGap = ct.g;
      }   /* 11-10 採点 P2「舗装の陰がまだら」：樹冠の大きな影（cov）の中に、丸くやわらかな光の斑（葉の透き間の像）だけが落ちる */
      vec2 pc = wp.xz * 1.6 + vec2( sin( wp.z * .37 ), cos( wp.x * .41 ) ) * .6; vec2 cc = floor( pc ); vec2 fc = fract( pc ) - .5; float hh = fract( sin( dot( mod( cc, 251. ), vec2( 12.99, 78.23 ) ) ) * 43758.5 );
      vec2 off = vec2( fract( hh * 7.1 ), fract( hh * 3.7 ) ) - .5; vec2 dd = ( fc - off * .8 ) * vec2( 1., 1.35 ); float spot = ( 1. - smoothstep( .04 + .06 * hh, .18 + .16 * fract( hh * 13.7 ), length( dd ) ) ) * step( .58, hh ) * ( .55 + .45 * fract( hh * 5.3 ) );
      if ( qGap >= 0. ) {   /* 斑＝葉の透き間を通った日の像：日の向きに伸びた楕円・大きさは透き間の大きさ（G）と升ごとの乱れで大小、二つの格子を回して重ね型押しに見せない */
        vec2 sd = normalize( qCanS.xy + vec2( 1e-4 ) ); vec2 so = vec2( -sd.y, sd.x ); vec2 lp = vec2( dot( wp.xz, sd ) / qCanS.z, dot( wp.xz, so ) );
        float sc1 = mix( 2.6, 1.1, qGap ); spot = 0.;
        for ( int L = 0; L < 2; L++ ) {
          float fl = float( L ); vec2 rp = lp * ( sc1 * ( 1. + fl * .83 ) ) + vec2( fl * 3.7, fl * 1.9 ) + vec2( sin( lp.y * .9 + fl ), cos( lp.x * .8 ) ) * .35;
          vec2 c2 = floor( rp ); vec2 f2 = fract( rp ) - .5; float h2 = fract( sin( dot( mod( c2, 251. ) + fl * 17., vec2( 12.99, 78.23 ) ) ) * 43758.5 );
          vec2 o2 = vec2( fract( h2 * 7.1 ), fract( h2 * 3.7 ) ) - .5; float rr = mix( .05, .3, pow( fract( h2 * 13.7 ), 2.2 ) ) * ( .6 + .7 * qGap );
          float on2 = step( mix( .78, .45, qGap ) + fl * .08, h2 );
          /* 11-11 採点 3 人「スマホで路面に白い擦り傷の線」：寝た角度で斑が画面の縦に潰れて細い線になる→画面で見た斑の大きさ（fwidth）が斑より大きいほど、斑を濃淡のむら（その升の平均の明るさ）に置きかえる */
          float pxv = max( fwidth( rp.x ), fwidth( rp.y ) ), far = smoothstep( .05, .2, pxv / rr ), sp1 = ( 1. - smoothstep( rr * .55, rr, length( f2 - o2 * .5 ) ) ) * on2 * ( .7 + .3 * fract( h2 * 5.3 ) );
          spot = max( spot, mix( sp1, .07 + .06 * ( n * .5 + .5 ), far )   /* 11-11 遠くの升ごとの明るさは波打つ縞（大理石の模様）に見えた→升に依らない淡いむらだけにする */ );
        }
        float lit2 = ( 1. - cov ) + cov * spot * 1.25;
        if ( qCanNB.w > 0.5 ) {   /* 11-11 歩く人のまわり 60 m：0.1 m／画素で焼いた陰と葉の透き間の斑（R＝陰・G＝斑）。絵の縮小に任せるので寝た角度でも線にならない。縁の 12 m で遠くの陰へ溶かす */
          vec2 nu = ( wp.xz - qCanNB.xy ) * qCanNB.z; vec4 cn = texture2D( qCanN, nu );
          vec2 ne = min( nu, 1. - nu ); float wN = smoothstep( 0., .1, min( ne.x, ne.y ) );
          float litN = ( 1. - cn.r ) + cn.r * cn.g * 1.3;
          lit2 = mix( lit2, litN, wN );
        }
        qDap = mix( 1.0, .1 + 1.0 * lit2, k );
      } else {
      float lit = mix( 1., .0, cov ) + cov * spot * .95 + ( 1. - cov ) * .0 + smoothstep( .45, .9, n * .5 + .5 ) * .25 * cov;   // 11-05 斑を大小まぜ、ふちをぼかす（大きな葉の塊の影＋小さな葉の透き間）
      qDap = mix( 1.0, .12 + 1.05 * lit, k );
      }
    }
  }
}
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )`).replace(key, key + "\n\t\tdirectLight.color *= qDap;");
  /* 11-10：木漏れ日が舗装に写らなかった（日の光より空の光が強く、日の光だけ斑にしても見えない）→ 樹冠の陰では空の光も少し落とす */
  /* 11-11 採点「参道の奥に白い光の柱」：霞が満ちきる奥（並木の透き間の先）が霞の色そのもので白く抜けた→歩くとき（霞の手前が近い）だけ、奥の霞を並木の陰の空気の色へ少し沈める。?hz=0 で前 */
  if (!/[?&]hz=0/.test(location.search) && C.fog_fragment.indexOf("qHz") < 0) C.fog_fragment = C.fog_fragment.replace("gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );", "vec3 qHz = fogColor * mix( 1., .8, ( 1. - smoothstep( 20., 50., fogNear ) ) * smoothstep( 140., 520., vFogDepth ) ); gl_FragColor.rgb = mix( gl_FragColor.rgb, qHz, fogFactor );");
  /* 11-11 採点「陰の中の舗装に擦れの筋」：材質の地の絵の白い擦れが、陰の中では日なたより目立った→樹冠の陰の中だけ、地の絵を細かい模様の平均（mip の奥）へ寄せてコントラストを下げる。?pv=0 で前 */
  if (!/[?&]pv=0/.test(location.search) && C.map_fragment.indexOf("qMv") < 0) C.map_fragment = C.map_fragment + `
#if defined( USE_MAP ) && defined( USE_FOG ) && defined( Q_CAN )
if ( qCanB.w > .5 && fogNear < 50. ) { vec3 qMw = cameraPosition + transpose( mat3( viewMatrix ) ) * ( -vViewPosition ); vec2 qMu = ( qMw.xz - qCanB.xy ) * qCanB.z;
  float qMv = texture2D( qCanT, qMu ).r * step( 0., qMu.x ) * step( qMu.x, 1. ) * step( 0., qMu.y ) * step( qMu.y, 1. ) * ( 1. - smoothstep( 1.5, 4., qMw.y - cameraPosition.y + 1.5 ) );
  if ( qMv > .05 ) { vec3 qMa = texture2D( map, vMapUv, 6. ).rgb; diffuseColor.rgb *= mix( vec3( 1. ), clamp( qMa / max( sampledDiffuseColor.rgb, vec3( .03 ) ), vec3( .55 ), vec3( 1.12 ) ), smoothstep( .2, .7, qMv ) * .5 ); } }
#endif
`;
  if (C.lights_fragment_end.indexOf("qDapI") < 0) C.lights_fragment_end = C.lights_fragment_end + "\n#ifdef Q_DAP\n{ float qDapI = clamp( qDap, 0., 1. ); reflectedLight.indirectDiffuse *= .45 + .55 * qDapI; reflectedLight.indirectSpecular *= .25 + .75 * qDapI; }   /* 11-11 陰の中の舗装の擦れの筋＝空の照り返し：樹冠が空を覆う所では照り返しも落とす */\n#endif\n";
}

/* ①' 樹冠の陰を焼く。trees＝[{x, z, R（樹冠の半径 m）, h（樹冠の中心の高さ m）, gap（0〜1 葉の透き間）}]、sun＝日の向き（単位ベクトル）。
   樹冠を日の向きに地面へ投げ、日の高さに応じて伸ばした楕円で塗る。R＝陰の濃さ、G＝透き間の大きさ */
export function setCanopy(THREE, trees, sun, { mobile = false } = {}) {
  if (!CANOPY.tex || !trees.length) return;
  const el = Math.max(.5, Math.min(1, sun.y)), sh = Math.hypot(sun.x, sun.z) || 1, dx = -sun.x / sh, dz = -sun.z / sh, elong = Math.min(5, 1 / el), tn = Math.sqrt(1 - el * el) / el;   // 高度は 30 度より下げない（低い日は樹冠の下をくぐり、絵では陰が道から外れて木の下が明るく見えるため。向きは実際の日のまま）。球の樹冠（高さ h・半径 R）の陰＝中心 h/tan(高度)、日の向きに R/sin(高度) の楕円
  const P = trees.map(t => { const off = t.h * tn; return { x: t.x + dx * off, z: t.z + dz * off, R: t.R, g: t.gap }; });
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of P) { const r = p.R * elong + 2; x0 = Math.min(x0, p.x - r); x1 = Math.max(x1, p.x + r); z0 = Math.min(z0, p.z - r); z1 = Math.max(z1, p.z + r); }
  const span = Math.max(x1 - x0, z1 - z0), N = mobile ? 1024 : 2048, mpp = Math.max(mobile ? .9 : .5, span / N), W = Math.ceil(span / mpp);
  const cov = new Float32Array(W * W), gap = new Float32Array(W * W), wsum = new Float32Array(W * W);
  for (const p of P) {
    const ra = p.R * elong, rb = p.R, r = ra + 1, i0 = Math.max(0, Math.floor((p.x - r - x0) / mpp)), i1 = Math.min(W - 1, Math.ceil((p.x + r - x0) / mpp)), j0 = Math.max(0, Math.floor((p.z - r - z0) / mpp)), j1 = Math.min(W - 1, Math.ceil((p.z + r - z0) / mpp));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const wx = x0 + (i + .5) * mpp - p.x, wz = z0 + (j + .5) * mpp - p.z, a = wx * dx + wz * dz, b = -wx * dz + wz * dx, an = Math.atan2(b, a);
      const edge = 1 + .12 * Math.sin(an * 5 + p.x) + .07 * Math.sin(an * 11 + p.z), d = Math.hypot(a / ra, b / rb) / edge; if (d >= 1.15) continue;
      const v = Math.max(0, Math.min(1, (1.15 - d) / .45)) * .92, o = j * W + i; cov[o] = 1 - (1 - cov[o]) * (1 - v); gap[o] += p.g * v; wsum[o] += v;
    }
  }
  const D = new Uint8Array(W * W * 4); for (let o = 0; o < W * W; o++) { D[o * 4] = Math.min(255, cov[o] * 255); D[o * 4 + 1] = wsum[o] > 0 ? Math.min(255, gap[o] / wsum[o] * 255) : 0; D[o * 4 + 3] = 255; }
  const T = CANOPY.tex; T.dispose(); T.image = { data: D, width: W, height: W }; T.magFilter = T.minFilter = THREE.LinearFilter; T.generateMipmaps = false; T.wrapS = T.wrapT = THREE.ClampToEdgeWrapping; T.needsUpdate = true;
  CANOPY.box.set(x0, z0, 1 / span, 1); CANOPY.sun.set(-dx, -dz, Math.min(2, elong), 0);
  CANOPY.P = P; CANOPY.el = { dx, dz, elong }; CANOPY.mobile = mobile; CANOPY.nx = 1e9; CANOPY.nz = 1e9;
  return { W, mpp };
}

/* ② 草（sight の nature.js makeGrass と同じ葉の形・色の幅）。anchors＝[x, y, z] の並び（植え込み・下草の位置）。
   近くの anchors のまわりにだけ株を並べ、8 m 動くごとに並べ直す */
export function makeSightGrass(THREE, parent, { anchors, mobile = false, reduced = false, spread = .95 }) {
  const TAU = Math.PI * 2, R = mobile ? 26 : 42, CAP = mobile ? 2400 : 6000, PER = mobile ? 3 : 6;
  // 一株＝細い葉 9 枚（sight：幅 .014・長さ .26・先が反る・頂点の色で根もと暗く）
  const blades = [], b0 = new THREE.PlaneGeometry(.016, .3, 1, 3); b0.translate(0, .15, 0);
  { const p = b0.attributes.position, col = []; for (let i = 0; i < p.count; i++) { const y = p.getY(i), t = y / .3; if (t > .99) p.setX(i, 0); p.setZ(i, .07 * t * t); const c = .35 + .75 * t; col.push(c, c, c); } b0.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); }
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const P = [], C = [], I = []; let base = 0;
  for (let j = 0; j < 9; j++) {
    const g = b0.clone(), a = rnd() * TAU, r = rnd() * .16, sc = .6 + rnd() * .8;
    g.scale(sc, sc * (.75 + rnd() * .6), sc); g.rotateX((rnd() - .5) * .5); g.rotateY(rnd() * TAU); g.translate(Math.cos(a) * r, 0, Math.sin(a) * r);
    const p = g.attributes.position, c = g.attributes.color; for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); C.push(c.getX(i), c.getY(i), c.getZ(i)); }
    const ix = g.index.array; for (const v of ix) I.push(v + base); base += p.count;
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(C, 3)); geo.setIndex(I); geo.computeVertexNormals();
  const time = { value: 0 };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .9, metalness: 0, envMapIntensity: .3 });
  mat.onBeforeCompile = sh => {   // sight の WIND を短くしたもの（株の位置ごとに位相をずらす）・葉を透ける光をわずかに
    sh.uniforms.gTime = time;
    if (!reduced) sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float gTime;").replace("#include <begin_vertex>", "#include <begin_vertex>\n{ vec3 ip = instanceMatrix[3].xyz; float ph = dot(ip.xz, vec2(.37, .61)); float g = .65 + .35 * sin(gTime * .23 + ip.x * .05); float h = max(transformed.y, 0.) / .3; transformed.x += g * h * h * (sin(gTime * 1.1 + ph) * .6 + sin(gTime * 2.7 + ph * 1.7) * .22) * .045; transformed.z += g * h * h * cos(gTime * .9 + ph * 1.3) * .03; }");
    sh.fragmentShader = sh.fragmentShader.replace("#include <normal_fragment_begin>", "#include <normal_fragment_begin>\n  normal = normalize(vNormal);").replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * .03;");
  };
  mat.customProgramCacheKey = () => "sightGrass" + (reduced ? 1 : 0);
  const im = new THREE.InstancedMesh(geo, mat, CAP); im.count = 0; im.frustumCulled = false; im.name = "sightGrass"; im.renderOrder = 0;
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); parent.add(im);
  // 株ごとの位置・向き・大きさ・色は、はじめに一度だけ決める（並べ直しでは、近いものを写すだけ）
  const n = anchors.length / 3, M = new Float32Array(n * PER * 5); s = 11;
  for (let i = 0; i < n * PER; i++) { const a = Math.floor(i / PER), t = rnd() * TAU, r = Math.sqrt(rnd()) * spread; M[i * 5] = anchors[a * 3] + Math.cos(t) * r; M[i * 5 + 1] = anchors[a * 3 + 1]; M[i * 5 + 2] = anchors[a * 3 + 2] + Math.sin(t) * r; M[i * 5 + 3] = rnd() * TAU; { const u = rnd(); M[i * 5 + 4] = u < .55 ? .35 + rnd() * .35 : .7 + rnd() * .8; } }
  const cols = new Float32Array(CAP * 3), col = new THREE.Color(); s = 5;
  for (let i = 0; i < CAP; i++) { col.setHSL(.2 + rnd() * .08, .42 + rnd() * .18, .17 + rnd() * .09); cols[i * 3] = col.r; cols[i * 3 + 1] = col.g; cols[i * 3 + 2] = col.b; }
  im.instanceColor = new THREE.InstancedBufferAttribute(cols, 3);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  let lx = 1e9, lz = 0;
  function update(cam, dt) {
    time.value += dt;
    if (Math.hypot(cam.x - lx, cam.z - lz) < 8) return; lx = cam.x; lz = cam.z;
    let c = 0; const R2 = R * R;
    for (let i = 0; i < n * PER && c < CAP; i++) {
      const dx = M[i * 5] - cam.x, dz = M[i * 5 + 2] - cam.z, d2 = dx * dx + dz * dz; if (d2 > R2) continue;
      const f = 1 - Math.max(0, Math.sqrt(d2) - R * .7) / (R * .3);   // 縁では小さくして消す
      q.setFromEuler(e.set(0, M[i * 5 + 3], 0)); const k = M[i * 5 + 4] * f; sc.set(k, k, k);
      m4.compose(v.set(M[i * 5], M[i * 5 + 1], M[i * 5 + 2]), q, sc); im.setMatrixAt(c++, m4);
    }
    im.count = c; im.instanceMatrix.needsUpdate = true;
  }
  return { mesh: im, update, set visible(b) { im.visible = b; } };
}

/* ①'' 歩く人のまわり 60 m の細かい陰の絵（11-11）。PC 0.15 m・スマホ 0.25 m／画素（絵を送る手間でこまが落ちないよう）。8 m 動いたときだけ、数こまに分けて描き直す。
   斑＝葉の透き間を通った日の像：1.1 m の升ごとに一つ、0.5〜1 m の楕円（日の向きに伸ばす）。升の乱数は場所で決まるので描き直しても同じ所に出る */
export function updateCanopyNear(THREE, x, z) {
  const C = CANOPY; if (!C.P || C.busy) return;
  if (Math.hypot(x - C.nx, z - C.nz) < 8) return;
  const half = 60, mpp = C.mobile ? .25 : .15, W = Math.round(half * 2 / mpp), x0 = x - half, z0 = z - half, { dx, dz, elong } = C.el;
  const P = C.P.filter(p => Math.abs(p.x - x) < half + p.R * elong + 2 && Math.abs(p.z - z) < half + p.R * elong + 2);
  const cov = new Float32Array(W * W), D = new Uint8Array(W * W * 4); C.busy = 1;
  let k = 0; const step = () => {
    const t0 = performance.now();
    while (k < P.length && performance.now() - t0 < 2) {
      const p = P[k++], ra = p.R * elong, rb = p.R, r = ra + 1, i0 = Math.max(0, Math.floor((p.x - r - x0) / mpp)), i1 = Math.min(W - 1, Math.ceil((p.x + r - x0) / mpp)), j0 = Math.max(0, Math.floor((p.z - r - z0) / mpp)), j1 = Math.min(W - 1, Math.ceil((p.z + r - z0) / mpp));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const wx = x0 + (i + .5) * mpp - p.x, wz = z0 + (j + .5) * mpp - p.z, a = wx * dx + wz * dz, b = -wx * dz + wz * dx, an = Math.atan2(b, a);
        const edge = 1 + .12 * Math.sin(an * 5 + p.x) + .07 * Math.sin(an * 11 + p.z), d = Math.hypot(a / ra, b / rb) / edge; if (d >= 1.15) continue;
        const v = Math.max(0, Math.min(1, (1.15 - d) / .45)) * .92, o = j * W + i; cov[o] = 1 - (1 - cov[o]) * (1 - v);
      }
    }
    if (k < P.length) { requestAnimationFrame(step); return; }
    /* 斑：升 1.1 m・確からしさ 45 %・半径 .25〜.5 m・日の向きに伸ばす */
    let j = 0; const spots = () => {
      const t1 = performance.now();
      for (; j < W && performance.now() - t1 < 2; j++) for (let i = 0; i < W; i++) {
        const wx = x0 + (i + .5) * mpp, wz = z0 + (j + .5) * mpp, a = (wx * -dx + wz * -dz) / Math.min(elong, 1.6), b = -wx * -dz + wz * -dx; let g = 0;   /* 採点 3 人 P1「斑が一列に等間隔で並ぶ（型押し）」→ 大きさの違う二つの升（1.3 m・2.1 m、向きを 37 度ずらす）を重ね、升の中の位置は升いっぱいに散らし、大きさも 0.2〜0.6 m と幅を広げる */
        for (let L = 0; L < 2; L++) {
          const cs = L ? 2.1 : 1.3, ang = L ? .646 : 0, aa = a * Math.cos(ang) - b * Math.sin(ang) + L * 5.3, bb = a * Math.sin(ang) + b * Math.cos(ang) + L * 2.9, ca = Math.floor(aa / cs), cb = Math.floor(bb / cs);
          for (let u = -1; u <= 1; u++) for (let w = -1; w <= 1; w++) {
            const X = ca + u + L * 71, Y = cb + w + L * 37, h = Math.abs(Math.sin(X * 127.1 + Y * 311.7) * 43758.5) % 1; if (h < (L ? .5 : .62)) continue;
            const h2 = Math.abs(Math.sin(X * 269.5 + Y * 183.3) * 24634.6) % 1, h3 = Math.abs(Math.sin(X * 419.2 + Y * 371.9) * 15731.7) % 1, h4 = Math.abs(Math.sin(X * 91.7 + Y * 57.3) * 9631.1) % 1;
            const cxa = (ca + u + h2) * cs, cxb = (cb + w + h3) * cs, rr = (L ? .3 : .2) + .3 * Math.pow(h4, 1.5), dd = Math.hypot(aa - cxa, (bb - cxb) * (1 + .4 * (h4 - .5)));
            g = Math.max(g, Math.max(0, Math.min(1, (rr - dd) / (rr * .5))) * (.55 + .45 * h3));
          }
        }
        const o = j * W + i; D[o * 4] = Math.min(255, cov[o] * 255); D[o * 4 + 1] = g * 255; D[o * 4 + 3] = 255;
      }
      if (j < W) { requestAnimationFrame(spots); return; }
      const T = C.ntex; if (T.image.width !== W) T.dispose(); T.image = { data: D, width: W, height: W }; T.magFilter = THREE.LinearFilter; T.minFilter = THREE.LinearMipmapLinearFilter; T.generateMipmaps = true; T.anisotropy = C.mobile ? 4 : 8; T.wrapS = T.wrapT = THREE.ClampToEdgeWrapping; T.needsUpdate = true;
      C.nbox.set(x0, z0, 1 / (half * 2), 1); C.nx = x; C.nz = z; C.busy = 0;
    }; spots();
  }; step();
}
