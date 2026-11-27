/* Qualia/lab ── 開かれた研究室（2026-11-27 本人「research は研究室として、名前を lab にして、museum のように 3D 空間を」）
   歩いて回る一つの部屋。机ごとに、論文にもとづく模式を「試す」で動かす。書架では、研究の九つの分野を読める。
   出典はすべて ≡ の中。値は data/senses.json（共通の表）と、机ごとの論文から。 */
import * as THREE from "three";

const MOBILE = matchMedia("(max-width:767px)").matches || /Android|iPhone|iPad/.test(navigator.userAgent);
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = s => document.querySelector(s);
const canvas = $("#scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.6 : 1.5));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = !MOBILE; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2c2b);
scene.fog = new THREE.Fog(0x2a2c2b, 14, 30);
const camera = new THREE.PerspectiveCamera(MOBILE ? 62 : 52, innerWidth / innerHeight, .05, 60);

/* ---------- 質感（その場で描く。外の画像は使わない） ---------- */
function canvasTex(w, h, draw, rep = [1, 1], srgb = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const oak = canvasTex(512, 512, (g, w, h) => {   // 寄木でなく、幅 128px の板を互い違いに
  for (let y = 0; y < h; y += 64) for (let x = -((y / 64) % 2) * 160; x < w; x += 320) {
    const l = 40 + rnd() * 10; g.fillStyle = `hsl(${28 + rnd() * 6},${30 + rnd() * 10}%,${l}%)`; g.fillRect(x, y, 320, 64);
    for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(70,40,20,${.05 + rnd() * .09})`; g.lineWidth = .6 + rnd() * 1.4; g.beginPath(); const yy = y + rnd() * 64; g.moveTo(x, yy); g.bezierCurveTo(x + 100, yy + rnd() * 6 - 3, x + 220, yy + rnd() * 6 - 3, x + 320, yy + rnd() * 4 - 2); g.stroke(); }
    g.fillStyle = "rgba(40,24,12,.55)"; g.fillRect(x, y, 2, 64); g.fillRect(x, y, 320, 1.5);
  }
}, [5, 3.5]);
const plaster = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#d9d4ca"; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${rnd() < .5 ? "255,255,250" : "120,110,96"},${rnd() * .06})`; const s = 1 + rnd() * 5; g.fillRect(rnd() * w, rnd() * h, s, s); } }, [6, 2]);
const walnut = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#5a3d2a"; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${rnd() < .5 ? "30,18,10" : "120,86,60"},${.12 + rnd() * .16})`; g.lineWidth = 1 + rnd() * 2; const y = rnd() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y + rnd() * 10 - 5, 170, y + rnd() * 10 - 5, w, y + rnd() * 6 - 3); g.stroke(); } }, [1, 1]);
const M = {
  floor: new THREE.MeshStandardMaterial({ map: oak, roughness: .62, metalness: 0 }),
  wall: new THREE.MeshStandardMaterial({ map: plaster, roughness: .95 }),
  top: new THREE.MeshStandardMaterial({ map: walnut, roughness: .5 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x8b9294, roughness: .38, metalness: .85 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1b1d1e, roughness: .55, metalness: .2 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .05, transmission: .92, thickness: .02, transparent: true, opacity: .32, depthWrite: false }),
  slate: new THREE.MeshStandardMaterial({ color: 0x24302c, roughness: .92 }),
};

/* ---------- 光と映りこみ ---------- */
{ const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene(), bx = new THREE.BoxGeometry(1, 1, 1);
  const room = new THREE.Mesh(new THREE.BoxGeometry(20, 8, 20), new THREE.MeshBasicMaterial({ color: 0x3a3936, side: THREE.BackSide })); es.add(room);
  for (const [x, y, z, sx, sy, sz, c] of [[0, 3.9, 0, 10, .1, 2, 0xffffff], [-9.8, 2, 0, .1, 3, 8, 0xdfe9f2], [0, -3.9, 0, 18, .1, 18, 0x6b4f3a]]) { const m = new THREE.Mesh(bx, new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); m.scale.set(sx, sy, sz); es.add(m); }
  scene.environment = pm.fromScene(es, .04).texture; scene.environmentIntensity = .55; pm.dispose(); }
scene.add(new THREE.HemisphereLight(0xe8eef2, 0x5a4636, .55));
const sun = new THREE.DirectionalLight(0xfff0dc, 2.4); sun.position.set(-12, 9, 4); renderer.toneMappingExposure = .95; sun.target.position.set(0, 0, 0);
sun.castShadow = !MOBILE; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 8, bottom: -8, near: 1, far: 30 }); sun.shadow.bias = -.0006; sun.shadow.normalBias = .03;
scene.add(sun, sun.target);
for (const x of [-4.5, 0, 4.5]) { const p = new THREE.PointLight(0xfff3e4, 5, 9, 1.6); p.position.set(x, 3.6, 0); scene.add(p); }

