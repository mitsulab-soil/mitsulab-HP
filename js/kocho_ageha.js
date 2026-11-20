// © mitsulab. ナミアゲハ（Papilio xuthus）の翅を、実物の標本の写真で作る（HP の背景の蝶のための部品）。
// 翅の写真：ETH Zürich 昆虫コレクション（ETHZ-ENT）標本 AZ12-1260「Papilio xuthus Linnaeus, 1767」雄・茨城県東海村・1998 年 7 月。
//   CC BY 4.0（https://creativecommons.org/licenses/by/4.0/）。配布元＝GBIF https://www.gbif.org/occurrence/5761450781（データセット doi:10.15468/9jutqw）。
//   mitsulab が加えた変更：背景を抜き、前翅・後翅を左右・表裏の 8 枚に切り分けた。前翅と後翅が重なって写っていない所は、同じ翅の反対の面の写真から補った。
//   左右の翅は、それぞれ標本の左右の翅（左右を写して使い回していない）。寸法は標本の体の長さとの比のまま。
// 線と点・切り紙の蝶は、同じ標本の右の翅の輪郭（OUT_F・OUT_H）を形に使う。
import { T, flatShape } from './creatures_kochou.js';
const BB = {RF:[0.0269,1.6677,-0.0617,1.2326],RH:[0.0269,1.4905,-1.1203,0.1693],LF:[0.0253,1.5522,-0.0585,1.2215],LH:[0.0253,1.3908,-1.1013,0.1582]};   // 写真の枠 [x0, x1, y0, y1]（x＝翅のつけ根の軸から外へ、y＝頭の向き。単位は体の長さ）
const OUT_F = [[1.646,1.153],[1.612,1.179],[1.528,1.209],[1.446,1.223],[1.331,1.218],[1.218,1.195],[1.201,1.185],[1.108,1.152],[0.992,1.092],[0.88,1.021],[0.706,0.899],[0.568,0.788],[0.489,0.717],[0.384,0.614],[0.367,0.59],[0.316,0.538],[0.242,0.441],[0.222,0.421],[0.209,0.397],[0.125,0.283],[0.038,0.116],[0.036,-0.024],[0.051,-0.028],[0.237,-0.044],[0.908,-0.051],[1.065,-0.046],[1.116,-0.032],[1.152,-0.016],[1.191,0.014],[1.229,0.068],[1.231,0.079],[1.245,0.106],[1.261,0.122],[1.269,0.142],[1.277,0.152],[1.278,0.166],[1.29,0.185],[1.29,0.198],[1.302,0.22],[1.301,0.236],[1.305,0.252],[1.337,0.299],[1.351,0.345],[1.361,0.359],[1.366,0.418],[1.38,0.446],[1.372,0.472],[1.38,0.497],[1.397,0.516],[1.396,0.549],[1.422,0.581],[1.426,0.592],[1.437,0.604],[1.438,0.614],[1.454,0.641],[1.457,0.661],[1.472,0.687],[1.481,0.723],[1.505,0.758],[1.541,0.847],[1.573,0.892],[1.579,0.911],[1.595,0.935],[1.649,1.049],[1.649,1.07],[1.657,1.097],[1.653,1.131]];
const OUT_H = [[0.036,0.051],[0.038,-0.236],[0.095,-0.28],[0.123,-0.29],[0.13,-0.299],[0.161,-0.315],[0.172,-0.332],[0.236,-0.392],[0.272,-0.448],[0.312,-0.481],[0.359,-0.543],[0.378,-0.578],[0.389,-0.585],[0.402,-0.603],[0.413,-0.625],[0.457,-0.679],[0.459,-0.687],[0.481,-0.717],[0.516,-0.78],[0.54,-0.815],[0.559,-0.861],[0.57,-0.872],[0.598,-0.918],[0.642,-0.967],[0.717,-1.002],[0.737,-1.005],[0.788,-1.002],[0.818,-1.032],[0.831,-1.051],[0.85,-1.066],[0.869,-1.076],[0.903,-1.079],[0.937,-1.055],[0.948,-1.038],[0.972,-1.017],[0.991,-0.991],[1.014,-0.973],[1.062,-0.959],[1.09,-0.945],[1.117,-0.94],[1.138,-0.929],[1.19,-0.929],[1.22,-0.935],[1.255,-0.956],[1.266,-0.968],[1.297,-0.983],[1.35,-1.022],[1.434,-1.101],[1.454,-1.109],[1.467,-1.109],[1.478,-1.098],[1.478,-1.068],[1.472,-1.052],[1.448,-1.017],[1.408,-0.976],[1.372,-0.93],[1.299,-0.859],[1.296,-0.851],[1.248,-0.809],[1.223,-0.778],[1.209,-0.771],[1.199,-0.752],[1.185,-0.736],[1.184,-0.725],[1.174,-0.712],[1.177,-0.666],[1.206,-0.638],[1.214,-0.616],[1.212,-0.592],[1.191,-0.509],[1.196,-0.495],[1.195,-0.476],[1.209,-0.449],[1.233,-0.432],[1.236,-0.418],[1.233,-0.389],[1.217,-0.353],[1.21,-0.326],[1.203,-0.315],[1.207,-0.301],[1.204,-0.267],[1.215,-0.244],[1.217,-0.231],[1.215,-0.203],[1.206,-0.182],[1.155,-0.122],[1.122,-0.065],[1.103,-0.052],[1.098,-0.035],[1.081,-0.016],[1.066,0.008],[1.057,0.009],[0.992,0.052],[0.875,0.106],[0.722,0.149],[0.573,0.16],[0.397,0.153],[0.275,0.141],[0.15,0.109],[0.066,0.055],[0.04,0.054]];
const DIR = new URL('../img/kocho/', import.meta.url).href;
let GEO = null; const QUAD = {}, TEXS = {};
// 写真の枠の面。翅はごく浅い椀形にする（平らな板に見えないように。つけ根と先は軸の高さ）
function quad(key) { if (QUAD[key]) return QUAD[key]; const [x0, x1, y0, y1] = BB[key], g = new T.PlaneGeometry(x1 - x0, y1 - y0, 14, 12); g.translate((x0 + x1) / 2, (y0 + y1) / 2, 0);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { p.setZ(i, -.045 * Math.sin(Math.PI * Math.min(1, p.getX(i) / 1.6))); }
  g.rotateX(Math.PI / 2); g.computeVertexNormals(); return QUAD[key] = g; }
