/* qgui.js — 道具の共通の小さな操作（2026-11-26 本人「文字を最小に・≡ で開く・説明は on/off・人間工学に基づく自然な操作」「AR でカメラ・マイク」）
   読み方：qgui.css のあとで <script src="kit/qgui.js"></script>。各道具の kit/ に写して使う。
   - qg.pref(k[,v])：選んだ状態を端末の中（localStorage）に。読めない・書けない端末でもこわれない。
   - qg.drawer(el, btn)：≡ で開く引き出し（スマホ＝下から・PC＝右の端から）。外を押す・Esc・下へなぞる で閉じる。
   - qg.txt(sw)：説明と字幕の on/off。off（既定）のとき body に .qg-txt-off（各道具の CSS で何を隠すか決める）。
   - qg.cam()／qg.mic()：押してから許可を求める。録画・録音・保存・送信はしない。失敗したら null。qg.stop(stream)。 */
(function () {
  var P = 'qgui.v1.';
  function pref(k, v) { try { if (v === undefined) return localStorage.getItem(P + k); localStorage.setItem(P + k, String(v)); } catch (e) { return null; } return v; }
  function drawer(el, btn) {
    var open = false, y0 = null;
    function set(o) { open = o; el.classList.toggle('on', o); el.setAttribute('aria-hidden', String(!o)); btn.setAttribute('aria-expanded', String(o)); btn.classList.toggle('on', o);
      if (o) { var f = el.querySelector('button,input,summary,a'); f && f.focus({ preventScroll: true }); } else if (el.contains(document.activeElement)) btn.focus({ preventScroll: true });
      try { navigator.vibrate && navigator.vibrate(8); } catch (e) {} }
    btn.addEventListener('click', function () { set(!open); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) set(false); });
    addEventListener('pointerdown', function (e) { if (open && !el.contains(e.target) && !btn.contains(e.target)) set(false); }, true);
    el.addEventListener('touchstart', function (e) { y0 = el.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
    el.addEventListener('touchmove', function (e) { if (y0 != null && e.touches[0].clientY - y0 > 60) { y0 = null; set(false); } }, { passive: true });
    el.setAttribute('aria-hidden', 'true'); btn.setAttribute('aria-expanded', 'false');
    return { set: set, get open() { return open; } };
  }
  function txt(sw) {
    var on = pref('txt') === '1';
    function apply() { document.body.classList.toggle('qg-txt-off', !on); if (sw) { sw.setAttribute('aria-checked', String(on)); sw.classList.toggle('on', on); } }
    if (sw) sw.addEventListener('click', function () { on = !on; pref('txt', on ? '1' : '0'); apply(); });
    apply(); return { get on() { return on; } };
  }
  function gum(c) { if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.resolve(null); return navigator.mediaDevices.getUserMedia(c).catch(function (e) { console.info('qgui', e && e.name); return null; }); }
  function cam() { return gum({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }); }
  function mic() { return gum({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false }); }
  function stop(s) { if (s) s.getTracks().forEach(function (t) { t.stop(); }); }
  window.qg = { pref: pref, drawer: drawer, txt: txt, cam: cam, mic: mic, stop: stop };
})();
