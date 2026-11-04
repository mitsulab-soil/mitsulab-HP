/* © mitsulab. 生き物の目で歩く（2026-11-04 本人「環世界に入り込むのは依代でなく、リアルな生物の 3D として、sight のように画面の中央に」
   「環世界を変えたまま、自由に移動できるように。sight と同じ操作感」「木や石の環世界に入り込む体験は削除」）。
   設計＝02_プロジェクト/01_公開中（HP公開）/01_Qualium_大宮/資料/設計_生き物の目と町の依代_2026-11-04.md
   ・生き物の写実の 3D（Qualia/sight の creatures.js の写し＝creatures_sight.js）を画面の中央・少し下に置く（sight と同じ置き方）。
   ・歩く操作はそのまま（押した所へ歩く・なぞって見回す・壁や物は本体の当たり判定で通り抜けない）。目の高さと色の受けとり方だけを変える。
   ・軽さ：色は canvas の CSS フィルタ（色の行列）1 つ。体は一体だけ（切り替えのとき作り、描き方を先に組む）。視点は描く直前にだけ差しかえ、描いたあと戻す。
   ・見え方は受けとる細胞の感度からの模式（主観の再現ではない）。数は出典で確かめた幅だけ。Wikipedia は出典にしない。 */
import * as THREE from "three";
import { LENS } from "./umwelt_lens.js?v=2";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
/* 2026-11-04 写実の 3D（Sketchfab・CC BY・Objaverse 経由）。読み込むまではコードの体を出し、読めたら差しかえる。
   柴犬＝"Animated Dog, Shiba Inu" by quander／ジャイアントスワローテイル＝"Papilio cresphontes - Giant Swallowtail" by frankmcmains（出典は CREDITS） */
export const CREDITS = [
  "柴犬の 3D：\"Animated Dog, Shiba Inu\" by quander（https://sketchfab.com/3d-models/animated-dog-shiba-inu-9abfce885a834399b2c3ccaed51cd474）CC BY 4.0・mitsulab が軽量化",
  "蝶の 3D：\"Papilio cresphontes - Giant Swallowtail\" by frankmcmains（https://sketchfab.com/3d-models/papilio-cresphontes-giant-swallowtail-2671fc15b02642bfb20507c6e5f14d6b）CC BY 4.0・mitsulab が軽量化"];
