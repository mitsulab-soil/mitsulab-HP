// Qualia/sho ── 書の広間（v1 2026-10-22 回廊 ／ v4〜v6 一つの書に一つの部屋 ／ v7 2026-10-23 一つの広間）
// © mitsulab. All rights reserved.  書は上原光瑛の作品。3D・音・プログラム＝mitsulab。
// 本人（10-23）「一つの広間に音の３dグラフィックが浮遊していて、消える演出は不要で、その空間を歩いて、それに触れると音が出て、モーションも発生してください。」
// 古寺の板の間の広間に、墨の立体の書が浮かぶ。床を押すとその向きへ歩き（一度に進むのは数歩まで）、書に触れるとその音が鳴って題が出て、墨が揺れる。動いたあとは字の形に戻る。
import * as THREE from 'three';
import { loadShoMap, createSho, createShoSound } from './kit/sho3d.js?v=20261023d';
import { buildRoom, loadRoomTextures, setRoomHalf } from './room.js?v=20261023d';
import { createLive } from './live.js?v=20261023d';
import { createDOF } from './dof.js?v=20261023d';

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
const HALF = 11;                                               // 広間は 22 m 四方
setRoomHalf(HALF);
const EYE = 1.62;                                              // 目の高さ
const Y_C = 2.75;                                              // 書の中心の高さ
const HMAX = mobile ? 2.8 : 3.5;   /* v8 スマホは少し小さく（375px で三つが切れずに一画面に入る） */                               // 書の大きいほうの辺（m）
const SPAWN = { x: 0, z: mobile ? 10.1 : 8.6, yaw: 0, pitch: 0.07 };   /* スマホは縦長なので一歩下がって、三つの書が一画面に入る */            // 入口（南）から北を見る
// 点の届いた書だけを置く（本人 10-23：012・027・025）。面の質が上がった書から、あとで足す
const PLACE = [
  { id: '027', x: 0, z: -4.6, y: 3.0 },
  { id: '012', x: -4.6, z: 0.2, y: 2.55 },
  { id: '025', x: 4.4, z: -1.4, y: 2.85 },
].map(p => mobile ? { ...p, x: { '027': 0.15, '012': -1.72, '025': 2.2 }[p.id] } : p);   /* v8 スマホ：012 が左で切れない位置（縦長の視野の幅から決めた） */   /* 高さと奥行きに差をつけて散らす */
const PAPER = { id: '034', x: -HALF + 0.05, z: -5.8, y: 2.25, w: 3.1 };   // 紙の原本：西の漆喰の壁に掛ける（3D にしない）

const meta = await (await fetch('data/works.json')).json();
const works = PLACE.map((p, i) => ({ ...p, i, w: meta.works.find(w => w.id === p.id), sho: null, snd: null, live: null, shadow: null, face: 0, base: 0, hold: 0, pressed: false, near: 0 })).filter(it => it.w);
const paperW = meta.works.find(w => w.id === PAPER.id);

