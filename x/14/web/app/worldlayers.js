/* Qualium 共通：世界そのものに重なる層（kit/worldlayers.js・2026-10-28 晩 本人「Qualia のレイヤーを画面左に配置するのではなく、世界自体にレイヤーとして重ね合わせて。ミクロとマクロの Qualia、関係性の Qualia もレイヤ化」）
   大宮・川越・渋谷はこのファイルを写して使う（場所ごとに直さない）。画面の枠や一覧は使わない。
   ・関係の層：同じ資料（出典の一つ目）でつながる印どうしを、景色の中の細い線で結ぶ。近く（45 m）だけ・ごく淡く。碧が語っている印の線だけ少し明るく。
   ・ミクロ⇄マクロの層：足もとを見下ろしてしばらくいると、近くの「小さなもの」（土・苔・葉・根・樹皮など）の印を碧が語り、足もとに細かな粒の輪がひらく。
     見上げてしばらくいると、「大きなもの」（台地・低地・流域・地形・標高・川の流れなど）の印を碧が語り、まわりに大きな等高の輪がひろがる。
   中身は各アプリの印のデータ（出典つき）だけを使う。新しい事実は作らない。
   使い方：const WL = makeWorldLayers(THREE, scene, { marks: () => [...], pitch: () => CAM.pitch, narrate: L => ..., color: L => "#hex", busy: () => bool, active: () => bool, ground: (x,z) => y });
           毎こま WL.update(dt, camera)／語るとき WL.focus(L)・WL.related(L) → { M, d } か null */
