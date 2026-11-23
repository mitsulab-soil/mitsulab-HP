// © mitsulab. All rights reserved. Q-P サイクルの 3D（2026-11-23 本人「図に写真も入れ込んで、3D で積層されたデザインとして、動的な QP ループ図に」）。
// 上の層＝Qualium（青み）・下の層＝Physium（茶）・あいだに P→M→U→a→E の輪。外に道具・実践・学説・活動・使う場の層。
// 字は HTML の重ね（いつも正面・読める大きさ）。図が画面に近づいてから読み、見えていない間は止める。動きを減らす設定では呼ばれない（2D の図のまま）。
import * as THREE from 'three';

const CY = 0x8fdfe6, BR = 0xe0b48c;
const NODES = [
  { s: 'P', a: 205, q: 1, ja: '知覚', en: 'Perception', note: '鼎', noteEn: 'Kanae' },
  { s: 'M', a: 270, q: 1, ja: '意味づけ', en: 'Meaning', note: '種', noteEn: 'Shu' },
  { s: 'U', a: 335, q: 1, ja: '環世界', en: 'Umwelt', note: '', noteEn: '' },
  { s: 'a', a: 38, q: 0, ja: 'はたらきかけ', en: 'Acting', note: '坐', noteEn: 'Za' },
  { s: 'E', a: 142, q: 0, ja: '環境', en: 'Environment', note: '廻', noteEn: 'Kai' },
];
const P = 'img/apps/play-20261120/';
// 道具（HP のカードの章分けのまま）と実践・ワークショップ。sp＝スマホでも出す
const BOARDS = {
  P: [['sight', 1], ['hear', 0], ['touch', 1], ['magnet', 0]],
  M: [['sound', 1], ['oto', 0], ['rakugo', 0], ['museum', 1]],
  U: [['research', 1, 'img/research/umwelt_def_640.webp']],
  E: [['omiya', 1], ['kawagoe', 0], ['shibuya', 0], ['map', 1], ['network', 0], ['deep', 0]],
  a: [['workshop', 1, 'img/ws-cc/ws_walk_1123_640.webp', 'ワークショップ', 'Workshops'], ['workshop', 0, 'img/ws-cc/ws_bath_1123_640.webp', 'ワークショップ', 'Workshops']],
};
const PRACTICE = [['土木 · 造園 · 農業 · 林業', 'civil · landscape · farming · forestry'], ['氷川参道 土中環境再生', 'Hikawa approach soil restoration'], ['大地の再生 · 刈草を畑へ還す', 'Daichi no Saisei · cut grass back to fields']];
const THEO = [['環世界論', 'Umwelt theory', 'U'], ['場の理論', 'Field theory', 'U'], ['アフォーダンス', 'Affordances', 'P'], ['生態心理学', 'Ecological psychology', 'P'], ['拡張された心', 'The extended mind', 'M'], ['アクター・ネットワーク理論', 'Actor-network theory', 'E']];
const ACT = [['研究', 'Research'], ['エンジニアリング', 'Engineering'], ['ワークショップ', 'Workshops'], ['道具', 'Tools'], ['アート', 'Art'], ['文筆', 'Writing']];
const SITES = [['神社・寺社の境内', 'Shrine grounds'], ['公園・緑地', 'Parks'], ['農園・森', 'Farms · forests'], ['まち・建設の現場', 'Building sites'], ['商店街・街道', 'Streets · old roads'], ['自治体・観光', 'Local gov. · tourism'], ['学校・教育', 'Schools'], ['図書館', 'Libraries'], ['美術館・博物館', 'Museums'], ['病院・福祉', 'Care']];

