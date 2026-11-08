// © mitsulab. Qualia/oto ── 書と音の広間（2026-11-09 集約：Qualia/sho の書の広間 ＋ Qualia/sound の「〇〇の音」の言葉と合成）
// 書になった十の「〇〇の音」と、まだ書になっていない約 300 の「〇〇の音」の言葉を、一つの広間に。
// 言葉の点に触れると、Qualia/sound と同じ規則でその場で音を組み立てて鳴らす（録音ではない合成）。
// 書に触れると、同じ字を含む言葉の点が灯り、細い線で書とつながる。どこにも保存・送信しない。
import * as THREE from 'three';
import './sounds.js';
import './gain.js';
import { QSynth } from './synth.js';

export function initWords({ scene, cam, works, mobile, soundOk, say, keepOut, HALF }) {
  const D = window.QS_SOUNDS, items = D.items.filter(i => /の音$/.test(i.t));
  const syn = new QSynth();
  let seed = 9109; const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const kanji = s => new Set([...s].filter(c => /[一-鿿]/.test(c) && c !== '音'));
  const titleOf = it => it.w && it.w.title;
  // 置き場：書のまわりを避けて、目の高さの前後に漂う
  const pts = [];
  for (const it of items) {
    const onWork = works.find(w => titleOf(w) === it.t);
    let x, z, y;
    if (onWork) { x = onWork.x; z = onWork.z + .9; y = (onWork.form === 'floor' ? .9 : Math.min(2.4, (onWork.y || 2) - .4)); }
    else { for (let k = 0; k < 20; k++) { x = (R() * 2 - 1) * (HALF - 1.4); z = (R() * 2 - 1) * (HALF - 1.4); if (works.every(w => Math.hypot(w.x - x, w.z - z) > 2.0)) break; } y = .7 + R() * 2.0; [x, z] = keepOut ? keepOut(x, z) : [x, z]; }
    pts.push({ it, p: new THREE.Vector3(x, y, z), k: kanji(it.t), glow: 0, ph: R() * 6.28, onWork: !!onWork });
  }
  const g = new THREE.BufferGeometry(), pos = new Float32Array(pts.length * 3), col = new Float32Array(pts.length * 3), sz = new Float32Array(pts.length);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('size', new THREE.BufferAttribute(sz, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uPx: { value: Math.min(devicePixelRatio, 2) } },
    vertexShader: 'attribute float size; attribute vec3 color; uniform float uPx; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = clamp(size * uPx * (40. / -mv.z), 2., 48.); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec3 vC; void main(){ vec2 d = gl_PointCoord - .5; float r = length(d); float a = smoothstep(.5, .0, r); a = a * a; gl_FragColor = vec4(vC * a, a); }' });
  const cloud = new THREE.Points(g, mat); cloud.frustumCulled = false; cloud.renderOrder = 3; scene.add(cloud);
  // 書と言葉をつなぐ細い線
  const lg = new THREE.BufferGeometry(), lpos = new Float32Array(24 * 6); lg.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
  const lm = new THREE.LineBasicMaterial({ color: 0xd9c49a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const lines = new THREE.LineSegments(lg, lm); lines.frustumCulled = false; scene.add(lines); let lineT = 0;

  // 近くの点には、その言葉を小さく浮かべる（点＝言葉と分かるように）。触れた点の言葉は大きく
  const mkLabel = () => { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 96; const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false, opacity: 0 })); s.renderOrder = 6; s.center.set(0, -.3); s.userData = { cv, tx, q: null }; scene.add(s); return s; };
  const labels = [mkLabel(), mkLabel(), mkLabel(), mkLabel()];
  const draw = (s, q, big) => { const { cv, tx } = s.userData, x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); x.font = `${big ? 600 : 500} 44px "Shippori Mincho","Hiragino Mincho ProN",serif`; x.textBaseline = 'middle';
    x.shadowColor = 'rgba(0,0,0,.95)'; x.shadowBlur = 12; x.fillStyle = q.onWork ? '#f3dcae' : '#e4eef4'; x.fillText(q.it.t, 8, 50); tx.needsUpdate = true; s.userData.q = q; s.userData.big = big; };
  let lblT = 0, focusQ = null, focusT = 0;
  const base = new THREE.Color(0xcfe3ee), warm = new THREE.Color(0xf3d9a6), c = new THREE.Color(), v = new THREE.Vector3();
  function pick(x, y) {
    const lim = mobile ? 44 : 30; let best = null, bd = lim;
    for (const q of pts) { v.copy(q.p).project(cam); if (v.z > 1 || v.z < -1) continue; const dist = q.p.distanceTo(cam.position); if (dist > 9) continue;
      const sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight, d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = q; } }
    if (!best) return null;
    best.glow = 1; focusQ = best; focusT = 6; draw(labels[0], best, true);
    if (soundOk()) syn.play({ n: best.it.n, t: best.it.t, tag: best.it.tag });
    say(best.onWork ? `${best.it.t}（書になった言葉）` : `${best.it.t}（まだ書になっていない言葉）`);
    return { kind: 'word', q: best };
  }
  function touchWork(it) {
    const k = kanji(titleOf(it) || ''); if (!k.size) return;
    const rel = pts.map(q => ({ q, n: [...q.k].filter(ch => k.has(ch)).length })).filter(o => o.n > 0).sort((a, b) => b.n - a.n).slice(0, 12);
    const from = new THREE.Vector3(it.x, it.form === 'floor' ? .3 : (it.sho ? it.sho.group.position.y : 2.2), it.z);
    lpos.fill(0); rel.forEach((o, i) => { o.q.glow = Math.max(o.q.glow, .8); lpos.set([from.x, from.y, from.z, o.q.p.x, o.q.p.y, o.q.p.z], i * 6); });
    lg.attributes.position.needsUpdate = true; lg.setDrawRange(0, rel.length * 2); lineT = rel.length ? 4.5 : 0;
  }
  function tick(dt, t) {
    pts.forEach((q, i) => {
      q.glow = Math.max(0, q.glow - dt * .35);
      pos.set([q.p.x, q.p.y + Math.sin(t * .4 + q.ph) * .05, q.p.z], i * 3);
      c.copy(q.onWork ? warm : base).multiplyScalar(.7 + q.glow * 1.2); col.set([c.r, c.g, c.b], i * 3);
      sz[i] = (q.onWork ? 2.4 : 1.4) * (1 + q.glow * 1.4) * (mobile ? 1.3 : 1);
    });
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.attributes.size.needsUpdate = true;
    lblT -= dt; focusT = Math.max(0, focusT - dt); if (!focusT) focusQ = null;
    if (lblT <= 0) { lblT = .5; const f = new THREE.Vector3(); cam.getWorldDirection(f);
      const near = pts.filter(q => q !== focusQ).map(q => { v.copy(q.p).sub(cam.position); const d = v.length(); return { q, d, dot: v.dot(f) / d }; }).filter(o => o.d < 3.2 && o.dot > .85).sort((a, b) => a.d - b.d).slice(0, focusQ ? 1 : 2);
      const pool = focusQ ? labels.slice(1) : labels; pool.forEach((s, i) => { const o = near[i]; if (!o) { s.userData.q = null; return; } if (s.userData.q !== o.q || s.userData.big) draw(s, o.q, false); }); }
    labels.forEach((s, i) => { const q = s.userData.q; const big = i === 0 && focusQ; if (!q || (i === 0 && !focusQ && s.userData.big)) { s.material.opacity = Math.max(0, s.material.opacity - dt * 2); s.visible = s.material.opacity > .01; if (!s.visible) s.userData.big = false; return; }
      const d = q.p.distanceTo(cam.position), w = (big ? .05 : .032) * d * (mobile ? .9 : 1); s.scale.set(w * 10.7, w, 1); s.position.copy(q.p).add(new THREE.Vector3(0, .02, 0)); v.copy(q.p).project(cam); s.center.set(v.x > 0 ? 1 : 0, -.3);
      s.material.opacity = Math.min(big ? 1 : .75, s.material.opacity + dt * 2); s.visible = true; });
    lineT = Math.max(0, lineT - dt); lm.opacity = Math.min(1, lineT / 1.5) * .3; lines.visible = lm.opacity > .01;
  }
  return { pick, touchWork, tick, count: pts.length };
}
