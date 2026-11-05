/* © mitsulab. All rights reserved.  土と樹の音（Qualia/touch の中の試作のモード・?ws=oto・2026-11-05）
   設計＝02_プロジェクト/03_開発中（非公開）/04_X-Sense/土と樹の音/土と樹の音_設計書.md §4（A 案）。
   入力：外付けの接触マイク（スマホのマイク入力）。端末の自動の音量調整・雑音消しは切る。
   出力（小石へ流す）：聴こえる音から 40〜400 Hz の帯域だけを取り出して、イヤホン端子（→ 触覚の小石）へ。無音から上げ、上限を設ける。
   集めない：サーバーなし。録った音はこの画面の中だけ（閉じると消える）。渡すのは本人が「渡す」を押したときのファイル一つだけ。
   標本に付けるのは「樹・土・ほか」の札と、分までの時刻だけ（位置・名前・端末の情報は入れない）。 */
import * as THREE from "three";

const $ = id => document.getElementById(id);
const MOBILE = matchMedia("(max-width: 899px)").matches;
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const REC_MAX = 30, MINE_MAX = 12, FROM_MAX = 24, LO = 40, HI = 400, LEVEL = .6;
const TAGS = [{ k: "ki", n: "樹" }, { k: "tsuchi", n: "土" }, { k: "hoka", n: "ほか" }];
let tag = "ki";
const uid = () => Math.random().toString(36).slice(2, 10);
const minute = () => { const d = new Date(); d.setSeconds(0, 0); return d.toISOString(); };
const hm = iso => { const d = new Date(iso); return isNaN(d) ? "" : String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };

/* ---------- 碧の字幕（声は出さない） ---------- */
let subT = 0;
function say(s, ms = 6000) { const el = $("sub"); el.textContent = s; el.classList.add("is-on"); clearTimeout(subT); if (ms) subT = setTimeout(() => el.classList.remove("is-on"), ms); aoi?.motion.express("warm", .35, 2); }

/* ---------- 3D ---------- */
const cv = $("c");
const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" });
R.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.75 : 2)); R.outputColorSpace = THREE.SRGBColorSpace; R.debug.checkShaderErrors = false;
const S = new THREE.Scene(); S.background = new THREE.Color("#03060f"); S.fog = new THREE.Fog("#03060f", 3.2, 9);
const C = new THREE.PerspectiveCamera(MOBILE ? 50 : 38, 1, .05, 30);
S.add(new THREE.HemisphereLight("#cfe8ff", "#0a0f18", 1.1)); { const k = new THREE.DirectionalLight("#fff1e2", 1.6); k.position.set(-1, 2, 2); S.add(k); }
const W = MOBILE ? 1.7 : 2.4, X0 = -W / 2;   // 波の幅（左＝古い → 右＝いま）
{ // 地：光のグリッド（中心から遠いほど薄く）
  const L = [], Cc = [], E = 3, st = .2, n = Math.round(2 * E / st);
  for (let a = 0; a <= n; a++) for (let k = 0; k < n; k++) { const v = -E + a * st, u0 = -E + k * st, u1 = u0 + st; L.push(u0, 0, v, u1, 0, v, v, 0, u0, v, 0, u1); }
  for (let i = 0; i < L.length; i += 3) { const o = Math.pow(Math.max(0, 1 - Math.hypot(L[i], L[i + 2]) / E), 1.6); Cc.push(o * .4, o * .75, o * .9); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(L, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(Cc, 3));
  S.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .5, depthWrite: false })));
}
// 流れる波（縦の線＝その瞬間の振れ幅。聴こえる音＝水色、指でよく感じる帯＝砥粉色）
const HN = MOBILE ? 160 : 220, hRaw = new Float32Array(HN), hBand = new Float32Array(HN);
const mkBars = (col, op) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(HN * 6), 3)); const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })); l.frustumCulled = false; S.add(l); return l; };
const barsRaw = mkBars(0x78d6ec, .55), barsBand = mkBars(0xf2cf8c, .95);
const Y0 = .45;
// いまの波形（オシロスコープの線）
const ON = 256, osc = new THREE.Line(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(ON * 3), 3)), new THREE.LineBasicMaterial({ color: 0xa8f2f6, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
osc.frustumCulled = false; S.add(osc);
// 帯域の柱（床の上に一列。指でよく感じる 40〜400 Hz を強く）
const NB = 40, F0 = 20, F1 = 8000, fAt = i => F0 * Math.pow(F1 / F0, i / (NB - 1));
const box = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0);
const spec = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false }), NB);
const specH = new Float32Array(NB), _m = new THREE.Matrix4(), _c = new THREE.Color();
for (let i = 0; i < NB; i++) { const f = fAt(i), inB = f >= LO && f <= HI; spec.setColorAt(i, _c.set(inB ? 0xf2cf8c : 0x3d8fa6)); }
spec.position.set(0, 0, .5); S.add(spec);
{ // 帯の枠（床の上の細い線。指でよく感じる帯の範囲）
  const i0 = Math.log(LO / F0) / Math.log(F1 / F0) * (NB - 1), i1 = Math.log(HI / F0) / Math.log(F1 / F0) * (NB - 1), x0 = X0 + (i0 + .5) / NB * W - W / NB / 2, x1 = X0 + (i1 + .5) / NB * W + W / NB / 2;
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0, .002, .39), new THREE.Vector3(x1, .002, .39), new THREE.Vector3(x1, .002, .61), new THREE.Vector3(x0, .002, .61), new THREE.Vector3(x0, .002, .39)]);
  S.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xf2cf8c, transparent: true, opacity: .6 })));
}
const look = new THREE.Vector3(0, .5, 0);
function resize() { const w = innerWidth, h = innerHeight; R.setSize(w, h, false); C.aspect = w / h; C.updateProjectionMatrix();
  const tf = Math.tan(C.fov * Math.PI / 360), d = Math.max(MOBILE ? 2.4 : 2.6, (W / 2 + .3) / (tf * C.aspect) + .3);
  C.position.set(0, .4 + d * .24, d); look.set(0, .4 - d * (MOBILE ? .2 : .07), 0); C.lookAt(look); S.fog.near = d + .2; S.fog.far = d + 7; }   // 波と帯が画面の上 4 割あたりに来る（下の操作に重ならない）
