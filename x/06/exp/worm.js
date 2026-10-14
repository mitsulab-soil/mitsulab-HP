/* 実験台 worm：ミミズが土を混ぜる（3D・新しく作った実験。2026-10-07）。
   Darwin (1881) The Formation of Vegetable Mould through the Action of Worms の観察を模型にした：
   ミミズは土を食べて進み（あとに穴が残る）、地面の上にふんを出す。穴はやがてつぶれ、上の土が下がる。
   これがくり返されると、地面の上に置いたもの（同書では、少なくとも 30 年牧草地だった野原にまいたチョーク＝白亜のかけら）は、年とともに土の中へ沈んでいく。
   同書 第 3 章：1842 年 12 月にまいたチョークが、1871 年 11 月に約 7 インチ（約 18 cm）下に線になって見つかった。
   模型は時間の長さ（年）を言わない：ミミズの数・速さは決めた値で、本物の速さは土・種類・季節で大きく変わるため。
   出すのは「運び上げられたふんの厚さ」と「白亜の深さ」だけ（穴をつぶし、ふんを上に積む、という仕組みから決まる量）。
   白亜より上の土を食べて上に出しても白亜は沈まない。白亜より下を食べたぶんだけ沈むので、深くなるほど沈み方はゆっくりになる。 */
import * as THREE from "three";
import { seg, btn, tag, fmt, note, DS, canvasTex } from "./util.js";

