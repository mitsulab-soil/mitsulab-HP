/* qsite-min.js（2026-11-26）説明の文字の on/off。「説」ボタン 1 つ（44px・右下＝親指の届く側）。状態は端末の中（localStorage）だけ。 */
(function () {
  var K = 'qsite.explain', on = false;
  try { on = localStorage.getItem(K) === '1'; } catch (e) {}
  var h = document.documentElement;
  function set(v) { on = v; h.classList.toggle('qx-off', !on); b.setAttribute('aria-pressed', String(on)); try { localStorage.setItem(K, on ? '1' : '0'); } catch (e) {} }
  var b = document.createElement('button'); b.type = 'button'; b.id = 'qxBtn'; b.textContent = '説';
  b.setAttribute('aria-label', '説明の文字を出す／隠す'); b.title = '説明 on/off';
  b.addEventListener('click', function () { set(!on); });
  if (!h.classList.contains('embed')) document.body.appendChild(b);
  set(on);
})();
