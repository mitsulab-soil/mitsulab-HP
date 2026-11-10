/* © mitsulab. Qualium 大宮：情報の層を、写実の風景の上に積み重ねる（2026-11-10 本人「視覚的な見え方と同じではダメ。層を複数にグラフィカルに重ねる。積層するイメージで、視野の邪魔にならないように」）。
   自分のまわりに、段を離した透ける面を 5 枚。下から 土中（菌糸と根の網）・地形と水（等高の線）・欅の時間（年輪の輪）・紫外（花の印の点）・音（広がる波紋）。
   どれも出典で確かめた事がらの「模式」で、位置や量は実測ではない。
   見え方：面ごとに縁の光る線と模様で見分ける。ふだんは 2 枚、立ち止まると重なりが増える。視野の中心は透かす。色は霞の低い彩度。
   操作：左の形のボタン（44px）に触れると、その層を足す・外す。文字は出さない（読み上げ用の名だけ）。
   軽さ：面 5 枚・各 1 回の描画・絵なし・塗るのは自分のまわりの帯だけ。 */
import * as THREE from "three";

const L = [
  { id: "soil",  name: "土中の菌糸と根", h: .1, c: [.66, .56, .44], kind: 0, idle: true },
  { id: "water", name: "地形と水",       h: .38, c: [.46, .64, .7],  kind: 1, idle: false },
  { id: "time",  name: "欅の時間",       h: .66, c: [.62, .68, .48], kind: 2, idle: false },
  { id: "uv",    name: "紫外",           h: .94, c: [.64, .58, .8],  kind: 3, idle: false },
  { id: "sound", name: "音",             h: 1.16, c: [.56, .66, .84], kind: 4, idle: true },
];
const ICON = [   // 層の模様と同じ形（網・等高線・輪・点・波紋）
  '<path d="M4 15 Q9 9 12 12 T20 7 M7 18 Q10 13 15 15 T21 12 M12 12 L10 19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  '<path d="M3 9 Q8 5 12 9 T21 9 M3 13 Q8 9 12 13 T21 13 M3 17 Q8 13 12 17 T21 17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  '<circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  '<circle cx="7" cy="8" r="2" fill="currentColor"/><circle cx="16" cy="7" r="1.6" fill="currentColor"/><circle cx="11" cy="14" r="2.2" fill="currentColor"/><circle cx="18" cy="15" r="1.5" fill="currentColor"/><circle cx="6" cy="17" r="1.4" fill="currentColor"/>',
  '<path d="M12 12 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M6 12 a6 6 0 0 1 12 0 M3 12 a9 9 0 0 1 18 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
];

const VS = `
uniform float uT; varying vec3 vW; varying float vR;
void main(){ vec3 p = position; vR = length(p.xz);
  vec4 w = modelMatrix * vec4(p, 1.); w.y += sin(w.x * .19 + uT * .45) * .03 + sin(w.z * .15 - uT * .35) * .03; vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w; }`;
const FS = `
precision highp float;
uniform float uT, uA, uK, uIn, uOut; uniform vec3 uC; uniform vec2 uRes, uCam;
varying vec3 vW; varying float vR;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
float line(float v, float w){ float d = abs(fract(v) - .5); return 1. - smoothstep(0., w * fwidth(v) + .001, d); }
void main(){
  vec2 p = vW.xz; float a = 0.;
  if (uK < .5) {        // 土中：菌糸と根の網
    vec2 q = p * .7 + vec2(n2(p * .35), n2(p * .35 + 7.)) * 2.;
    a = max(line(q.x + n2(q * .9) * 1.4, 1.3), line(q.y + n2(q * .9 + 3.) * 1.4, 1.3));
  } else if (uK < 1.5) { // 地形と水：等高の線
    float e = n2(p * .06) * 5. + n2(p * .17) * 1.2; a = line(e * 2.5 - uT * .05, 1.2);
  } else if (uK < 2.5) { // 欅の時間：並木の間隔の年輪の輪
    vec2 c = floor(p / 9.) * 9. + 4.5; float r = length(p - c); a = line(r * 2. - uT * .06, 1.1) * smoothstep(4.4, 1.5, r);
  } else if (uK < 3.5) { // 紫外：花の印の点
    vec2 g = p * 1.2; vec2 i = floor(g), f = fract(g) - .5 + (vec2(h2(i), h2(i + 3.)) - .5) * .4;
    a = smoothstep(.17, .1, length(f)) * step(.45, h2(i + 9.));
  } else {               // 音：自分のまわりから広がる波紋
    float r = length(p - uCam); a = line(r * .7 - uT * .5, 1.4);
  }
  float rimO = 1. - smoothstep(0., .14 + fwidth(vR) * 2., abs(vR - uOut * .97)) ;   // 外の縁の光る線
  float rimI = 1. - smoothstep(0., .05 + fwidth(vR) * 1.5, abs(vR - uIn * 1.04));   // 内の縁の線
  float fill = smoothstep(uIn, uIn * 1.25, vR) * smoothstep(uOut, uOut * .8, vR);
  vec2 s = gl_FragCoord.xy / uRes - .5; s.x *= uRes.x / uRes.y;
  float view = mix(.3, 1., smoothstep(.04, .34, length(s * vec2(1., 1.35))));   // 視野の中心は透かす
  float al = (fill * (.1 + a * .75) + rimO * .9 + rimI * .45) * view * uA;
  if (al < .004) discard;
  gl_FragColor = vec4(uC * (1. + rimO * .35), min(al, .85));
}`;