const outside = canvasTex(128, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#c9dbe4"); gr.addColorStop(.55, "#dfe7e6"); gr.addColorStop(.62, "#8fa38a"); gr.addColorStop(1, "#5f7058"); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(70,92,64,${.2 + rnd() * .3})`; g.beginPath(); g.arc(rnd() * w, 150 + rnd() * 30, 10 + rnd() * 22, 0, 7); g.fill(); } });
/* ---------- 部屋（幅 18m・奥行 12m・天井 4.2m） ---------- */
const W = 9, D = 6, H = 4.2, add = (m, x, y, z, parent = scene) => { m.position.set(x, y, z); parent.add(m); return m; };
{ const f = add(new THREE.Mesh(new THREE.PlaneGeometry(2 * W, 2 * D), M.floor), 0, 0, 0); f.rotation.x = -Math.PI / 2; f.receiveShadow = true;
  const c = add(new THREE.Mesh(new THREE.PlaneGeometry(2 * W, 2 * D), new THREE.MeshStandardMaterial({ color: 0xcfcac0, roughness: 1 })), 0, H, 0); c.rotation.x = Math.PI / 2;
  const wall = (w, x, z, ry) => { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(w, H), M.wall), x, H / 2, z); m.rotation.y = ry; m.receiveShadow = true; return m; };
  wall(2 * W, 0, -D, 0); wall(2 * W, 0, D, Math.PI); wall(2 * D, W, 0, -Math.PI / 2);
  wall(2 * D, -W - .01, 0, Math.PI / 2);
  // 左の壁は高い窓の並び（光が差しこむ側）
  for (let i = 0; i < 5; i++) { const z = -4.8 + i * 2.4;
    const pane = add(new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.8), new THREE.MeshBasicMaterial({ map: outside })), -W + .02, 2.05, z); pane.rotation.y = Math.PI / 2;
    const fr = add(new THREE.Mesh(new THREE.BoxGeometry(.08, 3.0, .7), M.wall), -W + .04, 2.05, z + 1.2); fr.castShadow = true;
    for (const yy of [.6, 3.5]) add(new THREE.Mesh(new THREE.BoxGeometry(.18, .06, 1.8), M.black), -W + .06, yy, z); }
  { const fr = add(new THREE.Mesh(new THREE.BoxGeometry(.08, H, 1), M.wall), -W + .04, H / 2, -5.6); fr.castShadow = true; }
  const lw = add(new THREE.Mesh(new THREE.PlaneGeometry(2 * D, .6), M.wall), -W, H - .3, 0); lw.rotation.y = Math.PI / 2;
  const base = new THREE.MeshStandardMaterial({ color: 0x2e2a26, roughness: .6 });
  for (const [w, x, z, ry] of [[2 * W, 0, -D + .01, 0], [2 * D, W - .01, 0, -Math.PI / 2], [2 * W, 0, D - .01, Math.PI]]) { const b = add(new THREE.Mesh(new THREE.PlaneGeometry(w, .14), base), x, .07, z); b.rotation.y = ry; }
  // 天井の照明の帯
  for (const x of [-4.5, 0, 4.5]) add(new THREE.Mesh(new THREE.BoxGeometry(3.2, .05, .22), new THREE.MeshBasicMaterial({ color: 0xfff6ea })), x, H - .03, 0);
}

/* ---------- 札（明朝の文字を板に） ---------- */
function label(text, sub, w = 1.3) {
  const c = document.createElement("canvas"); c.width = 640; c.height = 200; const g = c.getContext("2d");
  g.fillStyle = "rgba(14,22,24,.82)"; g.beginPath(); g.roundRect(4, 4, 632, 192, 26); g.fill(); g.strokeStyle = "rgba(170,226,236,.7)"; g.lineWidth = 3; g.stroke();
  g.fillStyle = "#eef6f4"; g.textAlign = "center"; g.font = '600 64px "Shippori Mincho","Hiragino Mincho ProN","Yu Mincho",serif'; g.fillText(text, 320, 98);
  g.fillStyle = "rgba(220,240,240,.72)"; g.font = '400 34px "Shippori Mincho","Hiragino Mincho ProN",serif'; g.fillText(sub, 320, 156);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 200 / 640), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); m.renderOrder = 5; return m;
}
function table(w, d, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  const top = add(new THREE.Mesh(new THREE.BoxGeometry(w, .045, d), M.top), 0, .88, 0, g); top.castShadow = top.receiveShadow = true;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = add(new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .86, 8), M.steel), sx * (w / 2 - .06), .43, sz * (d / 2 - .06), g); l.castShadow = true; }
  const bar = add(new THREE.Mesh(new THREE.BoxGeometry(w - .12, .02, .02), M.steel), 0, .16, d / 2 - .06, g); bar.castShadow = true;
  return g;
}

/* ---------- 机ごとの模式 ---------- */
const ST = [];   // { id, name, sub, c:[x,z], view:[x,z], look:[x,y,z], go(), off(), say[], src[] }
const tick = [];   // 毎こま (t, dt)