addEventListener("resize", resize); resize();

/* 碧（共通の部品。あとから読む。波のほうを向いて聴く） */
let aoi = null;
const AOI_URL = location.pathname.includes("/x/") ? "../../img/hero/aoi.vrm" : "aoi.vrm";
async function loadAoi() {
  try { const K = await import("./kit/aoi.js"); const a = await K.loadAoi(AOI_URL, { scene: S, height: MOBILE ? .62 : .7, wind: .1, posture: "upright", quality: MOBILE ? "mid" : "low" });
    a.root.visible = false; try { const Wm = await import("./kit/warm.js"); await Wm.warmAoi(R, a.root, C, S, { batch: 2 }); } catch { } a.root.visible = true; aoi = a;
    const x = MOBILE ? -.98 : -1.5, z = MOBILE ? -.95 : -.2; aoi.place(x, z, Math.atan2(-x, -z) * .6); aoi.motion.lookAt(new THREE.Vector3(0, .6, 0));
  } catch (e) { console.warn("碧を読めませんでした", e); }
}

/* ---------- 音 ---------- */
let AC = null, stream = null, src = null, an = null, anB = null, micG = null, flowG = null, direct = null, lim = null, hp1 = null, flowing = false, loud = 0;
const td = new Float32Array(2048), tdB = new Float32Array(2048), fd = new Float32Array(1024);
let opening = null;
function openMic() {
  if (AC && stream) return Promise.resolve(true); if (opening) return opening;
  opening = (async () => { say("マイクを開いています…", 0);
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
    catch { say("マイクを使えませんでした。\n端末の設定でマイクを許可すると、聴けます。受けとった音は、マイクなしでも並べて聴けます。", 9000); opening = null; return false; }
    ensureAC(); src = AC.createMediaStreamSource(stream); src.connect(an); src.connect(micG);
    $("start").hidden = true; say("聴いています。縦の線は、いまの音の振れ幅（見やすい大きさに合わせています）。\n下の砥粉色の柱が、指でよく感じる帯（40〜400 Hz）です。", 7000); return true;
  })();
  return opening;
}
function ensureAC() {
  if (AC) return; AC = new (window.AudioContext || window.webkitAudioContext)();
  an = AC.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = .6;
  micG = AC.createGain();
  const f = (type, fr) => { const b = AC.createBiquadFilter(); b.type = type; b.frequency.value = fr; b.Q.value = .707; return b; };
  hp1 = f("highpass", LO); const hp2 = f("highpass", LO), lp1 = f("lowpass", HI), lp2 = f("lowpass", HI);   // 二段ずつ（12 dB/oct × 2）
  micG.connect(hp1); hp1.connect(hp2); hp2.connect(lp1); lp1.connect(lp2);
  anB = AC.createAnalyser(); anB.fftSize = 2048; lp2.connect(anB);
  flowG = AC.createGain(); flowG.gain.value = 0; lp2.connect(flowG); const lp3 = f("lowpass", HI), lp4 = f("lowpass", HI);
  direct = AC.createGain(); direct.gain.value = 0;   // 標本を聴くとき（小石へ流さないとき）だけ、そのままの音
  lim = AC.createWaveShaper(); { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = .3 * Math.tanh(x * 2.5) / Math.tanh(2.5); } lim.curve = c; lim.oversample = "2x"; }   // 音量の上限＝頭打ち（自動で持ち上げない。いちばん大きくても ±0.3）
  const limD = AC.createWaveShaper(); limD.curve = lim.curve; const out = AC.createGain(); out.gain.value = 1;
  flowG.connect(lim); lim.connect(lp3); lp3.connect(lp4); lp4.connect(out);   // 頭打ちで生まれる倍音も、もう一度 400 Hz で落とす（帯域の外へ出さない）
  direct.connect(limD); limD.connect(out); out.connect(AC.destination);
}
function setFlow(on, why) {
  flowing = on; $("bFlow").setAttribute("aria-pressed", String(on));
  if (AC) { const t = AC.currentTime; flowG.gain.cancelScheduledValues(t); flowG.gain.setValueAtTime(flowG.gain.value, t); flowG.gain.setTargetAtTime(on ? LEVEL : 0, t, on ? .5 : .05); }   // 無音から、ゆっくり上げる
  if (why) say(why, 9000);
  else say(on ? "指でよく感じる帯（40〜400 Hz）だけを、音の出口（イヤホン端子など）へ流しています。\n音は小さく始まります。大きいときは端末の音量で下げてください。" : "流すのを止めました。", on ? 8000 : 3000);
}
let armed = false;
$("bFlow").onclick = async () => { if (!flowing && !await openMic()) return; AC.resume?.();
  if (!flowing && !armed) { armed = true; say("はじめに、端末の音量を下げてください。\n触覚の小石を音の出口（イヤホン端子など）につないだら、もう一度「小石へ流す」。", 0); return; }   // 何もつながずにスピーカーから鳴らさないよう、初めは一度確かめる
  setFlow(!flowing); };