const MICRO = /土|苔|コケ|葉|根|樹皮|幹の肌|菌|粒|砂|小石|虫|種子|実|花|芽|細胞|団粒|落ち葉|石の肌|瓦|漆喰|木目|石畳|敷石|舗石|苔むし/;
const MACRO = /台地|低地|流域|地形|標高|谷|尾根|川の流れ|水系|扇状地|段丘|メートル高|海抜|地質|関東平野|武蔵野|荒川|入間川|新河岸川|渋谷川|古川|宇田川/;
export function makeWorldLayers(THREE, scene, opt) {
  const R = opt.radius ?? 45, said = new Set();
  // 関係の線
  const geo = new THREE.BufferGeometry(), MAXS = 160, pos = new Float32Array(MAXS * 6), col = new Float32Array(MAXS * 6);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const lines = new THREE.LineSegments(geo, mat); lines.frustumCulled = false; lines.renderOrder = 3; scene.add(lines);
  // ミクロの粒の輪・マクロの等高の輪
  const pg = new THREE.BufferGeometry(), PN = 900, pp = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) { const a = Math.random() * Math.PI * 2, r = .35 + Math.sqrt(Math.random()) * 2.4; pp[i * 3] = Math.cos(a) * r; pp[i * 3 + 1] = .12 + Math.random() * .06; pp[i * 3 + 2] = Math.sin(a) * r; }
  pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
  const dot = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d"), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.35, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); const t = new THREE.CanvasTexture(c); return t; })();
  const micro = new THREE.Points(pg, new THREE.PointsMaterial({ map: dot, color: "#d8f0e2", size: .022, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false }));
  micro.visible = false; micro.renderOrder = 4; micro.frustumCulled = false; scene.add(micro);
  const macro = new THREE.Group(); macro.visible = false; scene.add(macro);
  for (const r of [30, 60, 100, 150]) { const g = new THREE.RingGeometry(r - .08, r + .08, 160); g.rotateX(-Math.PI / 2); macro.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: "#bfe3ee", transparent: true, opacity: 0, depthWrite: false, depthTest: false, side: THREE.DoubleSide, toneMapped: false }))); }
  let pairs = [], built = 0, focusL = null, hold = 0, mode = 0, mk = 0, Mk = 0;
  const key = L => (L.o.src || [])[0]?.t || null;   // 同じ資料（出典の一つ目）に書かれた印どうしだけを結ぶ（話題が近いだけでは結ばない）
  function rebuild(cam) {
    const ms = opt.marks().filter(L => L.o && Math.hypot(L.o.x - cam.position.x, L.o.z - cam.position.z) < R + 25), by = new Map();
    for (const L of ms) { const k = key(L); if (!k) continue; (by.get(k) || by.set(k, []).get(k)).push(L); }
    pairs = [];
    for (const g of by.values()) { if (g.length < 2) continue; g.sort((a, b) => a.o.x - b.o.x);
      for (let i = 0; i < g.length && pairs.length < MAXS; i++) { let best = null, bd = 1e9; for (let j = 0; j < g.length; j++) { if (i === j) continue; const d = Math.hypot(g[i].o.x - g[j].o.x, g[i].o.z - g[j].o.z); if (d > 4 && d < 70 && d < bd) { bd = d; best = g[j]; } }
        if (best && !pairs.some(p => (p[0] === best && p[1] === g[i]))) pairs.push([g[i], best]); } }
  }
  const _c = new THREE.Color(), _p = new THREE.Vector3();
  const yOf = L => (L.glyph ? L.glyph.getWorldPosition(_p).y : (opt.ground ? opt.ground(L.o.x, L.o.z) + 2 : (L.o.y || 0) + 2)) - .6;
  return {
    get lines() { return lines; },
    focus(L) { focusL = L; },
    related(L) { const k = key(L); if (!k) return null; let best = null, bd = 1e9;
      for (const M of opt.marks()) { if (M === L || key(M) !== k) continue; const d = Math.hypot(M.o.x - L.o.x, M.o.z - L.o.z); if (d > 8 && d < 160 && d < bd) { bd = d; best = M; } }
      return best ? { M: best, d: bd } : null; },
    update(dt, cam) {
      const on = opt.active();
      lines.visible = on; if (!on) { micro.visible = macro.visible = false; return; }
      if ((built -= dt) <= 0) { built = .6; rebuild(cam); }
      let n = 0;
      for (const [a, b] of pairs) { if (n >= MAXS) break; const f = a === focusL || b === focusL, da = Math.hypot(a.o.x - cam.position.x, a.o.z - cam.position.z), fade = Math.max(0, 1 - da / R);
        if (!f && fade <= 0) continue; const k = f ? .9 : .16 * fade; _c.set(opt.color(a)).multiplyScalar(k);
        pos.set([a.o.x, yOf(a), a.o.z, b.o.x, yOf(b), b.o.z], n * 6); col.set([_c.r, _c.g, _c.b, _c.r, _c.g, _c.b], n * 6); n++; }
      geo.setDrawRange(0, n * 2); geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true;
      // 見下ろす・見上げる
      const p = opt.pitch(), want = p < -.6 ? -1 : p > .48 ? 1 : 0;
      if (want !== mode) { mode = want; hold = 0; document.body.dataset.wl = mode < 0 ? "micro" : mode > 0 ? "macro" : "eye"; } else hold += dt;   // 体の向き（見下ろす・見上げる）を body に書く（画面の部品の出し分けと確かめに使う）
      if (mode && hold > 1.3 && !opt.busy()) { hold = -8;   // 一度語ったら、続けて見ていても 8 秒は次を語らない
        const re = mode < 0 ? MICRO : MACRO, lim = mode < 0 ? 90 : 200;   // 小さなものは 90 m まで探す（25 m より先なら「少し先の」と言う） let best = null, bd = 1e9;
        for (const L of opt.marks()) { if (said.has(L)) continue; const t = (L.o.title || "") + (L.o.lines || []).map(l => l.t || "").join(""); if (!re.test(t)) continue; const d = Math.hypot(L.o.x - cam.position.x, L.o.z - cam.position.z); if (d < lim && d < bd) { bd = d; best = L; } }
        if (best) { said.add(best); opt.narrate(best, mode < 0 ? (bd > 25 ? "micro-far" : "micro") : "macro"); } }
      mk += ((mode < 0 && hold > .4 ? 1 : 0) - mk) * Math.min(1, dt * 2.2); { const w = mode > 0 && hold > .4 ? 1 : 0; Mk += (w - Mk) * Math.min(1, dt * (w > Mk ? 1.6 : .22)); }   // 見下ろしたあとも、しばらく大きな輪が残る
      if (hold < 0 && mode) { if (mode < 0) mk = Math.max(mk, .9); else Mk = Math.max(Mk, .9); }
      const gy = opt.ground ? opt.ground(cam.position.x, cam.position.z) : cam.position.y - 1.6;
      micro.visible = mk > .02; if (micro.visible) { micro.position.set(cam.position.x, gy, cam.position.z); micro.material.opacity = .7 * mk; micro.rotation.y += dt * .05; }
      macro.visible = Mk > .02; if (macro.visible) { macro.position.set(cam.position.x, gy + .1, cam.position.z); macro.children.forEach((m, i) => { m.material.opacity = .22 * Mk * (1 - i * .18); m.scale.setScalar(.92 + .08 * Mk); }); }
    },
  };
}
