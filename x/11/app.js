// Qualia/sho ── 書の広間（v1 2026-10-22 回廊 ／ v4〜v6 一つの書に一つの部屋 ／ v7 2026-10-23 一つの広間）
// © mitsulab. All rights reserved.  書は上原光瑛の作品。3D・音・プログラム＝mitsulab。
// 本人（10-23）「一つの広間に音の３dグラフィックが浮遊していて、消える演出は不要で、その空間を歩いて、それに触れると音が出て、モーションも発生してください。」
// v11（10-26 本人「sho についても 3D の種類を増やすのと、音表現や振動表現などをさらに作り込んでください。」）：書を十に・形を六つに（浮き彫り・平たい帯・一画ずつ浮く・掛け軸・吊り・床の墨だまり）・触れる所（起筆・送筆・はらい・とめ）で音と振動が変わる・近づくとかすかに鳴る・続けて触れると和音・広間の左右と響き
// v9（10-23 本人「音に触れてもバラバラにならないで、振動と音だけ発生させてください。また、それぞれの作品で、３d立体と合わせて、紙の作品を壁に飾ってください。また、碧も登場させてください。」）
// 古寺の板の間の広間に、墨の立体の書が浮かぶ。床を押すとその向きへ歩き（一度に進むのは数歩まで）、書に触れるとその音が鳴って題が出て、墨が揺れる。動いたあとは字の形に戻る。
import * as THREE from 'three';
import { loadShoMap, createSho, createShoSound } from './kit/sho3d.js?v=20261026a';
import { buildRoom, loadRoomTextures, setRoomHalf, setHallNiches } from './room.js?v=20261026a';
import { createLive } from './live.js?v=20261023e';
import { createDOF } from './dof.js?v=20261023e';

const q = new URLSearchParams(location.search);
const SHOT = q.has('shot');                                    // 静止画（?shot=1&x=&z=&yaw=&pitch=&hit=027）
const mobile = matchMedia('(max-width:700px), (pointer:coarse)').matches;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);
let soundOn = true, audioWoken = false;
try { soundOn = localStorage.getItem('qsho-sound') !== 'off'; } catch (e) { /* 保存できない端末は入から */ }

/* ── 描く ── */
const cv = $('cv');
const R = new THREE.WebGLRenderer({ canvas: cv, antialias: !mobile, preserveDrawingBuffer: SHOT, powerPreference: 'high-performance' });
R.setPixelRatio(Math.min(devicePixelRatio, SHOT ? 2 : mobile ? 1.5 : 1.6));
R.toneMapping = THREE.NeutralToneMapping; R.toneMappingExposure = 1.0;
const dof = createDOF(R, { mobile }); if (q.has('nodof')) dof.on = false;   // 奥を自然に弱くぼかして、見ている書を読みやすく
const scene = new THREE.Scene();
const FOG = new THREE.Color(0x9aa0a4);
scene.background = FOG.clone();
scene.fog = new THREE.FogExp2(FOG, 0.03);
if (dof.on) scene.fog.color.copy(FOG).convertSRGBToLinear();
const cam = new THREE.PerspectiveCamera(mobile ? 66 : 52, 1, 0.05, 90);

/* ── 広間と書の置き場 ── */
const HALF = 12.5;                                             // v11 広間は 25 m 四方（書を十に増やした）
setRoomHalf(HALF);
const EYE = 1.62;                                              // 目の高さ
const Y_C = 2.75;                                              // 書の中心の高さ
const HMAX = mobile ? 3.2 : 4.1;                               // 書の大きいほうの辺（m）
const SPAWN = { x: 0, z: mobile ? 9.6 : 8.6, yaw: 0, pitch: 0.1 };   /* v11b 入口から近く大きく */   // 入口（南）から北を見る
// v11（10-26 本人「3D の種類を増やす」）：十の書を、書ごとに合う形で置く
//  relief＝墨の厚みの浮き彫りで浮かぶ／ribbon＝筆の幅の平たい帯（丸い管に見せない）／layers＝一画ずつが離れて宙に浮く（正面で一つの書になる）
//  scroll＝紙ごと掛け軸の形で浮かぶ／hang＝細い糸で天井から吊る（クモの巣の水滴）／floor＝床にひらく墨だまり（のぞきこむ）
const PLACE = [
  { id: 'oto', x: -0.4, z: 0.6, y: 3.05, form: 'relief', s: 1.0 },
  { id: '020', x: 4.2, z: 6.4, y: 0.07, form: 'floor', s: 1.2 },
  { id: '027', x: 3.0, z: -6.0, y: 3.0, form: 'relief', s: 1.0 },
  { id: '012', x: -7.4, z: 3.6, y: 2.55, form: 'relief', s: 0.95 },
  { id: '025', x: 7.8, z: 2.0, y: 2.85, form: 'ribbon', s: 0.95 },
  { id: '035', x: -4.4, z: -5.6, y: 2.9, form: 'layers', s: 1.0 },
  { id: '038', x: 8.0, z: -7.6, y: 2.8, form: 'relief', s: 0.9 },
  { id: '001', x: -8.4, z: -3.0, y: 2.75, form: 'scroll', s: 0.8 },
  { id: '008', x: 8.6, z: 7.4, y: 2.95, form: 'hang', s: 0.85 },
  { id: '007', x: -4.6, z: 7.6, y: 2.6, form: 'relief', s: 0.85 },
];
const PAPER = { id: '034', x: -HALF + 0.05, z: -9.2, y: 2.25, w: 3.1 };   // 紙の原本だけ：西の漆喰の壁に掛ける（3D にしない）
// v9 立体の書の近くの壁に、同じ書の紙の原本を一枚ずつ（北・東・南は障子なので、漆喰の壁を一間ぶん入れて掛ける＝room.js の niches）
const PAPERS = [
  { id: '034', wall: 'w', z: PAPER.z, y: PAPER.y, w: PAPER.w, only: true },
  { id: '012', wall: 'w', z: 6.6, y: 2.35, w: 2.2 },
  { id: '001', wall: 'w', z: -6.0, y: 2.35, w: 2.1 },
  { id: 'oto', wall: 'n', x: -2.6, y: 2.45, w: 2.2 },
  { id: '027', wall: 'n', x: 5.4, y: 2.45, w: 2.1 },
  { id: '035', wall: 'n', x: -7.6, y: 2.45, w: 2.1 },
  { id: '038', wall: 'n', x: 9.6, y: 2.45, w: 1.8 },
  { id: '025', wall: 'e', z: 0.6, y: 2.45, w: 1.75 },
  { id: '008', wall: 'e', z: 9.8, y: 2.45, w: 2.0 },
  { id: '007', wall: 's', x: -7.8, y: 2.45, w: 2.0 },
  { id: '020', wall: 's', x: 6.6, y: 2.45, w: 2.0 },
];

const meta = await (await fetch('data/works.json')).json();
let layersMeta = {}; try { layersMeta = await (await fetch('data/layers.json')).json(); } catch (e) { /* 無ければ浮き彫りで */ }
const works = PLACE.map((p, i) => ({ ...p, i, w: meta.works.find(w => w.id === p.id), sho: null, snd: null, live: null, shadow: null, face: 0, base: 0, hold: 0, pressed: false, near: 0 })).filter(it => it.w);
const paperW = meta.works.find(w => w.id === PAPER.id);
PAPERS.forEach(p => { p.w8 = meta.works.find(w => w.id === p.id); });
const paperOf = it => PAPERS.find(p => p.id === it.w.id && !p.only);

