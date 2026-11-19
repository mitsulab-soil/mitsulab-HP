/* © mitsulab. 生きものの並び（2026-11-20）
   本人「切り替える時に選択中の生き物だけでなく、前後の生き物も見れるように」＝選んでいる体の 3D をまん中に、前後の体の 3D を左右に並べ、回して選ぶ。
   森とは別の小さな描き手（犬のぼかしや夜の見え方が、並びにはかからないように）。回っているときと、まん中の体が動くあいだだけ描く。 */
import * as T from 'three';
import { makeBody } from './bodies.js?v=20261120a';

export function makeRing({ host, items, onPick, reduced = false }) {
  const n = items.length, ids = items.map(i => i.id);
  const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true'); host.appendChild(cv);
  const row = document.createElement('div'); row.className = 'rg-row'; host.appendChild(row);
  const mk = (cls, label, txt) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.setAttribute('aria-label', label); b.textContent = txt; host.appendChild(b); return b; };
  const prev = mk('rg-arrow rg-prev', '前の体へ', '‹'), next = mk('rg-arrow rg-next', '次の体へ', '›');
  const btns = items.map(it => { const b = document.createElement('button'); b.type = 'button'; b.className = 'rg-it'; b.dataset.id = it.id; b.innerHTML = `<span>${it.name}</span>`; b.setAttribute('aria-label', `${it.name}の身体と受けとり方`); row.appendChild(b); return b; });
  let renderer = null, scene, cam, W = 0, H = 0, wide = false;
  const slots = new Array(n).fill(null);   // {g, base}
  let cur = 0, pos = 0, target = 0, raf = 0, last = 0, spin = 0, dragX = null, dragK = 0, moved = false, alive = true;
  const wrap = k => { k = ((k % n) + n) % n; return k > n / 2 ? k - n : k; };
  const FR = () => wide ? .2 : .3;   // となりの体までの間（幅に対する割合）
  function build(i) {
    if (slots[i] || !renderer) return;
    const g = new T.Group(), b = makeBody(ids[i]); try { b.userData.animate(ids[i] === 'koumori' ? .04 : .13, ids[i] === 'koumori'); } catch (e) {}
    const box = new T.Box3().setFromObject(b), c = box.getCenter(new T.Vector3()), s = box.getSize(new T.Vector3());
    b.position.sub(c); const k = 1 / Math.max(s.x, s.y * .86, s.z, .001); const inner = new T.Group(); inner.add(b); inner.scale.setScalar(k); g.add(inner);
    g.userData.body = b; g.userData.tall = s.y > Math.max(s.x, s.z) * 1.2; scene.add(g); slots[i] = g;
  }
  function init() {
    if (renderer) return true;
    try { renderer = new T.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, powerPreference: 'low-power' }); } catch (e) { renderer = null; return false; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    scene = new T.Scene(); scene.add(new T.HemisphereLight(0xeef6ff, 0x4a4f44, 2.1)); const d = new T.DirectionalLight(0xfff0dc, 2.8); d.position.set(-2, 4, 3); scene.add(d);
    const r = new T.DirectionalLight(0x9bdcf0, .9); r.position.set(3, 1, -3); scene.add(r);
    cam = new T.PerspectiveCamera(20, 1, .1, 30); size(); return true;
  }
  function size() {
    W = host.clientWidth; H = host.clientHeight; wide = W >= 520; if (!renderer || !W || !H) return;
    renderer.setSize(W, H, false); cam.aspect = W / H; const vh = 1.5, dist = vh / (2 * Math.tan(cam.fov * Math.PI / 360)); cam.position.set(0, .28, dist); cam.lookAt(0, .02, 0); cam.updateProjectionMatrix(); cam.userData.vw = vh * cam.aspect;
    place();
  }
  function place() {
    const fr = FR(), reach = wide ? 2.6 : 1.7;
    for (let i = 0; i < n; i++) {
      const k = wrap(i - pos), a = Math.abs(k), b = btns[i], on = a < reach;
      b.hidden = !on; b.tabIndex = on ? 0 : -1;
      if (on) { const sc = a < 1 ? 1 - a * .4 : Math.max(.36, .6 - (a - 1) * .2); b.style.transform = `translateX(${(k * fr * W).toFixed(1)}px)`; b.style.opacity = (a < .5 ? 1 : Math.max(.25, .82 - (a - .5) * .34)).toFixed(2); b.classList.toggle('on', i === cur); b.style.setProperty('--s', sc.toFixed(3)); }
      const g = slots[i]; if (!g) continue; g.visible = on; if (!on) continue;
      const sc = a < 1 ? 1 - a * .36 : Math.max(.34, .64 - (a - 1) * .2);
      g.position.set(k * fr * cam.userData.vw, (g.userData.tall ? .1 : .1) - a * .02, -a * .5); g.scale.setScalar(sc * (g.userData.tall ? 1.02 : .92));
      g.rotation.set(0, i === cur && a < .5 ? spin : -.75 - k * .12, 0);
    }
  }
  function draw(now) {
    raf = 0; if (!alive || !renderer || document.hidden) return;
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    const d = wrap(target - pos); let moving = Math.abs(d) > .002 || dragX !== null;
    if (dragX === null) { pos = Math.abs(d) > .002 ? pos + d * (1 - Math.exp(-dt * 11)) : target; }
    if (!reduced) { spin += dt * .5; const g = slots[cur]; if (g) { try { g.userData.body.userData.animate(now / 1000, true); } catch (e) {} } }
    place(); renderer.render(scene, cam);
    if (moving || !reduced) raf = requestAnimationFrame(draw);
  }
  const kick = () => { if (!raf && renderer) { last = 0; raf = requestAnimationFrame(draw); } };
  function set(id, instant) { const i = ids.indexOf(id); if (i < 0) return; cur = i; target = i; if (instant) pos = i; for (const b of btns) b.setAttribute('aria-pressed', String(b.dataset.id === id)); if (renderer) { for (const k of [0, 1, -1, 2, -2]) build(((i + k) % n + n) % n); place(); kick(); } else { pos = i; place(); } }
  const step = s => onPick(ids[((cur + s) % n + n) % n]);
  prev.onclick = () => step(-1); next.onclick = () => step(1);
  btns.forEach((b, i) => b.addEventListener('click', e => { if (moved) { e.preventDefault(); return; } if (i !== cur) onPick(ids[i]); }));
  // なぞって回す
  host.addEventListener('pointerdown', e => { if (e.target.closest('.rg-arrow')) return; dragX = e.clientX; dragK = pos; moved = false; });
  addEventListener('pointermove', e => { if (dragX === null) return; const dx = e.clientX - dragX; if (Math.abs(dx) > 8) moved = true; if (moved) { pos = dragK - dx / (FR() * W); kick(); } });
  const up = () => { if (dragX === null) return; dragX = null; if (moved) { const i = ((Math.round(pos) % n) + n) % n; target = cur; if (i !== cur) onPick(ids[i]); kick(); setTimeout(() => { moved = false; }, 60); } };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  host.addEventListener('wheel', e => { e.preventDefault(); if (Math.abs(e.deltaY) + Math.abs(e.deltaX) > 8 && !host.dataset.wl) { host.dataset.wl = 1; setTimeout(() => delete host.dataset.wl, 320); step((e.deltaY || e.deltaX) > 0 ? 1 : -1); } }, { passive: false });
  new ResizeObserver(() => { size(); kick(); }).observe(host);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  place();
  return {
    set,
    // 森が出てから、裏で少しずつ体を組む（起動を重くしない）
    async start() { if (!init()) return false; for (const k of [0, 1, -1, 2, -2]) { build(((cur + k) % n + n) % n); await new Promise(r => setTimeout(r, 0)); } place(); kick(); for (let i = 0; i < n; i++) { if (!slots[i]) { await new Promise(r => setTimeout(r, 120)); build(i); } } return true; },
    setReduced(v) { reduced = v; kick(); },
    get ready() { return !!renderer; },
  };
}