export function makeSekiso({ scene, camera, groundY, renderer, MOBILE }) {
  const IN = MOBILE ? 2.2 : 2.6, OUT = MOBILE ? 7.5 : 9;
  const geo = new THREE.RingGeometry(IN, OUT, MOBILE ? 56 : 80, 1).rotateX(-Math.PI / 2);
  const res = new THREE.Vector2(), cam2 = new THREE.Vector2(), T = { value: 0 };
  const g = new THREE.Group(); g.name = "sekiso"; scene.add(g);
  const on = L.map(() => true), A = L.map(() => 0);
  const mats = L.map(l => new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    uniforms: { uT: T, uA: { value: 0 }, uK: { value: l.kind }, uC: { value: new THREE.Color(...l.c) }, uRes: { value: res }, uCam: { value: cam2 }, uIn: { value: IN }, uOut: { value: OUT } } }));
  const TILT = [[.03, 0], [-.025, .03], [.035, -.02], [-.03, -.025], [.02, .02]];   // 段ごとに少し傾ける（板が積まれて見えるように）
  const skG = new THREE.CylinderGeometry(OUT, OUT, .07, MOBILE ? 56 : 80, 1, true);   // 面の縁の断面（厚み）
  const skM = L.map(l => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    uniforms: { uA: { value: 0 }, uC: { value: new THREE.Color(...l.c) } },
    vertexShader: "varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
    fragmentShader: "uniform float uA; uniform vec3 uC; varying float vY; void main(){ float e = smoothstep(.035, .02, abs(vY)); gl_FragColor = vec4(uC * 1.15, (.28 + .5 * (1. - smoothstep(.0, .035, abs(abs(vY) - .035)))) * uA); }" }));
  const meshes = L.map((l, i) => { const p = new THREE.Group(); p.rotation.set(TILT[i][0], 0, TILT[i][1]); const m = new THREE.Mesh(geo, mats[i]); m.renderOrder = 5 + i; m.frustumCulled = false; const k = new THREE.Mesh(skG, skM[i]); k.renderOrder = 5 + i; k.frustumCulled = false; p.add(m, k); g.add(p); p.userData.m = m; p.userData.k = k; return p; });
  const tip = document.createElement("div"); tip.setAttribute("aria-hidden", "true"); tip.style.cssText = "position:fixed;z-index:31;pointer-events:none;font:13px/1.4 'Shippori Mincho',serif;color:#f2f4f2;text-shadow:0 1px 3px rgba(0,0,0,.6);opacity:0;transition:opacity .3s"; document.body.appendChild(tip); let tipT = 0;

  // 左の形のボタン（44px・文字なし）。上ほど高い層＝面の積み重ねと同じ順
  const box = document.createElement("div"); box.id = "sekiso";
  box.setAttribute("role", "group"); box.setAttribute("aria-label", "情報の層");
  box.style.cssText = "position:fixed;left:max(8px,env(safe-area-inset-left));top:50%;transform:translateY(-35%);z-index:30;display:flex;flex-direction:column-reverse;gap:2px";
  const btns = L.map((l, i) => {
    const b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", l.name); b.title = l.name; b.setAttribute("aria-pressed", "true");
    const col = `rgb(${l.c.map(v => Math.round(v * 255)).join(",")})`;
    b.style.cssText = `width:44px;height:44px;padding:0;border-radius:50%;border:1px solid rgba(255,255,255,.35);background:rgba(20,28,34,.34);color:${col};cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .2s,background .2s;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)`;
    b.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">${ICON[i]}</svg>`;
    b.addEventListener("pointerdown", e => e.stopPropagation());
    b.addEventListener("click", e => { e.stopPropagation(); on[i] = !on[i]; pin[i] = true; paint(); const r = b.getBoundingClientRect(); tip.textContent = l.name; tip.style.left = (r.right + 8) + "px"; tip.style.top = (r.top + 12) + "px"; tip.style.opacity = "1"; clearTimeout(tipT); tipT = setTimeout(() => tip.style.opacity = "0", 1300); });   // 触れたとき層の名を一瞬
    box.appendChild(b); return b;
  });
  const pin = L.map(() => false);   // 触れた層は、立ち止まりに関係なく出す・外す
  const paint = () => btns.forEach((b, i) => { const v = show(i); b.setAttribute("aria-pressed", String(on[i])); b.style.opacity = on[i] ? (v ? "1" : ".7") : ".38"; b.style.background = on[i] && v ? "rgba(20,28,34,.5)" : "rgba(20,28,34,.22)"; });
  document.body.appendChild(box);

  const last = new THREE.Vector3(); let still = 0, lastShown = "";
  function show(i) { return on[i] && (L[i].idle || pin[i] || still > 1.6); }   // ふだんは 2 枚、立ち止まると重なりが増える
  return {
    L, on,
    update(dt, active) {
      box.style.display = active ? "flex" : "none"; if (!active) tip.style.opacity = "0";
      g.visible = active; if (!active) return;
      T.value += dt; renderer.getDrawingBufferSize(res);
      const cp = camera.position, sp = last.distanceTo(cp) / Math.max(dt, 1e-3); last.copy(cp);
      still = sp < .3 ? still + dt : 0;
      const gy = groundY(cp.x, cp.z), y0 = Number.isFinite(gy) ? gy : cp.y - 1.5;
      cam2.set(cp.x, cp.z);
      let k = "";
      for (let i = 0; i < L.length; i++) {
        const v = show(i); k += v ? 1 : 0;
        A[i] += ((v ? 1 : 0) - A[i]) * Math.min(1, dt * (v ? 1.5 : 4));
        mats[i].uniforms.uA.value = A[i]; skM[i].uniforms.uA.value = A[i];
        meshes[i].visible = A[i] > .01;
        meshes[i].position.set(cp.x, y0 + L[i].h, cp.z);
      }
      if (k !== lastShown) { lastShown = k; paint(); }
    },
  };
}
