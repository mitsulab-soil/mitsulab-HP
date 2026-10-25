// © mitsulab. TOP の「環世界 1.0」「環世界 2.0」の 3D（2026-10-25 本人「環世界 1.0 と 2.0 を、それぞれ別の 3D グラフィックで表す」）
//   boot(fig)：fig.dataset.umw が "1" か "2"。二つは見た目をはっきり分ける。
//   1.0＝身体の感覚の泡だけの世界（写実の土と草・夕方の光・格子や札の電脳の表現は使わない）。
//        同じ場所に、マダニ・ミツバチ・人が立ち、それぞれの「受けとれる範囲」の泡が違う。人の泡の外に、取りこぼした手がかり
//        （紫外線の模様・超音波・かすかな地中の振動・かすかな匂い）が漂う。
//        マダニの三つの手がかり（酪酸のにおい→毛の感触→温かさ）は、ユクスキュル『生物から見た世界』（1934）の記述の順。
//   2.0＝電脳の層が積み重なる世界。人の泡の外にあった手がかりと場所の記録を、碧とかさねっこ（どちらも環境エージェント）が
//        五つの層（案 10 の色）に訳して場所に重ね、人はその層の中で受けとる。体験した人が自分の意思で置いた層
//        （触れた面の凹凸や写真・匿名で時刻だけ）が加わって、重なりが育つ。「3.0」という番号は出さない（本人と相談中）。
// ・カメラは回さない（斜め上の一つの向き）。碧は共通部品 aoi_motion.js（反り腰を直す stand()）。かさねっこは共通部品 kit/envAgents/kasane.js。
// ・ミツバチ・コウモリは共通部品の生きもの（kit/creatures.js）。マダニはここで組む（脚 4 対＝8 本・顎体部が前・背板は前半だけ＝成虫の雌の形）。
// ・大きさは見やすく誇張した模式。線と点は実測の値ではない。紫外線の模様は、見える色に置きかえた模式。
// ・画面に近づいてから読む・画面の外とタブを隠したときは止める・動きを減らす設定では、重なった一こまだけ描く。
import * as THREE from 'three';
import { lineMaterial, pointMaterial, drift } from './kit/layers.js';
import { makeBee, makeBat } from './kit/creatures.js';
import { LAYER5 } from './kit/layer-colors.js?v=20261023k';

const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const win = (a, b, x, f = .9) => sstep(a, a + f, x) * (1 - sstep(b - f, b, x));
const geo = a => { const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return b; };
const ringGeo = (r, y = 0, n = 96) => { const p = []; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, b = (k + 1) / n * Math.PI * 2; p.push(Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(b) * r, y, Math.sin(b) * r); } return geo(p); };
const LC = Object.fromEntries(LAYER5.map(L => [L.key, L]));

export function boot(fig) {
  const mode = fig.dataset.umw === '2' ? 2 : 1;
  const stage = fig.querySelector('[data-umw-stage]');
  const mobile = innerWidth < 700 || matchMedia('(pointer:coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas'); cv.className = 'qp-es-cv'; cv.setAttribute('aria-hidden', 'true');
  let R;
  try { R = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch (e) { fig.classList.add('no-3d'); return; }
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  R.outputColorSpace = THREE.SRGBColorSpace;
  stage.prepend(cv);
  const S = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 90), g = new THREE.Group(); S.add(g);
  const ctx = { fig, stage, mobile, reduce, R, S, cam, g, tl: new THREE.TextureLoader(), kick: () => kick() };
  const scene = mode === 1 ? build1(ctx) : build2(ctx);

  // ── 札（HTML。3D の点に寄せる。濃い札から置き、重なる札は上下にずらす。避けきれない薄い札は出さない） ──
  const labs = [...stage.querySelectorAll('[data-at]')], v = new THREE.Vector3(), todo = [];
  function placeLabs(AT, alphaOf) {
    labs.forEach(el => {
      const at = el.dataset.at, p = AT[at]; if (!p) { el.style.opacity = '0'; return; }
      const a = alphaOf(at);
      v.copy(p).applyMatrix4(g.matrixWorld).project(cam);
      const hw = (el.offsetWidth || 0) / 2 + 4; let px = (v.x * .5 + .5) * W; if (hw * 2 < W) px = Math.max(hw, Math.min(W - hw, px));
      const hh = (el.offsetHeight || 0) / 2 + 4; let py = (-v.y * .5 + .5) * Hh; if (hh * 2 < Hh) py = Math.max(hh, Math.min(Hh - hh, py));
      todo.push({ el, a, px, py, h: el.offsetHeight || 0 });
    });
    todo.sort((x, y) => y.a - x.a); const boxes = [];
    for (const o of todo) {
      let ok = o.a < .03;
      if (!ok) for (const d of [0, -1, 1, -2, 2, -3, 3]) {
        const yy = o.py + d * (o.h * .6 + 3); o.el.style.transform = 'translate(' + Math.round(o.px) + 'px,' + Math.round(yy) + 'px)';
        const r = o.el.getBoundingClientRect(), bx = [r.left - 2, r.top - 2, r.right + 2, r.bottom + 2];
        if (!boxes.some(c => bx[0] < c[2] && bx[2] > c[0] && bx[1] < c[3] && bx[3] > c[1])) { boxes.push(bx); ok = true; break; }
      }
      const a = ok ? o.a : 0; o.el.style.opacity = a.toFixed(2); o.el.classList.toggle('on', a > .9);
      if (o.a < .03) o.el.style.transform = 'translate(' + Math.round(o.px) + 'px,' + Math.round(o.py) + 'px)';
    }
    todo.length = 0;
  }
  // ── 図の下の一行（いま何を見ているか） ──
  const lines = [...fig.querySelectorAll('[data-ph-line]')]; let curLine = '';
  function showLine(k) { if (k === curLine) return; curLine = k; lines.forEach(l => l.classList.toggle('on', l.dataset.phLine === k)); }

  let W = 0, Hh = 0;
  const size = () => {
    W = cv.clientWidth; Hh = cv.clientHeight; if (!W || !Hh) return; R.setSize(W, Hh, false); cam.aspect = W / Hh;
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), fw = scene.fit[mobile ? 1 : 0];
    cam.userData.d = Math.max(fw[0] / (t * cam.aspect), fw[1] / t);
    cam.updateProjectionMatrix();
  };
  new ResizeObserver(() => { size(); render(performance.now(), true); }).observe(cv); size();

  let vis = true, raf = 0, last = performance.now(), tc = reduce ? scene.still : 0; const t0 = last;
  function render(now, still) {
    const dt = still ? 0 : Math.max(0, Math.min(.05, (now - last) / 1000)); last = now; const t = (now - t0) / 1000;
    if (!reduce && !still) tc = (tc + dt) % scene.cycle;
    const d = cam.userData.d || 20, [ly, lz, ty, tz] = scene.cam;
    cam.position.set(0, ty + d * ly, tz + d * lz); cam.lookAt(0, ty, tz);
    const st = scene.update(t, reduce || still ? 0 : dt, tc, still);
    showLine(st.line);
    g.updateMatrixWorld(true);
    R.render(S, cam);
    placeLabs(st.AT, st.alpha);
  }
  const loop = now => { if (!vis || document.hidden) { raf = 0; return; } render(now); raf = reduce ? 0 : requestAnimationFrame(loop); };
  function kick() { if (!raf && vis && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; if (vis && scene.onVisible) scene.onVisible(); kick(); }, { rootMargin: '200px 0px' }).observe(cv);
  document.addEventListener('visibilitychange', kick);
  document.addEventListener('hp-lang-change', () => setTimeout(() => render(performance.now(), true), 30));
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); fig.classList.remove('has-3d'); });
  fig.classList.add('has-3d');
  window['__umw' + mode] = { get tc() { return +tc.toFixed(2); }, set tc(x) { tc = x; render(performance.now(), true); }, cycle: scene.cycle, get vis() { return vis; } };
  kick();
}

