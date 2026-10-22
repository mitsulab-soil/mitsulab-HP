// Qualia/sho ── 書の回廊（v1 2026-10-22）
// © mitsulab. All rights reserved.  書は上原光瑛の作品。3D・音・プログラム＝mitsulab。
// 書の形から作った墨の彫刻を回廊に並べる。触れると墨が筆の向きに沿って粒にほどけ、音が鳴り、また一つの書に集まる。
import * as THREE from 'three';
import { loadShoMap, createSho, createShoSound } from './kit/sho3d.js?v=20261022';

const q = new URLSearchParams(location.search);
const SHOT = q.get('shot');                                   // 静止画を撮るとき（?shot=027）
const mobile = matchMedia('(max-width:700px), (pointer:coarse)').matches;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const GAP = mobile ? 9 : 6;                                    // 書と書の間（m）。縦長の画面は一歩さがって見るので広く
const $ = id => document.getElementById(id);
let soundOn = true, audioWoken = false;
try { soundOn = localStorage.getItem('qsho-sound') !== 'off'; } catch (e) { /* 保存できない端末は入から */ }

/* ── 描く ── */
const cv = $('cv');
const R = new THREE.WebGLRenderer({ canvas: cv, antialias: !mobile, preserveDrawingBuffer: !!SHOT, powerPreference: 'high-performance' });
R.setPixelRatio(Math.min(devicePixelRatio, SHOT ? 2 : mobile ? 1.5 : 1.75));
R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const FOG = 0x7d8a95;                                          // 奥ほど光に満ちた霧：墨の黒が光を背に立つ
scene.background = new THREE.Color(FOG);
scene.fog = new THREE.FogExp2(FOG, 0.082);
const cam = new THREE.PerspectiveCamera(50, 1, 0.05, 80);

/* ── 回廊：柱・梁・垂木・格子窓の壁・磨いた床・床に落ちる縞の光 ── */
const N_BAY = Math.ceil((11 * GAP + 14) / 3), LEN = N_BAY * 3;
scene.add(new THREE.HemisphereLight(0xc9d6de, 0x1a1612, 0.9));
const key = new THREE.DirectionalLight(0xdfe9f0, 1.3); key.position.set(-3, 6, 4); scene.add(key);
const m4 = new THREE.Matrix4();
const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, LEN + 20), new THREE.MeshStandardMaterial({ color: 0x2b2a29, roughness: 0.26, metalness: 0 }));
floor.rotation.x = -Math.PI / 2; floor.position.z = 6 - LEN / 2; scene.add(floor);
const woodMat = new THREE.MeshStandardMaterial({ color: 0x1c140e, roughness: 0.55 });
const pillars = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.18, 4.2, 14), woodMat, 2 * N_BAY);
const beams = new THREE.InstancedMesh(new THREE.BoxGeometry(9, 0.22, 0.26), woodMat, N_BAY);
for (let i = 0; i < N_BAY; i++) {
  const z = 6 - i * 3;
  pillars.setMatrixAt(i * 2, m4.makeTranslation(-3.1, 2.1, z)); pillars.setMatrixAt(i * 2 + 1, m4.makeTranslation(3.1, 2.1, z));
  beams.setMatrixAt(i, m4.makeTranslation(0, 4.15, z));
}
scene.add(pillars, beams);
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(9, LEN + 20), woodMat); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 4.3, 6 - LEN / 2); scene.add(ceil);
const rafters = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.1, LEN + 20), woodMat, 18);
for (let i = 0; i < 18; i++) rafters.setMatrixAt(i, m4.makeTranslation(-4.25 + i * 0.5, 4.22, 6 - LEN / 2)); scene.add(rafters);
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const lattice = canvasTex(256, 256, x => {
  x.fillStyle = '#f2f5f6'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#1a130d';
  for (let i = 0; i <= 8; i++) x.fillRect(i * 32 - 1, 0, 2, 256);
  for (let i = 0; i <= 4; i++) x.fillRect(0, i * 64 - 1, 256, 2);
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(20,26,30,.25)'); g.addColorStop(.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,26,30,.35)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
});
lattice.wrapS = lattice.wrapT = THREE.RepeatWrapping; lattice.repeat.set(LEN / 3, 1.6);
const wallMat = new THREE.MeshBasicMaterial({ map: lattice, color: 0x9aa6ad });
[-3.45, 3.45].forEach(x => { const w = new THREE.Mesh(new THREE.PlaneGeometry(LEN + 20, 3.2), wallMat); w.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; w.position.set(x, 2.3, 6 - LEN / 2); scene.add(w); });
const stripe = canvasTex(256, 32, x => { const g = x.createLinearGradient(0, 0, 256, 0); for (let i = 0; i < 8; i++) { g.addColorStop(i / 8, 'rgba(0,0,0,0)'); g.addColorStop(i / 8 + 0.03, 'rgba(255,255,255,.9)'); g.addColorStop(i / 8 + 0.07, 'rgba(0,0,0,0)'); } x.fillStyle = g; x.fillRect(0, 0, 256, 32); });
stripe.colorSpace = THREE.NoColorSpace;
const stripeMat = new THREE.MeshBasicMaterial({ map: stripe, color: 0xe8f0f4, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending });
for (let i = 0; i < Math.ceil(LEN / 6); i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 1.6), stripeMat); m.rotation.x = -Math.PI / 2; m.rotation.z = 0.5; m.position.set(-0.6, 0.005, 3 - i * 6); scene.add(m); }