const FORM = {   // 形ごとの厚み・ふくらみ（幅に対する割合）
  relief: { th: 0.12, dp: 0.12 }, ribbon: { th: 0.045, dp: 0.04 }, layers: { th: 0.1, dp: 0.1 },
  scroll: { th: 0.11, dp: 0.11 }, hang: { th: 0.1, dp: 0.1 }, floor: { th: 0.05, dp: 0.04 },
};
const REVERB = { void: 0.95, mist: 0.85, eyes: 0.75, dew: 0.6, oto: 0.6, water: 0.55, bloom: 0.55, spore: 0.5, pulse: 0.45, shell: 0.32 };   // 書ごとの響き（虚空と霧は深く、殻は乾いて短く）
function shoOpts(it, width, x = {}) {
  const F = FORM[it.form] || FORM.relief, full = x.full || width;
  return {
    width, mobile, material: it.form === 'scroll' ? 'ink' : it.w.material, particleMode: 'ink', edgeGlow: 0, envGain: 0.4,   /* v11b 墨のつや消し・掛け軸はにじみの粒を出さない */ ink: 0x060708,
    particleSize: 0.0085, spread: width * 0.14, particles: mobile ? 600 : 1500, segments: Math.round((+(q.get('seg') || 0) || (mobile ? 170 : 320)) * Math.min(1, Math.sqrt(width / HMAX))),
    keep: true, deep: +(q.get('deep') || 0.8), rim: +(q.get('rim') || 0), inkCap: +(q.get('cap') || 0.07),   /* v8 縁は濡れた暗い墨の明るさまで（025 が金属の管に見えた）・縁の光沢は 027 だけ */
    toLight: 0, depth: full * F.dp, thickness: full * F.th, seed: it.i * 1.7 + 0.4 + (x.j || 0) * 0.37, flow: 0.1,
  };
}
// 筆の厚み（G）の分かれ目：書ごとに、薄い 3 割＝はらい・かすれ、厚い 2 割＝とめ・墨だまり
function gStats(m) { const a = []; for (let i = 0; i < m.w * m.h; i += 3) if (m.data[i * 4] > 60) a.push(m.data[i * 4 + 1]); a.sort((x, y) => x - y); return { lo: a[Math.floor(a.length * 0.3)] ?? 60, hi: a[Math.floor(a.length * 0.8)] ?? 180 }; }
async function prepare(it) {
  if (it.sho) return it;
  if (it.prep) return it.prep;
  it.prep = (async () => {
    const map = await loadShoMap(it.w.src);
    it.map = map; it.gq = gStats(map);
    const asp = map.w / map.h, width = (asp >= 1 ? HMAX : HMAX * asp) * (it.s || 1);
    it.sho = it.form === 'layers' && layersMeta[it.w.id] ? await makeLayers(it, map, width) : createSho(THREE, map, shoOpts(it, width));
    it.oneSide = it.form === 'scroll' || it.form === 'floor';   // 裏を見せない形（紙の裏・床）
    it.base = Math.atan2(SPAWN.x - it.x, SPAWN.z - it.z);       // 入口のほうを向いて浮かぶ
    it.face = it.base;
    const g = it.sho.group; if (it.form === 'floor') g.rotation.order = 'YXZ';
    g.position.set(it.x, it.y, it.z); g.rotation.y = it.face; if (it.form === 'floor') g.rotation.x = -Math.PI / 2;
    if (it.form === 'scroll') addScroll(it); else if (it.form === 'hang') addThreads(it);
    g.updateMatrixWorld(true);
    it.snd = createShoSound(it.w.preset, { pitch: it.w.pitch ?? 1, volume: 0.6, reverb: REVERB[it.w.preset] ?? 0.55 });
    if (soundOn && audioWoken) it.snd.start();
    return it;
  })();
  return it.prep;
}
// v11 一画ずつが宙に浮く：くびれで分けた枚（prep_sho_layers.py）を、奥行きを変えて浮かべる。正面から見ると一つの書、回りこむと画が離れる
async function makeLayers(it, map, width) {
  const L = layersMeta[it.w.id], height = width * map.h / map.w, grp = new THREE.Group(); grp.name = 'sho-layers';
  const Z = [0, -0.5, 0.42, 0.75, -0.85, 0.25, -0.3].map(z => z * width * 0.26);
  const subs = await Promise.all(L.map(async (l, j) => {
    const m = await loadShoMap(`data/${it.w.id}s${l.k}.png`), [u0, v0, u1, v1] = l.box, w = width * (u1 - u0);
    const s = createSho(THREE, m, shoOpts(it, w, { full: width, j }));
    s.home = new THREE.Vector3(((u0 + u1) / 2 - 0.5) * width, ((v0 + v1) / 2 - 0.5) * height, Z[j % Z.length]); s.box = l.box; s.k = l.k;
    s.group.position.copy(s.home); grp.add(s.group); return s;
  }));
  const loc = (uv, s) => { const [u0, v0, u1, v1] = s.box; return new THREE.Vector2((uv.x - u0) / (u1 - u0), (uv.y - v0) / (v1 - v0)); };
  const A = {
    group: grp, width, height, subs, shadowK: subs[0].shadowK, points: { visible: false }, lightPoints: null, target: 0, kickT: 0, level: 0, pull: 0, pullTarget: 0, pullV: 0, burstA: 99,
    get state() { return subs[0].state; },
    setLevel(v) { A.level = v; subs.forEach(s => s.setLevel(v)); },
    setScale(v) { subs.forEach(s => s.setScale(v)); },
    setEnv(t, gn) { subs.forEach(s => s.setEnv(t, gn)); },
    setLight(d) { subs.forEach(s => s.setLight(d)); },
    kick(v, uv, side) { A.kickT = Math.max(A.kickT, v); subs.forEach(s => s.kick(v, uv ? loc(uv, s) : null, side)); },
    burst() { /* v9 崩さない */ },
    makeShadow(sun, o) { const g = new THREE.Group(); subs.forEach(s => g.add(s.makeShadow(sun, o))); return g; },
    update(dt, t) {
      A.kickT = Math.max(0, A.kickT - dt * 2.2);
      subs.forEach((s, j) => {
        s.target = A.target; s.kickT = Math.max(s.kickT || 0, A.kickT); s.update(dt, t); s.points.visible = false; if (s.lightPoints) s.lightPoints.visible = false;
        if (!RM) { s.group.position.z = s.home.z + 0.05 * Math.sin(t * 0.37 + j * 1.9); s.group.position.y = s.home.y + 0.025 * Math.sin(t * 0.53 + j * 2.7); }   /* 画ごとに、少しずつ違う息で浮く */
      });
    },
    dispose() { subs.forEach(s => s.dispose()); },
  };
  return A;
}
// v11 掛け軸の形：紙と表具の裂地・上の八双と下の軸・吊り紐。墨の立体は紙の上に盛り上がる
const texL = new THREE.TextureLoader(); let PAPER_TEX = null;
function addScroll(it) {
  const s = it.sho, W = s.width, H = s.height, m = 0.1 * Math.max(W, H), z0 = -W * FORM.scroll.th * 0.9;
  PAPER_TEX ||= texL.load('data/tex/paper_c.webp', t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; });
  const g = new THREE.Group(); g.name = 'scroll';
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(W + m * 1.2, H + m * 4.4), new THREE.MeshStandardMaterial({ color: 0x5a544b, roughness: 0.96 }));   /* 表具の裂地（くすんだ墨茶） */
  cloth.position.set(0, m * 0.3, z0 - 0.012);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(W + m * 0.5, H + m * 0.9), new THREE.MeshStandardMaterial({ map: PAPER_TEX, color: 0xf2ede3, roughness: 0.95, emissive: 0xcfc9bd, emissiveMap: PAPER_TEX, emissiveIntensity: 0.85 })   /* 紙は障子の照り返しを受けて明るく */);
  sheet.position.set(0, 0, z0);
  const wood = new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.72 });
  const hasso = new THREE.Mesh(new THREE.BoxGeometry(W + m * 1.25, 0.03, 0.026), wood); hasso.position.set(0, H / 2 + m * 2.5, z0 - 0.012);   /* 上の八双 */
  const jiku = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, W + m * 1.7, 18), wood); jiku.rotation.z = Math.PI / 2; jiku.position.set(0, -H / 2 - m * 1.9, z0 - 0.02);   /* 下の軸 */
  const yT = H / 2 + m * 2.5, cx = (W + m) * 0.32;
  const cord = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-cx, yT, z0 - 0.012, 0, yT + 0.42, z0 - 0.012, cx, yT, z0 - 0.012, 0, yT + 0.42, z0 - 0.012, 0, yT + 0.42, z0 - 0.012, 0, yT + 8, z0 - 0.012], 3)), new THREE.LineBasicMaterial({ color: 0x3b3128, transparent: true, opacity: 0.8 }));   /* 吊り紐 */
  g.add(cloth, sheet, hasso, jiku, cord); s.group.add(g);
}
// v11 吊り：字のいちばん上の墨から、細い糸で天井へ。糸と、その間に張った横の糸に小さな水の粒
function addThreads(it) {
  const s = it.sho, m = it.map, W = s.width, H = s.height, P3 = [], beads = [];
  let sd = 77; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const tops = [];
  for (const cu of [0.16, 0.38, 0.62, 0.85]) {
    let best = null;
    for (let dx = -0.06; dx <= 0.06; dx += 0.01) { const x = Math.round(THREE.MathUtils.clamp(cu + dx, 0, 1) * (m.w - 1)); for (let y = m.h - 1; y >= 0; y--) if (m.data[(y * m.w + x) * 4] > 120) { if (!best || y > best.y) best = { x, y }; break; } }
    if (best) tops.push({ x: (best.x / (m.w - 1) - 0.5) * W, y: (best.y / (m.h - 1) - 0.5) * H });
  }
  tops.forEach(p => { P3.push(p.x, p.y, 0, p.x + (rnd() - 0.5) * 0.3, p.y + 8, 0); for (let k = 0; k < 3; k++) { const h = 0.25 + rnd() * 2.2; beads.push([p.x, p.y + h, 0, 0.007 + rnd() * 0.008]); } });
  for (let k = 0; k + 1 < tops.length; k += 2) {   /* 横の糸（たるんだ弧）と、その上の水の粒 */
    const a = tops[k], b = tops[k + 1], h = Math.max(a.y, b.y) + 0.5 + rnd() * 0.4, N = 14;
    for (let i = 0; i < N; i++) { const t0 = i / N, t1 = (i + 1) / N, sag = t => -Math.sin(t * Math.PI) * 0.16; P3.push(a.x + (b.x - a.x) * t0, h + sag(t0), 0, a.x + (b.x - a.x) * t1, h + sag(t1), 0); }
    for (let i = 1; i < 6; i++) { const t = i / 6 + (rnd() - 0.5) * 0.05; beads.push([a.x + (b.x - a.x) * t, h - Math.sin(t * Math.PI) * 0.16 - 0.006, 0, 0.006 + rnd() * 0.009]); }
  }
  const lines = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(P3, 3)), new THREE.LineBasicMaterial({ color: 0x34363a, transparent: true, opacity: 0.55 }));
  const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.22, metalness: 0 }), beads.length);
  const m4 = new THREE.Matrix4(); beads.forEach(([x, y, z, r], i) => bm.setMatrixAt(i, m4.makeScale(r, r * 1.15, r).setPosition(x, y, z)));
  s.group.add(lines, bm);
}
function hiRes(it) {                                           // 原本から作った高い解像度へ（近い書から順に）
  if (it.hiP || !it.sho) return it.hiP; it.hiP = (async () => {
    const N = mobile ? 1024 : 2048;
    try {
      const tl = u => new Promise(ok => new THREE.TextureLoader().load(u, t => { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; ok(t); }, undefined, () => ok(null)));
      if (it.sho.subs) { await Promise.all(it.sho.subs.map(async s => { const [m, d] = await Promise.all([loadShoMap(`data/hi/${it.w.id}s${s.k}_m${N}.webp`), tl(`data/hi/${it.w.id}s${s.k}_d${N}.webp`)]); s.setHiRes(m, d); })); return; }   /* v11 一画ずつ浮く書は、枚ごとに */
      const [m, d] = await Promise.all([
        loadShoMap(`data/hi/${it.w.id}_m${N}.webp`),
        new Promise(ok => new THREE.TextureLoader().load(`data/hi/${it.w.id}_d${N}.webp`, t => { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; ok(t); }, undefined, () => ok(null))),
      ]);
      it.sho.setHiRes(m, d);
      /* v9 ちぎれたかけらの地図（f512）は読まない：かけらは本体から離れて漂わず、字の一部のまま（本人「バラバラにならないで」） */
    } catch (e) { console.warn('hi', e); }
  })(); return it.hiP;
}

