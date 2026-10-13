/* 森羅研究室の小道具：キャンバスの絵を貼る・浮かぶ札 */
import * as THREE from "three";

export function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// 浮かぶ札（いつもこちらを向く）。w＝幅（m）
//   2026-10-13：世界観と見た目 v1 の札（薄い紺の板・細い碧の線・明朝の白い字・角はほぼ立てる）に
export function label(text, { sub = "", w = 1.2, size = 46, bg = "rgba(6,10,18,.8)", ink = "#eef5fb" } = {}) {
  const pad = 22, W = 1024, lh = size * 1.25, sh = sub ? size * .68 : 0, H = Math.ceil(pad * 2 + lh + (sub ? sh * 1.35 : 0));
  const tex = canvasTex(W, H, (c) => {
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.strokeStyle = "rgba(150,170,240,.35)"; c.lineWidth = 2; c.strokeRect(1, 1, W - 2, H - 2);
    c.fillStyle = "#5cc8e0"; c.fillRect(0, 0, 3, H);
    c.fillStyle = ink; c.font = `600 ${size}px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`; c.textBaseline = "top";
    c.fillText(text, pad + 16, pad, W - pad * 2 - 16);
    if (sub) { c.fillStyle = "#c3cce0"; c.font = `${sh}px "Hiragino Sans","Noto Sans JP",sans-serif`; c.fillText(sub, pad + 16, pad + lh + 4, W - pad * 2 - 16); }
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(w, w * H / W, 1); sp.renderOrder = 5;
  return sp;
}

// 小さな文字の札（模型の中の名札）
export function tag(text, { w = .3, size = 64, bg = "rgba(238,245,251,.94)", ink = "#03060f" } = {}) {
  const c0 = document.createElement("canvas").getContext("2d"); c0.font = `600 ${size}px sans-serif`;
  const tw = Math.ceil(c0.measureText(text).width) + 40, H = size + 30;
  const tex = canvasTex(tw, H, (c) => { c.fillStyle = bg; c.fillRect(0, 0, tw, H); c.fillStyle = ink; c.font = `600 ${size}px "Hiragino Sans","Noto Sans JP",sans-serif`; c.textBaseline = "middle"; c.textAlign = "center"; c.fillText(text, tw / 2, H / 2 + 2); });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(w, w * H / tw, 1); sp.renderOrder = 6; return sp;
}

// ボタン・切りかえを並べる
export function btn(box, text, on, pri) { const b = document.createElement("button"); b.className = "btn" + (pri ? " pri" : ""); b.textContent = text; b.onclick = on; box.appendChild(b); return b; }
export function seg(box, opts, val, on, aria) {
  const d = document.createElement("div"); d.className = "seg"; d.setAttribute("role", "group"); if (aria) d.setAttribute("aria-label", aria);
  const bs = opts.map(([k, t]) => { const b = document.createElement("button"); b.textContent = t; b.setAttribute("aria-pressed", String(k === val)); b.onclick = () => { bs.forEach(x => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); on(k); }; d.appendChild(b); return b; });
  box.appendChild(d); return d;
}
export const fmt = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);

// ---------------------------------------------------------------- デザインの決まり（2026-10-08 本人「各アプリのグラフィックデザインを統一」）
// 台の上の模型：台座＝DS.base、観察箱の枠＝DS.wood、金具＝DS.metal、水＝DS.water。札は二種類だけ：
//   名札（tag：紙の地に墨の字）＝ものの名前・数値／注記（note：墨の地に白い字）＝縮尺・「目安」など模型の約束ごと
export const DS = { base: 0x5b6a62, wood: 0x8a6f4e, metal: 0x8a948e, water: 0x5aa6d6, ink: "#1d2321", paper: "rgba(251,250,246,.92)", noteBg: "rgba(6,10,18,.84)", aoi: "#5cc8e0" };
export const note = (text, { w = .24, size = 46 } = {}) => tag(text, { w, size, bg: DS.noteBg, ink: "#fff" });

// 質感（data/tex の CC0 の WebP）を読む。くり返しの回数を変えて使い回す
const _tx = new Map();
export function tex(name, rx = 1, ry = rx, srgb = true) {
  const key = `${name}|${rx}|${ry}`; if (_tx.has(key)) return _tx.get(key);
  const t = new THREE.TextureLoader().load(`data/tex/${name}.webp`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  _tx.set(key, t); return t;
}
