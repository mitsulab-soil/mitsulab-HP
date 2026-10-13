/* 実験台 frost：霜柱が立つ（3D・新しく作った実験。2026-10-07）。
   仕組み（教科書の水準）：地面の表面が凍ると、凍った面に下の湿った土から水が吸い上げられ、そこで凍って氷の柱が下から伸び、上の土を持ち上げる。
   火山灰の土（関東ローム）は細かいすきまで水をよく吸い上げ、霜柱がよく立つ。砂は吸い上げる力が弱く、粘土は水の通りが遅く、伸びにくい。
   くもった夜は放射冷却が弱く、冷えこまない。朝、日が当たるととけ、持ち上げられた土が落ちてぬかるむ。
   模型の値（気温の下がり方・伸びる速さ）は目安（測った値ではない）。長さは 4 倍で見せる。 */
import * as THREE from "three";
import { seg, btn, tag, fmt, canvasTex, note, DS, tex } from "./util.js";

const SOIL = { loam: { name: "関東ローム（火山灰の土）", k: 3.5, col: "#5a3a26", top: "#3a2a1e" }, sand: { name: "砂", k: .4, col: "#b9a272", top: "#a08a5c" }, clay: { name: "粘土", k: 1.0, col: "#8a6446", top: "#6e4e36" } };
const SKY = { clear: { name: "晴れ・風なし", tmin: -4 }, cloud: { name: "くもり", tmin: 2 } };
const VIS = 4, NX = 26, NZ = 9, W = 1.1, D = .36, SY = .24;   // 表示は 4 倍
const H0 = 17, H1 = 35;                                        // 17 時〜あくる日の 11 時

