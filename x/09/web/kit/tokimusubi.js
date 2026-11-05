/* © mitsulab. 夜の行事「時結びの杜」（武蔵一宮氷川神社ライトアップイベント）を、会期の夜だけ控えめに描く（2026-11-05 本人の指示）。
   出典（一次）：さいたま市「武蔵一宮氷川神社ライトアップイベント「時結びの杜」」https://www.city.saitama.lg.jp/003/002/018/oomiya/p133085.html
   会期＝令和8年11月7日〜11月23日。月〜木 17:30〜20:00、金・土・日・祝 17:30〜21:00。二の鳥居・三の鳥居等のライトアップ、楼門等へのプロジェクションマッピング。
   描くのは「下から照らされた光」だけ（2026-11-05 改：鳥居と楼門そのものが足もとから照らされ、柱の根元に灯りの溜まりが見える形に。宙に浮いた靄は使わない）。
   楼門の「光の映像」は絵柄を写さず、色の淡い移ろいだけで示す。行事の映像・意匠（プロジェクションの絵柄・ロゴ）は写さない。会期の外や昼は何も出さない。
   試すとき：URL に ?toki=1 */
import * as THREE from "three";

const SPOTS = [   // structures.glb と同じ座標（struct_place.json）。h＝照らされる高さの目安。id＝歩く目の実寸の構造物（app.js が o.name に入れる）
  { n: "二の鳥居", id: "torii_2", p: [-21.0, 12.63, -425.5], h: 13 },
  { n: "三の鳥居", id: "torii_3", p: [-47.4, 13.77, -862.2], h: 7.5 },
  { n: "楼門", id: "romon", p: [-89.0, 12.87, -1000.6], h: 11, show: true },
];
const SAY = "いまは、さいたま市の「時結びの杜」の会期中です。夜、二の鳥居や三の鳥居がライトアップされ、楼門には光の映像が映される催しです。ここでは、その光を模式で重ねています。";
const HOLI = ["2026-11-23"];   // 会期中の祝日（勤労感謝の日）
const WARM = new THREE.Color(1.0, .74, .46);

function jstNow() { const d = new Date(Date.now() + 9 * 3600e3); return { ymd: d.toISOString().slice(0, 10), dow: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes() }; }
export function inSession(force) {
  if (force) return true;
  const t = jstNow(); if (t.ymd < "2026-11-07" || t.ymd > "2026-11-23") return false;
  const late = t.dow === 0 || t.dow === 5 || t.dow === 6 || HOLI.includes(t.ymd);
  return t.min >= 17 * 60 + 30 && t.min < (late ? 21 : 20) * 60;
}

