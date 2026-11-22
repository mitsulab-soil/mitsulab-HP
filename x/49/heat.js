/* heat.js ── Qualia/heat：マムシなどのピット器官が受けとる赤外（熱）の模式。
   温度は実測ではなく、時刻・季節と日の当たり方（画面の中の光の強さ）からの推定。 */
import { create, THREE } from './kit/qfield.js';

// さいたまの月ごとのおおよその平均気温（℃・模式。年ごとに幅がある）
const TMON = [4, 5, 9, 14, 19, 22, 26, 27, 23, 18, 12, 6];
export function airT(d) { const h = d.getHours() + d.getMinutes() / 60; return TMON[d.getMonth()] + 4 * Math.cos((h - 14) / 24 * 2 * Math.PI); }   // 日の最高は 14 時ごろ・幅 ±4℃（模式）
// 材質ごとの推定：日なたで上がる幅（℃）・日陰や夜の差（℃）
export const MAT = { soil: [22, 0], gravel: [16, 0], stone: [14, 1.5], bark: [8, 0], leaf: [4, -1], cloth: [8, 0], skin: [0, 0] };

export function start(canvas) {
  const F = create(canvas, { pitch: -.12 });
  const U = { uTair: { value: 15 }, uTmin: { value: 5 }, uTmax: { value: 40 }, uSunUp: { value: 1 }, uAmb: { value: 1 }, uSunI: { value: 2 } };
  const pars = `uniform float uTair, uTmin, uTmax, uSunUp, uAmb, uSunI, uK, uOff, uFix;
vec3 qRamp( float x ){ x = clamp( x, 0., 1. );
  vec3 c = mix( vec3( .04, .02, .16 ), vec3( .29, .1, .54 ), smoothstep( 0., .25, x ) );
  c = mix( c, vec3( .76, .19, .42 ), smoothstep( .25, .5, x ) ); c = mix( c, vec3( .94, .48, .12 ), smoothstep( .5, .7, x ) );
  c = mix( c, vec3( 1., .85, .29 ), smoothstep( .7, .88, x ) ); return mix( c, vec3( 1., .98, .88 ), smoothstep( .88, 1., x ) ); }`;
  // 光の強さ÷色の明るさ＝その面が受けとっている光（日なたほど大きい）。日なたの割合から温度を推定する
  const out = `{ float l_ = dot( outgoingLight, vec3( .333 ) ) * PI, a_ = max( dot( diffuseColor.rgb, vec3( .333 ) ), .02 );
  float s_ = clamp( ( l_ / a_ - uAmb ) / max( uSunI * .75, .01 ), 0., 1. ) * uSunUp;
  float T_ = uFix > 0. ? uFix : uTair + uOff + uK * s_;
  T_ += .4 * sin( uTime * .7 + gl_FragCoord.x * .01 ) * ( 1. - step( .5, uFix ) );
  outgoingLight = mix( outgoingLight, qRamp( ( T_ - uTmin ) / ( uTmax - uTmin ) ) * ( .78 + .3 * clamp( l_ / a_ * .25, 0., 1. ) ), uLens ); }`;
  const add = (m, key, k, off, fix = 0) => F.patch(m, { key: 'ht' + key, uniforms: Object.assign({ uK: { value: k }, uOff: { value: off }, uFix: { value: fix } }, U), pars, out });
  add(F.gMat, 'g', ...MAT.soil); add(F.pMat, 'p', ...MAT.gravel); add(F.stMat, 's', ...MAT.stone); add(F.tMat, 't', ...MAT.bark); add(F.lMat, 'l', ...MAT.leaf);
  const clothFix = { value: 30 }, skinFix = { value: 33.5 };
  F.patch(F.clothM, { key: 'htc', uniforms: Object.assign({ uK: { value: 0 }, uOff: { value: 0 }, uFix: clothFix }, U), pars, out });
  F.patch(F.skinM, { key: 'htk', uniforms: Object.assign({ uK: { value: 0 }, uOff: { value: 0 }, uFix: skinFix }, U), pars, out });
  // 空は冷たい（雲のない空は、地面よりずっと低い温度の赤外しか返さない）
  F.patch(F.domeM, { key: 'htsky', uniforms: U, pars: 'uniform float uTair, uTmin, uTmax;', albedo: 'diffuseColor.rgb = mix( diffuseColor.rgb, vec3( .03, .02, .12 ), uLens );' });
  const fogH = F.S.fog.color.clone(), fogC = new THREE.Color('#1a0f3a');

  let target = 0, date = new Date(), pr = F.R.getPixelRatio(), lowOn = false;
  function setDate(d) { date = d; F.setDate(d); const ta = airT(d); U.uTair.value = ta; U.uTmin.value = ta - 8; U.uTmax.value = Math.max(ta + 18, 35); U.uSunUp.value = Math.max(0, Math.min(1, Math.sin(F.sunInfo.el) / Math.sin(55 * Math.PI / 180))); U.uAmb.value = F.hemi.intensity * .78; U.uSunI.value = F.sun.intensity; clothFix.value = (ta + 33) / 2 + 5 * U.uSunUp.value; }
  setDate(date);
  F.onFrame = (dt) => {
    F.lens.value += (target - F.lens.value) * Math.min(1, dt * 2.2);
    F.S.fog.color.copy(fogH).lerp(fogC, F.lens.value); F.S.background.copy(F.S.fog.color);
    // ピット器官の像はぼやけている（ピンホールのような作り）＝解像度を落とす
    const low = F.lens.value > .5; if (low !== lowOn) { lowOn = low; F.R.setPixelRatio(low ? .28 : pr); F.R.setSize(innerWidth, innerHeight, false); }
  };
  addEventListener('resize', () => { if (lowOn) { F.R.setPixelRatio(.28); F.R.setSize(innerWidth, innerHeight, false); } });
  // 札の推定値（画面の材質と同じ式）
  function est() { const ta = U.uTair.value, su = U.uSunUp.value, r = v => Math.round(v);
    return { air: r(ta), sunSoil: r(ta + MAT.soil[0] * su), shade: r(ta + MAT.soil[1]), stone: r(ta + MAT.stone[1] + MAT.stone[0] * su * .7), leaf: r(ta + MAT.leaf[1] + MAT.leaf[0] * su * .5), skin: 33.5, sun: su > .05 }; }
  return { F, setDate, est, set(on) { target = on ? 1 : 0; }, get date() { return date; } };
}