// 1. 紫外の机：オオハンゴンソウ属（Rudbeckia）の花。花びらの根元が紫外を吸い、先が紫外を返す＝蜂には的の模様
{ const g = table(1.6, .9, -6.6, -1.2, Math.PI / 2);
  const flower = new THREE.Group(); flower.position.set(0, 1.18, 0); flower.rotation.x = -.5; g.add(flower);
  const stem = add(new THREE.Mesh(new THREE.CylinderGeometry(.008, .01, .32, 6), new THREE.MeshStandardMaterial({ color: 0x4d6b34, roughness: .8 })), 0, 1.04, .04, g); stem.rotation.x = .25;
  add(new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, .1, 16), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: .9 })), 0, .95, .06, g);
  const N = 14, petals = [], pg = new THREE.PlaneGeometry(.045, .16, 1, 8); pg.translate(0, .1, 0); { const ps = pg.attributes.position; for (let i = 0; i < ps.count; i++) { const y = (ps.getY(i) - .02) / .16; ps.setX(i, ps.getX(i) * (.35 + .75 * Math.sin(Math.PI * Math.min(1, y * .85 + .1)))); ps.setZ(i, -y * y * .02); } pg.computeVertexNormals(); }
  const col = new Float32Array(pg.attributes.position.count * 3); pg.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const pm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7, side: THREE.DoubleSide });
  for (let i = 0; i < N; i++) { const p = new THREE.Mesh(pg, pm); p.rotation.z = i / N * Math.PI * 2; p.rotation.x = .18 + (i % 2) * .05; flower.add(p); petals.push(p); }
  const disc = add(new THREE.Mesh(new THREE.SphereGeometry(.045, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2d1a10, roughness: .95 })), 0, 0, .0, flower); disc.rotation.x = Math.PI / 2; disc.scale.z = .7;
  // 人の目＝黄の花びら・黒褐の芯。蜂の目（偽色）＝紫外を青、青を緑、緑を赤に置きかえて描く（よく使われる置きかえ）。先は紫外と緑を返す→赤紫、根元は紫外を吸う→赤
  const human = y => [.95, .74 + .05 * y, .1], bee = y => { const uv = y > .45 ? .9 : .08; return [.85, .12, uv]; };
  const paint = f => { const pos = pg.attributes.position; for (let i = 0; i < pos.count; i++) { const y = (pos.getY(i) - .02) / .16; const c = f(Math.max(0, Math.min(1, y))); col.set(c, i * 3); } pg.attributes.color.needsUpdate = true; };
  paint(human);
  // 光の帯（人と蜂の視細胞の感度の山。senses.json の値）
  const band = canvasTex(1024, 220, () => { }, [1, 1]);
  const bm = add(new THREE.Mesh(new THREE.PlaneGeometry(1.2, .26), new THREE.MeshBasicMaterial({ map: band, transparent: true })), 0, 1.62, -.25, g);
  function drawBand(mode) {
    const c = band.image, x = c.getContext("2d"), w = c.width, h = c.height, nm = v => 70 + (v - 300) / 400 * (w - 140);
    x.clearRect(0, 0, w, h); x.fillStyle = "rgba(14,22,24,.86)"; x.beginPath(); x.roundRect(0, 0, w, h, 24); x.fill();
    for (let v = 300; v <= 700; v += 2) { const hue = v < 400 ? 275 : 275 - (v - 400) / 300 * 275; x.fillStyle = v < 390 ? `rgba(120,90,170,${mode ? .9 : .25})` : `hsl(${hue},80%,52%)`; x.fillRect(nm(v), 118, nm(v + 2) - nm(v) + .5, 26); }
    x.fillStyle = "#cfe6e6"; x.font = '28px "Hiragino Mincho ProN",serif'; x.textAlign = "center";
    for (const v of [300, 400, 500, 600, 700]) x.fillText(v + "nm", nm(v), 186);
    const peaks = mode ? [344, 436, 550] : [420, 534, 563];
    x.fillStyle = "#fff"; for (const p of peaks) { x.beginPath(); x.moveTo(nm(p), 112); x.lineTo(nm(p) - 10, 92); x.lineTo(nm(p) + 10, 92); x.fill(); }
    x.font = '600 34px "Hiragino Mincho ProN",serif'; x.fillText(mode ? "ミツバチの視細胞の感度の山　344・436・約 550 nm" : "人の錐体の感度の山　420・534・563 nm", w / 2, 60);
    band.needsUpdate = true;
  }
  drawBand(0);
  const lb = add(label("紫外の机", "ミツバチの目"), 0, 2.02, -.25, g);
  let on = 0;
  ST.push({ id: "uv", ask: "外で黄色い花を見つけたら、真ん中をのぞいてみる。蜂には、どこが的に見えているだろう。", name: "紫外", sub: "ミツバチの目", c: [-6.6, -1.2], view: [-4.5, -.4], look: [-6.6, 1.25, -1.2], lbl: lb,
    go() { on ^= 1; paint(on ? bee : human); drawBand(on); return on ? "蜂の目の模式。紫外を返す花びらの先と、紫外を吸う根元で、花の真ん中に的の模様が浮かぶ。" : "人の目。花びらは黄色一色に見える。"; },
    off() { if (on) { on = 0; paint(human); drawBand(0); } },
    hello: "人の目には、花びらは黄色一色。「試す」で、ミツバチの目の模式に切りかわる。",
    src: [["Horth, Campbell & Bray 2014", "Wild bees preferentially visit Rudbeckia flower heads with exaggerated ultraviolet absorbing floral guides. Biology Open 3:221–230", "https://doi.org/10.1242/bio.20146445"],
      ["Hempel de Ibarra, Vorobyev & Menzel 2014", "Mechanisms, functions and ecology of colour vision in the honeybee. J. Comp. Physiol. A 200:411–433（視細胞の感度の山）", "https://doi.org/10.1007/s00359-014-0915-1"],
      ["Bowmaker & Dartnall 1980", "Visual pigments of rods and cones in a human retina. J. Physiol. 298:501–511（人の錐体）", "https://doi.org/10.1113/jphysiol.1980.sp013097"]],
    note: "色は、紫外を青・青を緑・緑を赤に置きかえて描いた模式。蜂がどう感じているかではなく、蜂の目が受けとれる光の差を、人に見える色に移したもの。" });
  tick.push(t => { flower.rotation.z = Math.sin(t * .4) * .04; });
}

// 2. 反響の机：コウモリは鳴き声の跳ね返りまでの時間で距離をつかむ。往復の時間＝2×距離÷音速（20℃で約 343 m/s）
{ const g0 = table(4.6, .7, 6.5, -1.2, Math.PI / 2), g = add(new THREE.Group(), 0, 0, 0, g0); g.rotation.y = -Math.PI / 2;
  const emit = add(new THREE.Group(), 0, .9, 2.1, g);
  add(new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, .14, 20), M.black), 0, .07, 0, emit).rotation.x = Math.PI / 2;
  add(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .2, 12), M.steel), 0, -.0, .04, emit);
  const target = add(new THREE.Mesh(new THREE.BoxGeometry(.5, .5, .04), new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: .8 })), 0, 1.12, 1.1, g); target.castShadow = true;
  // 1m ごとの目盛り
  for (let m = 0; m <= 4; m++) { const k = add(new THREE.Mesh(new THREE.BoxGeometry(.5, .002, .01), new THREE.MeshBasicMaterial({ color: 0xeee6d2 })), 0, .905, 2.1 - m, g); k.rotation.y = 0; const n = label(m + " m", "", .32); n.position.set(.36, .92, 2.1 - m); n.rotation.x = -Math.PI / 2; n.rotation.z = Math.PI / 2; g.add(n); }
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x9fe6ee, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const echoMat = ringMat.clone(); echoMat.color.set(0xffd9a0);
  const ring = add(new THREE.Mesh(new THREE.RingGeometry(.96, 1, 48, 1, -.7, 1.4), ringMat), 0, .98, 2.1, g); ring.rotation.x = -Math.PI / 2; ring.rotation.z = -Math.PI / 2;
  const echo = add(new THREE.Mesh(new THREE.RingGeometry(.96, 1, 48, 1, -.7, 1.4), echoMat), 0, .98, 0, g); echo.rotation.x = -Math.PI / 2; echo.rotation.z = Math.PI / 2;
  const lb = add(label("反響の机", "コウモリの耳"), 0, 1.78, 0, g); lb.rotation.y = 0;
  const DIST = [.5, 1, 2, 4], C = 343, SLOW = 200; let k = -1, run = null;
  let actx = null; const click = (when, gain) => { try { actx ??= new AudioContext(); const t0 = actx.currentTime + when, b = actx.createBuffer(1, 600, actx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.sin(i / actx.sampleRate * 2 * Math.PI * 3200) * Math.exp(-i / 90); const s = actx.createBufferSource(), v = actx.createGain(); v.gain.value = gain; s.buffer = b; s.connect(v).connect(actx.destination); s.start(t0); } catch { } };
  ST.push({ id: "bat", ask: "広い部屋や橋の下で、一度手をたたいてみる。返ってくる音までの間に、距離が隠れている。", name: "反響", sub: "コウモリの耳", c: [6.5, -1.2], view: [3.4, -.2], mview: [5.4, 2.9], look: [6.5, .95, -1.2], lbl: lb,
    go() { k = (k + 1) % DIST.length; const d = DIST[k]; target.position.z = 2.1 - d; const ms = 2 * d / C * 1000; run = { t0: performance.now(), d, dur: ms * SLOW / 1000 };
      click(0, .5); click(ms * SLOW / 1000, .25);
      return `板まで ${d} m。鳴いてから跳ね返りが戻るまで ${ms.toFixed(1)} ミリ秒（2 × ${d} m ÷ 343 m/s）。ここでは 200 倍ゆっくり見せている。`; },
    off() { run = null; ringMat.opacity = echoMat.opacity = 0; },
    hello: "コウモリは、鳴き声が跳ね返るまでの時間で物までの距離をつかむ。「試す」で、板までの距離を変えて鳴らす。",
    src: [["Griffin & Galambos 1941", "The sensory basis of obstacle avoidance by flying bats. J. Exp. Zool. 86:481–506", "https://doi.org/10.1002/jez.1400860310"],
      ["Griffin 1958", "Listening in the Dark. Yale University Press（反響定位の総説）", ""]],
    note: "実際のコウモリの声は人に聴こえない高さ（超音波）で、高さは種で大きく違う。ここで鳴る音は、聴こえる高さに移し、時間を 200 倍に延ばした模式。音速は 20℃ の空気で約 343 m/s。" });
  tick.push(() => { if (!run) return; const u = (performance.now() - run.t0) / 1000 / run.dur; if (u > 1.15) { ringMat.opacity = echoMat.opacity = 0; run = null; return; }
    const half = Math.min(1, u * 2), back = Math.max(0, u * 2 - 1);
    ring.scale.setScalar(.02 + half * run.d); ringMat.opacity = u < .5 ? .9 * (1 - half * .6) : 0;
    echo.position.z = 2.1 - run.d; echo.scale.setScalar(.02 + Math.min(1, back) * run.d); echoMat.opacity = u >= .5 && u <= 1 ? .85 * (1 - back * .5) : 0; });
}

