/* 実験台 phi：主体を選びかえる（Qualia Lab・2026-10-20）。
   同じ場所 E（夏の夕方の、林のへりの小さな庭）を、受けとる主体 S（人・ミツバチ・コウモリ・録音機・サーモカメラ）に替えて見る。
   庭の形は一つも変えない。変えるのは「その主体に届く手がかり」を人の目に写した模式だけ（q＝Φ(E, S)）。
   典拠：可視光・可聴域（教科書水準）／ミツバチの視細胞（Peitsch ほか 1992）／紫外線の蜜標（教科書水準）／反響定位（Griffin 1958）／標本化定理／熱画像。
   ミツバチの色は偽色の慣習（紫外線→青・青→緑・緑→赤）。温度・鳴き声の高さの絵・コウモリの飛び方は決めた値。 */
import * as THREE from "three";
import { seg, tag, note, DS, canvasTex, tex } from "./util.js";

const SUBJ = ["human", "bee", "bat", "rec", "therm"];
const SUBJ_NAME = { human: ["人", "Person"], bee: ["ミツバチ", "Honeybee"], bat: ["コウモリ", "Bat"], rec: ["録音機（48 kHz）", "Recorder (48 kHz)"], therm: ["サーモカメラ", "Thermal camera"] };
// 板に出す「届く／届かない」。印＝doc（資料の記載）・est（計算の推定）・set（決めた値）
const READS = {
  human: { yes: [["花の色（およそ 380〜780 nm の光）", "Flower colours (light of about 380–780 nm)", "doc"], ["コオロギの声（数 kHz）", "The cricket's song (a few kHz)", "doc"], ["石の温かさ（手で触れれば）", "The stone's warmth (if you touch it)", "doc"]],
           no: [["花びらの紫外線の模様", "Ultraviolet patterns on the petals", "doc"], ["この台のコウモリの声（模式では 40〜60 kHz）", "This bat's calls (40–60 kHz in this model)", "set"]] },
  bee: { yes: [["紫外線・青・緑の光", "Ultraviolet, blue and green light", "doc"], ["黄色い花の、的のような紫外線の模様", "Bullseye ultraviolet patterns on yellow flowers", "doc"]],
         no: [["赤を受けもつ細胞はない（赤い花は目立ちにくい）", "No cells for red (red flowers stand out less)", "doc"]],
         note: ["色は、紫外線→青・青→緑・緑→赤に置きかえて、人の目で見られるようにした絵（模式・計算の推定）。目のこまかさは人よりずっと粗いが、この模式では表していない。", "Colours remapped for human eyes: UV as blue, blue as green, green as red (an estimate). A bee's eyesight is far coarser than ours; this model doesn't show that."] },
  bat: { yes: [["自分の声の返り（ガの位置と動き、ものの形と距離）", "Echoes of its own calls (where the moth is and how it moves, shapes and distances)", "doc"]],
         no: [],
         note: ["声の広がりと返りの光は、人の目に写した模式（計算の推定）。飛び方と声の間隔は決めた値。", "The spreading calls and glinting echoes are drawn for human eyes (an estimate). Flight path and call timing are set values."] },
  rec: { yes: [["24 kHz までの音（コオロギの声）", "Sound up to 24 kHz (the cricket's song)", "doc"]],
         no: [["24 kHz より高い音（標本化定理）", "Sound above 24 kHz (sampling theorem)", "doc"], ["この台のコウモリの声（模式では 40〜60 kHz）", "This bat's calls (40–60 kHz in this model)", "set"], ["光と温度", "Light and temperature", "doc"]],
         note: ["48 kHz で標本化すると、記録できるのはその半分の 24 kHz まで（標本化定理）。画面の声の形は模式。コウモリの声の高さは種によって違い、声の低い種では 24 kHz より下の部分が録れることもある（超音波の台の録音 1）。", "Sampling at 48 kHz can only capture up to half that: 24 kHz (the sampling theorem). The call shapes on the screen are schematic."] },
  therm: { yes: [["表面から出る赤外線（温度のちがい）", "Infrared given off by surfaces (temperature differences)", "doc"]],
           no: [["花の色", "Flower colours", "doc"], ["音", "Sound", "doc"]],
           note: ["温度は決めた値：日なたの石 38 °C・地面 26 °C・葉と花 24〜25 °C・コウモリの体 34 °C・空はいちばん冷たく写る。", "Set values: sunny stone 38 °C, ground 26 °C, leaves and flowers 24–25 °C, bat's body 34 °C; the sky shows coldest."] },
};
const MARKN = { doc: ["資料の記載", "Documented"], est: ["計算の推定", "Estimated"], set: ["決めた値", "Set value"] };

