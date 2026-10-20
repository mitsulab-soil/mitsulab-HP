/* 氷川の材質と石の依代。形状・配置・時代の確からしさは変更しない。
   初回描画の後だけ処理する任意細部。既存CC0テクスチャを再利用。
   石はmitsulab自作の仮想の道具で、現地の物体や観測機器の表示ではない。 */
import * as THREE from 'three';
import {environmentFrame} from './environment-realism.js?v=20261019court2';
const seen = new WeakSet(), processed = new WeakSet(), replacements = new WeakMap();
let core, firstAt = 0, nextCheck = 0, stone, stoneWanted = false, stonePromise;
const state = { materials: 0, groundDetails: 0, stone: '未読込', observation: '観測値なし・模式', era: null };
const deferred = f => typeof requestIdleCallback === 'function' ? requestIdleCallback(f, {timeout: 1800}) : setTimeout(f, 150);
const base = new URL('.', import.meta.url);
let soilNormal;
function normalTexture() {
  if (!soilNormal) {
    soilNormal = new THREE.TextureLoader().load(new URL('tex_road_Ground047_n.webp', base).href);
    soilNormal.wrapS = soilNormal.wrapT = THREE.RepeatWrapping;
    soilNormal.anisotropy = Math.min(4, core?.renderer.capabilities.getMaxAnisotropy() || 1);
  }
  return soilNormal;
}
function refineEra(group) {
  if (seen.has(group) || !group.parent || !group.visible) return;
  seen.add(group);
  group.traverse(o => {
    if (!o.isMesh || !o.geometry || processed.has(o)) return;
    processed.add(o);
    const materials = [].concat(o.material);
    const mapped = materials.map(m => {
      if (!m || m.transparent || m.opacity < 1 || m.isMeshBasicMaterial || m.isShaderMaterial) return m;
      let out = replacements.get(m) || m;
      // 過去の模型のLambert材質を、同じ色と光の中で粗い非金属面として扱う。
      if (m.isMeshLambertMaterial && out === m) {
        out = new THREE.MeshStandardMaterial({ color: m.color, map: m.map, vertexColors: m.vertexColors,
          side: m.side, transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest,
          roughness: .92, metalness: 0, emissive: m.emissive, emissiveMap: m.emissiveMap,
          polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits });
        // 時代の切替えを担う既存のディザ／境界処理を保持。
        out.onBeforeCompile = (sh, renderer) => {
          m.onBeforeCompile?.(sh, renderer);
          sh.fragmentShader = sh.fragmentShader.replace('outgoingLight += diffuseColor.rgb * .65;', 'outgoingLight += diffuseColor.rgb * .22;');
        };
        out.customProgramCacheKey = () => m.customProgramCacheKey() + '|physical-era-1';
        replacements.set(m, out);
        group.addEventListener('removed', () => out.dispose());
        out.userData = {...m.userData};
        state.materials++;
      }
      return out;
    });
    o.material = Array.isArray(o.material) ? mapped : mapped[0];
    // 地面だけに実寸の細かい法線。樹冠や家の模型へ土の絵を貼らない。
    const geo = o.geometry;
    geo.computeBoundingBox();
    const box = geo.boundingBox;
    if (!o.isInstancedMesh && box && box.max.y - box.min.y < .8 && box.max.x - box.min.x > 8 && box.max.z - box.min.z > 8 && !geo.attributes.uv) {
      const hasGround = mapped.some(m => m?.isMeshStandardMaterial && m.vertexColors && !m.normalMap && m.roughness > .8);
      if (!hasGround) return;
      // clone avoids changing shared geometry owned by the time transition system.
      const g = geo.clone(), p = g.attributes.position, uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) { uv[2*i] = p.getX(i) / 1.8; uv[2*i+1] = p.getZ(i) / 1.8; }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); o.geometry = g;
      o.material = mapped.map(m => {
        if (!m?.isMeshStandardMaterial || !m.vertexColors || m.normalMap || m.roughness <= .8) return m;
        const detail = m.clone(); detail.onBeforeCompile = m.onBeforeCompile; detail.customProgramCacheKey = m.customProgramCacheKey.bind(m);
        detail.normalMap = normalTexture(); detail.normalScale.set(.15, .15); detail.needsUpdate = true;
        state.groundDetails++; return detail;
      });
      if (materials.length === 1) o.material = o.material[0];
    }
  });
}
async function loadStone() {
  if (stone || stonePromise || !core?.loader) return stonePromise;
  state.stone = '読込中';
  stonePromise = core.loader.loadAsync(new URL('tools/stone.glb', base).href).then(gltf => {
    stone = gltf.scene;
    stone.name = '創作の道具_石の手がかり';
    const box = new THREE.Box3().setFromObject(stone), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const wrapper = new THREE.Group(); wrapper.name = 'virtual_stone_tool';
    stone.position.sub(center); wrapper.add(stone); wrapper.scale.setScalar(.12 / Math.max(size.x, size.y, size.z, .001));
    stone.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = false; o.frustumCulled = false; } });
    stone = wrapper; core.camera.add(stone); if (!core.camera.parent) core.scene.add(core.camera);
    stone.position.set(.22, -.22, -.65); stone.rotation.set(.15, -.3, -.08); stone.visible = stoneWanted;
    state.stone = '自作GLB・仮想の道具・観測値なし';
  }).catch(e => { state.stone = '読込失敗'; stonePromise = null; console.warn('石の依代', e.message); });
  return stonePromise;
}
window.__physicalTool = {
  showStone(on) { stoneWanted = !!on; if (stone) stone.visible = stoneWanted; else if (stoneWanted) loadStone(); },
  status: () => ({...state, loaded: !!stone, visible: !!stone?.visible})
};
window.__physicalFrame = (_r, scene, _camera, _body) => {
  core = window.__core;
  environmentFrame(core);
  if (!core || !window.__entryFirstFrameAt) return;
  const now = performance.now();
  if (!firstAt) { firstAt = now; return; }
  if (now - firstAt < 1000 || now < nextCheck || document.hidden) return;
  nextCheck = now + 700;
  state.era = window.__era?.info?.()?.era || null;
  // 新規の時代グループに対して一回だけ。全シーンの毎フレーム走査はしない。
  for (const group of scene.children) if (group.visible && group.name?.startsWith('era_') && !seen.has(group)) deferred(() => refineEra(group));
};
