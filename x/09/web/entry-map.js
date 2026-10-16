// 開始地図専用。公開版の実測形状を再利用し、主画面とは別のカメラで重ねる。
// WebGL のコンテキストは増やさず、同じ renderer の描画領域だけを一時的に切り替える。
export function createEntryMap(C, host, choices) {
  const T = C.THREE, scene = new T.Scene(), group = new T.Group(); scene.add(group);
  const line = C.D.centerline, a = line[0].p, b = line.at(-1).p;
  const cx = (a[0] + b[0]) / 2, cz = (a[2] + b[2]) / 2, L = Math.hypot(a[0] - b[0], a[2] - b[2]);
  const camera = new T.OrthographicCamera(-L, L, L, -L, 1, L * 8);
  camera.position.set(cx + L * .95, L * 1.2, cz + L * .48); camera.lookAt(cx, 15, cz); camera.updateMatrixWorld();
  const material = (color, opacity = 1) => new T.MeshBasicMaterial({color, transparent: opacity < 1, opacity, depthWrite: opacity === 1});
  const board = new T.Mesh(new T.PlaneGeometry(880, L + 260), material(0x071d24, .86));
  board.rotation.x = -Math.PI / 2; board.position.set(cx, -5, cz); group.add(board);
  const grid = new T.GridHelper(L + 260, 14, 0x588887, 0x315451);
  grid.position.set(cx, -4.5, cz); grid.scale.x = 880 / (L + 260); grid.material.transparent = true; grid.material.opacity = .38; group.add(grid);
  const routePts = line.filter((_, i) => i % 8 === 0 || i === line.length - 1).map(q => new T.Vector3(...q.p).add(new T.Vector3(0, 5, 0)));
  const route = new T.CatmullRomCurve3(routePts);
  group.add(new T.Mesh(new T.TubeGeometry(route, 200, 5, 5, false), material(0xa6e9d7)));
  // 並木は同じ位置データから軽い点群へ。配置の模式部分は元の出典説明を引き継ぐ。
  const treePos = C.D.trees.flatMap(q => [q.p[0], q.p[1] + 8, q.p[2]]);
  const trees = new T.BufferGeometry(); trees.setAttribute('position', new T.Float32BufferAttribute(treePos, 3));
  group.add(new T.Points(trees, new T.PointsMaterial({color: 0x83bba9, size: 8, sizeAttenuation: true, transparent: true, opacity: .85})));
  let buildingMeshes = 0;
  function syncBuildings() { if (buildingMeshes || !C.buildings) return;
    C.buildings.updateWorldMatrix(true, true);
    C.buildings.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      const mesh = new T.Mesh(o.geometry, material(0x467675, .43));
      mesh.matrix.copy(o.matrixWorld); mesh.matrixAutoUpdate = false; mesh.frustumCulled = true; group.add(mesh); buildingMeshes++;
    });
  }
  const chosen = new T.Mesh(new T.ConeGeometry(18, 50, 4), material(0xffe1a5)); chosen.rotation.z = Math.PI; group.add(chosen);
  const markers = choices.map(q => {
    const p = C.pointAt(q.dd), h = q.big ? 60 : 26;
    const beam = new T.Mesh(new T.CylinderGeometry(q.big ? 3 : 1.7, q.big ? 3 : 1.7, h, 5), material(q.big ? 0xc2fff0 : 0x608f87, .85));
    beam.position.set(p[0], p[1] + h / 2 + 5, p[2]); group.add(beam); return {q, p};
  });
  let rect, size = '', disposed = false, frames = 0;
  const v = new T.Vector3(), vp = new T.Vector4(), sc = new T.Vector4();
  function layout() {
    rect = host.getBoundingClientRect();
    const key = `${Math.round(rect.width)}:${Math.round(rect.height)}`;
    if (size === key || !rect.width || !rect.height) return; size = key;
    const aspect = rect.width / rect.height;
    const p = [...routePts, ...markers.map(m => new T.Vector3(m.p[0], m.p[1] + 80, m.p[2]))].map(p => p.clone().applyMatrix4(camera.matrixWorldInverse));
    const hx = Math.max(...p.map(v => Math.abs(v.x))) + 180, hy = Math.max(...p.map(v => Math.abs(v.y))) + 160;
    const halfW = Math.max(hx, hy * aspect), halfH = halfW / aspect;
    camera.left = -halfW; camera.right = halfW; camera.top = halfH; camera.bottom = -halfH; camera.updateProjectionMatrix();
  }
  function project(p) { layout(); v.set(...p).project(camera); return {x: (v.x + 1) * rect.width / 2, y: (1 - v.y) * rect.height / 2, z: v.z}; }
  function render(renderer) {
    if (disposed || !host.isConnected || host.closest('[hidden]')) return;
    syncBuildings(); layout(); if (!rect.width || !rect.height) return;
    const width = innerWidth, height = innerHeight;
    renderer.getViewport(vp); renderer.getScissor(sc);
    const test = renderer.getScissorTest(), clear = renderer.autoClear, shadow = renderer.shadowMap.autoUpdate;
    try {
      renderer.autoClear = false; renderer.shadowMap.autoUpdate = false;
      renderer.setViewport(rect.left, height - rect.bottom, rect.width, rect.height);
      renderer.setScissor(rect.left, height - rect.bottom, rect.width, rect.height); renderer.setScissorTest(true); renderer.clearDepth();
      renderer.render(scene, camera); frames++;
    } finally {
      renderer.setViewport(vp); renderer.setScissor(sc); renderer.setScissorTest(test); renderer.autoClear = clear; renderer.shadowMap.autoUpdate = shadow;
    }
  }
  return {
    render, project, camera, scene,
    select(q) { const p = C.pointAt(q.dd); chosen.position.set(p[0], p[1] + 95, p[2]); },
    get frames() { return frames; }, get buildingMeshes() { return buildingMeshes; },
    dispose() { disposed = true; group.traverse(o => { if (o.material) o.material.dispose(); }); /* 共用の形状は破棄しない */ }
  };
}