/* ── 広間を組む ── */
let room = null, ENV = null;
const ENVG = +(q.get('env') || 0.45);   /* v11b 黒いプラスチックの照りにしない */   /* v8 映りこみを弱く（濡れた暗い墨） */   /* 濡れた墨は、斜めほど障子の明るさを映す（照りの点ではなく、縁の湿った光沢で厚みが見える） */
const litV = new THREE.Vector3();
function placeInRoom(it) {
  scene.add(it.sho.group);
  if (it.shadow) scene.remove(it.shadow);
  it.shadow = null;
  if (it.form !== 'floor' && it.form !== 'scroll') { it.shadow = it.sho.makeShadow(room.sun.clone().setY(room.sun.y * 1.3).normalize(), { strength: 1.25 * it.sho.shadowK, blur: 3.2 }   /* v8 床に墨の影（やわらかく濃く） */); scene.add(it.shadow); }
  if (ENV) it.sho.setEnv(ENV, ENVG);
  it.sho.setLight(room.sun);
  it.sho.setScale(innerHeight * R.getPixelRatio() * 0.9);
  if (!it.live && it.form !== 'layers' && it.form !== 'floor') { it.live = createLive(scene, it.sho, { mobile, RM, drops: false }); it.live.grid.position.x = it.x; it.live.grid.position.z = it.z; }
}function buildHall(tex) {
  if (room) { scene.remove(room.group); room.dispose(); }
  room = buildRoom('hall', { mobile, tex });
  scene.add(room.group);
  scene.fog.density = room.fog * (dof.on ? 0.55 : 1); R.toneMappingExposure = room.expo * (+(q.get('ex') || 1.32));
}
// 紙の原本：紙一枚を表具の地と細い木の縁で壁に（紙の色に墨をかける＝白地が紙の色になる）
const paperG = new THREE.Group(); paperG.name = 'papers';
function makePaper(p) {
  const big = p.id === '034', url = big ? (mobile ? 'data/orig/034_p1200.webp' : 'data/orig/034_p2000.webp') : p.w8.orig;
  const im = new THREE.TextureLoader().load(url, t => { t.anisotropy = 8; });
  im.colorSpace = THREE.SRGBColorSpace;
  const asp = big ? 2000 / 1239 : p.w8.ow / p.w8.oh, w = asp >= 1 ? p.w : p.w * asp, h = asp >= 1 ? p.w / asp : p.w, m = 0.16;
  const g = new THREE.Group();
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w + m * 2, h + m * 2), new THREE.MeshStandardMaterial({ color: 0xcfc6b4, roughness: 0.95 }));   /* 表具の地（紙より少し沈んだ色） */
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: im, color: 0xf3efe6, roughness: 0.95 }));
  sheet.position.z = 0.004;
  const edge = new THREE.Mesh(new THREE.BoxGeometry(w + m * 2 + 0.012, h + m * 2 + 0.012, 0.016), new THREE.MeshStandardMaterial({ color: 0x6b5a48, roughness: 0.9 }));   /* 細い木の縁 */
  edge.position.z = -0.012;
  g.add(edge, back, sheet);
  if (p.wall === 'w') { p.wx = -HALF + 0.08; p.wz = p.z; g.rotation.y = Math.PI / 2; }
  else if (p.wall === 'e') { p.wx = HALF - 0.1; p.wz = p.z; g.rotation.y = -Math.PI / 2; }
  else if (p.wall === 's') { p.wx = p.x; p.wz = HALF - 0.1; g.rotation.y = Math.PI; }
  else { p.wx = p.x; p.wz = -HALF + 0.1; g.rotation.y = 0; }
  g.position.set(p.wx, p.y, p.wz); g.userData = { paper: p, w: w + m * 2, h: h + m * 2 };
  p.g = g; paperG.add(g);
}
PAPERS.forEach(makePaper);
// v11 障子の面（北・東・南）に、紙を掛ける漆喰の壁を一間ぶんずつ（壁の中の横の位置：北＝x・東＝z・南＝−x）
setHallNiches(PAPERS.filter(p => p.wall !== 'w').map(p => ({ side: { n: 1, e: 2, s: 3 }[p.wall], x: p.wall === 'n' ? p.x : p.wall === 'e' ? p.z : -p.x, w: p.g.userData.w + 0.7 })));

/* ── 歩く：押した所からは向きだけを読み、一度に進むのは数歩まで（walk 氷川と同じ） ── */
const STEP_MAX = 3.2, SPEED = 1.45, KEEP = 1.0;               // 一度に進む上限（m）・歩く速さ（m/秒）・書からとる間合い（m）
const P = { x: SPAWN.x, z: SPAWN.z, yaw: SPAWN.yaw, pitch: SPAWN.pitch, goal: null, turn: null, keys: new Set(), bob: 0 };
const fwd = (yaw, o = new THREE.Vector3()) => o.set(-Math.sin(yaw), 0, -Math.cos(yaw));
function segOf(it) { const c = Math.cos(it.face), s = -Math.sin(it.face), hw = it.sho ? it.sho.width / 2 : 1.5; return [it.x - c * hw, it.z - s * hw, it.x + c * hw, it.z + s * hw]; }
function keepOut(x, z) {                                       // 書と壁にぶつからない（書は浮かぶ板＝線分としてよける）
  const L = HALF - 0.7; x = THREE.MathUtils.clamp(x, -L, L); z = THREE.MathUtils.clamp(z, -L, L);
  for (const it of works) {
    if (it.form === 'floor') { const r = (it.sho ? Math.max(it.sho.width, it.sho.height) / 2 : 2.2) + 0.25, dx = x - it.x, dz = z - it.z, d = Math.hypot(dx, dz); if (d < r) { const k = d > 1e-4 ? r / d : 1; x = it.x + dx * k; z = it.z + (d > 1e-4 ? dz * k : r); } continue; }   /* 床の墨だまりには踏みこまない */
    const [ax, az, bx, bz] = segOf(it), vx = bx - ax, vz = bz - az, t = THREE.MathUtils.clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1);
    const px = ax + vx * t, pz = az + vz * t, d = Math.hypot(x - px, z - pz);
    if (d < KEEP) { const k = d > 1e-4 ? KEEP / d : 1; x = px + (x - px) * k; z = pz + (z - pz) * k + (d > 1e-4 ? 0 : KEEP); }
  }
  return [x, z];
}
function walkToward(tx, tz, maxStep = STEP_MAX) {
  const dx = tx - P.x, dz = tz - P.z, l = Math.hypot(dx, dz); if (l < 0.05) return;
  const s = Math.min(l, maxStep); P.route = null; P.fast = false; P.goal = { x: P.x + dx / l * s, z: P.z + dz / l * s };
  showStep(P.goal);
}
function standBefore(it) {
  P.retry = 0;                                     // 次の書・目録から：その書の前に立つ（正面から少し斜め）
  const fl = it.form === 'floor';
  let d = fl ? (mobile ? 7.4 : 6.2) : it.sho ? Math.max(mobile ? 6.2 : 5.4, it.sho.height * (mobile ? 1.9 : 1.6), mobile ? it.sho.width * 1.7 : 0) : 5.5;   /* v11c 床の墨だまりは少し離れて字の全体を／スマホは書の幅が画面に入る距離 */ let a = it.base + (it.i % 2 ? 0.16 : -0.16);   /* 立つ所は、はじめの向き（入口側）の正面から */
  { const ok = an => { const x = it.x + Math.sin(an) * d, z = it.z + Math.cos(an) * d, [kx, kz] = keepOut(x, z); return Math.hypot(kx - x, kz - z) < 0.01; }; if (!ok(a)) for (const o of [0.25, -0.25, 0.5, -0.5, 0.75, -0.75, 1.0, -1.0]) if (ok(a + o)) { a += o; break; } }   /* v11c 壁ぎわの書は、正面を少し回って離れて立つ */
  for (let k = 0; k < 12; k++) { const x = it.x + Math.sin(a) * d, z = it.z + Math.cos(a) * d, [kx, kz] = keepOut(x, z); if (Math.hypot(kx - x, kz - z) < 0.01 || d < 4) break; d *= 0.92; }   /* v11c 壁にめりこむ所には立たない（遠すぎたら少し近づく） */
  const tx = it.x + Math.sin(a) * d, tz = it.z + Math.cos(a) * d;
  const pp = paperOf(it); let lx = it.x, lz = it.z;
  if (pp && !fl) { const vx = it.x - tx, vz = it.z - tz, px = pp.wx - tx, pz = pp.wz - tz; if ((vx * px + vz * pz) / (Math.hypot(vx, vz) * Math.hypot(px, pz)) > 0.55) { const kp = mobile ? 0.06 : 0.2; lx = it.x * (1 - kp) + pp.wx * kp; lz = it.z * (1 - kp) + pp.wz * kp; } }   /* v9 立体と、壁の紙の原本の両方が入る向きに（紙が前にあるときだけ） */
  route([{ x: tx, z: tz }]); P.turn = Math.atan2(-(lx - tx), -(lz - tz));
  P.pitchGoal = fl ? -Math.atan2(EYE - 0.1, d) * 0.95 : Math.atan2(Y_C - EYE, d) * 0.72;   /* 床の墨だまりは、のぞきこむ */
  setFocus(it);
}
function blocked(ax, az, bx, bz) { for (let k = 1; k < 20; k++) { const t = k / 20, x = ax + (bx - ax) * t, z = az + (bz - az) * t, [px, pz] = keepOut(x, z); if (Math.hypot(px - x, pz - z) > 0.01) return true; } return false; }
let HUBQ = null;
function hubs() {   // v11 広間の通り（書と壁から離れた点の網）。書が増えたら作り直す
  if (HUBQ) return HUBQ; HUBQ = [];
  for (const x of [-10.6, -6.6, -2.8, 0.8, 4.6, 7.8, 10.8]) for (const z of [-10.6, -6.4, -2.6, 0.6, 3.8, 7.0, 10.4]) { const [kx, kz] = keepOut(x, z); if (Math.hypot(kx - x, kz - z) < 0.01) HUBQ.push({ x, z }); }
  return HUBQ;
}
function route(pts) {                                          // 書の前・紙の前へ：まっすぐ行けなければ、通り（入口のあたり・東西の端）を回る最短の道を
  const goal = pts[pts.length - 1], HUBS = hubs();
  const N = [{ x: P.x, z: P.z }, ...HUBS, goal], dist = N.map(() => Infinity), prev = N.map(() => -1), done = N.map(() => false); dist[0] = 0;
  for (;;) { let u = -1; for (let i = 0; i < N.length; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i; if (u < 0 || u === N.length - 1) break; done[u] = true;
    for (let v = 0; v < N.length; v++) { if (done[v] || v === u) continue; if (blocked(N[u].x, N[u].z, N[v].x, N[v].z)) continue; const d = dist[u] + Math.hypot(N[u].x - N[v].x, N[u].z - N[v].z); if (d < dist[v]) { dist[v] = d; prev[v] = u; } } }
  const path = []; for (let v = N.length - 1; v > 0 && prev[v] >= 0; v = prev[v]) path.unshift(N[v]);
  if (!path.length) path.push(goal);
  P.route = path.slice(1); P.goal = path[0]; P.fast = true; P.final = goal; showStep(goal);
}
// 足もとの印（押した向きへ進む先）：墨の薄い輪
const stepMark = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.2, 40), new THREE.MeshBasicMaterial({ color: 0x0d0d0e, transparent: true, opacity: 0, depthWrite: false }));
stepMark.rotation.x = -Math.PI / 2; stepMark.position.y = 0.015; scene.add(stepMark);
let stepT = 0;
function showStep(g) { stepMark.position.x = g.x; stepMark.position.z = g.z; stepT = 1.2; }

