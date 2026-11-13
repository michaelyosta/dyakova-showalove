/** Three.js scene, studio lighting/PMREM environment, OrbitControls, resize fitting, and dynamic frame updates. */

export function configureRenderer(THREE, renderer) {
  if (!renderer || !THREE) return renderer;
  if ('outputEncoding' in renderer && THREE.sRGBEncoding !== undefined) {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }
  if ('toneMapping' in renderer && THREE.ACESFilmicToneMapping !== undefined) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
  }
  return renderer;
}

const STUDIO_LIGHT_PRESETS = {
  dark: {
    hemiSky: 0xdcebff,
    hemiGround: 0x161c26,
    hemiIntensity: 0.64,
    ambientIntensity: 0.26,
    keyIntensity: 1.14,
    fillIntensity: 0.48,
    rimIntensity: 0.52,
    minorColor: 0x64748b,
    minorOpacity: 0.17,
    majorColor: 0x38bdf8,
    majorOpacity: 0.24,
    rimColor: 0x475569,
    rimOpacity: 0.26,
  },
  light: {
    hemiSky: 0xffffff,
    hemiGround: 0xcbd5e1,
    hemiIntensity: 0.82,
    ambientIntensity: 0.36,
    keyIntensity: 1.06,
    fillIntensity: 0.44,
    rimIntensity: 0.42,
    minorColor: 0x94a3b8,
    minorOpacity: 0.28,
    majorColor: 0x0284c7,
    majorOpacity: 0.34,
    rimColor: 0x64748b,
    rimOpacity: 0.30,
  },
};

function buildCircularGridGeometries(THREE, radius) {
  const r = Math.max(2.0, Math.min(8.5, Number(radius) || 3.2));
  const minorPts = [];
  const majorPts = [];
  const rimPts = [];
  const step = r > 5 ? 1.0 : 0.5;
  const maxCoord = Math.floor(r / step) * step;

  // Clip cartesian grid lines to a disk of radius r so the studio floor has clean drafting edges
  for (let c = -maxCoord; c <= maxCoord + 1e-6; c += step) {
    const v = Math.abs(c) < 1e-6 ? 0 : c;
    const span = Math.sqrt(Math.max(0, r * r - v * v));
    if (span < 0.05) continue;
    const isMajor = Math.abs(v) < 1e-6;
    const target = isMajor ? majorPts : minorPts;
    target.push(-span, 0, v, span, 0, v);
    target.push(v, 0, -span, v, 0, span);
  }

  const segs = 72;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    rimPts.push(
      Math.cos(a0) * r,
      0,
      Math.sin(a0) * r,
      Math.cos(a1) * r,
      0,
      Math.sin(a1) * r
    );
  }

  const makeGeo = (pts) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  };

  return {
    minorGeo: makeGeo(minorPts),
    majorGeo: makeGeo(majorPts),
    rimGeo: makeGeo(rimPts),
  };
}

function buildProceduralEnvTarget(THREE, renderer) {
  if (!THREE?.PMREMGenerator || !renderer) return null;
  let pmrem = null;
  let envScene = null;
  const disposables = [];
  try {
    pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader?.();
    envScene = new THREE.Scene();

    const domeGeo = new THREE.SphereGeometry(20, 24, 16);
    const domeMat = new THREE.MeshBasicMaterial({ color: 0x101622, side: THREE.BackSide });
    disposables.push(domeGeo, domeMat);
    envScene.add(new THREE.Mesh(domeGeo, domeMat));

    const addPanel = (col, w, h, pos, lookAt) => {
      const geo = new THREE.PlaneGeometry(w, h);
      const mat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
      disposables.push(geo, mat);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(pos[0], pos[1], pos[2]);
      m.lookAt(lookAt[0], lookAt[1], lookAt[2]);
      envScene.add(m);
    };

    // Soft studio key, cool sky overhead, and crisp rim reflectors for glass & brushed metal
    addPanel(0xfff4e0, 11, 8, [9, 10, 8], [0, 0, 0]);
    addPanel(0x93c5fd, 12, 7, [-10, 7, -4], [0, 0, 0]);
    addPanel(0xe0f2fe, 14, 5, [0, 12, 0], [0, 0, 0]);
    addPanel(0x38bdf8, 8, 5, [2, 3, -11], [0, 0, 0]);

    return pmrem.fromScene(envScene, 0.04);
  } catch {
    return null;
  } finally {
    disposables.forEach((d) => d.dispose?.());
    pmrem?.dispose?.();
  }
}

