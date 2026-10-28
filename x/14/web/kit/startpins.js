/* 始める場所の印と名札（地図の上の 3D・ほかの Qualium でも使う共通の形）2026-10-27 本人
   「どこから歩きはじめますか」を GUI の一覧でなく、地図の上に 3D の小さく凝った印と明朝の名札で置く。
   触れると選べて、選んだ所が光り、「ここから歩く」はその印のそばに出る。名前は省略しない（「二」でなく「二の鳥居」）。
   使い方：
     const SP = makeStartPins({ THREE, parent, camera, groundY, mobile, items: [{ name, x, z, kind }], note: { text, x, z }, goBtn, onSelect(i), onGo(i) });
     毎こま SP.update(t) ／ 見せる SP.show(true|false) ／ 選ぶ SP.select(i) ／ 画面で押した所 SP.pick(x, y) → i か -1
   kind：'torii'・'shrine'・'here'（現在地）・'area'（町）・''。goBtn は既存のボタン（押すと onGo）。 */
export function makeStartPins({ THREE, parent, camera, groundY, mobile = false, items, note = null, goBtn = null, preview = null, onSelect, onGo, color = "#9bdcf0", pick = "#ffb648" }) {
  const g = new THREE.Group(); g.name = "startPins"; parent.add(g);
  const css = document.createElement("style"); css.textContent = `
.spLayer{position:fixed;inset:0;pointer-events:none;z-index:6}
.spTag{position:absolute;left:0;top:0;transform:translate(-50%,-100%);pointer-events:auto;cursor:pointer;min-height:44px;min-width:44px;display:flex;align-items:center;gap:8px;padding:6px 14px 7px 10px;border:1px solid rgba(155,220,240,.55);border-radius:3px;background:rgba(6,12,22,.62);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);color:#eef5f8;font:600 14px/1.25 "Shippori Mincho","Hiragino Mincho ProN","Yu Mincho",serif;letter-spacing:.1em;white-space:nowrap;transition:border-color .25s,background .25s,box-shadow .25s}
.spLead{position:absolute;left:0;top:0;height:1px;background:rgba(155,220,240,.7);transform-origin:0 0;pointer-events:none}
.spTag .no{font:300 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.18em;color:#9bdcf0}
.spTag.on{border-color:${pick};background:rgba(30,20,6,.72);box-shadow:0 0 0 1px ${pick}55,0 0 18px ${pick}44}.spTag.on .no{color:${pick}}
.spTag.k-here{border-style:dashed}.spTag.k-area{border-color:rgba(232,201,143,.6)}
.spTag:focus-visible{outline:1px solid #fff;outline-offset:2px}
.spTitle{position:fixed;left:50%;top:calc(max(12px,env(safe-area-inset-top)) + 62px);transform:translateX(-50%);pointer-events:none;text-align:center;color:#f2f7f9;font:600 16px/1.5 "Shippori Mincho","Hiragino Mincho ProN",serif;letter-spacing:.14em;text-shadow:0 0 12px rgba(6,12,22,.95),0 1px 2px #000;white-space:nowrap}.spTitle small{display:block;font-size:11.5px;letter-spacing:.08em;font-weight:500;opacity:.9}
.spTag.k-here{border-color:rgba(255,255,255,.7)}
.spNote{position:absolute;left:0;top:0;transform:translate(-50%,0);pointer-events:none;padding:6px 12px;border-radius:3px;background:rgba(6,12,22,.62);color:#eaf3f6;font:500 13px/1.6 "Shippori Mincho","Hiragino Mincho ProN",serif;letter-spacing:.12em;text-shadow:0 0 10px rgba(6,12,22,.95),0 1px 2px rgba(0,0,0,.9);white-space:nowrap}
.spGo{position:absolute!important;left:0;top:0;transform:translate(-50%,10px);pointer-events:auto;z-index:7;white-space:nowrap}
.spCard{position:fixed;left:50%;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 8px);transform:translate(-50%,8px);width:min(420px,calc(100vw - 32px));z-index:9;pointer-events:auto;opacity:0;transition:opacity .25s,transform .25s;border:1px solid rgba(255,182,72,.55);border-radius:4px;background:rgba(6,12,22,.86);box-shadow:0 10px 40px rgba(0,0,0,.45);color:#eef3f6;overflow:hidden;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.spCard.on{opacity:1;transform:translate(-50%,0)}.spCard[hidden]{display:none}
.spCard canvas{display:block;width:100%;aspect-ratio:16/9;height:auto;background:#0b1420;cursor:pointer}
.spCard .eyeTag{position:absolute;left:10px;top:8px;font:500 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.16em;color:rgba(238,243,246,.85);text-shadow:0 1px 3px #000}
.spCard .tx{padding:10px 14px 12px}.spCard h3{margin:0 0 4px;font:600 15px/1.4 "Shippori Mincho","Hiragino Mincho ProN",serif;letter-spacing:.1em}
.spCard p{margin:0;font:400 13px/1.7 "Shippori Mincho","Hiragino Mincho ProN",serif;letter-spacing:.03em;color:#dde7ec}
.spCard .src{display:block;margin-top:6px;font:400 10.5px/1.5 system-ui,sans-serif;color:rgba(221,231,236,.7)}.spCard .src a{color:inherit}
.spCard .hint{margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.12);font:500 12px/1.5 "Shippori Mincho","Hiragino Mincho ProN",serif;letter-spacing:.06em;color:#ffcf86}
.spCard .x{position:absolute;right:4px;top:4px;width:44px;height:44px;border:0;background:none;color:#fff;font:300 22px/1 system-ui;text-shadow:0 1px 3px #000;cursor:pointer}
@media (min-width:900px){.spCard{left:auto;right:24px;bottom:96px;transform:translateY(8px)}.spCard.on{transform:none}}
@media (max-width:640px){.spCard p{font-size:12.5px;line-height:1.65}.spCard canvas{aspect-ratio:2/1}.spTag{font-size:13px;padding:5px 10px 6px 8px;letter-spacing:.06em}.spNote{font-size:11px;letter-spacing:.04em}}`;
  document.head.appendChild(css);
  const layer = document.createElement("div"); layer.className = "spLayer"; document.body.appendChild(layer);
  // 印：小さく凝った 3D（光る芯の八面体・細い二重の輪・脈打つ光・細い柱）。大きさは画面で一定に近づける
  const coreG = new THREE.OctahedronGeometry(1, 0), hereG = new THREE.ConeGeometry(.8, 2, 3).rotateX(Math.PI), ringG = new THREE.TorusGeometry(2.2, .07, 6, 64), ring2G = new THREE.RingGeometry(2.9, 3.05, 64), beamG = new THREE.CylinderGeometry(.12, .12, 1, 6, 1, true).translate(0, .5, 0);
  const pins = items.map((it, i) => {
    const y = groundY(it.x, it.z), c = new THREE.Color(it.kind === "area" ? "#e8c98f" : it.kind === "here" ? "#ffffff" : color);
    const mk = (geo, op) => new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c.clone(), transparent: true, opacity: op, depthWrite: false, fog: false, toneMapped: false, side: THREE.DoubleSide }));
    const P = new THREE.Group(); P.position.set(it.x, y, it.z);
    const core = mk(it.kind === "here" ? hereG : coreG, 1), ring = mk(ringG, .9), ring2 = mk(ring2G, .5), pulse = mk(ring2G, .6), beam = mk(beamG, .45), foot = mk(ring2G, .55);
    foot.rotation.x = -Math.PI / 2; foot.position.y = .5; pulse.rotation.x = -Math.PI / 2; pulse.position.y = .5;
    const head = new THREE.Group(); head.add(core, ring, ring2); P.add(beam, foot, pulse, head); g.add(P);
    for (const m of [core, ring, ring2, pulse, beam, foot]) m.renderOrder = 30;
    const tag = document.createElement("button"); tag.type = "button"; tag.className = "spTag k-" + (it.kind || "pt"); tag.innerHTML = (it.no ? `<span class="no">${it.no}</span>` : "") + `<span class="nm">${it.name}</span>`;
    const lead = document.createElement("i"); lead.className = "spLead"; layer.appendChild(lead); tag.setAttribute("aria-label", it.name + "を選ぶ"); tag.addEventListener("click", e => { e.stopPropagation(); api.select(i); }); layer.appendChild(tag);
    return { it, P, head, core, ring, ring2, pulse, beam, foot, tag, lead, y, c };
  });
  const title = document.createElement("div"); title.className = "spTitle"; title.innerHTML = "どこから歩きはじめますか<small>印を押すと、その場所の眺め。もう一度押すと、歩きはじめます</small>"; layer.appendChild(title);
  let noteEl = null; if (note) { noteEl = document.createElement("div"); noteEl.className = "spNote"; noteEl.textContent = note.text; layer.appendChild(noteEl); }
  /* 2026-10-28 本人：「ここから歩く」のボタンは外す。1 回目に押す＝説明と目の高さの眺め、同じ所をもう 1 回＝そこから歩く */
  if (goBtn) { goBtn.hidden = true; goBtn.style.display = "none"; goBtn = null; }
  let card = null;
  if (preview) { card = document.createElement("div"); card.className = "spCard"; card.hidden = true; card.setAttribute("role", "dialog");
    card.innerHTML = `<canvas width="480" height="270" aria-hidden="true"></canvas><span class="eyeTag">目の高さ 1.5 m</span><button class="x" type="button" aria-label="閉じる">×</button><div class="tx"><h3></h3><p></p><span class="src"></span><div class="hint">同じ印をもう一度押すと、ここから歩きます</div></div>`;
    document.body.appendChild(card);
    card.querySelector(".x").addEventListener("click", e => { e.stopPropagation(); api.select(-1); });
    card.querySelector("canvas").addEventListener("click", e => { e.stopPropagation(); if (api.sel >= 0) api.select(api.sel); });   // 眺めを押しても歩きはじめる
  }
  const showCard = i => { if (!card) return; const p = pins[i]; if (i < 0 || !p || p.it.kind === "here") { card.classList.remove("on"); card.hidden = true; return; }
    const inf = preview.info?.(i) || {}; card.querySelector("h3").textContent = p.it.name; card.querySelector("p").textContent = inf.text || ""; card.querySelector(".src").innerHTML = inf.src ? "典拠：" + inf.src : "";
    card.querySelector(".hint").textContent = "同じ印をもう一度押すと、" + p.it.name + "から歩きます";
    card.hidden = false; try { preview.draw?.(card.querySelector("canvas"), i); } catch (e) { console.warn("eyeview", e); } requestAnimationFrame(() => card.classList.add("on")); };
  const _v = new THREE.Vector3(), PK = new THREE.Color(pick);
  const fpx = () => innerHeight / 2 / Math.tan(camera.fov * Math.PI / 360);
  const api = {
    sel: -1, pins, group: g, layer,
    select(i) { if (i >= 0 && i === api.sel && pins[i]?.it.kind !== "here") { showCard(-1); onGo?.(i); return; }   /* 同じ印を 2 回目＝そこから歩く */
      api.sel = i; showCard(i); pins.forEach((p, k) => { const on = k === i; p.tag.classList.toggle("on", on); p.tag.setAttribute("aria-pressed", String(on)); for (const m of [p.core, p.ring, p.ring2, p.pulse, p.beam, p.foot]) m.material.color.copy(on ? PK : p.c); });
      if (goBtn) { goBtn.hidden = i < 0; goBtn.disabled = i < 0; if (i >= 0) goBtn.setAttribute("aria-label", pins[i].it.name + "から歩く"); }
      onSelect?.(i); },
    movePin(i, x, z) { const p = pins[i]; if (!p) return; p.it.x = x; p.it.z = z; p.P.position.set(x, groundY(x, z), z); },
    show(on) { g.visible = on; layer.hidden = !on; if (!on) { showCard(-1); if (api.sel >= 0) api.select(-1); } },   /* 地図を離れたら選択も戻す（戻ったとき 1 回目でいきなり歩かない） */
    card() { return card && !card.hidden ? card.getBoundingClientRect() : null; },
    pick(x, y) { let b = -1, bd = (mobile ? 34 : 28) ** 2; pins.forEach((p, k) => { p.head.getWorldPosition(_v).project(camera); if (_v.z > 1) return; const sx = (_v.x + 1) / 2 * innerWidth, sy = (1 - _v.y) / 2 * innerHeight, d = (sx - x) ** 2 + (sy - y) ** 2; if (d < bd) { bd = d; b = k; } }); return b; },
    update(t = performance.now() / 1000, avoid = null) {
      if (!g.visible) return []; const W = innerWidth, H = innerHeight, F = fpx(), placed = [];
      const rank = k => (k === api.sel ? 4 : 0) + (pins[k].it.kind === "area" ? 2 : 0) + (pins[k].it.kind === "here" ? 1 : 0); const order = pins.map((p, k) => k).sort((a, b) => rank(b) - rank(a));
      for (const k of order) { const p = pins[k], on = k === api.sel, d = camera.position.distanceTo(p.P.position);
        const s = d * (mobile ? 9 : 8) / F * (on ? 1.35 : 1) * (p.it.kind === "area" ? .7 : 1);   // 画面でおよそ 8〜9px の芯
        const hy = s * 9; p.head.position.y = hy; p.head.scale.setScalar(s); p.core.rotation.y = t * .8 + k; p.core.scale.set(1, 1.5, 1);
        p.ring.rotation.set(Math.PI / 2 + Math.sin(t * .6 + k) * .35, t * .5 + k, 0); p.ring2.lookAt(camera.position);
        p.beam.scale.set(s, hy, s); p.foot.scale.setScalar(s * .9); p.ring2.scale.setScalar(.75); const ph = (t * .6 + k * .17) % 1; p.pulse.scale.setScalar(s * (1 + ph * 1.6)); p.pulse.material.opacity = (1 - ph) * (on ? .8 : .45);
        // 名札（印の上）。重なれば、選んだ札を残して小さく逃がす
        _v.set(p.P.position.x, p.P.position.y + hy + s * 4, p.P.position.z).project(camera); let x = (_v.x + 1) / 2 * W, y = (1 - _v.y) / 2 * H; const x0 = x, y0 = y;
        x = Math.max(84, Math.min(W - 84, x)); const okAt = (xx, yy) => yy > 176 && yy < H - 30 && !(avoid && xx - 60 < avoid.x && yy - 44 < avoid.y); let ok = _v.z < 1 && (_v.x + 1) / 2 * W > 8 && (_v.x + 1) / 2 * W < W - 8;   /* 置けない所（上の見出し・層の一覧）は、下の候補へずらす */
        if (ok) { const hit = (xx, yy) => placed.some(q => Math.abs(q[0] - xx) < (mobile ? 130 : 150) && Math.abs(q[1] - yy) < 60); if (hit(x, y) || !okAt(x, y)) { const D = mobile ? 135 : 155; const c = [[x, y + 48], [x, y - 48], [x - D, y], [x + D, y], [x - D, y + 48], [x + D, y + 48], [x - D, y - 48], [x + D, y - 48], [x, y + 96], [x, y - 96], [x - D, y + 96], [x + D, y + 96], [x + D * .7, y + 60], [x + D * .7, y + 110], [x, y + 140], [x + D, y + 140]].map(([xx, yy]) => [Math.max(84, Math.min(W - 84, xx)), yy]).find(([xx, yy]) => okAt(xx, yy) && !hit(xx, yy) && Math.hypot(xx - x0, yy - y0) < (mobile ? 130 : 170));   /* 10-28 夜：遠くへ逃がした名札の長い線が地図を横切らないように、離れすぎる所には置かない（印は押せる） */ if (!c) ok = false; else [x, y] = c; } }   /* 重なれば上下・左右へずらし、だめなら出さない */   /* 重なれば上下へずらし、だめなら出さない */
        p.tag.style.display = ok ? "" : "none"; { const dx = x - x0, dy = y - y0, L = Math.hypot(dx, dy); if (ok && L > 30) { p.lead.style.display = ""; p.lead.style.width = L + "px"; p.lead.style.transform = `translate(${x0 | 0}px,${y0 | 0}px) rotate(${Math.atan2(dy, dx)}rad)`; } else p.lead.style.display = "none"; }   /* ずらした名札は、細い線で印とつなぐ */ if (ok) { placed.push([x, y]); p.tag.style.transform = `translate(${x | 0}px,${y | 0}px) translate(-50%,-100%)`; }
        if (on && goBtn) { goBtn.style.display = ""; _v.set(p.P.position.x, p.P.position.y, p.P.position.z).project(camera); const vis = _v.z < 1 && Math.abs(_v.x) < .95 && Math.abs(_v.y) < .9; const gx = vis ? Math.max(90, Math.min(W - 90, (_v.x + 1) / 2 * W)) : W / 2, gy = vis ? Math.min(H - 70, (1 - _v.y) / 2 * H) : H - 96;   /* 選んだ印が画面の外のときは、下の真ん中に（いつでも押せる） */ goBtn.style.transform = `translate(${gx | 0}px,${gy | 0}px) translate(-50%,12px)`; }
      }
      const out = placed.slice();
      if (noteEl) { _v.set(note.x, groundY(note.x, note.z) + 4, note.z).project(camera); const ok = _v.z < 1; noteEl.style.display = ok ? "" : "none"; if (ok) { const nx = Math.max(140, Math.min(W - 140, (_v.x + 1) / 2 * W)), ny = Math.min(H - 60, (1 - _v.y) / 2 * H) + 30; out.push([nx - 120, ny], [nx, ny], [nx + 120, ny]); } if (ok) noteEl.style.transform = `translate(${Math.max(140, Math.min(W - 140, (_v.x + 1) / 2 * W)) | 0}px,${Math.min(H - 60, (1 - _v.y) / 2 * H) | 0}px) translate(-50%,0)`; }
      return out;
    },
  };
  return api;
}