const CSS = `.qp3{position:absolute;pointer-events:none;opacity:0;transition:opacity 1.6s ease}.qp3.on{opacity:1}.qp3 canvas{position:absolute;inset:0;width:100%!important;height:100%!important}
.qp3 .l *{margin:0;padding:0}.qp3 .l{position:absolute;left:0;top:0;white-space:nowrap;font-family:"Shippori Mincho","Noto Serif JP",serif;color:#e4eff2;letter-spacing:.06em;line-height:1.3;text-align:center;will-change:transform;text-shadow:0 0 6px #04141a,0 0 3px #04141a}
.qp3 .n{font-size:13px}.qp3 .n b{display:block;font:italic 400 30px/1 "Cormorant Garamond","Times New Roman",serif;color:#8fdfe6;letter-spacing:0}.qp3 .n.ph b{color:#e0b48c}.qp3 .n i{display:block;font-style:normal;font-size:10px!important;color:#bccbd0}
.qp3 .t{font-size:10.5px;color:#a9dfe4}.qp3 .t.ph{color:#e6c3a2}.qp3 .s{font-size:9.8px;color:#bccbd0}.qp3 .th{font-size:10.5px;color:#eef6f8}.qp3 .ac{font-size:10.5px;color:#e6c3a2}
.qp3 .eq{font:400 21px/1.2 "Cormorant Garamond","Times New Roman",serif;color:#eef6f8}.qp3 .eq .c{display:block!important;font:400 10.5px/1.5 "Shippori Mincho",serif;color:#bccbd0;letter-spacing:.1em}.qp3 .eq em{font-style:italic}
.qp3 .hd{font-size:11px;letter-spacing:.2em;color:#8fdfe6}.qp3 .hd.ph{color:#e0b48c}.qp3 .ft{font-size:10px;color:#bccbd0;letter-spacing:.12em}
@media(max-width:760px){.qp3 .n{font-size:11px}.qp3 .n b{font-size:22px}.qp3 .n i,.qp3 .t,.qp3 .th,.qp3 .ac,.qp3 .eq .c,.qp3 .hd,.qp3 .ft{font-size:9.6px}.qp3 .s{font-size:9.4px}.qp3 .eq{font-size:14px}.qp3 .eq .c{font-size:9.6px!important;letter-spacing:.04em}.qp3 .n i{font-size:9.4px!important}}
.lp-w.qp3-on>svg.lp{visibility:hidden}.qp3.sp{position:relative;margin-bottom:4px}`;

