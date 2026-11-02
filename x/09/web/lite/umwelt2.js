/* © mitsulab. 環世界 2.0 の重なり（2026-11-02 本人「波を、空中に足す情報から、風景の中から浮かび上がるものへ」）。いまは大宮だけ（本人の go のあと川越・渋谷へ）。
   ・層に入ると、足もとの半径 7 m だけ地面の質感が少しずつ変わる（近い所だけ・円盤 1 枚・軽いシェーダー）。
       Qualia/sight＝紫外の模式（鳥の目に寄せた色の粒）／Qualia/sound＝地面をわたる音の輪／x.soil＝立ち止まると足もとが透けて根と菌糸の模式。
   ・ミツバチ（暖かい季節の昼だけ・1 匹）に近づくと、まわりの動きがゆっくりになる＝虫の速い時間の模式（Healy et al. 2013）。
   ・機械の受けとり方（地理院の標高を読む GIS）は、細い等高の走査線が 10 秒に一度、地形に沿って広がるだけ（Qualia とは呼ばない）。
   ・端末が遅い（平均 50 fps を下回る）ときは、自動でこの効果を止める。 */
import { makeBee, FUR } from "../kit/creatures.js?v=1";
export function makeUmwelt2(THREE, scene, o) {
  const R = 7, disc = new THREE.Mesh(new THREE.CircleGeometry(R, 40).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uA: { value: 0 }, uM: { value: 0 }, uC: { value: new THREE.Color("#b9a8ff") } }, transparent: true, depthWrite: false, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2,
    vertexShader: "varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
    fragmentShader: "uniform float uT,uA,uM; uniform vec3 uC; varying vec2 vP; float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); } void main(){ float r = length(vP)/7.; float fall = (1.-smoothstep(.35,1.,r)); float v; if (uM < .5) { vec2 c = floor(vP*6.); float s = h(c); vec2 f = fract(vP*6.)-.5; v = step(.86,s)*smoothstep(.22,.0,length(f))*(.6+.4*sin(uT*1.3+s*20.)); } else { v = smoothstep(.06,.0,abs(fract(length(vP)*.45-uT*.25)-.5)-.0)*.8; } gl_FragColor = vec4(uC, uA*fall*v); }" }));
  disc.renderOrder = 4; disc.visible = false; scene.add(disc);
  // GIS の走査線（等高の輪が広がる）：64 点の輪を地形に沿わせる
  const NP = 64, lp = new Float32Array((NP + 1) * 3), lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.BufferAttribute(lp, 3));
  const scan = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: "#cfe3ea", transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false })); scan.frustumCulled = false; scan.renderOrder = 4; scene.add(scan);
  // 機械の受けとり方（数の粒）：走査線が足もとを通るとき、地理院の標高を読んだ値と太陽の高さを、足もと 2 m 先に小さな数で一度だけ置く（Qualia とは呼ばない）
  const nc = document.createElement("canvas"); nc.width = 256; nc.height = 64; const nx = nc.getContext("2d"), ntex = new THREE.CanvasTexture(nc);
  const num = new THREE.Sprite(new THREE.SpriteMaterial({ map: ntex, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false, fog: false })); num.scale.set(.9, .225, 1); num.renderOrder = 5; scene.add(num); let numT = 0;
  // ミツバチ（3〜11 月・9〜16 時だけ）
  const now = new Date(), bee = (now.getMonth() >= 2 && now.getMonth() <= 10 && now.getHours() >= 9 && now.getHours() < 16) ? (() => { const n0 = FUR.shells; FUR.shells = 0; const g = makeBee(undefined, {}); FUR.shells = n0; return g; })() : null;   // 毛の重ねは描かない（4 m 先の小さな虫には見えず、重いだけ）
  if (bee) { bee.scale.setScalar(.014); bee.traverse(m => { if (m.isMesh) { m.castShadow = false; m.frustumCulled = false; } }); scene.add(bee); }
  const B = { c: null, a: 0 }; let t = 0, k = 0, cur = null, scanT = 0, fpsA = 60, off = false, slow = 0, said = false;
  return {
    get slow() { return slow; }, get off() { return off; },
    update(dt, active, top, still) {
      const cam = o.camera.position; t += dt; fpsA += ((dt > 0 ? 1 / dt : 60) - fpsA) * .02; if (fpsA < 50 && t > 20) off = true;
      if (!active || off) { disc.visible = false; scan.visible = false; num.visible = false; if (bee) bee.visible = false; slow = 0; return; }
      const gy = o.ground(cam.x, cam.z);
      // 足もとの質感
      const want = top === "sight" || top === "x.umwelt" ? 0 : top === "sound" ? 1 : -1; if (want !== cur && k < .02) cur = want; const kw = want === cur && cur >= 0 ? .55 * (.4 + .6 * still) : 0;
      k += (kw - k) * Math.min(1, dt * .6); disc.visible = k > .01; if (disc.visible) { disc.position.set(cam.x, gy + .04, cam.z); disc.material.uniforms.uA.value = k; disc.material.uniforms.uM.value = cur; disc.material.uniforms.uT.value = t; disc.material.uniforms.uC.value.set(cur ? "#a9b7d8" : "#b9a8ff"); }
      if (top === "x.soil" && still > .9 && o.soilOpen && !this._soilT) { this._soilT = t; o.soilOpen(cam.x, cam.z); } if (this._soilT && t - this._soilT > 20) this._soilT = 0;
      // GIS の走査線
      scanT += dt; const ph = (scanT % 10) / 10, rr = 2 + ph * 26; scan.visible = ph < .9; if (scan.visible) { for (let i = 0; i <= NP; i++) { const a = i / NP * 6.2832, x = cam.x + Math.cos(a) * rr, z = cam.z + Math.sin(a) * rr; lp[i * 3] = x; lp[i * 3 + 1] = o.ground(x, z) + .06; lp[i * 3 + 2] = z; } lg.attributes.position.needsUpdate = true; scan.material.opacity = .22 * Math.sin(ph / .9 * Math.PI); }
      if (ph < .05 && t - numT > 9) { numT = t; const f = o.camera.getWorldDirection(new THREE.Vector3()), x = cam.x + f.x * 2.4, z = cam.z + f.z * 2.4, e = o.ground(x, z); nx.clearRect(0, 0, 256, 64); nx.fillStyle = "rgba(220,236,242,.95)"; nx.font = "500 22px ui-monospace,monospace"; nx.fillText(`標高 ${e.toFixed(1)} m` + (o.sun ? `  日 ${o.sun()}°` : ""), 8, 40); ntex.needsUpdate = true; num.position.set(x, e + .35, z); }
      { const a = t - numT < 6 ? Math.sin(Math.min(1, (t - numT) / 6) * Math.PI) * .7 : 0; num.material.opacity = a; num.visible = a > .01; }
      // ミツバチ：見る人の前 3〜5 m の腰の高さをゆっくり行き来
      if (bee) { if (!B.c || Math.hypot(B.c.x - cam.x, B.c.z - cam.z) > 30) { const f = o.camera.getWorldDirection(new THREE.Vector3()); B.c = { x: cam.x + f.x * 4.5, z: cam.z + f.z * 4.5 }; }
        B.a += dt * .5; const x = B.c.x + Math.cos(B.a) * 1.2, z = B.c.z + Math.sin(B.a * 1.3) * .9; bee.position.set(x, o.ground(x, z) + .7 + Math.sin(t * 1.7) * .15, z); bee.rotation.y = B.a + Math.PI / 2; bee.userData.animate?.(t, true); bee.visible = true;
        const d = bee.position.distanceTo(cam), w = d < 2.6 ? Math.min(1, (2.6 - d) / 1.2) : 0; slow += (w - slow) * Math.min(1, dt * 1.5);
        if (slow > .6 && !said) { said = true; o.say?.("虫の時間に寄せた模式：ハエやハチなど多くの虫は、人より速い光の変化を見分けます（Healy et al. 2013, Animal Behaviour 86:685）"); } }
    },
  };
}