/* 材質に「足もとから照らす光」を足す：世界の高さで根元ほど明るく、上へ行くほど弱く（投光器で下から照らした見え方の模式） */
function uplit(m, U) {
  const c = m.clone(); c.name = m.name + "_toki";
  c.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vTkW; varying vec3 vTkN;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvTkW = (modelMatrix * vec4(transformed, 1.)).xyz; vTkN = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vTkW; varying vec3 vTkN; uniform float tkOn; uniform float tkB; uniform float tkH; uniform vec3 tkC; uniform vec3 tkC2; uniform float tkT; uniform float tkShow;")
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
if (tkOn > .001) { float y = (vTkW.y - tkB) / tkH; float k = exp(-3.0 * max(y, 0.)) * (1. - smoothstep(1.05, 1.25, y)); float side = .55 + .45 * clamp(1. - abs(vTkN.y), 0., 1.);
  vec3 col = tkC;
  if (tkShow > .5) { float w = smoothstep(.25, .85, .5 + .5 * sin(vTkW.x * .3 + vTkW.z * .3 + vTkW.y * .18 - tkT * .5)); col = mix(tkC, tkC2, w); k = max(k, .6 * (1. - smoothstep(.85, 1.1, y))); }
  totalEmissiveRadiance += (diffuseColor.rgb + .12) * col * (k * side * tkOn * 7.5); }`);
  };
  c.customProgramCacheKey = () => (m.customProgramCacheKey?.() || "") + "|toki";
  return c;
}

export function attachTokimusubi(q, { speak } = {}) {
  const force = /[?&]toki=1/.test(location.search);
  // 足もとの灯りの溜まり（地面に置いた円・柱の根元の小さな器具の光）。一枚の絵を使い回す
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,236,205,1)"); gr.addColorStop(.12, "rgba(255,214,160,.85)"); gr.addColorStop(.45, "rgba(255,196,140,.42)"); gr.addColorStop(1, "rgba(255,190,130,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const poolMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9, fog: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4 });
  const poolGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const grp = new THREE.Group(); grp.visible = false; grp.name = "tokimusubi"; (q.world || q.scene).add(grp);
  const U = { tkOn: { value: 0 }, tkT: { value: 0 } };
  let lit = false; const ready = [], gy = (x, z, y0) => { const g = q.groundAt?.(x, z); return Number.isFinite(g) && Math.abs(g - y0) < 3 ? g : y0; };   // 地面の高さ（構造物の基準と少し違う所がある）
  function prepare(S) {   // 実寸の構造物が届いたら、材質を足もとから照らすものに差しかえ、柱の根元に灯りを置く
    let obj = null; (q.world || q.scene).traverse(o => { if (!obj && o.name === S.id && Math.abs(o.scale.x - 1) < .01) obj = o; });
    if (!obj) return false;
    const u = { ...U, tkB: { value: S.p[1] }, tkH: { value: S.h }, tkC: { value: WARM }, tkC2: { value: new THREE.Color(.62, .72, 1.0) }, tkShow: { value: S.show ? 1 : 0 } };
    const low = [], cache = new Map(); obj.updateMatrixWorld(true);
    obj.traverse(o => { if (!o.isMesh || !o.material) return;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      const nm = ms.map(m => { if (!cache.has(m)) cache.set(m, uplit(m, u)); return cache.get(m); }); o.userData.tkOrig = o.material; o.userData.tkLit = Array.isArray(o.material) ? nm : nm[0];
      const pa = o.geometry.attributes.position, v = new THREE.Vector3();   // 根元（地面から 1.2 m まで）の点を集める＝柱の位置
      for (let i = 0; i < pa.count; i += Math.max(1, pa.count / 4000 | 0)) { v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld); if (v.y < S.p[1] + 1.2) low.push([v.x, v.z]); } });
    // 根元の点を、置かれた向きの左右に分けて柱ごとの中心を出す（鳥居＝2 本。楼門＝正面の左右）
    const rot = (q.world || q.scene).getObjectByName?.(S.id)?.rotation?.y ?? 0, ax = [Math.cos(rot), -Math.sin(rot)];
    const L = [], R = []; for (const [x, z] of low) ((x - S.p[0]) * ax[0] + (z - S.p[2]) * ax[1] < 0 ? L : R).push([x, z]);
    const feet = [L, R].filter(a => a.length > 3).map(a => { const m = a.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]); return [m[0] / a.length, m[1] / a.length]; });
    const span = feet.length === 2 ? Math.hypot(feet[0][0] - feet[1][0], feet[0][1] - feet[1][1]) : 6;
    for (const [x, z] of feet) {
      const pool = new THREE.Mesh(poolGeo, poolMat); pool.position.set(x, Math.max(gy(x, z, S.p[1]), S.p[1]) + .18, z); pool.scale.setScalar(Math.min(6, Math.max(3, span * .5))); pool.renderOrder = 3; grp.add(pool);
      const dot = new THREE.Mesh(poolGeo, poolMat); dot.position.set(x + (S.p[0] - x) * .08, Math.max(gy(x, z, S.p[1]), S.p[1]) + .22, z + (S.p[2] - z) * .08); dot.scale.setScalar(1.1); dot.renderOrder = 3; grp.add(dot);   // 器具そのものの小さな光
    }
    if (S.show) { const f = new THREE.Mesh(poolGeo, poolMat); { const fx = S.p[0] + Math.sin(rot) * 6, fz = S.p[2] + Math.cos(rot) * 6; f.position.set(fx, Math.max(gy(fx, fz, S.p[1]), S.p[1]) + .18, fz); } f.scale.set(12, 1, 5); f.rotation.y = rot; f.renderOrder = 3; grp.add(f); }
    ready.push({ S, obj }); if (lit) obj.traverse(o => { if (o.userData.tkLit) o.material = o.userData.tkLit; });   // 夜のうちに届いたものも、すぐ照らす
    try { const mats = [...cache.values()]; const tmp = new THREE.Group(); for (const m of mats) tmp.add(new THREE.Mesh(poolGeo, m)); q.renderer?.compileAsync?.(tmp, q.camera, q.scene).catch(() => { }); } catch { }   // 夜に切り替える前に描き方を用意（切り替えで止まらない）
    return true;
  }
  const want = SPOTS.slice();
  const prep = setInterval(() => { for (let i = want.length - 1; i >= 0; i--) if (prepare(want[i])) want.splice(i, 1); if (!want.length) clearInterval(prep); }, 1500);
  let said = false;
  const setLit = on => { if (on === lit) return; lit = on; for (const { obj } of ready) obj.traverse(o => { if (o.userData.tkLit) o.material = on ? o.userData.tkLit : o.userData.tkOrig; }); };
  let t0 = performance.now();
  (function loop() { const n = performance.now(); U.tkT.value += (n - t0) / 1000; t0 = n; const w = grp.visible ? 1 : 0; U.tkOn.value += (w - U.tkOn.value) * .08; poolMat.opacity = .9 * U.tkOn.value; if (U.tkOn.value < .002 && !grp.visible) setLit(false); requestAnimationFrame(loop); })();
  const tick = () => {
    const night = force || ((q.sunAE?.[1] ?? 0) < -4);
    const on = inSession(force) && night && q.mode === "walk"; grp.visible = on; if (on) setLit(true);
    if (on && !said && q.camera) {
      const p = q.camera.position; if (SPOTS.some(s => Math.hypot(s.p[0] - p.x, s.p[2] - p.z) < 70)) {
        const cap = document.getElementById("caption"), v = document.getElementById("voice");
        if (!((cap && !cap.hidden) || (v && !v.paused))) { said = true; speak?.([{ t: SAY, tc: SAY }]); }
      }
    }
  };
  setInterval(tick, 1000); tick();
  return { group: grp, inSession: () => inSession(force) };
}