// 3. 花の電場の机：マルハナバチは花の電場のちがいを見分け、学ぶ（Clarke ほか 2013）
{ const g = table(1.4, .9, -5.4, 3.4, Math.PI / 2);
  const dome = add(new THREE.Mesh(new THREE.SphereGeometry(.38, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.glass), 0, .905, 0, g); dome.scale.set(1.15, 1.6, 1.15);
  add(new THREE.Mesh(new THREE.CylinderGeometry(.4, .42, .03, 40), M.black), 0, .9, 0, g);
  const fl = add(new THREE.Group(), 0, .9, 0, g); fl.scale.setScalar(1.7);
  add(new THREE.Mesh(new THREE.CylinderGeometry(.005, .006, .18, 6), new THREE.MeshStandardMaterial({ color: 0x4d6b34 })), 0, .09, 0, fl);
  const head = add(new THREE.Group(), 0, .19, 0, fl);
  const petM = new THREE.MeshStandardMaterial({ color: 0x9b6fc8, roughness: .65, side: THREE.DoubleSide }), pg = new THREE.CircleGeometry(.03, 12); pg.scale(1, 1.6, 1); pg.translate(0, .045, 0);
  for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(pg, petM); p.rotation.set(-1.25, 0, i / 5 * Math.PI * 2, "YXZ"); p.rotation.order = "YXZ"; p.rotation.y = i / 5 * Math.PI * 2; head.add(p); }
  add(new THREE.Mesh(new THREE.SphereGeometry(.012, 12, 8), new THREE.MeshStandardMaterial({ color: 0xe7c34a })), 0, .005, 0, head);
  // 電場の線（花のまわりの模式）
  const lines = []; const lm = new THREE.LineBasicMaterial({ color: 0x9fe6ee, transparent: true, opacity: .35 });
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, pts = []; for (let s = 0; s <= 20; s++) { const r = .02 + s * .014, y = .19 + Math.sin(s / 20 * Math.PI) * .05 + s * .004; pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)); } const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm); fl.add(l); lines.push(l); }
  // マルハナバチ（体長 約 1.5 cm の比で。ここでは見やすいよう机の上の模型として 3 倍）
  const bee = new THREE.Group(); bee.scale.setScalar(1.8); fl.add(bee);
  const fur = new THREE.MeshStandardMaterial({ color: 0x24201a, roughness: 1 }), yel = new THREE.MeshStandardMaterial({ color: 0xd9b23a, roughness: 1 });
  add(new THREE.Mesh(new THREE.SphereGeometry(.016, 12, 8), yel), 0, 0, .012, bee).scale.set(1, .95, 1);
  const ab = add(new THREE.Mesh(new THREE.SphereGeometry(.02, 12, 8), fur), 0, -.003, -.02, bee); ab.scale.set(1, .9, 1.25);
  for (const [z, c] of [[-.012, yel], [-.032, new THREE.MeshStandardMaterial({ color: 0xefe8da, roughness: 1 })]]) { const b = add(new THREE.Mesh(new THREE.SphereGeometry(.0205, 12, 8, 0, Math.PI * 2, 1.2, .5), c), 0, -.003, z, bee); b.rotation.x = Math.PI / 2; b.scale.set(1, 1.1, .9); }
  for (const sx of [-1, 1]) for (const lz of [.02, .008, -.006]) { const l = add(new THREE.Mesh(new THREE.CylinderGeometry(.0014, .001, .03, 4), fur), sx * .012, -.016, lz, bee); l.rotation.z = sx * .5; }
  for (const sx of [-1, 1]) { const a = add(new THREE.Mesh(new THREE.CylinderGeometry(.001, .001, .022, 4), fur), sx * .005, .012, .046, bee); a.rotation.x = .9; a.rotation.z = sx * .3; }
  add(new THREE.Mesh(new THREE.SphereGeometry(.011, 10, 8), fur), 0, .002, .034, bee);
  const wm = new THREE.MeshStandardMaterial({ color: 0xd8e6ea, transparent: true, opacity: .45, side: THREE.DoubleSide, roughness: .2 });
  const wings = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.PlaneGeometry(.03, .014), wm); w.geometry.translate(s * .015, 0, 0); w.position.set(0, .014, .006); bee.add(w); return w; });
  const lb = add(label("花の電場の机", "マルハナバチの毛"), 0, 1.78, 0, g);
  let phase = 0, t0 = 0, charged = 0; const home = new THREE.Vector3(.28, .34, .22), land = new THREE.Vector3(0, .215, 0);
  bee.position.copy(home);
  ST.push({ id: "efield", ask: "花に止まる蜂を見かけたら、目に見えない電場のやりとりを思い出してみる。", name: "電場", sub: "マルハナバチ", c: [-5.4, 3.4], view: [-3.3, 3.0], look: [-5.4, 1.1, 3.4], lbl: lb,
    go() { if (phase) return null; phase = 1; t0 = performance.now(); return "飛ぶマルハナバチの体は正に、花はふつう負に帯電している。蜂が近づくと、花のまわりの電場が変わる。蜂は体の毛と触角の動きで、電場を感じるとみられている。"; },
    off() { phase = 0; charged = 0; bee.position.copy(home); lm.color.set(0x9fe6ee); lm.opacity = .35; },
    hello: "花のまわりには、目に見えない電場がある。「試す」で、マルハナバチが花に寄って止まる。",
    src: [["Clarke, Whitney, Sutton & Robert 2013", "Detection and learning of floral electric fields by bumblebees. Science 340:66–69", "https://doi.org/10.1126/science.1230883"],
      ["Sutton, Clarke, Morley & Robert 2016", "Mechanosensory hairs in bumblebees (Bombus terrestris) detect weak electric fields. PNAS 113:7261–7265（体の毛）", "https://doi.org/10.1073/pnas.1601624113"],
      ["Greggers ほか 2013", "Reception and learning of electric fields in bees. Proc. R. Soc. B 280:20130528（ミツバチの触角とジョンストン器官）", "https://doi.org/10.1098/rspb.2013.0528"]],
    note: "線は、花のまわりの電場を目に見える形にした模式（線の数と形は実測ではない）。蜂の模型は見やすいよう大きくしてある。" });
  tick.push((t, dt) => {
    wings.forEach((w, i) => { w.rotation.y = (i ? 1 : -1) * (phase === 1 || phase === 3 ? Math.sin(t * 60) * .9 : .25); });
    if (!phase) { bee.position.set(home.x + Math.sin(t * .9) * .03, home.y + Math.sin(t * 1.7) * .015, home.z); bee.lookAt(fl.localToWorld(land.clone())); return; }
    const u = (performance.now() - t0) / 1000;
    if (phase === 1) { const k = Math.min(1, u / 2.6), e = k * k * (3 - 2 * k); bee.position.lerpVectors(home, land, e); bee.position.y += Math.sin(e * Math.PI) * .06; const near = 1 - bee.position.distanceTo(land) / home.distanceTo(land); lm.opacity = .35 + near * .45; if (k >= 1) { phase = 2; t0 = performance.now(); charged = 1; lm.color.set(0xffd27a); say("止まった。花の電位が変わり、次に来た蜂には「もう誰かが来た花」と分かる手がかりになりうる。", 7000); } }
    else if (phase === 2) { if (u > 3.2) { phase = 3; t0 = performance.now(); } }
    else if (phase === 3) { const k = Math.min(1, u / 2.2); bee.position.lerpVectors(land, home, k * k); bee.position.y += Math.sin(k * Math.PI) * .05; lm.opacity = .8 - k * .2; if (k >= 1) { phase = 0; } }
    head.rotation.y = Math.sin(t * .5) * .1;
  });
}