/* ── 画面の文字 ── */
const sid = id => /^\d+$/.test(id) ? `Qualia${id}/sound` : '連作の芯の一字';
const idLabel = w => `上原光瑛の書 ── ${sid(w.id)}`;
let focus = null;                                              // いま題を出している書（触れた・近い）
const listEl = $('works');
const stops = [...works, { paper: true, w: paperW, i: works.length }];
stops.forEach((it, k) => {
  const li = document.createElement('li'), b = document.createElement('button');
  b.type = 'button'; b.innerHTML = `<img class="wi" alt="" loading="lazy" decoding="async" width="90" height="60"><span class="wx"><span class="wn"></span><span class="wt"></span></span>`;
  b.querySelector('.wi').src = it.paper ? `data/orig/${it.w.id}.webp` : `data/thumb/${it.w.id}.webp`;
  b.querySelector('.wn').textContent = it.paper ? `紙の原本　${sid(it.w.id)}` : sid(it.w.id);
  b.querySelector('.wt').textContent = it.w.title;
  b.onclick = () => { closeSheets(); goStop(k); };
  it.btn = b; li.appendChild(b); listEl.appendChild(li);
});
let lastUser = performance.now(), hintT = 0, stopK = -1;
function showHint(txt) { const h = $('hint'); if (txt) h.innerHTML = txt; h.classList.remove('off'); clearTimeout(hintT); hintT = setTimeout(() => h.classList.add('off'), 7000); }
function paintHall() {
  $('capNo').textContent = '上原光瑛の書 ── Qualia/sho';
  $('capTi').textContent = '書の広間'; $('capTi').classList.remove('long');
  $('capRd').textContent = '「〇〇の音」の連作から十の書が、古寺の板の間に浮かび、吊られ、床にひらく。壁には、それぞれの紙の原本を掛けた。';
  $('count').textContent = `-- / ${String(stops.length).padStart(2, '0')}`;
}
function setFocus(it) {
  focus = it; const w = it.w; $('capRd').classList.remove('aoi');
  $('capNo').textContent = it.paper ? `上原光瑛の書 ── 紙の原本　${sid(w.id)}` : idLabel(w);
  $('capTi').textContent = w.title; $('capTi').classList.toggle('long', w.title.length > 16);
  $('capRd').textContent = it.paper ? '紙に墨で書いた、もとの書。立体にせず、紙の上の墨のまま掛けた。' : (w.reading || '');
  stopK = stops.indexOf(it); $('count').textContent = `${String(stopK + 1).padStart(2, '0')} / ${String(stops.length).padStart(2, '0')}`;
  stops.forEach(s => s.btn.setAttribute('aria-current', s === it));
}
function goStop(k) {
  stopK = (k + stops.length) % stops.length; const s = stops[stopK];
  P.retry = 0;
  if (s.paper) { const tx = PAPER.x + (mobile ? 6.4 : 4.2), tz = PAPER.z + 0.6; route([{ x: tx, z: tz }]); P.turn = Math.atan2(-(PAPER.x - tx), -(PAPER.z - tz)); P.pitchGoal = 0.08; setFocus(s); }
  else standBefore(s);
  lastUser = performance.now();
}
$('prev').onclick = () => goStop(stopK < 0 ? stops.length - 1 : stopK - 1);
$('next').onclick = () => goStop(stopK + 1);
$('allBtn').onclick = () => $('listBtn').click();
addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('.sheet')) { if (e.key === 'Escape') closeSheets(); return; }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) { P.keys.add(e.key.toLowerCase()); e.preventDefault(); }
  else if ((e.key === ' ' || e.key === 'Enter') && e.target === document.body) { e.preventDefault(); wake(); touchAt(innerWidth / 2, innerHeight / 2, 3.2); }
  lastUser = performance.now();
});
addEventListener('keyup', e => P.keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => P.keys.clear());

// 目録・元の書・解説
const sheets = { listBtn: $('list'), infoBtn: $('info'), origBtn: $('orig') };
let opener = null;
function closeSheets() { Object.entries(sheets).forEach(([b, s]) => { s.hidden = true; $(b).setAttribute('aria-expanded', 'false'); }); if (opener) { opener.focus(); opener = null; } }
function openOrig(w) {
  const im = $('origImg'); const big = w.id === PAPER.id;
  im.src = big ? (mobile ? 'data/orig/034_p1200.webp' : 'data/orig/034_p2000.webp') : w.orig; im.width = big ? 2000 : w.ow; im.height = big ? 1239 : w.oh; im.alt = `上原光瑛の書「${w.title}」`;
  $('origCap').innerHTML = ''; const t = document.createElement('span'); t.className = 'ot'; t.textContent = w.title; const m = document.createElement('span'); m.className = 'om';
  m.textContent = `上原光瑛　書（紙に墨）　連作「〇〇の音」より　Qualia${w.id}/sound`; $('origCap').append(t, m);
}
Object.entries(sheets).forEach(([b, s]) => {
  $(b).onclick = () => {
    const open = s.hidden; closeSheets();
    if (open && b === 'origBtn') openOrig((focus || nearest() || works[0]).w);
    if (open) { s.hidden = false; $(b).setAttribute('aria-expanded', 'true'); opener = $(b); s.querySelector('[data-close]').focus(); }
  };
  s.addEventListener('click', e => { if (e.target === s || e.target.closest('[data-close]')) closeSheets(); });
});
addEventListener('keydown', e => { if (e.key === 'Escape') closeSheets(); });