// 光の層（Qualia Layer）：書のまわりに、縁だけ光る薄い板を重ねる
const layerLine = new THREE.LineBasicMaterial({ color: 0xe6f6fa, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
const layerSheet = new THREE.MeshBasicMaterial({ color: 0x9bdcf0, transparent: true, opacity: 0.028, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
function makeLayers(w) {   // 板の幅は書の幅に合わせる
  const geo = new THREE.PlaneGeometry(Math.max(1.6, w * 1.35), 2.2), edge = new THREE.EdgesGeometry(geo);
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) { const l = new THREE.Group(); l.add(new THREE.Mesh(geo, layerSheet), new THREE.LineSegments(edge, layerLine)); l.rotation.x = -Math.PI / 2; l.position.y = 0.45 + i * 0.75; l.userData.i = i; g.add(l); }
  return g;
}
// 漂う光の粒（回廊の空気）
const motes = (() => {
  const dot = canvasTex(32, 32, x => { const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); });   // 丸くぼかした光の粒（四角く見せない）
  const n = mobile ? 500 : 1400, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) p.set([(Math.random() - .5) * 6, Math.random() * 4, 6 - Math.random() * (LEN + 6)], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xf4fbff, size: 2.4 * Math.min(devicePixelRatio, 2), sizeAttenuation: false, map: dot, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(pts); return pts;
})();

/* ── 書 ── */
const meta = await (await fetch('data/works.json')).json();
const works = meta.works;
const items = works.map((w, i) => ({ w, i, z: -i * GAP, sho: null, snd: null, layers: null }));
const ready = [];
async function place(it) {
  const map = await loadShoMap(it.w.src);
  const width = Math.min(2.6, 2.6 * map.w / map.h) * (it.w.id === 'oto' ? 1.05 : 1);
  it.sho = createSho(THREE, map, { width, mobile, particleMode: 'ink', edgeGlow: 0.25 });
  it.sho.group.position.set(0, 1.75, it.z);
  it.sho.setScale(innerHeight * R.getPixelRatio() * 0.9);
  scene.add(it.sho.group);
  it.layers = makeLayers(width); it.layers.position.z = it.z; scene.add(it.layers);
  it.snd = createShoSound(it.w.preset, { pitch: it.w.pitch ?? 1, volume: 0.55 });
  if (soundOn && audioWoken) it.snd.start();
  ready.push(it);
}
let cur = Math.max(0, SHOT ? works.findIndex(w => w.id === SHOT) : 0);
// 最初の書と隣だけ先に置き、のこりは後から読む（起動を軽く）
await Promise.all([place(items[cur]), items[cur + 1] && place(items[cur + 1])].filter(Boolean));
const rest = items.filter(it => !it.sho);
const later = () => Promise.all(rest.map(place)).catch(e => console.warn('sho', e));

/* ── 画面の文字と操作 ── */
const label = w => w.id === 'oto' ? '上原光瑛の書 ── 音の字' : `上原光瑛の書 ── Qualia${w.id}/sound`;   // 元の書に刷られた番号
const listEl = $('works');
items.forEach(it => {
  const li = document.createElement('li'), b = document.createElement('button');
  b.type = 'button'; b.innerHTML = `<span class="wn"></span><span class="wt"></span>`;
  b.querySelector('.wn').textContent = it.w.id === 'oto' ? '音の字' : it.w.id; b.querySelector('.wt').textContent = it.w.title;
  b.onclick = () => { closeSheets(); goTo(it.i, true); };
  it.btn = b; li.appendChild(b); listEl.appendChild(li);
});
let auto = !SHOT, lastUser = performance.now(), tHere = 0, hintT = 0;
function showHint() { const h = $('hint'); h.classList.remove('off'); clearTimeout(hintT); hintT = setTimeout(() => h.classList.add('off'), 5000); }
function goTo(i, user) {
  cur = (i + items.length) % items.length; tHere = 0;
  if (user) { auto = false; lastUser = performance.now(); }
  items.forEach(it => { it.btn.setAttribute('aria-current', it.i === cur); if (it.sho && it.i !== cur) { it.sho.target = 0; it.hold = 0; } });
  $('capNo').textContent = label(items[cur].w);
  if (user) showHint();
  $('capTi').textContent = items[cur].w.title;
  $('count').textContent = `${String(cur + 1).padStart(2, '0')} / ${items.length}`;
}
goTo(cur);
$('prev').onclick = () => goTo(cur - 1, true);
$('next').onclick = () => goTo(cur + 1, true);
addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('.sheet')) { if (e.key === 'Escape') closeSheets(); return; }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(cur + 1, true);
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goTo(cur - 1, true);
  else if (e.key === ' ' || e.key === 'Enter') { if (e.target === document.body) { e.preventDefault(); wake(); touchWork(innerWidth / 2, innerHeight / 2, 4); } }
});

