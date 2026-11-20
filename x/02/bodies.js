/* © mitsulab. 生きものの身体（見る人がなる身体と、ダイヤルの絵）。2026-10-12 写実の造形（creatures.js）に替えた。
   向き：頭が +Z。呼ぶ側（umwelt.js）で、見る人の身体は前（-Z）へ向けて置く。実寸・主観の再現ではない。 */
import * as T from 'three';
import { stdMat, makeBee, makeButterfly, makeTit, makeDog, makeMamushi, makeWorm, makeBat, makeHuman } from './creatures.js?v=20261120r';
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
// 機械（2026-11-20 本人「一つのアプリケーションに統合」＝別の画面だったカメラ・熱カメラを、同じ森の中の受けとり方に）。形は一般的な三脚つきのカメラと、手持ちの熱カメラの模式（特定の製品の形は写さない）。前が +Z
//   2026-11-20 2 周目：角を丸め、握りの革張り・レンズの輪・ダイヤル・三脚の継ぎ目などの細部を足した（前は箱を組んだ形に見えた）
function makeMachine(id, material) {
  const g = new T.Group();
  // 角の丸い箱
  const rgeo = (w, h, d, r, n = 5) => { const ge = new T.BoxGeometry(w, h, d, n, n, n), p = ge.attributes.position, nr = ge.attributes.normal, hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ix = Math.max(-hx, Math.min(hx, x)), iy = Math.max(-hy, Math.min(hy, y)), iz = Math.max(-hz, Math.min(hz, z)); let ox = x - ix, oy = y - iy, oz = z - iz; const l = Math.hypot(ox, oy, oz) || 1; ox /= l; oy /= l; oz /= l; p.setXYZ(i, ix + ox * r, iy + oy * r, iz + oz * r); nr.setXYZ(i, ox, oy, oz); } return ge; };
  const box = (c, w, h, d, x, y, z, o, r = Math.min(w, h, d) * .22) => { const m = new T.Mesh(rgeo(w, h, d, r), material(c, o)); m.position.set(x, y, z); g.add(m); return m; };
  const cyl = (c, r0, r1, h, x, y, z, rx = 0, rz = 0, o) => { const m = new T.Mesh(new T.CylinderGeometry(r0, r1, h, 36), material(c, o)); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); g.add(m); return m; };
  const ring = (c, R, r, x, y, z, o) => { const m = new T.Mesh(new T.TorusGeometry(R, r, 8, 40), material(c, o)); m.position.set(x, y, z); g.add(m); return m; };
  const dark = 0x2e3136, body = 0x3c4046, mid = 0x5a6068, metal = 0xb4bac2, rubber = 0x22252a;
  if (id === 'camera') {
    // 三脚：雲台・エレベーター・二段の脚（継ぎ目の締め輪）・石づき
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3 + Math.PI / 6, sx = Math.sin(a), cz = Math.cos(a), leg = new T.Group(); leg.position.set(sx * .03, .63, cz * .03); leg.rotation.set(cz * .42, 0, -sx * .42); g.add(leg);
      const part = (c, r0, r1, h, y, o) => { const m = new T.Mesh(new T.CylinderGeometry(r0, r1, h, 16), material(c, o)); m.position.y = y; leg.add(m); };
      part(dark, .017, .017, .36, -.18, { rough: .45 }); part(metal, .012, .012, .32, -.5, { rough: .3 }); part(rubber, .0195, .0195, .035, -.35, { rough: .9 }); part(rubber, .015, .011, .03, -.67, { rough: .95 }); }
    cyl(dark, .034, .04, .05, 0, .635, 0, 0, 0, { rough: .5 }); cyl(metal, .014, .014, .13, 0, .7, 0, 0, 0, { rough: .3 }); cyl(dark, .03, .034, .04, 0, .765, 0, 0, 0, { rough: .55 });
    box(dark, .1, .016, .08, 0, .79, 0, { rough: .6 }, .006); { const h = cyl(dark, .008, .008, .16, -.07, .75, -.06, .9, .5, { rough: .5 }); }   // 雲台の板と、傾ける棒
    // 本体・握り・ファインダーの山
    const Y = .89; box(body, .29, .17, .11, 0, Y, 0, { rough: .6 }, .022); box(rubber, .075, .175, .13, -.125, Y - .002, .022, { rough: .92 }, .03); box(body, .1, .06, .09, .012, Y + .105, -.004, { rough: .6 }, .018);
    box(rubber, .12, .1, .004, .085, Y - .02, .056, { rough: .95 }, .0015);   // 前の革張り
    cyl(metal, .016, .016, .01, -.118, Y + .09, .045, 0, 0, { rough: .28 }); cyl(dark, .026, .026, .018, .105, Y + .094, -.005, 0, 0, { rough: .7 }); cyl(dark, .02, .02, .014, -.07, Y + .092, -.02, 0, 0, { rough: .7 });   // シャッター・ダイヤル
    box(metal, .04, .006, .04, .012, Y + .137, -.004, { rough: .35 }, .002);   // アクセサリーの台
    box(0x0b0d10, .19, .11, .006, .015, Y - .005, -.057, { rough: .18 }, .002); box(dark, .04, .028, .02, .012, Y + .1, -.052, { rough: .8 }, .006);   // 背面の画面・のぞき窓
    // レンズ：台座・鏡胴・ピントの輪（細かい溝）・前の縁・前玉
    const LX = .02; cyl(metal, .07, .07, .012, LX, Y, .058, Math.PI / 2, 0, { rough: .3 }); cyl(dark, .066, .068, .06, LX, Y, .092, Math.PI / 2, 0, { rough: .5 });
    for (let k = 0; k < 7; k++) { const r = ring(rubber, .0705, .0042, LX, Y, .128 + k * .0085, { rough: .95 }); }
    cyl(dark, .072, .07, .03, LX, Y, .2, Math.PI / 2, 0, { rough: .5 }); ring(dark, .07, .006, LX, Y, .216, { rough: .6 });
    cyl(0x090b10, .062, .062, .004, LX, Y, .208, Math.PI / 2, 0, { rough: .5 });
    { const gl = new T.Mesh(new T.SphereGeometry(.09, 32, 12, 0, Math.PI * 2, 0, .68), material(0x1b2c40, { rough: .04, phys: { clearcoat: 1, clearcoatRoughness: .02 } })); gl.rotation.x = Math.PI / 2; gl.position.set(LX, Y, .141); g.add(gl); }   // 前玉（ふくらんだガラス）
  } else {
    // 手持ちの熱カメラ（握り・引き金・本体・レンズのひさし・背面の画面と押しボタン）
    const grip = box(rubber, .085, .36, .1, 0, .245, -.025, { rough: .92 }, .03); grip.rotation.x = -.2;
    for (let k = 0; k < 6; k++) { const rb = box(dark, .089, .012, .04, 0, .12 + k * .034, -.03 - (.12 + k * .034 - .245) * .2 + .035, { rough: .85 }, .005); rb.rotation.x = -.2; }   // 握りのすべり止め
    { const tr = box(0xc7772b, .03, .06, .03, 0, .36, .05, { rough: .6 }, .011); tr.rotation.x = -.5; }   // 引き金（橙）
    box(body, .16, .15, .3, 0, .47, .02, { rough: .62 }, .04); box(mid, .15, .06, .22, 0, .545, .0, { rough: .6 }, .028);
    box(0xc7772b, .164, .012, .26, 0, .425, .02, { rough: .6 }, .005);   // 橙の帯（温かさの印）
    cyl(rubber, .07, .074, .06, 0, .47, .185, Math.PI / 2, 0, { rough: .9 }); ring(rubber, .068, .008, 0, .47, .216, { rough: .9 });   // レンズのひさし
    cyl(0x15120c, .058, .058, .006, 0, .47, .2, Math.PI / 2, 0, { rough: .5 });
    { const gl = new T.Mesh(new T.SphereGeometry(.075, 28, 10, 0, Math.PI * 2, 0, .7), material(0x4a3d26, { rough: .1, phys: { clearcoat: 1, clearcoatRoughness: .08 } })); gl.rotation.x = Math.PI / 2; gl.position.set(0, .47, .146); g.add(gl); }   // 赤外を通すレンズ（ゲルマニウムの暗い色）
    cyl(dark, .012, .012, .01, .05, .47, .205, Math.PI / 2, 0, { rough: .4 });   // 小さな窓（見える光のカメラ・模式）
    box(dark, .15, .13, .02, 0, .48, -.132, { rough: .5 }, .008);
    const scr = new T.Mesh(new T.PlaneGeometry(.125, .095, 8, 1), material(0xffffff, { vc: true, rough: .25 })); { const p = scr.geometry.attributes.position, c = []; for (let i = 0; i < p.count; i++) { const u = (p.getX(i) / .125 + .5), v = .12 + .8 * Math.pow(u, 1.4); c.push(v, v, v * .96); } scr.geometry.setAttribute('color', new T.Float32BufferAttribute(c, 3)); }
    scr.position.set(0, .49, -.1425); scr.rotation.y = Math.PI; g.add(scr);
    for (const x of [-.04, 0, .04]) cyl(mid, .009, .009, .006, x, .425, -.142, Math.PI / 2, 0, { rough: .5 });   // 押しボタン
  }
  g.userData.animate = () => {}; return g;
}
export function makeCreature(id, mat = stdMat, o = {}) {
  return id === 'hachi' ? makeBee(mat, o) : id === 'chou' ? makeButterfly(o.kind || 'ageha', mat, o) : id === 'tori' ? makeTit(mat, o) : id === 'inu' ? makeDog(mat, o)
    : id === 'hebi' ? makeMamushi(mat, o) : id === 'koumori' ? makeBat(mat, o) : id === 'mimizu' ? makeWorm(mat, o) : null;
}
export function makeBody(id, material = (c, o) => stdMat(c, o)) {
  if (id === 'hito') { const g = new T.Group(), c = makeHuman(material, {}, () => makeHito(c => material(c, {}))); g.add(c); g.userData.creature = c; g.userData.animate = () => {}; return g; }   // 2026-11-20 2 周目：立ち姿は CC0 の人体に（読めないときは前の造形）
  if (id === 'camera' || id === 'netsu') return makeMachine(id, (c, o = {}) => material(c, o));
  const g = new T.Group(), c = makeCreature(id, material);
  c.scale.setScalar(FIT[id] || 1); g.add(c);
  g.userData.creature = c; g.userData.animate = (t, moving = true) => c.userData.animate(t, moving);
  return g;
}
let portraitRenderer; const portraits = new Map();
export function disposePortraitRenderer() {
  if (!portraitRenderer) return;
  portraitRenderer.dispose(); portraitRenderer.forceContextLoss(); portraitRenderer = null;
}
// 絵にするときの羽ばたきの時刻（2026-10-14：コウモリは翼をたたんだこまで「茶色い棒」に見えた → 翼を広げたこまで）
const PORTRAIT_T = { koumori: .04 };
export function creaturePortrait(id, tOverride) {
  if (tOverride == null && portraits.has(id)) return portraits.get(id);
  const renderer = portraitRenderer ||= (new T.WebGLRenderer({ alpha: true, antialias: true })); renderer.setSize(480, 360); renderer.setPixelRatio(1); renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=.9; renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene(); scene.add(new T.HemisphereLight(0xecf7e8, 0x313b30, 2)); const sun = new T.DirectionalLight(0xffe1b1, 3); sun.position.set(-2, 4, 3); scene.add(sun);
  const body = makeBody(id); body.userData.animate(tOverride ?? PORTRAIT_T[id] ?? .13, id === 'koumori'); body.traverse(o=>{if(o.isMesh&&o.geometry.type==='SphereGeometry'){const a=o.geometry.parameters;if(a.widthSegments<32){const old=o.geometry;o.geometry=new T.SphereGeometry(a.radius,32,24,a.phiStart,a.phiLength,a.thetaStart,a.thetaLength);old.dispose();}}});scene.add(body);
  const box = new T.Box3().setFromObject(body), center = box.getCenter(new T.Vector3()); let size = box.getSize(new T.Vector3()).length();
  if (id === 'hito') { center.set(0, .9, 0); size *= .5; }   // ひとは胸から上を大きく（全身だと細く小さく見える）。2026-10-14：頭の上が枠で切れていた → 中心を上げ、少し引く
  const cam = new T.PerspectiveCamera(30, 4 / 3, .01, 40); cam.position.copy(center).add(id === 'koumori' ? new T.Vector3(size * .1, size * .9, size * .5) : new T.Vector3(size * .75, size * .55, size * 1.45)); cam.lookAt(center);cam.updateMatrixWorld(true);
  if(id!=='hito'){const pts=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])pts.push(new T.Vector3(x,y,z).project(cam));const span=Math.max(...pts.map(p=>Math.abs(p.x)),...pts.map(p=>Math.abs(p.y)));cam.position.sub(center).multiplyScalar(Math.max(.55,span/.82)).add(center);cam.lookAt(center);}
  renderer.render(scene, cam);   // コウモリは斜め上から（広げた翼が見える）
  const image = renderer.domElement.toDataURL('image/webp');
  body.traverse(o => { if (o.isMesh) { o.geometry.dispose(); [].concat(o.material).forEach(m => m.dispose()); } });
  if (tOverride != null) return image;
  portraits.set(id, image); if (portraits.size === 8) disposePortraitRenderer();
  return image;
}

