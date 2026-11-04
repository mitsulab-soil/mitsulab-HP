/* Qualium 共通：冒頭の 3D 地図の縁を溶かす霞（kit/mapveil.js・2026-11-04 本人「四角い枠が視覚的に見えるので、境界を無くして」「近未来感を出して、シンプルな構成に」）
   細かい地形（四角）と遠くの写真の継ぎ目を、楕円の霞で上から包んで溶かす。霞の色は毎こま scene.fog の色に合わせ、地平線の霞へそのまま続く。
   霞の内側の縁に、細い光の輪を一本だけ置く（ゆっくり息をする）。描くのは平らな板 2 枚だけ（軽い）。
   使い方：const MV = makeMapVeil({ THREE, parent: world, rect: [x0, z0, x1, z1], y0, fog: scene.fog });
           毎こま MV.update(dt, on)   on＝3D 地図のとき true（霞はなめらかに出入りする）
           地図の上に残したい物（始める場所の印・道筋）は MV.lift(obj) で霞より後に描く */
export function makeMapVeil({ THREE, parent, rect, y0 = 0, top = 170, shrink = 1, focus = null, fog = null, color = "#9fe6f6" }) {
  const [x0, z0, x1, z1] = rect; let cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hx = Math.abs(x1 - x0) / 2, hz = Math.abs(z1 - z0) / 2;
  if (focus && focus.length) {   // 始める場所のまとまりを真ん中に。楕円は四角い地形の内側に収める（縁の外は霞が満ちる）
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const [x, z] of focus) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); }
    cx = Math.min(Math.max((a + c) / 2, Math.min(x0, x1) + 200), Math.max(x0, x1) - 200); cz = Math.min(Math.max((b + d) / 2, Math.min(z0, z1) + 200), Math.max(z0, z1) - 200);
    const ex = Math.min(cx - Math.min(x0, x1), Math.max(x0, x1) - cx) / 1.06, ez = Math.min(cz - Math.min(z0, z1), Math.max(z0, z1) - cz) / 1.06;
    hx = Math.min(ex, Math.max((c - a) / 2 * 1.35 + 160, ex * .7)); hz = Math.min(ez, Math.max((d - b) / 2 * 1.35 + 160, ez * .7)); }
  const S = Math.max(hx, hz) * 7;   // 板は地平線の手前まで広げる（霞の外は fog と同じ色なので縁は見えない）
  const U = { uK: { value: 0 }, uT: { value: 0 }, uC: { value: new THREE.Vector2(cx, cz) }, uR: { value: new THREE.Vector2(hx * shrink, hz * shrink) }, uH: { value: new THREE.Color("#8a96a0") }, uL: { value: new THREE.Color(color) }, uA: { value: 1 }, uRing: { value: 1 } };
  const mk = (h, a, ring, e0 = .62, e1 = .98, dt = true) => {
    const u = { ...U, uA: { value: a }, uRing: { value: ring }, uE0: { value: e0 }, uE1: { value: e1 } };
    const m = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, depthTest: dt, fog: false, toneMapped: false,
      vertexShader: `varying vec2 vP; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vP = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uK, uT, uA, uRing, uE0, uE1; uniform vec2 uC, uR; uniform vec3 uH, uL; varying vec2 vP;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
        void main(){
          vec2 q = (vP - uC) / uR; float d = length(q), an = atan(q.y, q.x);
          float wob = (vn(vec2(an * 2.2, uT * .05)) - .5) * .07 + (vn(vP / 260. + uT * .01) - .5) * .06;   // 縁は幾何の線にしない（ゆらぐ霞）
          float a = smoothstep(uE0, uE1, d + wob) * (1. - .4 * smoothstep(2., 3.6, d)) * uA;   // 縁で霞が満ち、ずっと遠くで少しだけ晴れて遠くの写真が霞の奥に続く
          float fw = fwidth(d); float rr = abs(d - .74 - wob * .5); float ring = (1. - smoothstep(0., fw * 1.6, rr)) * uRing * (.55 + .45 * sin(uT * .6));
          float tick = step(.5, fract(an * 28.6479)) ;   // 輪は細い破線（距離の目盛りのように）
          gl_FragColor = vec4(mix(uH, uL, ring), max(a, ring * .5 * tick) * uK);
          #include <colorspace_fragment>
        }` });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(S * 2, S * 2).rotateX(-Math.PI / 2), m);
    p.position.set(cx, y0 + h, cz); p.renderOrder = 60; p.frustumCulled = false; p.visible = false; p.name = "mapVeil"; parent.add(p); return p;
  };
  const planes = [mk(4, .85, 1), mk(top, 1, 0, .74, 1.06, false)];   // 地面のすぐ上（淡い）と、いちばん高い建物より上（縁で満ちる）の 2 枚＝奥行きのある霞。縁の外の地形・建物・木は上の板が隠す
  let k = 0, t = 0;
  return {
    planes,
    lift(o) { o?.traverse?.(n => { if (n.isMesh || n.isLine || n.isPoints || n.isSprite) n.renderOrder = Math.max(n.renderOrder, 61); }); },
    update(dt, on) {
      k += ((on ? 1 : 0) - k) * Math.min(1, dt * 2.4); t += dt;
      const vis = k > .004; for (const p of planes) { p.visible = vis; if (!vis) continue; const u = p.material.uniforms; u.uK.value = k; u.uT.value = t; if (fog) u.uH.value.copy(fog.color); }
    }
  };
}
