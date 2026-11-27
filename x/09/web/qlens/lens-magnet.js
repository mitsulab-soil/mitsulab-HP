/* lens-magnet.js ── Qualia/magnet の地磁気のレンズ：見ている向きに、地磁気の線を淡く重ねる。
   向き＝3D の景色の北（-z が北。omiya・kawagoe とも地図の座標から）。値（さいたま付近・2020 年の模型の概数）：偏角 西 約 7.5°・伏角 約 49.5°（国土地理院 磁気図 https://www.gsi.go.jp/buturisokuchi/menu03_magnetic_chart.html）。線の数と間は模式。 */
(function () {
  var DEC = -7.5 * Math.PI / 180, INC = 49.5 * Math.PI / 180;
  QLens.define({ id: 'magnet-field', make: function () {
    var cvs, x, cam, raf = 0, t = 0;
    function draw() {
      raf = requestAnimationFrame(draw);
      var W = Math.round(innerWidth * Math.min(devicePixelRatio, 2)), H = Math.round(innerHeight * Math.min(devicePixelRatio, 2)); if (cvs.width !== W) cvs.width = W; if (cvs.height !== H) cvs.height = H; var w = W, h = H;
      x.clearRect(0, 0, w, h); if (!cam || !cam.matrixWorld) return;
      var e = cam.matrixWorld.elements, fx = -e[8], fz = -e[10];
      var yaw = Math.atan2(fx, -fz);                 // 北から時計回りの見ている向き
      var rel = DEC - yaw;                           // 磁北の向き（見ている向きからの角）
      var vis = Math.cos(rel);                       // 磁北・磁南を向くほど線が立って見える
      var lean = Math.sin(rel), dip = Math.tan(INC) * .35;
      x.lineWidth = 2.2 * devicePixelRatio; 
      x.setLineDash([10 * devicePixelRatio, 7 * devicePixelRatio]);
      for (var i = -3; i <= 3; i++) {
        var px = w / 2 + i * w / 6;
        x.strokeStyle = 'rgba(176,150,255,' + (.5 + .2 * Math.abs(lean)) + ')';
        x.beginPath(); x.moveTo(px - lean * h * .5, -10); x.lineTo(px + lean * h * .5 + (vis * dip * h), h + 10); x.stroke();
      }
      x.setLineDash([]); x.font = (14 * devicePixelRatio) + 'px "Shippori Mincho",serif'; x.textAlign = 'center'; x.lineWidth = 3 * devicePixelRatio; x.strokeStyle = 'rgba(6,12,18,.8)'; x.fillStyle = 'rgba(214,200,255,.95)';
      var nx = w / 2 + Math.sin(rel) * w * .42; if (Math.cos(rel) > 0) { x.strokeText('磁北 ↑', nx, h * .14); x.fillText('磁北 ↑', nx, h * .14); }
    }
    return {
      apply: function (c) {
        cam = c.camera; cvs = document.createElement('canvas'); cvs.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:5';
        document.body.appendChild(cvs); x = cvs.getContext('2d'); draw();
        c.say && c.say('地磁気：北から約 7.5° 西・地面へ約 49° の傾き（線は模式）');
      },
      dispose: function () { cancelAnimationFrame(raf); if (cvs) cvs.remove(); }
    };
  } });
})();
