/* lens-forest.js ── はじまりの森（sight）の中で「生き物の目」を選ぶレンズ（2026-11-27）
   sight そのものの切りかえ（window.__um.setLens）を呼ぶだけ。森の外の道具では何もしない。 */
(function () {
  QLens.define({ id: 'forest-hachi', make: function () {
    return {
      apply: function () { var U = window.__um; if (U && U.setLens) U.setLens('hachi'); },
      dispose: function () { var U = window.__um; if (U && U.setLens && U.lens === 'hachi') U.setLens('hito', true); }
    };
  } });
})();