// ═════════════════════════════════════════ 環世界 1.0 ═════════════════════════════════════════
function build1({ mobile, reduce, S, g, tl, kick }) {
  S.fog = new THREE.Fog(0x0b0906, 20, 40);
  S.add(new THREE.HemisphereLight(0xffe6c4, 0x2a2016, 1.7));
  const sun = new THREE.DirectionalLight(0xffd6a0, 2.3); sun.position.set(-6, 5, 3); S.add(sun);
  const back = new THREE.DirectionalLight(0x9fb6d8, .5); back.position.set(4, 3, -6); S.add(back);
  const RG = 5.2;
  // 地面：林の土（写真の質感）と、参道の石畳。縁はやわらかく消える。格子・目盛り・札は置かない
  {
    const fade = fadeMap();
    const soil = tl.load('x/02/tex/soil_forest.webp'); soil.colorSpace = THREE.SRGBColorSpace; soil.wrapS = soil.wrapT = THREE.RepeatWrapping; soil.repeat.set(4, 4);
    const m = new THREE.Mesh(new THREE.CircleGeometry(RG, 72), new THREE.MeshStandardMaterial({ map: soil, color: 0x8c7a62, roughness: .96, transparent: true, alphaMap: fade, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; g.add(m);
    const pv = tl.load('img/hero/3d/ql_paving_c.webp'); pv.colorSpace = THREE.SRGBColorSpace; pv.wrapS = pv.wrapT = THREE.RepeatWrapping; pv.repeat.set(1.2, 5);
    const pm = new THREE.MeshStandardMaterial({ map: pv, color: 0xa39c8e, roughness: .9, transparent: true, alphaMap: stripFade(), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
    if (!mobile) { const n = tl.load('img/hero/3d/ql_paving_n.webp'); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(1.2, 5); pm.normalMap = n; pm.normalScale = new THREE.Vector2(.6, .6); }
    const path = new THREE.Mesh(new THREE.PlaneGeometry(2.3, RG * 2.1), pm); path.rotation.x = -Math.PI / 2; path.rotation.z = -.42; path.position.set(1.35, .004, 0); g.add(path);
  }
  // 草：左手前に茂み（細い葉を一本ずつ。色は緑から枯れ色まで）
  const grassAt = (x, z) => { const px = x - 1.35, pz = z, ca = Math.cos(.42), sa = Math.sin(.42), u = px * ca - pz * sa; return Math.abs(u) > 1.45 && Math.hypot(x, z) < RG * .92; };
  {
    const N = mobile ? 420 : 1200, bl = new THREE.PlaneGeometry(.045, 1, 1, 4); bl.translate(0, .5, 0);
    const pa = bl.attributes.position; for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); pa.setX(i, pa.getX(i) * (1 - y * .92)); pa.setZ(i, y * y * .18); }
    bl.computeVertexNormals();
    const im = new THREE.InstancedMesh(bl, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .85 }), N);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color(); let n = 0, guard = 0;
    while (n < N && guard++ < N * 20) {
      const x = (Math.random() * 2 - 1) * RG, z = (Math.random() * 2 - 1) * RG; if (!grassAt(x, z)) continue;
      const dens = x < 0 ? 1 : .35; if (Math.random() > dens) continue;
      const h = .14 + Math.random() * (x < -1.5 ? .42 : .26); e.set((Math.random() - .5) * .35, Math.random() * 6.28, (Math.random() - .5) * .35); q.setFromEuler(e);
      M.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, h, 1)); im.setMatrixAt(n, M);
      c.setHSL(.2 + Math.random() * .1, .35 + Math.random() * .2, .2 + Math.random() * .16); if (Math.random() < .25) c.setHSL(.11, .35, .32); im.setColorAt(n, c); n++;
    }
    im.count = n; g.add(im);
  }
  // ── マダニ：左手前、背の高い草の先で待つ（前の脚を広げて）。泡は小さい ──
  const STALK = new THREE.Vector3(-2.65, 0, 1.35), TIP = new THREE.Vector3(-2.5, 1.38, 1.3);
  {
    const curve = new THREE.CatmullRomCurve3([STALK, new THREE.Vector3(-2.7, .55, 1.36), new THREE.Vector3(-2.6, 1.08, 1.32), TIP]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, .016, 6), new THREE.MeshStandardMaterial({ color: 0x8a8a52, roughness: .8 })));
    for (const [dx, dz, h, lean] of [[.1, .06, .55, .3], [-.12, .04, .7, -.25], [.05, -.1, .48, .2]]) {
      const c2 = new THREE.CatmullRomCurve3([new THREE.Vector3(STALK.x + dx, 0, STALK.z + dz), new THREE.Vector3(STALK.x + dx + lean * .3, h * .6, STALK.z + dz), new THREE.Vector3(STALK.x + dx + lean, h, STALK.z + dz + .05)]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(c2, 12, .009, 5), new THREE.MeshStandardMaterial({ color: 0x7e8a4e, roughness: .8 })));
    }
  }
  const tick = makeTick(); tick.scale.setScalar(.66); tick.position.copy(TIP).add(new THREE.Vector3(0, .06, 0)); tick.rotation.set(-1.05, .35, 0); g.add(tick);
  const TB = TIP.clone().add(new THREE.Vector3(0, .12, 0));
  { const pl = new THREE.PointLight(0xffc890, 2.2, 2.2, 1.6); pl.position.copy(TIP).add(new THREE.Vector3(.35, .55, .6)); g.add(pl); }
  // ── ミツバチと花：奥の真ん中 ──
  const FL = new THREE.Vector3(-.45, 0, -1.6);
  const flowers = [], PET_Y = new THREE.Color(0xe9c43a), PET_UV = new THREE.Color(0x2c1f55);
  const pet = new THREE.MeshStandardMaterial({ color: 0xe9c43a, roughness: .55 });
  {
    const stemM = new THREE.MeshStandardMaterial({ color: 0x5d7a3a, roughness: .8 }), ctr = new THREE.MeshStandardMaterial({ color: 0x9a6a1c, roughness: .7 });
    for (const [dx, dz, h, s] of [[0, 0, .62, 1], [.42, .26, .5, .8], [-.4, .24, .44, .75], [.16, -.38, .38, .7]]) {
      const base = new THREE.Vector3(FL.x + dx, 0, FL.z + dz), top = new THREE.Vector3(base.x + .03, h, base.z);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([base, base.clone().lerp(top, .5).add(new THREE.Vector3(-.03, 0, .02)), top]), 10, .01, 5), stemM));
      const f = new THREE.Group(); f.position.copy(top); f.rotation.x = -.35; f.scale.setScalar(s * 1.8); g.add(f);
      for (let k = 0; k < 8; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 6), pet); p.scale.set(1, .18, .45); const a = k / 8 * Math.PI * 2; p.position.set(Math.cos(a) * .075, 0, Math.sin(a) * .075); p.rotation.y = -a; f.add(p); }
      const cc = new THREE.Mesh(new THREE.SphereGeometry(.04, 12, 8), ctr); cc.scale.y = .6; cc.position.y = .012; f.add(cc);
      flowers.push({ f, s });
    }
  }
  // 紫外線の模様（ミツバチに届く）：花びらの先が明るく、つけ根が暗い「的」の模様を、見える色（すみれ色）に置きかえた点
  const uvPts = [];
  flowers.forEach(({ f, s }) => { f.updateMatrixWorld(true); for (let k = 0; k < 16; k++) for (let j = 2; j <= 4; j++) { const a = k / 16 * Math.PI * 2, r = .036 * j; uvPts.push(new THREE.Vector3(Math.cos(a) * r, .02, Math.sin(a) * r).applyMatrix4(f.matrixWorld)); } });
  const uvM = pointMaterial(0xf0e2ff, mobile ? .1 : .085, 0); const uv = new THREE.Points(new THREE.BufferGeometry().setFromPoints(uvPts), uvM); g.add(uv);
  const bee = makeBee(); bee.scale.setScalar(.55); const BEE0 = new THREE.Vector3(FL.x + .3, 1.05, FL.z + .3); bee.position.copy(BEE0); bee.rotation.y = Math.PI * .85; g.add(bee);
  const BB = new THREE.Vector3(FL.x + .1, .78, FL.z + .05);
  // ── 人：右の石畳の上、花の方を見る。泡はいちばん大きい ──
  const person = makePerson(); person.scale.setScalar(1.08); const HP = new THREE.Vector3(1.85, 0, .55); person.position.copy(HP); person.rotation.y = -2.2; g.add(person);
  const HB = new THREE.Vector3(HP.x, 1.05, HP.z);
  // ── 人の泡の外の手がかり（取りこぼしている世界） ──
  // 超音波：奥の高い所を飛ぶコウモリの声（広がる弧）
  const bat = makeBat(); bat.scale.setScalar(.55); const BAT = new THREE.Vector3(-1.7, 2.55, -2.6); bat.position.copy(BAT); bat.rotation.y = .9; g.add(bat);
  const usRings = []; for (let k = 0; k < 4; k++) { const l = new THREE.LineSegments(arcGeo(.5, 1.2), lineMaterial(0xc8d4e2, 0)); l.position.copy(BAT); l.rotation.y = .9; g.add(l); usRings.push(l); }
  // かすかな地中の振動：手前の地面に広がる輪
  const VIB = new THREE.Vector3(-.55, .02, 2.75); const vib = []; for (let k = 0; k < 4; k++) { const l = new THREE.LineSegments(ringGeo(1, 0, 72), lineMaterial(0xe0c69a, 0)); l.position.copy(VIB); g.add(l); vib.push(l); }
  // かすかな匂いの筋：左奥を流れる、細い煙のような粒
  const SM = new THREE.Vector3(-3.3, .5, -1.0), NS = mobile ? 60 : 110, smP = new Float32Array(NS * 3), smS = [];
  for (let k = 0; k < NS; k++) smS.push({ u: Math.random(), w: Math.random() * 6.28, y: Math.random() * .5 });
  const smG = new THREE.BufferGeometry(); smG.setAttribute('position', new THREE.BufferAttribute(smP, 3));
  const smM = pointMaterial(0xcfe0c2, .05, 0), smoke = new THREE.Points(smG, smM); smoke.frustumCulled = false; g.add(smoke);
  // 取りこぼした手がかりの、かすかな粒（場所のあちこちに漂う）
  const dust = drift({ count: mobile ? 70 : 140, box: [[-5, .2, -4], [5, 3.6, 4]], color: 0xe8dcc8, size: .035, speed: [.03, .1], opacity: .0 }); g.add(dust);
  // ── マダニの手がかり：人の肌から流れる酪酸のにおい（泡の中に入ったときだけ光る）・毛の感触・温かさ ──
  const NO = mobile ? 30 : 50, odP = new Float32Array(NO * 3), odC = new Float32Array(NO * 3), odT = []; for (let k = 0; k < NO; k++) odT.push(k / NO);
  const odCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(HP.x - .1, .55, HP.z), new THREE.Vector3(.4, .8, 1.5), new THREE.Vector3(-1.4, 1.0, 1.6), TB.clone()]);
  const odG = new THREE.BufferGeometry(); odG.setAttribute('position', new THREE.BufferAttribute(odP, 3)); odG.setAttribute('color', new THREE.BufferAttribute(odC, 3));
  const odM = new THREE.PointsMaterial({ size: .085, map: dotTex(), vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const odor = new THREE.Points(odG, odM); odor.frustumCulled = false; g.add(odor);
  const icons = ['smell', 'hair', 'warm'].map((k, i) => { const m = new THREE.SpriteMaterial({ map: iconTex(k), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }); const s = new THREE.Sprite(m); s.scale.setScalar(.22); const a = Math.PI * (.85 - i * .35); s.position.copy(TB).add(new THREE.Vector3(Math.cos(a) * .62, .28 + Math.sin(a) * .42, .1)); g.add(s); return s; });
  // ── 泡（身体の感覚が受けとれる範囲）：やわらかな膜。主体の色 ──
  const bub = (c, p, r) => { const m = bubbleMat(c), s = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), m); s.position.copy(p); s.scale.setScalar(r); s.renderOrder = 5; g.add(s); return { m, s, r }; };
  const bT = bub(0xe8a070, TB, .88), bB = bub(0xc4b2ff, BB, 1.0), bH = bub(0xf4aa96, HB, 2.05);

  const T = { tick: [0, 6.6], bee: [6.6, 11.6], hito: [11.6, 18.4], all: [18.4, 24.6] }, CYCLE = 25.2;
  const AT = {
    tick: TB.clone().add(new THREE.Vector3(.0, -1.05, 0)), tc1: null, tc2: null, tc3: null,
    bee: BB.clone().add(new THREE.Vector3(-.15, 1.3, -.35)), uv: FL.clone().add(new THREE.Vector3(.75, -.2, 1.3)),
    hito: HP.clone().add(new THREE.Vector3(0, -.12, .5)), u1: HB.clone().add(new THREE.Vector3(.0, 2.25, 0)),
    mus: BAT.clone().add(new THREE.Vector3(.75, .45, 0)), mvib: VIB.clone().add(new THREE.Vector3(.0, .05, .55)), msm: SM.clone().add(new THREE.Vector3(-.9, -.3, .1)), muv: FL.clone().add(new THREE.Vector3(-1.0, 1.55, -.5)),
  };
  icons.forEach((s, i) => { AT['tc' + (i + 1)] = s.position.clone().add(new THREE.Vector3(i === 0 ? -.5 : i === 2 ? .5 : 0, i === 1 ? .32 : .0, 0)); });
  const tmp = new THREE.Vector3(), cOut = new THREE.Color(0x7a6a56), cIn = new THREE.Color(0xffc070), tc0 = new THREE.Color();
  let w = { tick: 0, bee: 0, hito: 0, all: 0 };
  return {
    fit: [[5.1, 3.45], [4.5, 4.1]], cam: [.55, .84, .85, .1], cycle: CYCLE, still: 21,
    update(t, dt, tc) {
      for (const k in T) w[k] = win(T[k][0], T[k][1], tc, 1.0);
      const line = tc < T.tick[1] ? 'tick' : tc < T.bee[1] ? 'bee' : tc < T.hito[1] ? 'hito' : 'all';
      const a = tc - T.tick[0];
      // 泡
      bT.m.uniforms.op.value = .4 + .6 * Math.max(w.tick, .75 * w.all); bB.m.uniforms.op.value = .35 + .65 * Math.max(w.bee, .75 * w.all); bH.m.uniforms.op.value = .22 + .58 * Math.max(w.hito, .65 * w.all);
      for (const b of [bT, bB, bH]) { b.m.uniforms.t.value = t; if (!reduce) b.s.scale.setScalar(b.r * (1 + .012 * Math.sin(t * 1.3 + b.r))); }
      // マダニ：においが泡に入ると光る（外では、ほとんど見えない）→ 毛の感触 → 温かさ（記述の順）
      const odOn = Math.max(w.tick, .35 * w.all);
      for (let k = 0; k < NO; k++) {
        if (!reduce) odT[k] = (odT[k] + dt * .16) % 1;
        odCurve.getPoint(odT[k], tmp); tmp.y += .04 * Math.sin(t * 2 + k); odP[3 * k] = tmp.x; odP[3 * k + 1] = tmp.y; odP[3 * k + 2] = tmp.z;
        const inside = sstep(.5, .4, tmp.distanceTo(TB)); tc0.copy(cOut).lerp(cIn, inside).multiplyScalar(.35 + .65 * inside);
        odC[3 * k] = tc0.r; odC[3 * k + 1] = tc0.g; odC[3 * k + 2] = tc0.b;
      }
      odG.attributes.position.needsUpdate = true; odG.attributes.color.needsUpdate = true; odM.opacity = .95 * odOn;
      const ic = [win(.6, 6.4, a, .6) * sstep(.6, 1.4, a), win(2.4, 6.4, a, .6), win(4.0, 6.4, a, .6)];
      icons.forEach((s, i) => { s.material.opacity = Math.max(ic[i] * (tc < T.tick[1] ? 1 : 0), .45 * w.all); });
      tick.children.forEach(o => { if (o.userData.quest) o.rotation.x = o.userData.quest + (reduce ? 0 : .12 * Math.sin(t * 1.7 + o.userData.side)); });
      // ミツバチ：花の上でゆれ、紫外線の模様が泡の中で浮かぶ
      if (!reduce && dt) { bee.position.set(BEE0.x + Math.sin(t * .8) * .12, BEE0.y + Math.sin(t * 1.3) * .05, BEE0.z + Math.cos(t * .6) * .08); bee.userData.animate && bee.userData.animate(t); }
      const uvA = Math.max(w.bee, .75 * w.all); uvM.opacity = uvA * (reduce ? 1 : .88 + .12 * Math.sin(t * 3)); pet.color.lerpColors(PET_Y, PET_UV, .85 * w.bee + .4 * w.all);
      // 人：立ったまま重心がゆれる
      if (!reduce && dt) person.userData.animate(t);
      // 人の泡の外：取りこぼした手がかり（人の場面で強く、ほかでは淡く）
      const miss = Math.max(w.hito, .55 * w.all, .18);
      if (!reduce && dt) bat.userData.animate && bat.userData.animate(t);
      if (!reduce && dt) bat.position.set(BAT.x + Math.sin(t * .4) * .5, BAT.y + Math.sin(t * .9) * .12, BAT.z + Math.cos(t * .4) * .25);
      usRings.forEach((l, k) => { const f = reduce ? (k + .5) / 4 : (t * .5 + k / 4) % 1; l.position.copy(bat.position); l.scale.setScalar(.3 + f * 2.6); l.material.opacity = .75 * (1 - f) * miss; });
      vib.forEach((l, k) => { const f = reduce ? (k + .5) / 4 : (t * .35 + k / 4) % 1; l.scale.set(.15 + f * 1.25, 1, .15 + f * 1.25); l.material.opacity = .8 * (1 - f) * miss; l.position.y = .02 + (reduce ? 0 : .006 * Math.sin(t * 40 + k)); });
      for (let k = 0; k < NS; k++) { const s = smS[k]; if (!reduce) s.u = (s.u + dt * .05) % 1; const u = s.u; smP[3 * k] = SM.x + (u - .5) * 2.2 + .12 * Math.sin(u * 9 + s.w); smP[3 * k + 1] = SM.y + s.y + u * .6 + .1 * Math.sin(u * 7 + s.w + t * .5); smP[3 * k + 2] = SM.z + .4 * Math.sin(u * 4 + s.w) - u * .6; }
      smG.attributes.position.needsUpdate = true; smM.opacity = .7 * miss;
      dust.material.opacity = .35 * miss; if (!reduce && dt) dust.userData.update(dt);
      const alpha = at => {
        if (at === 'tick') return Math.max(w.tick, .55 * w.all, .3);
        if (/^tc\d$/.test(at)) return ic[+at[2] - 1] * (tc < T.tick[1] ? 1 : 0);
        if (at === 'bee') return Math.max(w.bee, .55 * w.all, .3);
        if (at === 'uv') return w.bee;
        if (at === 'hito') return Math.max(w.hito, .55 * w.all, .3);
        if (at === 'u1') return w.all;
        if (/^m/.test(at)) return w.hito;
        return 0;
      };
      return { line, AT, alpha };
    },
  };
}