/* ── 音と振動 ── */
const sBtn = $('snd');
const paintSnd = () => { sBtn.setAttribute('aria-pressed', soundOn); sBtn.textContent = soundOn ? '音 入' : '音 切'; };
paintSnd();
function wake() {                                              // 最初の操作で音をひらく（自動再生の決まりを守る）
  if (audioWoken || !soundOn) return; audioWoken = true;
  works.forEach(it => it.snd && it.snd.start());
}
sBtn.onclick = () => {
  soundOn = !soundOn; paintSnd(); try { localStorage.setItem('qsho-sound', soundOn ? 'on' : 'off'); } catch (e) { /* 何もしない */ }
  if (soundOn) { audioWoken = true; works.forEach(it => it.snd && it.snd.start()); } else works.forEach(it => it.snd && it.snd.stop());
};
const canVibe = 'vibrate' in navigator;
let lastPulse = 0, ringAt = [innerWidth / 2, innerHeight * 0.45];
function ring(x, y, small) {
  if (RM && small) return;
  const r = document.createElement('div'); r.className = 'ring' + (small ? ' s' : ''); r.style.left = x + 'px'; r.style.top = y + 'px';
  $('rings').appendChild(r); setTimeout(() => r.remove(), 950);
}
function pulse(now, amp, held) {                               // 押しているあいだ：振動できる端末は細かく震え、できない端末（iPhone など）は光の輪
  if (amp < 0.08 || !held || now - lastPulse < (canVibe ? 55 : 160)) return;
  if (canVibe) { if (now < vibUntil) return; lastPulse = now; try { navigator.vibrate(Math.round(6 + 18 * Math.min(1, amp))); } catch (e) { /* 止められた端末 */ } }
  else if (mobile) { lastPulse = now; ring(ringAt[0] + (Math.random() - .5) * 60, ringAt[1] + (Math.random() - .5) * 60, true); }
}
// v11 触れた所の手ざわり：音と同じ形で震える（起筆＝置いて押す・送筆＝一つ・はらい＝細かく減っていく・とめ＝押して「コツッ」）。書ごとの尾（滴・ひび・拍…）
const KIND_JA = { kihitsu: '起筆', mid: '送筆', harai: 'はらい', tome: 'とめ' };
let vibUntil = 0, shake = null;
function vibeOf(kind, preset, f) {
  const a = Math.round(14 + 22 * f);
  const p = kind === 'tome' ? [a + 10, 45, 12] : kind === 'harai' ? [a, 18, 22, 22, 16, 28, 10, 36, 6, 44, 3] : kind === 'kihitsu' ? [8, 34, a + 6, 26, 9] : [a, 30, 10];
  const tail = { dew: [150, 6, 190, 4], shell: [24, 8, 14, 6, 22, 9], pulse: [170, 26, 120, 14], spore: [40, 4, 30, 4, 30, 3], eyes: [170, 7, 90, 7], void: [70, 60], mist: [90, 5, 150, 3], water: [70, 10, 90, 8], bloom: [90, 12, 60, 6], oto: [120, 10] }[preset] || [];
  return p.concat(tail);
}
function ringsOf(kind, x, y) {
  if (kind === 'tome') { ring(x, y, false); setTimeout(() => ring(x, y, true), 110); }
  else if (kind === 'harai') { for (let i = 0; i < 4; i++) setTimeout(() => ring(x + i * 20, y + i * 13, true), i * 110); }
  else if (kind === 'kihitsu') { ring(x, y, true); setTimeout(() => ring(x, y, false), 80); }
  else ring(x, y, false);
}
function kindLabel(kind, x, y, chord) {
  const el = document.createElement('div'); el.className = 'kd'; el.textContent = KIND_JA[kind] + (chord ? '　和音' : '');
  el.style.left = '50%'; el.style.top = (mobile ? 104 : 92) + 'px';   /* v11b 書に重ねず、上の帯に大きく */
  $('rings').appendChild(el); setTimeout(() => el.remove(), 1700);
}
function feel(kind, preset, f, x, y, chord) {
  if (canVibe) { const pat = vibeOf(kind, preset, f); try { navigator.vibrate(pat); } catch (e) { /* 何もしない */ } vibUntil = performance.now() + pat.reduce((s, v) => s + v, 0); }
  else if (mobile) ringsOf(kind, x, y);   /* 振動のない端末（iPhone など）は光の輪（Qualia/touch と同じ） */
  shake = { t: 0, kind, a: (kind === 'tome' ? 0.016 : kind === 'harai' ? 0.012 : 0.008) * (0.6 + 0.6 * f) * (RM ? 0.2 : 1) };   /* 画面も、同じ形で震える */
  kindLabel(kind, x, y, chord);
}
// 触れた所の筆の厚み（G）と、筆の順（A）から：起筆・送筆・はらい・とめ（見立て）
function strokeKind(it, u, v) {
  const m = it.map; if (!m || !it.gq) return 'mid';
  const x = Math.round(THREE.MathUtils.clamp(u, 0, 1) * (m.w - 1)), y = Math.round(THREE.MathUtils.clamp(v, 0, 1) * (m.h - 1));
  let g = 0, n = 0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h) continue; const j = (yy * m.w + xx) * 4; if (m.data[j] > 60) { g += m.data[j + 1]; n++; } }
  if (!n) return 'mid'; g /= n;
  if (g >= it.gq.hi) return 'tome'; if (g <= it.gq.lo) return 'harai';
  return m.data[(y * m.w + x) * 4 + 3] / 255 < 0.45 ? 'kihitsu' : 'mid';
}
/* ── 触れる・押す ── */
const rc = new THREE.Raycaster(), ndc = new THREE.Vector2(), tmpV = new THREE.Vector3(), inv = new THREE.Matrix4();
function shapeAt(it, u, v) {                                   // 原本の形の上か（縁の少し外まで受ける）
  const m = it.map; if (!m) return true;
  for (const [du, dv] of [[0, 0], [0.025, 0], [-0.025, 0], [0, 0.025], [0, -0.025]]) {
    const x = Math.round(THREE.MathUtils.clamp(u + du, 0, 1) * (m.w - 1)), y = Math.round(THREE.MathUtils.clamp(1 - (v + dv), 0, 1) * (m.h - 1));
    if (m.data[(y * m.w + x) * 4] > 60) return true;
  }
  return false;
}
function pick(x, y) {                                          // 押した所に何があるか：書・紙の原本・床
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); rc.setFromCamera(ndc, cam);
  let best = null;
  for (const it of works) {
    if (!it.sho) continue;
    inv.copy(it.sho.group.matrixWorld).invert();
    const o = rc.ray.origin.clone().applyMatrix4(inv), d = rc.ray.direction.clone().transformDirection(inv);
    if (Math.abs(d.z) < 1e-4) continue; const t = -o.z / d.z; if (t <= 0) continue;
    const hp = o.addScaledVector(d, t), u = hp.x / it.sho.width + 0.5, v = hp.y / it.sho.height + 0.5;
    if (u < -0.02 || u > 1.02 || v < -0.02 || v > 1.02 || !shapeAt(it, u, v)) continue;
    const dist = t * it.sho.group.scale.x; if (!best || dist < best.dist) best = { kind: 'work', it, u, v, side: rc.ray.origin.clone().applyMatrix4(inv).z, dist };
  }
  const ph = rc.intersectObject(paperG, true)[0]; if (ph && (!best || ph.distance < best.dist)) { let o = ph.object; while (o && !o.userData.paper) o = o.parent; best = { kind: 'paper', dist: ph.distance, p: o ? o.userData.paper : PAPERS[0] }; }
  if (!best && rc.ray.direction.y < -0.02) { const t = (0 - rc.ray.origin.y) / rc.ray.direction.y; best = { kind: 'floor', x: rc.ray.origin.x + rc.ray.direction.x * t, z: rc.ray.origin.z + rc.ray.direction.z * t }; }
  return best;
}
function touchWork(h, holdSec, force = 0.7, x = innerWidth / 2, y = innerHeight / 2) {
  const it = h.it; ringAt = [x, y];
  const kind = strokeKind(it, h.u, h.v); it.kind = kind;
  const r = it.snd ? it.snd.touch(THREE.MathUtils.clamp(h.u, 0, 1), THREE.MathUtils.clamp(h.v, 0, 1), force, kind) : null;
  feel(kind, it.w.preset, force, x, y, r && r.chord);
  /* v9（10-23 本人「音に触れてもバラバラにならないで、振動と音だけ」）：崩れない・散らない・かけらを動かさない。字の形のまま細かく震え、空間がかすかに震え、音が鳴る */
  it.pressed = true; it.hold = holdSec;
  it.sho.kick(0.55 + 0.3 * force + (kind === 'tome' ? 0.2 : 0), new THREE.Vector2(h.u, h.v), h.side);
  it.kickAt = performance.now(); it.vib = 1; it.vibT = kind === 'harai' ? 2.6 : kind === 'tome' ? 1.1 : 1.8;   /* はらいは長く震えて静まり、とめは短く締まる */
  setFocus(it); lastUser = performance.now();
}
function touchAt(x, y, holdSec, force = 0.7) {
  const h = pick(x, y); if (!h) return null;
  if (h.kind === 'work') touchWork(h, holdSec, force, x, y);
  else if (h.kind === 'paper') { const pw = h.p.w8; setFocus(h.p.only ? stops[stops.length - 1] : works.find(it => it.w.id === h.p.id)); if (holdSec < 50) { closeSheets(); openOrig(pw); sheets.origBtn.hidden = false; $('origBtn').setAttribute('aria-expanded', 'true'); opener = $('origBtn'); } }
  else if (h.kind === 'floor' && holdSec < 50) { P.turn = null; walkToward(h.x, h.z); }
  return h;
}
const ptrs = new Map(); let gest = null;
cv.addEventListener('pointerdown', e => {
  wake(); cv.setPointerCapture?.(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) gest = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t: performance.now(), drag: false, held: null, force: e.pressure > 0 && e.pressure !== 0.5 ? e.pressure : 0.7 };
  else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; gest = { pinch: Math.hypot(a.x - b.x, a.y - b.y), drag: true }; }
  lastUser = performance.now();
});
cv.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId) || !gest) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size >= 2 && gest.pinch) {                          // 二本の指：開くと前へ、閉じると後ろへ（一歩ずつ）
    const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), k = d - gest.pinch;
    if (Math.abs(k) > 40) { const f = fwd(P.yaw); walkToward(P.x + f.x * Math.sign(k) * 1.2, P.z + f.z * Math.sign(k) * 1.2, 1.2); gest.pinch = d; }
    lastUser = performance.now(); return;
  }
  const dx = e.clientX - gest.x, dy = e.clientY - gest.y;
  if (!gest.drag && Math.hypot(e.clientX - gest.x0, e.clientY - gest.y0) > 7) { gest.drag = true; if (gest.held) { gest.held.sho.target = 0; gest.held.pressed = false; } }
  if (gest.drag) { P.turn = null; P.pitchGoal = null; P.yaw += dx * (mobile ? 0.0055 : 0.0042); P.pitch = THREE.MathUtils.clamp(P.pitch + dy * 0.0035, -0.62, 0.6); lastUser = performance.now(); }
  gest.x = e.clientX; gest.y = e.clientY;
});
function endPtr(e) {
  if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
  if (ptrs.size) return;
  const g = gest; gest = null; if (!g || g.pinch) return;
  if (!g.drag) {
    if (g.held) { const it = g.held; it.hold = 0; }
    else touchAt(g.x0, g.y0, 3.2, g.force);
  }
  works.forEach(it => { it.pressed = false; });
}
addEventListener('pointerup', endPtr); addEventListener('pointercancel', endPtr);
setInterval(() => {                                            // 書を長く押すと、離すまで墨が引かれて湧く
  if (gest && !gest.drag && !gest.pinch && !gest.held && performance.now() - gest.t > 350) {
    const h = pick(gest.x0, gest.y0); if (h && h.kind === 'work') { gest.held = h.it; touchWork(h, 99, gest.force, gest.x0, gest.y0); }
    else gest.t = Infinity;
  }
}, 60);
cv.addEventListener('wheel', e => { e.preventDefault(); const f = fwd(P.yaw), s = -Math.sign(e.deltaY) * 0.8; walkToward(P.x + f.x * s, P.z + f.z * s, 0.8); lastUser = performance.now(); }, { passive: false });