// 4. 地磁気の机：ヨーロッパコマドリは磁力線の傾き（伏角）を読むコンパスをもつ（Wiltschko & Wiltschko 1972）
{ const g = table(1.4, 1.2, 5.4, 3.4, -Math.PI / 2);
  const arena = add(new THREE.Group(), 0, .905, 0, g); arena.rotation.y = Math.PI / 2;   /* 南北の軸を見る人の左右に＝磁力線の傾きと鳥の横顔が読める */
  add(new THREE.Mesh(new THREE.CylinderGeometry(.42, .3, .18, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xe9e3d6, roughness: .9, side: THREE.DoubleSide })), 0, .09, 0, arena);
  add(new THREE.Mesh(new THREE.CircleGeometry(.3, 40), new THREE.MeshStandardMaterial({ color: 0xc9c1b2, roughness: 1 })), 0, .002, 0, arena).rotation.x = -Math.PI / 2;
  // 磁力線の向きの矢（伏角 66° の模式＝実験の行われたフランクフルトほどの値）
  const arrM = new THREE.MeshStandardMaterial({ color: 0x5cc8e0, emissive: 0x1a4c58, roughness: .4 });
  const field = add(new THREE.Group(), 0, .55, 0, arena);
  const shaft = add(new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .5, 10), arrM), 0, 0, 0, field), tip = add(new THREE.Mesh(new THREE.ConeGeometry(.025, .07, 14), arrM), 0, .28, 0, field);
  const INC = 65 * Math.PI / 180;
  { const hl = add(new THREE.Mesh(new THREE.BoxGeometry(.004, .004, .9), new THREE.MeshBasicMaterial({ color: 0xe8e0cc, transparent: true, opacity: .7 })), 0, .55, 0, arena); }
  // 鳥（ヨーロッパコマドリの体つき。胸の橙）
  const bird = add(new THREE.Group(), 0, .02, 0, arena); bird.scale.setScalar(1.9);
  const brown = new THREE.MeshStandardMaterial({ color: 0x7a6650, roughness: 1 }), orange = new THREE.MeshStandardMaterial({ color: 0xd2733a, roughness: 1 });
  const body = add(new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 12), brown), 0, .06, 0, bird); body.scale.set(.85, .85, 1.25);
  const breast = add(new THREE.Mesh(new THREE.SphereGeometry(.043, 16, 12), orange), 0, .065, .028, bird); breast.scale.set(.85, .9, .8);
  const hd = add(new THREE.Mesh(new THREE.SphereGeometry(.03, 14, 10), brown), 0, .11, .05, bird);
  add(new THREE.Mesh(new THREE.SphereGeometry(.024, 12, 8), orange), 0, .1, .065, bird);
  add(new THREE.Mesh(new THREE.ConeGeometry(.007, .025, 8), M.black), 0, .108, .085, bird).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) { const w = add(new THREE.Mesh(new THREE.SphereGeometry(.04, 12, 8), new THREE.MeshStandardMaterial({ color: 0x6a5642, roughness: 1 })), s * .04, .075, -.015, bird); w.scale.set(.25, .55, 1.3); w.rotation.x = -.15; }
  const tail = add(new THREE.Mesh(new THREE.BoxGeometry(.04, .006, .1), brown), 0, .08, -.1, bird); tail.rotation.x = -.45;
  for (const s of [-1, 1]) { add(new THREE.Mesh(new THREE.SphereGeometry(.004, 6, 6), M.black), s * .016, .118, .072, bird); add(new THREE.Mesh(new THREE.CylinderGeometry(.002, .002, .04, 4), brown), s * .015, .02, 0, bird); }
  const lb = add(label("地磁気の机", "コマドリの向き"), 0, 1.78, 0, g);
  // 状態：0 そのまま／1 縦の成分だけ逆に／2 向きをすべて逆に
  const STATES = [{ v: 1, h: 1, txt: "いまの磁場。磁力線が地面へ沈みこむ側を、鳥は「極の側」として読む。渡りの季節の春なら、そちらへ向かう。" },
    { v: -1, h: 1, txt: "縦の成分だけを逆にした。磁力線の傾きが反対になり、コマドリは向かう方角を反対にした。" },
    { v: -1, h: -1, txt: "向きをすべて逆にした（N と S を入れかえた）。傾きの形は同じなので、コマドリの向きは変わらなかった。磁石の N・S でなく、傾きを読むコンパス。" }];
  let si = 0, yaw = 0, want = 0, fx = 0, fxWant = 0;
  const setField = s => { const v = STATES[s].v, h = STATES[s].h; const dir = new THREE.Vector3(0, -Math.sin(INC) * v, Math.cos(INC) * h).normalize(); fxWant = dir; want = (v * h > 0) ? 0 : Math.PI; };
  setField(0);
  const qa = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  ST.push({ id: "magnet", ask: "外に出て北を向いたら、足もとへ斜めに沈む磁力線を思い浮かべてみる。", name: "地磁気", sub: "コマドリ", c: [5.4, 3.4], view: [3.4, 3.0], look: [5.4, 1.15, 3.4], lbl: lb,
    go() { si = (si + 1) % 3; setField(si); return STATES[si].txt; },
    off() { si = 0; setField(0); },
    hello: "円い籠の中のコマドリと、磁力線の向き（水色の矢）。「試す」で、磁場の向きを変える。",
    src: [["Wiltschko & Wiltschko 1972", "Magnetic compass of European robins. Science 176:62–64", "https://doi.org/10.1126/science.176.4030.62"]],
    note: "矢は、伏角 約 65°（実験の行われたフランクフルトほど）の磁力線の向きの模式。鳥の向きは、論文の結果（向きの平均）を一羽の向きとして描いたもの。鳥が磁場をどう感じるかは、まだ分かっていない。" });
  tick.push((t, dt) => { qa.setFromUnitVectors(up, fxWant); field.quaternion.slerp(qa, Math.min(1, dt * 3));
    yaw += (want - yaw) * Math.min(1, dt * 2.2); bird.rotation.y = yaw + Math.sin(t * 1.3) * .08; hd.rotation.y = Math.sin(t * 2.1) * .3; });
}

