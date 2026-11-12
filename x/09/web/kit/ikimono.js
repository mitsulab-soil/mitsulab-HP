/* © mitsulab. 生き物の目で歩く（2026-11-04 本人「環世界に入り込むのは依代でなく、リアルな生物の 3D として、sight のように画面の中央に」
   「環世界を変えたまま、自由に移動できるように。sight と同じ操作感」「木や石の環世界に入り込む体験は削除」）。
   設計＝02_プロジェクト/01_公開中（HP公開）/01_Qualium_大宮/資料/設計_生き物の目と町の依代_2026-11-04.md
   ・生き物の写実の 3D（Qualia/sight の creatures.js の写し＝creatures_sight.js）を画面の中央・少し下に置く（sight と同じ置き方）。
   ・歩く操作はそのまま（押した所へ歩く・なぞって見回す・壁や物は本体の当たり判定で通り抜けない）。目の高さと色の受けとり方だけを変える。
   ・軽さ：色は canvas の CSS フィルタ（色の行列）1 つ。体は一体だけ（切り替えのとき作り、描き方を先に組む）。視点は描く直前にだけ差しかえ、描いたあと戻す。
   ・見え方は受けとる細胞の感度からの模式（主観の再現ではない）。数は出典で確かめた幅だけ。Wikipedia は出典にしない。 */
import * as THREE from "three";
import { LENS } from "./umwelt_lens.js?v=3";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
/* 2026-11-04 写実の 3D（Sketchfab・CC BY・Objaverse 経由）。読み込むまではコードの体を出し、読めたら差しかえる。
   柴犬＝"Animated Dog, Shiba Inu" by quander（出典は CREDITS）。
   蝶は 2026-11-05 本人の指示で北米の種（Papilio cresphontes）の写実モデルをやめ、日本の種＝ナミアゲハ（Papilio xuthus）を mitsulab が自作した体に（creatures_sight.js makeButterfly "ageha"。翅 4・脚 6・こん棒状の触角・尾状突起・後翅の青と橙の斑）。 */
export const CREDITS = [
  "柴犬の 3D：\"Animated Dog, Shiba Inu\" by quander（https://sketchfab.com/3d-models/animated-dog-shiba-inu-9abfce885a834399b2c3ccaed51cd474）CC BY 4.0・mitsulab が軽量化"];