export function start(wrap) {
  const sp = matchMedia('(max-width:760px)').matches;
  const svg = [...wrap.querySelectorAll('svg.lp')].find(e => e.getBoundingClientRect().width > 0);
  if (!svg) return;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
  const box = document.createElement('div'); box.className = 'qp3' + (sp ? ' sp' : ''); box.setAttribute('aria-hidden', 'true'); if (sp) wrap.insertBefore(box, wrap.firstChild); else wrap.appendChild(box);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: !sp, alpha: true, powerPreference: 'low-power' }); } catch (e) { box.remove(); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, sp ? 1.5 : 1.75));
  box.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 50);
  const root = new THREE.Group(); scene.add(root); if (sp) root.scale.y = 1.5;
  const YQ = .34, YP = -.34, RN = .5;
  const pos = a => { const t = a * Math.PI / 180; return [Math.cos(t), Math.sin(t)]; };

  // 層：上 Qualium・下 Physium の円盤（縁が柔らかい放射の塗り）
  const discTex = (c0, c1) => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, c0); r.addColorStop(.7, c1); r.addColorStop(.97, c1); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const disc = (y, tex, op) => { const m = new THREE.Mesh(new THREE.CircleGeometry(1.02, 96), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.y = y; root.add(m); return m; };
  disc(YQ + .06, discTex('rgba(30,110,125,.55)', 'rgba(10,48,57,.42)'), 1);
  disc(YP - .06, discTex('rgba(110,74,46,.6)', 'rgba(51,35,26,.5)'), 1);
  const ring = (r, y, col, op, dash) => { const pts = []; for (let i = 0; i <= 160; i++) { const t = i / 160 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r)); } const g = new THREE.BufferGeometry().setFromPoints(pts); const m = dash ? new THREE.LineDashedMaterial({ color: col, transparent: true, opacity: op, dashSize: .02, gapSize: .025 }) : new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op }); const l = new THREE.Line(g, m); if (dash) l.computeLineDistances(); root.add(l); return l; };
  ring(1.02, YQ + .06, CY, .45); ring(1.02, YP - .06, BR, .45);
  ring(.9, .5, 0xeef6f8, .18, 1); ring(1.08, .82, BR, .2, 1); ring(.74, 0, 0xeef6f8, .16, 1); ring(1.2, -.9, 0xeef6f8, .16);
  // 層をつなぐ縦の細い線（積層の手がかり）
  { const g = []; for (let i = 0; i < 24; i++) { const [x, z] = pos(i * 15); g.push(x * 1.02, YQ + .06, z * 1.02, x * 1.02, YP - .06, z * 1.02); } const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(g, 3)); root.add(new THREE.LineSegments(b, new THREE.LineBasicMaterial({ color: 0xeef6f8, transparent: true, opacity: .07 }))); }

  // 項の点とめぐりの輪
  const np = {};
  NODES.forEach(n => { const [x, z] = pos(n.a); np[n.s] = new THREE.Vector3(x * RN, n.q ? YQ * .55 : YP * .55, z * RN); });
  const order = ['P', 'M', 'U', 'a', 'E'];
  const curve = new THREE.CatmullRomCurve3(order.map(s => np[s]), true, 'centripetal');
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, sp ? .009 : .007, 8, true), new THREE.MeshBasicMaterial({ color: 0xdfeff2, transparent: true, opacity: .55 }));
  root.add(tube);
  // 向きの矢じり（各区間の中ほど）
  const coneG = new THREE.ConeGeometry(.024, .06, 12);
  for (let i = 0; i < 5; i++) { const t = (i + .5) / 5, p = curve.getPointAt(t), d = curve.getTangentAt(t); const c = new THREE.Mesh(coneG, new THREE.MeshBasicMaterial({ color: p.y > 0 ? CY : BR })); c.position.copy(p); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); root.add(c); }
  NODES.forEach(n => { const m = new THREE.Mesh(new THREE.SphereGeometry(.032, 20, 14), new THREE.MeshBasicMaterial({ color: n.q ? CY : BR })); m.position.copy(np[n.s]); root.add(m); const h = new THREE.Mesh(new THREE.RingGeometry(.05, .056, 40), new THREE.MeshBasicMaterial({ color: n.q ? CY : BR, transparent: true, opacity: .6, side: THREE.DoubleSide })); h.rotation.x = -Math.PI / 2; h.position.copy(np[n.s]); root.add(h); });
  // 点線の入力：P・M・E → U（f）、E → a（a）
  const dashL = (a, b, col) => { const m = a.clone().lerp(b, .5); m.y += .06; const c = new THREE.QuadraticBezierCurve3(a, m, b); const g = new THREE.BufferGeometry().setFromPoints(c.getPoints(40)); const l = new THREE.Line(g, new THREE.LineDashedMaterial({ color: col, transparent: true, opacity: .6, dashSize: .018, gapSize: .016 })); l.computeLineDistances(); root.add(l); };
  ['P', 'M', 'E'].forEach(s => dashL(np[s], np.U, CY)); dashL(np.E, np.a, BR);
  // めぐりに沿って流れる光（ゆっくり・やわらかい点）
  const glowC = document.createElement('canvas'); glowC.width = glowC.height = 64; { const g = glowC.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(200,245,250,.7)'); r.addColorStop(1, 'rgba(200,245,250,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }
  const glowT = new THREE.CanvasTexture(glowC);
  const sparks = []; const NS = sp ? 6 : 10;
  for (let i = 0; i < NS; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9 })); s.scale.setScalar(sp ? .1 : .08); root.add(s); sparks.push({ s, o: i / NS }); }

  // 写真の板（道具・ワークショップの実際の画面）
  const loader = new THREE.TextureLoader(); const boards = [];
  const labels = [];
  const L = (cls, html, v3, opt = {}) => { if (0) return; if (sp && !/^(n|n ph|hd|hd ph)$/.test(cls)) return { v: v3 }; const e = document.createElement('div'); e.className = 'l ' + cls; box.appendChild(e); const o = { e, v: v3, html, dy: opt.dy || 0, obj: opt.obj }; labels.push(o); return o; };
  Object.entries(BOARDS).forEach(([s, list]) => {
    const n = NODES.find(x => x.s === s); const use = list.filter(b => !sp || b[1]);
    use.forEach((b, i) => {
      const spread = sp ? 22 : (s === 'E' ? 15 : 17); const a = n.a + (i - (use.length - 1) / 2) * spread;
      const [x, z] = pos(a); const r = sp ? .8 : .78; const y = n.q ? .2 : -.2;
      const w = sp ? .2 : .15; const geo = new THREE.PlaneGeometry(w, w * .62);
      const mat = new THREE.MeshBasicMaterial({ color: 0x223035, transparent: true, opacity: .92, side: THREE.DoubleSide });
      const m = new THREE.Mesh(geo, mat); m.position.set(x * r, y, z * r); root.add(m);
      const fr = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: n.q ? CY : BR, transparent: true, opacity: .7 })); m.add(fr);
      const src = b[2] || (P + b[0] + '_320.webp');
      loader.load(src, t => { t.colorSpace = THREE.SRGBColorSpace; mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true; });
      boards.push({ m, y, ph: Math.random() * 6.28 });
      const ja = b[3] || b[0], en = b[4] || b[0];
      L('t' + (n.q ? '' : ' ph'), [ja, en], m.position, { dy: (sp ? .2 : .15) * .62 * .5, obj: m, below: 1 });
    });
  });
  // 項の札
  NODES.forEach(n => { const v = np[n.s].clone(); L('n' + (n.q ? '' : ' ph'), [`<b>${n.s}</b>${n.ja}${n.note ? `<i>note「${n.note}」</i>` : ''}`, `<b>${n.s}</b>${n.en}${n.note ? `<i>note “${n.noteEn}”</i>` : ''}`], v); });
  // 実践（a の外）
  { const [x, z] = pos(64); L('t ph', [PRACTICE.map(p => p[0]).join('<br>'), PRACTICE.map(p => p[1]).join('<br>')], new THREE.Vector3(x * .8, -.3, z * .8)); }
  // 式（層の真ん中）
  L('eq', ['<span class="c">Qualium 式 ── 世界の受けとり方を表現した式</span><em>U</em>ᵢ = <em>f</em>( <em>P</em>ᵢ, <em>E</em>, <em>M</em>ᵢ )', '<span class="c">Qualium equation — how we receive the world</span><em>U</em>ᵢ = <em>f</em>( <em>P</em>ᵢ, <em>E</em>, <em>M</em>ᵢ )'], new THREE.Vector3(0, YQ + .06, 0), { dy: .052 });
  L('eq', ['<em>E</em>′ = <em>a</em>( <em>E</em>, <em>U</em>ᵢ )<span class="c">Physium 式 ── 世界へのはたらきかけを表現した式</span>', '<em>E</em>′ = <em>a</em>( <em>E</em>, <em>U</em>ᵢ )<span class="c">Physium equation — how we act upon the world</span>'], new THREE.Vector3(0, YP - .06, 0), { dy: -.03 });
  // 層の名
  L('hd', ['Qualium ── 認知空間', 'Qualium — cognitive space'], new THREE.Vector3(0, YQ + .06, -1.02), { dy: -.016 });
  L('hd ph', ['Physium ── 物理空間', 'Physium — physical space'], new THREE.Vector3(0, YP - .06, 1.02), { dy: .025 });
  // 学説（上の外の輪）・活動（下の外の輪）・使う場（いちばん外）
  THEO.forEach((t, i) => { const a = 200 + i * 28; const [x, z] = pos(a); L('th', [t[0], t[1]], new THREE.Vector3(x * .9, .5, z * .9)); });
  ACT.forEach((t, i) => { const a = 205 + i * 26; const [x, z] = pos(a); L('ac', [t[0], t[1]], new THREE.Vector3(x * 1.08, .82, z * 1.08)); });
  SITES.forEach((t, i) => { const a = 12 + i * 17.3; const [x, z] = pos(a); L('s', [t[0], t[1]], new THREE.Vector3(x * 1.2, -.9, z * 1.2)); });
  // 案内役とテーマ
  L('ft', ['案内役 碧 ／ テーマ「胡蝶の夢 ── 夢のような、現実へ。」', 'Guide: Aoi ／ Theme: “The Butterfly Dream — toward a dreamlike reality.”'], new THREE.Vector3(0, YQ + .06, -1.02), { dy: -.045 });

  const isEn = () => document.documentElement.getAttribute('data-lang') === 'en';
  const paint = () => { const en = isEn(); labels.forEach(o => { if (!o.e) return; o.e.innerHTML = o.html[en ? 1 : 0]; o.w = o.e.offsetWidth; o.h = o.e.offsetHeight; }); };
  paint(); new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
  if (document.fonts) document.fonts.ready.then(paint);

  let W = 0, H = 0;
  const fit = () => {
    const s = [...wrap.querySelectorAll('svg.lp')].find(e => e.getBoundingClientRect().width > 0) || svg;
    const a = s.getBoundingClientRect(), b = wrap.getBoundingClientRect();
    if (!sp) { box.style.left = (a.left - b.left) + 'px'; box.style.top = (a.top - b.top) + 'px'; } else box.style.marginLeft = (a.left - b.left) + 'px';
    W = a.width; H = sp ? Math.round(a.width * 1.05) : a.height; box.style.width = W + 'px'; box.style.height = H + 'px';
    renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); paint();
  };
  fit(); addEventListener('resize', fit);
  if (!sp) wrap.classList.add('qp3-on'); requestAnimationFrame(() => box.classList.add('on'));

  const v = new THREE.Vector3(); let vis = true, raf = 0, last = performance.now(), T = 0, tilt = .9, yaw = 0;
  new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }).observe(wrap);
  function loop(now) {
    raf = 0; if (!vis) return;
    const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now; T += dt;
    // スクロールに合わせて傾き（なめらかに追う）。図が画面の中ほどで 50°、入るとき深く・出るとき浅く
    const r = wrap.getBoundingClientRect(); const k = Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight));
    const want = (sp ? .78 : .96) + k * .12; tilt += (want - tilt) * Math.min(1, dt * 2.2);
    yaw = Math.sin(T * .05) * .2; // ゆっくり左右に回る（約 2 分で一往復）
    const D = sp ? 6.2 : 5.5;
    cam.position.set(Math.sin(yaw) * Math.cos(tilt) * D, Math.sin(tilt) * D, Math.cos(yaw) * Math.cos(tilt) * D); cam.lookAt(0, -.04, 0);
    sparks.forEach(p => { const t = (p.o + T / 48) % 1; p.s.position.copy(curve.getPointAt(t)); });
    boards.forEach(b => { b.m.position.y = b.y + Math.sin(T * .5 + b.ph) * .012; b.m.quaternion.copy(cam.quaternion); });
    renderer.render(scene, cam);
    labels.forEach(o => {
      if (!o.e) return;
      v.copy(o.v); if (o.obj) v.copy(o.obj.position); v.applyMatrix4(root.matrixWorld).project(cam);
      let x = (v.x * .5 + .5) * W, y = (-v.y * .5 + .5) * H;
      if (o.obj) y += o.dy * H * .36 + 2; else if (o.dy) y += o.dy * H;
      o.e.style.transform = `translate(${(x - o.w / 2).toFixed(1)}px,${(y - (o.obj ? 0 : o.h / 2)).toFixed(1)}px)`;
    });
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  window.__qp3 = { renderer, labels };
}