// 5. 色の名の黒板：ロシア語は明るい青（goluboy）と濃い青（siniy）を別の名で呼ぶ（Winawer ほか 2007）
{ const g = new THREE.Group(); g.position.set(4.4, 0, -5.95); scene.add(g);
  const board = add(new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.5, .04), M.slate), 0, 1.75, 0, g); board.receiveShadow = true;
  add(new THREE.Mesh(new THREE.BoxGeometry(3.5, .05, .1), M.top), 0, .98, .04, g);
  const tex = canvasTex(1360, 600, () => { }, [1, 1]);
  add(new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.45), new THREE.MeshBasicMaterial({ map: tex, transparent: true })), 0, 1.75, .025, g);
  const N = 20, swatch = i => { const l = 82 - i * 3.2; return `hsl(212,${55 + i}%,${l}%)`; }, BOUND = 8;
  const modes = ["英語", "ロシア語"]; let mi = -1;
  function draw(m) {
    const c = tex.image, x = c.getContext("2d"), w = c.width; x.clearRect(0, 0, w, c.height);
    x.fillStyle = "rgba(240,236,226,.9)"; x.font = '600 52px "Hiragino Mincho ProN",serif'; x.textAlign = "left"; x.fillText("同じ青の並びを、どこで切るか", 60, 92);
    const sw = (w - 120) / N; for (let i = 0; i < N; i++) { x.fillStyle = swatch(i); x.fillRect(60 + i * sw + 3, 160, sw - 6, 150); }
    x.font = '54px "Hiragino Mincho ProN",serif'; x.textAlign = "center"; x.fillStyle = "rgba(240,236,226,.92)";
    if (m === 0) { x.strokeStyle = "rgba(240,236,226,.7)"; x.lineWidth = 3; x.beginPath(); x.moveTo(60, 340); x.lineTo(w - 60, 340); x.stroke(); x.fillText("blue（一つの名）", w / 2, 400); }
    if (m === 1) { const bx = 60 + BOUND * sw; x.strokeStyle = "rgba(255,226,170,.95)"; x.lineWidth = 5; x.setLineDash([16, 12]); x.beginPath(); x.moveTo(bx, 140); x.lineTo(bx, 360); x.stroke(); x.setLineDash([]);
      x.font = '46px "Times New Roman","Hiragino Mincho ProN",serif'; x.letterSpacing = "0px"; x.fillText("голубой", 60 + BOUND * sw / 2, 392); x.fillText("明るい青", 60 + BOUND * sw / 2, 440); x.fillText("синий", bx + (N - BOUND) * sw / 2, 392); x.font = '46px "Hiragino Mincho ProN",serif'; x.fillText("濃い青", bx + (N - BOUND) * sw / 2, 440); }
    x.font = '42px "Hiragino Mincho ProN",serif'; x.fillStyle = "rgba(230,224,210,.92)";
    const L = m === 1 ? ["境目をまたぐ二色は、またがない二色より速く見分けられた", "（声に出さない言葉の課題を同時にすると、差は消えた）"] : m === 0 ? ["英語を話す人では、境目をまたぐかどうかで速さの差は出なかった"] : ["「試す」で、言葉ごとの切り分けを重ねる"];
    L.forEach((t, i) => x.fillText(t, w / 2, 512 + i * 50, w - 80));
    tex.needsUpdate = true; }
  draw(-1);
  const lb = add(label("色の名の黒板", "言葉の切り分け", 1.7), 0, 2.8, .05, g);
  ST.push({ id: "color", ask: "空の青と海の青。自分なら、どこで名を分けるだろう。", name: "色の名", sub: "言葉と色", c: [4.4, -5.95], view: [4.4, -2.6], mview: [4.4, .9], look: [4.4, 1.75, -5.95], lbl: lb,
    go() { mi = (mi + 1) % 2; draw(mi); return mi ? "ロシア語は、明るい青と濃い青を別の名で呼ぶ。名の境目をまたぐ二色を、話し手は速く見分けた。声に出さずに数字を覚える課題を同時にすると、この差は消えた。" : "英語は、この並びをひとつの名（blue）で呼ぶ。"; },
    off() { mi = -1; draw(-1); },
    hello: "黒板に、明るい青から濃い青までの 20 色。「試す」で、言葉ごとの名の切り分けを重ねる。",
    src: [["Winawer, Witthoft, Frank, Wu, Wade & Boroditsky 2007", "Russian blues reveal effects of language on color discrimination. PNAS 104:7780–7785", "https://doi.org/10.1073/pnas.0701644104"]],
    note: "実験では、境目の位置を一人ずつ測った。ここの境目の位置と色の並びは模式。" });
}