const GLB = { inu: { f: "shiba.glb", clip: "standing", rx: 0, ry: 0, foot: true } };
const M_CHOU_RX = 0;
export const IKIMONO = {
  hachi: { name: "ミツバチ", make: "hachi", lens: "hachi", mix: 1, blur: 3.2, eye: 1.0, fov: 80, back: .5, up: .16, size: .16, bob: .03, fly: true,
    say: "ミツバチの目の模式。赤は暗く、紫外は青に移し、像は粗く、視野は広く。", band: [20, 500],
    sources: [{ claim: "受けとる細胞は紫外・青・緑の三種類（約 340・435・540 nm）", cite: "Peitsch D et al. (1992) J. Comp. Physiol. A 170:23–40" }, { claim: "視力は人よりはるかに低い（像を粗くしたのは模式で、実際よりずっと弱め）", cite: "Caves EM, Brandley NC, Johnsen S (2018) Trends Ecol. Evol. 33:358–372" }, { claim: "空気の音は触角のジョンストン器官で、数百 Hz の低いふるえとして受ける", cite: "Dreller C & Kirchner WH (1993) J. Comp. Physiol. A 173:275–279" }] },
  chou: { name: "ナミアゲハ", make: "chou", lens: "chou", mix: 1, blur: 2.4, eye: 1.3, fov: 74, back: .5, up: .3, size: .155, bob: .06, fly: true,
    say: "ナミアゲハの目の模式。色の差は濃く、紫外は紫に移し、像は粗く。",
    sources: [{ claim: "ナミアゲハ（アゲハチョウ科）の複眼は紫外から赤まで感じる細胞をもつ", cite: "Koshitaka H, Kinoshita M, Vorobyev M, Arikawa K (2008) Proc. R. Soc. B 275:947–954" }, { claim: "チョウの視力は人よりはるかに低い（像を粗くしたのは模式）", cite: "Caves EM, Brandley NC, Johnsen S (2018) Trends Ecol. Evol. 33:358–372" }] },
  tori: { name: "シジュウカラ", make: "tori", lens: "tori", mix: 1, blur: .7, eye: 1.1, fov: 80, back: .44, up: .12, size: .3, bob: .02, fly: true,
    say: "シジュウカラの目の模式。四色で色の差は細かく、紫外は紫に移し、視野は広く。", band: [300, 8000],
    sources: [{ claim: "多くの鳥は紫外に感じる錐体を含む四色型", cite: "Hart NS (2001) Prog. Retin. Eye Res. 20:675–703" }, { claim: "小鳥の視力は人より低いとされる（猛禽とは異なる）", cite: "Caves EM, Brandley NC, Johnsen S (2018) Trends Ecol. Evol. 33:358–372" }, { claim: "鳥のよく聴こえる帯はおよそ 1〜4 kHz", cite: "Dooling RJ (1982) Acoustic Communication in Birds, Academic Press" }] },
  suzume: { name: "スズメ", make: "suzume", lens: "tori", mix: 1, blur: .7, eye: .9, fov: 80, back: .44, up: .12, size: .32, bob: .02, fly: true,
    say: "スズメの目の模式。目の高さはしげみほど、紫外は紫に移し、視野は広く。", band: [300, 8000],
    note: "見え方・目の高さ（しげみの高さを低く飛ぶ想定）・画角は模式。スズメそのものの見え方の再現ではない。",
    sources: [{ claim: "スズメの仲間（スズメ目）は紫外に感じる錐体（UVS 型）をもつ", cite: "Ödeen A & Håstad O (2003) Mol. Biol. Evol. 20:855–861" }, { claim: "多くの鳥は紫外を含む四色型", cite: "Hart NS (2001) Prog. Retin. Eye Res. 20:675–703" }, { claim: "目が頭の横につく鳥は視野が広い", cite: "Martin GR (2007) J. Ornithol. 148:S547–S562" } ] },
  tanuki: { name: "タヌキ", make: "tanuki", lens: "inu", mix: 1, blur: 1.3, eye: 0, fov: 76, back: 1.0, up: .5, size: .72, bob: .015, fly: false,
    say: "タヌキの目の模式。目の高さは地面から 30 センチほど、青と黄の二色で赤と緑は似て見える。",
    note: "色はイヌ科の多くに共通する二色型の模式。タヌキで測った値ではない。目の高さ（約 30 cm）と画角も模式。体は柴犬の形をもとに毛色・耳・尾を替えた mitsulab の 3D。",
    sources: [{ claim: "イヌ科の多くは二色型の色覚（タヌキでの測定は確かめられていない）", cite: "Jacobs GH (1993) Biol. Rev. 68:413–471" }, { claim: "イヌ科（イヌ）の視力は人の数分の一、視野は人より広い", cite: "Miller PE & Murphy CJ (1995) J. Am. Vet. Med. Assoc. 207:1623–1634" }] },
  inu: { name: "イヌ", make: "inu", lens: "inu", mix: 1, blur: 1.3, eye: 0, fov: 74, back: 1.05, up: .62, size: .55, bob: .015, fly: false,
    say: "イヌの目の模式。青と黄の二色で赤と緑は似て、像はやや粗く、視野は広く。", band: [67, 20000],
    sources: [{ claim: "イヌは二色型の色覚", cite: "Neitz J, Geist T, Jacobs GH (1989) Vis. Neurosci. 3:119–125" }, { claim: "イヌの視力は人の数分の一、視野は人より広い", cite: "Miller PE & Murphy CJ (1995) J. Am. Vet. Med. Assoc. 207:1623–1634" }, { claim: "イヌの聞こえる帯はおよそ 67 Hz〜45 kHz（人より高い音まで。画面では 20 kHz より上は鳴らせない）", cite: "Heffner HE (1983) Behav. Neurosci. 97(2):310–318／Heffner HE & Heffner RS (2007) J. Am. Assoc. Lab. Anim. Sci. 46(1):20–22" }] },
};
export function attachIkimono(QW, opt = {}) {
  const { camera, scene } = QW, canvas = opt.canvas || document.getElementById("gl") || QW.renderer?.domElement, speak = opt.speak || (() => { });
  const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute";
  svg.innerHTML = '<filter id="ikF" color-interpolation-filters="linearRGB"><feColorMatrix id="ikM" type="matrix"/></filter>';
  document.body.appendChild(svg); const fm = svg.querySelector("#ikM");
  const S = { id: null, body: null, k: 0, t: 0, saved: null }, cache = {};
  // 生き物の選択列に高度操作をまとめる。値は体験用の模式オフセットで、AR/GPSの実測高度ではない。
  const flight = { key: 0, pointer: 0, heldAt: 0, panel: null, up: null, down: null };
  S.flightAltitude = 0;
  function canFly() { return !!(S.id && IKIMONO[S.id]?.fly && QW.mode === "walk"); }
  function clearFlightInput() { flight.key = 0; flight.pointer = 0; flight.up?.classList.remove("is-held"); flight.down?.classList.remove("is-held"); }
  function raiseFlight(amount) { if (canFly()) S.flightAltitude = THREE.MathUtils.clamp(S.flightAltitude + amount, 0, 8); }
  function mountFlightControls() {
    if (flight.panel) return;
    const nav = document.getElementById("qIK"); if (!nav) return;
    const panel = document.createElement("div"); panel.className = "ik-flight"; panel.hidden = true;
    panel.setAttribute("role", "group"); panel.setAttribute("aria-label", "飛ぶ高さ（体験用の模式・R/Fキーでも操作）");
    panel.innerHTML = '<span class="ik-flight-label">飛ぶ高さ<small>模式 · R / F</small></span><button type="button" class="ik-alt-up" aria-label="上へ（長押し・Rキー）" title="長押しで上へ・Rキーでも操作">↑</button><button type="button" class="ik-alt-down" aria-label="下へ（長押し・Fキー）" title="長押しで下へ・Fキーでも操作">↓</button>';
    const style = document.createElement("style"); style.textContent = '#qIK .ik-flight[hidden]{display:none!important}#qIK .ik-flight{display:flex;flex-direction:column;align-items:center;gap:3px;width:52px;padding-top:6px;border-top:1px solid #dce8ee44}#qIK .ik-flight-label{color:#edf5f7;text-shadow:0 1px 3px #000;font:10px/1.3 sans-serif;text-align:center}#qIK .ik-flight-label small{display:block;font-size:8px;white-space:nowrap}#qIK .ik-flight button{width:44px;min-width:44px;min-height:44px;height:44px;font:22px/1 sans-serif;touch-action:none;user-select:none}#qIK .ik-flight button:focus-visible{outline:2px solid #d2f6fa;outline-offset:2px}#qIK .ik-flight button.is-held{color:#0b1119;background:#d8e6ec}';
    document.head.appendChild(style); nav.appendChild(panel); flight.panel = panel;
    for (const [selector, dir] of [[".ik-alt-up", 1], [".ik-alt-down", -1]]) {
      const button = panel.querySelector(selector); if (dir > 0) flight.up = button; else flight.down = button;
      button.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); if (!canFly()) return; clearFlightInput(); flight.pointer = dir; flight.heldAt = performance.now(); button.classList.add("is-held"); button.setPointerCapture?.(e.pointerId); raiseFlight(.25 * dir); });
      const release = e => { e.stopPropagation(); flight.pointer = 0; button.classList.remove("is-held"); };
      button.addEventListener("pointerup", release); button.addEventListener("pointercancel", release); button.addEventListener("lostpointercapture", release);
      button.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); if (e.detail === 0) raiseFlight(.35 * dir); });
    }
    panel.addEventListener("click", e => e.stopPropagation());
    // 選択列の既存paintは全buttonへaria-pressedを付ける。上下は押し分けでなくmomentary操作なので除く。
    new MutationObserver(() => panel.querySelectorAll("button[aria-pressed]").forEach(b => b.removeAttribute("aria-pressed"))).observe(panel, { subtree: true, attributes: true, attributeFilter: ["aria-pressed"] });
  }
  const editable = el => el?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName || "");
  addEventListener("keydown", e => { if (!canFly() || editable(e.target) || e.ctrlKey || e.metaKey || e.altKey) return; const key = e.key.toLowerCase(); if (key !== "r" && key !== "f") return; e.preventDefault(); e.stopImmediatePropagation(); flight.key = key === "r" ? 1 : -1; }, true);
  addEventListener("keyup", e => { if (["r", "f"].includes(e.key.toLowerCase())) { const was = flight.key; flight.key = 0; if (was && canFly()) { e.preventDefault(); e.stopImmediatePropagation(); } } }, true);
  addEventListener("blur", clearFlightInput); document.addEventListener("visibilitychange", () => { if (document.hidden) clearFlightInput(); });
  function updateFlight(dt, now) {
    mountFlightControls(); const active = canFly();
    if (flight.panel) flight.panel.hidden = !active;
    if (!active) { clearFlightInput(); S.flightAltitude = 0; return; }
    const dir = flight.key || (flight.pointer && now - flight.heldAt > 180 ? flight.pointer : 0);
    if (dir) raiseFlight(dir * dt * 1.6);
  }
  let mod = null;
  const pend = {};
  function bodyOf(id) { return cache[id] ? Promise.resolve(cache[id]) : (pend[id] ||= build(id)); }
  async function build(id) {
    const P = IKIMONO[id];
    mod ||= await import("./creatures_sight.js?v=11");
    const c = P.make === "hachi" ? mod.makeBee(undefined, { state: "fly" }) : P.make === "chou" ? mod.makeButterfly("ageha") : P.make === "tori" ? mod.makeTit() : P.make === "suzume" ? mod.makeTit(undefined, { sp: "suzume" }) : P.make === "tanuki" ? mod.makeDog(undefined, { tanuki: true }) : mod.makeDog();
    const g = new THREE.Group(); c.scale.setScalar(P.size); g.add(c); g.userData.c = c;
    g.traverse(o => { o.frustumCulled = false; if (o.isMesh) { o.castShadow = false; o.renderOrder = 5; } });
    g.visible = false;
    { const R = QW.renderer; try { if (R?.compileAsync) { g.visible = true; await R.compileAsync(g, camera, scene); g.visible = false; }   /* 11-05：場面の外で描き方を組み、画像も先に送る（初めて切り替えたときの 0.8〜1.4 秒の止まりをなくす） */
      const ts = new Set(); g.traverse(o => { if (o.material) for (const m of [].concat(o.material)) for (const k in m) if (m[k]?.isTexture) ts.add(m[k]); }); for (const t of ts) { try { R?.initTexture?.(t); } catch { } await new Promise(r => setTimeout(r, 0)); } } catch { } g.visible = false; }
    scene.add(g);
    cache[id] = g; upgrade(id, g); return g;
  }
  let gl = null;
  async function upgrade(id, g) {   // 写実の 3D を遅れて読み、読めたらコードの体と入れかえる（大きさと足もとをそろえる）
    const M = GLB[id]; if (!M) return;
    try {
      gl ||= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      const gt = await gl.loadAsync(new URL("./ikimono_glb/" + M.f, import.meta.url).href), c = g.userData.c;
      const m = gt.scene, w = new THREE.Group(), w2 = new THREE.Group(); w2.rotation.order = "YXZ"; w2.rotation.set(M.rx, M.ry, 0); w2.add(m); w.add(w2);
      const keep = c.scale.x; c.scale.setScalar(1); c.updateMatrixWorld(true); const bc = new THREE.Box3().setFromObject(c); c.scale.setScalar(keep);
      w.updateMatrixWorld(true); const bm = new THREE.Box3().setFromObject(w), sc = bc.getSize(new THREE.Vector3()), sm = bm.getSize(new THREE.Vector3());
      const k = Math.max(sc.x, sc.z) / Math.max(sm.x, sm.z); w2.scale.setScalar(k);
      const cm = bm.getCenter(new THREE.Vector3()).multiplyScalar(k), cc = bc.getCenter(new THREE.Vector3());
      w2.position.set(cc.x - cm.x, M.foot ? bc.min.y - bm.min.y * k : cc.y - cm.y, cc.z - cm.z);
      m.traverse(o => { o.frustumCulled = false; if (o.isMesh) { o.castShadow = false; o.renderOrder = 5; } });
      let mixer = null; if (gt.animations.length) { mixer = new THREE.AnimationMixer(m); const a = gt.animations.find(a => a.name.includes(M.clip || "")) || gt.animations[0]; mixer.clipAction(a).play(); }
      try { if (QW.renderer?.compileAsync) await QW.renderer.compileAsync(w, camera, scene); } catch { }
      c.add(w); for (const ch of c.children) if (ch !== w) ch.visible = false;
      g.userData.glb = { mixer, w2, k, flap: M.flap, y0: w2.position.y };
    } catch (e) { console.warn("ikimono glb", id, e); }   // 読めなければコードの体のまま
  }
  function lensMatrix(P, k) {   // 人（単位行列）と生き物の行列のあいだを k で混ぜる
    const m = LENS[P.lens]?.m || [1, 0, 0, 0, 1, 0, 0, 0, 1], I = [1, 0, 0, 0, 1, 0, 0, 0, 1], a = (P.mix ?? 1) * k, r = i => I[i] + (m[i] - I[i]) * a;
    return `${r(0)} ${r(1)} ${r(2)} 0 0 ${r(3)} ${r(4)} ${r(5)} 0 0 ${r(6)} ${r(7)} ${r(8)} 0 0 0 0 0 1 0`;
  }
  function paint() { if (!canvas) return; if (S.k < .01) { canvas.style.filter = ""; return; } const P = IKIMONO[S.id || S.last]; if (!P) return; fm.setAttribute("values", lensMatrix(P, S.k)); const bl = (P.blur || 0) * S.k * Math.min(innerWidth, 1600) / 1000; canvas.style.filter = bl > .05 ? `url(#ikF) blur(${bl.toFixed(2)}px)` : "url(#ikF)"; }   /* 11-04 夜 本人「見え方が変わらない」：色は混ぜずに全部かけ、視力の低さを軽いぼかしで（CSS の blur は GPU で軽い） */
  async function go(id) {   // id＝生き物（同じものをもう一度＝人の目へ戻る）
    if (!id || id === S.id) { S.id = null; S.flightAltitude = 0; S.cam = null; clearFlightInput(); if (flight.panel) flight.panel.hidden = true; document.body.classList.remove("iki"); QW.sndBand?.(); opt.onChange?.(null); return null; }
    const P = IKIMONO[id]; if (!P) return null; const t0 = performance.now();
    { const cr = document.getElementById("credit"); if (cr && !cr.textContent.includes("quander")) cr.textContent += "／" + CREDITS.join("／"); }   // 写実の 3D の出典（CC BY）をクレジットに足す
    if (!P.fly) { S.flightAltitude = 0; S.cam = null; clearFlightInput(); }
    const b = await bodyOf(id); for (const k in cache) cache[k].visible = false;
    S.id = id; S.last = id; S.body = b; document.body.classList.add("iki"); opt.onChange?.(id); paint();   /* 11-04 夜 P1：生き物から生き物へ替えたとき、前の生き物の見え方のまま残っていた */
    QW.sndBand?.(...(P.band || [20, 20000])); navigator.userActivation?.hasBeenActive !== false && navigator.vibrate?.(P.fly ? [6, 40, 6] : 14);   // 音の帯と、体の入れかわりの小さな振動（模式）
    speak([{ t: P.say, tc: P.say }]); QW.ikiT = performance.now() - t0; return id;
  }
  /* 2026-11-04 本人「生き物の目から見る視点はやめ、sight と同じように少し後ろから見る」：
     体は歩く人の足もとの位置（飛ぶものは P.eye の高さ）に置き、カメラは後ろ・少し上からゆるくついていく。
     体は画面の中央の少し下。見回し（向き）は歩く操作の向きをそのまま使う。描く直前にだけ差しかえ、描いたあと戻す。 */
  const F = new THREE.Vector3(), D = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), L = new THREE.Vector3(), E = new THREE.Euler(0, 0, 0, "YXZ");
  const AP = new THREE.Vector3(), AT = new THREE.Vector3();
  function restoreRenderState() {
    for (const item of S.renderHidden || []) item.object.visible = item.visible;
    S.renderHidden = null;
    const s = S.saved; if (s) { camera.position.copy(s.p); camera.quaternion.copy(s.q); camera.fov = s.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true); S.saved = null; }
  }
  const pb = scene.onBeforeRender, pa = scene.onAfterRender; let lastR = performance.now();
  scene.onBeforeRender = function (...a) {
    restoreRenderState(); // 前の描画が中断された場合も、保存した物理状態を先に戻す。
    pb && pb.apply(this, a);
    const P = IKIMONO[S.id || S.last]; if (!P || S.k < .01 || QW.mode !== "walk") { for (const k in cache) cache[k].visible = false; S.cam = null; return; }
    const now = performance.now(), dt = Math.min(.1, (now - lastR) / 1000); lastR = now;
    S.saved = { p: camera.position.clone(), q: camera.quaternion.clone(), fov: camera.fov };
    const gy = QW.groundAt ? QW.groundAt(camera.position.x, camera.position.z) : camera.position.y - 1.55;
    E.setFromQuaternion(camera.quaternion); camera.getWorldDirection(D); F.set(D.x, 0, D.z).normalize();
    // 体の位置：人の足もと（飛ぶものは少し浮かせて、ゆるく上下）
    B.set(camera.position.x, gy + P.eye + (P.fly ? S.flightAltitude + Math.sin(S.t * 1.7) * P.bob : 0), camera.position.z);
    // 体の向きは進む向きへゆるく回す
    S.yaw = S.yaw == null ? E.y : S.yaw + Math.atan2(Math.sin(E.y - S.yaw), Math.cos(E.y - S.yaw)) * Math.min(1, dt * 6);
    // カメラの行き先：体の後ろ・少し上。見上げ・見下ろしは少しだけ効かせる
    const pm = camera.aspect < 1 ? 1.75 : 1, back = P.back * pm, up = P.up * pm;   // 縦長の画面（スマホ）は少し引いて、体が字幕にかからないように
    const pit = 0;   // 見上げ・見下ろしで体が画面から外れないよう、カメラの高さと向きは一定（sight と同じ）
    C.copy(B).addScaledVector(F, -back * Math.cos(pit * .6)); C.y += up - Math.sin(pit * .6) * back;
    { const gc = QW.groundAt ? QW.groundAt(C.x, C.z) : gy; if (C.y < gc + .12) C.y = gc + .12; }
    S.cam = S.cam ? S.cam.lerp(C, Math.min(1, dt * 7)) : C.clone();
    const k = S.k; camera.position.copy(S.cam);   // 11-04 P1：位置は混ぜない（混ぜている間、体がカメラの真下に隠れて碧だけが見えた）
    L.copy(B).addScaledVector(F, back * .9); L.y += up * .25 - (camera.aspect < 1 ? (P.fly ? .12 : .3) : 0);   /* 11-05：飛ぶものも縦長では少し上に（翅が字幕にかからない）。蝶は翅の模様がぼかしで消えないよう少し大きく */   // 11-04 P2：縦長の画面では、地を歩く体を少し上に見せて下の字幕にかけない   // 少し先を見る＝体は画面の中央の少し下
    S.flightFrame = { offset: P.fly ? S.flightAltitude : 0, groundY: gy, bodyY: B.y, cameraY: camera.position.y };
    camera.lookAt(L);
    camera.fov = S.saved.fov + (P.fov - S.saved.fov) * k; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    // 同じ物理位置の碧を同伴させる。中央の体・進路を塞ぐ近接時だけ、この描画中は避ける。
    // 人物の接地・身長・歩行座標には触れず、影も人物と同じ条件で復元する。
    const A = QW.AOI?.root;
    S.companion = { visible: !!A?.visible, reason: A?.visible ? "in-world" : "not-ready" };
    if (A?.visible && S.id) {
      A.getWorldPosition(AP); const distance = AP.distanceTo(camera.position);
      AT.copy(AP); AT.y += .85; AT.applyMatrix4(camera.matrixWorldInverse);
      const depth = -AT.z; AP.y += .85; AP.project(camera);
      const blocksCenter = depth > 0 && depth < 2.2 && Math.abs(AP.x) < .26 && Math.abs(AP.y) < .8;
      if (distance < .7 || blocksCenter) {
        S.companion = { visible: false, reason: distance < .7 ? "too-close" : "central-occlusion" };
        S.renderHidden = [{ object: A, visible: A.visible }]; A.visible = false;
        const shadow = QW.AOISH; if (shadow?.visible) { S.renderHidden.push({ object: shadow, visible: shadow.visible }); shadow.visible = false; }
      }
    }
    const b = S.body; if (b && S.id) {
      b.position.copy(B); b.rotation.set(0, S.yaw + Math.PI, 0); b.visible = true;
      const mv = S.prevB ? S.prevB.distanceTo(B) / Math.max(dt, 1e-3) > .15 : false; (S.prevB ||= new THREE.Vector3()).copy(B);
      const cu = b.userData.c.userData; cu.animate?.(S.t, P.fly ? true : mv);
      const gb = b.userData.glb; if (gb) { gb.mixer?.update(dt); if (gb.flap) { const ph = S.t * 9, f = .5 + .5 * Math.cos(ph); gb.w2.scale.set(gb.k * (.45 + .55 * f), gb.k * (1 + .5 * (1 - f)), gb.k); gb.w2.rotation.x = M_CHOU_RX + .18 * Math.sin(ph); gb.w2.position.y = gb.y0 + .004 * Math.sin(ph); }   /* 11-04 P2：後ろ・少し上から見て、翅が上がると幅が狭まり厚みが立つ（一枚の形を、上下の打ちと体のしゃくりで模式に） */ }   // 写実の蝶は翅を一枚の形で持つので、横の幅でゆるくはばたかせる（模式）
      else if (P.make === "chou" && cu.wings) { const bd = cu.wings[0].piv.parent; bd.position.multiplyScalar(.25); bd.rotation.x *= .3; bd.rotation.y *= .3; bd.rotation.z *= .3; }   // 後ろから見るとき、アゲハの体のぶれを抑える（翅が片方だけ伸びて見えた・2026-11-04）
      b.updateMatrixWorld(true);
    }
  };
  scene.onAfterRender = function (...a) { try { pa && pa.apply(this, a); } finally { restoreRenderState(); } };
  let tl = performance.now();
  (function loop(t) { const dr = Math.min(.5, (t - tl) / 1000), dt = Math.min(.05, dr); tl = t; S.t += dt; updateFlight(dt, t); const want = S.id && QW.mode === "walk" ? 1 : 0, k0 = S.k;
    S.k += Math.sign(want - S.k) * Math.min(Math.abs(want - S.k), dr / .35);   /* 11-04 P1：こま数でなく時間で 0.35 秒（重い時も 1 秒以内） */ if (S.k !== k0) paint(); requestAnimationFrame(loop); })(tl);
  /* 切り替えを 1 秒以内に：歩きだして手が空いたら、体を一つずつ先に組んでおく（描き方も先に組む） */
  const warm = async () => { for (const id of ["hachi", "suzume", "tanuki"]) { await new Promise(r => (window.requestIdleCallback || setTimeout)(r, { timeout: 1500 })); try { await bodyOf(id); } catch (e) { console.warn("ikimono", id, e); } } };
  { const w = setInterval(() => { if (QW.mode === "walk") { clearInterval(w); setTimeout(warm, 600); } }, 500); }
  QW.ikimono = { go, state: S, list: IKIMONO };
  return QW.ikimono;
}
