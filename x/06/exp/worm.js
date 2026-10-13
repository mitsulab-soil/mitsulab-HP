/* 実験台 worm：ミミズが土を混ぜる（3D・新しく作った実験。2026-10-07）。
   Darwin (1881) The Formation of Vegetable Mould through the Action of Worms の観察を模型にした：
   ミミズは土を食べて進み（あとに穴が残る）、地面の上にふんを出す。穴はやがてつぶれ、上の土が下がる。
   これがくり返されると、地面の上に置いたもの（同書では、少なくとも 30 年牧草地だった野原にまいたチョーク＝白亜のかけら）は、年とともに土の中へ沈んでいく。
   同書 第 3 章：1842 年 12 月にまいたチョークが、1871 年 11 月に約 7 インチ（約 18 cm）下に線になって見つかった。
   模型は時間の長さ（年）を言わない：ミミズの数・速さは決めた値で、本物の速さは土・種類・季節で大きく変わるため。
   出すのは「運び上げられたふんの厚さ」と「白亜の深さ」だけ（穴をつぶし、ふんを上に積む、という仕組みから決まる量）。
   白亜より上の土を食べて上に出しても白亜は沈まない。白亜より下を食べたぶんだけ沈むので、深くなるほど沈み方はゆっくりになる。 */
import * as THREE from "three";
import { seg, btn, tag, fmt, note, DS } from "./util.js";

const GX = 44, GY = 38, CS = .02, SURF0 = 27, NW = 4, SEGS = 10, MAX_CAST = 30;
const DARK = new THREE.Color("#2a1d14"), LIGHT = new THREE.Color("#9a5a38"), CHALK = new THREE.Color("#f2efe6");

