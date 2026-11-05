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

/* ① 木もれ日。霞の near が 50 m より手前のとき（歩く）だけ効く＝見方を切りかえるための値を別に持たない */
export function installDapple(THREE) {
  if (THREE.ShaderChunk.__sightDap) return; THREE.ShaderChunk.__sightDap = 1;
  const C = THREE.ShaderChunk, key = "getDirectionalLightInfo( directionalLight, directLight );";
  if (!C.lights_fragment_begin.includes(key)) return;   // 目印が見つからなければ何もしない
  C.lights_fragment_begin = C.lights_fragment_begin.replace("#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )", `float qDap = 1.0;
#if defined( USE_FOG ) && !defined( FOG_EXP2 ) && ( NUM_DIR_LIGHTS > 0 )
{ float on = 1.0 - smoothstep( 20.0, 50.0, fogNear );
  if ( on > 0.0 ) {
    vec3 wp = cameraPosition + transpose( mat3( viewMatrix ) ) * ( -vViewPosition );
    float dist = length( wp - cameraPosition );
    float up = smoothstep( .35, .85, dot( normal, normalize( mat3( viewMatrix ) * vec3( 0., 1., 0. ) ) ) );
    float k = on * up * ( 1.0 - smoothstep( 45.0, 90.0, dist ) ) * ( 1.0 - smoothstep( 2.5, 6.0, wp.y - cameraPosition.y ) );
    if ( k > 0.0 ) {
      vec2 p = wp.xz * .55; vec2 q = p + vec2( sin( p.y * .7 ), cos( p.x * .6 ) ) * .8;
      float n = sin( q.x * 1.7 ) * sin( q.y * 1.9 ) + .55 * sin( q.x * 3.9 + q.y * 1.3 ) * sin( q.y * 3.3 - q.x * .8 ) + .3 * sin( q.x * 7.1 - 2. ) * sin( q.y * 6.7 + 1. );
      float lit = smoothstep( .15, .75, n * .5 + .5 );
      qDap = mix( 1.0, .12 + 1.05 * lit, k );
    }
  }
}
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )`).replace(key, key + "\n\t\tdirectLight.color *= qDap;");
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