const GX = 44, GY = 38, CS = .02, SURF0 = 27, NW = 4, SEGS = 14, MAX_CAST = 30;
// 体の環節の数と、環帯の位置（体の長さの割合）。ツリミミズ科ではおよそ 110〜150 節、環帯は 26〜37 節あたり（種で違う）
const NSEG = 120, CL0 = 28 / 120, CL1 = 35 / 120;
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
  // ミミズの体（2026-10-14：赤い点の連なりから、形の分かる体へ）。ツリミミズ科の成体の形：
  //   ・体は環節（体節）の輪が並ぶ細長い筒。前の端はとがり（口前葉）、後ろの端は丸く少し太め
  //   ・前から 4 分の 1 ほどの所に、ふくらんだ鞍のような環帯（色が明るく橙がかる）
  //   ・背は赤茶〜紫がかった色、腹は淡い桃色。体の表面のクチクラが、つやと虹色を返す
  //   模型の 1 ますは 1 cm（2 倍に拡大）なので、体の長さ 14 ます＝約 14 cm、太さ 0.85 ます＝約 8.5 mm（大きめのミミズの値の内）。
  const wormTex = canvasTex(1024, 64, (c, w, h) => {
    for (let y = 0; y < h; y++) {   // 背（v＝.25 が見る人の側）から腹へ
      const d = Math.abs(((y / h + .75) % 1) - .5) * 2;   // 0＝背、1＝腹
      const back = [92, 36, 40], belly = [206, 140, 128], k = Math.pow(d, 1.4);
      c.fillStyle = `rgb(${back.map((v, i) => Math.round(v + (belly[i] - v) * k)).join(",")})`; c.fillRect(0, y, w, 1);
    }
    const g0 = c.createLinearGradient(0, 0, w, 0); g0.addColorStop(0, "rgba(40,10,20,.35)"); g0.addColorStop(.2, "rgba(40,10,20,0)"); g0.addColorStop(.75, "rgba(255,220,200,0)"); g0.addColorStop(1, "rgba(255,220,200,.22)");
    c.fillStyle = g0; c.fillRect(0, 0, w, h);   // 前は濃く、後ろは淡く
    c.fillStyle = "rgba(196,104,58,.9)"; c.fillRect(w * CL0, 0, w * (CL1 - CL0), h);   // 環帯
    c.fillStyle = "rgba(60,14,24,.45)"; c.fillRect(0, h * .74, w, 1.5);   // 背の血管（透けて見える線）
    for (let i = 1; i < NSEG; i++) { const x = i / NSEG * w, inC = x > w * CL0 && x < w * CL1; c.fillStyle = inC ? "rgba(80,30,20,.18)" : "rgba(50,14,18,.5)"; c.fillRect(x - .8, 0, 1.6, h); }   // 環節の境の溝（環帯では浅い）
  });
  const wormBump = canvasTex(1024, 4, (c, w, h) => { c.fillStyle = "#fff"; c.fillRect(0, 0, w, h); for (let i = 1; i < NSEG; i++) { const x = i / NSEG * w, inC = x > w * CL0 && x < w * CL1; c.fillStyle = inC ? "#ddd" : "#555"; c.fillRect(x - 1.2, 0, 2.4, h); } });
  wormBump.colorSpace = THREE.NoColorSpace;
  const wormMat = new THREE.MeshPhysicalMaterial({ map: wormTex, bumpMap: wormBump, bumpScale: 1.2, roughness: .36, clearcoat: .8, clearcoatRoughness: .22, iridescence: .3, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 420] });
  const RINGS = 64, RAD = 12;
  const wormMesh = () => {
    const geo = new THREE.BufferGeometry(), V = RAD + 1, n = RINGS * V, uv = new Float32Array(n * 2), idx = [];
    for (let i = 0; i < RINGS; i++) for (let j = 0; j < V; j++) { uv[(i * V + j) * 2] = i / (RINGS - 1); uv[(i * V + j) * 2 + 1] = j / RAD; }
    for (let i = 0; i < RINGS - 1; i++) for (let j = 0; j < RAD; j++) { const a = i * V + j, b = a + 1, c2 = a + V, d = b + V; idx.push(a, c2, b, b, c2, d); }
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3)); geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, wormMat); m.frustumCulled = false; g.add(m); return m;
  };
  const wmeshes = Array.from({ length: NW }, wormMesh);
  // 体の太さ（s＝0 が前の端、1 が後ろの端）：前はとがり、環帯でふくらみ、後ろは丸い
  const R0 = CS * .425;
  const radius = (s, ph) => {
    const head = Math.sqrt(Math.sin(Math.min(1, s / .09) * Math.PI / 2)), tail = Math.sqrt(Math.sin(Math.min(1, (1 - s) / .045) * Math.PI / 2));
    const clit = 1 + .13 * Math.max(0, Math.sin(Math.min(1, Math.max(0, (s - CL0 + .01) / (CL1 - CL0 + .02))) * Math.PI));
    const wave = 1 + .07 * Math.sin((s * 3.2 - ph) * Math.PI * 2) * Math.min(1, s * 6);   // ぜん動の波（前から後ろへ）
    return R0 * head * tail * clit * (1 - .12 * s) * wave;
  };
  const sc = note("1 ます＝1 cm（2 倍に拡大）", { w: .26 }); sc.position.set(0, Y0 + Ht + .05, .05); g.add(sc);

  let ty, dk, worms, follow = false, run = false, fast = 1, acc = 0, casts = 0, ticks = 0, depth0 = 0;
  const I = (x, y) => y * GX + x;
  const solid = (x, y) => x >= 0 && x < GX && y >= 0 && y < GY && ty[I(x, y)] > 0;
  const top = x => { for (let y = GY - 1; y >= 0; y--) if (ty[I(x, y)] > 0) return y; return -1; };
  function reset() {
    ty = new Uint8Array(GX * GY); dk = new Float32Array(GX * GY);
    for (let x = 0; x < GX; x++) for (let y = 0; y < SURF0; y++) { ty[I(x, y)] = 1; dk[I(x, y)] = y >= 15 ? .92 + Math.random() * .08 : Math.random() * .1; }
    for (let x = 0; x < GX; x++) if (Math.random() < .72) { ty[I(x, SURF0)] = 2; }
    // はじめから体の長さぶんの穴の中にいる（2026-10-14：同じ一ますに重ねていたので、はじめは点に見えた）
    worms = Array.from({ length: NW }, (_, k) => {
      const x = 4 + Math.floor((k + .5) * (GX - 8) / NW), y = 5 + k * 4 + Math.floor(Math.random() * 2), dx = x < GX / 2 ? -1 : 1, trail = [];
      for (let j = 0; j < SEGS; j++) { const cx = x - dx * j, cy = y + (j > 6 && j < 11 ? 1 : 0); trail.push([cx, cy]); ty[I(cx, cy)] = 0; }
      return { x, y, dx, dy: 0, gut: [], up: false, ant: true, trail };
    });
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
    const DIRS = [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1]], inBody = (x, y) => w.trail.some(([a, b], j) => j > 0 && a === x && b === y);
    if (Math.random() < .25) { const d = DIRS[Math.floor(Math.random() * 6)]; w.dx = d[0]; w.dy = d[1]; }
    // 掘るあいだは、自分の体の方へは向かない（ほかの向きをえらぶ）。ふんを出したあとに下がるときだけ、後ずさりする
    if (inBody(w.x + w.dx, w.y + w.dy)) { const alt = DIRS.filter(([a, b]) => !inBody(w.x + a, w.y + b)); if (alt.length) { const d = alt[Math.floor(Math.random() * alt.length)]; w.dx = d[0]; w.dy = d[1]; } }
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
  // 自分の体のある穴へ頭を向けたら、体を重ねずに後ずさりする（ミミズは穴の中を尾から下がれる）。前の端の印 ant を入れかえて、頭の形は同じ端に残す
  function move(w, x, y) {
    if (w.trail.some(([a, b], j) => j > 0 && a === x && b === y) && !w.flip) { w.trail.reverse(); w.ant = !w.ant; [w.x, w.y] = w.trail[0]; w.flip = 1; return; }
    w.flip = 0; w.x = x; w.y = y; w.trail = [[x, y], ...w.trail.slice(0, SEGS - 1)];
  }
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
    worms.forEach((w, k) => drawWorm(w, wmeshes[k]));
  }
  // 体の芯の線：通った ます の中心を、二度ならしてから曲線にする（格子の角を丸める）
  const P = [], Q = new THREE.Vector3(), T = new THREE.Vector3(), N = new THREE.Vector3(), ZV = new THREE.Vector3(0, 0, 1);
  let wph = 0;
  function drawWorm(w, mesh) {
    let pts = w.trail.map(([x, y]) => new THREE.Vector3(X0 + (x + .5) * CS, Y0 + (y + .5) * CS, .019));
    if (!w.ant) pts.reverse();
    for (let it = 0; it < 2; it++) pts = pts.map((p, i) => i === 0 || i === pts.length - 1 ? p : p.clone().multiplyScalar(.5).addScaledVector(pts[i - 1], .25).addScaledVector(pts[i + 1], .25));
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal"), sp = curve.getSpacedPoints(RINGS - 1);
    const pos = mesh.geometry.attributes.position.array, nor = mesh.geometry.attributes.normal.array, V = RAD + 1, ph = wph + w.x * .13;
    for (let i = 0; i < RINGS; i++) {
      const s = i / (RINGS - 1), r = radius(s, ph);
      T.copy(sp[Math.min(RINGS - 1, i + 1)]).sub(sp[Math.max(0, i - 1)]); if (T.lengthSq() < 1e-12) T.set(1, 0, 0); T.normalize();
      N.crossVectors(T, ZV).normalize();
      for (let j = 0; j < V; j++) {
        const a = j / RAD * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), o = (i * V + j) * 3;
        Q.copy(N).multiplyScalar(ca).addScaledVector(ZV, sa);
        pos[o] = sp[i].x + Q.x * r; pos[o + 1] = sp[i].y + Q.y * r; pos[o + 2] = sp[i].z + Q.z * r;
        nor[o] = Q.x; nor[o + 1] = Q.y; nor[o + 2] = Q.z;
      }
    }
    mesh.geometry.attributes.position.needsUpdate = true; mesh.geometry.attributes.normal.needsUpdate = true;
  }
  reset();
  const castCm = () => casts / GX;
  const _dbg = () => { let tops = 0, air = 0, ch = 0; for (let x = 0; x < GX; x++) { const t = top(x); tops += t; for (let y = 0; y < t; y++) if (!ty[I(x, y)]) air++; for (let y = 0; y < GY; y++) if (ty[I(x, y)] === 2) ch++; } return { top: tops / GX, air, ch }; };
  return {
    dbg: _dbg,
    group: g, focus: { y: .34, dist: 1.25, pitch: .1 }, labelY: 1.0,
    tick(dt, on) {
      if (!on) return;
      if (follow) { const w = worms[0], [x, y] = w.trail[Math.floor(w.trail.length / 2)]; H.closeUp?.(g.localToWorld(new THREE.Vector3(X0 + (x + .5) * CS, Y0 + (y + .5) * CS, .02))); }
      if (!run) return;
      acc += dt * 14 * fast;
      if (castCm() >= MAX_CAST) { run = false; this._pb && (this._pb.textContent = "▶ 時間を進める"); }
      wph += dt * 1.6;
      let n = 0; while (run && acc >= 1 && n < 40) { for (const w of worms) stepWorm(w); collapse(); acc -= 1; n++; ticks++; }
      paint();
    },
    ui(box_) {
      const pb = this._pb = btn(box_, "▶ 時間を進める", () => { if (castCm() >= MAX_CAST) reset(); run = !run; pb.textContent = run ? "⏸ とめる" : "▶ 時間を進める"; }, true);
      seg(box_, [[1, "ふつう"], [5, "はやく"]], fast, v => { fast = v; }, "速さ");
      follow = false; const zb = btn(box_, "ミミズに寄る", () => { follow = !follow; zb.textContent = follow ? "箱の全体へ" : "ミミズに寄る"; zb.setAttribute("aria-pressed", String(follow)); if (!follow) H.closeUp?.(null); });
      btn(box_, "はじめから", () => { reset(); run = false; pb.textContent = "▶ 時間を進める"; });
    },
    read() {
      const d = chalkDepth();
      return `<div class="row"><span><span class="k">運び上げられたふん</span> ${fmt(castCm(), 1)} cm</span><span><span class="k">白亜のかけらの深さ</span> ${fmt(d, 1)} cm</span></div>
<div class="note">ミミズの数と速さは決めた値なので、何年ぶんかは言えません。白亜より下の土が運び上げられたぶんだけ、白亜は沈みます。ダーウィンの野原では 29 年で約 18 cm でした。${castCm() >= MAX_CAST ? `ふんが ${MAX_CAST} cm になったので、とめました。` : ""}</div>`;
    },
  };
}