// 6. 書架：研究の九つの分野（HP の研究の頁と同じ文）
let reading = null;
{ const g = new THREE.Group(); g.position.set(-4.4, 0, -5.75); scene.add(g);
  const sh = add(new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.4, .42), M.top), 0, 1.2, 0, g); sh.castShadow = true;
  add(new THREE.Mesh(new THREE.BoxGeometry(3.24, 2.26, .4), new THREE.MeshStandardMaterial({ color: 0x2a1e16, roughness: .9 })), 0, 1.2, .03, g);
  for (let r = 0; r < 4; r++) add(new THREE.Mesh(new THREE.BoxGeometry(3.26, .03, .38), M.top), 0, .2 + r * .58, .03, g);
  const hues = [190, 30, 280, 160, 210, 120, 20, 90, 40]; const books = [];
  for (let r = 0; r < 4; r++) { let x = -1.56; while (x < 1.5) { const w = .03 + rnd() * .04, h = .36 + rnd() * .14; const b = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, .26 + rnd() * .06), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(rnd(), .25 + rnd() * .2, .2 + rnd() * .2), roughness: .8 })), x + w / 2, .215 + r * .58 + h / 2, .05, g); b.castShadow = true; x += w + .004; } }
  // 九つの分野の本（前に出した、背に名のある本）
  for (let i = 0; i < 9; i++) { const c = document.createElement("canvas"); c.width = 64; c.height = 300; const x = c.getContext("2d"); x.fillStyle = `hsl(${hues[i]},32%,30%)`; x.fillRect(0, 0, 64, 300); x.fillStyle = "#e8dfc8"; x.font = '600 30px "Hiragino Mincho ProN",serif'; x.textAlign = "center"; x.fillText(String(i + 1), 32, 44); x.fillRect(10, 60, 44, 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const b = add(new THREE.Mesh(new THREE.BoxGeometry(.07, .42, .28), [M.top, M.top, M.top, M.top, new THREE.MeshStandardMaterial({ map: t, roughness: .7 }), M.top]), -.4 + i * .1, 1.37, .1, g); b.userData.book = i; b.castShadow = true; books.push(b); }
  const lb = add(label("書架", "研究の九つの分野"), 0, 2.75, .25, g);
  ST.push({ id: "shelf", name: "書架", sub: "九つの分野", c: [-4.4, -5.75], view: [-4.4, -2.7], mview: [-4.4, -1.2], look: [-4.4, 1.65, -5.75], lbl: lb, books,
    go() { openBook(0); return null; },
    off() { closeBook(); },
    hello: "九つの分野の本。押すと、分かっていることと、まだ分からないことを、もとの論文と一緒に読める。",
    src: [], note: "HP の研究の頁と同じ文。それぞれの本の終わりに、もとの論文へのリンクがある。" });
  fetch("data/reading.json").then(r => r.json()).then(d => { reading = d; }).catch(() => { });
}

/* ---------- 書架の本 ---------- */
const book = $("#book");
function openBook(i) {
  if (!reading) { say("本を読みこんでいます。", 2000); return; }
  const f = reading.fields[i]; book.classList.add("on");
  $("#bkT").textContent = `${i + 1}　${f.h}`;
  $("#bkN").innerHTML = reading.fields.map((x, j) => `<button type="button" aria-pressed="${j === i}" data-i="${j}" aria-label="${x.h}">${j + 1}</button>`).join("");
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  $("#bkB").innerHTML = f.p.map(p => `<p>${esc(p)}</p>`).join("") + (f.links.length ? `<ol>${f.links.map(l => `<li><a href="${esc(l.u)}" target="_blank" rel="noopener">${esc(l.t)}</a></li>`).join("")}</ol>` : "");
  $("#bkB").scrollTop = 0;
}
function closeBook() { book.classList.remove("on"); }
$("#bkX").onclick = closeBook;
$("#bkN").onclick = e => { const b = e.target.closest("button"); if (b) openBook(+b.dataset.i); };

/* ---------- 字幕 ---------- */
const sub = $("#sub"); let subT = 0;
function say(t, ms = 6500) { if (!t) return; sub.textContent = t; sub.classList.remove("gone"); clearTimeout(subT); subT = setTimeout(() => sub.classList.add("gone"), ms); }

/* ---------- 歩く（机を選ぶと、その前へ） ---------- */
const view = { pos: new THREE.Vector3(0, 1.58, 4.6), yaw: 0, pitch: -.1 }; if (MOBILE) { view.pos.set(1.2, 1.5, 5.4); view.yaw = .32; }
let fly = null, cur = -1;
const nav = $("#st");
nav.innerHTML = ST.map((s, i) => `<button type="button" data-i="${i}" aria-pressed="false">${s.name}</button>`).join("");
nav.onclick = e => { const b = e.target.closest("button"); if (b) goTo(+b.dataset.i); };
function lookAngles(from, to) { const d = new THREE.Vector3().subVectors(to, from); return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }; }
function goTo(i) {
  if (i === cur && !fly) { return; }
  if (cur >= 0) ST[cur].off?.(); closeBook();
  clearTimeout(askT); cur = i; const s = ST[i]; nav.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-pressed", j === i));
  const vv = MOBILE && s.mview ? s.mview : s.view, to = new THREE.Vector3(vv[0], MOBILE ? 1.5 : 1.58, vv[1]); const look = new THREE.Vector3(...s.look);
  if (MOBILE && !s.mview) { to.lerp(new THREE.Vector3(look.x, to.y, look.z), -.18); }
  const a = lookAngles(to, look); let dy = a.yaw - view.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  fly = { t0: performance.now(), dur: RM ? 1 : Math.min(2600, 900 + view.pos.distanceTo(to) * 260), p0: view.pos.clone(), p1: to, y0: view.yaw, y1: view.yaw + dy, q0: view.pitch, q1: a.pitch };
  say(s.hello, 7000); drawer(); aoiGo(s);
}
let askT = 0; function goRun() { const s = ST[cur], t = s.go(); if (t) say(t, 9000); clearTimeout(askT); if (s.ask) askT = setTimeout(() => { if (ST[cur] === s) say(s.ask, 8000); }, 9500); }
$("#go").onclick = () => { if (cur < 0) { goTo(0); return; } goRun(); aoi?.motion.express?.("curious", .5, 2); };