function load(name) { return TEXS[name] ||= new Promise((ok, ng) => new T.TextureLoader().load(DIR + name, t => { t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; ok(t); }, undefined, ng)); }
// 鱗粉と翅脈の細かな凹凸を、写真の明暗の細部から起こす（法線の地図）
function normalFrom(tex) { const im = tex.image, w = im.width >> 1, h = im.height >> 1, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(im, 0, 0, w, h); const a = x.getImageData(0, 0, w, h).data, s = document.createElement('canvas'); s.width = w >> 1; s.height = h >> 1; s.getContext('2d').drawImage(c, 0, 0, s.width, s.height);
  x.imageSmoothingQuality = 'high'; x.drawImage(s, 0, 0, w, h); const b = x.getImageData(0, 0, w, h).data, H = new Float32Array(w * h);
  for (let i = 0, j = 0; j < H.length; i += 4, j++) H[j] = ((a[i] * .3 + a[i + 1] * .59 + a[i + 2] * .11) - (b[i] * .3 + b[i + 1] * .59 + b[i + 2] * .11)) / 255;
  const o = x.createImageData(w, h), q = o.data, k = 4;
  for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) { const j = y * w + X, dx = (H[y * w + Math.min(w - 1, X + 1)] - H[y * w + Math.max(0, X - 1)]) * k, dy = (H[Math.min(h - 1, y + 1) * w + X] - H[Math.max(0, y - 1) * w + X]) * k, l = 1 / Math.hypot(dx, dy, 1);
    q[j * 4] = (-dx * l * .5 + .5) * 255; q[j * 4 + 1] = (dy * l * .5 + .5) * 255; q[j * 4 + 2] = (l * .5 + .5) * 255; q[j * 4 + 3] = 255; }
  x.putImageData(o, 0, 0); const t = new T.CanvasTexture(c); t.anisotropy = 4; return t; }
// makeButterfly('ageha') の翅を入れ替える。photo＝標本の写真の翅（m.userData.ready が写真の読みこみの完了）。それ以外＝標本の輪郭の形だけ
export function upgradeAgeha(m, { photo = false, lite = false } = {}) {
  GEO ||= { F: flatShape(OUT_F), H: flatShape(OUT_H) };
  const size = lite ? 512 : 1024, jobs = [], bd = m.children[0];
  if (bd && bd.children[1] && !bd.userData.wide) { bd.userData.wide = 1; bd.children[1].scale.x = 1.35; bd.children[0].scale.x = 1.15;
    for (const e of [bd.children[3], bd.children[4]]) if (e && e.isMesh) { e.scale.multiplyScalar(.8); e.position.x *= .9; } }   // 複眼は頭の幅におさめる   // 胸と腹の幅を標本の比に

  for (const w of m.userData.wings || []) { const sd = w.s > 0 ? 'R' : 'L';
    w.piv.position.set(w.s * .075, .108, .251); w.hp.position.set(w.s * .075, .09, .196);   // つけ根の位置も標本の比で
    [[w.piv, 'F'], [w.hp, 'H']].forEach(([g, wing]) => g.children.forEach((o, k) => { if (!o.isMesh) return; o.rotation.y = 0;
      if (!photo) { o.geometry = GEO[wing]; return; }
      o.geometry = quad(sd + wing); const under = k === 1;
      const mt = new T.MeshPhysicalMaterial({ color: 0xffffff, side: under ? T.FrontSide : T.BackSide, alphaTest: .42, alphaToCoverage: !lite, roughness: .7, metalness: 0, sheen: .55, sheenRoughness: .45, sheenColor: new T.Color(under ? 0x6a6048 : 0x4a4232),
        emissive: new T.Color(0xffffff), emissiveIntensity: under ? .18 : .1 });   // 翅は薄く、光が淡く透ける（影の側でも模様が沈みきらない）
      o.material = mt; o.visible = false;
      jobs.push(load(`ageha_${sd}${wing}${under ? 'v' : 'd'}_${size}.webp`).then(t => { const mt = o.material; mt.map = t; mt.emissiveMap = t; mt.needsUpdate = true; o.visible = true;
        if (!lite) setTimeout(() => { try { const mt = o.material; mt.normalMap = t.userData.nm ||= normalFrom(t); mt.normalScale.set(.55, .55); mt.needsUpdate = true; } catch (e) {} }, 400 + jobs.length * 60); }));
    })); }
  m.userData.ready = Promise.all(jobs); return m;
}