export function createStudioEnvironment(THREE, scene, renderer) {
  let theme = 'dark';
  let envRT = buildProceduralEnvTarget(THREE, renderer);
  if (envRT?.texture) {
    scene.environment = envRT.texture;
  }

  const rig = new THREE.Group();
  rig.name = 'tb-studio-lights';
  const ambient = new THREE.AmbientLight(0xffffff, 0.26);
  const hemi = new THREE.HemisphereLight(0xdcebff, 0x161c26, 0.64);
  const key = new THREE.DirectionalLight(0xfff8ed, 1.14);
  key.position.set(5, 8.5, 6);
  const fill = new THREE.DirectionalLight(0x7dd3fc, 0.48);
  fill.position.set(-6.5, 4.5, -3.5);
  const rim = new THREE.DirectionalLight(0xbae6fd, 0.52);
  rim.position.set(0.5, 5.5, -7.5);
  rig.add(ambient, hemi, key, fill, rim);
  scene.add(rig);

  const floorGroup = new THREE.Group();
  floorGroup.name = 'tb-studio-floor';
  let currentGridRadius = 3.2;
  const geos = buildCircularGridGeometries(THREE, currentGridRadius);

  const minorMat = new THREE.LineBasicMaterial({
    color: 0x64748b,
    transparent: true,
    opacity: 0.17,
    depthWrite: false,
    toneMapped: false,
  });
  const majorMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    toneMapped: false,
  });
  const rimMat = new THREE.LineBasicMaterial({
    color: 0x475569,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    toneMapped: false,
  });

  const minorLines = new THREE.LineSegments(geos.minorGeo, minorMat);
  const majorLines = new THREE.LineSegments(geos.majorGeo, majorMat);
  const rimLines = new THREE.LineSegments(geos.rimGeo, rimMat);
  minorLines.userData.exportTintRole = 'studio-grid';
  majorLines.userData.exportTintRole = 'studio-grid';
  rimLines.userData.exportTintRole = 'studio-grid';
  minorLines.userData.studioGridKind = 'minor';
  majorLines.userData.studioGridKind = 'major';
  rimLines.userData.studioGridKind = 'rim';

  floorGroup.add(minorLines, majorLines, rimLines);
  floorGroup.position.y = -0.003;
  scene.add(floorGroup);

  function setTheme(nextTheme = 'dark') {
    theme = nextTheme === 'light' ? 'light' : 'dark';
    const p = STUDIO_LIGHT_PRESETS[theme];
    hemi.color.setHex(p.hemiSky);
    hemi.groundColor.setHex(p.hemiGround);
    hemi.intensity = p.hemiIntensity;
    ambient.intensity = p.ambientIntensity;
    key.intensity = p.keyIntensity;
    fill.intensity = p.fillIntensity;
    rim.intensity = p.rimIntensity;

    minorMat.color.setHex(p.minorColor);
    minorMat.opacity = p.minorOpacity;
    majorMat.color.setHex(p.majorColor);
    majorMat.opacity = p.majorOpacity;
    rimMat.color.setHex(p.rimColor);
    rimMat.opacity = p.rimOpacity;
  }

  function applyModelMeta(meta = {}) {
    if (!meta || meta.showGrid === false) {
      floorGroup.visible = false;
      return;
    }
    floorGroup.visible = true;
    const groundY = Number.isFinite(meta.groundY) ? meta.groundY : 0;
    floorGroup.position.y = groundY - 0.003;

    const targetRadius = Number.isFinite(meta.gridRadius)
      ? meta.gridRadius
      : Number.isFinite(meta.fitRadius)
        ? Math.max(2.6, Math.min(7.5, meta.fitRadius * 1.38))
        : 3.2;

    if (Math.abs(targetRadius - currentGridRadius) > 0.12) {
      currentGridRadius = targetRadius;
      const next = buildCircularGridGeometries(THREE, currentGridRadius);
      minorLines.geometry.dispose();
      majorLines.geometry.dispose();
      rimLines.geometry.dispose();
      minorLines.geometry = next.minorGeo;
      majorLines.geometry = next.majorGeo;
      rimLines.geometry = next.rimGeo;
    }
    setTheme(theme);
  }

  function rebuildEnvironment() {
    envRT?.dispose?.();
    envRT = buildProceduralEnvTarget(THREE, renderer);
    scene.environment = envRT?.texture || null;
  }

  function dispose() {
    if (scene.environment && envRT?.texture && scene.environment === envRT.texture) {
      scene.environment = null;
    }
    envRT?.dispose?.();
    envRT = null;
    scene.remove(rig, floorGroup);
    minorLines.geometry.dispose();
    majorLines.geometry.dispose();
    rimLines.geometry.dispose();
    minorMat.dispose();
    majorMat.dispose();
    rimMat.dispose();
  }

  setTheme('dark');

  return { applyModelMeta, setTheme, rebuildEnvironment, dispose };
}

