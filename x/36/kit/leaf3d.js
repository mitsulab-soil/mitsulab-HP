/* 2026-11-10 近くのケヤキの葉を、写真の札でなく立体の葉に。
   ケヤキの葉＝互生・二列に並ぶ・卵形〜狭卵形で先は尾状にとがり、縁は先の曲がった鋸歯、長さ 3〜7 cm 程度（長い枝では 12 cm ほどまで）。
   一枚の葉の形（鋸歯は形そのもの）を一つ作り、札のあった位置に小枝ごとの葉の並びとしてインスタンスで多数置く。描画は木 1 本につき 1 回。
   遠くは今の札のまま。近い数本だけをこの葉にし、境目は距離で葉の数を間引いて溶かす。 */
export function makeLeaf3D(THREE, { teeth = 5, wide = .3 } = {}) {
  // ---- 一枚の葉の形（長さ 1・付け根が原点・+Y が先・+Z が表）。片側 5 つの鋸歯 ----
  function leafGeo() {
    const T = 5, pos = [], uv = [], idx = [];
    const width = t => wide * Math.pow(Math.sin(Math.PI * Math.pow(t, .8)), 1.1) * (1 - .35 * t);   // 付け根側が広く、先が細くとがる
    const bend = t => -.12 * t * t;   // 先へ向けて少し下（裏）へ反る
    const mid = []; const ts = [];
    for (let i = 0; i <= T; i++) ts.push(.04 + .9 * i / T);
    const P = (x, y) => { pos.push(x, y, bend(y) - Math.abs(x) * .18); uv.push(x / .6 + .5, y); return pos.length / 3 - 1; };   // 横には中肋で浅い V 字に折れる
    const base = P(0, 0), tip = P(0, 1);
    for (const t of ts) mid.push(P(0, t));
    for (const s of [1, -1]) {
      const notch = ts.map((t, i) => P(s * width(t) * .86, t + (s < 0 ? .015 : 0)));   // 左右で少しずらす（付け根がわずかに非対称）
      // 中肋と切れ込みの間の帯
      let prevM = base, prevN = base;
      for (let i = 0; i < ts.length; i++) { const m = mid[i], n = notch[i]; if (prevM !== prevN) { s > 0 ? idx.push(prevM, prevN, n, prevM, n, m) : idx.push(prevM, n, prevN, prevM, m, n); } else { s > 0 ? idx.push(base, n, m) : idx.push(base, m, n); } prevM = m; prevN = n; }
      s > 0 ? idx.push(prevM, prevN, tip) : idx.push(prevM, tip, prevN);
      // 鋸歯：切れ込みの間に、先へ向いて曲がった歯先
      for (let i = 0; i + 1 < ts.length; i++) { if (teeth < 5 && i < 5 - teeth) continue; const t = (ts[i] * .3 + ts[i + 1] * .7), th = P(s * (width(t) * (teeth ? 1.02 : .99) + (teeth ? .012 : 0)), t + (teeth ? .04 : .01)); s > 0 ? idx.push(notch[i], th, notch[i + 1]) : idx.push(notch[i], notch[i + 1], th); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    g.computeVertexNormals();
    { const N = g.attributes.normal; for (let i = 0; i < N.count; i++) { const z = N.getZ(i); N.setXYZ(i, N.getX(i) * .5, N.getY(i) * .5, Math.sign(z || 1) * Math.max(Math.abs(z), .8)); } }   // 葉の面の陰をなめらかに（ほぼ表向き）
    return g;
  }
  return { LG: leafGeo() };
}

/* 樹種ごとの葉（確かめた範囲・模式）：ケヤキ 3〜7 cm・鋸歯／シラカシ 6〜11 cm・細く上半分に鋸歯／スダジイ 5〜10 cm・全縁／クスノキ 6〜10 cm・全縁で黄緑／エノキ 4〜8 cm・上半分に鋸歯 */
export const LEAFSP = { keyaki: { l: [.052, .072], teeth: 5, wide: .3, col: [.18, .3, .1] }, kashi: { l: [.07, .1], teeth: 3, wide: .2, col: [.13, .22, .09] }, shii: { l: [.06, .11], teeth: 0, wide: .26, col: [.12, .2, .08] }, kusu: { l: [.065, .09], teeth: 0, wide: .28, col: [.22, .32, .1] }, enoki: { l: [.05, .09], teeth: 3, wide: .32, col: [.19, .3, .11] } };
export function makeLeafAtlas(THREE, renderer, { size = 1024, card = .87, seed = 11, sp = "keyaki" } = {}) {
  const S = LEAFSP[sp] || LEAFSP.keyaki;
  let sd = seed; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const { LG } = makeLeaf3D(THREE, { teeth: S.teeth, wide: S.wide });
  const sc = new THREE.Scene(), half = card / 2;
  const cam = new THREE.OrthographicCamera(-half, half, half, -half, -5, 5); cam.position.z = 2;
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vLuv; varying float vFz;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvLuv = uv;").replace("#include <project_vertex>", "#include <project_vertex>\nvFz = (modelViewMatrix * instanceMatrix * vec4(0., 0., 1., 0.)).z;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vLuv; varying float vFz;").replace("#include <color_fragment>", `#include <color_fragment>
 { float mx = abs(vLuv.x - .5); float vein = 1. + .1 * (1. - smoothstep(.0, .03, mx));
   float sv = abs(fract(vLuv.y * 8. - mx * 6.) - .5); vein *= .95 + .05 * smoothstep(.0, .14, sv);
   float lit = .78 + .26 * (vLuv.x < .5 ? 1. : .7) * (.6 + .4 * vLuv.y);   // 中肋で折れた左右で明るさが少し違う
   if (vFz < 0.) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.55, .62, .45), .45);   // 裏は白みの淡い緑
   diffuseColor.rgb *= vein * lit; }`);
  };
  const N = 4 * 190, im = new THREE.InstancedMesh(LG, mat, N); im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  const twigPos = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  let n = 0;
  for (let quad = 0; quad < 4; quad++) {
    const ox = (quad % 2 ? .25 : -.25) * card, oy = (quad < 2 ? -.25 : .25) * card, R = card * .25;   // 区画の中心
    // 小枝：区画の下の角から斜め上へ伸びる主枝と、左右へ互い違いの側枝（ケヤキの枝先は細かく分かれて扇形）
    const a0 = Math.PI * (.3 + r() * .15), base = new THREE.Vector2(ox - Math.cos(a0) * R * .9, oy - Math.sin(a0) * R * .9);
    const shoots = [[base.x, base.y, a0, R * 1.75, 0]];
    for (let k = 1; k <= 5; k++) { const t = k / 6.3, side = k % 2 ? 1 : -1; shoots.push([base.x + Math.cos(a0) * R * 1.75 * t, base.y + Math.sin(a0) * R * 1.75 * t, a0 + side * (.55 + r() * .3), R * (.75 - t * .35) * (.8 + r() * .4), 1]); }
    for (const [sx, sy, ang, len, lvl] of shoots) { const sh = .66 + r() * .5;   // 小枝ごとに日なたと陰（房のまとまり）
      twigPos.push(sx, sy, -.2, sx + Math.cos(ang) * len, sy + Math.sin(ang) * len, -.2);
      const nl = Math.round(len / (S.l[0] * .55));   // 葉はおよそ 2.8 cm ごとに互生
      for (let j = 0; j < nl && n < N; j++) {
        const t = (j + .6) / (nl + .3), side = j % 2 ? 1 : -1, x = sx + Math.cos(ang) * len * t, y = sy + Math.sin(ang) * len * t;
        const L = (S.l[0] + r() * (S.l[1] - S.l[0])) * (1.06 - t * .3) * (lvl ? .96 : 1.08);   // 枝先ほど小さい
        const la = ang + side * (.75 + r() * .35 - t * .25);   // 葉は枝から斜め前へ
        e.set((r() - .5) * .9, (r() - .5) * 1.1 + (r() < .1 ? Math.PI : 0), la - Math.PI / 2); q.setFromEuler(e);   // 少しねじれ、ときどき裏を見せる
        m.compose(p.set(x + Math.cos(la) * .004, y + Math.sin(la) * .004, r() * .1), q, s.set(L, L, L)); im.setMatrixAt(n, m);
        const g = (.84 + r() * .16) * sh * (.88 + .24 * t), w = r(); c.setRGB((S.col[0] + w * .05) * g, (S.col[1] + w * .03) * g, S.col[2] * g); im.setColorAt(n, c); n++;
      }
    }
  }
  im.count = n; sc.add(im);
  { const tg = new THREE.BufferGeometry(); tg.setAttribute("position", new THREE.Float32BufferAttribute(twigPos, 3)); sc.add(new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: "#4a3a2c" }))); }
  const rt = new THREE.WebGLRenderTarget(size, size, { samples: 4, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  rt.texture.colorSpace = THREE.SRGBColorSpace; rt.texture.anisotropy = 2;
  const old = renderer.getRenderTarget(), oc = new THREE.Color(), oa = renderer.getClearAlpha(); renderer.getClearColor(oc);
  renderer.setRenderTarget(rt); renderer.setClearColor("#3c5226", 0); renderer.clear(); renderer.render(sc, cam);
  renderer.setRenderTarget(old); renderer.setClearColor(oc, oa);
  im.dispose(); mat.dispose();
  return rt.texture;
}