function resize() { const w = innerWidth, h = innerHeight; R.setSize(w, h, false); dof.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); works.forEach(it => it.sho && it.sho.setScale(h * R.getPixelRatio() * 0.9)); }
addEventListener('resize', resize);

/* ── 始める ── */
const nearest = () => { let b = null, bd = 1e9; for (const it of works) { const d = Math.hypot(it.x - P.x, it.z - P.z); if (d < bd) { bd = d; b = it; } } return b; };
// v11 起動は近い書から：入口から近い数作だけ先に組んで、残りは動き出してから一つずつ
const byNear = [...works].sort((a, b) => Math.hypot(a.x - SPAWN.x, a.z - SPAWN.z) - Math.hypot(b.x - SPAWN.x, b.z - SPAWN.z));
await Promise.all(byNear.slice(0, SHOT ? works.length : (mobile ? 3 : 4)).map(prepare));
buildHall(null);
works.filter(it => it.sho).forEach(placeInRoom);
scene.add(paperG);
resize();
paintHall();
showHint('<span>床を押すと、その向きへ歩く。</span><span>ドラッグで見回す。</span><span>書に触れると、その音が鳴る。</span>');
const later = () => loadRoomTextures(R, mobile).then(t => {
  ENV = t.env; buildHall(t);
  works.forEach(it => { if (!it.sho) return; if (ENV) it.sho.setEnv(ENV, ENVG); it.sho.setLight(room.sun); });
}).catch(e => console.warn('tex', e));
const prepRest = async () => { for (const it of byNear) if (!it.sho) { try { await prepare(it); placeInRoom(it); HUBQ = null; } catch (e) { console.warn('prep', e); } await new Promise(r => setTimeout(r, 40)); } };
const hiAll = async () => { const s = [...works].sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z)); for (const it of s) await hiRes(it); };

/* ── 碧（v9・本人「碧も登場させてください」）：広間に立ち、人が書に近づくと、その書の脇へ歩いて書に目を向け、短く語る（字幕だけ・声は作っていない）。書と紙の原本の前はふさがない ── */
const AOI_LINES = {
  '027': '「木の中で水と養分が循環する音」。墨が液になって、幹の中を巡っています。壁の紙が、もとの書です。',
  '012': '「無自体の音」。芯は濃い墨のまま、ふちだけが霧になってほどけていきます。',
  '025': '「夜の森に漂う無数の眼の音」。夜の墨の奥で、小さな照り返しが灯っては消えます。',
  '034': '「蕾が春化粧をする音」。この書だけは、紙の上の墨のまま掛けています。',
  'oto': '「音」の一字。この連作の芯です。触れる場所で、鳴り方が変わります。はらいは長く、とめは短く。',
  '020': '「宇宙の虚空間の音」。床にひらいた墨だまりです。のぞきこむように、触れてみてください。',
  '035': '「花が産声を上げて咲く音」。一画ずつが離れて浮かび、正面でひとつの書になります。',
  '038': '「いのちの最初に聴こえる音」。墨が、拍のように満ち引きしています。',
  '001': '「菌糸の胞子が惑星の心臓を蔽いつくす音」。掛け軸のまま浮かんでいます。紙の上で、薄墨の毛羽が芯を蔽っていきます。',
  '008': '「クモの巣に滴る水滴が朝日に揺れる音」。細い糸に吊られています。糸の上の小さな粒が、水の滴です。',
  '007': '「鳥の雛が卵の殻を破壊し広大な環世界を創造する音」。乾いた墨の殻に、ひびが走ります。',
};
const AOI_H = 1.6;
const AO = { root: null, M: null, mats: null, pos: new THREE.Vector3(mobile ? 1.3 : -2.6, 0, mobile ? 5.4 : 4.6), vel: new THREE.Vector3(), goal: null, from: null, fade: 0, op: -1, out: 0, for: null, said: null, sayT: 99, ready: false };
let aoiLoading = null;
function loadAoi() {
  if (aoiLoading || q.has('noaoi')) return aoiLoading; aoiLoading = (async () => {
    try {
      const [{ GLTFLoader }, { MeshoptDecoder }, V, { AoiMotion }] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js'), import('@pixiv/three-vrm'), import('./kit/aoi_motion.js?v=20261026a')]);
      const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder); ld.register(p => new V.VRMLoaderPlugin(p));
      const g = await ld.loadAsync('data/aoi.vrm');
      const v = g.userData.vrm; if (!v) throw new Error('VRM ではない');
      V.VRMUtils.removeUnnecessaryVertices(g.scene); (V.VRMUtils.combineSkeletons ?? V.VRMUtils.removeUnnecessaryJoints)?.(g.scene); V.VRMUtils.rotateVRM0(v);
      v.scene.traverse(o => { o.frustumCulled = false; });
      const root = new THREE.Group(); root.name = 'aoi'; root.add(v.scene);
      v.humanoid.resetNormalizedPose(); v.update(0); v.scene.updateMatrixWorld(true);
      const bx = new THREE.Box3().setFromObject(v.scene), h = bx.max.y - bx.min.y, sc = h > .5 ? AOI_H / h : 1;
      v.scene.scale.setScalar(sc); v.scene.position.y = -bx.min.y * sc;
      { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(0,0,0,.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
        const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.62), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; sh.userData.noFade = true; sh.renderOrder = -1; root.add(sh); AO.shadow = sh; }   /* 足もとのやわらかい影 */
      root.position.copy(AO.pos); scene.add(root); root.updateMatrixWorld(true);
      AO.M = new AoiMotion(v, { root, reducedMotion: RM, wind: .3, startCalm: 2.2, posture: 'upright', uprightWeight: .5, faceLight: .5 });   /* v11b 片足に少し重心をのせて自然に立つ */   /* まっすぐ立つ（反り腰にしない）・自然な息とまばたき */
      AO.M.place(AO.pos.x, AO.pos.z, Math.atan2(P.x - AO.pos.x, P.z - AO.pos.z));
      AO.root = root; AO.vrm = v; AO.fade = 0; aoiOpacity(0); AO.ready = true;
      window.__aoi = AO;
    } catch (e) { console.warn('碧の姿を読み込めませんでした：', e?.message ?? e); }
  })(); return aoiLoading;
}
function aoiOpacity(o) {
  if (!AO.root) return;
  if (!AO.mats) { AO.mats = []; AO.root.traverse(m => { if (m.isMesh && !m.userData.noFade) for (const mt of [].concat(m.material)) AO.mats.push([mt, mt.transparent, mt.depthWrite]); }); }
  if (AO.shadow) AO.shadow.material.opacity = o;
  for (const [mt, tr, dw] of AO.mats) { if (tr && !mt.userData.at0) { mt.userData.at0 = 1; mt.alphaTest = Math.max(mt.alphaTest || 0, 0.5); } mt.transparent = o < 1 ? true : false;   /* v11c 裾が透けて背景に溶けない（不透明に・切り抜き） */ mt.opacity = o; mt.depthWrite = o < 1 ? o > .6 : dw; mt.needsUpdate = true; }
}
function aoiSpot(it) {                                         // 書の脇（紙の原本と反対の側）。見る人から見て、書の幅の外・画面の内に立つ（書と紙の前はふさがない）
  const vx = it.x - P.x, vz = it.z - P.z, l = Math.hypot(vx, vz) || 1, dx = vx / l, dz = vz / l, lx = -dz, lz = dx;
  const pp = paperOf(it); let side = it.i % 2 ? 1 : -1;
  if (pp) side = ((pp.wx - it.x) * lx + (pp.wz - it.z) * lz) > 0 ? -1 : 1;
  const hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect), hw = Math.atan((it.sho ? it.sho.width / 2 : 1.6) / l);
  let a = Math.min(hw + 0.07, hf - 0.1), D = Math.max(3.0, l - 0.4);
  if (mobile) { a = hf - 0.01; D = 2.7; }   /* v11c スマホは画面が細く、書の脇が画面の外になる：碧は手前の画面の端に立ち、書の前をふさがない */
  if (it.paper && mobile) { a = hf - 0.02; D = 2.8; }   /* スマホの紙の前：紙の幅が画面いっぱいなので、碧は手前の端に */
  for (const sd of [side, -side]) { const [x, z] = keepOut(P.x + (dx * Math.cos(a) + lx * sd * Math.sin(a)) * D, P.z + (dz * Math.cos(a) + lz * sd * Math.sin(a)) * D); if (Math.hypot(x - P.x, z - P.z) > 1.4) return new THREE.Vector3(x, 0, z); }
  return null;
}
const paperStop = { paper: true, x: -HALF + 1.0, z: PAPER.z, i: 9, w: null, sho: { width: 3.4, group: { position: { y: 2.6 } } } };
function aoiSay(it) {
  const line = AOI_LINES[it.w.id]; if (!line) return;
  AO.said = it; AO.sayT = 0;
  $('capRd').textContent = `碧 ──${line}`; $('capRd').classList.add('aoi');
  if (AO.M) { const c = new THREE.Vector3(it.x, it.form === 'floor' ? 0.15 : it.sho ? it.sho.group.position.y - 0.3 : 2.2, it.z); AO.M.lookAt(c); if (!RM) { AO.M.point(c, 2.4); AO.M.speak({ text: line, dur: Math.min(6.5, 1.2 + line.length * 0.11), ref: c }); } }   /* v11c 語るあいだ、手ぶりと口が動く（棒立ちにしない） */
}
function aoiTick(dt) {
  if (!AO.ready) return;
  const M = AO.M, f = fwd(P.yaw);
  // いま見ている書：近く（7.5 m まで）で、見ている向きの 40 度の内
  let tgt = null, td = 1e9;
  paperStop.w = paperW;
  if (focus && focus.paper && Math.hypot(paperStop.x - P.x, paperStop.z - P.z) < 8) tgt = paperStop;   /* 紙の原本の前では、紙の脇へ */
  else if (focus && !focus.paper && Math.hypot(focus.x - P.x, focus.z - P.z) < 9) tgt = focus;   /* 書の前へ向かう・立っているあいだは、その書の脇へ（途中の書には寄り道しない） */
  else for (const it of works) { const vx = it.x - P.x, vz = it.z - P.z, d = Math.hypot(vx, vz); if (d < 7.5 && (vx * f.x + vz * f.z) / d > 0.76 && d < td) { td = d; tgt = it; } }
  if (tgt && (tgt !== AO.for || (AO.from && Math.hypot(P.x - AO.from.x, P.z - AO.from.z) > 1.0))) { const sp = aoiSpot(tgt); if (sp) { if (tgt !== AO.for) AO.said = null; AO.for = tgt; AO.goal = sp; AO.from = { x: P.x, z: P.z }; } }
  if (AO.goal) {
    const gd = Math.hypot(AO.goal.x - AO.pos.x, AO.goal.z - AO.pos.z);
    if (gd > 4.2 && !AO.out) AO.out = 1;                          // 遠い・書を回りこむ所へは歩かず、うすれて、脇に現れる
    if (AO.out) { AO.fade = Math.max(0, AO.fade - dt / 0.5); if (AO.fade <= 0) { AO.pos.copy(AO.goal); AO.vel.set(0, 0, 0); M.teleport(AO.pos.x, AO.pos.z, Math.atan2(P.x - AO.pos.x, P.z - AO.pos.z)); AO.out = 0; } }
    else {
      const w = 2.6, n = Math.max(1, Math.ceil(dt / .02)), h = dt / n;
      for (let i = 0; i < n; i++) {
        AO.vel.x += (w * w * (AO.goal.x - AO.pos.x) - 2 * w * AO.vel.x) * h; AO.vel.z += (w * w * (AO.goal.z - AO.pos.z) - 2 * w * AO.vel.z) * h;
        const m = Math.hypot(AO.vel.x, AO.vel.z); if (m > 1.15) { AO.vel.x *= 1.15 / m; AO.vel.z *= 1.15 / m; }
        [AO.pos.x, AO.pos.z] = keepOut(AO.pos.x + AO.vel.x * h, AO.pos.z + AO.vel.z * h);
      }
      M.drive(AO.pos.x, AO.pos.z);
      if (gd < 0.35 && AO.for && AO.said !== AO.for && AO.fade > 0.9) aoiSay(AO.for);
    }
  }
  AO.sayT += dt;
  if (AO.said && AO.sayT < 7.0) {   /* 語るあいだは書のほうへ半分向き、書に目を向ける */ const it = AO.said, toCam = Math.atan2(P.x - AO.pos.x, P.z - AO.pos.z), toW = Math.atan2(it.x - AO.pos.x, it.z - AO.pos.z); M.faceTo(toCam + Math.atan2(Math.sin(toW - toCam), Math.cos(toW - toCam)) * 0.5); }
  else if (AO.sayT < 7.2) { M.faceTo(null); M.lookAt(null); }
  if (AO.sayT > 10 && $('capRd').classList.contains('aoi')) { $('capRd').classList.remove('aoi'); if (focus) setFocus(focus); }
  M.update(dt, cam);
  if (!AO.out && AO.fade < 1) AO.fade = Math.min(1, AO.fade + dt / 1.4);
  const dc = Math.hypot(AO.pos.x - P.x, AO.pos.z - P.z), occ = THREE.MathUtils.clamp((dc - 0.8) / 0.6, 0, 1);   /* 見る人のすぐ前では、うすく */
  const op = Math.min(AO.fade, occ); if (Math.abs(op - AO.op) > 0.004 || (op === 1 && AO.op !== 1) || (op === 0 && AO.op !== 0)) { AO.op = op; aoiOpacity(op); }
  AO.root.visible = op > 0.02;
}