// ═════════════════════════════════════════ 環世界 2.0 ═════════════════════════════════════════
function build2({ fig, mobile, reduce, S, g, tl, cam, kick }) {
  const E_C = 0x5fb8d0, QM_C = 0xa8f2f6;
  S.fog = new THREE.Fog(0x03060f, 22, 44);
  S.add(new THREE.HemisphereLight(0xe6f6ff, 0x1a2a34, 1.45));
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(3, 7, 6); S.add(key);
  const rim = new THREE.DirectionalLight(0x8fe6f0, .9); rim.position.set(-5, 3, -4); S.add(rim);
  const RE = 5.0, RL = 4.35, LY = [.38, .76, 1.14, 1.52, 1.9], LTOP = 2.36;
  // 電脳の地：細い格子・走査の輪・データの粒・石畳
  {
    const p = [], c = [], R0 = 10, stp = .5, base = new THREE.Color(E_C);
    for (let v = -R0; v <= R0 + 1e-6; v += stp) for (const ax of [0, 1]) for (let u = -R0; u < R0 - 1e-6; u += stp) {
      const A = ax ? [v, u] : [u, v], B = ax ? [v, u + stp] : [u + stp, v];
      const fa = Math.max(0, 1 - Math.hypot(A[0], A[1]) / R0) ** 1.4, fb = Math.max(0, 1 - Math.hypot(B[0], B[1]) / R0) ** 1.4;
      if (fa <= 0 && fb <= 0) continue;
      p.push(A[0], -.02, A[1], B[0], -.02, B[1]); c.push(base.r * fa, base.g * fa, base.b * fa, base.r * fb, base.g * fb, base.b * fb);
    }
    const gg = geo(p); gg.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
    const tex = tl.load('img/hero/3d/ql_paving_c.webp'); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(5, 5);
    const m = new THREE.Mesh(new THREE.CircleGeometry(RE * 1.05, 72), new THREE.MeshStandardMaterial({ map: tex, roughness: .92, color: 0x8a877e, transparent: true, opacity: .72, alphaMap: fadeMap(), depthWrite: false }));
    m.rotation.x = -Math.PI / 2; g.add(m);
    g.add(new THREE.LineSegments(ringGeo(RE, .03, 160), lineMaterial(E_C, .5)));
    const tk = []; for (let k = 0; k < 72; k++) { const a = k / 72 * Math.PI * 2, l = k % 6 ? .12 : .3; tk.push(Math.cos(a) * RE, .03, Math.sin(a) * RE, Math.cos(a) * (RE + l), .03, Math.sin(a) * (RE + l)); }
    g.add(new THREE.LineSegments(geo(tk), lineMaterial(E_C, .45)));
  }
  const scan = new THREE.LineSegments(ringGeo(1, .03, 128), lineMaterial(QM_C, 0)); g.add(scan);
  const dust = drift({ count: mobile ? 100 : 220, box: [[-9, 0, -7], [9, 5, 5]], color: E_C, size: .045, speed: [.04, .16], opacity: .4 }); g.add(dust);

  // ── 人の泡の外にあった手がかりと、場所の記録（それぞれ一つの層へ訳される） ──
  const CUE = {
    sight: new THREE.Vector3(-2.75, 0, -1.35),   // 紫外線の模様の花
    sound: new THREE.Vector3(-1.2, 2.75, -2.9),   // コウモリの超音波
    touch: new THREE.Vector3(3.05, 0, -1.55),     // かすかな地中の振動
    nature: new THREE.Vector3(-3.25, 0, 1.25),    // かすかな匂い・土
    culture: new THREE.Vector3(.9, 0, -3.0),      // 記録と典拠（道標）
  };
  // sight：花（人には一色・ミツバチには紫外線の模様）
  const uvPts = [];
  {
    const pet = new THREE.MeshStandardMaterial({ color: 0xe0c050, roughness: .55 }), stem = new THREE.MeshStandardMaterial({ color: 0x4f6e3a, roughness: .8 });
    for (const [dx, dz, h] of [[0, 0, .5], [.28, .18, .4], [-.24, .2, .36]]) {
      const b = new THREE.Vector3(CUE.sight.x + dx, 0, CUE.sight.z + dz); const st = new THREE.Mesh(new THREE.CylinderGeometry(.01, .012, h, 5), stem); st.position.set(b.x, h / 2, b.z); g.add(st);
      const f = new THREE.Group(); f.position.set(b.x, h, b.z); f.rotation.x = -.3; g.add(f);
      for (let k = 0; k < 8; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 6), pet); p.scale.set(1, .18, .45); const a = k / 8 * Math.PI * 2; p.position.set(Math.cos(a) * .075, 0, Math.sin(a) * .075); p.rotation.y = -a; f.add(p); }
      f.updateMatrixWorld(true); for (let k = 0; k < 14; k++) for (let j = 2; j <= 4; j++) { const a = k / 14 * Math.PI * 2; uvPts.push(new THREE.Vector3(Math.cos(a) * .045 * j, .02, Math.sin(a) * .045 * j).applyMatrix4(f.matrixWorld)); }
    }
  }
  const uvM = pointMaterial(0xd6b4ff, .045, .5); g.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(uvPts), uvM));
  // sound：コウモリと超音波の弧
  const bat = makeBat(); bat.scale.setScalar(.55); bat.position.copy(CUE.sound); bat.rotation.y = .6; g.add(bat);
  const usRings = []; for (let k = 0; k < 3; k++) { const l = new THREE.LineSegments(arcGeo(.5, 1.2), lineMaterial(LC.sound.c, 0)); l.rotation.y = .6; g.add(l); usRings.push(l); }
  // touch：地面の振動の輪
  const vib = []; for (let k = 0; k < 3; k++) { const l = new THREE.LineSegments(ringGeo(1, 0, 64), lineMaterial(LC.touch.c, 0)); l.position.copy(CUE.touch).setY(.03); g.add(l); vib.push(l); }
  // nature：土と草と、かすかな匂いの粒
  {
    const bl = new THREE.ConeGeometry(.012, 1, 3); bl.translate(0, .5, 0);
    const im = new THREE.InstancedMesh(bl, new THREE.MeshStandardMaterial({ color: 0x6d8a52, roughness: .85 }), 70), M = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let k = 0; k < 70; k++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * .55; q.setFromEuler(new THREE.Euler((Math.random() - .5) * .4, 0, (Math.random() - .5) * .4)); M.compose(new THREE.Vector3(CUE.nature.x + Math.cos(a) * r, 0, CUE.nature.z + Math.sin(a) * r), q, new THREE.Vector3(1, .15 + Math.random() * .3, 1)); im.setMatrixAt(k, M); }
    g.add(im);
  }
  const NSM = 40, smP = new Float32Array(NSM * 3), smS = []; for (let k = 0; k < NSM; k++) smS.push({ u: Math.random(), w: Math.random() * 6.28 });
  const smG = new THREE.BufferGeometry(); smG.setAttribute('position', new THREE.BufferAttribute(smP, 3)); const smM = pointMaterial(LC.nature.c, .05, .5); const smoke = new THREE.Points(smG, smM); smoke.frustumCulled = false; g.add(smoke);
  // culture：道標（石）と、記録・典拠の札
  {
    const tx = tl.load('x/02/tex/rock_surface.webp'); tx.colorSpace = THREE.SRGBColorSpace;
    const st = new THREE.Mesh(new THREE.BoxGeometry(.24, .9, .2), new THREE.MeshStandardMaterial({ map: tx, color: 0x9a948a, roughness: .9 })); st.position.copy(CUE.culture).setY(.45); st.rotation.y = .3; g.add(st);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(.19, .14, 4), st.material); cap.position.copy(CUE.culture).setY(.97); cap.rotation.y = .3 + Math.PI / 4; g.add(cap);
    const eb = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(.32, 1.1, .28)), lineMaterial(E_C, .35)); eb.position.copy(CUE.culture).setY(.55); eb.rotation.y = .3; g.add(eb);
  }
  const recTag = new THREE.Mesh(new THREE.PlaneGeometry(.8, .4), new THREE.MeshBasicMaterial({ map: recTex(), transparent: true, depthWrite: false, toneMapped: false, opacity: .9 })); recTag.position.copy(CUE.culture).add(new THREE.Vector3(.62, 1.3, 0)); g.add(recTag);

  // ── 五つの層：六角の情報の小片が、手がかりのある所から広がって一枚になる（下から sight→culture の順に積む） ──
  const layers = LAYER5.map((L, k) => {
    const cell = mobile ? .5 : .4, hw = cell * Math.sqrt(3) / 2, cells = [];
    for (let r = -20; r <= 20; r++) for (let c = -20; c <= 20; c++) { const x = c * hw * 2 + (r & 1) * hw, z = r * cell * 1.5; if (Math.hypot(x, z) < RL * .97) cells.push([x, z]); }
    const hg = new THREE.RingGeometry(cell * .78, cell * .9, 6, 1); hg.rotateX(-Math.PI / 2); hg.rotateY(Math.PI / 6);
    const mat = new THREE.MeshBasicMaterial({ color: L.c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const im = new THREE.InstancedMesh(hg, mat, cells.length); im.frustumCulled = false; im.renderOrder = 2;
    const col = new THREE.Color(), hole = ([x, z]) => (Math.abs(x + .35) < .62 && z > 1.35 && z < 4.6) || Math.hypot(x - 1.55, z - 1.05) < .55, dim = cells.map(c => hole(c) ? 0 :  Math.random() < .25 ? .85 + Math.random() * .15 : Math.random() < .45 ? 0 : .1 + Math.random() * .3);
    cells.forEach((_, i) => { im.setColorAt(i, col.setRGB(dim[i], dim[i], dim[i])); });
    const grp = new THREE.Group(); grp.position.y = LY[k]; grp.add(im); g.add(grp);
    const edge = new THREE.LineSegments(ringGeo(RL, 0, 160), lineMaterial(L.c, 0)); grp.add(edge);
    const o = CUE[L.key], org = [o.x, o.z], dmax = Math.max(...cells.map(([x, z]) => Math.hypot(x - org[0], z - org[1])));
    return { L, k, im, mat, edge, cells, org, dmax, grp, dim, rev: -1 };
  });
  const M4 = new THREE.Matrix4(), Q1 = new THREE.Quaternion(), V1 = new THREE.Vector3(), V2 = new THREE.Vector3();
  function reveal(Ly, f) {   // f：0→1（手がかりの所から外へ広がる）
    if (Math.abs(f - Ly.rev) < .004) return; Ly.rev = f;
    const R0 = f * (Ly.dmax + .6);
    Ly.cells.forEach(([x, z], i) => { const d = Math.hypot(x - Ly.org[0], z - Ly.org[1]), s = sstep(R0, R0 - .6, d) * (Ly.dim[i] > 0 ? 1 : 0); M4.compose(V1.set(x, 0, z), Q1, V2.set(Math.max(.001, s), 1, Math.max(.001, s))); Ly.im.setMatrixAt(i, M4); });
    Ly.im.instanceMatrix.needsUpdate = true;
  }
  // ── 体験した人が自分で置いた層（いちばん上）：触れた面の凹凸や写真の小さな札。匿名で、残るのは時刻だけ ──
  const placed = new THREE.Group(); placed.position.y = LTOP; g.add(placed);
  const pEdge = new THREE.LineSegments(ringGeo(RL * .92, 0, 160), lineMaterial(0xeaf6f6, 0)); placed.add(pEdge);
  const TILES = [];
  {
    const texA = tileTex('touch'), texB = tileTex('photo');
    const slots = []; for (let k = 0; k < 14; k++) { const a = k * 2.39996, r = 1.0 + Math.sqrt(k / 14) * 2.6; slots.push([Math.cos(a) * r, Math.sin(a) * r]); }
    slots.forEach(([x, z], k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(.38, .38), new THREE.MeshBasicMaterial({ map: k % 2 ? texB : texA, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0, z); placed.add(m);
      TILES.push({ m, x, z, k });
    });
  }
  // ── 人（泡の中心）と、ほかに来た人たち（淡い姿） ──
  const HP = new THREE.Vector3(1.55, 0, 1.05), person = makePerson(); person.scale.setScalar(1.08); person.position.copy(HP); person.rotation.y = -2.5; g.add(person);
  const HB = new THREE.Vector3(HP.x, 1.0, HP.z);
  const ghosts = [];   // 2026-10-25 採点：過去の来た人の人影は出さない（残るのは札だけ）
  const bubM = bubbleMat(0xf4aa96), bub = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), bubM); bub.position.copy(HB); bub.renderOrder = 5; g.add(bub);
  const SPH = sphereLines(5, 10), bandM = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  { const p = SPH.attributes.position, c = []; for (let i = 0; i < p.count; i++) { const L = LAYER5[Math.min(4, Math.max(0, Math.floor((p.getY(i) + 1) / 2 * 5)))]; const cc = new THREE.Color(L.c); c.push(cc.r, cc.g, cc.b); } SPH.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); }
  const band = new THREE.LineSegments(SPH, bandM); band.position.copy(HB); g.add(band);
  // 層から人へ：受けとる手がかりの粒
  const NR = mobile ? 30 : 50, rP = new Float32Array(NR * 3), rC = new Float32Array(NR * 3), rS = []; for (let k = 0; k < NR; k++) rS.push({ u: Math.random(), l: k % 5, a: Math.random() * 6.28 });
  const rG = new THREE.BufferGeometry(); rG.setAttribute('position', new THREE.BufferAttribute(rP, 3)); rG.setAttribute('color', new THREE.BufferAttribute(rC, 3));
  const rM = new THREE.PointsMaterial({ size: .07, map: dotTex(), vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }); const recv = new THREE.Points(rG, rM); recv.frustumCulled = false; g.add(recv);
  // 訳す光：手がかり → 上の層へ（かさねっこが運び上げる）
  const NT = mobile ? 26 : 40, tP = new Float32Array(NT * 3), tT = []; for (let k = 0; k < NT; k++) tT.push(k / NT);
  const tG = new THREE.BufferGeometry(); tG.setAttribute('position', new THREE.BufferAttribute(tP, 3)); const tM = pointMaterial(0xffffff, .09, 0); const trPts = new THREE.Points(tG, tM); trPts.frustumCulled = false; g.add(trPts);
  const tLine = new THREE.Line(geo(new Array(3 * 24).fill(0)), lineMaterial(0xffffff, 0)); tLine.frustumCulled = false; g.add(tLine);
  // 置く光：人の手から、いちばん上の層の札へ
  const pP = new Float32Array(3 * 12), pG = new THREE.BufferGeometry(); pG.setAttribute('position', new THREE.BufferAttribute(pP, 3)); const pM = pointMaterial(0xeaf6f6, .08, 0); const putPts = new THREE.Points(pG, pM); putPts.frustumCulled = false; g.add(putPts);

  // ── 碧：人のそばに立ち、層を一枚ずつ指して重ねる ──
  const A_P = new THREE.Vector3(-.35, 0, 2.05), A_H = 2.05;
  { const sp = new THREE.SpotLight(0xfff4ea, 6, 7, .32, .6, 1.2); sp.position.set(A_P.x + .3, 3.6, A_P.z + 2.6); sp.target.position.set(A_P.x, 1.75, A_P.z); g.add(sp, sp.target); }
  let mot = null, vrm = null, aoiPivot = null, aoiFrames = 0, aoiLoading = false;
  async function loadAoi() {
    if (aoiLoading) return; aoiLoading = true;
    try {
      const [{ GLTFLoader }, { MeshoptDecoder }, V] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js'), import('@pixiv/three-vrm')]);
      const Ld = new GLTFLoader(); Ld.setMeshoptDecoder(MeshoptDecoder); Ld.register(p => new V.VRMLoaderPlugin(p));
      const buf = await (window.__aoiBuf || (window.__aoiBuf = fetch('img/hero/aoi.vrm').then(r => r.arrayBuffer())));
      const gl = await Ld.parseAsync(buf.slice(0), '');
      vrm = gl.userData.vrm; V.VRMUtils.removeUnnecessaryVertices(gl.scene); V.VRMUtils.rotateVRM0(vrm);
      vrm.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
      const pivot = new THREE.Group(); pivot.add(vrm.scene); pivot.visible = false; aoiPivot = pivot; g.add(pivot);
      vrm.humanoid.resetNormalizedPose(); vrm.update(0);
      const bb = new THREE.Box3().setFromObject(vrm.scene); pivot.scale.setScalar(A_H / (bb.max.y - bb.min.y)); pivot.position.copy(A_P);
      const { AoiMotion } = await import('./aoi_motion.js?v=20261026-v61');
      mot = new AoiMotion(vrm, { root: pivot, reducedMotion: reduce, wind: .25, faceViewer: false, startCalm: 1, posture: 'upright', uprightWeight: .9 });
      mot.faceTo(-.2);
      vrm.scene.traverse(o => { if (!o.isMesh) return; [].concat(o.material).forEach(m => { if (!/CLOTH/.test(m.name || '') || /Outline/.test(m.name || '')) return;
        if (m.emissive) m.emissive.multiplyScalar(.4); if (m.parametricRimColorFactor) m.parametricRimColorFactor.multiplyScalar(.35); if ('shadingToonyFactor' in m) m.shadingToonyFactor = Math.min(m.shadingToonyFactor, .3); }); });
      kick();
    } catch (e) { console.warn('umwelt2 aoi', e); }
  }
  const FIX = { pelvis: .13, chest: .045 }, _qa = new THREE.Quaternion(), _ex = new THREE.Vector3(1, 0, 0);
  function rotX(name, a, pre) { const b = vrm.humanoid.getNormalizedBoneNode(name); if (!b) return; _qa.setFromAxisAngle(_ex, a); if (pre) b.quaternion.premultiply(_qa); else b.quaternion.multiply(_qa); }
  function stand() { rotX('hips', -FIX.pelvis); rotX('leftUpperLeg', FIX.pelvis, 1); rotX('rightUpperLeg', FIX.pelvis, 1); rotX('spine', FIX.pelvis * .85, 1); rotX('upperChest', FIX.chest); rotX('neck', -FIX.chest * .7, 1); }

  // ── かさねっこ：それぞれの層の手がかりのそばに、その層の色の小さな群れ ──
  let herd = null;
  setTimeout(async () => {
    try {
      const Mk = await import('./kit/envAgents/kasane.js?v=20261023m');
      const body = Object.fromEntries(LAYER5.map(L => [L.key, '#' + L.body.toString(16).padStart(6, '0')])), hud = Object.fromEntries(LAYER5.map(L => [L.key, '#' + L.c.toString(16).padStart(6, '0')]));
      const away = [[A_P.x, A_P.z, .9], [HP.x, HP.z, .9], [CUE.culture.x, CUE.culture.z, .5], [CUE.sight.x, CUE.sight.z, .45]];
      const ok = (x, z) => Math.hypot(x, z) < RE * .85 && away.every(([ax, az, r]) => Math.hypot(x - ax, z - az) > r);
      herd = new Mk.KasaneHerd({ scene: g, camera: cam, groundAt: () => 0, walkable: ok, body, hud, scale: mobile ? 2.9 : 2.7, mobile, maxDist: 80, max: 16, guideEvery: 1e9, shadow: !mobile });
      const near = { sight: [-2.0, -.75], sound: [-1.35, -1.75], touch: [2.55, -.85], nature: [-2.55, 1.6], culture: [.15, -2.35] };
      for (const L of LAYER5) { const [x, z] = near[L.key]; herd.addGroup(Array.from({ length: mobile ? 2 : 3 }, () => ({ layer: L.key })), { x, z, radius: .55, role: L.key === 'nature' ? 'watch' : '' }); }
      await herd.load(); kick();
    } catch (e) { console.warn('umwelt2 kasane', e); }
  }, 450);

  const T_CUE = 3.4, T_LAY = 1.7, T_TR = T_CUE + 5 * T_LAY, T_IN = T_TR + 4.2, T_GROW = T_IN + 7.4, CYCLE = T_GROW + 2.4;
  const AT = {
    aoi: A_P.clone().add(new THREE.Vector3(-.15, -.05, .5)), kasane: null, hito: HP.clone().add(new THREE.Vector3(.1, -.08, .55)),
    rec: CUE.culture.clone().add(new THREE.Vector3(.62, 1.78, 0)), l5: mobile ? new THREE.Vector3(0, 0, RE + .9) : new THREE.Vector3(RL + .2, 1.0, -.6), u2: HB.clone().add(new THREE.Vector3(1.25, -.95, 1.45)),
    put: new THREE.Vector3(-1.8, LTOP + .35, -1.6), miss: new THREE.Vector3(-.6, 3.6, -2.6),
  };
  AT.kasane = new THREE.Vector3(-2.55, -.05, 2.15);
  const tmp = new THREE.Vector3(), tc0 = new THREE.Color(), white = new THREE.Color(0xffffff);
  const order = LAYER5.map(L => L.key);
  return {
    fit: [[6.0, 4.1], [4.9, 4.7]], cam: [.55, .84, 1.15, .25], cycle: CYCLE, still: T_GROW - .3,
    onVisible: loadAoi,
    update(t, dt, tc, still) {
      const out = 1 - sstep(CYCLE - 1.2, CYCLE - .1, tc);
      const cueA = tc < T_CUE ? sstep(0, 1, tc) : 1;
      const li = tc < T_CUE ? -1 : tc < T_TR ? Math.floor((tc - T_CUE) / T_LAY) : 5, lf = tc < T_CUE ? 0 : tc < T_TR ? ((tc - T_CUE) % T_LAY) / T_LAY : 1;
      const inA = sstep(T_TR, T_TR + 2.2, tc), growT = tc - T_IN, growA = sstep(T_IN, T_IN + 1, tc);
      const line = tc < T_CUE ? 'cues' : tc < T_TR ? 'tr' : tc < T_IN ? 'in' : 'grow';
      { const sp = reduce ? .5 : (t * .16) % 1; scan.scale.setScalar(.3 + sp * RE * 1.7); scan.material.opacity = .4 * (1 - sp) * out; if (!reduce && dt) dust.userData.update(dt); }
      // 手がかり（泡の外）：まず淡く光り、訳されると層の色に
      if (!reduce && dt) { bat.userData.animate && bat.userData.animate(t); bat.position.set(CUE.sound.x + Math.sin(t * .4) * .45, CUE.sound.y + Math.sin(t * .9) * .1, CUE.sound.z + Math.cos(t * .4) * .2); }
      const cueGlow = k => Math.max(.35, li === k ? 1 : li > k ? .55 : .7 * cueA) * out;
      uvM.opacity = .9 * cueGlow(0);
      usRings.forEach((l, k) => { const f = reduce ? (k + .5) / 3 : (t * .5 + k / 3) % 1; l.position.copy(bat.position); l.scale.setScalar(.3 + f * 2.2); l.material.opacity = .8 * (1 - f) * cueGlow(2); });
      vib.forEach((l, k) => { const f = reduce ? (k + .5) / 3 : (t * .35 + k / 3) % 1; l.scale.set(.15 + f * 1.1, 1, .15 + f * 1.1); l.material.opacity = .85 * (1 - f) * cueGlow(1); });
      for (let k = 0; k < NSM; k++) { const s = smS[k]; if (!reduce) s.u = (s.u + dt * .07) % 1; smP[3 * k] = CUE.nature.x + .5 * Math.sin(s.w) * (1 - s.u * .5); smP[3 * k + 1] = .1 + s.u * 1.1; smP[3 * k + 2] = CUE.nature.z + .5 * Math.cos(s.w) * (1 - s.u * .5) + .1 * Math.sin(s.u * 8 + t); }
      smG.attributes.position.needsUpdate = true; smM.opacity = .8 * cueGlow(3);
      recTag.quaternion.copy(cam.quaternion); recTag.material.opacity = .9 * cueGlow(4);
      // 層：一枚ずつ、手がかりの所から広がって重なる
      layers.forEach((Ly, k) => {
        const f = li > k ? 1 : li === k ? sstep(.1, .95, lf) : 0;
        reveal(Ly, reduce ? 1 : f);
        const base = (li > k || li === 5 ? 1 : li === k ? .6 + .4 * f : 0);
        Ly.mat.opacity = (.34 + .3 * (li === k ? 1 : 0)) * base * out; Ly.edge.material.opacity = (.42 - .22 * inA) * base * out;
      });
      // 訳す光：いま訳している手がかり → かさねっこ → その層の高さへ
      if (li >= 0 && li < 5) {
        const key = order[li], col = new THREE.Color(LC[key].c), c0 = CUE[key].clone(); if (key === 'sound') c0.copy(bat.position);
        let src = c0; if (herd && herd.ready && herd.flocks && herd.flocks[li]) { herd.flocks[li].members[0].center(tmp); src = tmp.clone().setY(tmp.y + .3); }
        const top = new THREE.Vector3(src.x * .9, LY[li], src.z * .9), mid = c0.clone().lerp(top, .5).setY(Math.max(c0.y, LY[li]) + .5);
        const cA = new THREE.QuadraticBezierCurve3(c0, mid, src), cB = new THREE.LineCurve3(src, top);
        for (let k = 0; k < NT; k++) { if (!reduce) tT[k] = (tT[k] + dt * .55) % 1; const f = tT[k], P = f < .55 ? cA.getPoint(f / .55) : cB.getPoint((f - .55) / .45); tP[3 * k] = P.x; tP[3 * k + 1] = P.y; tP[3 * k + 2] = P.z; }
        tG.attributes.position.needsUpdate = true; tM.color.copy(col); tM.opacity = .95 * win(0, 1, lf, .2) * out;
        const lp = tLine.geometry.attributes.position.array; for (let k = 0; k < 24; k++) { const f = k / 23, P = f < .55 ? cA.getPoint(f / .55) : cB.getPoint((f - .55) / .45); lp[3 * k] = P.x; lp[3 * k + 1] = P.y; lp[3 * k + 2] = P.z; }
        tLine.geometry.attributes.position.needsUpdate = true; tLine.material.color.copy(col); tLine.material.opacity = .45 * win(0, 1, lf, .2) * out;
        if (mot && !reduce && (li === 0 || li === 3) && lf < dt / T_LAY + .001) { mot.point(top, 1.3); if (li === 0) mot.express('warm', .4, 6); }
        if (mot) mot.lookAt(top);
      } else { tM.opacity = 0; tLine.material.opacity = 0; if (mot) mot.lookAt(null); }
      // 人：はじめは身体の感覚の泡（1.0）だけ → 層の中で受けとる（泡が層の色の帯を帯びて広がる）
      const r = 1.15 * (1 + .3 * inA); bub.scale.setScalar(r * (reduce ? 1 : 1 + .01 * Math.sin(t * 1.3))); bubM.uniforms.op.value = (.55 - .25 * inA) * out; bubM.uniforms.t.value = t;
      band.scale.setScalar(r * 1.01); band.rotation.y = reduce ? 0 : t * .1; bandM.opacity = .32 * inA * out;
      for (let k = 0; k < NR; k++) {
        const s = rS[k]; if (!reduce) s.u = (s.u + dt * .3) % 1; const L = LAYER5[s.l], rr = 2.6 * (1 - s.u) + .2;
        rP[3 * k] = HB.x + Math.cos(s.a) * rr; rP[3 * k + 1] = LY[s.l] + (HB.y + .5 - LY[s.l]) * s.u; rP[3 * k + 2] = HB.z + Math.sin(s.a) * rr;
        tc0.setHex(L.c).lerp(white, s.u * .5); rC[3 * k] = tc0.r; rC[3 * k + 1] = tc0.g; rC[3 * k + 2] = tc0.b;
      }
      rG.attributes.position.needsUpdate = true; rM.opacity = .9 * inA * (1 - .4 * growA) * out;
      if (!reduce && dt) person.userData.animate(t, inA > .5);
      // 育つ：来た人が、自分で選んだ一枚を置く（触れた面の凹凸・写真）。札が一枚ずつ、いちばん上の層に加わる
      const nOn = reduce ? TILES.length : Math.floor(Math.max(0, growT) / 7.0 * TILES.length * 1.15);
      const pA = growA * out; pEdge.material.opacity = .55 * pA;
      TILES.forEach((T, k) => { const on = k < nOn ? 1 : k === nOn ? ((growT / 7.0 * TILES.length * 1.15) % 1) : 0; T.m.material.opacity = .9 * Math.min(1, on * 1.4) * pA; T.m.position.y = (1 - Math.min(1, on)) * .35; });
      ghosts.forEach((p, k) => { p.userData.mat.opacity = .38 * growA * out; if (!reduce && dt) p.userData.animate(t + k * 3, false); });
      if (nOn < TILES.length && growA > .1 && !reduce) {
        const T = TILES[nOn], src = person.position, f = (growT / 7.0 * TILES.length * 1.15) % 1;
        for (let k = 0; k < 12; k++) { const u = Math.max(0, Math.min(1, f - k * .03)); pP[3 * k] = src.x + (T.x - src.x) * u; pP[3 * k + 1] = 1.25 + (LTOP - 1.25) * u + Math.sin(u * Math.PI) * .5; pP[3 * k + 2] = src.z + (T.z - src.z) * u; }
        pG.attributes.position.needsUpdate = true; pM.opacity = .9 * pA;
      } else pM.opacity = 0;
      // 碧
      if (mot) {
        mot.update(still ? 0 : dt, cam, { vrmUpdate: false }); stand(); vrm.update(still ? 0 : dt); mot.afterVrmUpdate(still ? 0 : dt);
        if (aoiPivot && !aoiPivot.visible && ++aoiFrames > 3) { aoiPivot.visible = true; window.__umw2ready = true; }
      }
      if (herd) herd.update(still ? 0 : dt, { active: true });
      const alpha = at => {
        if (at === 'aoi' || at === 'kasane') return out;
        if (at === 'hito') return out;
        if (at === 'rec') return (li === 4 ? 1 : .8) * cueA * out;
        if (at === 'miss') return (1 - sstep(T_CUE - .2, T_CUE + 1, tc)) * cueA;
        if (at === 'l5') return sstep(T_CUE + T_LAY * .4, T_CUE + T_LAY, tc) * out;
        if (at === 'u2') return inA * out;
        if (at === 'put') return growA * out;
        return 0;
      };
      return { line, AT, alpha };
    },
  };
}