async function prepare(it) {
  if (it.sho) return it;
  const map = await loadShoMap(it.w.src);
  it.map = map;
  const asp = map.w / map.h, width = asp >= 1 ? HMAX : HMAX * asp;
  it.sho = createSho(THREE, map, {
    width, mobile, material: it.w.material, particleMode: 'ink', edgeGlow: 0, envGain: 0.9, ink: 0x060708,
    particleSize: 0.0085, spread: width * 0.14, particles: mobile ? 1200 : 3000, segments: +(q.get('seg') || 0) || (mobile ? 170 : 320),
    keep: true, deep: +(q.get("deep") || 0.8), rim: +(q.get("rim") || (it.w.id === "027" ? 0.3 : 0)), inkCap: +(q.get("cap") || 0.07),   /* v8 縁は濡れた暗い墨の明るさまで（025 が金属の管に見えた） */   /* 2 回目の採点：025 は金属の管・012 は白い縁に見えたので、縁の光沢は 027 だけ */ toLight: 0, depth: width * 0.12, thickness: width * 0.12, seed: it.i * 1.7 + 0.4, flow: 0.1,
  });
  it.base = Math.atan2(SPAWN.x - it.x, SPAWN.z - it.z);       // 入口のほうを向いて浮かぶ
  it.face = it.base;
  it.sho.group.position.set(it.x, it.y, it.z); it.sho.group.rotation.y = it.face;
  it.sho.group.updateMatrixWorld(true);
  it.snd = createShoSound(it.w.preset, { pitch: it.w.pitch ?? 1, volume: 0.6 });
  if (soundOn && audioWoken) it.snd.start();
  return it;
}
function hiRes(it) {                                           // 原本から作った高い解像度へ（近い書から順に）
  if (it.hiP || !it.sho) return it.hiP; it.hiP = (async () => {
    const N = mobile ? 1024 : 2048;
    try {
      const [m, d] = await Promise.all([
        loadShoMap(`data/hi/${it.w.id}_m${N}.webp`),
        new Promise(ok => new THREE.TextureLoader().load(`data/hi/${it.w.id}_d${N}.webp`, t => { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; ok(t); }, undefined, () => ok(null))),
      ]);
      it.sho.setHiRes(m, d);
      await new Promise(ok => new THREE.TextureLoader().load(`data/hi/${it.w.id}_f512.png`, t => { t.colorSpace = THREE.NoColorSpace; t.magFilter = t.minFilter = THREE.LinearFilter; t.premultiplyAlpha = false; t.generateMipmaps = false; if (!q.has('noisl')) it.sho.setIslands(t); ok(); }, undefined, ok));
    } catch (e) { console.warn('hi', e); }
  })(); return it.hiP;
}

/* ── 広間を組む ── */
let room = null, ENV = null;
const ENVG = +(q.get('env') || 1.15);   /* v8 映りこみを弱く（濡れた暗い墨） */   /* 濡れた墨は、斜めほど障子の明るさを映す（照りの点ではなく、縁の湿った光沢で厚みが見える） */
const litV = new THREE.Vector3();
function placeInRoom(it) {
  scene.add(it.sho.group);
  if (it.shadow) scene.remove(it.shadow);
  it.shadow = it.sho.makeShadow(room.sun.clone().setY(room.sun.y * 1.3).normalize(), { strength: 1.25 * it.sho.shadowK, blur: 3.2 }   /* v8 床に墨の影（やわらかく濃く） */); scene.add(it.shadow);
  if (ENV) it.sho.setEnv(ENV, ENVG);
  it.sho.setLight(room.sun);
  if (!it.live) { it.live = createLive(scene, it.sho, { mobile, RM }); it.live.grid.position.x = it.x; it.live.grid.position.z = it.z; }
}
function buildHall(tex) {
  if (room) { scene.remove(room.group); room.dispose(); }
  room = buildRoom('hall', { mobile, tex });
  scene.add(room.group);
  scene.fog.density = room.fog * (dof.on ? 0.55 : 1); R.toneMappingExposure = room.expo * (+(q.get('ex') || 1.12));
}
// 紙の原本：額のない、紙一枚を壁に（紙の色に墨をかける＝白地が紙の色になる）
const paperG = new THREE.Group(); paperG.name = 'paper';
{
  const im = new THREE.TextureLoader().load(mobile ? 'data/orig/034_p1200.webp' : 'data/orig/034_p2000.webp', t => { t.anisotropy = 8; });
  im.colorSpace = THREE.SRGBColorSpace;
  const asp = 2000 / 1239, w = PAPER.w, h = w / asp, m = 0.16;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w + m * 2, h + m * 2), new THREE.MeshStandardMaterial({ color: 0xcfc6b4, roughness: 0.95 }));   /* 表具の地（紙より少し沈んだ色） */
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: im, color: 0xf3efe6, roughness: 0.95 }));
  sheet.position.z = 0.004; back.name = 'paper-hit';
  const edge = new THREE.Mesh(new THREE.BoxGeometry(w + m * 2 + 0.012, h + m * 2 + 0.012, 0.016), new THREE.MeshStandardMaterial({ color: 0x6b5a48, roughness: 0.9 }));   /* 細い木の縁 */
  edge.position.z = -0.012;
  paperG.add(edge, back, sheet);
  paperG.position.set(PAPER.x + 0.03, PAPER.y, PAPER.z); paperG.rotation.y = Math.PI / 2;
  paperG.userData = { w: w + m * 2, h: h + m * 2 };
}

