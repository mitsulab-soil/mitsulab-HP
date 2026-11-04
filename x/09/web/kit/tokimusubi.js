/* © mitsulab. 夜の行事「時結びの杜」（武蔵一宮氷川神社ライトアップイベント）を、会期の夜だけ控えめに描く（2026-11-05 本人の指示）。
   出典（一次）：さいたま市「武蔵一宮氷川神社ライトアップイベント「時結びの杜」」https://www.city.saitama.lg.jp/003/002/018/oomiya/p133085.html
   会期＝令和8年11月7日〜11月23日。月〜木 17:30〜20:00、金・土・日・祝 17:30〜21:00。二の鳥居・三の鳥居等のライトアップ、楼門等へのプロジェクションマッピング。
   描くのは「下から照らされた淡い光」だけ。行事の映像・意匠（プロジェクションの絵柄・ロゴ）は写さない。会期の外や昼は何も出さない。
   試すとき：URL に ?toki=1 */
import * as THREE from "three";

const SPOTS = [   // structures.glb と同じ座標（struct_place.json）。h＝照らされる高さの目安
  { n: "二の鳥居", p: [-21.0, 12.63, -425.5], h: 13, w: 17 },
  { n: "三の鳥居", p: [-47.4, 13.77, -862.2], h: 7.5, w: 9 },
  { n: "楼門", p: [-89.0, 12.87, -1000.6], h: 11, w: 15 },
];
const SAY = "いま境内では、さいたま市の「時結びの杜」の会期中。夜、二の鳥居や三の鳥居が照らされ、楼門には光の映像が映されています。";
const HOLI = ["2026-11-23"];   // 会期中の祝日（勤労感謝の日）

function jstNow() { const d = new Date(Date.now() + 9 * 3600e3); return { ymd: d.toISOString().slice(0, 10), dow: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes() }; }
export function inSession(force) {
  if (force) return true;
  const t = jstNow(); if (t.ymd < "2026-11-07" || t.ymd > "2026-11-23") return false;
  const late = t.dow === 0 || t.dow === 5 || t.dow === 6 || HOLI.includes(t.ymd);
  return t.min >= 17 * 60 + 30 && t.min < (late ? 21 : 20) * 60;
}

export function attachTokimusubi(q, { speak } = {}) {
  const force = /[?&]toki=1/.test(location.search);
  const c = document.createElement("canvas"); c.width = 64; c.height = 128; const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, "rgba(255,214,160,.85)"); gr.addColorStop(.45, "rgba(255,200,150,.28)"); gr.addColorStop(1, "rgba(255,200,150,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 128);
  const ex = g.getImageData(0, 0, 64, 128); for (let y = 0; y < 128; y++) for (let x = 0; x < 64; x++) { const u = Math.abs(x - 31.5) / 32, i = (y * 64 + x) * 4 + 3; ex.data[i] *= Math.max(0, 1 - u * u); } g.putImageData(ex, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const grp = new THREE.Group(); grp.visible = false; grp.name = "tokimusubi";
  for (const s of SPOTS) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .32, fog: false, toneMapped: false }));
    m.center.set(.5, 0); m.scale.set(s.w, s.h * 1.15, 1); m.position.set(s.p[0], s.p[1] - .2, s.p[2]); m.renderOrder = 3; grp.add(m);
  }
  (q.world || q.scene).add(grp);
  let said = false;
  const tick = () => {
    const night = force || ((q.sunAE?.[1] ?? 0) < -4);
    const on = inSession(force) && night && q.mode === "walk"; grp.visible = on;
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
