// sho3d.js — 書を 3D の空間に「動的に」置く部品（Qualia/sho の層の下ごしらえ）
// © mitsulab. All rights reserved.  書は上原光瑛の作品。
// v3.3 2026-10-23 burst(uv, side)＝触れたとき、字が一度はっきり波打って崩れ、かけらが字の外へ散り、3 秒ほどで字の形へ戻る・縁の照りを濡れた暗い墨に抑える（金属の管に見えない）・影のぼかし opts.blur
// v1 2026-10-22 ／ v1.1 2026-10-22 createShoSound に opts.pitch（Qualia/sho の 11 作で同じ型を聞き分ける）・法線を広くとってしわを減らす
// v1.4 2026-10-22 色は全部墨（素材の違いは墨の状態で）・touch(x, y, 強さ)＝触れた所で鳴る音・ふちを両面で描き裂け目をなくす・面の向きを画素ごとに
// v1.3 2026-10-22 opts.material（題に合わせた素材：ink 墨・mycel 菌糸・shell 殻・dew 朝日の水滴・mist 霧・cosmos 黒曜の宇宙・eyes 夜の眼・sap 樹液・bud 蕾・petal 花びら・pulse いのちの拍）と音の型（spore・shell・mist・eyes・pulse）を足した
// v1.2 2026-10-22 墨の肌（筆の向きに沿う毛の筋・厚い所は濡れ、薄い所は乾く・まわりを映す opts.env）／粒は墨から光へ移りながら流れにのってほどける（二つの描き方）／床に落ちる影 makeShadow()／音に回廊の響き（合成の残響）とほどける音のさざめき
//
// 入力は prep_sho.py（_dev/sho3d/）が作る小さな地図 PNG：
//   R＝墨の形  G＝厚み（墨の中心ほど厚い）  B＝筆の向き（0〜π）
// 出すもの：
//   ・墨の彫刻（表と裏の二枚の起伏。縁が細く中心がふくらむ。濡れた墨のつや）
//   ・粒（筆の向きに沿ってほどけ、漂い、また集まる）
//   ・音（書ごとの型。ほどける速さに合わせて粒の音が鳴り、集まりきると一打。Web Audio の合成だけ＝録音の素材を使わない）
//   ・音に反応して揺れる（sho.setLevel(0..1)）
// three.js は呼ぶ側から渡す（import の場所をアプリに合わせるため）。
//
//   import { loadShoMap, createSho, createShoSound } from './sho3d.js';
//   const map = await loadShoMap('data/027.png');
//   const sho = createSho(THREE, map, { width: 2.4, auto: true });
//   scene.add(sho.group);
//   const snd = createShoSound('water');           // 最初の操作のあとで snd.start()
//   // 毎こま： sho.update(dt, t); snd.update(sho.state, dt); sho.setLevel(snd.level);
//   // 近づいたらほどく： sho.target = 1（離れたら 0）。auto:true なら自分で息をするように繰り返す

/* ───────── 地図の読み込み ───────── */
export async function loadShoMap(url) {
  const img = new Image(); img.decoding = 'async'; img.crossOrigin = 'anonymous';
  await new Promise((ok, ng) => { img.onload = ok; img.onerror = () => ng(new Error('sho3d: 読めない ' + url)); img.src = url; });   // decode() は隠れたタブで待たされるので onload
  const w = img.naturalWidth, h = img.naturalHeight;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
  const src = cx.getImageData(0, 0, w, h).data;
  // 下から上へ並べかえ（three の uv は左下が原点）。A に「ほどける順」を入れる
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = h - 1 - y;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, j = (sy * w + x) * 4;
      data[i] = src[j]; data[i + 1] = src[j + 1]; data[i + 2] = src[j + 2];
      data[i + 3] = Math.round(255 * orderAt(x / w, y / h));
    }
  }
  return { w, h, data, url };
}

// ほどける順（0＝最初にほどける）。筆が入った左上から、払いの右下へ。ゆるい揺らぎを足す
function orderAt(u, v) {
  const sweep = 0.62 * u + 0.38 * (1 - v);
  const n = 0.5 + 0.25 * Math.sin(u * 9.1 + v * 3.7) * Math.cos(v * 7.3 - u * 2.1) + 0.25 * Math.sin(u * 23.0 + v * 19.0);
  return Math.min(1, Math.max(0, 0.7 * sweep + 0.3 * n));
}

/* ───────── 素材の表（v1.3） ─────────
   id＝シェーダの分かれ道。trans＝透ける。pcol＝粒の色。toLight＝光の粒へ移る割合。rise＝粒が昇る強さ（負は落ちる）。psize＝粒の大きさ。shadow＝影の濃さ */
export const MATERIALS = {   // v1.4：色は全部墨（粒も墨の濃淡）
  ink:    { id: 0 },
  mycel:  { id: 1, pcol: 0x55585c, toLight: 0.15, rise: 0.45, fiber: 0.8 },
  shell:  { id: 2, pcol: 0x141518, toLight: 0.05, psize: 1.6, rise: 0.6, fiber: 0.35 },
  dew:    { id: 3, pcol: 0x060708, toLight: 0.1, rise: -1.6, psize: 2.6, pcount: 0.09, shadow: 0.8, fiber: 0.2 },
  mist:   { id: 4, trans: true, pcol: 0x6e7378, toLight: 0.2, rise: 0.9, psize: 2.2, shadow: 0.3, fiber: 0.3 },
  cosmos: { id: 5, toLight: 0.5, fiber: 0.25 },
  eyes:   { id: 6, toLight: 0.3 },
  sap:    { id: 7, pcol: 0x0c0d0f, toLight: 0.25, rise: 1.5, fiber: 0.5 },
  bud:    { id: 8, pcol: 0x3a3c40, toLight: 0.1, psize: 1.4, rise: 0.7, fiber: 0.3 },
  petal:  { id: 9, trans: true, pcol: 0x2c2e32, toLight: 0.05, psize: 2.6, pcount: 0.35, rise: 0.8, shadow: 0.6, fiber: 0.3 },
  pulse:  { id: 10, pcol: 0x0c0d0f, toLight: 0.3, fiber: 0.3 },
};