// 目録・元の書・この作品
const sheets = { listBtn: $('list'), infoBtn: $('info'), origBtn: $('orig') };
let opener = null;
function closeSheets() { Object.entries(sheets).forEach(([b, s]) => { s.hidden = true; $(b).setAttribute('aria-expanded', 'false'); }); if (opener) { opener.focus(); opener = null; } }
Object.entries(sheets).forEach(([b, s]) => {
  $(b).onclick = () => { const open = s.hidden; closeSheets(); if (open && b === 'origBtn') { const w = items[cur].w; const im = $('origImg'); im.src = w.orig; im.width = w.ow; im.height = w.oh; im.alt = `上原光瑛の書「${w.title}」（紙に墨）`; $('origCap').textContent = `${w.title}　${w.id === 'oto' ? '' : 'Qualia' + w.id + '/sound'}`; }
    if (open) { s.hidden = false; $(b).setAttribute('aria-expanded', 'true'); opener = $(b); s.querySelector('[data-close]').focus(); } };
  s.addEventListener('click', e => { if (e.target === s || e.target.closest('[data-close]')) closeSheets(); });
});
addEventListener('keydown', e => { if (e.key === 'Escape') closeSheets(); });

/* ── 音と振動 ── */
const sBtn = $('snd');
const paintSnd = () => { sBtn.setAttribute('aria-pressed', soundOn); sBtn.textContent = soundOn ? '音 入' : '音 切'; };
paintSnd();
function wake() {                                      // 最初の操作で音をひらく（自動再生の決まりを守る）
  if (audioWoken || !soundOn) return; audioWoken = true;
  ready.forEach(it => it.snd.start());
}
sBtn.onclick = () => {
  soundOn = !soundOn; paintSnd(); try { localStorage.setItem('qsho-sound', soundOn ? 'on' : 'off'); } catch (e) { /* 何もしない */ }
  if (soundOn) { audioWoken = true; ready.forEach(it => it.snd.start()); } else ready.forEach(it => it.snd.stop());
};
const canVibe = 'vibrate' in navigator;
let lastPulse = 0, ringAt = [innerWidth / 2, innerHeight * 0.45];
function ring(x, y, small) {
  if (RM && small) return;
  const r = document.createElement('div'); r.className = 'ring' + (small ? ' s' : ''); r.style.left = x + 'px'; r.style.top = y + 'px';
  $('rings').appendChild(r); setTimeout(() => r.remove(), 950);
}
function pulse(now, amp) {                             // ほどける粒に合わせて：振動できる端末は震え、できない端末（iPhone など）は光の輪
  if (amp < 0.08 || now - lastPulse < (canVibe ? 55 : 140)) return; lastPulse = now;
  if (canVibe) { try { navigator.vibrate(Math.round(6 + 22 * Math.min(1, amp))); } catch (e) { /* 止められた端末 */ } }
  else if (mobile) ring(ringAt[0] + (Math.random() - .5) * 60, ringAt[1] + (Math.random() - .5) * 60, true);
}