export function create(H) {
  const g = new THREE.Group(); const { std, box, cyl } = H;
  const base = box(1.2, .03, .44, std(DS.base, .5)); base.position.y = .015; g.add(base);
  const soilTex = canvasTex(256, 64, (c, w, h) => { c.fillStyle = "#fff"; c.fillRect(0, 0, w, h); for (let i = 0; i < 1200; i++) { const v = 160 + Math.random() * 95; c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3); } });
  const soilM = new THREE.MeshStandardMaterial({ color: SOIL.loam.col, roughness: .95, map: tex("soil_diff", 2, .5), normalMap: tex("soil_nor", 2, .5, false) });   // CC0 の土の写真の質感（Poly Haven farm_soil）
  const block = box(W, SY - .03, D, soilM); block.position.y = .03 + (SY - .03) / 2; g.add(block);
  const topM = new THREE.MeshStandardMaterial({ color: SOIL.loam.top, roughness: .95, map: soilTex });
  const topL = box(W, .006, D, topM); topL.position.y = SY + .003; g.add(topL);
  // 夜空の背景（時刻で色が変わる）と星
  const skyM = new THREE.MeshBasicMaterial({ color: 0x1b2440 }); const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .75), skyM); sky.position.set(0, .45, -D / 2 - .08); g.add(sky);
  const sp = new Float32Array(60 * 3); for (let i = 0; i < 60; i++) sp.set([(Math.random() - .5) * 1.25, .35 + Math.random() * .45, -D / 2 - .075], i * 3);
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: .006, transparent: true, opacity: .9 })); g.add(stars);
  const cloudM = new THREE.MeshBasicMaterial({ color: 0x8a92a0, transparent: true, opacity: 0 }); const cloud = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .3), cloudM); cloud.position.set(0, .7, -D / 2 - .07); g.add(cloud);
  // 霜柱（細い氷の柱）と、柱にのる土のかけら
  const iceM = new THREE.MeshPhysicalMaterial({ color: 0xeaf6ff, roughness: .15, transmission: 0, transparent: true, opacity: .88, emissive: 0x9fc6e8, emissiveIntensity: .12 });
  const N = NX * NZ, ice = new THREE.InstancedMesh(new THREE.CylinderGeometry(.0032, .0036, 1, 6), iceM, N); ice.frustumCulled = false; g.add(ice);
  const cells = []; for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) cells.push({ x: -W / 2 + (i + .5) * W / NX + (Math.random() - .5) * .012, z: -D / 2 + (j + .5) * D / NZ + (Math.random() - .5) * .012, f: .7 + Math.random() * .5, tilt: (Math.random() - .5) * .12, ci: Math.floor(i / 2) * Math.ceil(NZ / 2) + Math.floor(j / 2) });
  const NC = Math.ceil(NX / 2) * Math.ceil(NZ / 2);
  const capM = new THREE.MeshStandardMaterial({ color: SOIL.loam.top, roughness: .95, map: soilTex });
  const caps = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), capM, NC); caps.frustumCulled = false; g.add(caps);
  const capS = Array.from({ length: NC }, (_, k) => ({ r: .9 + Math.random() * .2, rot: Math.random() * 3, fall: 0 }));
  // 苗（持ち上げられる）
  const plant = new THREE.Group(); g.add(plant);
  const stem = cyl(.003, .004, .07, std(0x5f8f3a, .6), 6); stem.position.y = .035; plant.add(stem);
  for (const s of [-1, 1]) { const lf = new THREE.Mesh(new THREE.SphereGeometry(.018, 8, 6), std(0x6aa04a, .6)); lf.scale.set(1.4, .3, .7); lf.position.set(s * .02, .07, 0); lf.rotation.z = s * .4; plant.add(lf); }
  const rootM = new THREE.LineBasicMaterial({ color: 0xe8dcc0 }); const rg = new THREE.BufferGeometry().setFromPoints([0, 1, 2, 3, 4].flatMap(k => [new THREE.Vector3(0, 0, 0), new THREE.Vector3((k - 2) * .008, -.03 - Math.random() * .02, (Math.random() - .5) * .01)]));
  const roots = new THREE.LineSegments(rg, rootM); plant.add(roots);
  // 温度計
  const thG = new THREE.Group(); thG.position.set(W / 2 + .03, .03, D / 2 - .03); g.add(thG);
  const tube = cyl(.008, .008, .34, H.glassMat, 10); tube.position.y = .19; thG.add(tube);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.013, 10, 8), std(0xc0392b, .4)); bulb.position.y = .02; thG.add(bulb);
  const liq = cyl(.004, .004, 1, std(0xc0392b, .4), 8); thG.add(liq);
  const zero = box(.03, .002, .002, std(0x1d2321, .5)); zero.position.y = .19; thG.add(zero);
  const thT = tag("0℃", { w: .06, size: 48 }); thT.position.set(.045, .19, 0); thG.add(thT);
  const sc = note("長さは 4 倍・柱の太さと数は模式", { w: .3 }); sc.position.set(-W / 2 + .1, SY + .2, D / 2); g.add(sc);

  let soil = "loam", sky_ = "clear", run = false, fast = 1, h = H0, L = 0, melt = false, mud = 0;
  const airT = hh => { const tmin = SKY[sky_].tmin; if (hh <= 30.5) return tmin + (6 - tmin) * Math.exp(-(hh - H0) / 4.5) - (6 - tmin) * Math.exp(-13.5 / 4.5) * ((hh - H0) / 13.5); return tmin + (6 - tmin) * THREE.MathUtils.clamp((hh - 30.5) / 3.5, 0, 1); };
  const surfT = hh => airT(hh) - (sky_ === "clear" ? 1.2 : .3);
  function reset() { h = H0; L = 0; melt = false; mud = 0; run = false; paint(); }
  function setSoil(k) { soil = k; soilM.color.set(SOIL[k].col); topM.color.set(SOIL[k].top); capM.color.set(SOIL[k].top); reset(); }
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
  function paint() {
    const len = L / 1000 * VIS;   // m（表示）
    cells.forEach((c, i) => {
      const l = Math.max(.0001, len * c.f);
      E.set(c.tilt, 0, c.tilt * .7); Q.setFromEuler(E); S.set(1, l, 1); V.set(c.x, SY + .006 + l / 2, c.z);
      M4.compose(V, Q, S); ice.setMatrixAt(i, M4);
    });
    ice.instanceMatrix.needsUpdate = true; ice.visible = len > .0005;
    for (let k = 0; k < NC; k++) {
      const cx = Math.floor(k / Math.ceil(NZ / 2)), cz = k % Math.ceil(NZ / 2);
      const x = -W / 2 + (cx + .5) * W / Math.ceil(NX / 2), z = -D / 2 + (cz + .5) * D / Math.ceil(NZ / 2);
      const own = cells.filter(c => c.ci === k), avg = own.length ? own.reduce((s, c) => s + c.f, 0) / own.length : 1;
      const y = SY + .006 + len * avg + .003;
      E.set(0, capS[k].rot, 0); Q.setFromEuler(E); S.set(W / Math.ceil(NX / 2) * capS[k].r, .006, D / Math.ceil(NZ / 2) * capS[k].r); V.set(x, y, z);
      M4.compose(V, Q, S); caps.setMatrixAt(k, M4);
    }
    caps.instanceMatrix.needsUpdate = true; caps.visible = len > .002;
    plant.position.set(0, SY + .006 + len * 1.0, .02); roots.visible = len > .004;
    topM.roughness = .95 - mud * .6; topM.color.set(SOIL[soil].top).multiplyScalar(1 - mud * .35);
    // 空の色（夜→明け方→朝）
    const night = h < 29.5 ? 1 : THREE.MathUtils.clamp(1 - (h - 29.5) / 2.5, 0, 1);
    skyM.color.setRGB(.11 + (1 - night) * .55, .14 + (1 - night) * .62, .25 + (1 - night) * .66);
    stars.material.opacity = sky_ === "clear" ? .9 * night : 0; cloudM.opacity = sky_ === "cloud" ? .85 : 0;
    const T = airT(h); liq.scale.y = THREE.MathUtils.clamp(.17 + T * .012, .02, .32); liq.position.y = .02 + liq.scale.y / 2;
  }
  paint();
  return {
    group: g, focus: { y: .26, dist: 1.5, pitch: .3 }, labelY: 1.0,
    tick(dt, on) {
      if (!on || !run) return;
      const dh = dt * .2 * fast; h = Math.min(H1, h + dh);
      const ts = surfT(h);
      if (ts < -.5 && !melt) L += SOIL[soil].k * Math.min(1, -ts / 3) * dh;
      if (h > 30.5 && ts > .3 && L > 0) { melt = true; L = Math.max(0, L - 16 * dh * Math.min(1, ts / 2)); if (L === 0) mud = Math.min(1, mud + dh); }
      if (melt && L > 0) mud = Math.min(.6, mud + dh * .2);
      if (h >= H1) run = false;
      paint();
    },
    ui(box_) {
      const playB = btn(box_, "▶ 夜を進める", () => { if (h >= H1) reset(); run = !run; playB.textContent = run ? "⏸ とめる" : "▶ 夜を進める"; }, true);
      seg(box_, Object.entries(SOIL).map(([k, v]) => [k, v.name]), soil, k => { setSoil(k); playB.textContent = "▶ 夜を進める"; }, "土の種類");
      seg(box_, Object.entries(SKY).map(([k, v]) => [k, v.name]), sky_, k => { sky_ = k; reset(); playB.textContent = "▶ 夜を進める"; }, "空のようす");
      seg(box_, [[1, "ふつう"], [3, "はやく"]], fast, v => { fast = v; }, "速さ");
      btn(box_, "はじめから", () => { reset(); playB.textContent = "▶ 夜を進める"; });
    },
    read() {
      const hh = h % 24, hm = `${Math.floor(hh)}:${String(Math.floor((hh % 1) * 60)).padStart(2, "0")}`;
      return `<div class="row"><span><span class="k">時刻</span> ${h >= 24 ? "あくる日 " : ""}${hm}</span><span><span class="k">気温（想定）</span> ${fmt(airT(h), 1)} ℃</span><span><span class="k">地面の表面</span> ${fmt(surfT(h), 1)} ℃</span><span><span class="k">霜柱の長さ</span> ${fmt(L, 0)} mm</span></div>
<div class="note">${SOIL[soil].name}・${SKY[sky_].name}。気温の下がり方と伸びる速さは目安（測った値ではない）。長さは 4 倍にして見せています。</div>`;
    },
  };
}
