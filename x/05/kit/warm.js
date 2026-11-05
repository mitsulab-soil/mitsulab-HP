/* mitsulab 共通の部品（warm.js）。© 2026 mitsulab. All rights reserved. */
import * as THREE from "three";
export const aoiYield = () => new Promise(r => (typeof requestAnimationFrame === "function" ? requestAnimationFrame(() => setTimeout(r, 0)) : setTimeout(r, 16)));
export async function warmAoi(renderer, root, camera, scene, { budget = 8, whole = false, offscreen = false, batch = 4 } = {}) {   // whole＝root がまだ場面の外で、root の中の光（顔の補助光）も数えて組むとき／offscreen＝アプリが描き先（ぼかしなど）へ描くとき、その形で組む
  if (!renderer || !root) return;
  const now = () => performance.now(), meshes = [], tex = new Set();
  root.traverse(o => { if (!o.isMesh) return; meshes.push(o); for (const m of [].concat(o.material)) { if (!m) continue; for (const k in m) { const v = m[k]; if (v && v.isTexture) tex.add(v); } if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k]?.value; if (v && v.isTexture) tex.add(v); } } });
  // ① テクスチャ：1 こまに budget ms まで
  let t0 = now(); for (const t of tex) { if (now() - t0 > budget) { await aoiYield(); t0 = now(); } try { renderer.initTexture(t); } catch { } }
  await aoiYield();
  // ①b 骨で動く網の外接球：three は、はじめて描くこまで全部の頂点を骨で動かして測る（碧で約 30 ms）→ 先に一つずつ測っておく（2026-11-05 夕）
  t0 = now(); for (const o of meshes) { if (!o.isSkinnedMesh || o.boundingSphere !== null) continue; try { o.computeBoundingSphere(); } catch { } if (now() - t0 > budget) { await aoiYield(); t0 = now(); } }
  // ② 材質：網ごとに組む（同じシェーダーは一度だけ組まれる）。いちどに組むのは数個まで
  // 見せないまま組む（root.visible を true にすると、待つあいだの毎こまの描画が同じシェーダーを止まりながら組んでしまう）
  const vis = root.visible, offRT = offscreen ? new THREE.WebGLRenderTarget(1, 1) : null, rt0 = renderer.getRenderTarget(); if (offRT) renderer.setRenderTarget(offRT);
  if (whole && !root.parent) { root.visible = true; const LT = []; root.traverse(o => { if (o.isLight) { LT.push([o, o.visible]); o.visible = true; } });   // 顔の補助光は碧が見えないあいだ消えている＝見えたときの光の数で組む
    try { await renderer.compileAsync(root, camera, scene); } catch { } for (const [o, v] of LT) o.visible = v; root.visible = vis; await aoiYield(); }
  else for (let i = 0; i < meshes.length; i += batch) {   // batch＝一こまに組む網の数（2026-11-04 sight：4 つまとめると 0.13〜0.3 秒止まった）
    if (offRT) renderer.setRenderTarget(offRT);   // 2026-11-05 夕：待つあいだにアプリが描くと描き先が戻るので、組むたびに描き先を合わせる（ぼかしへ描く sho で、組んだ形が使われていなかった）
    let ps = []; try { ps = meshes.slice(i, i + batch).map(o => renderer.compileAsync ? renderer.compileAsync(o, camera, scene) : renderer.compile(o, camera, scene)); } catch { } finally { if (offRT) renderer.setRenderTarget(rt0); }
    try { await Promise.all(ps); } catch { }
    await aoiYield();
  }
  if (offRT) { renderer.setRenderTarget(rt0); offRT.dispose(); }
  // ③ 影：碧だけを小さな的に影つきで一枚ずつ描く（奥行きの材質のシェーダーを組ませる）。見る人の画面には出ない
  if (renderer.shadowMap?.enabled) {
    try {
      const lights = []; scene.traverse(o => { if (o.isLight && o.castShadow && o.visible) lights.push(o); });
      if (lights.length) {
        const rt = new THREE.WebGLRenderTarget(4, 4), prevRT = renderer.getRenderTarget(), auto = renderer.shadowMap.autoUpdate, nu = renderer.shadowMap.needsUpdate;
        const tmp = new THREE.Scene(), parent = root.parent, ov = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
        tmp.overrideMaterial = ov;
        const L = lights[0] || {}, DL = new THREE.DirectionalLight(); DL.castShadow = true; DL.shadow.mapSize.set(16, 16); DL.position.set(0, 10, 0); DL.target.position.set(0, 0, 0);
        if (!lights.length) { } else if (L.isPointLight) { const PL = new THREE.PointLight(); PL.castShadow = true; PL.shadow.mapSize.set(16, 16); tmp.add(PL); } else if (L.isSpotLight) { const SL = new THREE.SpotLight(); SL.castShadow = true; SL.shadow.mapSize.set(16, 16); tmp.add(SL); } else tmp.add(DL, DL.target);
        const idx = parent ? parent.children.indexOf(root) : -1;
        tmp.add(root);   // 位置・向き・大きさ（root の中の値）はそのまま。影の材質の組み方は場所によらない
        renderer.setRenderTarget(rt); renderer.shadowMap.autoUpdate = true;
        root.visible = true; const mv = meshes.map(o => o.visible);
        for (let i = 0; i < meshes.length; i++) { if (!mv[i] || !meshes[i].castShadow) continue; meshes.forEach((o, j) => { o.visible = j === i; }); const t1 = now(); renderer.setRenderTarget(rt); renderer.render(tmp, camera); renderer.setRenderTarget(prevRT); if (now() - t1 > 2) { root.visible = false; await aoiYield(); root.visible = true; } }
        meshes.forEach((o, j) => { o.visible = mv[j]; }); root.visible = vis;
        renderer.setRenderTarget(prevRT); renderer.shadowMap.autoUpdate = auto; renderer.shadowMap.needsUpdate = nu;   // 場面の影の描き直しは頼まない（手で描き直すアプリで、森じゅうの影を描き直して止まった）
        if (parent) { parent.add(root); if (idx >= 0) { parent.children.pop(); parent.children.splice(idx, 0, root); } } else tmp.remove(root);
        root.updateMatrixWorld(true);
        for (const o of tmp.children.slice()) { o.shadow?.dispose?.(); tmp.remove(o); } rt.dispose(); ov.dispose();
        await aoiYield();
      }
    } catch (e) { console.warn("warmAoi 影", e); }
  }
  root.visible = vis;
}
export async function warmScene(renderer, scene, camera, { budget = 8, batch = 3, root = scene, offscreen = false } = {}) {   // offscreen＝アプリが描き先（ぼかしなど）へ描くとき、その形で組む
  if (!renderer || !root) return;
  const now = () => performance.now(), meshes = [], tex = new Set();
  root.traverse(o => { if (!(o.isMesh || o.isLine || o.isPoints || o.isSprite)) return; meshes.push(o); for (const m of [].concat(o.material)) { if (!m) continue; for (const k in m) { const v = m[k]; if (v && v.isTexture) tex.add(v); } if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k]?.value; if (v && v.isTexture) tex.add(v); } } });
  let t0 = now(); for (const t of tex) { if (now() - t0 > budget) { await aoiYield(); t0 = now(); } if (t.image || t.isRenderTargetTexture) try { renderer.initTexture(t); } catch { } }
  await aoiYield();
  const seen = new Set(), todo = meshes.filter(o => { const k = [].concat(o.material).map(m => m && m.uuid).join(); if (seen.has(k)) return false; seen.add(k); return true; });
  const RT = offscreen ? new THREE.WebGLRenderTarget(1, 1) : null;
  for (let i = 0; i < todo.length; i += batch) {
    const rt0 = renderer.getRenderTarget(); if (RT) renderer.setRenderTarget(RT);
    const ps = todo.slice(i, i + batch).map(o => { const v = o.visible; o.visible = true; try { return renderer.compileAsync ? renderer.compileAsync(o, camera, scene) : renderer.compile(o, camera, scene); } finally { o.visible = v; } });
    if (RT) renderer.setRenderTarget(rt0);
    try { await Promise.all(ps); } catch { }
    await aoiYield();
  }
  RT?.dispose();
}
/* keepVariant(renderer, root, camera, scene, mutate)＝root の網と材質の写しを作り、mutate(写しの材質) で形を変えて組み、持っておく。
   同じ材質で別の形（不透明・半透明）を続けて組むと、前に組んだ形が使われなくなって、あとで描くときに組み直して止まる（2026-11-05 Lab・nature で確かめた）。
   写しは描かない（組むだけ）。見た目は変えない。 */