$("start").onclick = () => openMic().then(ok => ok && AC.resume?.());

/* ---------- 録る（30 秒まで・押すと止まる）。録るのはそのままの音 ---------- */
let rec = null, recT0 = 0, recTimer = 0, env = [];
const mine = [], from = [];
$("bRec").onclick = async () => {
  if (rec) { rec.stop(); return; }
  if (mine.length >= MINE_MAX) { say(`標本は ${MINE_MAX} まで。並べるの「×」で外せます。`, 6000); return; }
  if (!await openMic()) return; AC.resume?.();
  const mt = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find(t => window.MediaRecorder?.isTypeSupported?.(t)) || "";
  try { rec = new MediaRecorder(stream, mt ? { mimeType: mt, audioBitsPerSecond: 64000 } : {}); } catch { say("この端末では録れませんでした。", 5000); return; }
  const ch = []; env = []; rec.ondataavailable = e => e.data.size && ch.push(e.data);
  rec.onstop = () => { clearInterval(recTimer); $("bRec").classList.remove("rec"); $("recT").textContent = "30 秒まで"; const dur = Math.round((performance.now() - recT0) / 100) / 10, r0 = rec; rec = null;
    if (dur < 1) { say("短すぎたので、残しませんでした。", 3000); return; }
    const fr = new FileReader(); fr.onload = () => { mine.push({ id: uid(), t: minute(), tag, data: fr.result, dur, env: squash(env) }); shelf(); say(`${TAGS.find(x => x.k === tag).n}の音を、標本にしました（${mine.length}）。\n「並べる」で聴き比べられます。この画面を閉じると消えます。`, 6500); };
    fr.readAsDataURL(new Blob(ch, { type: r0.mimeType || mt })); };
  rec.start(); recT0 = performance.now(); $("bRec").classList.add("rec");
  say("録っています。人の話し声は入れないでください。\nもう一度押すと止まります。", 0);
  recTimer = setInterval(() => { const s = (performance.now() - recT0) / 1000, left = Math.max(0, Math.ceil(REC_MAX - s)); $("recT").textContent = left + " 秒"; env.push(curRaw); if (s >= REC_MAX) rec?.stop(); }, 100);
};
const squash = a => { const n = 64, o = []; if (!a.length) return o; const mx = Math.max(.001, ...a); for (let i = 0; i < n; i++) { const s = Math.floor(i / n * a.length), e = Math.max(s + 1, Math.floor((i + 1) / n * a.length)); let m = 0; for (let k = s; k < e && k < a.length; k++) m = Math.max(m, a[k]); o.push(Math.round(m / mx * 100) / 100); } return o; };

