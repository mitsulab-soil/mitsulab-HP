// v9 2026-11-20：PC も窓を地面に寝かせず、画面の上の正面の板に（寝かせた窓は暗く粗く見え、字幕を画面の中ほどへ押し上げていた）。板は PC では少し大きく。字幕は動かさない。
// v8 2026-11-20：水と草は足もとのまわり 8 m まで（前は 30 m で、見わたすかぎり水に見えた）・川の幅を地図の線に近づける・水面のきらめきを弱く・窓は広めに写す（写真の粗さが目立たない）。
// v7 2026-11-20 本人：スマホは窓を地面に寝かせず画面の上の正面の板に／見ているあいだは町の語りを止め、閉じたら再開。
// 時間の層（足もと）── 2026-11-19 本人「時間の層を音・振動などの体験に落とし込む」
// 歩いて昔の川の近く（国土地理院「明治期の低湿地データ」の川の線）に来ると、
//  ① 足もとの地面のうち、明治の地図で川と低い湿った土地だったところだけが、水面・岸の土・草の写実の質感へなめらかに移りかわる（形は地図、質感は模式）。
//  ② 足もとの前に小さな窓がひらき、空中写真（上から見た形）で、いま立っているまわりの昔の姿が見える。立ち止まると年代が進む。
//  ③ 足もとから水の音が立ち（Android は小さく振動）、碧が年代と出典を短く言う。離れると今の地面へ戻り、「顔を上げて、今の地面を見てみて」と問う。
// 写真＝国土地理院 空中写真（1936 年頃 ort_riku10・1945〜50 年 ort_USA10・1961〜69 年 ort_old10）を mitsulab が位置合わせ・加工。
// 質感＝Poly Haven grass_ground・farm_soil（CC0）。
// 使い方：<script src="kit/jidai.js" data-box="x0,z0,幅,奥行" data-imgs="写真|一言|年;…" data-hi="写真,x0,z0,幅,奥行" data-snd="…" data-tex="草の色,草の法線,土の色,土の法線" defer></script>
// 位置は window.__qw.camera から読むだけ。記録はしない・どこにも送らない。歩きはじめてから読みこむ（起動を遅らせない）。
(function () {
  var me = document.currentScript; if (!me) return;
  var d = me.dataset, SND = d.snd, R_IN = 26, R_OUT = 44, HOLD = 7;
  var BOX = (d.box || "").split(",").map(Number), HI = (d.hi || "").split(","), HF = (HI[0] || "").split("|"), TX = (d.tex || "").split(",");
  var ERA = (d.imgs || "").split(";").map(function (x) { var a = x.split("|"); return { f: a[0], t: a[1], src: a[2] }; }).slice(0, 3);
  var GSI = "国土地理院 空中写真（", KAKO = "）を mitsulab が位置合わせ・加工";
  var L_OUT = [{ t: "顔を上げて、今の地面を見てみて。", src: "" }];
  function go() {
    var q = window.__qw, T = q.THREE, terr = q.terrain, cam = q.camera, mj = q.meiji;
    var mtex = mj && mj.mesh.material.uniforms.tex.value; if (!mtex || !mtex.image) { setTimeout(go, 1500); return; }
    var im = mtex.image, cv = document.createElement("canvas"); cv.width = im.width; cv.height = im.height;
    var cx = cv.getContext("2d", { willReadFrequently: true }); cx.drawImage(im, 0, 0);
    var px = cx.getImageData(0, 0, cv.width, cv.height).data;
    var kind = "r";   // いちばん近いのが川（r）か低い湿った土地（g）か
    function riverNear(x, z, r) {   // 明治の地図の川（R）・低い湿った土地（G）までの距離
      var best = 1e9, s = 6;
      for (var dz = -r; dz <= r; dz += s) for (var dx = -r; dx <= r; dx += s) {
        var dd = Math.hypot(dx, dz); if (dd > r || dd >= best) continue;
        var u = (x + dx - BOX[0]) / BOX[2], v = (z + dz - BOX[1]) / BOX[3];
        if (u < 0 || u > 1 || v < 0 || v > 1) continue;
        var j = ((Math.floor(v * cv.height) * cv.width) + Math.floor(u * cv.width)) * 4; if (px[j] > 140) { best = dd; kind = "r"; } else if (px[j + 1] > 140) { best = dd; kind = "g"; }
      }
      return best;
    }
    function tx0() { return { value: null }; }
    var U = { mk: { value: mtex }, gc: tx0(), gn: tx0(), sc: tx0(), sn: tx0(), o0: tx0(), o1: tx0(), o2: tx0(), h0: tx0(), h1: tx0(), h2: tx0(),
      box: { value: new T.Vector4(BOX[0], BOX[1], BOX[2], BOX[3]) }, hiR: { value: new T.Vector4(+HI[1], +HI[2], +HI[3], +HI[4]) },
      k: { value: 0 }, e: { value: 0 }, t: { value: 0 }, eye: { value: new T.Vector3() }, fw: { value: new T.Vector2(0, -1) }, wx: { value: innerWidth > 700 ? 1.0 : .66 }, wd: { value: innerWidth > 700 ? 3.3 : 3.7 }, wh: { value: innerWidth > 700 ? .95 : .52 }, wz: { value: innerWidth > 700 ? 30 : 52 }, R: { value: 8 }, aoi: { value: new T.Vector4(0, 0, 0, 0) } };
    var FS = [
      "uniform sampler2D mk, gc, gn, sc, sn, o0, o1, o2, h0, h1, h2; uniform vec4 box, hiR; uniform float k, e, t, R, wx, wd, wh, wz; uniform vec3 eye; uniform vec2 fw; varying vec3 vW;",
      "float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); } float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y); }",
      "vec2 wuv(vec2 p){ return vec2((p.x-box.x)/box.z, 1.-(p.y-box.y)/box.w); }",
      "float lum(vec3 c){ return dot(c, vec3(.3,.59,.11)); }",
      "vec3 photo(vec2 p){ vec2 u = wuv(p); vec2 hu = vec2((p.x-hiR.x)/hiR.z, 1.-(p.y-hiR.y)/hiR.w); bool inH = hu.x>0. && hu.x<1. && hu.y>0. && hu.y<1.;",   // 川と低地のまわりは細かい写真
      "  float g0 = lum(inH ? texture2D(h0,hu).rgb : texture2D(o0,u).rgb), g1 = lum(inH ? texture2D(h1,hu).rgb : texture2D(o1,u).rgb), g2 = lum(inH ? texture2D(h2,hu).rgb : texture2D(o2,u).rgb);",
      "  float g = mix(mix(g0, g1, clamp(e,0.,1.)), g2, clamp(e-1.,0.,1.)); return vec3(g*1.03, g, g*.93); }",
      "vec3 lit(vec3 nt, float ao){ vec3 nn = normalize(vec3(nt.x, nt.z*.6+1.2, -nt.y)); return vec3(clamp(.55 + .55*dot(nn, normalize(vec3(.35,.85,.25))), .3, 1.2)) * ao; }",
      "void main(){ if (k < .003) discard; vec2 p = vW.xz; float d = distance(p, eye.xz);",
      // ② 足もとの窓（上から見た昔の写真。前へ 3.3〜3.6 m（碧より手前。広い画面では右へ 1 m ずらす）・幅 1.9 m・まわり約 50 m を写す。窓の上＝進む向き。細い線＝明治の地図の川の縁）
      "  vec2 rt = vec2(-fw.y, fw.x); vec2 c = eye.xz + fw*wd + rt*wx; vec2 l = vec2(dot(p-c, rt), dot(p-c, fw)); vec2 al = abs(l) - vec2(wh);",
      "  float box2 = length(max(al + .08, 0.)) - .08; if (box2 < 0.) { vec2 P = eye.xz + (l.x*rt + l.y*fw) * wz; vec3 ph = photo(P); float rv = texture2D(mk, wuv(P)).r; float edge = smoothstep(.06, .0, abs(rv - .55)) * .55;",
      "    float frame = smoothstep(-.035, -.02, box2); float dot0 = 1. - smoothstep(.025, .04, length(l));",   // 自分の位置の小さな点
      "    vec3 col = mix(ph, vec3(.5,.89,.97), max(max(frame*.7, dot0*.9), edge)); gl_FragColor = vec4(col, .94*k*(1.-smoothstep(-.005,0.,box2))); return; }",
      // ① 明治の地図の川と低地だけ、写実の質感に（形は地図・質感は模式）
      "  float near = 1. - smoothstep(R*.3, R, d + (n(p*.11)-.5)*9.); float a0 = near*near*k; if (a0 < .004) discard;",
      "  vec3 m = texture2D(mk, wuv(p)).rgb; float wtr = smoothstep(.62,.95,m.r); float low = smoothstep(.15,.85,m.g)*(1.-wtr); float bank = smoothstep(.0,.35,m.r)*(1.-wtr);",
      "  if (wtr + low + bank < .01) discard;",
      "  vec2 tu = p/2.2; vec3 grass = texture2D(gc, tu).rgb * lit(texture2D(gn, tu).xyz*2.-1., 1.); vec3 soil = texture2D(sc, p/1.8).rgb * lit(texture2D(sn, p/1.8).xyz*2.-1., .95);",
      "  soil *= .78; vec3 landc = mix(grass, soil, smoothstep(.35,.75, n(p*.35))*.55);",   // 草の中に湿った土の斑
      "  vec3 V = normalize(eye - vW); float fr = pow(1. - clamp(V.y,0.,1.), 4.);",
      "  vec2 fl = vec2(n(p*.07), n(p*.07+7.)) - .5; float rip = n(p*vec2(1.3,.5) + fl*3. - vec2(0.,t*1.1))*.6 + n(p*3.2 - t*.8)*.4;",
      "  float r2 = n(p*vec2(7.,2.6) + fl*4. - vec2(0.,t*1.6)); vec3 deep = vec3(.05,.12,.11) + soil*.08; vec3 sky = vec3(.66,.77,.86); float gl = pow(n(p*9. + vec2(t*1.1, -t*.6)), 10.); vec3 water = mix(deep, sky, clamp(.08 + fr*.9 + (rip-.5)*.22 + (r2-.5)*.14, 0., 1.)) + pow(rip*.6 + r2*.4, 7.)*.3 + gl*.3; water = mix(water, soil*.5, (1.-fr)*.25*(1.-smoothstep(.5,.95,texture2D(mk, wuv(p)).r)));",
      "  vec3 col = water*wtr + soil*bank*.85 + landc*low; float a = (wtr*.93 + bank*.9 + low*.97) * smoothstep(0., .25, a0) * min(1., a0*3.);",
      "  gl_FragColor = vec4(col / max(wtr + bank + low, 1e-3), a); }"
    ].join("\n");
    var mat = new T.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6,
      vertexShader: "uniform vec4 aoi; varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); w.y += .45; if (aoi.w > .5) w.y = mix(min(w.y, aoi.y - .03), w.y, smoothstep(1.3, 3.2, distance(w.xz, aoi.xz))); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: FS });
    var TL = new T.TextureLoader();
    function L(url, key, rep, srgb) { TL.load(url, function (tx) { if (rep) { tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.anisotropy = 8; } if (srgb) tx.colorSpace = T.SRGBColorSpace; U[key].value = tx; }); }
    L(TX[0], "gc", 1, 1); L(TX[1], "gn", 1, 0); L(TX[2], "sc", 1, 1); L(TX[3], "sn", 1, 0);
    ERA.forEach(function (o, i) { L(o.f, "o" + i, 0, 1); L(HF[i] || HF[0], "h" + i, 0, 1); });
    var mesh = new T.Mesh(terr.geometry, mat); mesh.matrixAutoUpdate = false; mesh.matrix.copy(terr.matrix); mesh.renderOrder = 8; mesh.frustumCulled = false;
    (terr.parent || q.scene).add(mesh);
    // v7（11-20 本人）：スマホ（幅 700px 以下）では窓を地面に寝かせず、画面の上のほうに正面を向いた小さな板で出す（375px で切れない）。
    // 板は画面に固定（視点を回しても揺れない）。板の上＝進む向き。写真・川の縁の線・自分の位置の点は足もとの窓と同じ。
    function mob() { return true; }   // v9：どの幅でも板
    var WIDE = innerWidth > 700, BW = WIDE ? 348 : 232, BH = WIDE ? 156 : 104, BX = WIDE ? 24 : 14, BY = WIDE ? 124 : 116;   // 板の幅・高さ・左・上（px。上は年代の札の下）
    U.br = { value: new T.Vector4(0, 0, .5, .2) }; U.bz = { value: 56 };   // bz＝板の縦の半分が写す距離（m）
    var bmat = new T.ShaderMaterial({ uniforms: U, transparent: true, depthTest: false, depthWrite: false, fog: false,
      vertexShader: "uniform vec4 br; varying vec2 vL; void main(){ vL = position.xy; gl_Position = vec4(br.xy + position.xy * br.zw, 0., 1.); }",
      fragmentShader: [FS.split("\n").slice(0, 7).join("\n").replace("varying vec3 vW;", "varying vec2 vL; uniform vec4 br; uniform float bz;"),
        "void main(){ if (k < .003) discard; vec2 l = vL * vec2(" + (BW / BH).toFixed(4) + ", 1.); vec2 al = abs(l) - vec2(" + (BW / BH).toFixed(4) + ", 1.);",
        "  float box2 = length(max(al + .1, 0.)) - .1; if (box2 > 0.) discard; vec2 rt = vec2(-fw.y, fw.x); vec2 P = eye.xz + (l.x*rt + l.y*fw) * bz; vec3 ph = photo(P);",
        "  float rv = texture2D(mk, wuv(P)).r; float edge = smoothstep(.06, .0, abs(rv - .55)) * .55; float frame = smoothstep(-.05, -.025, box2); float dot0 = 1. - smoothstep(.05, .075, length(l));",
        "  vec3 col = mix(ph, vec3(.5,.89,.97), max(max(frame*.7, dot0*.9), edge)); gl_FragColor = vec4(col, .96*k); }"].join("\n") });
    var board = new T.Mesh(new T.PlaneGeometry(2, 2), bmat); board.frustumCulled = false; board.renderOrder = 30; board.visible = false; (q.scene || terr.parent).add(board);
    var st = document.createElement("style");   // 窓が出ているあいだ、碧の字幕を窓より上へ（窓に重ねない）
    st.textContent = "#caption{transition:translate .6s ease}body.jdB .arTag{top:40%!important}";   // スマホの板が出ているあいだ、場所の名前の札は板の下へ
    document.head.appendChild(st); var capY = 0, _v = new T.Vector3();
    function capFit() {   // 窓の上の端を画面に写し、字幕の下の端がそれより下なら、その分だけ字幕を上げる
      var el = document.getElementById("caption"); if (!el) return; var want = 0;
      if (k > .3 && !el.hidden && !mob()) { var top = 1e9, e0 = U.eye.value, f = U.fw.value, r = [-f.y, f.x];
        var hh = U.wh.value; [[-hh, hh], [hh, hh], [-hh, -hh], [hh, -hh]].forEach(function (a) { _v.set(e0.x + f.x * (U.wd.value + a[1]) + r[0] * (a[0] + U.wx.value), e0.y - 1.1, e0.z + f.y * (U.wd.value + a[1]) + r[1] * (a[0] + U.wx.value)).project(cam);
          if (_v.z < 1) top = Math.min(top, (1 - _v.y) / 2 * innerHeight); });
        var b = el.getBoundingClientRect().bottom - capY; if (top < 1e8 && b > top - 34) want = Math.max(-innerHeight * .45, top - 34 - b); }
      if (Math.abs(want - capY) > 2) { capY = want; el.style.translate = capY ? "0 " + Math.round(capY) + "px" : ""; } }
    var tag = document.createElement("div"); tag.id = "qJidaiTag"; tag.setAttribute("aria-hidden", "true");   // 窓の上の端に、年代と出典をいつも
    tag.style.cssText = "position:fixed;left:0;top:0;z-index:20;pointer-events:none;white-space:nowrap;opacity:0;transition:opacity .5s;padding:3px 8px;border-radius:2px;background:rgba(6,12,18,.72);color:#eaf3f6;font:500 12px/1.5 'Shippori Mincho B1','Hiragino Mincho ProN',serif;letter-spacing:.04em";
    tag.innerHTML = "<b style='font-weight:500;color:#9be0f0'></b><span style='margin-left:8px;font:400 10px/1.5 \"Hiragino Sans\",sans-serif;color:rgba(225,236,241,.78)'>国土地理院 空中写真を加工</span><div style='font:400 10px/1.6 \"Hiragino Sans\",sans-serif;color:rgba(225,236,241,.86)'>水と草＝明治の地図の模式・線＝川の縁・点＝現在地</div>";   // v8：模式の断りと凡例をいつも画面に
    document.body.appendChild(tag); var tagE = -1, _t = new T.Vector3();
    function tagFit() { if (mob()) { var onM = k > .5 && q.mode === "walk"; tag.style.opacity = onM ? 1 : 0; if (!onM) return; var eM = Math.round(U.e.value); if (eM !== tagE) { tagE = eM; tag.firstChild.textContent = (ERA[eM] || ERA[0]).src; } tag.style.transform = "translate(" + BX + "px," + (BY - 43) + "px)"; return; }
      var e0 = U.eye.value, f = U.fw.value, hh = U.wh.value, wxv = U.wx.value;
      _t.set(e0.x + f.x * (U.wd.value + hh) - f.y * wxv, e0.y - 1.1, e0.z + f.y * (U.wd.value + hh) + f.x * wxv).project(cam);
      var on = k > .5 && _t.z < 1 && q.mode === "walk"; tag.style.opacity = on ? 1 : 0; if (!on) return;
      var ei = Math.round(U.e.value); if (ei !== tagE) { tagE = ei; tag.firstChild.textContent = (ERA[ei] || ERA[0]).src; }
      var x = (_t.x + 1) / 2 * innerWidth, y = (1 - _t.y) / 2 * innerHeight, w = tag.offsetWidth;
      tag.style.transform = "translate(" + Math.round(Math.max(8, Math.min(innerWidth - w - 8, x - w / 2))) + "px," + Math.round(y - 44) + "px)"; }
    var ac = null, gn = null, au = null;
    function sound() { if (ac || !SND) return; try { ac = new (window.AudioContext || window.webkitAudioContext)(); au = new Audio(SND); au.loop = true;
      var s = ac.createMediaElementSource(au), lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400; gn = ac.createGain(); gn.gain.value = 0; s.connect(lp).connect(gn).connect(ac.destination); } catch (e) { ac = null; } }
    var jdB = false, t00 = performance.now(), inside = 0, said = 0, k = 0, tgt = 0, held = 0, eTgt = 0, last = performance.now(), chk = 0, _f = new T.Vector3();
    function say(L) { if (q.speak) q.speak(L.map(function (o) { return { t: o.t, src: o.src, lay: "x.memory" }; })); }
    function sayEra(i) { var o = ERA[i]; var Ls = o.t.split("／").map(function (t) { if (mob()) t = t.replace("足もとの窓は", "上の小さな窓は"); return { t: kind === "g" ? t.replace("すぐそばが渋谷川。", "ここは田や湿地などの低い土地。") : t, src: GSI + o.src + KAKO }; });
      if (i === 0) Ls.push({ t: "水と草は、明治の地図の川と低地の模式。", src: "国土地理院「明治期の低湿地データ」" }); say(Ls); }
    function ready() { return ["gc", "gn", "sc", "sn", "o0", "o1", "o2", "h0", "h1", "h2"].every(function (k) { return U[k].value; }); }
    function loop() {
      var now = performance.now(), rdt = Math.min(.25, (now - last) / 1000), dt = Math.min(.05, rdt); last = now; U.t.value += dt;   // 判定と移りかわりは実際の時間で（コマが少ない端末でも遅れない）
      var walking = q.mode === "walk" && !document.hidden && ready() && ((q.AOI && q.AOI.greeted) || now - t00 > 25000);   // v7：碧の名乗りが済んでからひらく（名乗りを切らない）
      cam.getWorldPosition(U.eye.value);
      { var ar = q.AOI && q.AOI.root; if (ar && ar.visible && q.mode === "walk") { var ap = new T.Vector3(); ar.getWorldPosition(ap); U.aoi.value.set(ap.x, ap.y, ap.z, 1); } else U.aoi.value.w = 0; }   // v10 2026-11-22：碧のまわりは水面を碧の足もとの高さまで下げる（碧の裾が水に沈んで透けて見えた）
      var mb = mob(); U.wh.value = mb ? 0 : .95; U.wx.value = 1; U.wd.value = 3.3; U.wz.value = 44;   // 足もとの窓は広い画面だけ（スマホは大きさ 0＝描かない）
      board.visible = mb && k > .003 && q.mode === "walk"; if (board.visible !== jdB) { jdB = board.visible; document.body.classList.toggle("jdB", jdB); } if (board.visible) U.br.value.set((BX + BW / 2) / innerWidth * 2 - 1, 1 - (BY + BH / 2) / innerHeight * 2, BW / innerWidth, BH / innerHeight);
      cam.getWorldDirection(_f); if (Math.hypot(_f.x, _f.z) > .05) U.fw.value.set(_f.x, _f.z).normalize();
      if ((chk += rdt) > .5) { chk = 0; capFit();
        var dist = walking ? riverNear(U.eye.value.x, U.eye.value.z, inside ? R_OUT : R_IN) : 1e9;
        if (!inside && dist < R_IN) { inside = 1; tgt = 1; if (q.holdTalk) q.holdTalk(1);   /* v7：見ているあいだは町の語りを止める */ eTgt = 0; held = 0; U.e.value = 0; sound(); if (ac) { ac.resume(); au.play().catch(function () {}); }
          if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try { navigator.vibrate([14, 90, 14, 90, 22]); } catch (e) {}
          if (!said) { said = 1; sayEra(0); } }
        else if (inside && dist >= R_OUT) { inside = 0; tgt = 0; if (said === 1) { said = 2; setTimeout(function () { say(L_OUT); }, 1800); } }
        if (!inside && q.hold && k < .06 && q.holdTalk) q.holdTalk(0);   // 窓が閉じたら町の語りを再開
      }
      if (inside && k > .9 && eTgt < ERA.length - 1 && (held += rdt) > HOLD) { held = 0; eTgt++; sayEra(eTgt); if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try { navigator.vibrate(12); } catch (e) {} }
      U.e.value += (eTgt - U.e.value) * Math.min(1, rdt / 1.6);
      k += (tgt - k) * Math.min(1, rdt / 2.2); U.k.value = k; tagFit();
   // 約 4 秒でうつりかわる
      if (gn) { gn.gain.value = k * .55; if (k < .01 && au && !au.paused && !tgt) au.pause(); }
      requestAnimationFrame(loop);
    }
    window.mitsuJidai = { st: function () { return { inside: inside, k: k, e: U.e.value, ready: ready(), mode: q.mode, kind: kind }; }, k: function () { return k; }, e: function () { return U.e.value; }, show: function (v, ev) { k = tgt = v; eTgt = ev; U.e.value = ev; if (q.holdTalk) q.holdTalk(v > 0); } };
    requestAnimationFrame(loop);
  }
  var h = setInterval(function () { var q = window.__qw; if (q && q.ready && q.camera && q.terrain && q.mode === "walk") { clearInterval(h); setTimeout(go, 800); } }, 700);
})();