/* ── 触れる：押すとほどける。短く押せば少しのあいだほどけたまま、長く押せば離すと集まる。左右に払うと隣の書へ ── */
let down = null;
function touchWork(x, y, holdSec) {
  const it = items[cur]; if (!it.sho) return;
  ringAt = [x, y]; ring(x, y);
  if (canVibe) { try { navigator.vibrate(12); } catch (e) { /* 何もしない */ } }
  it.sho.target = 0.9; it.hold = holdSec; it.pressed = true;
  clearTimeout(hintT); hintT = setTimeout(() => $('hint').classList.add('off'), 2500); auto = false; lastUser = performance.now();
}
cv.addEventListener('pointerdown', e => { wake(); down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; touchWork(e.clientX, e.clientY, 99); });
addEventListener('pointerup', e => {
  if (!down || e.pointerId !== down.id) return;
  const dx = e.clientX - down.x, dy = e.clientY - down.y, dt = performance.now() - down.t, it = items[cur];
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) { it.sho && (it.sho.target = 0); goTo(cur + (dx < 0 ? 1 : -1), true); }
  else if (it.sho) it.hold = dt < 450 ? 3.2 : 0;        // 短く押した：3 秒ほどほどけたまま／長く押した：離すと集まる
  it.pressed = false; down = null;
});
addEventListener('pointercancel', () => { const it = items[cur]; if (it) { it.hold = 0; it.pressed = false; } down = null; });
// PC：ポインタの位置で、視点が少しずれる（のぞきこむ）
const par = { x: 0, y: 0 };
addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { par.x = (e.clientX / innerWidth - .5); par.y = (e.clientY / innerHeight - .5); } });

/* ── カメラ：書の前に立つ。縦長の画面では一歩さがる ── */
const camPos = new THREE.Vector3(0, 1.7, 4.6), look = new THREE.Vector3(0, 1.75, 0);
function resize() { const w = innerWidth, h = innerHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); ready.forEach(it => it.sho.setScale(h * R.getPixelRatio() * 0.9)); }
addEventListener('resize', resize); resize();
function standDist(it) {
  const s = it.sho, w = s ? s.width : 2.6, h = s ? s.height : 2.6;
  const vf = THREE.MathUtils.degToRad(cam.fov / 2);
  const needH = (h * (mobile ? 1.75 : 1.32)) / 2 / Math.tan(vf), needW = (w * (mobile ? 1.16 : 1.3)) / 2 / Math.tan(vf) / cam.aspect;   // 書の全体が札と帯に隠れずに入る
  return Math.max(3.6, needH, needW);
}