// 既存のVRoidモデルの顔・髪・衣装をそのまま高解像度で描く。一度だけ描き、共有モデルは元へ戻す。
export function humanPortrait(root,vrm){
 const parent=root.parent, pos=root.position.clone(),q=root.quaternion.clone(),visible=root.visible;
 const scene=new T.Scene(),r=new T.WebGLRenderer({alpha:true,antialias:true});r.setSize(480,360);r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.05;
 scene.add(new T.HemisphereLight(0xe9f4ff,0x494939,2));const key=new T.DirectionalLight(0xffe9d8,2.4);key.position.set(-1,2,3);scene.add(key);
 try{scene.add(root);root.position.set(0,0,0);root.rotation.set(0,0,0);root.visible=true;root.updateMatrixWorld(true);
 const head=vrm.humanoid.getRawBoneNode('head').getWorldPosition(new T.Vector3());const c=new T.PerspectiveCamera(30,4/3,.01,20);c.position.set(head.x+.09,head.y+.06,head.z+1.25);c.lookAt(head.x,head.y-.07,head.z);r.render(scene,c);return r.domElement.toDataURL('image/webp',.95);
 }finally{parent.add(root);root.position.copy(pos);root.quaternion.copy(q);root.visible=visible;root.updateMatrixWorld(true);r.dispose();r.forceContextLoss();}
}