export function create(H) {
  const g = new THREE.Group(); const { std, box } = H;
  const W = GX * CS, Ht = GY * CS, X0 = -W / 2, Y0 = .05;
  const base = box(W + .1, .05, .16, std(DS.wood, .6)); base.position.y = .025; g.add(base);
  const back = box(W, Ht, .004, std(0x150e09, 1)); back.position.set(0, Y0 + Ht / 2, -.03); g.add(back);
  for (const z of [.03, -.034]) { const p = box(W, Ht, .003, H.glassMat); p.position.set(0, Y0 + Ht / 2, z); g.add(p); }
  const fr = std(DS.wood, .6); for (const s of [-1, 1]) { const p = box(.03, Ht + .02, .09, fr); p.position.set(s * (W / 2 + .015), Y0 + Ht / 2, 0); g.add(p); }
  const cells = new THREE.InstancedMesh(new THREE.BoxGeometry(CS * .98, CS * .98, .05), new THREE.MeshStandardMaterial({ roughness: .95 }), GX * GY);
  cells.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(GX * GY * 3), 3); cells.frustumCulled = false; g.add(cells);
  const wm = new THREE.InstancedMesh(new THREE.SphereGeometry(CS * .42, 8, 6), std(0xc4747a, .5), NW * SEGS); wm.frustumCulled = false; g.add(wm);
  const sc = note("1 ます＝1 cm（2 倍に拡大）", { w: .26 }); sc.position.set(0, Y0 + Ht + .05, .05); g.add(sc);

  let ty, dk, worms, run = false, fast = 1, acc = 0, casts = 0, ticks = 0, depth0 = 0;
  const I = (x, y) => y * GX + x;
  const solid = (x, y) => x >= 0 && x < GX && y >= 0 && y < GY && ty[I(x, y)] > 0;
  const top = x => { for (let y = GY - 1; y >= 0; y--) if (ty[I(x, y)] > 0) return y; return -1; };
  function reset() {
    ty = new Uint8Array(GX * GY); dk = new Float32Array(GX * GY);
    for (let x = 0; x < GX; x++) for (let y = 0; y < SURF0; y++) { ty[I(x, y)] = 1; dk[I(x, y)] = y >= 15 ? .92 + Math.random() * .08 : Math.random() * .1; }
    for (let x = 0; x < GX; x++) if (Math.random() < .72) { ty[I(x, SURF0)] = 2; }
    worms = Array.from({ length: NW }, (_, k) => { const x = 4 + Math.floor((k + .5) * (GX - 8) / NW), y = 6 + Math.floor(Math.random() * 14); ty[I(x, y)] = 0; return { x, y, dx: k % 2 ? 1 : -1, dy: 0, gut: [], up: false, trail: Array(SEGS).fill([x, y]) }; });
    casts = 0; ticks = 0; depth0 = chalkDepth(); paint();
  }
  function chalkDepth() { let s = 0, n = 0; for (let x = 0; x < GX; x++) { const t = top(x); for (let y = 0; y < GY; y++) if (ty[I(x, y)] === 2) { s += t - y; n++; } } return n ? s / n : 0; }
  function stepWorm(w) {
    if (w.up) {
      const t = top(w.x);
      // 地面に出た（上に土が無い）か、すぐ上が白亜のかけら（断面で見えないだけで、かけらのわきから地面に出られる）：ふんを置く
      if (w.y >= t || ty[I(w.x, w.y + 1)] === 2) {
        const avg = w.gut.reduce((a, b) => a + b, 0) / w.gut.length;
        // ふんは口のまわりに積もり、雨や重みでくずれて広がる（となりの列へ少しずつ）
        for (const _ of w.gut) { const x = Math.max(0, Math.min(GX - 1, w.x + Math.round((Math.random() - .5) * 8))), y = top(x) + 1; if (y < GY) { ty[I(x, y)] = 1; dk[I(x, y)] = Math.min(1, avg * .85 + .15 + (Math.random() - .5) * .08); casts++; } }
        slump();
        w.gut = []; w.up = false; w.dy = -1; w.dx = Math.random() < .5 ? -1 : 1; return;
      }
      let nx = w.x, ny = w.y + 1;
      if (ty[I(nx, ny)] === 1) { w.gut.push(dk[I(nx, ny)]); ty[I(nx, ny)] = 0; }
      move(w, nx, ny); return;
    }
    // 掘る：いまの向きに進むことが多く、ときどき向きを変える
    if (Math.random() < .25) { const d = [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1]][Math.floor(Math.random() * 6)]; w.dx = d[0]; w.dy = d[1]; }
    let nx = w.x + w.dx, ny = w.y + w.dy;
    if (nx < 1 || nx > GX - 2) { w.dx *= -1; nx = w.x + w.dx; }
    if (ny < 1) { w.dy = 1; ny = w.y + 1; }
    if (ny >= top(nx) - 1) { w.dy = -1; ny = w.y - 1; }
    if (ny < 0 || ty[I(nx, ny)] === 2) { w.dx *= -1; return; }
    if (ty[I(nx, ny)] === 1) { w.gut.push(dk[I(nx, ny)]); ty[I(nx, ny)] = 0; }
    move(w, nx, ny);
    if (w.gut.length >= 6) w.up = true;
  }
  // 高く積もった所は、となりの低い所へくずれる（2 ますより高い段差を残さない）
  function slump() {
    for (let k = 0; k < 3; k++) for (let x = 0; x < GX; x++) for (const nx of [x - 1, x + 1]) {
      if (nx < 0 || nx >= GX) continue; const a = top(x), b = top(nx);
      if (a - b >= 2 && ty[I(x, a)] !== 2 && a + 0 < GY) { ty[I(nx, b + 1)] = ty[I(x, a)]; dk[I(nx, b + 1)] = dk[I(x, a)]; ty[I(x, a)] = 0; }
    }
  }
  function move(w, x, y) { w.x = x; w.y = y; w.trail = [[x, y], ...w.trail.slice(0, SEGS - 1)]; }
  function collapse() {
    // 古い穴はつぶれる：穴の上にある土（白亜も）が一つ下がる。ミミズのいるところはつぶさない
    for (let k = 0; k < 40; k++) {
      const x = Math.floor(Math.random() * GX), t = top(x); if (t < 1) continue;
      const y = Math.floor(Math.random() * t);
      if (ty[I(x, y)] !== 0) continue;
      if (worms.some(w => w.trail.some(([a, b]) => a === x && Math.abs(b - y) <= 1))) continue;
      for (let yy = y; yy < GY - 1; yy++) { ty[I(x, yy)] = ty[I(x, yy + 1)]; dk[I(x, yy)] = dk[I(x, yy + 1)]; }
      ty[I(x, GY - 1)] = 0;
    }
  }
  const M4 = new THREE.Matrix4(), C = new THREE.Color(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  function paint() {
    for (let y = 0; y < GY; y++) for (let x = 0; x < GX; x++) {
      const i = I(x, y), t = ty[i];
      if (!t) { cells.setMatrixAt(i, ZERO); continue; }
      M4.makeTranslation(X0 + (x + .5) * CS, Y0 + (y + .5) * CS, 0); cells.setMatrixAt(i, M4);
      if (t === 2) C.copy(CHALK); else C.copy(LIGHT).lerp(DARK, dk[i]);
      cells.setColorAt(i, C);
    }
    cells.instanceMatrix.needsUpdate = true; cells.instanceColor.needsUpdate = true;
    let k = 0;
    for (const w of worms) w.trail.forEach(([x, y], j) => { const s = 1 - j * .05; M4.makeScale(s, s, s).setPosition(X0 + (x + .5) * CS, Y0 + (y + .5) * CS, .028); wm.setMatrixAt(k++, M4); });
    wm.instanceMatrix.needsUpdate = true;
  }
  reset();
  const castCm = () => casts / GX;
  const _dbg = () => { let tops = 0, air = 0, ch = 0; for (let x = 0; x < GX; x++) { const t = top(x); tops += t; for (let y = 0; y < t; y++) if (!ty[I(x, y)]) air++; for (let y = 0; y < GY; y++) if (ty[I(x, y)] === 2) ch++; } return { top: tops / GX, air, ch }; };
  return {
    dbg: _dbg,
    group: g, focus: { y: .34, dist: 1.25, pitch: .1 }, labelY: 1.0,
    tick(dt, on) {
      if (!on) return;
      if (!run) return;
      acc += dt * 14 * fast;
      if (castCm() >= MAX_CAST) { run = false; this._pb && (this._pb.textContent = "▶ 時間を進める"); }
      let n = 0; while (run && acc >= 1 && n < 40) { for (const w of worms) stepWorm(w); collapse(); acc -= 1; n++; ticks++; }
      paint();
    },
    ui(box_) {
      const pb = this._pb = btn(box_, "▶ 時間を進める", () => { if (castCm() >= MAX_CAST) reset(); run = !run; pb.textContent = run ? "⏸ とめる" : "▶ 時間を進める"; }, true);
      seg(box_, [[1, "ふつう"], [5, "はやく"]], fast, v => { fast = v; }, "速さ");
      btn(box_, "はじめから", () => { reset(); run = false; pb.textContent = "▶ 時間を進める"; });
    },
    read() {
      const d = chalkDepth();
      return `<div class="row"><span><span class="k">運び上げられたふん</span> ${fmt(castCm(), 1)} cm</span><span><span class="k">白亜のかけらの深さ</span> ${fmt(d, 1)} cm</span></div>
<div class="note">ミミズの数と速さは決めた値なので、何年ぶんかは言えません。白亜より下の土が運び上げられたぶんだけ、白亜は沈みます。ダーウィンの野原では 29 年で約 18 cm でした。${castCm() >= MAX_CAST ? `ふんが ${MAX_CAST} cm になったので、とめました。` : ""}</div>`;
    },
  };
}