const clock = new THREE.Clock(); let acc = 0, started = false;
const minDt = mobile ? 1 / 31 : 0;                     // スマホは 30fps に抑える
const tmpV = new THREE.Vector3(), tmpL = new THREE.Vector3();
function frame() {
  requestAnimationFrame(frame);
  const d0 = clock.getDelta(); acc += d0; if (acc < minDt) return; const dt = Math.min(acc, 0.1); acc = 0;
  const t = clock.elapsedTime, now = performance.now();
  if (!auto && now - lastUser > 30000) auto = true;     // さわっていないあいだは、近づくとひとりでにほどける
  tHere += dt;
  if (auto && now - lastUser > 30000 && tHere > 14) goTo(cur + 1);   // 30 秒さわらなければ、ひとりでに回廊を進む（最初の書でも 30 秒は待つ）
  const it = items[cur];
  // カメラ
  const dist = standDist(it);
  const sway = RM ? 0 : 1;
  tmpV.set(Math.sin(t * 0.21) * 0.45 * sway + par.x * 0.6, 1.66 + Math.sin(t * 0.17) * 0.1 * sway - par.y * 0.3, it.z + dist);
  camPos.lerp(tmpV, 1 - Math.exp(-dt * 0.9));
  look.lerp(tmpL.set(0, mobile ? 1.5 : 1.72, it.z), 1 - Math.exp(-dt * 1.5));   // スマホは下に札と帯があるので、書を少し上に見せる
  cam.position.copy(camPos); cam.lookAt(look);
  // 書
  for (const x of ready) {
    const d = cam.position.distanceTo(x.sho.group.position);
    // カメラといまの書のあいだに入った書（通りすぎる書）は、粒にほどけて道をあけ、通りすぎたら消える
    const between = x.z > it.z + 0.5 && cam.position.z > x.z - 2.2;
    const passed = x.z > it.z + 0.5 && cam.position.z < x.z + 0.4;
    const vis = d < GAP * 1.9 && !passed;
    x.sho.group.visible = vis; x.layers.visible = vis && !between;
    if (!vis) { x.snd.gain(0); x.sho.target = 0; x.sho.update(dt, t); continue; }
    if (between) { x.sho.target = 1; x.hold = 0; }
    if (x === it) {
      if (!x.pressed && x.hold > 0) { x.hold -= dt; if (x.hold <= 0) x.sho.target = 0; }
      if (auto && !x.pressed && !(x.hold > 0)) x.sho.target = tHere > 3 && tHere < 8.5 && d < dist + 0.8 ? 0.85 : 0;   // おまかせ：近づくとほどける
    }
    x.sho.update(dt, t);
    if (!RM) x.sho.group.rotation.y = Math.sin(t * 0.25 + x.z) * 0.16;
    x.snd.gain(x === it ? 1 : Math.max(0, 1 - (d - 3) / 6) * 0.5);
    x.snd.update(x.sho.state, dt);
    x.sho.setLevel(x.snd.level);
    x.layers.children.forEach(g => { g.position.y = 0.45 + g.userData.i * 0.75 + Math.sin(t * 0.4 + g.userData.i) * 0.05 * sway; g.visible = Math.abs(g.position.y - cam.position.y) > 0.35; });   // 目の高さの板は真横から線に見えるので描かない
    if (x === it) pulse(now, Math.abs(x.sho.state.du) * 1.6 + (x.sho.state.u > 0.3 ? x.snd.level * 0.6 : 0));
  }
  motes.rotation.y = Math.sin(t * 0.03) * 0.02; motes.position.y = Math.sin(t * 0.2) * 0.05;
  R.render(scene, cam);
  if (!started) { started = true; window.MLLoader?.done(); window.__shoReady = performance.now(); later(); }
}

if (SHOT) {                                            // 静止画：?shot=027&u=0.3&t=6
  const it = items[cur]; it.sho.target = +(q.get('u') ?? 0.3);
  const T = +(q.get('t') ?? 6); for (let k = 0; k < T * 60; k++) it.sho.update(1 / 60, k / 60);
  it.sho.group.rotation.y = +(q.get('ry') ?? 0.05);
  camPos.set(+(q.get('cx') ?? -0.3), +(q.get('cy') ?? 1.62), it.z + standDist(it)); look.set(0, 1.72, it.z);
  cam.position.copy(camPos); cam.lookAt(look);
  const still = () => { R.render(scene, cam); requestAnimationFrame(still); }; still();
  window.MLLoader?.done(); window.__shotReady = true;
} else frame();
window.__sho = { items, get cur() { return cur; }, goTo };
