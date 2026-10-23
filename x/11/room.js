// Qualia/sho ── 一つの書のための部屋（v4 2026-10-22）
// © mitsulab. All rights reserved.
// 本人「１部屋に１作品にして、空間全体で体感する」「ゆかのシマシマはやめて、古寺のような木のゆかに」。
// 古寺の一室：年月を経た板の間（Poly Haven「Dark Wooden Planks」CC0）・柱と長押・格天井・障子の格子窓。
// 光は格子窓から差す柔らかい光（縞にしない）。霞と塵。部屋ごとに、窓の向き・光の強さ・霞・壁が題に応じて変わる（色は墨と木と紙だけ）。
import * as THREE from 'three';

// 部屋の型（題の読みで、光と空気を変える）
export const ROOMS = {
  oto: { win: 'n', sun: 1.3, haze: 0.06, fog: 0.035, walls: ['wood', 'shoji', 'wood', 'wood'], dust: 1.0, expo: 1.0 },
  '001': { win: 'n', sun: 0.8, haze: 0.07, fog: 0.05, walls: ['wood', 'plaster', 'wood', 'wood'], dust: 1.8, expo: 0.85 },
  '007': { win: 'e', sun: 1.45, haze: 0.04, fog: 0.03, walls: ['plaster', 'shoji', 'plaster', 'shoji'], dust: 0.8, expo: 1.1 },
  '008': { win: 'e', sun: 1.3, haze: 0.06, fog: 0.035, walls: ['shoji', 'shoji', 'wood', 'wood'], dust: 0.6, expo: 1.0, morning: true },
  '012': { win: 'w', sun: 0.9, haze: 0.12, fog: 0.07, walls: ['plaster', 'shoji', 'plaster', 'shoji'], dust: 0.4, expo: 1.05 },
  '020': { win: 'top', sun: 1.45, haze: 0.08, fog: 0.03, walls: ['wood', 'shoji', 'wood', 'plaster'], dust: 1.4, expo: 1.05 },
  '025': { win: 'n', sun: 0.6, haze: 0.06, fog: 0.05, walls: ['wood', 'wood', 'wood', 'shoji'], dust: 0.6, expo: 0.8 },
  '027': { win: 'top', sun: 1.25, haze: 0.06, fog: 0.035, walls: ['plaster', 'shoji', 'shoji', 'shoji'], glow: [0, 0.7, 0.95, 0.5], wide: [0, 1, 2, 3], dust: 1.0, expo: 0.95, tall: true },   // v5.4 西は漆喰の壁（古寺らしさ。板壁だと墨が闇に溶けた）・障子の明るさは面ごとに違う（東が明るく、南は暗め）・北（正面の奥）は中の柱を外して、上の点の後ろに柱が来ない
  hall: { win: 'top', sun: 1.35, haze: 0.05, fog: 0.03, walls: ['plaster', 'shoji', 'shoji', 'shoji'], glow: [0, 0.36, 0.5, 0.3], wide: [0, 1, 2, 3], dust: 1.4, expo: 0.9, tall: true, shojiK: 0.78, noSky: true, niches: [{ side: 1, x: 3.2, w: 3.0 }, { side: 2, x: -1.9, w: 2.8 }] },   /* v9 北（027 の紙）と東（025 の紙）に漆喰の壁 */   /* v8 障子をもう一段落とす・天窓の白い四角を出さない（光は天井の上から） */   /* 障子を一段落とす（墨の階調が白飛びの前で潰れない） */   // v7 一つの広間（027 の部屋の作りを広げた。西は漆喰＝紙の原本を掛ける）
  '034': { win: 'w', sun: 1.15, haze: 0.05, fog: 0.04, walls: ['shoji', 'shoji', 'plaster', 'shoji'], dust: 0.7, expo: 1.1 },
  '035': { win: 'e', sun: 1.5, haze: 0.06, fog: 0.035, walls: ['shoji', 'shoji', 'open', 'wood'], dust: 1.2, expo: 1.1 },
  '038': { win: 'w', sun: 0.9, haze: 0.05, fog: 0.045, walls: ['wood', 'shoji', 'wood', 'shoji'], dust: 0.6, expo: 0.8, pulse: true },
};

