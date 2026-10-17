/* © mitsulab. 生きものの身体（見る人がなる身体と、ダイヤルの絵）。2026-10-12 写実の造形（creatures.js）に替えた。
   向き：頭が +Z。呼ぶ側（umwelt.js）で、見る人の身体は前（-Z）へ向けて置く。実寸・主観の再現ではない。 */
import * as T from 'three';
import { stdMat, makeBee, makeButterfly, makeTit, makeDog, makeMamushi, makeWorm, makeBat } from './creatures.js?v=20261017-poodle';
// 画面の前に置くときの大きさ（体の長さ＝1 の造形を、見やすい大きさへ）
const FIT = { hachi: .9, chou: .55, tori: 1, inu: .95, hebi: 1.3, koumori: .5, mimizu: 1.2 };
// ひと（ダイヤルの絵だけに使う）。2026-10-14 テストプレー「ひとだけ作りが粗い（緑の丸い人形）」→ 7 頭身の、首・肩・肘・手・脚・靴のある立ち姿に（ほかの生き物と同じ、落ち着いた写実寄りの色）
function makeHito(material) {
  const g = new T.Group();
  const skin = 0xd9b89a, shirt = 0x34506a, collar = 0xe9ecef, pants = 0x3b3f47, hair = 0x231d1a, shoe = 0x1c1a19;
  const ell = (c, x, y, z, sx, sy, sz) => { const m = new T.Mesh(new T.SphereGeometry(1, 32, 20), material(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m); return m; };
  const cap = (c, r, len, x, y, z, rz = 0, rx = 0) => { const m = new T.Mesh(new T.CapsuleGeometry(r, len, 6, 18), material(c)); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); g.add(m); return m; };
  ell(skin, 0, 1.08, .004, .068, .086, .076);                 // 頭
  ell(hair, 0, 1.118, -.02, .072, .064, .074);                // 髪（頭の上とうしろ。顔は出す）
  ell(skin, -.068, 1.075, -.004, .012, .02, .012); ell(skin, .068, 1.075, -.004, .012, .02, .012);   // 耳
  cap(skin, .027, .045, 0, .975, 0);                           // 首
  ell(collar, 0, .955, .006, .05, .018, .04);                  // 襟
  ell(shirt, 0, .8, 0, .13, .17, .072);                        // 胴
  cap(shirt, .058, .19, 0, .915, 0, Math.PI / 2);              // 肩
  ell(pants, 0, .615, 0, .118, .075, .068);                    // 腰
  for (const s of [-1, 1]) {
    cap(shirt, .036, .2, s * .158, .8, 0, s * .07);            // 上腕
    cap(skin, .029, .19, s * .172, .575, .012, s * .03, -.06); // 前腕
    ell(skin, s * .176, .44, .02, .026, .042, .02);            // 手
    cap(pants, .05, .21, s * .062, .45, 0, s * .015);          // もも
    cap(pants, .041, .2, s * .066, .2, 0);                     // すね
    ell(shoe, s * .067, .028, .03, .042, .028, .085);          // 靴
  }
  ell(0x1a1412, -.026, 1.083, .077, .01, .011, .006); ell(0x1a1412, .026, 1.083, .077, .01, .011, .006);   // 目（顔の面より少し前に）
  ell(0x4a3428, -.026, 1.104, .075, .016, .004, .005); ell(0x4a3428, .026, 1.104, .075, .016, .004, .005);   // 眉
  ell(0xc99f84, 0, 1.063, .082, .009, .014, .008);   // 鼻
  ell(0xb07a6a, 0, 1.037, .074, .018, .005, .006);   // 口
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
// 絵にするときの羽ばたきの時刻（2026-10-14：コウモリは翼をたたんだこまで「茶色い棒」に見えた → 翼を広げたこまで）
const PORTRAIT_T = { koumori: .04 };
export function creaturePortrait(id, tOverride) {
  if (tOverride == null && portraits.has(id)) return portraits.get(id);
  const renderer = portraitRenderer ||= (new T.WebGLRenderer({ alpha: true, antialias: true })); renderer.setSize(480, 360); renderer.setPixelRatio(1); renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=.9; renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene(); scene.add(new T.HemisphereLight(0xecf7e8, 0x313b30, 2)); const sun = new T.DirectionalLight(0xffe1b1, 3); sun.position.set(-2, 4, 3); scene.add(sun);
  const body = makeBody(id); body.userData.animate(tOverride ?? PORTRAIT_T[id] ?? .13, id === 'koumori'); scene.add(body);
  const box = new T.Box3().setFromObject(body), center = box.getCenter(new T.Vector3()); let size = box.getSize(new T.Vector3()).length();
  if (id === 'hito') { center.set(0, .9, 0); size *= .5; }   // ひとは胸から上を大きく（全身だと細く小さく見える）。2026-10-14：頭の上が枠で切れていた → 中心を上げ、少し引く
  const cam = new T.PerspectiveCamera(30, 4 / 3, .01, 40); cam.position.copy(center).add(id === 'koumori' ? new T.Vector3(size * .1, size * .9, size * .5) : new T.Vector3(size * .75, size * .55, size * 1.45)); cam.lookAt(center); renderer.render(scene, cam);   // コウモリは斜め上から（広げた翼が見える）
  const image = renderer.domElement.toDataURL('image/webp');
  body.traverse(o => { if (o.isMesh) { o.geometry.dispose(); [].concat(o.material).forEach(m => m.dispose()); } });
  if (tOverride != null) return image;
  portraits.set(id, image); if (portraits.size === 8) { renderer.dispose(); renderer.forceContextLoss(); portraitRenderer = null; }
  return image;
}

// 既存のVRoidモデルの顔・髪・衣装をそのまま高解像度で描く。一度だけ描き、共有モデルは元へ戻す。
export function humanPortrait(root,vrm){
 const parent=root.parent, pos=root.position.clone(),q=root.quaternion.clone(),visible=root.visible;
 const scene=new T.Scene(),r=new T.WebGLRenderer({alpha:true,antialias:true});r.setSize(480,360);r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.05;
 scene.add(new T.HemisphereLight(0xe9f4ff,0x494939,2));const key=new T.DirectionalLight(0xffe9d8,2.4);key.position.set(-1,2,3);scene.add(key);
 try{scene.add(root);root.position.set(0,0,0);root.rotation.set(0,0,0);root.visible=true;root.updateMatrixWorld(true);
 const head=vrm.humanoid.getRawBoneNode('head').getWorldPosition(new T.Vector3());const c=new T.PerspectiveCamera(30,4/3,.01,20);c.position.set(head.x+.09,head.y+.015,head.z+1.0);c.lookAt(head.x,head.y-.11,head.z);r.render(scene,c);return r.domElement.toDataURL('image/webp',.95);
 }finally{parent.add(root);root.position.copy(pos);root.quaternion.copy(q);root.visible=visible;root.updateMatrixWorld(true);r.dispose();r.forceContextLoss();}
}
