/* 実験台 gw：地下水と湧き水（台地と低地の模式・3D・2026-10-08）。
   台地に降った雨は土にしみこんで地下水になり、砂や砂利の層の中を低い方へゆっくり流れ、台地のへり（崖）の下で湧き出す。
   雨が少ない季節や、地面が舗装されてしみこむ水が減ると、地下水の高さが下がり、湧き水が減る・かれる（Freeze & Cherry 1979 Groundwater ほか、教科書の水準）。
   本人（2026-10-08）：国土地理院の地形データは、測量法の使用承認が要る場合がある（地理院 Q&A Q2-4）ので使わない → 形も地層も単純にした模式。
   計算：地下水の面の高さ h(x) を、拡散の式 ∂h/∂t = D ∂²h/∂x² + R/Sy で動かす（Dupuit の近似を線形にしたもの）。左端は分水界（流れなし）、
   右端（崖の下）で湧き出す高さに固定。湧き水の量 ∝ 右端の傾き（Darcy の法則）。数値はすべて動きが見えるように決めた値。 */
import * as THREE from "three";
import { seg, btn, tag, note, fmt, DS, tex } from "./util.js";

const X0 = -.6, X1 = .6, DEPTH = .26, NC = 72;
const PLATEAU = .46, LOW = .22, SL0 = -.05, SL1 = .12, AQ0 = .12, AQ1 = .3, CLAY0 = .04;
const XS = .09, HS = .26;   // 湧き出すところ（崖の下）
const yG = x => x < SL0 ? PLATEAU : x > SL1 ? LOW : PLATEAU + (LOW - PLATEAU) * (x - SL0) / (SL1 - SL0);
const N = 40, DX = (XS - X0) / (N - 1), D = .02, RAIN = .0118;

