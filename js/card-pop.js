/* © mitsulab. カードを押すと、くわしい内容を重ね窓で開く（2026-10-27）。動画は開いたときだけ読む。閉じる＝× ・外を押す・Esc。 */
(function () {
  const d = document.createElement('dialog'); d.id = 'mlpop'; d.setAttribute('aria-modal', 'true');
  d.innerHTML = '<div class="mp-in"><button type="button" class="mp-x" aria-label="閉じる">×</button><div class="mp-vid"></div><div class="mp-body"></div></div>';
  document.body.appendChild(d);
  const vid = d.querySelector('.mp-vid'), body = d.querySelector('.mp-body'), x = d.querySelector('.mp-x'); let back = null;
  const en = () => document.documentElement.dataset.lang === 'en' || document.documentElement.lang === 'en';
  function open(card) {
    back = card; const c = card.cloneNode(true); c.querySelectorAll('.pf-media,.si-more').forEach(n => n.remove());
    c.querySelectorAll('details').forEach(n => { n.open = true; const s = n.querySelector(':scope>summary'); if (s && !s.querySelector('.si-name')) s.remove(); });
    c.querySelectorAll('summary').forEach(s => { const div = document.createElement('div'); div.className = 'mp-sum'; div.innerHTML = s.innerHTML; s.replaceWith(div); });
    c.querySelectorAll('details').forEach(n => { const div = document.createElement('div'); div.className = 'mp-det'; div.innerHTML = n.innerHTML; n.replaceWith(div); });
    c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    body.innerHTML = ''; body.appendChild(c);
    vid.innerHTML = ''; const img = card.querySelector('.pf-media img'); const p = img && img.getAttribute('src');
    if (p && /_poster\.webp/.test(p)) { const v = document.createElement('video'); v.src = p.replace(/_poster\.webp.*/, '-preview.mp4'); v.poster = p; v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = !matchMedia('(prefers-reduced-motion: reduce)').matches; v.controls = true; v.preload = 'metadata'; v.onerror = () => { vid.innerHTML = ''; }; vid.appendChild(v); }
    else if (p) { const i = document.createElement('img'); i.src = p; i.alt = ''; vid.appendChild(i); }
    x.setAttribute('aria-label', en() ? 'Close' : '閉じる');
    const h = c.querySelector('.pf-name,.si-name'); if (h) { h.id = 'mp-h'; d.setAttribute('aria-labelledby', 'mp-h'); }
    d.showModal(); document.documentElement.classList.add('mp-open'); x.focus();
  }
  function close() { const v = vid.querySelector('video'); if (v) { v.pause(); v.removeAttribute('src'); v.load(); } if (d.open) d.close(); }
  d.addEventListener('close', () => { document.documentElement.classList.remove('mp-open'); vid.innerHTML = ''; if (back) back.focus({ preventScroll: true }); });
  x.addEventListener('click', close); d.addEventListener('click', e => { if (e.target === d) close(); });
  document.addEventListener('click', e => { const c = e.target.closest('.pf-card,.si-card'); if (!c || c.closest('.ws-grid') || d.contains(c) || e.target.closest('a,button:not(summary *)')) return; e.preventDefault(); open(c); }, true);
  document.querySelectorAll('.pf-card,.si-card').forEach(c => { if (c.closest('.ws-grid')) return; if (!c.hasAttribute('tabindex')) c.tabIndex = 0; c.setAttribute('role', 'button'); c.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === c) { e.preventDefault(); open(c); } }); });
})();