/* ---------- 並べる・聴く ---------- */
let showShelf = false, player = null;
function shelf() {
  $("cnt").textContent = String(mine.length + from.length); const el = $("shelf"); el.hidden = !showShelf; document.body.classList.toggle("shelf", showShelf); $("bShelf").setAttribute("aria-pressed", String(showShelf)); if (!showShelf) return;
  const all = [...mine.map(x => [x, 0]), ...from.map(x => [x, 1])];
  el.innerHTML = all.length ? "" : '<div id="empty">まだ標本がありません。「録る」で、樹や土の音を残せます。<br>標本はこの画面を閉じると消えます（残すときは「渡す」でファイルに）。</div>';
  for (const [it, f] of all) {
    const c = document.createElement("div"); c.className = "card" + (f ? " from" : "") + (player?.id === it.id ? " play" : ""); c.setAttribute("role", "button"); c.tabIndex = 0;
    c.setAttribute("aria-label", `${TAGS.find(x => x.k === it.tag)?.n || "ほか"}の音 ${it.dur} 秒・押すと鳴る`);
    c.innerHTML = `<b>${TAGS.find(x => x.k === it.tag)?.n || "ほか"}${f ? "（受けとった）" : ""}</b><canvas width="200" height="68"></canvas><small>${hm(it.t)}・${it.dur} 秒</small>`;
    const x = c.querySelector("canvas").getContext("2d"); x.strokeStyle = f ? "#b4a2ff" : "#9bdcf0"; x.lineWidth = 2; const ev = it.env || [];
    for (let i = 0; i < ev.length; i++) { const px = (i + .5) / ev.length * 200, h = Math.max(1, ev[i] * 30); x.beginPath(); x.moveTo(px, 34 - h); x.lineTo(px, 34 + h); x.stroke(); }
    const del = document.createElement("button"); del.className = "x"; del.type = "button"; del.textContent = "×"; del.setAttribute("aria-label", "この標本を外す");
    del.onclick = e => { e.stopPropagation(); if (player?.id === it.id) stopPlay(); const L = f ? from : mine, i = L.indexOf(it); if (i >= 0) L.splice(i, 1); shelf(); };
    c.append(del); c.onclick = () => play(it); c.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); play(it); } };
    el.append(c);
  }
}
function stopPlay() { if (!player) return; player.a.pause(); try { player.n.disconnect(); } catch { } if (micG) micG.gain.setTargetAtTime(1, AC.currentTime, .05); if (direct) direct.gain.value = 0; player = null; shelf(); }
function play(it) {
  if (player?.id === it.id) { stopPlay(); return; } stopPlay(); ensureAC(); AC.resume?.();
  const a = new Audio(it.data); const n = AC.createMediaElementSource(a); n.connect(an); n.connect(hp1); n.connect(direct);
  micG.gain.setTargetAtTime(0, AC.currentTime, .02);   // 標本を鳴らす間は、マイクの音を流さない
  direct.gain.value = flowing ? 0 : .5;   // 小石へ流しているときは帯域だけ、流していないときはそのままの音
  player = { id: it.id, a, n }; a.onended = stopPlay; a.play().catch(() => stopPlay()); shelf();
  say(flowing ? "標本の音から、指でよく感じる帯だけを小石へ流しています。" : "標本の音です。「小石へ流す」を入れると、指でよく感じる帯だけが流れます。", 5000);
}
$("bShelf").onclick = () => { showShelf = !showShelf; shelf(); };