const KEEP = [];
export async function keepVariant(renderer, root, camera, scene, mutate, { batch = 1, offscreen = false } = {}) {   // offscreen＝アプリが描き先（ぼかしなど）へ描くとき、その形で組む（2026-11-05 夕）
  if (!renderer || !root) return;
  const bare = (x, f) => { const u = x.userData; x.userData = {}; try { return f(); } finally { x.userData = u; } };
  const meshes = []; root.traverse(o => { if (o.isMesh && !o.userData.noFade) meshes.push(o); });
  const ones = [];
  for (const o of meshes) for (const m of [].concat(o.material)) {
    if (!m) continue;
    const one = bare(o, () => o.clone(false)), k = bare(m, () => m.clone());
    k.userData = m.userData; if (m.onBeforeCompile) k.onBeforeCompile = m.onBeforeCompile; if (Object.prototype.hasOwnProperty.call(m, "customProgramCacheKey")) k.customProgramCacheKey = m.customProgramCacheKey;
    mutate(k); one.material = k; one.visible = true; ones.push(one);
  }
  const RT = offscreen ? new THREE.WebGLRenderTarget(1, 1) : null;
  for (let i = 0; i < ones.length; i += batch) {
    const rt0 = renderer.getRenderTarget(); if (RT) renderer.setRenderTarget(RT); let ps = [];
    try { ps = ones.slice(i, i + batch).map(one => renderer.compileAsync(one, camera, scene)); } catch { } finally { if (RT) renderer.setRenderTarget(rt0); }
    try { await Promise.all(ps); } catch { }
    KEEP.push(...ones.slice(i, i + batch)); await aoiYield();
  }
  RT?.dispose();
}
/* loadTex(url)＝絵を読み、GPU へ送る前に別の糸で絵をほどいて（decode）から THREE.Texture にして返す。2026-11-05 夕（）
   three の TextureLoader（img）のままだと、はじめて描くこまで 2048 px の絵をほどき、そのこまが 0.1 秒ほど止まっていた。
   上下の向き・色の変換は TextureLoader と同じにそろえる（見た目は同じ）。ImageBitmap の向きを正しく扱えない古い Safari（16 まで）・Firefox（97 まで）は、これまでの TextureLoader で読む。
   読めないときは null（TextureLoader の失敗と同じ扱い）。
   opaque＝透ける画素のない絵（法線・粗さ・木肌・床など）。Safari・Firefox は、透ける絵の縁の色が TextureLoader とわずかに変わった（WebKit で確かめた）ので、opaque の絵だけこの形で読む。Chrome は透ける絵も画素まで同じ。 */