export function createSceneController({ THREE, el, geomApi }) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  configureRenderer(THREE, renderer);
  renderer.domElement.id = 'scene-canvas';
  renderer.domElement.setAttribute('aria-label', 'Интерактивная 3D-сцена');
  el.prepend(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(5.4, 3.4, 5.6);

  const ctl = new THREE.OrbitControls(camera, renderer.domElement);
  ctl.enableDamping = true;
  ctl.enablePan = false;
  ctl.minDistance = 2.6;
  ctl.maxDistance = 34;
  ctl.autoRotateSpeed = 1.2;
  ctl.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  ctl.addEventListener('start', () => {
    ctl.autoRotate = false;
  });

  const studio = createStudioEnvironment(THREE, scene, renderer);

  const groups = {};
  let activeFitRadius = 2.5;
  let wasPortrait = null;
  let buildHandles = null;
  let lastW = 0;
  let lastH = 0;
  let onRestoreCb = null;
  let onLostCb = null;

  function handleContextLost(e) {
    e.preventDefault();
    onLostCb?.();
  }

  function handleContextRestored() {
    lastW = 0;
    lastH = 0;
    geomApi.dispose?.();
    studio.rebuildEnvironment();
    onRestoreCb?.();
  }

  renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
  renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

  function setContextHandlers({ onLost, onRestored } = {}) {
    onLostCb = onLost || null;
    onRestoreCb = onRestored || null;
  }

  function setLayers(layers) {
    Object.keys(groups).forEach((key) => {
      geomApi.clearGroup(groups[key]);
      scene.remove(groups[key]);
      delete groups[key];
    });
    buildHandles = null;
    layers.forEach((layer) => {
      const g = new THREE.Group();
      scene.add(g);
      groups[layer.key] = g;
    });
  }

  function rebuild(model, params, solved, simState = null, simTime = 0) {
    Object.values(groups).forEach(geomApi.clearGroup);
    const meta = model.build(geomApi, { params, solved, groups, scene, simState, simTime }) || {};
    buildHandles = meta.handles || null;
    studio.applyModelMeta({
      ...meta,
      fitRadius: meta.fitRadius || model.cameraDefaults?.fitRadius || 2.5,
    });
    if (Array.isArray(meta.target)) {
      ctl.target.set(meta.target[0], meta.target[1], meta.target[2]);
    }
    activeFitRadius = meta.fitRadius || model.cameraDefaults?.fitRadius || 2.5;
    if (typeof model.updateScene === 'function') {
      model.updateScene(geomApi, { params, solved, groups, handles: buildHandles, simState, simTime });
    }
  }

  function updateDynamic(model, params, solved, simState = null, simTime = 0) {
    if (typeof model.updateScene === 'function') {
      model.updateScene(geomApi, { params, solved, groups, handles: buildHandles, simState, simTime });
    }
  }

  function resetCamera(model, autoRotateIfAllowed = true) {
    const def = model.cameraDefaults || {};
    const pos = def.position || [5.4, 3.4, 5.6];
    const tgt = def.target || [0, 0.6, 0];
    camera.position.set(pos[0], pos[1], pos[2]);
    ctl.target.set(tgt[0], tgt[1], tgt[2]);
    camera.up.set(0, 1, 0);
    camera.zoom = 1;
    camera.clearViewOffset();
    activeFitRadius = def.fitRadius || 2.5;
    wasPortrait = null;
    if (autoRotateIfAllowed) {
      const wantsRotate = model.kind !== 'simulation' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      ctl.autoRotate = wantsRotate;
    }
    const damping = ctl.enableDamping;
    ctl.enableDamping = false;
    ctl.update();
    ctl.enableDamping = damping;
  }

  function fit({ mode, snap, restoreCamera, redrawInk }) {
    const w = el.clientWidth;
    const H = el.clientHeight;
    if (!w || !H) return;
    const portrait = w < H;
    if (w !== lastW || H !== lastH) {
      lastW = w;
      lastH = H;
      renderer.setSize(w, H);
    }
    camera.aspect = w / H;

    if (mode === 'ink' && snap) {
      restoreCamera(snap.snapshot, true);
    } else {
      if (portrait) camera.setViewOffset(w, H, 0, H * 0.12, w, H);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      if (portrait !== wasPortrait) {
        const vf = (camera.fov * Math.PI) / 180;
        const hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
        const radius = activeFitRadius || 2.5;
        camera.position.sub(ctl.target).setLength(radius / Math.sin(Math.min(vf, hf) / 2)).add(ctl.target);
      }
    }
    wasPortrait = portrait;
    redrawInk();
  }

  function renderFrame(isModelMode) {
    if (isModelMode) ctl.update();
    renderer.render(scene, camera);
  }

  function dispose() {
    renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
    Object.values(groups).forEach(geomApi.clearGroup);
    geomApi.dispose?.();
    studio.dispose();
    renderer.dispose();
    ctl.dispose();
  }

  return {
    scene,
    renderer,
    camera,
    ctl,
    groups,
    studio,
    setTheme: studio.setTheme,
    setLayers,
    rebuild,
    updateDynamic,
    resetCamera,
    fit,
    renderFrame,
    setContextHandlers,
    dispose,
  };
}
