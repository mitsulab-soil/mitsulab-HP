/* © mitsulab. 依代の輪（2026-11-03 本人「依代の 3D モデルを円状に並べ、そこから選ぶ。選択中の依代が手前に来て、左右に円を回転させて選ぶ。斜め上から眺める構図」）。大宮だけ。
   ・X 感を押すと画面の下寄りに開く。スワイプ・ドラッグ・←→キー・左右の小さな印で回る。手前の一体を押すと、その生き物の目へ入る。
   ・軽さ：開いたときだけ作り・読み、閉じると描くのを止める。並ぶ姿は低ポリの写し（kit/envAgents/yorishiro/ring/・元の形を gltf-transform で間引いたもの）。 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
const BASE = new URL("../kit/envAgents/yorishiro/ring/", import.meta.url).href;
const GLB = { suzume: "suzume", hachi: "mitsubachi", tanuki: "tanuki", ishi: "ishi", ki: "ki", hiyodori: "tori" };
export function makeYoRing(items, onEnter) {
  const css = document.createElement("style"); css.textContent = `
#qRing{position:fixed;left:50%;transform:translateX(-50%) translateY(14px);bottom:calc(max(12px,env(safe-area-inset-bottom)) + 70px);z-index:7;width:min(calc(100vw - 24px),440px);height:214px;
 opacity:0;pointer-events:none;transition:opacity .35s,transform .35s;font-family:var(--mincho,"Shippori Mincho","Hiragino Mincho ProN","Yu Mincho",serif);color:#eef3f6;
 border-radius:26px;background:radial-gradient(120% 90% at 50% 70%,rgba(8,14,24,.5),rgba(8,14,24,.18) 70%,transparent);touch-action:pan-y}
#qRing.open{opacity:1;pointer-events:auto;transform:translateX(-50%)}
#qRing canvas{position:absolute;inset:0;width:100%;height:100%;cursor:grab}
#qRing .nm{position:absolute;left:0;right:0;bottom:12px;text-align:center;pointer-events:none;text-shadow:0 0 4px #000,0 0 10px rgba(0,0,0,.7)}
#qRing .nm b{display:block;font-weight:500;font-size:15px;letter-spacing:.14em}#qRing .nm small{display:block;margin-top:4px;font-size:10.5px;line-height:1.55;letter-spacing:.12em;opacity:.78;white-space:pre-line}
#qRing .ar{all:unset;position:absolute;top:50%;margin-top:-34px;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(238,243,246,.85);-webkit-tap-highlight-color:transparent}
#qRing .ar:hover{color:#fff}#qRing .ar svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}
#qRing .ar.l{left:4px}#qRing .ar.r{right:4px}#qRing .ar:focus-visible{outline:1px solid rgba(255,255,255,.7)}
body.qRingOpen #caption{opacity:0!important;visibility:hidden!important}
@media (prefers-reduced-motion:reduce){#qRing{transition:none}}`;
  document.head.appendChild(css);
  const el = document.createElement("div"); el.id = "qRing"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "依代をえらぶ");
  el.innerHTML = `<canvas aria-hidden="true"></canvas><button class="ar l" type="button" aria-label="左へ回す"><svg viewBox="0 0 24 24"><path d="M14.5 6l-6 6 6 6"/></svg></button><button class="ar r" type="button" aria-label="右へ回す"><svg viewBox="0 0 24 24"><path d="M9.5 6l6 6-6 6"/></svg></button><div class="nm"><b></b><small></small></div>`;
  document.body.appendChild(el);
  const cv = el.querySelector("canvas"), nmB = el.querySelector(".nm b"), nmS = el.querySelector(".nm small");
  const N = items.length, STEP = Math.PI * 2 / N, R = 1.05;
  let G = null, cur = 0, rot = 0, rotT = 0, open = false, raf = 0, t0 = 0;
  function build() {
    const r = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, powerPreference: "low-power" }); r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.outputColorSpace = THREE.SRGBColorSpace;
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 20); cam.position.set(0, 1.4, 3.05); cam.lookAt(0, .16, .3);   // 斜め上から輪を眺める
    sc.add(new THREE.HemisphereLight(0xeef4ff, 0x40382c, 1.5)); const d = new THREE.DirectionalLight(0xfff4e6, 1.8); d.position.set(1.5, 3, 2); sc.add(d);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, .004, 6, 128), new THREE.MeshBasicMaterial({ color: 0x9fd6d0, transparent: true, opacity: .55 })); ring.rotation.x = Math.PI / 2; sc.add(ring);   // 碧の髪の色の細い輪
    const spot = new THREE.Mesh(new THREE.CircleGeometry(.36, 40), new THREE.MeshBasicMaterial({ color: 0xbfe8e2, transparent: true, opacity: .14, depthWrite: false })); spot.rotation.x = -Math.PI / 2; spot.position.set(0, .002, R); sc.add(spot);   // 手前の台
    const fit = (g, m) => { const b = new THREE.Box3().setFromObject(m), s = new THREE.Vector3(); b.getSize(s); const k = .52 / Math.max(s.x, s.y, s.z, .001); m.scale.multiplyScalar(k); b.setFromObject(m); m.position.set(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); g.add(m); };
    const pods = items.map((it, i) => { const g = new THREE.Group(); sc.add(g); const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
      if (it.id === "hachi") { import(new URL("../kit/creatures.js", import.meta.url).href).then(({ makeBee }) => {   /* 11-03 P2：輪のミツバチを、体節・翅脈・毛まで作った写実の形（kit/creatures.js・自作）に。目印に碧の髪の色の葉の房 */
          const b = makeBee(undefined, { state: "fly" }), w = new THREE.Group(); w.add(b); b.rotation.y = Math.PI / 2;
          const ml = new THREE.MeshStandardMaterial({ color: 0x5fa7a0, roughness: .5 }); for (let j = 0; j < 3; j++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), ml); l.scale.set(.55, 1.6, .3); l.position.set((j - 1) * .028, .2 + (j === 1 ? .01 : 0), 0); l.rotation.z = (1 - j) * .38; w.add(l); }
          fit(g, w); g.userData.anim = t => b.userData.animate?.(t, true); }).catch(e => console.warn("yoring", it.id, e)); return g; }
      ld.loadAsync(BASE + (GLB[it.id] || it.id) + ".glb").then(gl => { const m = gl.scene, b = new THREE.Box3().setFromObject(m), s = new THREE.Vector3(); b.getSize(s); const k = .52 / Math.max(s.x, s.y, s.z, .001); m.scale.setScalar(k); b.setFromObject(m); m.position.set(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); g.add(m); }).catch(e => console.warn("yoring", it.id, e));
      return g; });
    G = { r, sc, cam, pods };
  }
  function label() { const it = items[cur]; nmB.textContent = it.n; nmS.textContent = it.s + "\n押すと、その受けとり方へ"; }
  function size() { const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return; G.r.setSize(w, h, false); G.cam.aspect = w / h; G.cam.fov = w < 360 ? 34 : 30; G.cam.updateProjectionMatrix(); }
  function frame(tt) { if (!open) { raf = 0; return; } raf = requestAnimationFrame(frame); const dt = Math.min(.05, (tt - (t0 || tt)) / 1000); t0 = tt;
    rot += (rotT - rot) * Math.min(1, dt * 7);
    G.pods.forEach((g, i) => { const a = i * STEP - rot, f = (Math.cos(a) + 1) / 2; g.position.set(Math.sin(a) * R, 0, Math.cos(a) * R); g.scale.setScalar(.72 + .68 * f * f); g.rotation.y = a + (i === cur ? Math.sin(tt / 1400) * .5 : 0); g.userData.anim?.(tt / 1000); });
    G.r.render(G.sc, G.cam); lift(dt); }
  let vo = 0;   /* 11-03：スマホは輪が碧の裾に重なるので、輪をひらく間だけ風景を上へずらす（カメラの描く窓をずらすだけ・重さは増えない） */
  function lift(dt) { const c = window.__qw?.camera; if (!c) return; const want = open && innerWidth < 600 ? Math.min(230, innerHeight * .27) : 0; vo += (want - vo) * Math.min(1, dt * 6); if (Math.abs(vo) < .5 && !want) { vo = 0; c.clearViewOffset(); return; } c.setViewOffset(innerWidth, innerHeight, 0, vo, innerWidth, innerHeight); }
  function go(d) { cur = (cur + d + N) % N; rotT += d * STEP; label(); navigator.vibrate?.(5); }
  function show(i) { if (!G) build(); if (i != null && i >= 0) { const d = i - cur; cur = i; rotT += d * STEP; rot = rotT; } open = true; el.classList.add("open"); document.body.classList.add("qRingOpen"); label(); requestAnimationFrame(() => { size(); if (!raf) raf = requestAnimationFrame(frame); }); }
  function hide() { open = false; el.classList.remove("open"); document.body.classList.remove("qRingOpen"); vo = 0; window.__qw?.camera?.clearViewOffset(); }
  el.querySelector(".ar.l").addEventListener("click", () => go(-1)); el.querySelector(".ar.r").addEventListener("click", () => go(1));
  let dn = null;
  cv.addEventListener("pointerdown", e => { dn = { x: e.clientX, y: e.clientY, r: rotT, mv: 0 }; cv.setPointerCapture?.(e.pointerId); });
  cv.addEventListener("pointermove", e => { if (!dn) return; const dx = e.clientX - dn.x; dn.mv = Math.max(dn.mv, Math.abs(dx)); if (dn.mv > 8) { rotT = dn.r - dx / 110; rot = rotT; } });
  cv.addEventListener("pointerup", e => { if (!dn) return; const d0 = dn; dn = null;
    if (d0.mv > 8) { const k = Math.round(rotT / STEP); rotT = k * STEP; cur = ((k % N) + N) % N; label(); return; }
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;   // 手前の一体（画面の中ほどの下）を押すと入る。左右の奥を押すと、そちらへ回る
    if (x > .3 && x < .7 && y > .3) { hide(); onEnter(cur); } else if (x <= .3) go(-1); else if (x >= .7) go(1); });
  addEventListener("keydown", e => { if (!open) return; if (/^(ArrowLeft|ArrowRight|Enter|Escape)$/.test(e.key)) e.stopImmediatePropagation(); if (e.key === "ArrowLeft") { go(-1); e.preventDefault(); } else if (e.key === "ArrowRight") { go(1); e.preventDefault(); } else if (e.key === "Enter") { hide(); onEnter(cur); e.preventDefault(); } else if (e.key === "Escape") hide(); }, true);
  addEventListener("resize", () => { if (open && G) size(); });
  return { show, hide, get open() { return open; }, get cur() { return cur; } };
}
