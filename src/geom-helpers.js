/** Shared Three.js geometry primitives (static & dynamic) for Teacher Board models and simulations. */

export function createGeomApi(THREE) {
  const texCache = new Map();
  const MAX_TEX = 128;
  const UP = new THREE.Vector3(0, 1, 0);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const mid = (p, q) => p.clone().add(q).multiplyScalar(0.5);

  function toXYZ(v) {
    return Array.isArray(v) ? v : [v.x, v.y, v.z];
  }

  function toVec3(v) {
    return Array.isArray(v) ? new THREE.Vector3(v[0], v[1], v[2]) : v;
  }

  function releaseLabelTexture(sprite) {
    const key = sprite?.userData?._texKey;
    if (!key) return;
    const entry = texCache.get(key);
    if (entry && entry.refs > 0) entry.refs -= 1;
    sprite.userData._texKey = null;
  }

  function clearGroup(g) {
    if (!g) return;
    g.children.slice().forEach((c) => {
      g.remove(c);
      if (c.children && c.children.length) clearGroup(c);
      if (c.isSprite) releaseLabelTexture(c);
      if (c.geometry && !c.isSprite) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
        else c.material.dispose();
      }
      if (typeof c.dispose === 'function' && c.isInstancedMesh) c.dispose();
    });
  }

  function drawRoundedRect(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function getLabelTexture(text, color = '#ffffff', outline = '#14161b') {
    const key = `${text}\0${color}\0${outline}`;
    let entry = texCache.get(key);
    if (!entry) {
      if (texCache.size >= MAX_TEX) {
        for (const [oldKey, oldEntry] of texCache.entries()) {
          if (oldEntry.refs <= 0) {
            oldEntry.map.dispose();
            texCache.delete(oldKey);
            if (texCache.size < MAX_TEX) break;
          }
        }
      }
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const x = c.getContext('2d');
      const isLight = /^#?fff(fff)?$/i.test(String(outline).trim());

      let fontSize = 84;
      x.font = `700 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      const m = x.measureText(text);
      if (m.width > 170) {
        fontSize = Math.max(46, Math.floor((fontSize * 170) / m.width));
        x.font = `700 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      }
      const tw = x.measureText(text).width;
      const pillW = Math.min(234, Math.max(108, tw + 52));
      const pillH = Math.max(100, Math.round(fontSize * 1.32));
      const px = (256 - pillW) / 2;
      const py = (256 - pillH) / 2;

      // Subtle pill/halo keeps vertex & vector labels legible over wireframe lines and frosted glass
      drawRoundedRect(x, px, py, pillW, pillH, pillH / 2);
      x.fillStyle = isLight ? 'rgba(255, 255, 255, 0.90)' : 'rgba(20, 22, 27, 0.78)';
      x.fill();
      x.lineWidth = 3;
      x.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.22)' : 'rgba(255, 255, 255, 0.20)';
      x.stroke();

      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.lineWidth = isLight ? 4 : 6;
      x.lineJoin = 'round';
      x.strokeStyle = isLight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 18, 25, 0.85)';
      x.strokeText(text, 128, 131);
      x.fillStyle = color;
      x.fillText(text, 128, 131);

      const map = new THREE.CanvasTexture(c);
      if ('encoding' in map && THREE.sRGBEncoding !== undefined) {
        map.encoding = THREE.sRGBEncoding;
      }
      map.minFilter = THREE.LinearMipmapLinearFilter;
      map.magFilter = THREE.LinearFilter;
      map.generateMipmaps = true;
      entry = { key, map, refs: 0 };
      texCache.set(key, entry);
    }
    entry.refs += 1;
    return entry;
  }

  function label(text, pos, group, opts = {}) {
    const color = opts.color || '#ffffff';
    const outline = opts.outline || '#14161b';
    const entry = getLabelTexture(text, color, outline);
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: entry.map,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      })
    );
    s.position.copy(pos);
    const sc = (opts.scale || 0.5) * 1.12;
    s.scale.set(sc, sc, 1);
    s.renderOrder = 10;
    s.userData.exportTintRole = 'label';
    s.userData.labelOpts = { text, color, outline };
    s.userData._texKey = entry.key;
    group.add(s);
    return s;
  }

  function setLabelAppearance(sprite, color, outline) {
    if (!sprite?.isSprite || !sprite.material || !sprite.userData?.labelOpts) return;
    releaseLabelTexture(sprite);
    const { text } = sprite.userData.labelOpts;
    const entry = getLabelTexture(text, color, outline);
    sprite.material.map = entry.map;
    sprite.material.color.setHex(0xffffff);
    sprite.material.needsUpdate = true;
    sprite.userData._texKey = entry.key;
  }

  function dispose() {
    for (const entry of texCache.values()) {
      entry.map.dispose();
    }
    texCache.clear();
  }

  function seg(group, p, q, rad, col, opts = {}) {
    const d = q.clone().sub(p);
    const len = d.length();
    if (len < 1e-6) return null;
    const opacity = opts.opacity ?? 1;
    const mat = opts.unlit
      ? new THREE.MeshBasicMaterial({ color: col, transparent: opacity < 1, opacity })
      : new THREE.MeshStandardMaterial({
          color: col,
          roughness: opts.roughness ?? 0.4,
          metalness: opts.metalness ?? 0.18,
          emissive: col,
          emissiveIntensity: opts.emissiveIntensity ?? 0.16,
          transparent: opacity < 1,
          opacity,
        });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, opts.segments || 12), mat);
    m.userData.exportTintRole = opts.role || 'wireframe';
    m.position.copy(p).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
    group.add(m);
    return m;
  }

  function dashedSeg(group, p, q, rad, col, dashLen = 0.12, gapLen = 0.08, opts = {}) {
    const total = p.distanceTo(q);
    if (total < 1e-6) return;
    const step = dashLen + gapLen;
    const dir = q.clone().sub(p).normalize();
    for (let s = 0; s < total; s += step) {
      const e = Math.min(total, s + dashLen);
      seg(group, p.clone().addScaledVector(dir, s), p.clone().addScaledVector(dir, e), rad, col, opts);
    }
  }

  function dot(group, p, col, rad, opts = {}) {
    const opacity = opts.opacity ?? 1;
    const mat = opts.unlit
      ? new THREE.MeshBasicMaterial({ color: col, transparent: opacity < 1, opacity })
      : new THREE.MeshPhysicalMaterial({
          color: col,
          roughness: opts.roughness ?? 0.24,
          metalness: opts.metalness ?? 0.14,
          clearcoat: opts.clearcoat ?? 0.75,
          clearcoatRoughness: 0.16,
          emissive: col,
          emissiveIntensity: opts.emissiveIntensity ?? 0.12,
          transparent: opacity < 1,
          opacity,
        });
    const m = new THREE.Mesh(new THREE.SphereGeometry(rad, 20, 14), mat);
    m.userData.exportTintRole = opts.role || 'accent';
    m.position.copy(p);
    group.add(m);
    return m;
  }

  function ring(group, rad, col, tubular = 0.012, opts = {}) {
    if (rad < 1e-5) return null;
    const opacity = opts.opacity ?? 1;
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(rad, tubular, opts.radialSegments || 12, opts.tubularSegments || 100),
      new THREE.MeshStandardMaterial({
        color: col,
        roughness: opts.roughness ?? 0.34,
        metalness: opts.metalness ?? 0.24,
        emissive: col,
        emissiveIntensity: opts.emissiveIntensity ?? 0.14,
        transparent: opacity < 1,
        opacity,
      })
    );
    m.userData.exportTintRole = opts.role || 'wireframe';
    if (opts.normal) {
      const n = toVec3(opts.normal).clone().normalize();
      m.quaternion.setFromUnitVectors(V(0, 0, 1), n);
    } else {
      m.rotation.x = Math.PI / 2;
    }
    if (opts.center) {
      m.position.copy(toVec3(opts.center));
    }
    group.add(m);
    return m;
  }

  function tri(pts, col, op, opts = {}) {
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    geo.computeVertexNormals();
    const mat = opts.unlit
      ? new THREE.MeshBasicMaterial({
          color: col,
          transparent: op < 1,
          opacity: op,
          side: opts.side || THREE.DoubleSide,
          depthWrite: opts.depthWrite ?? op >= 1,
        })
      : new THREE.MeshPhysicalMaterial({
          color: col,
          transparent: op < 1,
          opacity: op,
          roughness: opts.roughness ?? 0.16,
          metalness: opts.metalness ?? 0.04,
          clearcoat: opts.clearcoat ?? 0.72,
          clearcoatRoughness: 0.14,
          envMapIntensity: opts.envMapIntensity ?? 1.0,
          side: opts.side || THREE.DoubleSide,
          depthWrite: opts.depthWrite ?? op >= 1,
        });
    const m = new THREE.Mesh(geo, mat);
    m.userData.exportTintRole = opts.role || 'fill';
    return m;
  }

  function polygon(group, verts, col, op, opts = {}) {
    if (!verts || verts.length < 3) return null;
    const c = V(0, 0, 0);
    verts.forEach((v) => c.add(v));
    c.divideScalar(verts.length);
    const pts = [];
    for (let i = 0; i < verts.length; i++) {
      pts.push(c, verts[i], verts[(i + 1) % verts.length]);
    }
    const m = tri(pts, col, op, opts);
    group.add(m);
    return m;
  }

  function sphere(group, center, rad, col, op = 0.3, opts = {}) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(rad, opts.segW || 48, opts.segH || 32),
      new THREE.MeshPhysicalMaterial({
        color: col,
        transparent: op < 1,
        opacity: op,
        roughness: opts.roughness ?? 0.11,
        metalness: opts.metalness ?? 0.05,
        clearcoat: opts.clearcoat ?? 0.92,
        clearcoatRoughness: opts.clearcoatRoughness ?? 0.08,
        ior: 1.46,
        envMapIntensity: opts.envMapIntensity ?? 1.15,
        depthWrite: opts.depthWrite ?? op >= 1,
        side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
      })
    );
    m.userData.exportTintRole = opts.role || 'fill';
    m.position.copy(center);
    group.add(m);
    return m;
  }

  function coneShell(group, rad, height, baseCenterY, col, op = 0.14, opts = {}) {
    const geo = new THREE.ConeGeometry(rad, height, opts.seg || 64, 1, !!opts.openEnded);
    const mat = new THREE.MeshPhysicalMaterial({
      color: col,
      transparent: true,
      opacity: op,
      roughness: opts.roughness ?? 0.15,
      metalness: opts.metalness ?? 0.04,
      clearcoat: opts.clearcoat ?? 0.85,
      clearcoatRoughness: 0.12,
      envMapIntensity: opts.envMapIntensity ?? 1.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.userData.exportTintRole = opts.role || 'fill';
    m.position.set(0, baseCenterY + height / 2, 0);
    group.add(m);
    return m;
  }

  function cylinderShell(group, radTop, radBot, height, centerPos, col, op = 0.25, opts = {}) {
    const geo = new THREE.CylinderGeometry(radTop, radBot, height, opts.seg || 48, 1, !!opts.openEnded);
    const mat = opts.metal
      ? new THREE.MeshStandardMaterial({
          color: col,
          metalness: opts.metalness ?? 0.72,
          roughness: opts.roughness ?? 0.28,
          envMapIntensity: opts.envMapIntensity ?? 1.05,
          transparent: op < 1,
          opacity: op,
          side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
          depthWrite: opts.depthWrite ?? op >= 1,
        })
      : new THREE.MeshPhysicalMaterial({
          color: col,
          roughness: opts.roughness ?? 0.14,
          metalness: opts.metalness ?? 0.05,
          clearcoat: opts.clearcoat ?? 0.88,
          clearcoatRoughness: 0.1,
          envMapIntensity: opts.envMapIntensity ?? 1.1,
          transparent: op < 1,
          opacity: op,
          side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
          depthWrite: opts.depthWrite ?? op >= 1,
        });
    const m = new THREE.Mesh(geo, mat);
    m.userData.exportTintRole = opts.role || (op < 1 ? 'fill' : 'apparatus');
    m.position.copy(toVec3(centerPos));
    if (opts.normal) {
      m.quaternion.setFromUnitVectors(UP, toVec3(opts.normal).clone().normalize());
    }
    group.add(m);
    return m;
  }

  function disk(group, rad, centerPos, col, op = 1, opts = {}) {
    const th = opts.thickness ?? 0.02;
    const geo = new THREE.CylinderGeometry(rad, rad, th, opts.seg || 48);
    const mat = opts.metal
      ? new THREE.MeshStandardMaterial({
          color: col,
          metalness: opts.metalness ?? 0.65,
          roughness: opts.roughness ?? 0.32,
          transparent: op < 1,
          opacity: op,
          depthWrite: opts.depthWrite ?? op >= 1,
        })
      : new THREE.MeshPhysicalMaterial({
          color: col,
          roughness: opts.roughness ?? 0.35,
          metalness: opts.metalness ?? 0.1,
          clearcoat: opts.clearcoat ?? 0.35,
          transparent: op < 1,
          opacity: op,
          depthWrite: opts.depthWrite ?? op >= 1,
        });
    const m = new THREE.Mesh(geo, mat);
    m.userData.exportTintRole = opts.role || (op < 1 ? 'fill' : 'apparatus');
    m.position.copy(toVec3(centerPos));
    if (opts.normal) {
      m.quaternion.setFromUnitVectors(UP, toVec3(opts.normal).clone().normalize());
    }
    group.add(m);
    return m;
  }

  function studioBox(group, w, h, d, centerPos, col, opts = {}) {
    const op = opts.opacity ?? 1;
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: col,
      metalness: opts.metalness ?? 0.25,
      roughness: opts.roughness ?? 0.45,
      transparent: op < 1,
      opacity: op,
      depthWrite: opts.depthWrite ?? op >= 1,
    });
    const m = new THREE.Mesh(geo, mat);
    m.userData.exportTintRole = opts.role || (op < 1 ? 'fill' : 'apparatus');
    m.position.copy(toVec3(centerPos));
    if (opts.edgeColor !== undefined) {
      const edges = new THREE.EdgesGeometry(geo);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({
          color: opts.edgeColor,
          transparent: (opts.edgeOpacity ?? 0.5) < 1,
          opacity: opts.edgeOpacity ?? 0.5,
          toneMapped: false,
        })
      );
      line.userData.exportTintRole = opts.edgeRole || 'wireframe';
      m.add(line);
    }
    group.add(m);
    return m;
  }

  function rightAngleMark(group, corner, dirA, dirB, size = 0.16, col = 0x94a3b8, rad = 0.008) {
    const c = toVec3(corner);
    const u = toVec3(dirA).clone();
    const v = toVec3(dirB).clone();
    if (u.lengthSq() < 1e-8 || v.lengthSq() < 1e-8) return;
    u.normalize();
    v.normalize();
    const pA = c.clone().addScaledVector(u, size);
    const pB = c.clone().addScaledVector(v, size);
    const pC = c.clone().addScaledVector(u, size).addScaledVector(v, size);
    seg(group, pA, pC, rad, col);
    seg(group, pC, pB, rad, col);
  }

  function arcSeg(group, center, uVec, vVec, rad, startAng, endAng, lineRad = 0.011, col = 0xfbbf24, segments = 24, opts = {}) {
    if (rad < 1e-4 || Math.abs(endAng - startAng) < 1e-4) return null;
    const c = toVec3(center);
    const u = toVec3(uVec).clone().normalize();
    const v = toVec3(vVec).clone().normalize();
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const a = startAng + ((endAng - startAng) * i) / segments;
      pts.push(
        c
          .clone()
          .addScaledVector(u, Math.cos(a) * rad)
          .addScaledVector(v, Math.sin(a) * rad)
      );
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, segments, lineRad, 8, false);
    const mat = new THREE.MeshStandardMaterial({
      color: col,
      roughness: 0.35,
      metalness: 0.15,
      emissive: col,
      emissiveIntensity: 0.2,
      transparent: (opts.opacity ?? 1) < 1,
      opacity: opts.opacity ?? 1,
    });
    const m = new THREE.Mesh(geo, mat);
    m.userData.exportTintRole = opts.role || 'accent';
    group.add(m);
    return m;
  }

  function coilSpring(group, opts = {}) {
    const turns = opts.turns ?? 10;
    const steps = opts.steps ?? 96;
    const radialSegs = 6;
    const coilRad = opts.coilRad ?? 0.11;
    const wireRad = opts.wireRad ?? 0.016;
    const ringCount = steps + 1;
    const vertCount = ringCount * radialSegs;
    const posArr = new Float32Array(vertCount * 3);
    const normArr = new Float32Array(vertCount * 3);
    const indices = [];
    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < radialSegs; j++) {
        const jNext = (j + 1) % radialSegs;
        const a = i * radialSegs + j;
        const b = (i + 1) * radialSegs + j;
        const c = (i + 1) * radialSegs + jNext;
        const d = i * radialSegs + jNext;
        indices.push(a, b, d, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(posArr, 3);
    const normAttr = new THREE.BufferAttribute(normArr, 3);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('normal', normAttr);
    geo.setIndex(indices);

    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: opts.col ?? 0xcbd5e1,
        metalness: 0.72,
        roughness: 0.26,
        envMapIntensity: 1.1,
      })
    );
    mesh.userData.exportTintRole = opts.role || 'wireframe';
    mesh.frustumCulled = false;
    group.add(mesh);

    return {
      mesh,
      geo,
      posAttr,
      normAttr,
      turns,
      steps,
      radialSegs,
      coilRad,
      wireRad,
      spine: new Float32Array(ringCount * 3),
    };
  }

  function updateCoilSpring(handle, topPos, botPos) {
    if (!handle) return;
    const [tx, ty, tz] = toXYZ(topPos);
    const [bx, by, bz] = toXYZ(botPos);
    let ax = bx - tx;
    let ay = by - ty;
    let az = bz - tz;
    const len = Math.hypot(ax, ay, az);
    if (len < 1e-4) return;
    ax /= len;
    ay /= len;
    az /= len;

    // Pick stable orthonormal frame (u, v) perpendicular to spring axis
    let refX = 1;
    let refY = 0;
    let refZ = 0;
    if (Math.abs(ax) > 0.9) {
      refX = 0;
      refZ = 1;
    }
    let ux = ay * refZ - az * refY;
    let uy = az * refX - ax * refZ;
    let uz = ax * refY - ay * refX;
    const uLen = Math.hypot(ux, uy, uz) || 1;
    ux /= uLen;
    uy /= uLen;
    uz /= uLen;
    const vx = ay * uz - az * uy;
    const vy = az * ux - ax * uz;
    const vz = ax * uy - ay * ux;

    const { steps, radialSegs, turns, coilRad, wireRad, spine, posAttr, normAttr } = handle;
    const ringCount = steps + 1;

    for (let i = 0; i < ringCount; i++) {
      const s = i / steps;
      // Smooth hook taper at top & bottom 7% so spring enters mounts cleanly along axis
      let env = 1;
      if (s < 0.07) env = s / 0.07;
      else if (s > 0.93) env = (1 - s) / 0.07;
      const r = coilRad * Math.sin(env * Math.PI * 0.5);
      const ang = s * turns * Math.PI * 2;
      const ca = Math.cos(ang) * r;
      const sa = Math.sin(ang) * r;
      spine[i * 3] = tx + ax * len * s + ux * ca + vx * sa;
      spine[i * 3 + 1] = ty + ay * len * s + uy * ca + vy * sa;
      spine[i * 3 + 2] = tz + az * len * s + uz * ca + vz * sa;
    }

    const pArr = posAttr.array;
    const nArr = normAttr.array;

    for (let i = 0; i < ringCount; i++) {
      const prev = Math.max(0, i - 1);
      const next = Math.min(steps, i + 1);
      let tanX = spine[next * 3] - spine[prev * 3];
      let tanY = spine[next * 3 + 1] - spine[prev * 3 + 1];
      let tanZ = spine[next * 3 + 2] - spine[prev * 3 + 2];
      const tanL = Math.hypot(tanX, tanY, tanZ) || 1;
      tanX /= tanL;
      tanY /= tanL;
      tanZ /= tanL;

      let r1x = tanY * uz - tanZ * uy;
      let r1y = tanZ * ux - tanX * uz;
      let r1z = tanX * uy - tanY * ux;
      const r1l = Math.hypot(r1x, r1y, r1z);
      if (r1l < 1e-5) {
        r1x = ux;
        r1y = uy;
        r1z = uz;
      } else {
        r1x /= r1l;
        r1y /= r1l;
        r1z /= r1l;
      }
      const r2x = tanY * r1z - tanZ * r1y;
      const r2y = tanZ * r1x - tanX * r1z;
      const r2z = tanX * r1y - tanY * r1x;

      const cx = spine[i * 3];
      const cy = spine[i * 3 + 1];
      const cz = spine[i * 3 + 2];

      for (let j = 0; j < radialSegs; j++) {
        const theta = (j / radialSegs) * Math.PI * 2;
        const ct = Math.cos(theta);
        const st = Math.sin(theta);
        const nx = r1x * ct + r2x * st;
        const ny = r1y * ct + r2y * st;
        const nz = r1z * ct + r2z * st;
        const idx = (i * radialSegs + j) * 3;
        nArr[idx] = nx;
        nArr[idx + 1] = ny;
        nArr[idx + 2] = nz;
        pArr[idx] = cx + nx * wireRad;
        pArr[idx + 1] = cy + ny * wireRad;
        pArr[idx + 2] = cz + nz * wireRad;
      }
    }

    posAttr.needsUpdate = true;
    normAttr.needsUpdate = true;
  }

  function arrow(group, col, shaftRad = 0.02, headRad = 0.056, headLen = 0.16, opts = {}) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: col,
      roughness: 0.34,
      metalness: 0.16,
      emissive: col,
      emissiveIntensity: 0.22,
    });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(shaftRad, shaftRad, 1, 12), mat);
    const head = new THREE.Mesh(new THREE.ConeGeometry(headRad, headLen, 14), mat);
    const role = opts.role || 'accent';
    g.userData.exportTintRole = role;
    shaft.userData.exportTintRole = role;
    head.userData.exportTintRole = role;
    g.add(shaft, head);
    g.visible = false;
    group.add(g);
    return { group: g, shaft, head, headLen };
  }

  function updateArrow(handle, origin, dirVec, minLen = 0.03) {
    if (!handle) return;
    const [ox, oy, oz] = toXYZ(origin);
    const [dx, dy, dz] = toXYZ(dirVec);
    const len = Math.hypot(dx, dy, dz);
    if (len < minLen) {
      handle.group.visible = false;
      return;
    }
    handle.group.visible = true;
    handle.group.position.set(ox, oy, oz);
    handle.group.quaternion.setFromUnitVectors(UP, V(dx / len, dy / len, dz / len));
    const hl = handle.headLen;
    if (len <= hl) {
      handle.shaft.visible = false;
      const sc = len / hl;
      handle.head.scale.set(sc, sc, sc);
      handle.head.position.y = len / 2;
    } else {
      handle.shaft.visible = true;
      handle.head.scale.set(1, 1, 1);
      const shaftLen = len - hl;
      handle.shaft.scale.set(1, shaftLen, 1);
      handle.shaft.position.y = shaftLen / 2;
      handle.head.position.y = shaftLen + hl / 2;
    }
  }

  function trail(group, maxPoints, col, opacity = 0.9) {
    const arr = new Float32Array(maxPoints * 3);
    const geo = new THREE.BufferGeometry();
    const pos = new THREE.BufferAttribute(arr, 3);
    geo.setAttribute('position', pos);
    geo.setDrawRange(0, 0);
    const line = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: col, transparent: opacity < 1, opacity, toneMapped: false })
    );
    line.userData.exportTintRole = 'accent';
    line.frustumCulled = false;
    group.add(line);
    return { line, geo, pos, maxPoints };
  }

  function updateTrail(handle, pts) {
    if (!handle) return;
    const count = Math.min(pts.length, handle.maxPoints);
    const arr = handle.pos.array;
    for (let i = 0; i < count; i++) {
      const [x, y, z] = toXYZ(pts[i]);
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    handle.pos.needsUpdate = true;
    handle.geo.setDrawRange(0, count);
  }

  function instancedSpheres(group, maxCount, rad, col = 0xffffff, opts = {}) {
    const geo = new THREE.SphereGeometry(rad, opts.segW || 12, opts.segH || 10);
    const mat = opts.unlit
      ? new THREE.MeshBasicMaterial({
          color: opts.perInstanceColor ? 0xffffff : col,
          transparent: (opts.opacity ?? 1) < 1,
          opacity: opts.opacity ?? 1,
        })
      : new THREE.MeshStandardMaterial({
          color: opts.perInstanceColor ? 0xffffff : col,
          roughness: opts.roughness ?? 0.3,
          metalness: opts.metalness ?? 0.12,
          transparent: (opts.opacity ?? 1) < 1,
          opacity: opts.opacity ?? 1,
        });
    const mesh = new THREE.InstancedMesh(geo, mat, maxCount);
    mesh.frustumCulled = false;
    const tmpColor = new THREE.Color(col);
    if (opts.perInstanceColor) {
      mesh.userData.exportTintRole = 'preserve';
      mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(maxCount * 3),
        3
      );
      for (let i = 0; i < maxCount; i++) mesh.setColorAt(i, tmpColor);
      mesh.instanceColor.needsUpdate = true;
    }
    mesh.count = 0;
    group.add(mesh);
    return { mesh, maxCount, dummy: new THREE.Object3D(), tmpColor };
  }

  function updateInstanced(handle, count, getItem) {
    if (!handle) return;
    const n = Math.min(count, handle.maxCount);
    const { mesh, dummy, tmpColor } = handle;
    for (let i = 0; i < n; i++) {
      const item = getItem(i);
      dummy.position.set(item.x, item.y, item.z);
      const sc = item.s ?? 1;
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (item.color !== undefined) {
        tmpColor.setHex(item.color);
        mesh.setColorAt(i, tmpColor);
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  function waveGrid(group, segX, segZ, width, depth, opts = {}) {
    const geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.getAttribute('position');
    const colArr = new Float32Array(pos.count * 3);
    const colAttr = new THREE.BufferAttribute(colArr, 3);
    geo.setAttribute('color', colAttr);

    const surface = new THREE.Mesh(
      geo,
      new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: opts.roughness ?? 0.22,
        metalness: opts.metalness ?? 0.04,
        clearcoat: opts.clearcoat ?? 0.45,
        clearcoatRoughness: opts.clearcoatRoughness ?? 0.16,
        envMapIntensity: opts.envMapIntensity ?? 0.65,
        transparent: true,
        opacity: opts.opacity ?? 0.86,
        side: THREE.DoubleSide,
      })
    );
    surface.userData.exportTintRole = 'preserve';
    group.add(surface);

    const wire = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color: opts.wireColor ?? 0x7dd3fc,
        wireframe: true,
        transparent: true,
        opacity: opts.wireOpacity ?? 0.10,
      })
    );
    wire.userData.exportTintRole = 'water-wire';
    group.add(wire);

    return { geo, pos, colAttr, surface, wire };
  }

  function updateWaveGrid(handle, heightAndShadeFn) {
    if (!handle) return;
    const { geo, pos, colAttr } = handle;
    const pa = pos.array;
    const ca = colAttr.array;
    for (let i = 0; i < pos.count; i++) {
      const x = pa[i * 3];
      const z = pa[i * 3 + 2];
      const res = heightAndShadeFn(x, z);
      pa[i * 3 + 1] = res.y;
      ca[i * 3] = res.r;
      ca[i * 3 + 1] = res.g;
      ca[i * 3 + 2] = res.b;
    }
    pos.needsUpdate = true;
    colAttr.needsUpdate = true;
    geo.computeVertexNormals();
  }

  return {
    THREE,
    V,
    mid,
    clearGroup,
    label,
    seg,
    dashedSeg,
    dot,
    ring,
    tri,
    polygon,
    sphere,
    coneShell,
    cylinderShell,
    disk,
    studioBox,
    rightAngleMark,
    arcSeg,
    coilSpring,
    updateCoilSpring,
    arrow,
    updateArrow,
    trail,
    updateTrail,
    instancedSpheres,
    updateInstanced,
    waveGrid,
    updateWaveGrid,
    setLabelAppearance,
    dispose,
  };
}