// ───────────────────────────── 部品 ─────────────────────────────
// 泡の膜：縁が明るく、真ん中は透ける。薄い膜の色のゆらぎ
function bubbleMat(hex) {
  return new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(hex) }, op: { value: 0 }, t: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 c; uniform float op; uniform float t; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ float f = 1. - abs(dot(normalize(vN), normalize(vV))); float rim = pow(f, 2.4); float film = .5 + .5 * sin(vP.y * 7. + vP.x * 4. + t * .5); vec3 col = c * (.6 + .4 * film) + vec3(.16, .12, .2) * film * rim; gl_FragColor = vec4(col, (rim * .9 + .04) * op); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
}
// 縁が消える円の地図
export function fadeMap() {
  const ac = document.createElement('canvas'); ac.width = ac.height = 256; const ax = ac.getContext('2d');
  const gr = ax.createRadialGradient(128, 128, 10, 128, 128, 126); gr.addColorStop(0, '#fff'); gr.addColorStop(.62, '#ddd'); gr.addColorStop(.9, '#333'); gr.addColorStop(1, '#000'); ax.fillStyle = gr; ax.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(ac);
}
export function stripFade() {
  const ac = document.createElement('canvas'); ac.width = 64; ac.height = 256; const ax = ac.getContext('2d');
  const gy = ax.createLinearGradient(0, 0, 0, 256); gy.addColorStop(0, '#000'); gy.addColorStop(.18, '#fff'); gy.addColorStop(.82, '#fff'); gy.addColorStop(1, '#000'); ax.fillStyle = gy; ax.fillRect(0, 0, 64, 256);
  ax.globalCompositeOperation = 'multiply'; const gx = ax.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, '#000'); gx.addColorStop(.12, '#fff'); gx.addColorStop(.88, '#fff'); gx.addColorStop(1, '#000'); ax.fillStyle = gx; ax.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(ac);
}
// 超音波の弧（前へ広がる、球の一部の網）
function arcGeo(r, spread) {
  const p = []; for (const el of [-.35, 0, .35]) { const N = 24; for (let k = 0; k < N; k++) { const a = -spread / 2 + k / N * spread, b = -spread / 2 + (k + 1) / N * spread; p.push(Math.sin(a) * r * Math.cos(el), Math.sin(el) * r, Math.cos(a) * r * Math.cos(el), Math.sin(b) * r * Math.cos(el), Math.sin(el) * r, Math.cos(b) * r * Math.cos(el)); } }
  return geo(p);
}
function sphereLines(nLat, nLon) {
  const p = [], N = 48;
  for (let i = 1; i < nLat; i++) { const ph = -Math.PI / 2 + i / nLat * Math.PI, r = Math.cos(ph), y = Math.sin(ph); for (let k = 0; k < N; k++) { const a = k / N * Math.PI * 2, b = (k + 1) / N * Math.PI * 2; p.push(Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(b) * r, y, Math.sin(b) * r); } }
  for (let j = 0; j < nLon; j++) { const a = j / nLon * Math.PI * 2; for (let k = 0; k < N / 2; k++) { const p0 = -Math.PI / 2 + k / (N / 2) * Math.PI, p1 = -Math.PI / 2 + (k + 1) / (N / 2) * Math.PI; p.push(Math.cos(a) * Math.cos(p0), Math.sin(p0), Math.sin(a) * Math.cos(p0), Math.cos(a) * Math.cos(p1), Math.sin(p1), Math.sin(a) * Math.cos(p1)); } }
  return geo(p);
}
let DOT = null;
function dotTex() {
  if (DOT) return DOT;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return DOT = new THREE.CanvasTexture(c);
}
// マダニの手がかりの小さな印（におい・毛・温かさ）。文字は入れない（札は HTML）
function iconTex(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,190,120,.35)'); gr.addColorStop(1, 'rgba(255,190,120,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = 'rgba(255,222,170,.95)'; x.lineWidth = 5; x.lineCap = 'round';
  if (kind === 'smell') for (let k = 0; k < 3; k++) { x.beginPath(); for (let y = 0; y <= 64; y += 4) { const xx = 40 + k * 24 + 7 * Math.sin(y / 9 + k); y ? x.lineTo(xx, 96 - y) : x.moveTo(xx, 96 - y); } x.stroke(); }
  else if (kind === 'hair') for (let k = 0; k < 6; k++) { x.beginPath(); x.moveTo(30 + k * 13, 100); x.quadraticCurveTo(26 + k * 13, 66, 40 + k * 13, 30 + (k % 2) * 8); x.stroke(); }
  else { x.beginPath(); x.arc(64, 64, 18, 0, 6.28); x.stroke(); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; x.beginPath(); x.moveTo(64 + Math.cos(a) * 28, 64 + Math.sin(a) * 28); x.lineTo(64 + Math.cos(a) * 40, 64 + Math.sin(a) * 40); x.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// 記録と典拠の札（文字の代わりに線。読める字は HTML の札）
function recTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = 'rgba(40,18,22,.72)'; x.fillRect(0, 0, 256, 128); x.strokeStyle = 'rgba(231,149,146,.95)'; x.lineWidth = 2; x.strokeRect(3, 3, 250, 122);
  x.fillStyle = 'rgba(231,149,146,.9)'; x.fillRect(14, 16, 54, 8); x.fillStyle = 'rgba(240,220,214,.6)'; for (let k = 0; k < 5; k++) x.fillRect(14, 38 + k * 16, 120 + ((k * 53) % 90), 4);
  x.strokeStyle = 'rgba(231,149,146,.7)'; x.beginPath(); x.moveTo(170, 98); for (let k = 0; k < 8; k++) x.lineTo(170 + k * 10, 98 - [8, 20, 14, 30, 24, 40, 34, 46][k]); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// 体験した人が置いた札：触れた面の凹凸（擦りとった筋）／写真（木と空）。端に時刻の印（数字は入れない）
function tileTex(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = 'rgba(10,24,32,.85)'; x.fillRect(0, 0, 128, 128);
  if (kind === 'touch') { x.strokeStyle = 'rgba(240,209,157,.9)'; x.lineWidth = 2; for (let k = 0; k < 9; k++) { x.beginPath(); for (let u = 0; u <= 104; u += 4) { const y = 18 + k * 10 + 3 * Math.sin(u / 7 + k * 1.7) + 2 * Math.sin(u / 3 + k); u ? x.lineTo(12 + u, y) : x.moveTo(12, y); } x.stroke(); } }
  else { const gr = x.createLinearGradient(0, 12, 0, 100); gr.addColorStop(0, '#5b7f96'); gr.addColorStop(1, '#2c3f2e'); x.fillStyle = gr; x.fillRect(12, 12, 104, 88); x.fillStyle = '#1d2a1c'; x.beginPath(); x.moveTo(40, 100); x.lineTo(46, 52); x.lineTo(52, 100); x.fill(); x.fillStyle = '#3f5e3a'; x.beginPath(); x.arc(46, 46, 22, 0, 6.28); x.fill(); x.beginPath(); x.arc(84, 60, 16, 0, 6.28); x.fill(); }
  x.strokeStyle = 'rgba(234,246,246,.9)'; x.lineWidth = 2; x.strokeRect(4, 4, 120, 120);
  x.beginPath(); x.arc(108, 112, 6, 0, 6.28); x.moveTo(108, 112); x.lineTo(108, 108); x.moveTo(108, 112); x.lineTo(111, 112); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// マダニ（成虫の雌の形の模式）：胴は楕円で背板は前半だけ、前に顎体部（触肢一対と口下片）、脚は 4 対＝8 本。
//   第一脚を前へ広げて待つ（草の先で獲物を待つ姿勢）。向き：頭が +Z、背が +Y、体の長さ＝およそ 1
export function makeTick() {
  // 2026-10-26 写実寄りに：伸びる胴（細かな皺の凹凸）・前半だけの背板（点刻）・縁の溝・顎体部（基部・二節の触肢・歯のある口下片）・6 節の脚 4 対と爪
  const T = new THREE.Group();
  const bump = tickBump();
  const body = new THREE.MeshPhysicalMaterial({ color: 0x3a1c12, roughness: .5, clearcoat: .45, clearcoatRoughness: .35, bumpMap: bump, bumpScale: 1.2 });
  const shield = new THREE.MeshPhysicalMaterial({ color: 0x1b100b, roughness: .38, clearcoat: .6, clearcoatRoughness: .25, bumpMap: bump, bumpScale: .6 });
  const leg = new THREE.MeshStandardMaterial({ color: 0x3b2116, roughness: .55 });
  const legL = new THREE.MeshStandardMaterial({ color: 0x6b4630, roughness: .55 });
  const bg = new THREE.SphereGeometry(.5, 48, 28); { const p = bg.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); p.setX(i, p.getX(i) * (1 + z * .35)); } bg.computeVertexNormals(); }
  const b = new THREE.Mesh(bg, body); b.scale.set(.74, .24, 1.0); b.position.z = -.12; b.rotation.y = Math.PI; T.add(b);
  const groove = new THREE.Mesh(new THREE.TorusGeometry(.5, .008, 6, 64), shield); groove.rotation.x = Math.PI / 2; groove.scale.set(.66, .9, 1); groove.position.set(0, .075, -.14); T.add(groove);
  const s = new THREE.Mesh(new THREE.SphereGeometry(.5, 32, 18), shield); s.scale.set(.44, .17, .34); s.position.set(0, .06, .22); T.add(s);
  const bc = new THREE.Mesh(new THREE.CylinderGeometry(.07, .1, .09, 6), shield); bc.rotation.x = Math.PI / 2; bc.scale.set(1, 1, .45); bc.position.set(0, .01, .4); T.add(bc);
  for (const sx of [-1, 1]) { const p1 = new THREE.Mesh(new THREE.CapsuleGeometry(.024, .07, 4, 8), shield); p1.rotation.x = Math.PI / 2; p1.rotation.z = sx * .12; p1.position.set(sx * .05, .0, .5); T.add(p1); const p2 = new THREE.Mesh(new THREE.CapsuleGeometry(.028, .05, 4, 8), shield); p2.rotation.x = Math.PI / 2; p2.position.set(sx * .056, .0, .58); T.add(p2); }
  const hy = new THREE.Mesh(new THREE.ConeGeometry(.02, .16, 8), legL); hy.rotation.x = Math.PI / 2; hy.position.set(0, -.012, .56); T.add(hy);
  const bone = (a, c, r, par, m) => { const d = c.clone().sub(a), mm = new THREE.Mesh(new THREE.CylinderGeometry(r * .78, r, d.length(), 8), m); mm.position.copy(a).add(c).multiplyScalar(.5); mm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); par.add(mm); const j = new THREE.Mesh(new THREE.SphereGeometry(r * .9, 8, 6), legL); j.position.copy(c); par.add(j); };
  const Z = [.28, .2, .11, .02];
  for (const sx of [-1, 1]) Z.forEach((z, i) => {
    const root = new THREE.Group(); root.position.set(sx * .2, -.03, z); T.add(root);
    let pts;
    if (i === 0) { root.userData.quest = -.35; root.userData.side = sx; pts = [[0, 0, 0], [sx * .08, .02, .06], [sx * .2, .12, .18], [sx * .26, .2, .34], [sx * .28, .26, .48], [sx * .29, .3, .6], [sx * .3, .32, .68]]; }   // 第一脚：前へ広げて待つ（先にハラー氏器官）
    else { const sp = (i - 1.6) * .26; pts = [[0, 0, 0], [sx * .1, .02, sp * .15], [sx * .26, .14, sp * .4], [sx * .44, .12, sp * .7], [sx * .58, -.02, sp * .9], [sx * .66, -.16, sp], [sx * .7, -.24, sp * 1.05]]; }
    const V = pts.map(p => new THREE.Vector3(...p).multiplyScalar(.78));
    for (let k = 0; k < 6; k++) bone(V[k], V[k + 1], .036 - k * .0045, root, k % 2 ? legL : leg);
  });
  return T;
}
function tickBump() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 2600; k++) { const v = 90 + Math.random() * 90 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, .6 + Math.random(), Math.random() * 3, 0, 6.3); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
}
// 人（形だけの模型）。ghost＝淡く透ける姿（ほかに来た人）
export function makePerson(ghost = false) {
  const P = new THREE.Group();
  const gm = ghost ? new THREE.MeshStandardMaterial({ color: 0xbfe6ea, roughness: .6, transparent: true, opacity: 0, depthWrite: false, emissive: 0x2a5560 }) : null;
  const skin = gm || new THREE.MeshStandardMaterial({ color: 0xd9cfc2, roughness: .62 }), cloth = gm || new THREE.MeshStandardMaterial({ color: 0x8a96a3, roughness: .78 }), dark = gm || new THREE.MeshStandardMaterial({ color: 0x4a5464, roughness: .85 });
  const lathe = (pts, m) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 28), m);
  const torso = lathe([[0, .86], [.15, .88], [.17, .98], [.16, 1.12], [.19, 1.3], [.2, 1.38], [.16, 1.43], [.07, 1.46], [0, 1.47]], cloth); torso.scale.z = .62; P.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.045, .05, .1, 14), skin); neck.position.y = 1.5; P.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.105, 24, 18), skin); head.scale.set(.88, 1.1, .98); head.position.y = 1.63; P.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.11, 24, 14, 0, Math.PI * 2, 0, Math.PI * .55), dark); hair.scale.set(.92, 1.08, 1.02); hair.position.set(0, 1.645, -.008); P.add(hair);
  const limb = (r0, r1, len, m) => { const gg = new THREE.Group(), c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 14), m); c.position.y = -len / 2; gg.add(c); const j = new THREE.Mesh(new THREE.SphereGeometry(r0, 12, 10), m); gg.add(j); return gg; };
  const arms = [];
  for (const sx of [-1, 1]) {
    const th = limb(.075, .055, .44, dark); th.position.set(sx * .085, .88, 0); P.add(th);
    const sh = limb(.055, .042, .42, dark); sh.position.y = -.44; th.add(sh);
    const ft = new THREE.Mesh(new THREE.BoxGeometry(.08, .05, .22), gm || new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: .7 })); ft.position.set(0, -.42, .05); sh.add(ft);
    const ua = limb(.045, .038, .3, cloth); ua.position.set(sx * .215, 1.39, 0); ua.rotation.z = sx * .09; P.add(ua);
    const fa = limb(.036, .03, .27, skin); fa.position.y = -.3; fa.rotation.x = -.12; ua.add(fa);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 10), skin); hand.scale.set(.8, 1.3, .6); hand.position.y = -.29; fa.add(hand);
    arms.push({ ua, sx });
  }
  P.userData.mat = gm;
  P.userData.animate = (t, look) => {
    P.position.x += (Math.sin(t * .5) * .008 - (P.userData.dx || 0)); P.userData.dx = Math.sin(t * .5) * .008; torso.rotation.z = Math.sin(t * .5) * .012;
    const up = look ? -.12 : 0; head.rotation.x += (up - head.rotation.x) * .04; hair.rotation.x = head.rotation.x;
    arms.forEach(({ ua, sx }) => { ua.rotation.x = Math.sin(t * .5 + sx) * .02; });
  };
  return P;
}
