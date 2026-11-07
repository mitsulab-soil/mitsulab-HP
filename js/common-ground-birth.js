/* Aoi's arrival: a fixed, coloured sample of the authored body, not a new VRM.
 * No renderer, scene visibility, animation clock or external assets are owned here.
 */
export function createBirth({ THREE: T, group, vrm, mobile = false, environment = null }) {
  if (!T || !group?.isObject3D || !vrm?.scene?.isObject3D) {
    throw new TypeError('createBirth needs THREE, the parent group, and vrm.scene');
  }
  const started = performance.now(), cap = mobile ? 1000 : 2400;
  const stats = {
    cap, samples: 0, meshes: 0, triangles: 0, vertices: 0,
    excludedOutlineGroups: 0, excludedOverlayMeshes: 0, textureReads: 0, textureFallbacks: 0,
    alphaRejected: 0, distinctColours: 0, materialSamples: {}, cellSize: 0, buildMs: 0,
    drawCalls: 0, progress: 0, disposed: false,
    style: 'cubist mirrors', tiers: { large: 0, medium: 0, small: 0 },
    environment: !!environment, roughness: .12, metalness: .84, maxCubeSize: 0,
  };
  let seed = 0x414f4931;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const smooth = (a, b, x) => { const q = T.MathUtils.clamp((x - a) / (b - a), 0, 1); return q * q * (3 - 2 * q); };
  const textureCache = new Map(), matrixCache = new Map();
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
  const edge = new T.Vector3(), cross = new T.Vector3(), uv = new T.Vector2();
  const bounds = new T.Box3(), triangles = [];
  let areaSum = 0;

  // getVertexPosition includes morph targets and (for SkinnedMesh) bone skinning.
  // Transform mesh-local samples to group-local space, avoiding a doubled VRM root transform.
  group.updateWorldMatrix(true, false);
  // SkinnedMesh.updateMatrixWorld also refreshes bindMatrixInverse for AttachedBindMode.
  group.updateMatrixWorld(true);
  const inverseGroup = group.matrixWorld.clone().invert();
  vrm.scene.traverse(mesh => {
    const geometry = mesh.geometry;
    // AoiMotion's cheek tint is a shader-only shading layer, not another skin surface.
    if (mesh.userData?.aoiOverlay) { stats.excludedOverlayMeshes++; return; }
    if (!mesh.isMesh || mesh.isInstancedMesh || mesh.visible === false || !geometry?.attributes.position) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const count = geometry.index?.count ?? geometry.attributes.position.count;
    const groups = Array.isArray(mesh.material) ? geometry.groups : [{ start: 0, count, materialIndex: 0 }];
    const drawStart = Math.max(0, geometry.drawRange.start);
    const drawEnd = Math.min(count, drawStart + geometry.drawRange.count);
    const ranges = groups.filter(part => {
      const material = materials[part.materialIndex];
      if (material?.isOutline || material?.userData?.isOutline) { stats.excludedOutlineGroups++; return false; }
      return material && material.visible !== false && part.start < drawEnd && part.start + part.count > drawStart;
    });
    if (!ranges.length) return;
    mesh.skeleton?.update();
    const transform = new T.Matrix4().multiplyMatrices(inverseGroup, mesh.matrixWorld);
    const positions = new Float32Array(geometry.attributes.position.count * 3);
    const sampled = new Uint8Array(geometry.attributes.position.count);
    // VRM primitives can share a vertex buffer but use different skeleton palettes.
    // Unreferenced vertices may carry bone indices valid only for another primitive.
    const readPosition = (i, target) => {
      if (!sampled[i]) {
        try { mesh.getVertexPosition(i, target).applyMatrix4(transform); }
        catch (error) {
          const indices = geometry.attributes.skinIndex, weights = geometry.attributes.skinWeight;
          throw new Error(`Birth skin diagnostic ${JSON.stringify({mesh:mesh.name,materials:materials.map(m=>m?.name),vertex:i,bones:mesh.skeleton?.bones.length,boneMatrices:mesh.skeleton?.boneMatrices.length,skinIndex:indices&&[0,1,2,3].map(k=>indices.getComponent(i,k)),skinWeight:weights&&[0,1,2,3].map(k=>weights.getComponent(i,k)),overlay:!!mesh.userData.aoiOverlay})}: ${error.message}`);
        }
        target.toArray(positions, i * 3); sampled[i] = 1; stats.vertices++;
      }
      return target.fromArray(positions, i * 3);
    };
    stats.meshes++;
    for (const part of ranges) {
      const material = materials[part.materialIndex];
      // A group's start is a primitive boundary. Preserve it when clipping drawRange.
      const begin = part.start + Math.ceil(Math.max(0, drawStart - part.start) / 3) * 3;
      const end = Math.min(drawEnd, part.start + part.count);
      for (let j = begin; j + 2 < end; j += 3) {
        const i0 = geometry.index ? geometry.index.getX(j) : j;
        const i1 = geometry.index ? geometry.index.getX(j + 1) : j + 1;
        const i2 = geometry.index ? geometry.index.getX(j + 2) : j + 2;
        readPosition(i0, a); readPosition(i1, b); readPosition(i2, c);
        const area = edge.subVectors(b, a).cross(cross.subVectors(c, a)).length() * .5;
        if (!(area > 1e-12) || !Number.isFinite(area)) continue;
        bounds.expandByPoint(a); bounds.expandByPoint(b); bounds.expandByPoint(c);
        areaSum += area;
        triangles.push({ positions, geometry, material, i0, i1, i2, cumulative: areaSum });
      }
    }
  });
  stats.triangles = triangles.length;

  function pixels(texture) {
    if (textureCache.has(texture)) return textureCache.get(texture);
    let result = null;
    try {
      const image = texture.image;
      if (image?.data && texture.type === T.UnsignedByteType && texture.format === T.RGBAFormat) {
        result = { data: image.data, width: image.width, height: image.height };
      } else if (image && !image.data) {
        const iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height;
        const scale = Math.min(1, 256 / Math.max(iw, ih));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(iw * scale)); canvas.height = Math.max(1, Math.round(ih * scale));
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        result = context.getImageData(0, 0, canvas.width, canvas.height);
      }
    } catch (_) { /* Tainted/unavailable image: use its material colour, never fetch again. */ }
    textureCache.set(texture, result);
    if (result) stats.textureReads++; else stats.textureFallbacks++;
    return result;
  }
  function wrap(value, mode) {
    if (value >= 0 && value <= 1) return value;
    if (mode === T.RepeatWrapping) return value - Math.floor(value);
    if (mode === T.MirroredRepeatWrapping) return Math.abs(Math.floor(value) % 2) === 1 ? Math.ceil(value) - value : value - Math.floor(value);
    return T.MathUtils.clamp(value, 0, 1);
  }
  function colourAt(triangle, w0, w1, w2) {
    const { material, geometry, i0, i1, i2 } = triangle;
    const colour = material.color?.clone() || new T.Color(0xffffff);
    const vertexColour = material.vertexColors && geometry.attributes.color;
    if (vertexColour) {
      colour.r *= vertexColour.getX(i0) * w0 + vertexColour.getX(i1) * w1 + vertexColour.getX(i2) * w2;
      colour.g *= vertexColour.getY(i0) * w0 + vertexColour.getY(i1) * w1 + vertexColour.getY(i2) * w2;
      colour.b *= vertexColour.getZ(i0) * w0 + vertexColour.getZ(i1) * w1 + vertexColour.getZ(i2) * w2;
    }
    const map = material.map, texUV = map && geometry.getAttribute(map.channel ? `uv${map.channel}` : 'uv');
    if (!map || !texUV) return colour;
    const raster = pixels(map);
    if (!raster) return colour;
    let matrix = matrixCache.get(map);
    if (!matrix) {
      matrix = map.matrix.clone();
      if (map.matrixAutoUpdate) matrix.setUvTransform(map.offset.x, map.offset.y, map.repeat.x, map.repeat.y, map.rotation, map.center.x, map.center.y);
      matrixCache.set(map, matrix);
    }
    uv.set(texUV.getX(i0) * w0 + texUV.getX(i1) * w1 + texUV.getX(i2) * w2,
      texUV.getY(i0) * w0 + texUV.getY(i1) * w1 + texUV.getY(i2) * w2).applyMatrix3(matrix);
    uv.x = wrap(uv.x, map.wrapS); uv.y = wrap(uv.y, map.wrapT);
    if (map.flipY) uv.y = 1 - uv.y;
    const x = Math.min(raster.width - 1, Math.floor(uv.x * raster.width));
    const y = Math.min(raster.height - 1, Math.floor(uv.y * raster.height));
    const offset = (y * raster.width + x) * 4, data = raster.data;
    if (data[offset + 3] / 255 < Math.max(material.alphaTest || 0, .08)) { stats.alphaRejected++; return null; }
    const texel = new T.Color().setRGB(data[offset] / 255, data[offset + 1] / 255, data[offset + 2] / 255,
      map.colorSpace === T.SRGBColorSpace ? T.SRGBColorSpace : T.LinearSRGBColorSpace);
    return colour.multiply(texel);
  }

  const size = bounds.isEmpty() ? new T.Vector3(1, 1, 1) : bounds.getSize(new T.Vector3());
  const height = Math.max(size.y, .1), cell = Math.max(height / (mobile ? 46 : 66), .002);
  stats.cellSize = cell;
  const occupied = new Set(), points = [], colours = [];
  // Use cells only to avoid duplicate samples; keep the actual authored surface positions.
  // The cubist composition is not snapped to a fixed lattice. Attempts stay bounded.
  const attempts = cap * 6;
  for (let i = 0; i < attempts && points.length < cap && areaSum > 0; i++) {
    const target = random() * areaSum;
    let lo = 0, hi = triangles.length - 1;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (triangles[mid].cumulative < target) lo = mid + 1; else hi = mid; }
    const triangle = triangles[lo], root = Math.sqrt(random()), w0 = 1 - root, w1 = root * (1 - random()), w2 = 1 - w0 - w1;
    const colour = colourAt(triangle, w0, w1, w2);
    if (!colour) continue;
    a.fromArray(triangle.positions, triangle.i0 * 3).multiplyScalar(w0);
    b.fromArray(triangle.positions, triangle.i1 * 3).multiplyScalar(w1);
    c.fromArray(triangle.positions, triangle.i2 * 3).multiplyScalar(w2); a.add(b).add(c);
    const x = Math.round(a.x / cell), y = Math.round(a.y / cell), z = Math.round(a.z / cell), key = `${x},${y},${z}`;
    if (occupied.has(key)) continue;
    occupied.add(key); points.push(a.clone()); colours.push(colour);
    const materialName = triangle.material.name || triangle.material.type;
    stats.materialSamples[materialName] = (stats.materialSamples[materialName] || 0) + 1;
  }
  stats.samples = points.length;
  stats.distinctColours = new Set(colours.map(colour => colour.getHex())).size;
  textureCache.clear(); matrixCache.clear(); triangles.length = 0;

  const geometry = new T.BoxGeometry(1, 1, 1);
  // The caller owns the reflection environment. It is borrowed, never captured/disposed here.
  // No transmission or second-pass material: one instanced mesh and one draw.
  const material = new T.MeshPhysicalMaterial({
    color: 0xffffff, metalness: .84, roughness: .12, clearcoat: .35,
    clearcoatRoughness: .16, envMap: environment, envMapIntensity: 1.15,
    transparent: false, opacity: 1, depthWrite: true,
  });
  const voxels = new T.InstancedMesh(geometry, material, points.length);
  voxels.name = 'Aoi birth / hierarchical coloured mirrors';
  voxels.instanceMatrix.setUsage(T.DynamicDrawUsage);
  voxels.frustumCulled = false; voxels.castShadow = false; voxels.receiveShadow = false; voxels.visible = false;
  const largeCount = Math.min(points.length, mobile ? 10 : 16);
  const mediumCount = Math.min(points.length - largeCount, mobile ? 70 : 120);
  const fragments = points.map((point, i) => {
    const tier = i < largeCount ? 'large' : i < largeCount + mediumCount ? 'medium' : 'small';
    stats.tiers[tier]++;
    const phase = random() * Math.PI * 2;
    const radius = height * (tier === 'large' ? .30 + random() * .20 : .13 + random() * .32);
    const origin = point.clone().add(new T.Vector3(Math.cos(phase) * radius,
      (random() - .5) * height * .45, Math.sin(phase) * radius * .65));
    const initialSize = tier === 'large' ? height * (.12 + random() * .05)
      : tier === 'medium' ? height * (.035 + random() * .025) : cell * (.42 + random() * .53);
    const surfaceSize = cell * (.55 + random() * .40);
    stats.maxCubeSize = Math.max(stats.maxCubeSize, initialSize);
    return { tier, origin, phase, radius, initialSize, surfaceSize,
      rotation: new T.Vector3(.25 + random() * 1.1, -.8 + random() * 1.6, .2 + random() * 1.1),
      settledRotation: new T.Vector3(.12 + random() * .3, -.3 + random() * .6, .1 + random() * .3) };
  });
  const dummy = new T.Object3D();
  // Keep the sampled skin, hair and cloth colours; metal reflection is a lighting layer.
  colours.forEach((colour, i) => voxels.setColorAt(i, colour));
  if (voxels.instanceColor) voxels.instanceColor.needsUpdate = true;
  group.add(voxels);
  let disposed = false;
  function update(progress, time = 0) {
    if (disposed) return;
    const p = T.MathUtils.clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
    stats.progress = p;
    const gathering = smooth(.18, .62, p), handoff = smooth(.43, .70, p);
    const departing = smooth(.60, .98, p), presence = smooth(0, .10, p) * (1 - departing);
    voxels.visible = presence > .001 && points.length > 0;
    stats.drawCalls = voxels.visible ? 1 : 0;
    if (!voxels.visible) return;
    const clock = Number.isFinite(time) ? time : 0, orbit = 1 - gathering;
    const emerge = .28 + .72 * smooth(.015, .20, p);
    for (let i = 0; i < points.length; i++) {
      const f = fragments[i];
      dummy.position.copy(f.origin).lerp(points[i], gathering);
      // The difference from phase zero makes time=0 an exact, repeatable reduced-motion pose.
      // Long, low-amplitude orbits avoid strobing or per-frame random rearrangement.
      const angle = clock * .24;
      dummy.position.x += (Math.cos(f.phase + angle) - Math.cos(f.phase)) * f.radius * .22 * orbit;
      dummy.position.z += (Math.sin(f.phase + angle) - Math.sin(f.phase)) * f.radius * .16 * orbit;
      dummy.position.y += (Math.sin(f.phase + clock * .31) - Math.sin(f.phase)) * height * .035 * orbit;
      dummy.rotation.set(
        T.MathUtils.lerp(f.rotation.x, f.settledRotation.x, gathering) + Math.sin(clock * .19) * .22 * orbit,
        T.MathUtils.lerp(f.rotation.y, f.settledRotation.y, gathering) + Math.sin(clock * .23 + f.phase) * .3 * orbit - Math.sin(f.phase) * .3 * orbit,
        T.MathUtils.lerp(f.rotation.z, f.settledRotation.z, gathering) + Math.sin(clock * .17) * .18 * orbit);
      // Large mirror facets dominate the first half, then become fine coloured surface facets.
      const cubeSize = T.MathUtils.lerp(f.initialSize, f.surfaceSize, handoff) * emerge * presence;
      dummy.scale.setScalar(cubeSize); dummy.updateMatrix();
      voxels.setMatrixAt(i, dummy.matrix);
    }
    voxels.instanceMatrix.needsUpdate = true;
  }
  function dispose() {
    if (disposed) return;
    disposed = true; stats.disposed = true; stats.drawCalls = 0;
    voxels.removeFromParent(); geometry.dispose(); material.dispose(); voxels.dispose();
  }
  stats.buildMs = performance.now() - started;
  return { update, dispose, stats };
}