export function create(H) {
  const g = new THREE.Group(); const { std, box, cyl } = H;
  const base = box(1.3, .04, DEPTH + .06, std(DS.base, .5)); base.position.y = .02; g.add(base);
  const cw = (X1 - X0) / NC;
  const mats = { clay: std(0x8f8a84, .95), aq: new THREE.MeshStandardMaterial({ map: tex("sand_diff", .3, .3), normalMap: tex("sand_nor", .3, .3, false), color: 0xd8c49a, roughness: .95 }), loam: new THREE.MeshStandardMaterial({ map: tex("soil_diff", .3, .3), normalMap: tex("soil_nor", .3, .3, false), color: 0x9a6a46, roughness: .95 }), allu: std(0x6f6250, .95), grass: std(0x5f8a46, .9) };
  for (let i = 0; i < NC; i++) {
    const x = X0 + (i + .5) * cw, top = yG(x);
    const add = (y0, y1, m) => { if (y1 <= y0) return; const b = box(cw * 1.001, y1 - y0, DEPTH, m); b.position.set(x, y0 + (y1 - y0) / 2, 0); g.add(b); };
    add(CLAY0, AQ0, mats.clay);
    if (x < SL1) { add(AQ0, Math.min(AQ1, top), mats.aq); add(Math.min(AQ1, top), top, mats.loam); }
    else { add(AQ0, .19, mats.aq); add(.19, top, mats.allu); }
    add(top, top + .006, mats.grass);
  }
  // 川（低地の右端）
  const river = box(.1, .02, DEPTH, std(DS.water, .1, 0, { transparent: true, opacity: .85 })); river.position.set(.5, LOW - .005, 0); g.add(river);
  // 地下水の面（台地の下）：列ごとの青い板
  const wtM = new THREE.MeshBasicMaterial({ color: 0x2f7fc4, transparent: true, opacity: .32, depthWrite: false });
  const NW = 40, wt = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), wtM, NW + 6); wt.frustumCulled = false; g.add(wt);
  const lineM = new THREE.LineBasicMaterial({ color: 0x1f5f9a }); const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.BufferAttribute(new Float32Array((N + 6) * 3), 3));
  const wline = new THREE.Line(lg, lineM); g.add(wline);
  // 湧き水の流れ（崖の下から川へ）
  const spring = cyl(.006, .006, 1, std(DS.water, .1, 0, { transparent: true, opacity: .9 }), 8); spring.rotation.z = Math.PI / 2; g.add(spring);
  const springTag = tag("湧き水", { w: .12 }); springTag.position.set(XS + .02, HS + .1, DEPTH / 2 + .02); g.add(springTag);
  const lab1 = tag("台地", { w: .1 }); lab1.position.set(-.45, PLATEAU + .1, 0); g.add(lab1);
  const lab2 = tag("低地", { w: .1 }); lab2.position.set(.35, LOW + .1, 0); g.add(lab2);
  const n1 = note("模式（実際の地形のデータは使っていない）", { w: .42 }); n1.position.set(0, .62, 0); g.add(n1);
  const n2 = tag("砂・砂利の層（水を通す）", { w: .22, size: 44 }); n2.position.set(-.38, .16, DEPTH / 2 + .01); g.add(n2);
  const n3 = tag("粘土の層（水を通しにくい）", { w: .24, size: 44 }); n3.position.set(-.1, .07, DEPTH / 2 + .01); g.add(n3);
  // 舗装（台地の上の灰色の板）
  const paveM = std(0x8b8f93, .8); const paves = [];
  for (let i = 0; i < 10; i++) { const p = box(.052, .008, DEPTH * .9, paveM); p.position.set(-.57 + i * .055, PLATEAU + .01, 0); p.visible = false; g.add(p); paves.push(p); }
  // 雨つぶ・地下水の粒
  const NR = 120, drops = new THREE.InstancedMesh(new THREE.CylinderGeometry(.0016, .0016, .03, 4), new THREE.MeshBasicMaterial({ color: 0x8cbfe6 }), NR); drops.frustumCulled = false; g.add(drops);
  const DR = Array.from({ length: NR }, () => ({ x: X0 + Math.random() * (SL0 - X0), y: PLATEAU + .1 + Math.random() * .3, z: (Math.random() - .5) * DEPTH * .8 }));
  const NP = 70, gp = new THREE.InstancedMesh(new THREE.SphereGeometry(.0055, 6, 4), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, toneMapped: false }), NP); gp.frustumCulled = false; g.add(gp);
  const GP = Array.from({ length: NP }, () => ({ x: X0 + Math.random() * (XS - X0), f: Math.random(), z: (Math.random() - .5) * DEPTH * .7 }));
  let h = new Float32Array(N).fill(.36), rainy = true, pave = 0, q0 = 1, Q = 1, weeks = 0, fast = 1;
  // はじめは「雨の多い季節・舗装なし」の落ち着いた形（湧き水の量の 100%）
  function settle() { const save = [rainy, pave]; rainy = true; pave = 0; for (let k = 0; k < 600; k++) step(.05); q0 = flow(); [rainy, pave] = save; }
  function flow() { return Math.max(0, (h[N - 2] - HS) / DX); }
  function step(dt0) {
    const n = Math.max(1, Math.ceil(dt0 * D / (DX * DX) / .4)); for (let s = 0; s < n; s++) sub(dt0 / n);
  }
  function sub(dt) {
    const R = rainy ? RAIN * (1 - pave) : 0, nh = h.slice();
    for (let i = 0; i < N - 1; i++) { const l = i === 0 ? h[1] : h[i - 1], r = h[i + 1]; nh[i] = h[i] + dt * (D * (l - 2 * h[i] + r) / (DX * DX) + R); }
    nh[N - 1] = HS; for (let i = 0; i < N; i++) nh[i] = Math.max(AQ0 + .01, Math.min(PLATEAU - .02, nh[i])); h = nh;
  }
  settle(); Q = flow();
  const M4 = new THREE.Matrix4(), V = new THREE.Vector3(), S = new THREE.Vector3(), Qq = new THREE.Quaternion();
  const hAt = x => { const f = (x - X0) / DX, i = Math.max(0, Math.min(N - 2, Math.floor(f))), u = f - i; return x >= XS ? HS : h[i] + (h[i + 1] - h[i]) * u; };
  function draw(dt, on) {
    const pos = lg.attributes.position.array;
    for (let i = 0; i < N; i++) { const x = X0 + i * DX, y = h[i]; V.set(x, (AQ0 + y) / 2, 0); S.set(DX * 1.01, y - AQ0, DEPTH + .012); M4.compose(V, Qq, S); wt.setMatrixAt(i, M4); pos.set([x, y, DEPTH / 2 + .003], i * 3); }
    for (let k = 0; k < 6; k++) { const x = XS + (k + .5) * (X1 - XS) / 6, y = Math.max(.195, HS - (HS - .195) * (k + 1) / 6); V.set(x, (AQ0 + y) / 2, 0); S.set((X1 - XS) / 6, y - AQ0, DEPTH + .012); M4.compose(V, Qq, S); wt.setMatrixAt(N + k, M4); pos.set([x, y, DEPTH / 2 + .003], (N + k) * 3); }
    wt.instanceMatrix.needsUpdate = true; lg.attributes.position.needsUpdate = true;
    // 湧き水：量に合わせて太さ。かれたら消す
    const rel = q0 ? Q / q0 : 0; spring.visible = rel > .04; const len = .5 - XS; spring.scale.set(1, len, 1); spring.position.set(XS + len / 2, LOW + .004, DEPTH / 2 - .03); spring.scale.x = spring.scale.z = .4 + 1.6 * Math.min(1.5, rel);
    // 雨
    DR.forEach((d, i) => { if (rainy && on) { d.y -= dt * 1.4; if (d.y < PLATEAU) d.y = PLATEAU + .3; } M4.makeTranslation(d.x, rainy ? d.y : -5, d.z); drops.setMatrixAt(i, M4); }); drops.instanceMatrix.needsUpdate = true;
    // 地下水の粒：面より下を、傾きに合わせて崖の方へ
    GP.forEach((p, i) => { const ht = hAt(p.x), grad = Math.max(.02, (hAt(p.x - .02) - hAt(p.x + .02)) / .04); if (on) p.x += dt * .05 * grad * 4 * fast; if (p.x > XS) { p.x = X0 + Math.random() * .2; p.f = Math.random(); } const y = AQ0 + .01 + (ht - AQ0 - .02) * p.f; M4.makeTranslation(p.x, y, p.z); gp.setMatrixAt(i, M4); }); gp.instanceMatrix.needsUpdate = true;
    paves.forEach((p, i) => p.visible = i < Math.round(pave * 10));
  }
  draw(0, false);
  return {
    group: g, focus: { y: .3, dist: 1.5, pitch: .14 }, labelY: 1.0,
    tick(dt, on) { if (!on) return; for (let k = 0; k < fast; k++) { step(dt); weeks += dt; } Q = flow(); draw(dt, on); },
    ui(box_) {
      seg(box_, [[1, "雨の多い季節"], [0, "晴れが続く"]], 1, v => { rainy = !!v; }, "降り方");
      seg(box_, [[0, "舗装なし"], [.5, "台地の半分を舗装"], [.9, "ほとんど舗装"]], 0, v => { pave = v; }, "舗装");
      seg(box_, [[1, "ふつう"], [3, "はやく"]], 1, v => { fast = v; }, "速さ");
      btn(box_, "はじめから", () => { h.fill(.36); settle(); Q = flow(); rainy = true; pave = 0; });
    },
    read() {
      const rel = q0 ? Q / q0 : 0, mid = h[Math.floor(N / 3)];
      return `<div class="row"><span><span class="k">湧き水の量</span> ${fmt(rel * 100, 0)} %${rel < .04 ? "（かれた）" : ""}</span><span><span class="k">台地の地下水の面</span> 地面から ${fmt((PLATEAU - mid) * 100, 0)} cm 下（模型）</span><span><span class="k">しみこむ雨</span> ${rainy ? fmt((1 - pave) * 100, 0) + " %" : "なし"}</span></div>
<div class="note">湧き水の量は「雨の多い季節・舗装なし」で落ち着いたときを 100% とした比べ。形・地層・数値は動きが見えるように決めた模式で、実際の地形のデータは使っていません。</div>`;
    },
  };
}