/* ───────── 墨の彫刻と粒 ───────── */
export function createSho(THREE, map, opts = {}) {
  const mobile = opts.mobile ?? matchMedia('(max-width:700px), (pointer:coarse)').matches;
  const width = opts.width ?? 2.4;
  const height = width * map.h / map.w;
  const thick = opts.thickness ?? width * 0.09;
  const seg = opts.segments ?? (mobile ? 120 : 200);
  const ink = new THREE.Color(opts.ink ?? 0x07090c);
  const glow = new THREE.Color(opts.glow ?? 0xdfeef2);
  const tint = new THREE.Color(opts.tint ?? 0x5cc8e0);
  // 粒の見え方：'light'＝暗い場で光る粒（加算）／'ink'＝明るい場で墨の粒（ふつうの重ね）。'ink' でも、ほどけるにつれて一部は光の粒へ移る（opts.toLight 0..1）
  const pMode = opts.particleMode ?? 'light';
  // 素材（v1.3）：書の形はそのまま、肌と粒と動きを題に合わせて変える
  const MK = MATERIALS[opts.material] || MATERIALS.ink;
  const N = Math.round((opts.particles ?? (mobile ? 9000 : 32000)) * (MK.pcount ?? 1));
  const MID = MK.id, TRANS = !!MK.trans;
  const pCol = new THREE.Color(opts.particleColor ?? MK.pcol ?? (pMode === 'ink' ? 0x0b0d10 : 0xdfeef2));
  const toLight = opts.toLight ?? MK.toLight ?? (pMode === 'ink' ? 0.5 : 0);

  const tex = new THREE.DataTexture(map.data, map.w, map.h, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  tex.colorSpace = THREE.NoColorSpace; tex.needsUpdate = true;

  const group = new THREE.Group(); group.name = 'sho';
  const U = {
    uMap: { value: tex }, uTexel: { value: new THREE.Vector2(1 / map.w, 1 / map.h) },
    uThick: { value: thick }, uU: { value: 0 }, uTime: { value: 0 }, uLevel: { value: 0 },
    uInk: { value: ink }, uGlow: { value: glow }, uTint: { value: tint },
    uLight: { value: new THREE.Vector3(-0.45, 0.65, 0.62).normalize() },
    uSize: { value: (opts.particleSize ?? 0.009) * (MK.psize ?? 1) * width / 2.4 }, uScale: { value: 600 },
    uDeep: { value: opts.deep ?? 1 },
    uRim: { value: opts.rim ?? 0 },   /* v3.2（10-23）濡れた墨の縁の湿った光沢（斜めほど障子を映す・照りの点は出さない）。0＝なし */   /* v3.1（10-23）墨の深さ：面の明るさをまとめて沈める（灰色のゴムに見えない・1＝そのまま） */
    uEdge: { value: opts.edgeGlow ?? 0.85 },   // ほどける縁の光（明るい場では弱く）
    uEnv: { value: opts.env ?? null }, uHasEnv: { value: opts.env ? 1 : 0 }, uEnvGain: { value: opts.envGain ?? 1 },
    uFiber: { value: opts.fiber ?? MK.fiber ?? 1 },   // 筆の毛の筋の強さ
    uDet: { value: null }, uHasDet: { value: 0 }, uDetTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },   // 原本の墨の濃さ（かすれ・擦れ）
    uMat: { value: MID }, uRise: { value: MK.rise ?? 1 },
    uFlow: { value: opts.flow ?? 0 }, uKick: { value: 0 }, uPull: { value: 0 }, uPullS: { value: 1 }, uIsl: { value: null }, uHasIsl: { value: 0 }, uFloat: { value: 1 }, uTouch: { value: new THREE.Vector2(0.5, 0.5) },
    uBurstA: { value: 99 }, uInkCap: { value: opts.inkCap ?? 0 },
    uDepth: { value: opts.depth ?? 0 }, uSeed: { value: opts.seed ?? 0 }, uKeep: { value: opts.keep ? 1 : 0 }, uWH: { value: new THREE.Vector2(width, height) },
  };

  // 起伏（表＝side +1、裏＝side −1）
  const relGeo = new THREE.PlaneGeometry(width, height, seg, Math.max(8, Math.round(seg * height / width)));
  const relief = side => new THREE.ShaderMaterial({
    uniforms: { ...U, uSide: { value: side } },
    side: THREE.DoubleSide,   // ふちで面が向こうへ回りこむ所も描く（裂け目を作らない）
    alphaToCoverage: !TRANS,   // v1.7 スマホも（描き先を MSAA にしたので、縁が画素の段にならない）
    transparent: TRANS, depthWrite: MID !== 4,
    vertexShader: /* glsl */`
      uniform sampler2D uMap, uDet; uniform float uThick, uSide, uTime, uLevel, uU, uDepth, uSeed, uKeep, uHasDet; uniform vec2 uTexel, uWH, uTouch; uniform float uPull, uPullS; uniform sampler2D uIsl; uniform float uHasIsl, uFloat;
      varying vec2 vUv; varying vec3 vView; varying float vG, vGg; varying vec3 vNX, vNY, vNZ, vNg; varying vec2 vDs; varying vec3 vPm; varying float vPl; varying float vBk; varying vec2 vCr;
      // 奥行きの場：筆の流れ（左上→右下）に沿って、画が前後へゆるく曲がる（書の形は正面から見ると変わらない）
      // 液体の墨（v1.5）：時間とともにうねる奥行き（無重力の中でゆっくり波打つ）。uFlow＝うねりの強さ、uKick＝触れた・音の強さ
      uniform float uFlow, uKick; uniform float uMat; uniform float uBurstA;
      #define uMatV uMat
      float liquid(vec2 q){ float t = uTime;
        return uFlow * (0.55 * sin(q.x * 5.1 + t * 0.62 + sin(q.y * 3.3 + t * 0.41) * 1.4) * cos(q.y * 4.2 - t * 0.47)
                      + 0.3 * sin((q.x + q.y) * 9.0 - t * 1.1 + sin(q.x * 7.0 + t * 0.7))
                      + 0.15 * sin(q.y * 17.0 + t * 2.3 + q.x * 5.0) * (1.0 + 2.5 * uKick)); }
      float dField(vec2 q){ return liquid(q) + uDepth * (0.45 * sin(q.x * 4.3 + uSeed) * cos(q.y * 3.7 + uSeed * 1.7) + 0.35 * sin((q.x * 0.62 + (1.0 - q.y) * 0.38) * 6.2 + uSeed * 2.3) + 0.2 * sin(q.y * 7.1 - q.x * 2.0 + uSeed * 3.1)); }
      // 厚み：墨の中心ほど厚く、断面は丸く（縁で急に、芯でなだらかに）
      float gS(vec2 q){ vec2 t = uTexel * 1.2; return (texture2D(uMap, q).g * 2.0 + texture2D(uMap, q + vec2(t.x, 0.)).g + texture2D(uMap, q - vec2(t.x, 0.)).g + texture2D(uMap, q + vec2(0., t.y)).g + texture2D(uMap, q - vec2(0., t.y)).g) / 6.0; }   // 8 bit の段をならす
      float zAt(vec2 q){ float g = clamp((gS(q) - 0.1) / 0.9, 0.0, 1.0); float h = sqrt(g * (2.0 - g)) * uThick * 0.5;
        h *= 0.15 + 0.85 * smoothstep(0.0, 0.3, g);   /* v2.0 縁のすぐ内側は網の上では低く（縁をまたぐ三角形が立たない＝斜めから見て縁が網の目の段にならない）。陰影の丸みは画素ごとの hF のまま */
        /* v3.0（10-23）：濃い墨ほど厚くは、prep の厚み（G）に焼きこんだ（網の頂点で濃さを読むと段になった） */
        float td = length((q - uTouch) * uWH); h += uKick * 0.07 * sin(td * 18.0 - uTime * 22.0) * exp(-td * 1.4); /* 触れた所から波紋・ふちで表と裏が閉じる（丸い断面） */
        float pullZ = uPull * uPullS * 0.7 * exp(-td * td * 3.0);   /* 押しているあいだ、墨が指のほうへ引かれて伸びる（離すとぶるんと戻る） */
        return pullZ + dField(q) + uSide * h * (1.0 + 0.12 * uU * sin(uTime * 3.0 + q.x * 9.0) + 0.14 * sin(uTime * 1.3 + q.x * 6.0 + q.y * 4.0) + 0.22 * uKick * (0.6 * sin(uTime * 31.0 + q.y * 40.0 + 2.5 * sin(q.y * 13.0 + uSeed)) + 0.4 * sin(uTime * 23.0 + q.y * 67.0 + q.x * 11.0)) * (0.5 + 0.5 * g)); }   /* v1.9 震えの周期を不揃いに・縁で半分（押したとき縁が鋸歯にならない） */   // 表面張力でふくらみ、音で震える
      void main(){
        vBk = 0.0; vCr = vec2(0.0); vUv = uv; vNX = normalMatrix * vec3(1.,0.,0.); vNY = normalMatrix * vec3(0.,1.,0.); vNZ = normalMatrix * vec3(0.,0.,1.); vec4 m = texture2D(uMap, uv); vG = m.g; vGg = clamp((m.g - 0.1) / 0.9, 0.0, 1.0);
        vec3 p = position;
        float sway = sin(p.x * 5.0 + uTime * 7.0) * sin(p.y * 4.0 - uTime * 5.0);
        p.z = zAt(uv) + uLevel * 0.02 * sway * m.r;
        // 横へのうねり（墨が流れる）と、音・触れた強さでの細かな振動
        float thin = 1.0 - vGg;
        { vec2 dq = (uv - uTouch) * uWH; float tl = length(dq); p.xy += (tl > 1e-4 ? dq / tl : vec2(0.)) * uPull * -0.16 * exp(-tl * tl * 5.0) * (0.4 + thin); }   // 引かれて伸びる（指から外へ糸を引く）
        p.xy += vec2(sin(p.y * 2.1 + uTime * 0.9 + sin(p.x * 1.3 + uTime * 0.4)), cos(p.x * 1.7 - uTime * 0.7 + sin(p.y * 1.1 + uTime * 0.3))) * uFlow * 0.45 * thin * thin;
        { float th2 = thin * thin * thin; vec2 sw = vec2(sin(uTime * 1.15 + p.y * 1.7 + 2.0 * sin(p.x * 0.9 + uTime * 0.31)), cos(uTime * 0.93 + p.x * 1.9 + 2.0 * sin(p.y * 0.8 - uTime * 0.27)));   /* v3.0 LIVE：芯は動かさず、薄い縁・かすれ・ほどけた糸だけが水の中の絹のように大きく揺らぐ（字の骨組みは読めるまま） */
          p.xy += sw * 0.11 * th2 * uFloat; p.z += 0.16 * th2 * uFloat * sin(uTime * 0.8 + p.y * 2.3 + p.x * 1.1); }   // 骨組み（芯）は動かさず、縁だけが流れる
        p.xy += vec2(sin(uTime * 47.0 + p.y * 23.0 + 3.0 * sin(p.y * 7.3 + uSeed)) * 0.6 + sin(uTime * 29.0 + p.y * 41.0 + p.x * 5.0) * 0.4, cos(uTime * 43.0 + p.x * 19.0 + 3.0 * sin(p.x * 6.1)) * 0.6 + cos(uTime * 31.0 + p.x * 37.0) * 0.4) * uKick * 0.03 * (0.3 + 0.35 * thin);   /* v1.9 縁の震えは不揃いに・半分（筆の切れを残す） */
        /* v1.7 浮遊（本人「超電導のように、重力と浮力が釣り合って微細に揺らぐ」）：かすれの糸と薄い縁は細かく震える */
        p.z += uFloat * (0.035 * thin * thin * sin(uTime * 1.3 + uv.y * 9.0 + uv.x * 5.0) + 0.01 * thin * sin(uTime * 7.1 + uv.x * 31.0 + uv.y * 17.0));
        /* ちぎれた墨（点画・飛沫）は本体から離れて、それぞれに漂い・回り、見えない力で引き合う。触れると散って戻る */
        if (uHasIsl > 0.5) { vec4 il4 = texture2D(uIsl, uv); vec3 il = il4.rgb; float iw = il4.a;
          if (il.r > 0.002 && iw > 0.002) { float sm = il.r, sd = fract(sin(dot(il.gb, vec2(12.99, 78.23))) * 43758.55);
            vec2 cw = (il.gb - 0.5) * uWH; vec2 rq = p.xy - cw;
            p.z *= 1.0 - 0.5 * iw;   /* 漂うかけらは薄い墨の滴に（厚い板の縁が棒や針金に見えない） */
            float A = (0.2 + 0.35 * sm) * uFloat * iw, T = uTime;   /* v3.0 LIVE：かけらの漂いを大きく */   /* 本体の 3〜5 倍の振れ・2〜6 秒の周期 */
            float an = (0.06 + 0.22 * sm) * uFloat * iw * (sin(T * (0.7 + 0.5 * sd) + sd * 6.3) + 0.4 * sin(T * (1.6 + 0.6 * sd) + sd * 2.1));
            p.xy = cw + mat2(cos(an), sin(an), -sin(an), cos(an)) * rq;
            p.z += rq.x * 0.12 * sm * sin(T * (0.9 + 0.4 * sd) + sd * 4.0) * uFloat * iw;
            p += vec3(sin(T * (1.1 + 0.9 * sd) + sd * 6.0) + 0.3 * sin(T * 3.1 + sd * 11.0), sin(T * (1.4 + 0.8 * sd) + sd * 9.0) + 0.25 * sin(T * 4.3 + sd * 5.0), 1.4 * sin(T * (0.9 + 0.6 * sd) + sd * 4.0)) * A;
            vec2 aw = cw - (uTouch - 0.5) * uWH; float al2 = length(aw);
            p.xy += (al2 > 1e-4 ? aw / al2 : vec2(0.0, 1.0)) * uKick * (0.12 + 0.35 * sm) * exp(-al2 * 0.6) * iw; p.z += uKick * 0.25 * (0.3 + sm) * (sd - 0.3) * iw;
          } }
        /* v3.3（10-23）触れたとき：字全体に一度はっきり波が走って崩れ、かけら（不揃いの区画）が字の外へ散り、ばねのように字の形へ戻る。区画の境の伸びた三角形は描かない（下の判定）＝ちぎれて見える */
        if (uBurstA < 4.0) { float A = uBurstA; vec2 bq = (uv - uTouch) * uWH; float br = length(bq);
          float benv = smoothstep(0.0, 0.06, A) * exp(-A * 1.1), bph = br * 4.0 - A * 10.0, bfr = smoothstep(0.0, 0.5, A * 3.2 - br);
          p.z += uPullS * benv * bfr * 0.32 * sin(bph); p.xy += (br > 1e-4 ? bq / br : vec2(0.)) * benv * bfr * 0.07 * cos(bph);
          vec2 cg = uv * uWH / 0.21, cgi = floor(cg), cid = cgi; float bd = 9.0;   /* 区画は不揃いの多角形（ずらした点のうち近いもの） */
          for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 cc = cgi + vec2(float(i), float(j)); vec2 jp = cc + 0.5 + 0.8 * (vec2(fract(sin(dot(cc, vec2(41.3, 289.1)) + uSeed) * 43758.5), fract(sin(dot(cc, vec2(157.7, 113.9)) + uSeed) * 23421.6)) - 0.5); float dd2 = dot(cg - jp, cg - jp); if (dd2 < bd) { bd = dd2; cid = cc; } }
          float hs = fract(sin(dot(cid, vec2(127.1, 311.7)) + uSeed) * 43758.5453), hs2 = fract(sin(dot(cid, vec2(269.5, 183.3)) + uSeed * 1.3) * 43758.5453);
          vec2 ccL = (cid + 0.5) * 0.21 - uWH * 0.5, cq = ccL - (uTouch - 0.5) * uWH; float cl = length(cq);
          float pr = 0.18 + 0.32 * exp(-cl * 0.8) + 0.25 * thin;
          if (hs < pr) { float A2 = A - cl * 0.09;
            float S = smoothstep(0.0, 0.32, A2) * (1.0 - smoothstep(0.75, 3.1, A2)); S = S * S * (3.0 - 2.0 * S);
            vec2 dir = normalize(cq + (vec2(hs2, hs) - 0.5) * 0.9 + vec2(0.0, 0.25));
            float dist = (0.3 + 0.95 * hs2) * (0.7 + 0.5 * exp(-cl * 0.5));
            vec2 rq = p.xy - ccL; vCr = rq / 0.21; float an = (hs2 - 0.5) * 1.3 * S; rq = mat2(cos(an), sin(an), -sin(an), cos(an)) * rq;
            p.xy = ccL + rq + dir * dist * S; p.z += S * uPullS * (0.2 + 0.5 * hs); p.xy -= rq * 0.35 * S; vBk = S * (1.0 + hs); } }   /* v3.3b かけらは平たく回さず、表面張力で丸く縮んだ墨の滴に */
        vNg = vNZ;   // 面の向きは画素ごとに求める（頂点では計算しない＝軽い）
        vec2 ed = vec2(0.004, 0.004); vDs = vec2((dField(uv + vec2(ed.x, 0.)) - dField(uv - vec2(ed.x, 0.))) / (2.0 * ed.x * uWH.x), (dField(uv + vec2(0., ed.y)) - dField(uv - vec2(0., ed.y))) / (2.0 * ed.y * uWH.y));
        { vec2 dqw = (uv - uTouch) * uWH; vPl = uPull * exp(-dot(dqw, dqw) * 3.0); vDs += uPull * uPullS * 0.7 * exp(-dot(dqw, dqw) * 3.0) * (-6.0) * dqw; }   /* 引かれた形の傾きも陰影に入れる（平らな板に見せない） */   // 奥行きの場の傾き（なめらかなので頂点で）
        vPm = p;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap, uEnv; uniform vec2 uTexel; uniform float uThick, uSide, uU, uHasEnv, uEnvGain, uFiber, uMat, uTime, uSeed, uHasDet; uniform sampler2D uDet; uniform vec2 uDetTexel;
      #define uSeed2 uSeed
      uniform vec3 uInk, uGlow, uTint, uLight; uniform float uEdge, uDeep, uRim, uInkCap;
      varying vec2 vUv; varying vec3 vView; varying float vG, vGg; varying vec3 vNX, vNY, vNZ, vNg; varying vec2 vDs; varying vec3 vPm; varying float vPl; varying float vBk; varying vec2 vCr; uniform float uBurstA;
      uniform float uKeep, uDepth; uniform vec2 uWH;
      // 面の向きは画素ごとに求める（頂点の網の段が、ふちで縞にならないように）
      float dF(vec2 q){ return uDepth * (0.45 * sin(q.x * 4.3 + uSeed2) * cos(q.y * 3.7 + uSeed2 * 1.7) + 0.35 * sin((q.x * 0.62 + (1.0 - q.y) * 0.38) * 6.2 + uSeed2 * 2.3) + 0.2 * sin(q.y * 7.1 - q.x * 2.0 + uSeed2 * 3.1)); }
      float hF(vec2 q){ float g = clamp((texture2D(uMap, q).g - 0.1) / 0.9, 0.0, 1.0); return sqrt(g * (2.0 - g) + 0.0004) * uThick * 0.5 * (0.15 + 0.85 * smoothstep(0.0, 0.3, g)); }   /* v3.0 網の高さ（zAt）と同じ断面で陰影を（縁の壁の明暗が形と合う） */
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
      // 筆の毛の筋：筆の向きに長く、横に細かい
      float fib(vec2 px, vec2 d, vec2 pd){ float al = dot(px, d), ac = dot(px, pd);
        return vn(vec2(ac * 0.22, al * 0.018)) * 0.5 + vn(vec2(ac * 0.55, al * 0.04)) * 0.32 + vn(vec2(ac * 1.1, al * 0.08)) * 0.18; }
      float hy(vec2 g){ vec2 cl = floor(g), f = fract(g) - 0.5; float a = h21(cl) * 6.2832; vec2 dr = vec2(cos(a), sin(a));
        float dl = abs(dot(f, vec2(-dr.y, dr.x))); float al = abs(dot(f, dr)); float ln = 0.15 + 0.45 * h21(cl + 3.3); return (1.0 - smoothstep(0.02, 0.07, dl)) * (1.0 - smoothstep(ln, ln + 0.12, al)) * step(0.45, h21(cl + 9.1)) * (0.5 + 0.5 * h21(cl + 5.5)); }
      void main(){
        vec4 m = texture2D(uMap, vUv);
        /* v1.6：切り口は画素ごとに原本の形（R）で切る。網の目より細い角・払いの抜け・かすれの隙間（糸の束）まで残る */
        float aw = clamp(fwidth(m.r) * 0.75, 0.004, 0.08);   /* 真横（かすめる角度）でも透けない */
        float cov = smoothstep(0.5 - aw, 0.5 + aw, m.r);
        { vec2 ux = dFdx(vUv) * uWH, uy = dFdy(vUv) * uWH; float sx = length(dFdx(vPm.xy)) / max(length(ux), 1e-6), sy = length(dFdy(vPm.xy)) / max(length(uy), 1e-6);
          if (max(sx, sy) > (uBurstA < 4.0 ? 1.7 : 3.0)) discard; }   /* v3.3b 崩れているあいだは、少し伸びた三角形（棒・糸の線）も描かない */
        if (fwidth(vBk) > 0.0004) discard;
        if (vBk > 0.002) { float sB = vBk - floor(vBk); float rr = length(vCr) + 0.12 * (vn(vCr * 5.0 + sB * 9.0) - 0.5); if (rr > mix(0.62, 0.36, smoothstep(0.0, 0.6, vBk))) discard; }   /* 散ったかけらは丸い滴の形（角のある板・ガラスの破片にしない） */
        if (uBurstA < 4.0) { float s3 = length(dFdx(vPm)) / max(length(dFdx(vUv) * uWH), 1e-6); if (s3 > 14.0 && vBk < 0.002 && fwidth(vPm.z) > 0.02) discard; }   /* 崩れているあいだに伸びた一本の棒を描かない */   /* v3.3 散った区画の境（ちがう区画をつなぐ三角形）は描かない＝ちぎれた墨のかけらになる */   /* 漂う墨と本体のあいだで伸びた三角形（空中の針の線）は描かない：面の中で uv の割に大きく伸びた所 */
        vec3 gnm = normalize(cross(dFdx(vPm), dFdy(vPm)));   /* 網の面の向き：表と裏をつなぐ側面（ふちの壁）は切らない＝横から見て中が抜けない */
        float wallK = 1.0 - smoothstep(0.3, 0.65, abs(gnm.z));
        float wallC = wallK * (1.0 - smoothstep(0.35, 0.6, m.r));   /* v2.2 色の上では、側面は原本の形の外側だけ（三角形ごとの判定が縁の内側に階段の帯を作っていた） */
        { float graze = 1.0 - smoothstep(0.45, 0.8, abs(dot(normalize(vNZ), normalize(vView))));   /* v2.0 側面で切り口を補うのは、かすめて見るときだけ（正面では網の目の段＝縁の階段を出さない） */
          cov = max(cov, wallK * graze * step(0.01, vG) * smoothstep(0.08, 0.42, m.r)); }   /* v2.2 側面の補いも原本の形の近くまで（網の目の外まで出ると縁が階段になる） */   // 形の外へ網の目ぶんはみ出さない（スマホで縁が段にならない）   /* 表と裏の継ぎ目（横から見た稜線）に穴の列を作らない。形の外で伸びた三角形（漂う墨のまわり）は描かない */
        if (cov < 0.02) discard;
        // ほどける：順（A）とこまかな揺らぎで、縁から欠けていく
        float o = m.a * 0.86 + (vn(vUv * 60.0) * 0.4 + vn(vUv * 220.0) * 0.6) * 0.14;
        float cut = uU * 1.25 - 0.1;
        if (uKeep < 0.5 && o < cut) discard;
        float edge = 1.0 - smoothstep(0.0, 0.035, o - cut);
        // 厚みの傾きから法線（モデルの空間）
        // 筆の毛の筋：薄い（乾いた）所ほど強く、厚い（濡れた）所は弱く
        float ang = m.b * 3.14159265; vec2 d = vec2(cos(ang), sin(ang)), pd = vec2(-d.y, d.x);
        vec2 px = vUv / uTexel;
        vec2 pxN = px * (uTexel.x * 2048.0);   /* v2.0 2048 の地図に換算した画素（スマホの 1024 の地図でも、ひび・毛羽・眼の大きさを同じに） */
        float f0 = fib(px, d, pd), f1 = fib(px + pd * 0.8, d, pd);
        float T0 = uTime;
        vec2 ex = vec2(uTexel.x * 2.5, 0.), ey = vec2(0., uTexel.y * 2.5);   /* 8 bit の段が等高線の縞・点の列に見えないよう、少し広くとる */
        float zx = uSide * (hF(vUv + ex) - hF(vUv - ex));
        float zy = uSide * (hF(vUv + ey) - hF(vUv - ey));
        vec2 sl = clamp(vDs + vec2(zx / (2.0 * ex.x * uWH.x), zy / (2.0 * ey.y * uWH.y)), -14.0, 14.0);
        float face = inversesqrt(1.0 + dot(sl, sl));   // 1＝正面を向く面・0＝横を向く面
        float wet = smoothstep(0.32, 0.9, vG);
        // 原本の墨の濃さ：0＝濃い墨・1＝紙（かすれ）。濃い所だけが少し濡れて、かすれた所は乾いてざらつく
        float dd = 0.0; vec2 dg = vec2(0.0);
        if (uHasDet > 0.5) {
          dd = texture2D(uDet, vUv).r;
          dg = vec2(texture2D(uDet, vUv + vec2(uDetTexel.x, 0.)).r - texture2D(uDet, vUv - vec2(uDetTexel.x, 0.)).r, texture2D(uDet, vUv + vec2(0., uDetTexel.y)).r - texture2D(uDet, vUv - vec2(0., uDetTexel.y)).r);
          // 横を向く面には正面の地図を写さない（引き伸ばしの筋を出さない）。かわりに乾いた墨のこまかな粒
          float fw = smoothstep(0.18, 0.6, face);
          float side = 0.015 + 0.05 * vn(vPm.zy * 140.0) * vn(vPm.xz * 90.0 + 3.0) + 0.03 * vn(vPm.yx * 420.0);
          dd = mix(side, dd, fw); dg *= fw;
          dg += (vec2(vn(vPm.zy * 260.0), vn(vPm.zy * 260.0 + 5.0)) - 0.5) * 0.06 * (1.0 - fw);
          wet *= 1.0 - smoothstep(0.04, 0.22, dd);
        }
        float fk = (0.9 - 0.65 * wet) * uFiber * smoothstep(0.08, 0.45, abs(dot(normalize(vNZ), normalize(vView))));
        fk *= 1.0 + 2.2 * smoothstep(0.15, 0.45, dd);   /* v1.6 かすれ（乾いた墨）ほど、筆の向きの毛の筋を強く＝糸の束 */   // 斜めから見るときは毛の筋を消す（縞にしない）
        vec2 fg = pd * (f1 - f0) * 1.4 * fk + d * dot(dg, d) * 0.5 * uHasDet * (uMat > 7.5 && uMat < 8.5 ? 0.15 : 1.0);   /* 蕾は原本の白いすじの縁を凹凸にしない（くぼみの輪に見える） */   // 擦れは筆の向きの筋として（くぼみの点にしない）   // 原本の擦れの凹凸
        /* v3.0（10-23）LIVE：液体の墨の面を、筆の向きにゆっくり流れる起伏（さわらなくても照りが流れていく。形は動かさない） */
        { float al0 = dot(pxN, d), ac0 = dot(pxN, pd), sp = 0.0045;
          float w0 = vn(vec2(al0 * sp - T0 * 0.32, ac0 * 0.012)) + 0.5 * vn(vec2(al0 * sp * 2.3 - T0 * 0.55 + 4.0, ac0 * 0.02 + 2.0));
          float w1 = vn(vec2((al0 + 7.0) * sp - T0 * 0.32, ac0 * 0.012)) + 0.5 * vn(vec2((al0 + 7.0) * sp * 2.3 - T0 * 0.55 + 4.0, ac0 * 0.02 + 2.0));
          fg += d * (w1 - w0) * 1.6 * smoothstep(0.15, 0.5, vG); }
        // 墨の粒と膠のこまかな皺（ごく弱く）
        vec2 gr = vec2(vn(px * 0.9) - vn(px * 0.9 + 3.7), vn(px * 0.9 + 7.1) - vn(px * 0.9 + 1.3)) * 0.07;

        vec3 nm = normalize(vec3(-sl, 1.0) * uSide);
        if ((uSide > 0.0) != gl_FrontFacing) nm = -nm;
        vec3 n = normalize(normalize(vNX * nm.x + vNY * nm.y + vNZ * nm.z) - (vNX * fg.x + vNY * fg.y) * uSide * 0.6);
        vec3 l = normalize((viewMatrix * vec4(uLight, 0.0)).xyz);
        vec3 v = normalize(vView);
        float nv = max(dot(n, v), 0.0);
        // 荒さ：濡れた所はなめらか、乾いた所と毛の筋はざらつく
        float rough = clamp(mix(0.86, 0.5, wet) + (f0 - 0.5) * 0.18 + dd * 0.2, 0.42, 0.95);   // テカらせない（濡れは墨だまりにだけ・控えめに）
        if (uMat > 2.5 && uMat < 3.5) rough = max(rough * 0.8, 0.42); else if (uMat > 4.5 && uMat < 5.5) rough = max(rough, 0.62); else if (uMat > 0.5 && uMat < 2.5 || uMat > 7.5 && uMat < 9.5) rough = 0.8;   // 墨は鈍いつやまで（磨いた墨でも墨の棒の光り方）
        float sh = 2.0 / max(0.002, pow(rough, 4.0)) - 2.0;
        vec3 hv = normalize(l + v);
        float dif = max(dot(n, l), 0.0);
        float F = 0.04 + 0.96 * pow(1.0 - max(dot(hv, v), 0.0), 5.0);
        float spe = min(pow(max(dot(n, hv), 0.0), sh) * (sh + 2.0) / 8.0 * F * dif, 0.35);   // 光の点を小さく弱く（テカらせない）
        // 墨の色：厚い所はいちばん深い黒、薄い所は少し灰に透ける（薄墨）
        vec3 base = mix(uInk * 2.4 + vec3(0.008, 0.0075, 0.007), uInk * 0.6, smoothstep(0.1, 0.7, vG));
        base *= 0.8 + 0.4 * f0;
        if (uHasDet > 0.5) {   // 原本の濃淡：かすれは灰に、紙の繊維がうっすら写る
          float fibr = vn(px * vec2(0.9, 0.12)) * 0.5 + vn(px * vec2(0.13, 1.1) + 3.0) * 0.5;
          base = mix(vec3(0.0022, 0.0023, 0.0025), vec3(0.042, 0.041, 0.040) * (0.7 + 0.6 * smoothstep(0.3, 0.75, f1)), pow(dd, 1.2)) * (0.9 + 0.2 * f0);
          base = mix(base, vec3(0.045, 0.044, 0.043) * (0.8 + 0.4 * fibr), (1.0 - smoothstep(0.1, 0.3, vG)) * 0.15);   /* v3.0 灰色のふち取りに見えたので弱く。薄い縁と糸は淡墨に透ける（墨の面の中に濃淡の階調） */
        }
        vec3 c = base * (0.34 + 0.6 * dif);   /* v1.8 部屋の回り光：濃墨と淡墨の差が正面でも見える */
        c += vec3(0.85, 0.89, 0.93) * spe * (0.25 + 0.9 * wet);
        // まわりを映す（濡れた墨は、斜めほどよく映す）
        float Fe = (0.035 + 0.965 * pow(1.0 - nv, 5.0)) * 0.55;   // 映りこみは控えめ（テカらせない）
        vec3 rv = reflect(-v, n); vec3 rw = normalize((vec4(rv, 0.0) * viewMatrix).xyz);
        vec3 env;
        if (uHasEnv > 0.5) {
          vec2 eu = vec2(atan(rw.z, rw.x) * 0.15915 + 0.5, acos(clamp(rw.y, -1.0, 1.0)) * 0.31831);
          env = texture2D(uEnv, vec2(eu.x, 1.0 - eu.y), rough * 7.0).rgb * uEnvGain;
        } else env = mix(vec3(0.05), vec3(0.75, 0.8, 0.84), smoothstep(-0.2, 0.6, rw.y));
        // 窓を背にした書のふちに光が回りこむ（逆光のふち）と、部屋の照り返しのやわらかい明るさ
        float rimK = pow(1.0 - nv, 2.4) * clamp(dot(l, -v) * 0.6 + 0.4, 0.0, 1.0);
        c += vec3(0.035, 0.035, 0.034) * rimK * (1.0 - 0.4 * dd);
        float al = 1.0;
        float T = uTime, M = uMat;
        float wrapD = dot(n, l) * 0.45 + 0.55;   // 横を向いた面も黒く落ちない（薄い素材の光の回りこみ）
        float back = max(dot(-n, l), 0.0);
        // v1.4：色は全部墨。題の違いは「墨の状態」（濡れ・乾き・擦れ・にじみ・霧・滴り）で表す
        vec3 wetInk = c + env * Fe * (1.0 - rough) * (1.0 - rough) * 0.6;          // 濡れた墨（基本）
        if (M < 0.5) {                     // 墨のまま
          c = wetInk;
        } else if (M < 1.5) {              // 菌糸 v2.0：毛羽は縁から外へ伸びる細い毛（縁に直交する細い筋）。面の中は濃い墨のまま、胞子の細かな粒だけ（大きな斑は作らない＝迷彩に見えない）
          float gP = m.g;                                                  // 厚みは画素ごと（網の頂点の段で四角い斑にならない）
          vec2 en = length(sl) > 1e-3 ? normalize(sl) : d;                 // 縁に直交する向き（厚みの傾き）
          vec2 et = vec2(-en.y, en.x);
          float hair = vn(vec2(dot(pxN, et) * 0.75, dot(pxN, en) * 0.05 - T * 0.12)) * 0.6 + vn(vec2(dot(pxN, et) * 1.5 + 7.0, dot(pxN, en) * 0.1)) * 0.4;   /* v2.3 毛羽は太めの繊維（細かすぎると砂粒に見えた） */
          float edgeZ = 1.0 - smoothstep(0.14, 0.62, gP);                   // 縁・薄い所ほど毛羽がのびる
          float grow = 0.72 + 0.28 * sin(T * 0.45 + gP * 6.0 + vn(pxN * 0.003) * 4.0);              // ゆっくり蔽っていく息
          float spk = vn(pxN * 0.42 + 3.0) * 0.55 + vn(pxN * 1.3) * 0.45;      // 胞子の細かな粒（1〜3 画素）
          float cover = clamp(edgeZ * grow * smoothstep(0.32, 0.72, hair) * 1.15 + smoothstep(0.8, 0.95, spk) * 0.08 * edgeZ, 0.0, 1.0);
          vec3 felt = vec3(0.066, 0.065, 0.063) * (0.45 + 0.5 * wrapD) * (0.72 + 0.5 * hair) + vec3(0.1, 0.1, 0.098) * pow(1.0 - nv, 2.0) * 0.45 * edgeZ;
          { vec2 ra = vec2(0.8, 0.6), rb = vec2(-0.45, 0.89);   // v2.1 芯の上を半透明の細い糸（菌糸）が二方向に薄く這う
            float th = max(smoothstep(0.86, 0.97, vn(vec2(dot(pxN, ra) * 0.9, dot(pxN, vec2(-ra.y, ra.x)) * 0.012 + T * 0.01))), smoothstep(0.88, 0.97, vn(vec2(dot(pxN, rb) * 0.8 + 5.0, dot(pxN, vec2(-rb.y, rb.x)) * 0.01))));
            cover = max(cover, th * 0.45 * (0.6 + 0.4 * grow)); }
          c = mix(wetInk, felt, cover);
          al *= mix(1.0, smoothstep(0.18, 0.5, hair + gP * 2.2), edgeZ * step(gP, 0.28));   /* 縁はほつれた毛の輪郭（まっすぐな切り口にしない） */
        } else if (M < 2.5) {              // 殻 v2.1：乾いて固まった墨の殻。ひびは一点（雛がつついた所）から放射に走って枝分かれし、ところどころ同心の割れでつながる。ひびは凹み、奥にだけ濡れた漆黒がのぞく
          vec3 crust = vec3(0.042, 0.041, 0.04) * (0.42 + 0.58 * wrapD) * (0.8 + 0.4 * f0) * (0.82 + 0.36 * vn(pxN * 0.9)) * (0.9 + 0.2 * vn(pxN * 3.1));
          vec2 qw = vUv * uWH, P0 = vec2(0.6, 0.52) * uWH; vec2 rv2 = qw - P0; float rad = length(rv2), ang = atan(rv2.y, rv2.x) + 3.14159265;
          float cr = 0.0;
          { float t = ang / 6.2831853 * 11.0 + (vn(vec2(rad * 7.0, 1.0)) - 0.5) * 0.7 + (vn(vec2(rad * 23.0, 4.0)) - 0.5) * 0.12; float k = floor(t + 0.5);
            float dl = abs(t - k) * 6.2831853 * rad / 11.0, L = 0.35 + 0.95 * h21(vec2(k, 3.0)), wd = 0.0042 * (1.0 - 0.6 * smoothstep(0.0, L, rad)) + 0.0015;
            cr = max(cr, (1.0 - smoothstep(wd, wd + fwidth(dl) * 1.2, dl)) * step(rad, L) * step(0.02, rad)); }
          { float t = ang / 6.2831853 * 26.0 + (vn(vec2(rad * 9.0, 7.0)) - 0.5) * 1.4; float k = floor(t + 0.5);
            float dl = abs(t - k) * 6.2831853 * rad / 26.0, r0 = 0.2 + 0.6 * h21(vec2(k, 8.0)), L = r0 + 0.12 + 0.3 * h21(vec2(k, 9.0)), wd = 0.0026;
            cr = max(cr, (1.0 - smoothstep(wd, wd + fwidth(dl) * 1.2, dl)) * step(r0, rad) * step(rad, L) * step(0.45, h21(vec2(k, 5.0)))); }
          for (int j = 0; j < 3; j++) { float rk = 0.22 + 0.27 * float(j) + 0.04 * (vn(vec2(ang * 3.0, float(j))) - 0.5) * 2.0; float dl = abs(rad - rk), wd = 0.0028;
            cr = max(cr, (1.0 - smoothstep(wd, wd + fwidth(dl) * 1.2, dl)) * step(0.5, h21(vec2(floor(ang * 1.9 + float(j) * 1.7), float(j) + 2.0)))); }
          cr *= smoothstep(0.12, 0.3, m.g) * smoothstep(0.0, 0.1, uU + 0.1);
          float shade = cr;                                                  // ひびの際は影で少し沈む（盛り上げない）
          vec3 inside = vec3(0.001, 0.001, 0.0012) + env * Fe * 0.5 + vec3(0.85) * spe * 1.2 + vec3(0.03, 0.03, 0.031) * pow(0.5 + 0.5 * sin(T * 0.7 - rad * 38.0 + h21(vec2(floor(ang * 1.75), 2.0)) * 6.0), 6.0) * (0.4 + 0.6 * wrapD);   // 奥の濡れた漆黒（v2.2 濡れたつやが、ひびの中をゆっくり伝う）
          c = crust + env * Fe * 0.04;
          c = mix(c, inside, cr);
        } else if (M < 3.5) {              // 滴：濡れて今にも滴りそうな、とろりとした墨。つやが強く、光を小さく映す
          c = uInk * 0.5 + env * Fe * 0.55 + vec3(0.92, 0.93, 0.95) * spe * 1.2;
        } else if (M < 4.5) {              // 霧：筆の芯は濃い墨のまま。ふちだけが墨の霧になって流れ、ほどけかける
          float fb = vn(px * 0.035 + vec2(T * 0.12, -T * 0.07)) * 0.6 + vn(px * 0.09 - vec2(T * 0.2, T * 0.05)) * 0.4;
          float rimz = 1.0 - smoothstep(0.08, 0.55, vG);
          vec3 core = vec3(0.01, 0.011, 0.012) * (0.5 + 0.5 * wrapD) + env * Fe * 0.2;
          vec3 mi = vec3(0.22, 0.225, 0.23) * (0.7 + 0.3 * wrapD);
          float mk = rimz * smoothstep(0.25, 0.75, fb);
          c = mix(core, mi, mk * 0.85);
          al = clamp(1.0 - rimz * (0.35 + 0.55 * fb), 0.15, 1.0);
        } else if (M < 5.5) {              // 宇宙 v3.0（10-23）：磨いた墨の黒の中に、雲母のかけら。大きさ（2〜6 cm）・明るさ・向きに幅があり、三つの深さに散る。角度が合ったかけらだけが光り、書の浮遊と見る向きで光る粒が移っていく（いつも同じ白い点にしない）
          c = base * (0.22 + 0.5 * dif) + env * Fe * 0.3 + vec3(0.85, 0.89, 0.93) * spe * 0.3 + vec3(0.024, 0.024, 0.025) * pow(1.0 - nv, 1.6) * (0.4 + 0.6 * wrapD);
          float pxs = length(fwidth(pxN)) + 1e-4, onB = smoothstep(0.2, 0.5, m.g);
          float gS = 0.0, sS = 0.0;
          for (int o = 0; o < 3; o++) {
            float fo = float(o), sc = fo < 0.5 ? 9.0 : (fo < 1.5 ? 17.0 : 30.0), dn = fo < 0.5 ? 0.30 : (fo < 1.5 ? 0.22 : 0.16), sd = 17.0 * fo + 3.0;
            vec2 q = pxN + v.xy * (10.0 + 28.0 * fo) * vG;                   // 深いかけらほど、見る向きでずれる（視差）
            vec2 cl = floor(q / sc); vec2 f = fract(q / sc) - 0.5 - (vec2(h21(cl + sd + 1.3), h21(cl + sd + 2.7)) - 0.5) * 0.4;
            float a = h21(cl + sd + 4.1) * 6.2832; vec2 cs = vec2(cos(a), sin(a));
            vec2 lq = vec2(dot(f, cs), dot(f, vec2(-cs.y, cs.x)));
            float sz = 0.1 + 0.28 * pow(h21(cl + sd + 5.3), 1.5);             // 小さいかけらが多く、ときどき大きい
            float shp = max(max(abs(lq.x), abs(lq.y) * (1.2 + 0.8 * h21(cl + sd + 6.1))), abs(lq.x * 0.71 + lq.y * 0.71) * 1.12);   // 角のある薄片
            float aa = fwidth(shp) + 1e-4;
            float inF = (1.0 - smoothstep(sz - aa, sz + aa, shp)) * step(h21(cl + sd), dn) * smoothstep(1.6, 4.5, sc / pxs);   // 画面で 2 画素より小さい層は消す（ちらつかない）
            vec3 fnr = normalize(n + (vec3(h21(cl + sd + 7.7), h21(cl + sd + 8.3), h21(cl + sd + 9.9)) - 0.5) * 1.3);
            float amp = pow(h21(cl + sd + 11.1), 2.2), dep = 1.0 - 0.28 * fo;
            gS += inF * pow(max(dot(fnr, hv), 0.0), 16.0 + 48.0 * h21(cl + sd + 12.7)) * (0.25 + 2.4 * amp) * dep;
            sS += inF * (0.2 + 0.8 * amp) * dep;
          }
          c += vec3(0.62, 0.63, 0.64) * min(gS, 2.2) * onB + vec3(0.03, 0.03, 0.031) * sS * (0.5 + 0.5 * wrapD) * onB;   // 光るかけら＋光らないかけらも鈍い銀の薄片として見える
        } else if (M < 6.5) {              // 夜の森の眼 v2.0：数を減らし、少し大きく。二つ並んだ照り返しが、はっきり一組に見える間あい。灯っては消える（色はつけない）
          c = wetInk + vec3(0.02, 0.02, 0.021) * pow(1.0 - nv, 1.6);
          vec2 g = pxN * 0.012; vec2 cl = floor(g); float r = h21(cl + 5.0);
          vec2 e = fract(g) - 0.5 - (vec2(h21(cl), h21(cl + 2.0)) - 0.5) * 0.4;
          float sep = 0.12 + 0.04 * h21(cl + 8.0), rad = 0.042 + 0.02 * h21(cl + 4.0);
          float lit = smoothstep(-0.2, 0.6, sin(T * (0.13 + r * 0.5) + r * 70.0) + 0.5 * sin(T * (0.37 + h21(cl + 9.0) * 0.6) + r * 13.0) - 0.25) * step(0.84, r) * smoothstep(0.3, 0.6, m.g);   /* v2.2 同時に灯るのは少しだけ */
          float tilt = (h21(cl + 6.0) - 0.5) * 0.05;
          vec2 e1 = (e - vec2(sep, tilt)) * vec2(1.25, 0.82), e2 = (e + vec2(sep, tilt)) * vec2(1.25, 0.82);   // 少し縦長の照り返し
          float pr = exp(-dot(e1, e1) / (rad * rad)) + exp(-dot(e2, e2) / (rad * rad));
          c += vec3(0.5, 0.51, 0.51) * (pr + 0.18 * (exp(-dot(e1, e1) / (6.0 * rad * rad)) + exp(-dot(e2, e2) / (6.0 * rad * rad)))) * lit;   /* v2.2 照り返しは控えめに、まわりにやわらかいにじみ */
        } else if (M < 7.5) {              // 樹液：v1.6 筋の光は外した（樹脂の傷に見えた）。濡れた墨のまま、昇る動きは滴（live.js）で出す
          c = base * (0.25 + 0.7 * dif) + env * Fe * 0.2;
        } else if (M < 8.5) {              // 蕾 v2.2（10-23）：芯は原本の濃墨。原本の白いすじ（筆の割れ）は、筆の向きにだけならした地図（prep）のまま、細長い淡墨のすじとして浮かぶ（向きのない斑・網点にしない）。ふちは薄墨がにじんで、ゆっくり広がっては戻る
          float gP = m.g;
          float aaF = 1.0 - smoothstep(0.35, 0.9, length(fwidth(pxN)));   // 細かすぎる模様は遠くで消す（モアレにしない）
          float film = smoothstep(0.35, 0.95, dd);
          float breath = 0.5 + 0.5 * sin(T * 0.75 + vn(pxN * 0.004) * 6.0);
          float band = (1.0 - smoothstep(0.02, 0.26 + 0.16 * breath, gP)) * (0.75 + 0.25 * vn(vec2(dot(pxN, pd) * 0.02, dot(pxN, d) * 0.004) + T * 0.03));
          float sh8 = vn(pxN * 0.006 + vec2(T * 0.025, -T * 0.015)) * 0.65 + vn(pxN * 0.015 + vec2(3.0 - T * 0.02, T * 0.03)) * 0.35;   /* v2.3 濃墨の塊にも、ゆっくり流れる濃淡のむら（向きの場は塊の中で定まらないので、向きに頼らない） */
          vec3 core = base * (0.42 + 0.58 * wrapD) * (0.8 + 0.4 * sh8) + vec3(0.014, 0.014, 0.015) * smoothstep(0.5, 0.85, sh8) * (0.4 + 0.6 * wrapD) + env * Fe * 0.18 + vec3(0.85) * spe * 0.3;
          float hair = smoothstep(0.35, 0.75, vn(vec2(dot(pxN, pd) * 0.28, dot(pxN, d) * 0.012 + T * 0.06))) * 0.6 + smoothstep(0.4, 0.8, vn(vec2(dot(pxN, pd) * 0.6, dot(pxN, d) * 0.025) + 7.0)) * 0.4;
          float strk = mix(0.85, 0.3 + 1.05 * hair, aaF);   // すじの中は、筆の向きの細い毛の束（一枚の平らな灰にしない）
          vec3 wash = vec3(0.034, 0.034, 0.035) * (0.6 + 0.4 * wrapD) * (0.75 + 0.5 * (1.0 - smoothstep(0.02, 0.3, gP)));   // ふちほど淡く（にじみの階調）
          vec3 mem = vec3(0.062, 0.062, 0.064) * (0.8 + 0.2 * wrapD) * strk;   // 淡墨のすじ（色は中立の墨・茶に寄せない）
          c = mix(core, wash, band * 0.7);
          c = mix(c, mem * (0.85 + 0.3 * breath), film * (0.65 + 0.2 * breath));
          { float lk = smoothstep(0.8, 0.56, m.r) * smoothstep(0.25, 0.45, gP);   /* v3.0（10-23）割れ（原本の白いすじ）：芯は形として細く抜け、両の際には向こうの障子の光が細くにじむ（灰色の膜・窪みにしない） */
            c = mix(c, vec3(0.36, 0.36, 0.35) * (0.8 + 0.2 * breath), smoothstep(0.15, 0.75, lk) * 0.9); }   /* v2.2 にじみが息をするように、ゆっくり広がっては戻る */
        } else if (M < 9.5) {              // 花びら v2.0：うすく延ばした墨の膜。厚い所は濃墨、薄い所ほど透けて淡墨（一色の灰にしない）。光を背に受けると薄い縁が明るむ。筋は筆の向き
          float gP = m.g, thinP = 1.0 - smoothstep(0.15, 0.7, gP);
          float vein = smoothstep(0.62, 0.95, vn(vec2(dot(pxN, pd) * 0.45, dot(pxN, d) * 0.02)));
          vec3 deep = base * (0.3 + 0.6 * dif);
          vec3 film = vec3(0.05, 0.05, 0.052) * (0.45 + 0.55 * wrapD) * (1.0 - vein * 0.35) * (0.85 + 0.3 * vn(pxN * 0.2)) + vec3(0.15) * back * 0.3 * thinP;
          thinP *= smoothstep(0.12, 0.45, dd);   /* v2.1 濃い墨の芯は透かさない（透けるのは薄く延ばした膜だけ） */
          c = mix(deep, film, thinP) + env * Fe * 0.12;
          al = clamp(1.0 - 0.35 * thinP * (1.0 - vein * 0.5), 0.0, 1.0);
        } else {                           // いのち：濡れた墨のつやが、拍のように満ち引きする
          float ph = fract(T / 1.05), beat = exp(-ph * 9.0) + 0.6 * exp(-max(0.0, ph - 0.22) * 10.0) * step(0.22, ph);
          float sheen = (0.5 + 0.5 * smoothstep(0.2, 0.7, m.g)) * (0.55 + 0.9 * beat);   // v2.0 濡れた墨のつや（拍のない間も、形が分かる程度に）
          c = base * (0.25 + 0.6 * dif) + env * Fe * (0.5 + 1.1 * beat) + vec3(0.9) * spe * (0.9 + 2.4 * beat) + vec3(0.07, 0.07, 0.072) * pow(1.0 - nv, 1.4) * sheen + vec3(0.05) * smoothstep(0.55, 0.9, vn(pxN * 0.01 + vec2(0.0, T * 0.05))) * beat * smoothstep(0.3, 0.7, m.g);   /* v2.2 拍が満ちたとき、つやが帯として見える */
        }
        c = mix(c, uGlow, edge * step(0.001, uU) * uEdge);
        { float sideK = max(1.0 - smoothstep(0.18, 0.5, face), wallC); vec3 matte = vec3(0.012, 0.012, 0.013) * (0.6 + 0.5 * wrapD) + env * Fe * 0.08; c = mix(c, matte, sideK * 0.4);   /* v3.0 側面を一色の灰色の板にしない（陰影を残す） */ }   /* v1.6 側面（表と裏をつなぐ厚み）は鈍い墨一色に：網の段が輪の縞に見えない */
        float kPl = smoothstep(0.02, 0.6, vPl);   /* v2.2 押した所はなだらかに（境目のくっきりした黒い円盤にしない）。明るい当たりだけ墨の明るさに抑え、模様は残す */
        c = mix(c, min(c, vec3(0.032, 0.032, 0.034)) * 0.85, kPl);   /* v1.8 押して引かれた所は濃墨のまま（乾いた灰・明るい面を出さない） */
        { float thinK = 0.45 * dd + 0.15 * (1.0 - smoothstep(0.1, 0.5, vG));   /* v3.0 縁の膜は明るくしない（灰色のふち取り） */ c += vec3(0.056, 0.056, 0.06) * (M > 1.5 && M < 2.5 ? 0.45 : (M > 0.5 && M < 1.5 || M > 5.5 && M < 6.5 ? 1.4 : (M > 4.5 && M < 5.5 ? 0.45 : 1.0))) * (0.2 + 0.8 * pow(nv, 2.2)) * (0.45 + 0.55 * thinK) * (1.0 - wallC) * (1.0 - 0.6 * kPl); }   /* v1.9 見る人の側（部屋の手前の障子）からの弱い回り光：墨だまりの丸い縁・かすれ・薄い所が淡墨に起きて、正面でも黒の切り抜きにならない */
        if (M < 0.5 || (M > 6.5 && M < 7.5)) c = min(c, vec3(0.06, 0.06, 0.064));
        /* v1.8 光を背にした縁だけ、細く明るむ（PC の正面で暗い天井の前でも字の形が浮かぶ）。面は明るくしない */
        c += vec3(0.022, 0.022, 0.021) * pow(1.0 - nv, 3.0) * max(dot(n, l), 0.0) * (1.0 - wallC) * (1.0 - 0.6 * kPl);   /* 墨のままの部屋は、どこも淡墨より明るくしない（白い当たり・テカリを出さない） */   /* 押してふくらむ面も墨の明るさまで（灰色の当たりを出さない） */
        c = mix(c, vec3(dot(c, vec3(0.3333))), 0.85);   /* v2.2 色は全部墨（映りこみの青み・茶みを抜く） */
        if (uInkCap > 0.0) { float gz = smoothstep(0.25, 0.85, 1.0 - nv), Lc = dot(c, vec3(0.3333)), cap = mix(0.16, uInkCap, gz); c *= min(1.0, cap / max(Lc, 1e-4)); }   /* v3.3 濡れた暗い墨：斜めの縁ほど明るさを低く抑える（なめらかな映りこみの帯＝金属の管にしない） */
        c *= uDeep * (0.75 + 0.25 * smoothstep(0.0, 0.06, dot(c, vec3(0.3333))));   /* v3.1 */
        if (uHasEnv > 0.5 && uRim > 0.0) { float fr = pow(1.0 - nv, 3.0) * (1.0 - 0.7 * smoothstep(0.55, 0.95, dd)); c += vec3(dot(env, vec3(0.3333))) * fr * uRim * 0.5; }   /* v3.2 縁の湿った光沢：かすれ（乾き）には出さない */   /* v3.1 濃い所ほど深く沈める（淡墨との差は残す） */
        al *= cov;   /* ふちは原本の形の 1 画素ぶんだけ柔らかく（MSAA の alphaToCoverage で段を消す） */
        gl_FragColor = vec4(c, al);
        #include <colorspace_fragment>
      }`,
  });
  const front = new THREE.Mesh(relGeo, relief(1)), back = new THREE.Mesh(relGeo, relief(-1));
  back.renderOrder = 1; front.renderOrder = 1.5;   // 透ける素材は裏を先に描く
  group.add(front, back);

  // 粒：墨の上に置き、筆の向きに沿ってほどける（奥行きの場は、シェーダと同じ式）
  const DEP = opts.depth ?? 0, SEED = opts.seed ?? 0;
  const dField = (qx, qy) => DEP * (0.45 * Math.sin(qx * 4.3 + SEED) * Math.cos(qy * 3.7 + SEED * 1.7) + 0.35 * Math.sin((qx * 0.62 + (1 - qy) * 0.38) * 6.2 + SEED * 2.3) + 0.2 * Math.sin(qy * 7.1 - qx * 2.0 + SEED * 3.1));
  const home = new Float32Array(N * 3), dir = new Float32Array(N * 3), seed = new Float32Array(N * 4);
  const D = map.data; let k = 0, guard = 0;
  while (k < N && guard++ < N * 60) {
    const x = Math.random() * map.w | 0, y = Math.random() * map.h | 0, i = (y * map.w + x) * 4;
    if (D[i] < 128) continue;
    const g = D[i + 1] / 255, a = D[i + 2] / 255 * Math.PI, ord = D[i + 3] / 255;
    const px = ((x + Math.random()) / map.w - 0.5) * width, py = ((y + Math.random()) / map.h - 0.5) * height;
    const g2 = Math.max(0, (g - 0.1) / 0.9); home.set([px, py, dField(x / map.w, y / map.h) + (Math.random() * 2 - 1) * Math.sqrt(g2 * (2 - g2)) * thick * 0.5], k * 3);
    const s = Math.random() < 0.5 ? -1 : 1;
    dir.set([Math.cos(a) * s, Math.sin(a) * s, (Math.random() - 0.5) * 0.6], k * 3);
    const w = Math.random();
    seed.set([ord, Math.random(), Math.random(), 0.35 + w * w * 1.25], k * 4);   // 大きさは小さい粒が多く、まれに大きい
    k++;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(home, 3));
  pGeo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  pGeo.setDrawRange(0, k);
  const spread = opts.spread ?? width * 0.32;
  // 流れ：近い粒どうしが同じ向きに流れる（筋になる）。ひとつずつの揺れは少しだけ
  const pVert = /* glsl */`
      uniform float uU, uTime, uLevel, uSize, uScale, uSpread, uLightPass, uToLight, uRise;
      attribute vec3 aDir; attribute vec4 aSeed;
      varying float vA; varying float vR;
      void main(){
        vR = aSeed.y * 6.2832 + uTime * (aSeed.z - 0.5) * 0.8;
        float o = aSeed.x * 0.75 + aSeed.y * 0.25;
        float p = smoothstep(o * 0.8 - 0.05, o * 0.8 + 0.4, uU);
        float t = uTime * 0.22;
        vec3 q = position * 1.35;
        vec3 flow = vec3(sin(q.y * 2.3 + t * 1.3) + 0.6 * sin(q.z * 3.1 + q.x * 1.9 - t),
                         0.7 * cos(q.x * 1.7 - t * 1.1) + 0.5 * sin(q.z * 2.2 + t * 0.7),
                         sin(q.x * 2.6 + q.y * 1.4 + t * 0.9));
        vec3 jit = vec3(sin(uTime * (0.4 + aSeed.z * 0.5) + aSeed.y * 6.28), cos(uTime * (0.35 + aSeed.w * 0.3) + aSeed.z * 6.28), sin(uTime * 0.3 + aSeed.w * 4.0));
        vec3 pos = position + aDir * p * uSpread * (0.2 + 0.9 * aSeed.y * aSeed.y)
                 + flow * p * p * uSpread * 0.2 + jit * p * uSpread * 0.03
                 + vec3(0.0, p * p * uSpread * (0.35 + 0.45 * aSeed.z) * uRise, 0.0);
        pos += normalize(vec3(aDir.y, -aDir.x, 0.4)) * sin(uTime * 9.0 + position.x * 11.0 + aSeed.y * 6.0) * uLevel * 0.025;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        // 光へ移る粒（aSeed.z が大きいもの）
        float lit = step(1.0 - uToLight, aSeed.z) * smoothstep(0.15, 0.75, p);
        float sz = uSize * aSeed.w * uScale / -mv.z * (1.0 + p * 0.5 + uLevel * 0.6);
        if (uLightPass > 0.5) { vA = lit * (0.3 + 0.3 * aSeed.y); gl_PointSize = sz * 1.9; if (vA < 0.01) gl_PointSize = 0.0; }
        else { vA = mix(0.25, 0.95, p) * (0.55 + 0.45 * aSeed.z) * (1.0 - lit * 0.9); gl_PointSize = sz; }
      }`;
  const pFrag = /* glsl */`
      uniform vec3 uPCol, uTint; uniform float uInkMode, uLightPass, uShape; varying float vA; varying float vR;
      void main(){
        vec2 c = gl_PointCoord - 0.5; float d = dot(c, c);
        if (uShape > 0.5 && uLightPass < 0.5) {                     // 花びら（細い楕円）・殻のかけら（三角）
          vec2 r = mat2(cos(vR), -sin(vR), sin(vR), cos(vR)) * c;
          float m = uShape < 1.5 ? (r.x * r.x) / 0.2 + (r.y * r.y) / 0.035 : max(abs(r.x) * 1.7 + r.y, -r.y * 2.0) * 2.4;
          if (m > 1.0) discard;
          float a = (1.0 - smoothstep(0.7, 1.0, m)) * vA;
          gl_FragColor = vec4(uPCol * (0.85 + 0.3 * r.y), a); return;
        }
        if (d > 0.25) discard;
        if (uLightPass > 0.5) { float a = exp(-d * 14.0) * vA; gl_FragColor = vec4(vec3(0.92, 0.97, 1.0) * a, a); return; }
        float a = smoothstep(0.25, 0.0, d) * vA;
        gl_FragColor = vec4(mix(uPCol, uTint, 0.18 * (1.0 - uInkMode)), a * (1.0 + uInkMode * 0.4));
      }`;
  const pMat = new THREE.ShaderMaterial({
    uniforms: { ...U, uSpread: { value: spread }, uPCol: { value: pCol }, uInkMode: { value: pMode === 'ink' ? 1 : 0 }, uLightPass: { value: 0 }, uToLight: { value: toLight }, uShape: { value: MID === 9 || MID === 8 ? 1 : MID === 2 ? 2 : 0 } },
    transparent: true, depthWrite: false, blending: pMode === 'ink' ? THREE.NormalBlending : THREE.AdditiveBlending,
    vertexShader: pVert, fragmentShader: pFrag,
  });
  const points = new THREE.Points(pGeo, pMat); points.renderOrder = 2; points.frustumCulled = false;
  group.add(points);
  let lightPts = null;
  if (toLight > 0) {
    const lMat = new THREE.ShaderMaterial({
      uniforms: { ...U, uSpread: pMat.uniforms.uSpread, uPCol: { value: pCol }, uInkMode: { value: 0 }, uLightPass: { value: 1 }, uToLight: { value: toLight }, uShape: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: pVert, fragmentShader: pFrag,
    });
    lightPts = new THREE.Points(pGeo, lMat); lightPts.renderOrder = 3; lightPts.frustumCulled = false;
    group.add(lightPts);
  }

  // 床に落ちる影（平行な光で床へ写す。ほどけると影もほどける）。sun＝光のほうへ向く向き（世界の座標）
  let shadow = null;
  function makeShadow(sun, o = {}) {
    const L = sun.clone().normalize();
    const sMat = new THREE.ShaderMaterial({
      uniforms: { ...U, uM: { value: group.matrixWorld }, uSun: { value: L }, uFloor: { value: o.floorY ?? 0.004 }, uStr: { value: o.strength ?? 0.62 }, uBl: { value: o.blur ?? 1 }, uW: { value: new THREE.Vector2(width, height) } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: /* glsl */`
        uniform mat4 uM; uniform vec3 uSun; uniform float uFloor; varying vec2 vUv; varying float vH;
        void main(){
          vUv = uv; vec4 w = uM * vec4(position.xy, 0.0, 1.0);
          vH = max(0.0, w.y - uFloor);
          vec3 f = vec3(w.x - vH * uSun.x / uSun.y, uFloor, w.z - vH * uSun.z / uSun.y);
          gl_Position = projectionMatrix * viewMatrix * vec4(f, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap; uniform float uU, uStr, uBl; uniform vec2 uW; varying vec2 vUv; varying float vH;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
        float tap(vec2 uv){ vec4 m = texture2D(uMap, uv); float o = m.a * 0.86 + vn(uv * 220.0) * 0.14; return step(0.5, m.r) * step(uU * 1.25 - 0.1, o); }
        void main(){
          float r = (0.004 + 0.012 * vH) * uBl / uW.x; vec2 ry = vec2(0.0, r * uW.x / uW.y);
          float s = tap(vUv) * 0.28 + (tap(vUv + vec2(r, 0.)) + tap(vUv - vec2(r, 0.)) + tap(vUv + ry) + tap(vUv - ry)) * 0.13
                  + (tap(vUv + vec2(r, r) * 1.7) + tap(vUv - vec2(r, r) * 1.7) + tap(vUv + vec2(r, -r) * 1.7) + tap(vUv - vec2(r, -r) * 1.7)) * 0.05;
          float a = s * uStr * (1.0 - 0.35 * smoothstep(0.5, 3.0, vH));
          if (a < 0.004) discard;
          gl_FragColor = vec4(0.0, 0.0, 0.0, a);
        }`,
    });
    shadow = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 1, 1), sMat);
    shadow.frustumCulled = false; shadow.renderOrder = 0; shadow.matrixAutoUpdate = false;
    return shadow;
  }

  // 動き：target に向かってばねで寄る。auto なら「保つ→ほどく→漂う→集まる」を繰り返す
  const st = { u: 0, du: 0, gathered: true, ph: Math.random() * 10 };
  const cyc = opts.cycle ?? [3.2, 2.6, 2.4, 2.8];
  const api = {
    group, front, back, points, lightPoints: lightPts, width, height, texture: tex, makeShadow, material: opts.material || 'ink', shadowK: MK.shadow ?? 1,
    get shadow() { return shadow; },
    target: opts.u ?? 0, auto: !!opts.auto, level: 0,
    get state() { return st; },
    setLevel(v) { api.level = v; },
    setScale(pxPerUnitAtOne) { U.uScale.value = pxPerUnitAtOne; },
    // 部屋に入ったとき：原本から作った高い解像度の地図と墨の濃さを差しこむ（形と網はそのまま）
    setIslands(t) { U.uIsl.value = t; U.uHasIsl.value = t ? 1 : 0; },   // ちぎれた墨の地図（{id}_f512.png。最近傍で読む）
    setFloat(v) { U.uFloat.value = v; },
    setHiRes(hiMap, detTex) {
      if (hiMap) { const t = new THREE.DataTexture(hiMap.data, hiMap.w, hiMap.h, THREE.RGBAFormat); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; U.uMap.value = t; U.uTexel.value.set(1 / hiMap.w, 1 / hiMap.h); }
      if (detTex) { U.uDet.value = detTex; U.uHasDet.value = 1; U.uDetTexel.value.set(1 / detTex.image.width, 1 / detTex.image.height); }
    },
    pull: 0, pullV: 0, pullTarget: 0,
    kick(v, uv, side) { api.kickT = Math.max(api.kickT || 0, v); if (uv) U.uTouch.value.copy(uv); if (side) U.uPullS.value = side < 0 ? -1 : 1; },   // side＝見ている側（裏から押せば裏へ引かれる）   // 触れた・音が強い：振動を一瞬大きく
    burstA: 99,
    burst(uv, side) { api.burstA = 0; if (uv) U.uTouch.value.copy(uv); if (side) U.uPullS.value = side < 0 ? -1 : 1; },   // v3.3 触れた：字が波打って崩れ、散って、戻る
    setLight(dir) { U.uLight.value.copy(dir).normalize(); },   // 部屋の窓の向きから照らす
    setEnv(t, gain) { U.uEnv.value = t; U.uHasEnv.value = t ? 1 : 0; if (gain != null) U.uEnvGain.value = gain; },
    update(dt, t) {
      dt = Math.min(dt, 0.1);
      if (api.auto) {
        const T = cyc.reduce((a, b) => a + b, 0), x = (t + st.ph) % T;
        api.target = x < cyc[0] ? 0 : x < cyc[0] + cyc[1] + cyc[2] ? 1 : 0;
      }
      const w = 2.2, a = w * w * (api.target - st.u) - 2 * w * st.du;   // 臨界減衰のばね
      st.du += a * dt; st.u = Math.min(1.02, Math.max(0, st.u + st.du * dt));
      U.uU.value = st.u; U.uTime.value = t;
      U.uLevel.value += (api.level - U.uLevel.value) * Math.min(1, dt * 12);
      { const w = 9.0, z = 0.22; const a = w * w * (api.pullTarget - api.pull) - 2 * z * w * api.pullV; api.pullV += a * dt; api.pull += api.pullV * dt; U.uPull.value = api.pull; }   // ばね（減衰振動）
      api.kickT = Math.max(0, (api.kickT || 0) - dt * 2.2); U.uKick.value = Math.min(1, api.kickT + api.level * 0.6);
      if (api.burstA < 4) api.burstA += dt; U.uBurstA.value = api.burstA < 4 ? api.burstA : 99;
      if (shadow) shadow.visible = group.visible;
    },
    dispose() { relGeo.dispose(); pGeo.dispose(); front.material.dispose(); back.material.dispose(); pMat.dispose(); lightPts?.material.dispose(); shadow?.geometry.dispose(); shadow?.material.dispose(); tex.dispose(); },
  };
  return api;
}