/* ---------- 札（どこの音） ---------- */
function tags() { $("tags").innerHTML = TAGS.map(t => `<button class="mu-chip" type="button" data-k="${t.k}" aria-pressed="${t.k === tag}">${t.n}</button>`).join(""); }
$("tags").onclick = e => { const b = e.target.closest("button"); if (!b) return; tag = b.dataset.k; tags(); };
tags();

/* ---------- 渡す・受けとる（サーバーなし・ファイル一つを端末どうしで） ---------- */
function dl(blob, name) { const u = URL.createObjectURL(blob), a = document.createElement("a"); a.href = u; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
$("bGive").onclick = async () => {
  if (!mine.length) { say("まだ標本がありません。\n録ってから渡せます（渡すのは自分の標本だけ）。", 6000); return; }
  const L = { v: 1, app: "oto", items: mine.map(({ id, t, tag, data, dur, env }) => ({ id, t, tag, data, dur, env })) };
  const name = `土と樹の音_${uid()}.json`, blob = new Blob([JSON.stringify(L)], { type: "application/json" }), file = new File([blob], name, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: "土と樹の音の標本" }); say("渡しました。相手は「受けとる」で並べられます。", 5000); return; } catch (e) { if (e.name === "AbortError") return; } }
  dl(blob, name); say("標本をファイルにしました。\nAirDrop・ニアバイシェア・LINE などで相手へ。相手は「受けとる」で並べられます。", 8000);
};
const okItem = i => i && typeof i.data === "string" && i.data.length < 3e6 && /^data:audio\/[\w.+-]+(;[\w=.+-]+)*;base64,[A-Za-z0-9+/=]+$/.test(i.data) && typeof i.dur === "number" && i.dur > 0 && i.dur <= REC_MAX + 1;
$("bTake").onclick = () => $("fTake").click();
$("fTake").onchange = async e => { const fs = [...e.target.files]; e.target.value = ""; let n = 0;
  for (const f of fs) { try { const L = JSON.parse(await f.text()); if (L?.v !== 1 || L.app !== "oto" || !Array.isArray(L.items)) continue;
    for (const i of L.items.slice(0, MINE_MAX)) { if (!okItem(i) || from.some(x => x.id === i.id) || mine.some(x => x.id === i.id)) continue;
      from.push({ id: String(i.id).slice(0, 16), t: String(i.t || "").slice(0, 30), tag: TAGS.some(x => x.k === i.tag) ? i.tag : "hoka", data: i.data, dur: Math.round(i.dur * 10) / 10, env: Array.isArray(i.env) ? i.env.slice(0, 64).map(v => Math.max(0, Math.min(1, +v || 0))) : [] }); n++;
      if (from.length > FROM_MAX) from.shift(); } } catch { } }
  showShelf = true; shelf(); say(n ? `音を ${n} 本、受けとりました。押すと鳴ります。` : "開ける標本のファイルがありませんでした。", 5000); };

