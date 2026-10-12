/* © mitsulab. 生きものの身体（見る人がなる身体と、ダイヤルの絵）。2026-10-12 写実の造形（creatures.js）に替えた。
   向き：頭が +Z。呼ぶ側（umwelt.js）で、見る人の身体は前（-Z）へ向けて置く。実寸・主観の再現ではない。 */
import * as T from 'three';
import { stdMat, makeBee, makeButterfly, makeTit, makeDog, makeMamushi, makeWorm, makeBat } from './creatures.js?v=20261013fur';
// 画面の前に置くときの大きさ（体の長さ＝1 の造形を、見やすい大きさへ）
const FIT = { hachi: .9, chou: .55, tori: 1, inu: .95, hebi: 1.3, koumori: .5, mimizu: 1.2 };
function makeHito(material) {
  const g = new T.Group();
  const ell = (c, x, y, z, sx, sy, sz) => { const m = new T.Mesh(new T.SphereGeometry(1, 28, 18), material(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m); return m; };
  ell(0xe8d9bd, 0, 1.1, 0, .19, .2, .19); ell(0x42796e, 0, .65, 0, .24, .35, .15);
  for (const s of [-1, 1]) { ell(0x293b3b, s * .12, .22, 0, .085, .25, .09); ell(0xe8d9bd, s * .3, .68, 0, .08, .24, .08); }
  ell(0x172828, -.065, 1.13, .17, .045, .045, .035); ell(0x172828, .065, 1.13, .17, .045, .045, .035);
  g.userData.animate = () => {}; return g;
}
export function makeCreature(id, mat = stdMat, o = {}) {
  return id === 'hachi' ? makeBee(mat, o) : id === 'chou' ? makeButterfly(o.kind || 'ageha', mat, o) : id === 'tori' ? makeTit(mat, o) : id === 'inu' ? makeDog(mat, o)
    : id === 'hebi' ? makeMamushi(mat, o) : id === 'koumori' ? makeBat(mat, o) : id === 'mimizu' ? makeWorm(mat, o) : null;
}
export function makeBody(id, material = (c, o) => stdMat(c, o)) {
  if (id === 'hito') return makeHito(c => material(c, {}));
  const g = new T.Group(), c = makeCreature(id, material);
  c.scale.setScalar(FIT[id] || 1); g.add(c);
  g.userData.creature = c; g.userData.animate = (t, moving = true) => c.userData.animate(t, moving);
  return g;
}
let portraitRenderer; const portraits = new Map();
export function creaturePortrait(id) {
  if (portraits.has(id)) return portraits.get(id);
  const renderer = portraitRenderer ||= (new T.WebGLRenderer({ alpha: true, antialias: true })); renderer.setSize(160, 120); renderer.setPixelRatio(1); renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene(); scene.add(new T.HemisphereLight(0xecf7e8, 0x313b30, 2)); const sun = new T.DirectionalLight(0xffe1b1, 3); sun.position.set(-2, 4, 3); scene.add(sun);
  const body = makeBody(id); body.userData.animate(.13, false); scene.add(body);
  const box = new T.Box3().setFromObject(body), center = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3()).length();
  const cam = new T.PerspectiveCamera(30, 4 / 3, .01, 40); cam.position.copy(center).add(new T.Vector3(size * .75, size * .55, size * 1.45)); cam.lookAt(center); renderer.render(scene, cam);
  const image = renderer.domElement.toDataURL('image/webp');
  body.traverse(o => { if (o.isMesh) { o.geometry.dispose(); [].concat(o.material).forEach(m => m.dispose()); } });
  portraits.set(id, image); if (portraits.size === 8) { renderer.dispose(); renderer.forceContextLoss(); portraitRenderer = null; }
  return image;
}