/* ── 毎こま ── */
const clock = new THREE.Clock(); let acc = 0, started = false;
const minDt = mobile ? 1 / 31 : 0;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
function placeCam(t) {
  const bob = Math.sin(P.bob) * 0.018;
  cam.position.set(P.x, EYE + bob, P.z);
  const f = fwd(P.yaw); tmpV.set(P.x + f.x * Math.cos(P.pitch), EYE + bob + Math.sin(P.pitch), P.z + f.z * Math.cos(P.pitch));
  cam.lookAt(tmpV);
}
function stepWalk(dt) {
  // 体の向きを書のほうへ（次の書へ・目録から）
  if (P.turn != null) { const d = wrap(P.turn - P.yaw); P.yaw += d * Math.min(1, dt * 2.2); if (Math.abs(d) < 0.01) P.turn = null; }
  if (P.pitchGoal != null) { P.pitch += (P.pitchGoal - P.pitch) * Math.min(1, dt * 2.2); if (Math.abs(P.pitchGoal - P.pitch) < 0.005) P.pitchGoal = null; }
  let vx = 0, vz = 0; const f = fwd(P.yaw), k = P.keys;
  if (k.has('arrowup') || k.has('w')) { vx += f.x; vz += f.z; }
  if (k.has('arrowdown') || k.has('s')) { vx -= f.x; vz -= f.z; }
  if (k.has('a')) { vx += f.z; vz -= f.x; } if (k.has('d')) { vx -= f.z; vz += f.x; }
  if (k.has('arrowleft')) P.yaw += dt * 1.4; if (k.has('arrowright')) P.yaw -= dt * 1.4;
  let moving = false;
  if (vx || vz) { const l = Math.hypot(vx, vz); P.goal = null; P.route = null; P.turn = null; [P.x, P.z] = keepOut(P.x + vx / l * SPEED * dt, P.z + vz / l * SPEED * dt); moving = true; lastUser = performance.now(); }
  else if (P.goal) {
    const dx = P.goal.x - P.x, dz = P.goal.z - P.z, l = Math.hypot(dx, dz);
    const next = () => { P.goal = P.route && P.route.length ? P.route.shift() : null; };
    if (l < (P.route && P.route.length ? 0.5 : 0.04)) next();
    else { const s = Math.min(l, SPEED * (P.fast ? 2.4 : 1.2) * dt * Math.min(1, 0.35 + l));   /* 目録・矢印から書の前へは早足で */ const [nx, nz] = keepOut(P.x + dx / l * s, P.z + dz / l * s); if (Math.hypot(nx - P.x, nz - P.z) < s * 0.2) { if (P.fast && P.final && (P.retry = (P.retry || 0) + 1) < 4) { P.x = nx; P.z = nz; route([P.final]); return; } next(); } P.x = nx; P.z = nz; moving = true; }
  }
  if (moving && !RM) P.bob += dt * 7.5;
}
function frame() {
  requestAnimationFrame(frame);
  const d0 = clock.getDelta(); acc += d0; if (acc < minDt) return; const dt = Math.min(acc, 0.1); acc = 0;
  const t = clock.elapsedTime, now = performance.now();
  stepWalk(dt); placeCam(t);
  if (stepT > 0) { stepT -= dt; stepMark.material.opacity = Math.max(0, Math.min(1, stepT)) * 0.5; }
  const idle = now - lastUser;
  let shakeAmp = 0, closest = null, cd = 1e9;
  for (const it of works) {
    if (!it.sho) continue;
    const s = it.sho, dx = cam.position.x - it.x, dz = cam.position.z - it.z, dist = Math.hypot(dx, dz);
    if (dist < cd) { cd = dist; closest = it; }
    if (!it.pressed && it.hold > 0) { it.hold -= dt; if (it.hold <= 0) s.target = 0; }
    s.update(dt, t);
    s.points.visible = false; if (s.lightPoints) s.lightPoints.visible = false;   // 押したとき障子に散る点は出さない
    if (it.snd) {
      const gn = THREE.MathUtils.clamp((10 - dist) / 6, 0, 1); it.snd.gain(gn * gn);   /* v11 遠い書は鳴らず、近づくと鳴り始める */
      it.snd.near?.(THREE.MathUtils.clamp((5.5 - dist) / 3.5, 0, 1), dt);   /* 書の前では、触れる前から、かすかな息 */
      { const fv = fwd(P.yaw); it.snd.place?.((dx * fv.z - dz * fv.x) / Math.max(0.5, dist), THREE.MathUtils.clamp(dist / 14, 0, 1)); }
      it.snd.hold?.(it.pressed, it.vib || 0); it.snd.update(s.state, dt); s.setLevel(it.snd.level);
    }
    // 無重力：重力と浮力の釣り合いを探るように、周期のそろわない揺らぎ・ふとした沈みと戻り（書ごとに位相をずらす）
    if (!RM) {
      const kk = Math.min(1, s.kickT || 0), lv = it.snd ? it.snd.level : 0, Pp = Math.PI * 2, o = it.i * 2.3;
      const dip = Math.pow(Math.max(0, Math.sin(t * 0.093 + o) * Math.sin(t * 0.141 + 2.0 + o)), 3) * 0.14;
      s.group.position.y = it.y + 0.17 * Math.sin(t * Pp / 6.3 + o) + 0.07 * Math.sin(t * Pp / 3.7 + 1.3 + o) + 0.012 * Math.sin(t * Pp / 1.3 + 0.4) + 0.004 * Math.sin(t * 11.3) * (1 + 3 * lv) - dip - 0.09 * kk * Math.cos(t * 13.0) * kk;
      s.group.rotation.x = 0.045 * Math.sin(t * Pp / 5.3 + o) + 0.012 * Math.sin(t * Pp / 2.3 + 1.0) + 0.025 * kk * Math.sin(t * 17.0);
      s.group.rotation.z = 0.04 * Math.sin(t * Pp / 6.1 + 1.0 + o) + 0.01 * Math.sin(t * Pp / 1.9) + dip * 0.2 + 0.02 * kk * Math.cos(t * 15.0);
    }
    // 見る人のほうへ、ゆっくり向き直る（真横で板の縁だけにならない。表でも裏でも近いほうを向ける）
    const az = Math.atan2(dx, dz), d = wrap(az - it.face), e = it.oneSide || Math.abs(d) <= Math.PI / 2 ? d : wrap(d - Math.PI), lim = it.form === 'floor' ? 1.1 : 0.1,   /* v11c 入口の左右の書も正面へ */   /* v11b 書は見る人の正面へ向き直る（斜めで字が崩れない） */ over = Math.abs(e) - lim;   /* 掛け軸と床は裏を見せない */
    if (over > 0 && dist < 16) it.face += Math.sign(e) * over * Math.min(1, dt * 1.6);
    s.group.rotation.y = (RM ? 0 : Math.sin(t * 0.13 + it.i) * 0.1 + Math.sin(t * 0.41 + 1.0 + it.i) * 0.03) + it.face;
    if (it.form === 'floor') { s.group.position.y = it.y + s.height * 0.5 * Math.sin(0.42) + (RM ? 0 : 0.006 * Math.sin(t * 0.7 + 1.3)); s.group.rotation.x = -Math.PI / 2 + 0.42 + (RM ? 0 : 0.004 * Math.sin(t * 0.5));   /* v11 少し起こして（低い台に寝かせた角度）、立って見ても字に読める */ s.group.rotation.z = 0; s.group.rotation.y = it.face + (RM ? 0 : Math.sin(t * 0.09) * 0.03); }   /* v11 床にひらいた墨だまり：浮かばず、かすかに息をする */
    if (it.w.id === '038' && !RM) { const ph = (t / 1.05) % 1, en = Math.exp(-ph * 9) + 0.6 * Math.exp(-Math.max(0, ph - 0.24) * 10) * (ph > 0.24 ? 1 : 0); s.group.scale.setScalar(1 + 0.012 * en); }   /* v11 いのちの最初の音：拍で満ち引き */
    if (room) { litV.set(dx, 0, dz).normalize().multiplyScalar(0.55).add(room.sun).normalize(); s.setLight(litV); }   /* 見る人の側の斜め上からも光を回す（逆光の切り絵にしない） */
    /* v9 触れたとき：字の形は保ったまま、細かく震える（押しているあいだは震え続け、離すと 1.8 秒で静まる）。崩れ・散り・大きな揺れはしない */
    if (it.vib > 0) { if (!it.pressed) it.vib = Math.max(0, it.vib - dt / (it.vibT || 1.8)); }
    { const w = (it.vib || 0) * (RM ? 0.3 : 1), j = 0.011 * w * w;
      s.group.position.x = it.x + j * (Math.sin(t * 83.0 + it.i) + 0.5 * Math.sin(t * 131.0)); s.group.position.z = it.z + j * Math.sin(t * 67.0 + 2.1);
      if (RM) s.group.position.y = it.y; s.group.position.y += j * Math.sin(t * 71.0 + 1.3);
      if (!RM) s.group.rotation.z += 0.005 * w * w * Math.sin(t * 59.0); if (w > 0) s.kickT = Math.max(s.kickT || 0, 0.6 * w); }
  }
  // さわらないあいだも、近い書はときどき墨が湧く（LIVE）
  /* v9 さわらないあいだに墨が湧く（ほどける）のはやめた＝字の形のまま浮かぶ */
  for (const it of works) {
    if (!it.live || !it.sho) continue;
    const near = it === closest || (it.kickAt && now - it.kickAt < 4000);
    const amp = it.live.update(t, dt, it.snd ? it.snd.level : 0, Math.min(1, Math.max(it.sho.kickT || 0, it.vib || 0)), near && it.snd && it.snd.running ? it.snd.wave() : null, near ? room && room.group : null, cam);
    if (near) shakeAmp = Math.max(shakeAmp, amp);
    if (it.snd && it.vib > 0.15) pulse(now, it.vib * 0.7, it.pressed);   /* 震えているあいだ、端末も細かく震える（無い端末は光の輪） */
  }
  if (room) room.update(t);
  aoiTick(dt);
  if (shake) {   /* v11 触れた所の形で、画面が震える（とめ＝縦に一度・はらい＝横へ流れて静まる・起筆／送筆＝小さく） */
    shake.t += dt; const T = shake.t, A = shake.a; let ox = 0, oy = 0;
    if (shake.kind === 'tome') oy = -A * Math.exp(-T * 22) * Math.sin(T * 95);
    else if (shake.kind === 'harai') ox = A * Math.exp(-T * 2.6) * Math.sin(T * 13);
    else { ox = A * 0.6 * Math.exp(-T * 9) * Math.sin(T * 47); oy = A * 0.5 * Math.exp(-T * 9) * Math.cos(T * 41); }
    cam.position.x += ox * Math.cos(P.yaw); cam.position.z -= ox * Math.sin(P.yaw); cam.position.y += oy; if (T > 2.2) shake = null;
  }
  if (shakeAmp > 0) cam.position.add(tmpV.set(Math.sin(t * 71) * shakeAmp * 0.4, Math.cos(t * 67) * shakeAmp * 0.4, 0));
  dof.render(scene, cam, focusDist());
  if (!started) { started = true; window.MLLoader?.done(); window.__shoReady = performance.now(); later().then(prepRest).then(() => { loadAoi(); return hiAll(); }); }
}
function focusDist() {                                         // 画面の中央に見えている書の距離（無ければ近い書）
  rc.setFromCamera(ndc.set(0, 0), cam); let best = 1e9;
  for (const it of works) { if (!it.sho) continue; const d = tmpV.set(it.x, it.sho.group.position.y, it.z).sub(cam.position), along = d.dot(rc.ray.direction); if (along <= 0) continue; const off = Math.sqrt(Math.max(0, d.lengthSq() - along * along)); if (off < it.sho.width * 0.6 && along < best) best = along; }
  if (best < 1e9) return best;
  let bv = 1e9; const half = THREE.MathUtils.degToRad(cam.fov / 2) * Math.max(1, cam.aspect) * 0.9;   // 中央に無ければ、視野の中でいちばん近い書
  for (const it of works) { const d = tmpV.set(it.x, Y_C, it.z).sub(cam.position), l = d.length(); if (d.normalize().angleTo(rc.ray.direction) < half && l < bv) bv = l; }
  if (bv < 1e9) return bv; const n = nearest(); return n ? Math.hypot(n.x - cam.position.x, n.z - cam.position.z) : 6;
}