// 温度の色（鉄の色の並び：冷たい＝深い紫 → 温かい＝黄白）
function ironColor(t) { const s = THREE.MathUtils.clamp((t - 10) / 30, 0, 1); const st = [[0, 0x14082e], [.35, 0x6a1a7a], [.6, 0xd2452a], [.8, 0xf59a1c], [1, 0xfff2b0]]; for (let i = 1; i < st.length; i++) if (s <= st[i][0]) { const k = (s - st[i - 1][0]) / (st[i][0] - st[i - 1][0]); return new THREE.Color(st[i - 1][1]).lerp(new THREE.Color(st[i][1]), k); } return new THREE.Color(st[4][1]); }

function flowerTex(base, tip, center) {
  return canvasTex(256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h); const n = 13;
    for (let i = 0; i < n; i++) { c.save(); c.translate(128, 128); c.rotate(i / n * Math.PI * 2);
      const gr = c.createLinearGradient(0, 18, 0, 122); gr.addColorStop(0, base); gr.addColorStop(.42, base); gr.addColorStop(.58, tip); gr.addColorStop(1, tip);
      c.fillStyle = gr; c.beginPath(); c.moveTo(0, 16); c.bezierCurveTo(19, 40, 17, 104, 0, 124); c.bezierCurveTo(-17, 104, -19, 40, 0, 16); c.fill();
      c.strokeStyle = "rgba(0,0,0,.12)"; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 22); c.lineTo(0, 116); c.stroke(); c.restore(); }
    const cg = c.createRadialGradient(128, 124, 2, 128, 128, 26); cg.addColorStop(0, center); cg.addColorStop(1, "rgba(20,12,6,1)");
    c.fillStyle = cg; c.beginPath(); c.arc(128, 128, 24, 0, 7); c.fill();
    for (let k = 0; k < 70; k++) { const a = Math.random() * 7, r = Math.random() * 20; c.fillStyle = "rgba(255,230,160,.18)"; c.fillRect(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 2, 2); }
  });
}