const GLB = { inu: { f: "shiba.glb", clip: "standing", rx: 0, ry: 0, foot: true }, chou: { f: "ageha.glb", rx: -Math.PI / 2 + .12, ry: Math.PI, flap: true } };
const M_CHOU_RX = GLB.chou.rx;
export const IKIMONO = {
  hachi: { name: "ミツバチ", make: "hachi", lens: "hachi", mix: .55, eye: 1.0, fov: 62, back: .5, up: .16, size: .16, bob: .03, fly: true,
    say: "ミツバチの目に寄せました。人に見えない光〔紫外〕を青に、青を緑に置きかえた模式です。音は低いふるえだけに絞りました。花は、どこが光って見えますか。", band: [20, 500],
    sources: [{ claim: "受けとる細胞は紫外・青・緑の三種類（約 340・435・540 nm）", cite: "Peitsch D et al. (1992) J. Comp. Physiol. A 170:23–40" }, { claim: "空気の音は触角のジョンストン器官で、数百 Hz の低いふるえとして受ける", cite: "Dreller C & Kirchner WH (1993) J. Comp. Physiol. A 173:275–279" }] },
  chou: { name: "アゲハチョウ科", make: "chou", lens: "chou", mix: .8, eye: 1.3, fov: 62, back: .5, up: .3, size: .12, bob: .06, fly: true,
    say: "アゲハチョウ科の目に寄せました。色の見え方は、アゲハ属のナミアゲハで測られた、紫外から赤までを見分ける目の模式です。体は北米のジャイアントスワローテイルです。葉の色の違いは、どう見えますか。",
    sources: [{ claim: "ナミアゲハ（アゲハチョウ科）の複眼は紫外から赤まで感じる細胞をもつ", cite: "Koshitaka H et al. (2008) J. Exp. Biol. 211:1223–1230" }] },
  tori: { name: "シジュウカラ", make: "tori", lens: "tori", mix: .8, eye: 1.1, fov: 60, back: .44, up: .12, size: .3, bob: .02, fly: true,
    say: "小鳥の目に寄せました。多くの鳥は紫外も見るとされ、ここでは紫の光に置きかえています。音は鳥のよく聴こえる帯に寄せています。枝の高さから、道はどう見えますか。", band: [300, 8000],
    sources: [{ claim: "多くの鳥は紫外に感じる錐体を含む四色型", cite: "Hart NS (2001) Prog. Retin. Eye Res. 20:675–703" }, { claim: "鳥のよく聴こえる帯はおよそ 1〜4 kHz", cite: "Dooling RJ (1982) Acoustic Communication in Birds, Academic Press" }] },
  inu: { name: "イヌ", make: "inu", lens: "inu", mix: 1, eye: 0, fov: 60, back: 1.05, up: .62, size: .55, bob: .015, fly: false,
    say: "イヌの目の高さと色に寄せました。青と黄緑あたりの二色で見る模式です。赤い色のものは、どんな色に見えますか。", band: [67, 20000],
    sources: [{ claim: "イヌは二色型の色覚", cite: "Neitz J, Geist T, Jacobs GH (1989) Vis. Neurosci. 3:119–125" }, { claim: "イヌの聞こえる帯はおよそ 67 Hz〜45 kHz（人より高い音まで。画面では 20 kHz より上は鳴らせない）", cite: "Heffner HE & Heffner RS (2007) Lab Animal 36(9):33–37" }] },
};
export function attachIkimono(QW, opt = {}) {
  const { camera, scene } = QW, canvas = opt.canvas || document.getElementById("gl") || QW.renderer?.domElement, speak = opt.speak || (() => { });
  const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute";
  svg.innerHTML = '<filter id="ikF" color-interpolation-filters="linearRGB"><feColorMatrix id="ikM" type="matrix"/></filter>';
  document.body.appendChild(svg); const fm = svg.querySelector("#ikM");
  const S = { id: null, body: null, k: 0, t: 0, saved: null }, cache = {};
  let mod = null;
  const pend = {};
  function bodyOf(id) { return cache[id] ? Promise.resolve(cache[id]) : (pend[id] ||= build(id)); }
  async function build(id) {
    const P = IKIMONO[id];
    mod ||= await import("./creatures_sight.js?v=3");
    const c = P.make === "hachi" ? mod.makeBee(undefined, { state: "fly" }) : P.make === "chou" ? mod.makeButterfly("ageha") : P.make === "tori" ? mod.makeTit() : mod.makeDog();
    const g = new THREE.Group(); c.scale.setScalar(P.size); g.add(c); g.userData.c = c;
    g.traverse(o => { o.frustumCulled = false; if (o.isMesh) { o.castShadow = false; o.renderOrder = 5; } });
    g.visible = false; scene.add(g);
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
  function paint() { if (!canvas) return; if (S.k < .01) { canvas.style.filter = ""; return; } const P = IKIMONO[S.id || S.last]; if (!P) return; fm.setAttribute("values", lensMatrix(P, S.k)); canvas.style.filter = "url(#ikF)"; }
  async function go(id) {   // id＝生き物（同じものをもう一度＝人の目へ戻る）
    if (!id || id === S.id) { S.id = null; document.body.classList.remove("iki"); QW.sndBand?.(); opt.onChange?.(null); return null; }
    const P = IKIMONO[id]; if (!P) return null; const t0 = performance.now();
    { const cr = document.getElementById("credit"); if (cr && !cr.textContent.includes("quander")) cr.textContent += "／" + CREDITS.join("／"); }   // 写実の 3D の出典（CC BY）をクレジットに足す
    const b = await bodyOf(id); for (const k in cache) cache[k].visible = false;
    S.id = id; S.last = id; S.body = b; document.body.classList.add("iki"); opt.onChange?.(id);
    QW.sndBand?.(...(P.band || [20, 20000])); navigator.userActivation?.hasBeenActive !== false && navigator.vibrate?.(P.fly ? [6, 40, 6] : 14);   // 音の帯と、体の入れかわりの小さな振動（模式）
    speak([{ t: P.say, tc: P.say }]); QW.ikiT = performance.now() - t0; return id;
  }
  /* 2026-11-04 本人「生き物の目から見る視点はやめ、sight と同じように少し後ろから見る」：
     体は歩く人の足もとの位置（飛ぶものは P.eye の高さ）に置き、カメラは後ろ・少し上からゆるくついていく。
     体は画面の中央の少し下。見回し（向き）は歩く操作の向きをそのまま使う。描く直前にだけ差しかえ、描いたあと戻す。 */
  const F = new THREE.Vector3(), D = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), L = new THREE.Vector3(), E = new THREE.Euler(0, 0, 0, "YXZ");
  const pb = scene.onBeforeRender, pa = scene.onAfterRender; let lastR = performance.now();
  scene.onBeforeRender = function (...a) {
    pb && pb.apply(this, a);
    const P = IKIMONO[S.id || S.last]; if (!P || S.k < .01 || QW.mode !== "walk") { for (const k in cache) cache[k].visible = false; S.cam = null; return; }
    const now = performance.now(), dt = Math.min(.1, (now - lastR) / 1000); lastR = now;
    S.saved = { p: camera.position.clone(), q: camera.quaternion.clone(), fov: camera.fov };
    const gy = QW.groundAt ? QW.groundAt(camera.position.x, camera.position.z) : camera.position.y - 1.55;
    E.setFromQuaternion(camera.quaternion); camera.getWorldDirection(D); F.set(D.x, 0, D.z).normalize();
    // 体の位置：人の足もと（飛ぶものは少し浮かせて、ゆるく上下）
    B.set(camera.position.x, gy + P.eye + (P.fly ? Math.sin(S.t * 1.7) * P.bob : 0), camera.position.z);
    // 体の向きは進む向きへゆるく回す
    S.yaw = S.yaw == null ? E.y : S.yaw + Math.atan2(Math.sin(E.y - S.yaw), Math.cos(E.y - S.yaw)) * Math.min(1, dt * 6);
    // カメラの行き先：体の後ろ・少し上。見上げ・見下ろしは少しだけ効かせる
    const pm = camera.aspect < 1 ? 1.75 : 1, back = P.back * pm, up = P.up * pm;   // 縦長の画面（スマホ）は少し引いて、体が字幕にかからないように
    const pit = 0;   // 見上げ・見下ろしで体が画面から外れないよう、カメラの高さと向きは一定（sight と同じ）
    C.copy(B).addScaledVector(F, -back * Math.cos(pit * .6)); C.y += up - Math.sin(pit * .6) * back;
    { const gc = QW.groundAt ? QW.groundAt(C.x, C.z) : gy; if (C.y < gc + .12) C.y = gc + .12; }
    S.cam = S.cam ? S.cam.lerp(C, Math.min(1, dt * 7)) : C.clone();
    const k = S.k; camera.position.copy(S.cam);   // 11-04 P1：位置は混ぜない（混ぜている間、体がカメラの真下に隠れて碧だけが見えた）
    L.copy(B).addScaledVector(F, back * .9); L.y += up * .25 - (camera.aspect < 1 && !P.fly ? .3 : 0);   // 11-04 P2：縦長の画面では、地を歩く体を少し上に見せて下の字幕にかけない   // 少し先を見る＝体は画面の中央の少し下
    camera.lookAt(L);
    camera.fov = S.saved.fov + (P.fov - S.saved.fov) * k; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    { const A = QW.AOI?.root; if (A && S.id && A.visible) { A.visible = false; S.aoiHid = true; } if (QW.AOISH?.visible && S.id) { QW.AOISH.visible = false; S.shHid = true; } }   // 11-04 P1：生き物の目のあいだ、碧は中央に立たない（描くときだけ外す）
    const b = S.body; if (b && S.id) {
      b.position.copy(B); b.rotation.set(0, S.yaw + Math.PI, 0); b.visible = true;
      const mv = S.prevB ? S.prevB.distanceTo(B) / Math.max(dt, 1e-3) > .15 : false; (S.prevB ||= new THREE.Vector3()).copy(B);
      const cu = b.userData.c.userData; cu.animate?.(S.t, P.fly ? true : mv);
      const gb = b.userData.glb; if (gb) { gb.mixer?.update(dt); if (gb.flap) { const ph = S.t * 9, f = .5 + .5 * Math.cos(ph); gb.w2.scale.set(gb.k * (.45 + .55 * f), gb.k * (1 + .5 * (1 - f)), gb.k); gb.w2.rotation.x = M_CHOU_RX + .18 * Math.sin(ph); gb.w2.position.y = gb.y0 + .004 * Math.sin(ph); }   /* 11-04 P2：後ろ・少し上から見て、翅が上がると幅が狭まり厚みが立つ（一枚の形を、上下の打ちと体のしゃくりで模式に） */ }   // 写実の蝶は翅を一枚の形で持つので、横の幅でゆるくはばたかせる（模式）
      else if (P.make === "chou" && cu.wings) { const bd = cu.wings[0].piv.parent; bd.position.multiplyScalar(.25); bd.rotation.x *= .3; bd.rotation.y *= .3; bd.rotation.z *= .3; }   // 後ろから見るとき、アゲハの体のぶれを抑える（翅が片方だけ伸びて見えた・2026-11-04）
      b.updateMatrixWorld(true);
    }
  };
  scene.onAfterRender = function (...a) { pa && pa.apply(this, a); if (S.aoiHid) { S.aoiHid = false; if (QW.AOI?.root) QW.AOI.root.visible = true; } if (S.shHid) { S.shHid = false; QW.AOISH.visible = true; } const s = S.saved; if (s) { camera.position.copy(s.p); camera.quaternion.copy(s.q); camera.fov = s.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true); S.saved = null; } };
  let tl = performance.now();
  (function loop(t) { const dr = Math.min(.5, (t - tl) / 1000), dt = Math.min(.05, dr); tl = t; S.t += dt; const want = S.id && QW.mode === "walk" ? 1 : 0, k0 = S.k;
    S.k += Math.sign(want - S.k) * Math.min(Math.abs(want - S.k), dr / .35);   /* 11-04 P1：こま数でなく時間で 0.35 秒（重い時も 1 秒以内） */ if (S.k !== k0) paint(); requestAnimationFrame(loop); })(tl);
  /* 切り替えを 1 秒以内に：歩きだして手が空いたら、体を一つずつ先に組んでおく（描き方も先に組む） */
  const warm = async () => { for (const id of ["inu", "chou", "hachi", "tori"]) { await new Promise(r => (window.requestIdleCallback || setTimeout)(r, { timeout: 1500 })); try { await bodyOf(id); } catch (e) { console.warn("ikimono", id, e); } } };
  { const w = setInterval(() => { if (QW.mode === "walk") { clearInterval(w); setTimeout(warm, 600); } }, 500); }
  QW.ikimono = { go, state: S, list: IKIMONO };
  return QW.ikimono;
}
