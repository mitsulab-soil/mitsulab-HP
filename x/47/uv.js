/* uv.js ── Qualia/uv：景色を、ミツバチ・アゲハが受けとる紫外を含む色に置きかえる模式（偽色）。 */
import { create, THREE, hash1 } from './kit/qfield.js';

export function start(canvas) {
  const F = create(canvas, { pitch: matchMedia('(max-width:760px)').matches ? -.42 : -.24 });
  const kind = { value: 0 }, KINDV = { bee: 0, ageha: 1 };
  // 偽色：ミツバチの三つの受容体（紫外・青・緑）を、画面の青・緑・赤に割りあてる（紫外の写真でよく使う割りあて）。
  // アゲハは紫外・紫・青・緑・赤の受容体をもつので、赤も残し、紫外を青に重ねる（模式）。
  const pars = 'uniform float uUVr, uKind; vec3 qUV( vec3 h, float u ){ vec3 bee = vec3( h.g, h.b * 1.2, u ); vec3 ag = vec3( h.r * 1.05, h.g * .7, min( 1.2, h.b * .35 + u * 1.3 ) ); return mix( bee, ag, uKind ) * 1.25; }';
  const add = (m, uvr, key, albedo) => F.patch(m, { key: 'uv' + key, uniforms: { uUVr: { value: uvr }, uKind: kind }, pars, albedo: albedo || '{ vec3 h_ = diffuseColor.rgb; float u_ = uUVr * dot( h_, vec3( .3, .4, .3 ) ); diffuseColor.rgb = mix( h_, qUV( h_, u_ ), uLens ); }' });
  // 紫外の返しかたは材質ごとの模式（葉は紫外をあまり返さない＝Chittka ほか 1994。石・砂利は比べて多く返す）
  add(F.gMat, .35, 'g'); add(F.pMat, .5, 'p'); add(F.tMat, .3, 't'); add(F.lMat, .08, 'l'); add(F.stMat, .55, 's'); add(F.clothM, .45, 'c'); add(F.skinM, .15, 'k');
  F.patch(F.domeM, { key: 'uvsky', uniforms: { uKind: kind }, pars: 'uniform float uKind;', albedo: '{ vec3 h_ = diffuseColor.rgb; vec3 f_ = mix( vec3( h_.g * .7, h_.b * .9, 1. ), vec3( h_.r * .8, h_.g * .8, 1. ), uKind ); diffuseColor.rgb = mix( h_, f_, uLens ); }' });
  const fogH = F.S.fog.color.clone(), fogB = new THREE.Color('#8fa0e8'), fogA = new THREE.Color('#b8b0ee');

  // 黄色い五弁の花（キジムシロのなかま・模式）。花びらの先は紫外を返し、付け根は紫外を吸う＝「的」の模様（Koski & Ashman 2015）
  const fc = document.createElement('canvas'); fc.width = fc.height = 128; { const g = fc.getContext('2d'); g.translate(64, 64);
    for (let k = 0; k < 5; k++) { g.save(); g.rotate(k * Math.PI * 2 / 5); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-30, -18, -34, -58, -6, -60); g.quadraticCurveTo(0, -54, 6, -60); g.bezierCurveTo(34, -58, 30, -18, 0, 0); g.fillStyle = '#f2cf2a'; g.fill(); g.strokeStyle = 'rgba(190,140,10,.35)'; g.lineWidth = 1; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(0, -8); g.lineTo(i * 6, -52); g.stroke(); } g.restore(); }
    g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fillStyle = '#d9a514'; g.fill(); for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 4 + (i % 3) * 3; g.fillStyle = '#c88a10'; g.fillRect(Math.cos(a) * r - 1, Math.sin(a) * r - 1, 2, 2); } }
  const fT = new THREE.CanvasTexture(fc); fT.colorSpace = THREE.SRGBColorSpace;
  const flM = new THREE.MeshStandardMaterial({ map: fT, alphaTest: .4, side: THREE.DoubleSide, roughness: .6 });
  F.patch(flM, { key: 'uvfl', uniforms: { uKind: kind }, pars: pars.replace('uniform float uUVr, uKind;', 'uniform float uKind;') + ' float qFl( vec2 p ){ return smoothstep( .15, .27, length( p - .5 ) ); }',
    albedo: '{ vec3 h_ = diffuseColor.rgb; float r_ = length( vMapUv - .5 ); float u_ = qFl( vMapUv ) * .95; vec3 f_ = qUV( h_, u_ ); f_ += vec3( .25, -.05, -.2 ) * ( 1. - smoothstep( .14, .2, r_ ) ) * uLens * ( .6 + .4 * sin( uTime * 2.4 ) ); diffuseColor.rgb = mix( h_, f_, uLens ); }' });
  const stemM = new THREE.MeshStandardMaterial({ color: '#5d7440', roughness: .9 }); add(stemM, .08, 'st');
  const NF = F.mobile ? 26 : 40, flowers = new THREE.InstancedMesh(new THREE.CircleGeometry(.05, 12).rotateX(-Math.PI / 2), flM, NF);
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(.003, .004, 1, 4).translate(0, .5, 0), stemM, NF);
  const leafy = new THREE.InstancedMesh(new THREE.PlaneGeometry(.09, .05).rotateX(-Math.PI / 2.3), stemM, NF * 3);
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler();
    for (let i = 0; i < NF; i++) { const g = i % 3, cx = [1.1, -1.5, .3][g], cz = [2.3, 1.6, 2.45][g], a = hash1(i * 1.3) * 6.28, r = Math.sqrt(hash1(i * 2.7)) * .55;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, h = .1 + hash1(i * 3.9) * .12;
      e.set((hash1(i * 5.1) - .5) * .5, hash1(i) * 6, (hash1(i * 6.2) - .5) * .5); q.setFromEuler(e);
      m4.compose(v.set(x, h, z), q, s.setScalar(.85 + hash1(i * 4.4) * .4)); flowers.setMatrixAt(i, m4);
      m4.compose(v.set(x, 0, z), q.identity(), s.set(1, h, 1)); stems.setMatrixAt(i, m4);
      for (let k = 0; k < 3; k++) { q.setFromAxisAngle(v.set(0, 1, 0), hash1(i * 7 + k) * 6.28); m4.compose(v.set(x + (hash1(i + k * 9) - .5) * .12, .02, z + (hash1(i * 2 + k) - .5) * .12), q, s.setScalar(1)); leafy.setMatrixAt(i * 3 + k, m4); } } }
  F.S.add(flowers, stems, leafy);

  // ミツバチが一匹、花をめぐる（模式・体長 約 12 mm を見やすく 2 倍）
  const bee = new THREE.Group(); { const bm = new THREE.MeshStandardMaterial({ color: '#b3803f', roughness: .9 }), dm = new THREE.MeshStandardMaterial({ color: '#2d2216', roughness: .6 });
    const th = new THREE.Mesh(new THREE.SphereGeometry(.006, 10, 8), bm); bee.add(th); const ab = new THREE.Mesh(new THREE.SphereGeometry(.008, 12, 10), dm); ab.scale.set(.8, .75, 1.3); ab.position.z = .011; bee.add(ab); const hd = new THREE.Mesh(new THREE.SphereGeometry(.0045, 8, 6), dm); hd.position.z = -.008; bee.add(hd);
    const wm = new THREE.MeshBasicMaterial({ color: '#eef4f6', transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false }); for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(.014, .006).rotateX(-Math.PI / 2), wm); w.position.set(sx * .009, .004, .002); w.name = 'w'; bee.add(w); }
    add(bm, .1, 'bb'); add(dm, .1, 'bd'); bee.scale.setScalar(2); }
  F.S.add(bee);
  const flowerPos = []; { const m4 = new THREE.Matrix4(), p = new THREE.Vector3(); for (let i = 0; i < NF; i += 3) { flowers.getMatrixAt(i, m4); flowerPos.push(p.setFromMatrixPosition(m4).clone()); } }
  let bi = 0, bt = 0; const bFrom = new THREE.Vector3(), bTo = flowerPos[0].clone(); bFrom.copy(bTo);
  let target = 0;
  F.onFrame = (dt, t) => {
    F.lens.value += (target - F.lens.value) * Math.min(1, dt * 2.2);
    const fl = kind.value < .5 ? fogB : fogA; F.S.fog.color.copy(fogH).lerp(fl, F.lens.value); F.S.background.copy(F.S.fog.color);
    bt += dt / 2.6; if (bt >= 1) { bt = 0; bFrom.copy(bTo); bi = (bi + 1 + (hash1(bi) * 3 | 0)) % flowerPos.length; bTo.copy(flowerPos[bi]); }
    const k = bt < .6 ? bt / .6 : 1, ease = k * k * (3 - 2 * k); bee.position.lerpVectors(bFrom, bTo, ease); bee.position.y += .05 + Math.sin(ease * Math.PI) * .25 + (bt >= .6 ? .02 * Math.sin(t * 9) : 0);
    bee.lookAt(bTo.x, bee.position.y, bTo.z); bee.rotateY(Math.PI);
    for (const w of bee.children) if (w.name === 'w') w.rotation.z = Math.sin(t * 90) * .6 * (w.position.x > 0 ? 1 : -1);
  };
  return { F, set(name) { if (name === 'human') target = 0; else { kind.value = KINDV[name]; target = 1; } }, get lens() { return F.lens.value; } };
}
