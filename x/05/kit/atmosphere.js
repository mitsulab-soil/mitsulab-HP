/* mitsulab 共通の部品（atmosphere.js）。© 2026 mitsulab. All rights reserved. */
import * as THREE from "three";

// 時刻の型。地平の色は霧の色と同じにする（空と遠景の境に線が出ない）。sky＝天頂→地平の色、band＝地平のすぐ上の色（夕方の残り火・雨上がりの白み）、fog＝霧の色と濃さ（1 m あたり）
export const PRESETS = {
  // 碧の時刻：日没後 20〜40 分の青い時間。HP の紺とつながる、mitsulab の基本の時刻
  aoi_hour: { sky: [0x07101f, 0x1f2f3f], band: 0x8a7a72, fog: [0x1f2f3f, 0.030], hemi: [0x9fb4cc, 0x241f1a, 0.85], sun: [0xffc8a0, 0.55, [-30, 6, -40]], exposure: 1.05 },
  // 木もれ日：夏の午後の雑木林（胡蝶の夢の森）
  komorebi: { sky: [0x8fb3d1, 0xc8d4dc], band: 0xf2ead8, fog: [0xc8d4dc, 0.011], hemi: [0xdfefff, 0x6b6450, 1.1], sun: [0xfff4e0, 2.4, [8, 14, 6]], exposure: 1.0 },
  // 雨上がり：曇りの朝、空気が湿って遠くが白む（碧の唄 森羅奏会と同じ場面）
  ameagari: { sky: [0x6f7f8c, 0xa9b4ba], band: 0xe2e4e0, fog: [0xa9b4ba, 0.022], hemi: [0xd6e0e8, 0x4a4a40, 1.25], sun: [0xf2f0ea, 0.7, [-6, 10, 4]], exposure: 1.0 },
  // 夜の参道：HP の線の世界（形は線、地は紺）。人の目の高さで使うときは霧を濃く
  sando_night: { sky: [0x03060f, 0x03060f], band: 0x16243a, fog: [0x03060f, 0.018], hemi: [0x6f86a8, 0x0a0a0c, 0.35], sun: [0xbcd2ff, 0.25, [10, 20, -10]], exposure: 1.0 },
};

// 空：大きな球の内側に、天頂→地平のなめらかな色と、地平の帯を描く（画像は読まない）
export function makeSky(p, radius = 400) {
  const top = new THREE.Color(p.sky[0]), hor = new THREE.Color(p.sky[1]), band = new THREE.Color(p.band);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: top }, uHor: { value: hor }, uBand: { value: band } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uTop,uHor,uBand; varying vec3 vD;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){ float y = clamp(vD.y, -1., 1.);
        vec3 c = mix(uHor, uTop, pow(smoothstep(0., 1., y), .55));
        c = mix(c, uBand, exp(-pow(max(y, 0.) / .07, 2.)) * .55);    // 地平のすぐ上の帯
        c = mix(c, uHor * .7, smoothstep(0., -.25, y));                // 地平より下（霧に沈む）
        c += (h(gl_FragCoord.xy) - .5) / 255.;                        // 帯状のむらを消す、ごく弱いディザ
        gl_FragColor = vec4(c, 1.); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), mat); m.frustumCulled = false; m.renderOrder = -1;
  return m;
}

// 場面に大気を入れる。戻り値の lights は、アプリが影を足すときに使う
export function applyAtmosphere(renderer, scene, name = "aoi_hour", o = {}) {
  const p = { ...PRESETS[name], ...(o.override || {}) };
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = p.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const fogC = new THREE.Color(p.fog[0]);
  scene.fog = new THREE.FogExp2(fogC, o.fogDensity ?? p.fog[1]);
  scene.background = fogC.clone();
  const sky = makeSky(p, o.skyRadius ?? 400); scene.add(sky);
  const hemi = new THREE.HemisphereLight(p.hemi[0], p.hemi[1], p.hemi[2]); scene.add(hemi);
  const sun = new THREE.DirectionalLight(p.sun[0], p.sun[1]); sun.position.set(...p.sun[2]); scene.add(sun, sun.target);
  return { preset: p, sky, hemi, sun, fogColor: fogC };
}

// 画面の大きさと端末の重さ：スマホは画素の比を 1 まで（HP と同じ）。重いときは 0.75 まで下げる
export function fitRenderer(renderer, camera, el = renderer.domElement.parentElement || document.body) {
  const mobile = Math.min(innerWidth, innerHeight) < 700;
  const max = mobile ? 1 : 1.5, min = mobile ? .75 : .9;
  let pr = Math.min(devicePixelRatio || 1, max), ema = 16;
  const size = () => { const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight; renderer.setPixelRatio(pr); renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 64 : 50; camera.updateProjectionMatrix(); };
  size(); addEventListener("resize", size);
  // こまの時間を見て、遅い状態が続いたら画素を減らす（戻すのはゆっくり）
  const frame = ms => { ema += (ms - ema) * .05; if (ema > 34 && pr > min) { pr = Math.max(min, pr - .1); size(); ema = 22; } else if (ema < 18 && pr < Math.min(devicePixelRatio || 1, max)) { pr = Math.min(max, pr + .05); size(); ema = 22; } };
  return { mobile, size, frame, get pixelRatio() { return pr; } };
}