if (SHOT) {                                                    // 静止画：?shot=1&x=0&z=8.2&yaw=0&pitch=0.1&t=6&hit=027&u=0.5&v=0.5&pl=0.8
  const T = +(q.get('t') ?? 6);
  P.x = +(q.get('x') ?? SPAWN.x); P.z = +(q.get('z') ?? SPAWN.z); P.yaw = +(q.get('yaw') ?? SPAWN.yaw); P.pitch = +(q.get('pitch') ?? SPAWN.pitch);
  await later(); await Promise.all(works.map(hiRes));
  const hit = works.find(it => it.w.id === q.get('hit'));
  if (q.get('face') !== '0') for (const it of works) { const az = Math.atan2(P.x - it.x, P.z - it.z), d = wrap(az - it.face), e = it.oneSide || Math.abs(d) <= Math.PI / 2 ? d : wrap(d - Math.PI), over = Math.abs(e) - 0.28; if (over > 0) it.face += Math.sign(e) * over; it.sho.group.rotation.y = it.face; }
  for (const it of works) { it.sho.target = it === hit ? +(q.get('u') ?? 0.6) : 0; for (let i = 0; i < T * 30; i++) it.sho.update(1 / 30, i / 30); it.sho.points.visible = false; if (it.sho.lightPoints) it.sho.lightPoints.visible = false; it.sho.group.updateMatrixWorld(true); }
  for (const it of works) { litV.set(P.x - it.x, 0, P.z - it.z).normalize().multiplyScalar(0.55).add(room.sun).normalize(); it.sho.setLight(litV); }
  placeCam(T); room.update(T);
  if (hit) {
    setFocus(hit);
    if (q.get('pl')) { hit.sho.kick(0, new THREE.Vector2(+(q.get('pu') ?? 0.5), +(q.get('pv') ?? 0.5)), 1); hit.sho.pull = hit.sho.pullTarget = +q.get('pl'); hit.sho.pullV = 0; hit.sho.update(1e-4, T); }
    hit.sho.kickT = +(q.get('k') ?? 0.5);
    if (q.get('ba')) { hit.sho.burst(new THREE.Vector2(+(q.get('pu') ?? 0.5), +(q.get('pv') ?? 0.5)), 1); hit.sho.burstA = +q.get('ba'); hit.sho.update(1e-4, T); }
  }
  for (const it of works) if (it.live) it.live.update(T, 1 / 60, it === hit ? +(q.get('lv') ?? 0.4) : 0.05, it === hit ? it.sho.kickT : 0, null, null, cam);
  if (q.get('paper')) setFocus(stops[stops.length - 1]);
  await new Promise(r => setTimeout(r, 300));
  const still = () => { dof.render(scene, cam, focusDist()); requestAnimationFrame(still); }; still();
  window.MLLoader?.done(); window.__shotReady = true;
} else frame();
window.__sho = { works, P, goStop, pick, focusDist }; window.__cam = cam;