/* ── 歩く：押した所からは向きだけを読み、一度に進むのは数歩まで（walk 氷川と同じ） ── */
const STEP_MAX = 3.2, SPEED = 1.45, KEEP = 1.0;               // 一度に進む上限（m）・歩く速さ（m/秒）・書からとる間合い（m）
const P = { x: SPAWN.x, z: SPAWN.z, yaw: SPAWN.yaw, pitch: SPAWN.pitch, goal: null, turn: null, keys: new Set(), bob: 0 };
const fwd = (yaw, o = new THREE.Vector3()) => o.set(-Math.sin(yaw), 0, -Math.cos(yaw));
function segOf(it) { const c = Math.cos(it.face), s = -Math.sin(it.face), hw = it.sho ? it.sho.width / 2 : 1.5; return [it.x - c * hw, it.z - s * hw, it.x + c * hw, it.z + s * hw]; }
function keepOut(x, z) {                                       // 書と壁にぶつからない（書は浮かぶ板＝線分としてよける）
  const L = HALF - 0.7; x = THREE.MathUtils.clamp(x, -L, L); z = THREE.MathUtils.clamp(z, -L, L);
  for (const it of works) {
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
  const d = it.sho ? Math.max(mobile ? 6.2 : 5.4, it.sho.height * (mobile ? 1.9 : 1.6)) : 5.5; const a = it.base + (it.i % 2 ? 0.16 : -0.16);   /* 立つ所は、はじめの向き（入口側）の正面から */
  const tx = it.x + Math.sin(a) * d, tz = it.z + Math.cos(a) * d;
  route([{ x: tx, z: tz }]); P.turn = Math.atan2(-(it.x - tx), -(it.z - tz)); P.pitchGoal = Math.atan2(Y_C - EYE, d) * 0.95;   /* 書の中心を見上げる */
  setFocus(it);
}
function blocked(ax, az, bx, bz) { for (let k = 1; k < 20; k++) { const t = k / 20, x = ax + (bx - ax) * t, z = az + (bz - az) * t, [px, pz] = keepOut(x, z); if (Math.hypot(px - x, pz - z) > 0.01) return true; } return false; }
function route(pts) {                                          // 書の前・紙の前へ：まっすぐ行けなければ、通り（入口のあたり・東西の端）を回る最短の道を
  const goal = pts[pts.length - 1], HUBS = [{ x: 0, z: 5.0 }, { x: -8.8, z: 3.6 }, { x: 8.8, z: 3.6 }, { x: -8.8, z: -8.6 }, { x: 8.8, z: -8.6 }, { x: 0, z: -8.6 }, { x: -2.4, z: -1.2 }, { x: 2.4, z: -1.2 }];
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
const idLabel = w => `上原光瑛の書 ── Qualia${w.id}/sound`;
let focus = null;                                              // いま題を出している書（触れた・近い）
const listEl = $('works');
const stops = [...works, { paper: true, w: paperW, i: works.length }];
stops.forEach((it, k) => {
  const li = document.createElement('li'), b = document.createElement('button');
  b.type = 'button'; b.innerHTML = `<img class="wi" alt="" loading="lazy" decoding="async" width="90" height="60"><span class="wx"><span class="wn"></span><span class="wt"></span></span>`;
  b.querySelector('.wi').src = it.paper ? `data/orig/${it.w.id}.webp` : `data/thumb/${it.w.id}.webp`;
  b.querySelector('.wn').textContent = it.paper ? `紙の原本　Qualia${it.w.id}/sound` : `Qualia${it.w.id}/sound`;
  b.querySelector('.wt').textContent = it.w.title;
  b.onclick = () => { closeSheets(); goStop(k); };
  it.btn = b; li.appendChild(b); listEl.appendChild(li);
});
let lastUser = performance.now(), hintT = 0, stopK = -1;
function showHint(txt) { const h = $('hint'); if (txt) h.innerHTML = txt; h.classList.remove('off'); clearTimeout(hintT); hintT = setTimeout(() => h.classList.add('off'), 7000); }
function paintHall() {
  $('capNo').textContent = '上原光瑛の書 ── Qualia/sho';
  $('capTi').textContent = '書の広間'; $('capTi').classList.remove('long');
  $('capRd').textContent = '「〇〇の音」の連作から三つの書が、古寺の板の間に浮かんでいる。西の壁には、紙に墨で書いた原本を一枚。';
  $('count').textContent = `-- / ${String(stops.length).padStart(2, '0')}`;
}
function setFocus(it) {
  focus = it; const w = it.w;
  $('capNo').textContent = it.paper ? `上原光瑛の書 ── 紙の原本　Qualia${w.id}/sound` : idLabel(w);
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
function pulse(now, amp) {                                     // 湧く墨に合わせて：振動できる端末は震え、できない端末（iPhone など）は光の輪
  if (amp < 0.08 || now - lastPulse < (canVibe ? 55 : 140)) return; lastPulse = now;
  if (canVibe) { try { navigator.vibrate(Math.round(6 + 22 * Math.min(1, amp))); } catch (e) { /* 止められた端末 */ } }
  else if (mobile) ring(ringAt[0] + (Math.random() - .5) * 60, ringAt[1] + (Math.random() - .5) * 60, true);
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
  const ph = rc.intersectObject(paperG, true)[0]; if (ph && (!best || ph.distance < best.dist)) best = { kind: 'paper', dist: ph.distance };
  if (!best && rc.ray.direction.y < -0.02) { const t = (0 - rc.ray.origin.y) / rc.ray.direction.y; best = { kind: 'floor', x: rc.ray.origin.x + rc.ray.direction.x * t, z: rc.ray.origin.z + rc.ray.direction.z * t }; }
  return best;
}
function touchWork(h, holdSec, force = 0.7, x = innerWidth / 2, y = innerHeight / 2) {
  const it = h.it; ringAt = [x, y];
  if (it.snd) it.snd.touch(THREE.MathUtils.clamp(h.u, 0, 1), THREE.MathUtils.clamp(h.v, 0, 1), force);
  if (canVibe) { try { navigator.vibrate(Math.round(10 + 18 * force)); } catch (e) { /* 何もしない */ } }
  it.sho.target = 0.9; it.hold = holdSec; it.pressed = true;
  it.sho.pullTarget = holdSec > 50 ? 1 : 0.7; if (holdSec <= 50) setTimeout(() => { if (!it.pressed) it.sho.pullTarget = 0; }, 260);
  it.sho.kick(0.6 + 0.4 * force, new THREE.Vector2(h.u, h.v), h.side);
  it.sho.burst(new THREE.Vector2(h.u, h.v), h.side);   /* v8 字が一度はっきり波打って崩れ、かけらが字の外へ散り、字の形へ戻る */
  it.kickAt = performance.now(); it.wob = 1;   /* 触れると、書全体が一度大きく揺れて、かけらが離れ、3 秒ほどで字の形に戻る */
  setFocus(it); lastUser = performance.now();
}
function touchAt(x, y, holdSec, force = 0.7) {
  const h = pick(x, y); if (!h) return null;
  if (h.kind === 'work') touchWork(h, holdSec, force, x, y);
  else if (h.kind === 'paper') { setFocus(stops[stops.length - 1]); if (holdSec < 50) { closeSheets(); openOrig(paperW); sheets.origBtn.hidden = false; $('origBtn').setAttribute('aria-expanded', 'true'); opener = $('origBtn'); } }
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
  if (gest.drag) { P.turn = null; P.pitchGoal = null; P.yaw += dx * (mobile ? 0.0055 : 0.0042); P.pitch = THREE.MathUtils.clamp(P.pitch + dy * 0.0035, -0.35, 0.6); lastUser = performance.now(); }
  gest.x = e.clientX; gest.y = e.clientY;
});
function endPtr(e) {
  if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
  if (ptrs.size) return;
  const g = gest; gest = null; if (!g || g.pinch) return;
  if (!g.drag) {
    if (g.held) { const it = g.held; const dt = performance.now() - g.t; it.hold = dt < 450 ? 3.2 : 0; if (!it.hold) it.sho.target = 0; }
    else touchAt(g.x0, g.y0, 3.2, g.force);
  }
  works.forEach(it => { if (it.pressed) { it.pressed = false; setTimeout(() => { if (!it.pressed) it.sho.pullTarget = 0; }, 120); } });
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
await Promise.all(works.map(prepare));
buildHall(null);
works.forEach(placeInRoom);
scene.add(paperG);
resize();
paintHall();
showHint('<span>床を押すと、その向きへ歩く。</span><span>ドラッグで見回す。</span><span>書に触れると、その音が鳴る。</span>');
const later = () => loadRoomTextures(R, mobile).then(t => {
  ENV = t.env; buildHall(t);
  works.forEach(it => { if (ENV) it.sho.setEnv(ENV, ENVG); it.sho.setLight(room.sun); });
}).catch(e => console.warn('tex', e));
const hiAll = async () => { const s = [...works].sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z)); for (const it of s) await hiRes(it); };

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
    if (it.snd) { it.snd.gain(THREE.MathUtils.clamp((11 - dist) / 7, 0, 1)); it.snd.update(s.state, dt); s.setLevel(it.snd.level); }
    // 無重力：重力と浮力の釣り合いを探るように、周期のそろわない揺らぎ・ふとした沈みと戻り（書ごとに位相をずらす）
    if (!RM) {
      const kk = Math.min(1, s.kickT || 0), lv = it.snd ? it.snd.level : 0, Pp = Math.PI * 2, o = it.i * 2.3;
      const dip = Math.pow(Math.max(0, Math.sin(t * 0.093 + o) * Math.sin(t * 0.141 + 2.0 + o)), 3) * 0.14;
      s.group.position.y = it.y + 0.1 * Math.sin(t * Pp / 4.7 + o) + 0.05 * Math.sin(t * Pp / 2.9 + 1.3 + o) + 0.012 * Math.sin(t * Pp / 1.3 + 0.4) + 0.004 * Math.sin(t * 11.3) * (1 + 3 * lv) - dip - 0.09 * kk * Math.cos(t * 13.0) * kk;
      s.group.rotation.x = 0.045 * Math.sin(t * Pp / 5.3 + o) + 0.012 * Math.sin(t * Pp / 2.3 + 1.0) + 0.025 * kk * Math.sin(t * 17.0);
      s.group.rotation.z = 0.04 * Math.sin(t * Pp / 6.1 + 1.0 + o) + 0.01 * Math.sin(t * Pp / 1.9) + dip * 0.2 + 0.02 * kk * Math.cos(t * 15.0);
    }
    // 見る人のほうへ、ゆっくり向き直る（真横で板の縁だけにならない。表でも裏でも近いほうを向ける）
    const az = Math.atan2(dx, dz), d = wrap(az - it.face), e = Math.abs(d) <= Math.PI / 2 ? d : wrap(d - Math.PI), lim = 0.75, over = Math.abs(e) - lim;
    if (over > 0 && dist < 14) it.face += Math.sign(e) * over * Math.min(1, dt * 1.2);
    s.group.rotation.y = (RM ? 0 : Math.sin(t * 0.13 + it.i) * 0.1 + Math.sin(t * 0.41 + 1.0 + it.i) * 0.03) + it.face;
    if (room) { litV.set(dx, 0, dz).normalize().multiplyScalar(0.55).add(room.sun).normalize(); s.setLight(litV); }   /* 見る人の側の斜め上からも光を回す（逆光の切り絵にしない） */
    if (it.wob > 0) {                                          // 触れたあとの揺れ（ばねのように大きく揺れて、なだらかに静まる）
      it.wob = Math.max(0, it.wob - dt / 3.2); const w = it.wob * it.wob * (RM ? 0.2 : 1), age = (1 - it.wob) * 3.2;
      s.group.position.y += 0.2 * w * Math.sin(age * 5.2); s.group.rotation.y += 0.2 * w * Math.sin(age * 3.6); s.group.rotation.z += 0.07 * w * Math.sin(age * 6.1); s.group.rotation.x += 0.05 * w * Math.sin(age * 4.4 + 1.0);
      s.group.scale.setScalar(1 + 0.045 * w * Math.sin(age * 7.5)); s.kickT = Math.max(s.kickT || 0, 0.85 * w);
    } else if (s.group.scale.x !== 1) s.group.scale.setScalar(1);
  }
  // さわらないあいだも、近い書はときどき墨が湧く（LIVE）
  if (closest && idle > 9000 && !closest.pressed && !(closest.hold > 0)) { const ph = (t + closest.i * 5) % 16; closest.sho.target = ph > 6 && ph < 9.5 ? 0.6 : 0; }
  for (const it of works) {
    if (!it.live || !it.sho) continue;
    const near = it === closest || (it.kickAt && now - it.kickAt < 4000);
    const amp = it.live.update(t, dt, it.snd ? it.snd.level : 0, Math.min(1, Math.max(it.sho.kickT || 0, it.wob || 0)), near && it.snd && it.snd.running ? it.snd.wave() : null, near ? room && room.group : null, cam);
    if (near) shakeAmp = Math.max(shakeAmp, amp);
    if (it.snd) pulse(now, near ? Math.abs(it.sho.state.du) * 1.6 + (it.sho.state.u > 0.3 ? it.snd.level * 0.6 : 0) : 0);
  }
  if (room) room.update(t);
  if (shakeAmp > 0) cam.position.add(tmpV.set(Math.sin(t * 71) * shakeAmp * 0.4, Math.cos(t * 67) * shakeAmp * 0.4, 0));
  dof.render(scene, cam, focusDist());
  if (!started) { started = true; window.MLLoader?.done(); window.__shoReady = performance.now(); later().then(hiAll); }
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
  if (q.get('face') !== '0') for (const it of works) { const az = Math.atan2(P.x - it.x, P.z - it.z), d = wrap(az - it.face), e = Math.abs(d) <= Math.PI / 2 ? d : wrap(d - Math.PI), over = Math.abs(e) - 0.75; if (over > 0) it.face += Math.sign(e) * over; it.sho.group.rotation.y = it.face; }
  for (const it of works) { it.sho.target = it === hit ? +(q.get('u') ?? 0.6) : 0; for (let i = 0; i < T * 30; i++) it.sho.update(1 / 30, i / 30); it.sho.points.visible = false; if (it.sho.lightPoints) it.sho.lightPoints.visible = false; it.sho.group.updateMatrixWorld(true); }
  for (const it of works) { litV.set(P.x - it.x, 0, P.z - it.z).normalize().multiplyScalar(0.55).add(room.sun).normalize(); it.sho.setLight(litV); }
  placeCam(T); room.update(T);
  if (hit) {
    setFocus(hit);
    if (q.get('pl')) { hit.sho.kick(0, new THREE.Vector2(+(q.get('pu') ?? 0.5), +(q.get('pv') ?? 0.5)), 1); hit.sho.pull = hit.sho.pullTarget = +q.get('pl'); hit.sho.pullV = 0; hit.sho.update(1e-4, T); }
    hit.sho.kickT = +(q.get('k') ?? 0.5);
    if (q.get('ba')) { hit.sho.burst(new THREE.Vector2(+(q.get('pu') ?? 0.5), +(q.get('pv') ?? 0.5)), 1); hit.sho.burstA = +q.get('ba'); hit.sho.update(1e-4, T); }
  }
  for (const it of works) it.live.update(T, 1 / 60, it === hit ? +(q.get('lv') ?? 0.4) : 0.05, it === hit ? it.sho.kickT : 0, null, null, cam);
  if (q.get('paper')) setFocus(stops[stops.length - 1]);
  await new Promise(r => setTimeout(r, 300));
  const still = () => { dof.render(scene, cam, focusDist()); requestAnimationFrame(still); }; still();
  window.MLLoader?.done(); window.__shotReady = true;
} else frame();
window.__sho = { works, P, goStop, pick, focusDist }; window.__cam = cam;