/* ---------- 見回す（ドラッグ）・机や本を押す ---------- */
const ray = new THREE.Raycaster(), pt = new THREE.Vector2(); let drag = null;
canvas.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, yaw: view.yaw, pitch: view.pitch, moved: 0 }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy)); if (drag.moved < 6) return; fly = null;
  view.yaw = drag.yaw + dx * .0045; view.pitch = Math.max(-.7, Math.min(.5, drag.pitch + dy * .0035)); });
canvas.addEventListener("pointerup", e => { const d = drag; drag = null; if (!d || d.moved > 6) return; pick(e); });
const hitRoots = () => ST.map((s, i) => [s, i]);
function pick(e) {
  pt.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(pt, camera);
  const sh = ST.find(s => s.id === "shelf");
  if (cur >= 0 && ST[cur] === sh) { const h = ray.intersectObjects(sh.books)[0]; if (h) { openBook(h.object.userData.book); return; } }
  let best = -1, bd = 1e9; const hits = ray.intersectObjects(scene.children, true);
  if (hits[0]) { const p = hits[0].point; ST.forEach((s, i) => { const d = Math.hypot(p.x - s.c[0], p.z - s.c[1]); if (d < 2.4 && d < bd) { bd = d; best = i; } }); }
  if (best >= 0 && best !== cur) goTo(best);
  else if (best >= 0 && best === cur) goRun();
}
addEventListener("keydown", e => { if (e.target.closest?.("#book")) return; const k = e.key; if (k === "ArrowRight") goTo((cur + 1 + ST.length) % ST.length); else if (k === "ArrowLeft") goTo((cur - 1 + ST.length) % ST.length); else if (k === " " || k === "Enter") { if (document.activeElement === canvas) $("#go").click(); } else if (k === "Escape") closeBook(); });

/* ---------- ≡ の中身（机の説明と出典） ---------- */
const dr = $("#dr");
function drawer() {
  const s = ST[cur]; const esc = t => t.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let h = `<h3>この研究室</h3><p>知覚と環世界の研究を、机ごとに試せる研究室。体験は、論文にもとづく模式。</p>`;
  if (s) { h += `<h3>${esc(s.name)}の机</h3><p>${esc(s.note)}</p>`; if (s.src.length) h += `<h3>出典</h3>` + s.src.map(([a, b, u]) => `<p>${esc(a)}　${u ? `<a href="${u}" target="_blank" rel="noopener">${esc(b)}</a>` : esc(b)}</p>`).join(""); }
  h += `<h3>操作</h3><p>机の名を選ぶか机を押すと、その前へ歩く。ドラッグで見回す。「試す」で動かす。</p><p><a href="../../">mitsulab のトップへ</a></p>`;
  dr.innerHTML = h;
}
drawer();
$("#menu").onclick = () => { const on = !dr.classList.contains("on"); dr.classList.toggle("on", on); $("#menu").setAttribute("aria-expanded", on); };

/* ---------- 碧（共通の部品。部屋が出たあとに読む） ---------- */
let aoi = null, aoiTarget = null;
function aoiSpot(s) { const vv = MOBILE && s.mview ? s.mview : s.view, v = new THREE.Vector3(vv[0], 0, vv[1]), c = new THREE.Vector3(s.c[0], 0, s.c[1]), d = c.clone().sub(v).normalize(), side = new THREE.Vector3(-d.z, 0, d.x); return v.clone().addScaledVector(d, MOBILE ? 1.3 : 1.1).addScaledVector(side, MOBILE ? 1.45 : .95); }
function aoiGo(s) { aoiTarget = aoiSpot(s); if (aoi && !RM) aoi.walkTo(aoiTarget); else if (aoi) aoi.place(aoiTarget.x, aoiTarget.z, 0); }
async function loadAoi() {
  try { const K = await import("../10/kit/aoi.js?v=20261120u"); const a = await K.loadAoi("../10/aoi.vrm", { scene, height: 1.5, wind: .12, posture: "upright", quality: MOBILE ? "mid" : "low" });
    const p = aoiTarget ?? new THREE.Vector3(-2.4, 0, 1.2); a.place(p.x, p.z, Math.atan2(view.pos.x - p.x, view.pos.z - p.z)); aoi = a; window.__aoi = true;
  } catch (e) { console.warn("碧を読めませんでした", e); }
}

/* ---------- 描く ---------- */
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.fov = innerWidth < innerHeight ? 66 : 52; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();
const _pq = new THREE.Quaternion(); const clock = new THREE.Clock(); let frames = 0, fpsT = performance.now(); window.__fps = 0;
const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
function frame() {
  const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
  if (fly) { const k = Math.min(1, (performance.now() - fly.t0) / fly.dur), e = ease(k); view.pos.lerpVectors(fly.p0, fly.p1, e); if (!RM) view.pos.y += Math.sin(e * Math.PI * Math.max(1, Math.round(fly.dur / 520))) * .012; view.yaw = fly.y0 + (fly.y1 - fly.y0) * e; view.pitch = fly.q0 + (fly.q1 - fly.q0) * e; if (k >= 1) fly = null; }
  camera.position.copy(view.pos); camera.rotation.set(view.pitch, view.yaw, 0, "YXZ");
  for (const f of tick) f(t, dt);
  for (const s of ST) { s.lbl.parent.getWorldQuaternion(_pq); s.lbl.quaternion.copy(_pq.invert()).multiply(camera.quaternion); }
  aoi?.tick(dt, camera);
  renderer.render(scene, camera);
  frames++; const now = performance.now(); if (now - fpsT > 1000) { window.__fps = Math.round(frames * 1000 / (now - fpsT)); frames = 0; fpsT = now; }
  if (!window.__ready) { window.__ready = performance.now(); setTimeout(loadAoi, 400); say("歩いて回る研究室。机の名を選ぶと、その前へ歩く。", 6500); }
  requestAnimationFrame(frame);
}
camera.position.copy(view.pos); camera.rotation.set(view.pitch, view.yaw, 0, "YXZ");
requestAnimationFrame(frame);
window.__lab = { goTo, ST, view, openBook };