export function create(H) {
  const L = H.lang === "en" ? 1 : 0, T = (a, b) => (L ? b : a);
  const g = new THREE.Group(); const { std, box, cyl } = H;
  const reg = [];   // { mat, look:{human:{map,color}, bee:{...}, therm:temp} }
  const R = (mesh, o) => { reg.push({ mat: mesh.material, ...o }); return mesh; };
  // 台座と地面
  const base = box(1.84, .03, .74, std(DS.base, .5)); base.position.y = .015; g.add(base);
  const groundM = new THREE.MeshStandardMaterial({ map: tex("forest_diff", 2, 1), roughness: .95 });
  const ground = R(box(1.8, .03, .7, groundM), { col: 0xffffff, bee: 0x8a8a84, therm: 26, mapKeep: true }); ground.position.y = .045; g.add(ground);
  // 草（細い円すいを一度に）
  const grassM = new THREE.MeshStandardMaterial({ color: 0x5a7a3a, roughness: .8 });
  reg.push({ mat: grassM, col: 0x5a7a3a, bee: 0x86867e, therm: 24 });
  { const n = 620, im = new THREE.InstancedMesh(new THREE.ConeGeometry(.0032, .075, 3), grassM, n), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < n; i++) { const x = (Math.random() - .5) * 1.7, z = (Math.random() - .5) * .62; if (x > .4 && x < .72 && Math.abs(z) < .15) continue; e.set((Math.random() - .5) * .5, 0, (Math.random() - .5) * .5); q.setFromEuler(e); const s = .6 + Math.random() * .8; M.compose(new THREE.Vector3(x, .06 + .045 * s, z), q, new THREE.Vector3(1, s, 1)); im.setMatrixAt(i, M); }
    g.add(im); }
  // 花（黄 3・赤 2）。花の頭は円板に描いた花びら。茎と葉は緑
  const yH = flowerTex("#e9b414", "#f6d23a", "#5a3a1a"), yB = flowerTex("#a8422c", "#c45ec4", "#2a1810");
  const rH = flowerTex("#b81c24", "#cf2a30", "#2a1010"), rB = flowerTex("#2e2626", "#332a2a", "#141010");
  const stemM = new THREE.MeshStandardMaterial({ color: 0x4f6e30, roughness: .7 }); reg.push({ mat: stemM, col: 0x4f6e30, bee: 0x80807a, therm: 24 });
  const heads = [];
  const flower = (x, z, h, yellow) => {
    const st = cyl(.005, .007, h, stemM, 6); st.position.set(x, .06 + h / 2, z); g.add(st);
    const lf = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), stemM); lf.scale.set(1.3, .25, .55); lf.position.set(x + .02, .06 + h * .35, z); lf.rotation.y = Math.random() * 3; g.add(lf);
    const m = new THREE.MeshStandardMaterial({ map: yellow ? yH : rH, transparent: true, alphaTest: .4, side: THREE.DoubleSide, roughness: .7 });
    const hd = new THREE.Mesh(new THREE.CircleGeometry(.075, 28), m); hd.position.set(x, .06 + h, z); hd.rotation.x = -1.05; g.add(hd);
    reg.push({ mat: m, col: 0xffffff, maps: { human: yellow ? yH : rH, bee: yellow ? yB : rB }, therm: 25 }); heads.push(hd); return hd;
  };
  flower(-.62, .06, .3, true); flower(-.42, -.12, .34, true); flower(-.22, .14, .28, true); flower(.04, -.06, .32, false); flower(.22, .16, .27, false);
  // 日なたの石
  const stoneM = new THREE.MeshStandardMaterial({ map: tex("sand_diff", 1, 1), color: 0x9a948a, roughness: .85 });
  reg.push({ mat: stoneM, col: 0x9a948a, bee: 0x8e8e8a, therm: 38, mapKeep: true });
  const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(.13, 1), stoneM); stone.scale.set(1.25, .55, 1); stone.position.set(.56, .1, -.02); g.add(stone);
  // コオロギ（草の中）
  const crM = new THREE.MeshStandardMaterial({ color: 0x2e2216, roughness: .5 }); reg.push({ mat: crM, col: 0x2e2216, bee: 0x3a3a38, therm: 25 });
  const cricket = new THREE.Group(); cricket.position.set(.3, .065, .27); g.add(cricket);
  { const b = new THREE.Mesh(new THREE.CapsuleGeometry(.008, .026, 4, 8), crM); b.rotation.z = Math.PI / 2; cricket.add(b); for (const s of [-1, 1]) { const lg = cyl(.0015, .0015, .04, crM, 4); lg.rotation.z = s * .9; lg.position.set(-.012, .008, s * .008); cricket.add(lg); } }
  // ガ（黄色い花のそば）
  const mothM = new THREE.MeshStandardMaterial({ color: 0xb6a685, roughness: .8, side: THREE.DoubleSide }); reg.push({ mat: mothM, col: 0xb6a685, bee: 0x8c8c86, therm: 27 });
  const moth = new THREE.Group(); moth.position.set(-.34, .4, .02); g.add(moth);
  const mw = [-1, 1].map(s => { const sh = new THREE.Shape(); sh.moveTo(0, .004); sh.bezierCurveTo(s * .018, .03, s * .05, .026, s * .048, .008); sh.bezierCurveTo(s * .046, -.006, s * .03, -.02, s * .014, -.022); sh.bezierCurveTo(s * .006, -.016, 0, -.008, 0, -.004); const w = new THREE.Mesh(new THREE.ShapeGeometry(sh, 10), mothM); w.rotation.x = -Math.PI / 2 + .25; const p = new THREE.Group(); p.add(w); moth.add(p); return p; });
  moth.add(new THREE.Mesh(new THREE.CapsuleGeometry(.004, .02, 4, 6), mothM));
  // コウモリ（空を回って飛ぶ）
  const batM = new THREE.MeshStandardMaterial({ color: 0x3a2e28, roughness: .7, side: THREE.DoubleSide }); reg.push({ mat: batM, col: 0x3a2e28, bee: 0x3a3a3a, therm: 34 });
  const bat = new THREE.Group(); g.add(bat);
  const bw = [-1, 1].map(s => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(s * .04, .03, s * .09, .012); sh.lineTo(s * .075, -.006); sh.quadraticCurveTo(s * .06, -.002, s * .05, -.016); sh.quadraticCurveTo(s * .035, -.006, s * .022, -.02); sh.quadraticCurveTo(s * .012, -.008, 0, -.012); const w = new THREE.Mesh(new THREE.ShapeGeometry(sh), batM); w.rotation.x = -Math.PI / 2; const p = new THREE.Group(); p.add(w); bat.add(p); return p; });
  bat.add(new THREE.Mesh(new THREE.SphereGeometry(.014, 10, 8), batM));
  // 空（ゆるく曲げた板）
  const skyC = document.createElement("canvas"); skyC.width = 16; skyC.height = 128; const skyX = skyC.getContext("2d"), skyT = new THREE.CanvasTexture(skyC); skyT.colorSpace = THREE.SRGBColorSpace;
  const dg = new THREE.PlaneGeometry(1.6, .8, 24, 1); { const pa = dg.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i); pa.setZ(i, .16 * (x / .8) ** 2); } }
  const sky = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ map: skyT, toneMapped: false })); sky.position.set(0, .46, -.37); g.add(sky);
  const skyCols = { human: ["#2e4c86", "#f0a160"], bee: ["#3e7aa2", "#78b8c8"], bat: ["#06080e", "#121826"], rec: ["#2e4c86", "#f0a160"], therm: ["#0c0624", "#1c0c3a"] };
  const paintSky = m => { const [a, b] = skyCols[m], gr = skyX.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, a); gr.addColorStop(1, b); skyX.fillStyle = gr; skyX.fillRect(0, 0, 16, 128); skyT.needsUpdate = true; };
  // コウモリの声の広がり（コウモリの目線のときだけ）と、ガに返る光
  const ringM = [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: 0x9bdcf0, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  const rings = ringM.map(m => { const r = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), m); r.visible = false; g.add(r); return r; });
  const glint = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xcff4ff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); glint.scale.setScalar(.06); moth.add(glint);
  // コオロギの声（人と録音機のとき）：小さな弧
  const songM = new THREE.MeshBasicMaterial({ color: 0x9bdcf0, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const song = [0, 1, 2].map(i => { const t = new THREE.Mesh(new THREE.TorusGeometry(.03 + i * .025, .0015, 4, 24, Math.PI * .7), songM); t.rotation.z = Math.PI * .15; t.position.set(.3, .1, .27); g.add(t); return t; });
  // 録音機の画面（録音機のときだけ）
  const scrC = document.createElement("canvas"); scrC.width = 512; scrC.height = 320; const scrX = scrC.getContext("2d"), scrT = new THREE.CanvasTexture(scrC); scrT.colorSpace = THREE.SRGBColorSpace;
  const scr = new THREE.Group(); scr.position.set(.66, .42, -.2); g.add(scr);
  { const fr = box(.5, .32, .02, std(0x1a1d1f, .5, .4)); scr.add(fr); const p = new THREE.Mesh(new THREE.PlaneGeometry(.47, .29), new THREE.MeshBasicMaterial({ map: scrT, toneMapped: false })); p.position.z = .011; scr.add(p); const st = box(.03, .26, .03, std(0x2a2e31, .5, .5)); st.position.y = -.28; scr.add(st); }
  function drawScr() {
    const x = scrX, W = 512, Hh = 320, X0 = 70, Y0 = 40, PW = 420, PH = 240, ky = f => Y0 + PH - PH * f / 64;
    x.fillStyle = "#081215"; x.fillRect(0, 0, W, Hh); x.fillStyle = "#9fd6cf"; x.font = "20px 'Hiragino Sans',sans-serif"; x.fillText(T("録音機に届く高さ（模式）", "What the recorder captures (schematic)"), 14, 26);
    x.fillStyle = "rgba(92,200,224,.16)"; x.fillRect(X0, ky(24), PW, ky(0) - ky(24));
    x.strokeStyle = "#5cc8e0"; x.lineWidth = 2; x.beginPath(); x.moveTo(X0, ky(24)); x.lineTo(X0 + PW, ky(24)); x.stroke();
    x.fillStyle = "#6f8c88"; x.font = "16px sans-serif"; for (const f of [0, 16, 24, 32, 48, 64]) x.fillText(`${f}k`, 20, ky(f) + 5);
    x.fillStyle = "#9bdcf0"; x.font = "15px 'Hiragino Sans',sans-serif"; x.fillText(T("記録できる（24 kHz まで）", "Recorded (up to 24 kHz)"), X0 + 8, ky(24) + 20);
    x.fillStyle = "#e8d27a"; for (let k = 0; k < 9; k++) x.fillRect(X0 + 30 + k * 44, ky(4.8), 18, 5);
    x.fillText(T("コオロギの声（数 kHz）", "Cricket (a few kHz)"), X0 + 30, ky(4.8) - 10);
    x.strokeStyle = "rgba(200,210,220,.5)"; x.setLineDash([5, 5]); x.lineWidth = 2;
    for (let k = 0; k < 5; k++) { const x0 = X0 + 40 + k * 80; x.beginPath(); x.moveTo(x0, ky(60)); x.quadraticCurveTo(x0 + 6, ky(44), x0 + 18, ky(40)); x.stroke(); }
    x.setLineDash([]); x.fillStyle = "rgba(220,226,232,.8)"; x.fillText(T("コウモリの声：記録されない", "Bat calls: not recorded"), X0 + 160, ky(56));
    scrT.needsUpdate = true;
  }
  // 温度の色の物差し（サーモカメラのとき）
  const legC = canvasTex(512, 72, (c, w, h) => { for (let i = 0; i < w; i++) { c.fillStyle = "#" + ironColor(10 + 30 * i / w).getHexString(); c.fillRect(i, 0, 1, 34); } c.fillStyle = "#eef5fb"; c.font = "22px 'Hiragino Sans',sans-serif"; c.fillText("10 °C", 4, 62); c.fillText("40 °C", w - 64, 62); c.fillText(T("決めた値", "Set values"), w / 2 - 44, 62); });
  const leg = new THREE.Mesh(new THREE.PlaneGeometry(.5, .07), new THREE.MeshBasicMaterial({ map: legC, toneMapped: false, transparent: true })); leg.position.set(0, .08, .4); leg.rotation.x = -.5; g.add(leg);
  // q ＝ Φ（場所, 主体）の札
  const phiTags = {}; for (const s of SUBJ) { const t = tag(T(`q ＝ Φ（夕方の庭, ${SUBJ_NAME[s][0]}）`, `q = Φ(evening garden, ${SUBJ_NAME[s][1]})`), { w: .5 }); t.position.set(0, .8, -.2); t.visible = false; g.add(t); phiTags[s] = t; }
  const modelNote = note(T("庭の形は変えない。変えるのは、届く手がかりの模式", "The garden stays the same. Only the cues that reach the receiver change."), { w: .6 }); modelNote.position.set(0, .03, .44); g.add(modelNote);

  let mode = "human", t = 0;
  const pickables = [];
  function apply(m) {
    mode = m;
    for (const r of reg) {
      const mt = r.mat;
      if (m === "therm") { mt.map = r.maps ? r.maps.human : null; mt.color.set(0x000000); mt.emissive.copy(ironColor(r.therm)); mt.emissiveIntensity = 1; }
      else {
        mt.emissive.set(0x000000); mt.emissiveIntensity = 1;
        if (r.maps) mt.map = r.maps[m === "bee" ? "bee" : "human"];
        else if (r.mapKeep) mt.map = mt.userData.map0 ?? (mt.userData.map0 = mt.map);
        mt.color.set(m === "bee" ? r.bee : r.col);
        if (m === "bat") mt.color.multiplyScalar(.045);
      }
      if (r.mapKeep && m !== "therm" && !mt.map) mt.map = mt.userData.map0;
      mt.needsUpdate = true;
    }
    paintSky(m);
    rings.forEach(r => r.visible = m === "bat"); glint.material.opacity = 0;
    scr.visible = m === "rec"; if (m === "rec") drawScr();
    leg.visible = m === "therm";
    for (const s of SUBJ) phiTags[s].visible = s === m;
  }
  // 地面・石の写真の質感を覚えておく（サーモカメラから戻るため）
  groundM.userData.map0 = groundM.map; stoneM.userData.map0 = stoneM.map;
  apply("human");

  return {
    group: g, focus: { y: .38, dist: 1.9, pitch: .22 }, labelY: 1.18, pickables,
    enter() { apply(mode); },
    exit() {},
    tick(dt, on) {
      t += dt;
      // ガ：花のそばでふわりと・はばたき
      moth.position.set(-.34 + .05 * Math.sin(t * .9), .4 + .02 * Math.sin(t * 2.1), .02 + .04 * Math.cos(t * .7)); mw.forEach((w, i) => w.rotation.z = (i ? -1 : 1) * (.15 + .8 * Math.abs(Math.sin(t * 14))));
      // コウモリ：空を大きく回る
      const a = t * .55, bx = Math.cos(a) * .5, bz = -.1 + Math.sin(a) * .18, by = .74 + .04 * Math.sin(t * 1.7);
      bat.position.set(bx, by, bz); bat.rotation.y = -a; bw.forEach((w, i) => w.rotation.z = (i ? 1 : -1) * .7 * Math.sin(t * 11));
      if (!on) return;
      if (mode === "bat") {
        // 声：0.5 秒ごとに一つ。広がる殻がガに届くと、ガが光る（返り）
        const dM = bat.position.distanceTo(moth.position);
        rings.forEach((r, i) => { const ph = ((t * 2 + i / 3) % 1), rad = .02 + ph * .9; r.position.copy(bat.position); r.scale.setScalar(rad); r.material.opacity = .16 * (1 - ph); });
        const near = rings.some(r => Math.abs(r.scale.x - dM) < .05);
        glint.material.opacity += ((near ? .95 : 0) - glint.material.opacity) * Math.min(1, dt * 12);
      }
      songM.opacity = (mode === "human" || mode === "rec") ? .35 + .35 * Math.max(0, Math.sin(t * 9)) : 0;
    },
    ui(box_) {
      seg(box_, SUBJ.map(s => [s, SUBJ_NAME[s][L]]), mode, v => { apply(v); H.say?.([H.S.phiSub[v]]); }, T("受けとる主体", "Receiver"));
    },
    read() {
      const r = READS[mode], chip = k => `<span class="mk">${MARKN[k][L]}</span>`;
      const li = a => a.map(x => `<li>${x[L]} ${chip(x[2])}</li>`).join("");
      return `<div class="pick">${T("受けとる側（主体）", "Receiver")}：<b>${SUBJ_NAME[mode][L]}</b>　${T("場所は同じ（夏の夕方の庭）", "Same place (a summer-evening garden)")}</div>
<div class="row2"><div><span class="k">${T("届く手がかり", "Cues that reach it")}</span><ul class="ls">${li(r.yes)}</ul></div>${r.no.length ? `<div><span class="k">${T("届かない手がかり", "Cues that don't")}</span><ul class="ls">${li(r.no)}</ul></div>` : ""}</div>
${r.note ? `<div class="note">${r.note[L]}</div>` : ""}<div class="note">${T("書いていない手がかりは、この台では確かめていないもの。", "Cues not listed here are ones this table doesn't cover.")}</div>`;
    },
  };
}