let HALF = 7; const H0 = 6.2;
export function setRoomHalf(h) { HALF = h; }   // v7（10-23 本人「一つの広間」）：広間は部屋より広く
let TEX = null;
// 障子紙：楮の繊維・漉きむら・日焼けのむら（canvas で一度だけ作る。写真の素材は使わない）
let WASHI = null;
function washi() {
  if (WASHI) return WASHI;
  const W = 1024, Hh = 512, c = document.createElement('canvas'); c.width = W; c.height = Hh; const x = c.getContext('2d');
  x.fillStyle = '#e9e7e1'; x.fillRect(0, 0, W, Hh);
  for (let i = 0; i < 60; i++) { const g = x.createRadialGradient(Math.random() * W, Math.random() * Hh, 0, Math.random() * W, Math.random() * Hh, 60 + Math.random() * 220); const a = Math.random() * 0.06; g.addColorStop(0, `rgba(${Math.random() < 0.5 ? '255,253,248' : '196,190,178'},${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, Hh); }
  x.lineCap = 'round';
  const vg = x.createLinearGradient(0, 0, 0, Hh); vg.addColorStop(0, 'rgba(255,255,255,0.10)'); vg.addColorStop(0.55, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(60,55,48,0.16)'); x.fillStyle = vg; x.fillRect(0, 0, W, Hh);
  for (let i = 0; i < 4200; i++) { const px = Math.random() * W, py = Math.random() * Hh, a = Math.random() * Math.PI, l = 6 + Math.random() * 40; x.strokeStyle = `rgba(${Math.random() < 0.55 ? '255,255,252' : '128,122,110'},${0.12 + Math.random() * 0.26})`; x.lineWidth = 0.4 + Math.random() * 1.1; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + (Math.random() - .5) * 8, py + Math.sin(a) * l * 0.5 + (Math.random() - .5) * 8, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return (WASHI = t);
}   // 質感は一度だけ読んで、部屋どうしで使い回す

export async function loadRoomTextures(R, mobile) {
  if (TEX) return TEX;
  const tl = new THREE.TextureLoader();
  const ld = (u, srgb, rep) => new Promise(ok => tl.load(u, t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(...rep); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = Math.min(12, R.capabilities.getMaxAnisotropy()); ok(t); }, undefined, () => ok(null)));
  const fr = [HALF * 2 / 2.2, HALF * 2 / 2.2];
  const sfx = mobile ? '1k' : '';
  const [fc, fn, fro, wc, wn, pc, env] = await Promise.all([
    ld(`data/tex/floor2_c${sfx}.webp`, true, fr), ld(`data/tex/floor2_n${sfx}.webp`, false, fr), ld('data/tex/floor2_r.webp', false, fr),
    ld('data/tex/wood_c.webp', true, [1, 3]), ld('data/tex/wood_n.webp', false, [1, 3]), ld('data/tex/paper_c.webp', true, [4, 2]), ld('data/tex/env.webp', true),
  ]);
  if (env) { env.mapping = THREE.UVMapping; env.wrapS = THREE.RepeatWrapping; env.wrapT = THREE.ClampToEdgeWrapping; env.generateMipmaps = true; env.minFilter = THREE.LinearMipmapLinearFilter; }
  TEX = { fc, fn, fro, wc, wn, pc, env };
  return TEX;
}

// 窓の向き → 光のほうへ向く向き（部屋の中へ斜めに差す）
function sunDir(cfg) {
  const v = { w: [-1, 0.75, 0.15], e: [1, 0.7, -0.2], n: [0.15, 0.8, -1], top: [0.12, 1, -0.18] }[cfg.win];
  return new THREE.Vector3(...v).normalize();
}

export function buildRoom(id, { mobile, tex }) {
  const cfg = Object.assign({}, ROOMS[id] || ROOMS.oto);
  { const ws = { w: 0, n: 1, e: 2, top: -1 }[cfg.win]; if (!cfg.glow) cfg.glow = [0, 1, 2, 3].map(i => (i === ws ? 1.0 : 0.62) + (i === 2 ? 0.08 : i === 0 ? -0.06 : 0)); if (!cfg.wide) cfg.wide = [0, 1, 2, 3]; }   // v5.4 027 の部屋の作り（柱は書の後ろを避ける・照り返しの漆喰・障子のむらと軒の陰）を全部の部屋に
  const H = cfg.tall ? 7.8 : H0;   // 縦に長い書の部屋は天井を高く（PC の正面で、上の点の後ろも障子の明るさになる＝字が読める）
  const g = new THREE.Group(); g.name = 'room-' + id;
  const SUN = sunDir(cfg);
  const U = { uT: { value: 0 }, uSun: { value: SUN.clone() }, uPulse: { value: 0 } };

  const woodMat = new THREE.MeshStandardMaterial({ color: tex?.wc ? 0xe6dccf : 0x5a524c, roughness: 0.8, map: tex?.wc || null, normalMap: tex?.wn || null });
  if (cfg.glow) woodMat.color.multiplyScalar(1.7);   // v5.4 障子に囲まれた部屋の柱は、照り返しを受けた白っぽい古材（黒い柱が墨の塊を串刺しにしない）
  const darkMat = new THREE.MeshStandardMaterial({ color: tex?.wc ? 0xa0958a : 0x3a342f, roughness: 0.85, map: tex?.wc || null, normalMap: tex?.wn || null });
  const plasterMat = new THREE.MeshStandardMaterial({ color: 0xb9bcbd, roughness: 0.95, map: tex?.pc || null });
  // 板壁：床と同じ古い板を横に張る（羽目板）。繰り返しが見えないよう、板ごとに明るさを揺らす
  let wallWood = null;
  if (tex?.fc) {
    const c = tex.fc.clone(), nn = tex.fn?.clone(); [c, nn].forEach(t => { if (!t) return; t.repeat.set(HALF * 2 / 2.6, H / 2.6); t.offset.set(0.37, 0.11); t.needsUpdate = true; });
    wallWood = new THREE.MeshStandardMaterial({ color: 0xa79d92, roughness: 0.86, map: c, normalMap: nn || null });
    if (cfg.glow) Object.assign(wallWood, { emissive: new THREE.Color(0x6a5a4a), emissiveMap: c, emissiveIntensity: 1.0 });   // v5.4 障子の照り返しを受けた板壁（墨が闇に溶けない）
    wallWood.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWq;').replace('#include <fog_vertex>', '#include <fog_vertex>\nvWq = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWq;').replace('#include <opaque_fragment>', `
        float rowv = fract(sin(floor(vWq.y / 0.21) * 91.7 + floor((vWq.x + vWq.z) / 2.9) * 13.1) * 43758.5);
        float aoW = smoothstep(0.0, 1.4, vWq.y) * smoothstep(0.0, 1.0, ${H.toFixed(1)} - vWq.y) * (0.55 + 0.45 * smoothstep(0.0, 1.8, ${HALF.toFixed(1)} - max(abs(vWq.x) < ${(HALF - 0.05).toFixed(2)} ? abs(vWq.x) : abs(vWq.z), abs(vWq.z) < ${(HALF - 0.05).toFixed(2)} ? abs(vWq.z) : abs(vWq.x))));
        outgoingLight *= (0.82 + 0.3 * rowv) * (0.55 + 0.45 * aoW);
        #include <opaque_fragment>`);
    };
  }
  const paperMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: washi() });

  // 窓の光（縞にしない）：点 p から光のほうへのばした線が、窓の開口を通るか。開口のふちはやわらかく
  const WIN_GLSL = /* glsl */`
    uniform vec3 uSun; uniform float uT, uPulse;
    float winLight(vec3 p){
      ${cfg.win === 'top' ? `
      float k = (${(H - 0.05).toFixed(2)} - p.y) / uSun.y; vec2 h = p.xz + uSun.xz * k;
      return (1.0 - smoothstep(0.4, 4.6, length(h - vec2(0.0, -0.4)) + 0.5 * sin(h.x * 1.7 + 0.6) * cos(h.y * 1.3))) * 0.8 * step(0.0, k);   /* v5.4b 天窓の光だまりは縁を大きくぼかし、いびつに（舞台の照明の楕円にしない） */` : `
      ${cfg.win === 'w' ? 'float k = (-' + HALF.toFixed(1) + ' - p.x) / uSun.x; vec3 h = p + uSun * k; vec2 o = vec2(h.z, h.y);' :
        cfg.win === 'e' ? 'float k = (' + HALF.toFixed(1) + ' - p.x) / uSun.x; vec3 h = p + uSun * k; vec2 o = vec2(h.z, h.y);' :
        'float k = (-' + HALF.toFixed(1) + ' - p.z) / uSun.z; vec3 h = p + uSun * k; vec2 o = vec2(h.x, h.y);'}
      float a = (1.0 - smoothstep(3.6, 5.2, abs(o.x))) * smoothstep(0.6, 1.3, o.y) * (1.0 - smoothstep(3.9, 4.6, o.y));
      return a * step(0.0, k);`}
    }`;

  // 床：古寺の板の間。窓の光がやわらかく落ちる
  const floorMat = new THREE.MeshStandardMaterial({ color: tex?.fc ? 0xf0e8dc : 0x4a433c, roughness: 0.82, map: tex?.fc || null, normalMap: tex?.fn || null, roughnessMap: tex?.fro || null, metalness: 0 });
  if (tex?.fn) floorMat.normalScale.set(1.1, 1.1);
  floorMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;\n' + WIN_GLSL)
      .replace('#include <opaque_fragment>', `
        float wl = winLight(vWp);
        float dust = 0.85 + 0.15 * fract(sin(dot(floor(vWp.xz * 9.0), vec2(12.9898, 78.233))) * 43758.5453);   // 年月の汚れのむら
        float ao = smoothstep(0.0, 1.6, ${HALF.toFixed(1)} - abs(vWp.x)) * smoothstep(0.0, 1.6, ${HALF.toFixed(1)} - abs(vWp.z));   // 部屋の隅は光が回りこまない
        outgoingLight = outgoingLight * (0.45 + 0.4 * ao) * dust + diffuseColor.rgb * vec3(1.0, 0.97, 0.92) * wl * ${(2.4 * cfg.sun).toFixed(2)} * (1.0 + 0.25 * uPulse);
        #include <opaque_fragment>`);
  };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), floorMat);
  floor.rotation.x = -Math.PI / 2; g.add(floor);

  // 格天井（暗い木の板と格子の桟）
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), darkMat); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; g.add(ceil);
  const nC = 9, cg = new THREE.BoxGeometry(HALF * 2, 0.12, 0.12);
  const coffer = new THREE.InstancedMesh(cg, darkMat, nC * 2); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < nC; i++) { const c = -HALF + (i + 0.5) * HALF * 2 / nC; coffer.setMatrixAt(i, m4.compose(p.set(0, H - 0.06, c), q.identity(), s)); coffer.setMatrixAt(nC + i, m4.compose(p.set(c, H - 0.06, 0), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), s)); }
  coffer.instanceMatrix.needsUpdate = true; g.add(coffer);
  if (cfg.win === 'top' && !cfg.noSky) {   // 天窓：天井の中央に光の口
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ color: 0xe8edef, fog: false })); sky.rotation.x = Math.PI / 2; sky.position.set(0, H - 0.02, -0.4); g.add(sky);
  }

  // 壁：西・北・東・南の順（shoji＝格子窓の障子、wood＝板壁、plaster＝漆喰、open＝開いて庭の霞）
  const sides = [
    { x: -HALF, z: 0, ry: Math.PI / 2 }, { x: 0, z: -HALF, ry: 0 }, { x: HALF, z: 0, ry: -Math.PI / 2 }, { x: 0, z: HALF, ry: Math.PI },
  ];
  const winSide = { w: 0, n: 1, e: 2, top: -1 }[cfg.win];
  sides.forEach((sd, i) => {
    const type = cfg.walls[i];
    const wall = new THREE.Group(); wall.position.set(sd.x, 0, sd.z); wall.rotation.y = sd.ry;
    if (type === 'shoji' || i === winSide) {
      const glow = cfg.glow ? cfg.glow[i] : (i === winSide ? 1.0 : 0.62);
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, H, cfg.glow ? 12 : 1, cfg.glow ? 16 : 1), paperMat.clone()); paper.material.color.setScalar((0.62 + 0.24 * glow + (Math.sin(i * 7.3) * 0.03)) * (cfg.shojiK || 1)); paper.material.map = washi().clone(); paper.material.map.repeat.set(1.6, 0.7); paper.material.map.needsUpdate = true; paper.position.set(0, H / 2, -0.02); wall.add(paper); if (cfg.glow) { const pg = paper.geometry, pc = new Float32Array(pg.attributes.position.count * 3); for (let k = 0; k < pg.attributes.position.count; k++) { const yy = Math.min(1, Math.max(0, pg.attributes.position.getY(k) / H + 0.5)), xx = pg.attributes.position.getX(k) / (HALF * 2) + 0.5, bay = Math.sin(Math.round(xx * 12) * 12.9898 + i * 4.1) * 43758.5453, v = (0.84 + 0.28 * xx) * (0.92 + 0.16 * (bay - Math.floor(bay))) - 0.12 * yy - 0.3 * Math.pow(Math.max(0, (yy - 0.85) / 0.15), 1.5);   /* 陰は上の 15% だけ（上端を黒くつぶさない） */ pc.set([v, v, v * 0.985], k * 3); } pg.setAttribute('color', new THREE.BufferAttribute(pc, 3)); paper.material.vertexColors = true; }   /* v5.4 障子は上ほど少し暗く（軒の陰。光が平たくならない） */   // 楮の繊維とむら
      const step = mobile ? 0.36 : 0.26, nv = Math.ceil(HALF * 2 / step);
      const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, H, 0.04), darkMat, nv);
      for (let k = 0; k < nv; k++) bars.setMatrixAt(k, m4.compose(p.set(-HALF + k * step, H / 2, 0.01), q.identity(), s));
      bars.instanceMatrix.needsUpdate = true; wall.add(bars);
      Array.from({ length: Math.floor((H - 1.2) / 1.0) }, (_, i) => 0.9 + i).forEach(y => { const r = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, 0.03, 0.04), darkMat); r.position.set(0, y, 0.01); wall.add(r); });
    } else if (type === 'plaster') {
      const pm = cfg.glow ? Object.assign(plasterMat.clone(), { color: new THREE.Color(0xd8d2c8), emissive: new THREE.Color(0xa69e90), emissiveMap: plasterMat.map, emissiveIntensity: 1.0 }) : plasterMat; const pl = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, H), pm);   /* v5.4 障子の照り返しを受けた漆喰（暗く沈ませない） */ pl.position.y = H / 2; wall.add(pl);
    } else if (type === 'open') {
      const hz = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 4, H * 2), new THREE.MeshBasicMaterial({ color: 0xc9d0d4, fog: false })); hz.position.set(0, H / 2, -8); wall.add(hz);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, 0.06, 0.08), darkMat); rail.position.set(0, 0.85, 0); wall.add(rail);
    } else {
      const wm = wallWood || woodMat; const wd = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, H), wm); wd.position.y = H / 2; wall.add(wd);
    }
    // 柱・長押・敷居
    for (const x of (cfg.wide && cfg.wide.includes(i) ? (i === 1 ? [-HALF + 0.12, -HALF * 0.88, HALF * 0.88, HALF - 0.12] : [-HALF + 0.12, HALF - 0.12]) : [-HALF + 0.12, -HALF / 3, HALF / 3, HALF - 0.12])) { const pw = cfg.glow && Math.abs(Math.abs(x) - HALF * 0.88) > 0.05 ? 0.13 : 0.26;   /* 北の面だけ、書の真後ろから外れた所に太い柱を二本（古寺の骨格） */ const c = new THREE.Mesh(new THREE.BoxGeometry(pw, H, pw), woodMat); c.position.set(x, H / 2, 0.08); wall.add(c); }
    const nage = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, 0.2, 0.12), darkMat); nage.position.set(0, cfg.glow ? H - 0.35 : H - 0.9, 0.12);   /* 障子に囲まれた部屋は、柱を細く・長押を天井ぎわへ（上の塊の後ろに太い木を通さない） */ wall.add(nage);
    const shiki = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, 0.1, 0.18), darkMat); shiki.position.set(0, 0.05, 0.1); wall.add(shiki);
    /* v9（10-23 本人「紙の作品を壁に飾ってください」）：障子の面に、紙の原本を掛ける漆喰の壁を一間ぶん（両脇に柱） */
    for (const nc of (cfg.niches || []).filter(n => n.side === i)) {
      const nm = Object.assign(plasterMat.clone(), { color: new THREE.Color(0xd8d2c8), emissive: new THREE.Color(0xa69e90), emissiveMap: plasterMat.map, emissiveIntensity: 1.0 });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(nc.w, H - 0.3), nm); pl.position.set(nc.x, (H - 0.3) / 2, 0.06); wall.add(pl);
      for (const sx of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.14, H, 0.14), woodMat); c.position.set(nc.x + sx * (nc.w / 2 + 0.07), H / 2, 0.1); wall.add(c); }
    }
    g.add(wall);
  });

  // 窓から差す光の霞（縞にしない・やわらかい）
  const steps = mobile ? 10 : 18;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 - 0.1, H - 0.05, HALF * 2 - 0.1), new THREE.ShaderMaterial({
    uniforms: { ...U, uI: { value: cfg.haze } }, side: THREE.BackSide, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      uniform float uI; varying vec3 vW;
      ${WIN_GLSL}
      void main(){
        vec3 ro = cameraPosition, rd = vW - ro; float L = min(length(rd), 16.0); rd = normalize(rd);
        float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
        float dt = L / ${steps}.0, t = dt * (0.35 + 0.3 * ign), acc = 0.0;
        for (int i = 0; i < ${steps}; i++) { vec3 p = ro + rd * t; acc += winLight(p) * dt * exp(-t * 0.08); t += dt; }
        float a = acc * uI * (1.0 + 0.3 * uPulse);
        a = pow(clamp(a, 0.0, 1.0), 2.2) * 1.3;   /* 奥のぼかしの描き先は線形の色：前と同じ明るさに見えるよう換算（灰色のかすみにしない） */
        gl_FragColor = vec4(vec3(0.96, 0.96, 0.95) * a, a);
      }`,
  }));
  shaft.position.y = H / 2; shaft.renderOrder = 5; shaft.frustumCulled = false; g.add(shaft);

  // 塵：光の中でだけ見える
  const nM = Math.round((mobile ? 260 : 700) * cfg.dust), mp = new Float32Array(nM * 3);
  for (let i = 0; i < nM; i++) mp.set([(Math.random() - .5) * HALF * 1.8, 0.3 + Math.random() * (H - 0.8), (Math.random() - .5) * HALF * 1.8], i * 3);
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const motes = new THREE.Points(mg, new THREE.ShaderMaterial({
    uniforms: { ...U, uPx: { value: Math.min(devicePixelRatio, 2) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `${WIN_GLSL}
      uniform float uPx; varying float vA;
      void main(){ vec3 p = position + vec3(sin(uT * 0.11 + position.y * 3.0), sin(uT * 0.07 + position.x * 2.0) * 0.6, cos(uT * 0.09 + position.z * 2.5)) * 0.18;
        vA = winLight(p); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uPx * (1.4 + 2.6 * fract(position.x * 7.1)) * 4.0 / max(1.0, -mv.z * 0.4); }`,
    fragmentShader: 'varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float a = exp(-dot(c, c) * 18.0) * vA * 0.55; if (a < 0.01) discard; gl_FragColor = vec4(vec3(pow(a, 2.2) * 1.3), a); }',
  }));
  motes.frustumCulled = false; g.add(motes);

  // 光（窓の向きから）。書のための光も同じ向き
  const hemi = new THREE.HemisphereLight(0xe2e5e6, 0x6a6058, 1.25 * cfg.expo); g.add(hemi);
  const key = new THREE.DirectionalLight(0xf3efe8, 1.8 * cfg.sun); key.position.copy(SUN).multiplyScalar(12); g.add(key);

  return {
    group: g, cfg, sun: SUN, half: HALF, height: H,
    fog: cfg.fog, expo: cfg.expo,
    update(t) { U.uT.value = t; if (cfg.pulse) { const ph = (t / 1.05) % 1; U.uPulse.value = Math.exp(-ph * 9) + 0.6 * Math.exp(-Math.max(0, ph - 0.22) * 10) * (ph > 0.22 ? 1 : 0); } },
    dispose() { g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material !== woodMat) { o.material.dispose?.(); } }); woodMat.dispose(); },
  };
}