const UA = typeof navigator !== "undefined" ? navigator.userAgent : "";
const SAFARI = /^((?!chrome|android).)*safari/i.test(UA), SV = SAFARI ? +((UA.match(/Version\/(\d+)/) || [])[1] || -1) : -1;
const FF = /firefox/i.test(UA), FV = FF ? +((UA.match(/Firefox\/(\d+)/) || [])[1] || -1) : -1;
export const bitmapOK = typeof createImageBitmap === "function" && typeof fetch === "function" && !(SAFARI && SV < 17) && !(FF && FV < 98);
const useBitmap = opaque => bitmapOK && (opaque || !(SAFARI || FF));
export async function loadTex(url, { opaque = false } = {}) {
  if (useBitmap(opaque)) try {
    const r = await fetch(url, { credentials: "same-origin" }); if (!r.ok) throw new Error(r.status);
    const bm = await createImageBitmap(await r.blob(), { imageOrientation: "flipY", premultiplyAlpha: "none", colorSpaceConversion: "none" });
    const t = new THREE.Texture(bm); t.flipY = false; t.needsUpdate = true; return t;
  } catch (e) { }
  return new Promise(ok => new THREE.TextureLoader().load(url, ok, undefined, () => ok(null)));
}
/* bitmapTex(url)＝TextureLoader().load(url) と同じく、すぐに Texture を返し、絵はほどき終えてから入る（別の糸でほどく。向き・色は同じ）。
   texPending＝まだほどいている絵。幕を上げる前に待つときに使う（Promise.all([...texPending])）。 */
export const texPending = new Set();
export function bitmapTex(url, { opaque = false } = {}) {
  if (!useBitmap(opaque)) return new THREE.TextureLoader().load(url);
  const t = new THREE.Texture(); t.flipY = false;
  const p = fetch(url, { credentials: "same-origin" }).then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); })
    .then(b => createImageBitmap(b, { imageOrientation: "flipY", premultiplyAlpha: "none", colorSpaceConversion: "none" }))
    .then(bm => { t.image = bm; t.needsUpdate = true; })
    .catch(() => new Promise(ok => new THREE.TextureLoader().load(url, x => { t.flipY = true; t.image = x.image; t.needsUpdate = true; ok(); }, undefined, ok)))
    .finally(() => texPending.delete(p));
  texPending.add(p); return t;
}