/* ───────── 音（Web Audio の合成だけ） ─────────
   型：water（木の中の水と養分）・dew（クモの巣の水滴）・void（宇宙の虚空間）・bloom（花の産声）・oto（音）
   update(state, dt) に sho.state を渡すと、ほどける速さ |du| に合わせて粒の音を重ね、集まりきったところで一打。 */
let SHARED = null, HALL = null;
// 一打の型（触れたとき・集まりきったとき）：[周波数, 余韻 秒, 大きさ]
// v10（10-24 本人「もっと音を伸ばして」）：触れたときの余韻を長く（短い型でも 5 秒・長い型は約 2.2 倍）。長く鳴るぶん響きが溜まるので、初めの大きさは少し下げる（大きさ×(元の長さ/新しい長さ)^0.25）
const LONG = d => Math.max(5, d * 2.2);
const STRIKES = { water: [[120, 0.5, 0.3], [240, 0.25, 0.08]], dew: [[2093, 1.6, 0.06], [2637, 1.4, 0.05], [3136, 1.2, 0.04]], void: [[41, 2.8, 0.35], [82, 2.0, 0.1]], bloom: [[523, 1.4, 0.1], [784, 1.1, 0.06], [1047, 0.9, 0.04]], oto: [[220, 3.2, 0.14], [594, 2.4, 0.07], [1122, 1.6, 0.04]], spore: [[73.4, 3.0, 0.2], [146.8, 2.2, 0.06]], shell: [[1760, 0.5, 0.06], [2960, 0.35, 0.04], [880, 0.6, 0.05]], mist: [[196, 3.6, 0.08], [293.7, 3.0, 0.05]], eyes: [[329.6, 2.4, 0.08], [987.8, 1.6, 0.03]], pulse: [[110, 1.4, 0.2], [220, 1.0, 0.06]] };
// 回廊の響き：合成した残響（録音の素材を使わない）。書がいくつあっても一つを共有する
function hall(ctx, dest) {
  if (HALL && HALL.ctx === ctx) return HALL;
  const sr = ctx.sampleRate, len = Math.round(sr * 6.0), ir = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch); let lp = 0;
    // 初めの反射：柱と床と天井のあいだ（左右で少しずらす）
    [0.011, 0.019, 0.027, 0.041, 0.058, 0.077, 0.101].forEach((tt, i) => { const j = Math.round((tt + ch * 0.0031 * (i % 3)) * sr); if (j < len) d[j] += (i % 2 ? -1 : 1) * 0.5 / (1 + i * 0.45); });
    for (let i = 0; i < len; i++) {
      const tt = i / sr, k = Math.min(1, tt / 0.6);           // 時間とともに高い音から消える
      lp += (Math.random() * 2 - 1 - lp) * (0.55 - 0.47 * k);
      d[i] += lp * Math.exp(-tt * 1.15) * (tt < 0.012 ? tt / 0.012 : 1) * 0.6;
    }
  }
  const conv = ctx.createConvolver(); conv.buffer = ir;
  // v10 重ねて鳴らしても割れない・うるさくならない（大きい所だけやわらかく抑える）
  const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -16; lim.knee.value = 12; lim.ratio.value = 5; lim.attack.value = 0.004; lim.release.value = 0.5; lim.connect(dest);
  const master = ctx.createGain(); master.gain.value = 1; master.connect(lim);
  const wet = ctx.createGain(); wet.gain.value = 0.34; conv.connect(wet); wet.connect(master);
  return (HALL = { ctx, conv, master });
}
export function createShoSound(preset = 'oto', opts = {}) {
  let ctx = null, out = null, an = null, bedG = null, buf = null, on = false, acc = 0, wasOpen = false, swG = null, swF = null, WB = null, holdG = null, holdO = null, held = false, relAt = 0, atkEnd = 0, holdSeen = 0;
  const hits = [];   // v10 続けて触れた回数（重ねるほど一打を小さく）
  const vol = opts.volume ?? 0.5;
  const P = opts.pitch ?? 1;   // 音の高さ（同じ型の書を聞き分けるため。1＝そのまま）
  const r = (a, b) => a + Math.random() * (b - a);
  const api = {
    preset, level: 0,
    get running() { return on; },
    wave() { if (!an) return null; an.getFloatTimeDomainData(buf); return buf; },   // 波形（画面の層に描く）
    async start() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; ctx = opts.context || (SHARED ||= new AC());   // 書が幾つあっても一つの AudioContext
        out = ctx.createGain(); out.gain.value = 0;
        an = ctx.createAnalyser(); an.fftSize = 512; buf = new Float32Array(an.fftSize);
        const H = hall(ctx, opts.destination || ctx.destination);
        out.connect(an); an.connect(H.master);
        const send = ctx.createGain(); send.gain.value = opts.reverb ?? 0.55; out.connect(send); send.connect(H.conv);
        // ほどける音のさざめき（粒が散る速さで、紙や砂がこすれるような息）
        const ns = ctx.createBufferSource(); ns.buffer = (WB ||= noiseBuf(ctx, true)); ns.loop = true;
        swF = ctx.createBiquadFilter(); swF.type = 'bandpass'; swF.frequency.value = 2400; swF.Q.value = 0.8;
        swG = ctx.createGain(); swG.gain.value = 0; ns.connect(swF); swF.connect(swG); swG.connect(out); ns.start();
        bedG = ctx.createGain(); bedG.gain.value = 0; bedG.connect(out);
        bed(ctx, bedG, preset);
      }
      if (ctx.state !== 'running') await ctx.resume();
      out.gain.setTargetAtTime(vol, ctx.currentTime, 0.4); on = true;
    },
    stop() { if (!ctx) return; out.gain.setTargetAtTime(0, ctx.currentTime, 0.2); on = false; },
    toggle() { return on ? (api.stop(), false) : (api.start(), true); },
    gain(v) { if (ctx && on) out.gain.setTargetAtTime(vol * v, ctx.currentTime, 0.25); },   // 遠い書は小さく
    // 触れた所で鳴る：x,y は書の上の位置（0..1・上が 1）、k は強さ（0..1）。上ほど高く、左右で定位、強いほど大きい
    touch(x = 0.5, y = 0.5, k = 0.7) {
      if (!ctx || !on) return;
      const t = ctx.currentTime + 0.005, pitch = 0.82 + 0.4 * y, pan = (x - 0.5) * 1.4;
      const set = STRIKES[preset] || STRIKES.oto;
      while (hits.length && hits[0] < t - 4) hits.shift(); hits.push(t);
      const duck = 1 / Math.sqrt(1 + 0.7 * (hits.length - 1));   // v10 余韻が重なるぶん、続けて触れたら小さく
      set.forEach(([f, d, a], i) => { const L = LONG(d) * (0.8 + 0.2 * k) * (i ? 0.85 : 1), eq = Math.pow(d * (0.6 + 0.4 * k) / L, 0.25); a *= eq; voiceAt(t, 'sine', f * pitch, L, a * (0.5 + 0.8 * k) * duck, pan * (i % 2 ? 0.6 : 1)); voiceAt(t + 0.003, 'sine', f * pitch * 1.0035, L * 0.75, a * 0.4 * k * duck, -pan * 0.5); });
      for (let i = 0; i < 3 + Math.round(k * 4); i++) grain(ctx, out, preset, t + 0.02 + Math.random() * 0.25, (0.4 + 0.6 * k) * duck);
      sustain(t, f0(set) * pitch, k, duck);
    },
    // v10 押しているあいだ（震えているあいだ）音も続き、離すと長い余韻（約 6 秒）で静まる。毎こま呼ぶ：pressed＝押している、vib＝震えの強さ 0..1
    hold(pressed, vib = 0) {
      if (!ctx || !holdG) return;
      const now = ctx.currentTime; holdSeen = now;
      if (!pressed && held) release(now);
      if (held && holdO) holdO.tg.gain.setTargetAtTime(0.18 + 0.22 * vib, now, 0.1);
    },
    update(s, dt) {
      if (!ctx || !on) { api.level *= 0.9; return; }
      const now = ctx.currentTime;
      if (held && now - holdSeen > 0.4 && now > atkEnd + 0.3) release(now);   // hold() を呼ばない使い方でも、叩いた音は長い余韻で静まる
      if (!held && holdO && now - relAt > 10) { try { holdO.os.forEach(o => o.stop()); holdO.lf.stop(); } catch (e) { /* もう止まっている */ } holdO = null; }
      bedG.gain.setTargetAtTime(0.25 + 0.75 * Math.min(1, s.u), now, 0.3);
      const speed = Math.abs(s.du);
      swG.gain.setTargetAtTime(Math.min(0.16, speed * 0.2), now, 0.08);
      swF.frequency.setTargetAtTime((s.du > 0 ? 1500 : 3200) + speed * 1800, now, 0.1);
      acc += dt * (0.4 + speed * 26 + s.u * 2.5);
      let n = 0;
      while (acc > 1 && n++ < 6) { acc -= 1; grain(ctx, out, preset, now + Math.random() * 0.05, Math.min(1, 0.3 + speed)); }
      if (s.u > 0.5) wasOpen = true;
      if (wasOpen && s.u < 0.03 && Math.abs(s.du) < 0.08) { wasOpen = false; strike(ctx, out, preset, now + 0.02); }
      an.getFloatTimeDomainData(buf); let e = 0; for (let i = 0; i < buf.length; i++) e += buf[i] * buf[i];
      api.level = Math.min(1, Math.sqrt(e / buf.length) * 7);
    },
  };
  return api;

  function noiseBuf(c, white) { const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0); let br = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; br = (br + 0.02 * w) / 1.02; d[i] = white ? w * 0.35 * (0.6 + 0.4 * Math.sin(i / 1900) * Math.sin(i / 517)) : preset === 'dew' ? w * 0.5 : br * 3.5; } return b; }
  function bed(c, dst, p) {
    const src = c.createBufferSource(); src.buffer = noiseBuf(c); src.loop = true;
    const f = c.createBiquadFilter(); const g = c.createGain();
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.13; lfo.connect(lg); lg.connect(f.frequency);
    if (p === 'water') { f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.9; lg.gain.value = 160; g.gain.value = 0.5; }
    else if (p === 'dew') { f.type = 'highpass'; f.frequency.value = 2600; lg.gain.value = 600; g.gain.value = 0.05; }
    else if (p === 'void') { f.type = 'lowpass'; f.frequency.value = 180; lg.gain.value = 60; g.gain.value = 0.7; }
    else if (p === 'bloom') { f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 0.7; lg.gain.value = 400; g.gain.value = 0.18; }
    else if (p === 'spore') { f.type = 'bandpass'; f.frequency.value = 260; f.Q.value = 1.2; lg.gain.value = 90; g.gain.value = 0.45; }
    else if (p === 'shell') { f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.6; lg.gain.value = 300; g.gain.value = 0.06; }
    else if (p === 'mist') { f.type = 'lowpass'; f.frequency.value = 900; lg.gain.value = 500; g.gain.value = 0.32; }
    else if (p === 'eyes') { f.type = 'highpass'; f.frequency.value = 3800; lg.gain.value = 900; g.gain.value = 0.035; }
    else if (p === 'pulse') { f.type = 'lowpass'; f.frequency.value = 240; lg.gain.value = 40; g.gain.value = 0.35; }
    else { f.type = 'lowpass'; f.frequency.value = 700; lg.gain.value = 200; g.gain.value = 0.18; }
    src.connect(f); f.connect(g); g.connect(dst); src.start(); lfo.start();
    const drone = { void: [55, 55.6, 82.4], oto: [98, 146.8, 196], water: [65.4], bloom: [261.6, 392], dew: [], spore: [49, 73.4], shell: [], mist: [130.8, 196.6], eyes: [61.7], pulse: [55] }[p] || [];
    if (p === 'pulse') { const beat = () => { if (!on) return setTimeout(beat, 1050); const t0 = c.currentTime + 0.02; voice(c, dst, t0, 'sine', 62, 44, 0.012, 0.22, 0.22, 0); voice(c, dst, t0 + 0.24, 'sine', 56, 40, 0.012, 0.2, 0.14, 0); setTimeout(beat, 1050); }; setTimeout(beat, 300); }
    drone.forEach((hz, i) => { const o = c.createOscillator(), og = c.createGain(); o.frequency.value = hz * P; og.gain.value = (p === 'void' ? 0.09 : 0.035) / (1 + i * 0.6); o.connect(og); og.connect(dst); o.start(); });
  }
  function voice(c, dst, t, type, f0, f1, att, dec, peak, pan) {
    const o = c.createOscillator(), g = c.createGain(), sp = c.createStereoPanner ? c.createStereoPanner() : null;
    o.type = type; o.frequency.setValueAtTime(f0 * P, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1 * P, t + att + dec * 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + att + dec);
    o.connect(g); if (sp) { sp.pan.value = pan; g.connect(sp); sp.connect(dst); } else g.connect(dst);
    o.start(t); o.stop(t + att + dec + 0.05);
  }
  function grain(c, dst, p, t, k) {
    const pan = r(-0.7, 0.7);
    if (p === 'water') { const f = r(280, 900); voice(c, dst, t, 'sine', f, f * r(1.5, 2.2), 0.004, r(0.06, 0.14), 0.12 * k, pan); }
    else if (p === 'dew') { const f = r(1700, 3400); voice(c, dst, t, 'sine', f, 0, 0.002, r(0.35, 0.9), 0.07 * k, pan); voice(c, dst, t, 'sine', f * 2.76, 0, 0.002, 0.2, 0.02 * k, pan); }
    else if (p === 'void') { const f = [110, 146.8, 164.8, 220, 293.7][Math.random() * 5 | 0]; voice(c, dst, t, 'sine', f, 0, r(0.25, 0.5), r(1.2, 2.2), 0.05 * k, pan); }
    else if (p === 'bloom') { const f = r(380, 620); voice(c, dst, t, 'triangle', f, f * r(1.8, 2.6), 0.01, r(0.08, 0.18), 0.06 * k, pan); }
    else if (p === 'spore') { voice(c, dst, t, 'triangle', r(160, 420), r(120, 300), r(0.08, 0.2), r(0.6, 1.4), 0.03 * k, pan); }
    else if (p === 'shell') { const f = r(2400, 5200); voice(c, dst, t, 'square', f, f * 0.7, 0.001, r(0.015, 0.04), 0.03 * k, pan); voice(c, dst, t, 'sine', f * 0.5, 0, 0.001, 0.08, 0.03 * k, pan); }
    else if (p === 'mist') { voice(c, dst, t, 'sine', r(300, 900), 0, r(0.4, 0.9), r(1.4, 2.6), 0.022 * k, pan); }
    else if (p === 'eyes') { const f = r(3000, 5400); voice(c, dst, t, 'sine', f, f * 1.04, 0.004, r(0.04, 0.09), 0.025 * k, pan); voice(c, dst, t + 0.11, 'sine', f, f * 1.04, 0.004, 0.06, 0.018 * k, pan); }
    else if (p === 'pulse') { const f = r(400, 800); voice(c, dst, t, 'sine', f, 0, r(0.05, 0.12), r(0.4, 0.9), 0.035 * k, pan); }
    else { Math.random() < 0.5 ? voice(c, dst, t, 'sine', r(500, 1400), 0, 0.003, r(0.3, 0.7), 0.06 * k, pan) : voice(c, dst, t, 'sine', r(300, 700), r(600, 1300), 0.004, 0.1, 0.08 * k, pan); }
  }
  function f0(set) { return set[0][0]; }
  function release(now) { held = false; const t0 = Math.max(now, atkEnd); holdG.gain.cancelScheduledValues(t0); holdG.gain.setTargetAtTime(0, t0, 1.3); relAt = t0; }
  // v10 続く音：一打の基の音と、その上の音を、少しずらした二つでうならせ、震えに合わせてゆらす（押すあいだ鳴り続け、hold(false) で長く静まる）
  function sustain(t, f, k, duck) {
    if (!holdG) { holdG = ctx.createGain(); holdG.gain.value = 0; holdG.connect(out); }
    if (!holdO) {
      const set = STRIKES[preset] || STRIKES.oto, tg = ctx.createGain(); tg.gain.value = 0.3; tg.connect(holdG);
      const lf = ctx.createOscillator(), lg = ctx.createGain(); lf.frequency.value = 5.2; lg.gain.value = 0.12; lf.connect(lg); lg.connect(tg.gain); lf.start(t);
      const os = [], ms = [1, 1.004, (set[1] ? set[1][0] : set[0][0] * 2) / set[0][0]];
      [[ms[0], 1], [ms[1], 0.7], [ms[2], 0.35]].forEach(([m, a]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * m; g.gain.value = a; o.connect(g); g.connect(tg); o.start(t); os.push(o); });
      holdO = { os, lf, tg, ms };
    } else holdO.os.forEach((o, i) => o.frequency.setTargetAtTime(f * holdO.ms[i], t, 0.05));
    const A = (STRIKES[preset] || STRIKES.oto)[0][2] * 0.2 * (0.5 + 0.6 * k) * duck;
    holdG.gain.cancelScheduledValues(t); holdG.gain.setValueAtTime(Math.max(0.0001, holdG.gain.value), t); holdG.gain.linearRampToValueAtTime(A, t + 0.06); atkEnd = t + 0.06;
    held = true;   // 叩いただけ（すぐ離す）のときは、次の hold(false) から長い余韻で静まる
  }
  function voiceAt(t, type, f, dec, peak, pan) { voice(ctx, out, t, type, f / P, 0, 0.004, dec, peak, Math.max(-1, Math.min(1, pan))); }
  function strike(c, dst, p, t) {
    const set = STRIKES[p] || STRIKES.oto; 
    // 一打は、少しずれた二つの音のうなり（鈴や鉢のように）と、左右のひろがり
    set.forEach(([f, d, a], i) => { a *= Math.pow(d / LONG(d), 0.25); voice(c, dst, t, 'sine', f, 0, 0.006, LONG(d), a, i % 2 ? 0.25 : -0.25); voice(c, dst, t + 0.004, 'sine', f * 1.0035, 0, 0.008, LONG(d) * 0.8, a * 0.6, i % 2 ? -0.3 : 0.3); });
    // 墨が紙に触れたような、短い息（打つ前の空気）
    const nb = c.createBufferSource(); nb.buffer = (WB ||= noiseBuf(c, true)); const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 0.6;
    const ng = c.createGain(); ng.gain.setValueAtTime(0.0001, t - 0.01); ng.gain.exponentialRampToValueAtTime(0.09, t + 0.02); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    nb.connect(nf); nf.connect(ng); ng.connect(dst); nb.start(Math.max(c.currentTime, t - 0.01)); nb.stop(t + 0.4);
  }
}