/* ---------- 毎こま ---------- */
let curRaw = 0, scale = 1, peakHold = .02, last = performance.now(), frames = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dtMs = Math.min(100, now - last); if (!AC && dtMs < 33) return; last = now; const dt = dtMs / 1000; frames++;
  let pRaw = 0, pBand = 0;
  if (an) {
    an.getFloatTimeDomainData(td); anB.getFloatTimeDomainData(tdB); an.getFloatFrequencyData(fd);
    let s = 0; for (let i = 0; i < td.length; i++) { const v = Math.abs(td[i]); if (v > pRaw) pRaw = v; } for (let i = 0; i < tdB.length; i++) { const v = Math.abs(tdB[i]); if (v > pBand) pBand = v; s += tdB[i] * tdB[i]; }
    curRaw = pRaw;
    // ハウリングの見張り：小石へ流しているあいだ、帯の音が大きいまま続いたら止める
    const rms = Math.sqrt(s / tdB.length); loud = flowing && !player && rms > .15 ? loud + dt : Math.max(0, loud - dt * 2);
    if (loud > .9) { loud = 0; setFlow(false, "音が大きいまま続いたので、流すのを止めました。\n音が回ったか（スピーカーとマイクが近い）、振動が強すぎたかです。音の出口に小石をつなぎ、もう一度どうぞ。"); }
  }
  peakHold = Math.max(.02, peakHold * Math.exp(-dt / 3), pRaw); scale = .42 / peakHold;   // 見せる大きさだけ、静かな音でも見えるように合わせる
  hRaw.copyWithin(0, 1); hBand.copyWithin(0, 1); hRaw[HN - 1] = pRaw; hBand[HN - 1] = pBand;
  const pr = barsRaw.geometry.attributes.position.array, pb = barsBand.geometry.attributes.position.array;
  for (let i = 0; i < HN; i++) { const x = X0 + (i + .5) / HN * W, a = Math.min(.36, hRaw[i] * scale * .8), b = Math.min(.36, hBand[i] * scale * .8), z = -.1;
    pr.set([x, Y0 - a, z, x, Y0 + a, z], i * 6); pb.set([x, Y0 - b, z + .01, x, Y0 + b, z + .01], i * 6); }
  barsRaw.geometry.attributes.position.needsUpdate = barsBand.geometry.attributes.position.needsUpdate = true;
  const op = osc.geometry.attributes.position.array, st = Math.floor(td.length / ON);
  for (let i = 0; i < ON; i++) op.set([X0 + i / (ON - 1) * W, Y0 + .5 + (an ? Math.max(-.1, Math.min(.1, td[i * st] * scale * .3)) : Math.sin(i / 9 + now / 600) * .004), -.12], i * 3);
  osc.geometry.attributes.position.needsUpdate = true;
  const ny = AC ? AC.sampleRate / 2 : 24000, bw = W / NB;
  for (let i = 0; i < NB; i++) { let v = 0; if (an) { const k = Math.min(fd.length - 1, Math.round(fAt(i) / ny * fd.length)); v = Math.max(0, Math.min(1, (fd[k] + 95) / 65)); }
    specH[i] += (v - specH[i]) * Math.min(1, dt * 12); const h = .006 + specH[i] * (fAt(i) >= LO && fAt(i) <= HI ? .42 : .28);
    _m.makeScale(bw * .62, h, .1); _m.setPosition(X0 + (i + .5) * bw, 0, 0); spec.setMatrixAt(i, _m); }
  spec.instanceMatrix.needsUpdate = true;
  if (aoi) aoi.tick(dt, C);
  R.render(S, C);
}
{ // 帯域の目盛り（50・100・200・400・1k Hz）
  for (const [f, t] of [[50, "50"], [100, "100"], [200, "200"], [400, "400"], [1000, "1k"], [4000, "4k"]]) { const c = document.createElement("canvas"); c.width = 96; c.height = 40; const x = c.getContext("2d"); x.font = "500 26px monospace"; x.textAlign = "center"; x.fillStyle = f >= LO && f <= HI ? "#f2cf8c" : "#8fb6c4"; x.fillText(t, 48, 30);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, fog: false })); const i = Math.log(f / F0) / Math.log(F1 / F0) * (NB - 1); sp.position.set(X0 + (i + .5) * (W / NB), .02, .72); sp.scale.set(.15, .0625, 1); S.add(sp); } }
$("band").innerHTML = "<em>■</em> 指でよく感じる帯　40–400 Hz";

/* ---------- はじめ ---------- */
R.compileAsync?.(S, C).catch(() => { }).finally(() => { window.MLLoader?.done(); requestAnimationFrame(frame); });
setTimeout(() => say("接触マイク（樹や土に当てる小さなマイク）をつなぐと、中の振動が聴けます。\n触覚の小石は、その音を手のひらの震えに変える石の形の道具です。", 8000), 700);
setTimeout(loadAoi, 900);
addEventListener("pagehide", () => { stream?.getTracks().forEach(t => t.stop()); });
window.__oto = { get mine() { return mine; }, get from() { return from; }, get flowing() { return flowing; }, openMic, setFlow, frames: () => frames, get ac() { return AC; } };
