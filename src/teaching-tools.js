/** Temporary 3D measurements in model units and a fading, non-persistent laser pointer. */
export function distance3D(a, b, scale = 1) {
  return Math.hypot(...a.map((v, i) => v - b[i])) * scale;
}

export function angle3D(a, vertex, b) {
  const u = a.map((v, i) => v - vertex[i]);
  const v = b.map((x, i) => x - vertex[i]);
  const n = Math.hypot(...u) * Math.hypot(...v);
  if (n < 1e-12) return null;
  return Math.acos(Math.max(-1, Math.min(1, u.reduce((s, x, i) => s + x * v[i], 0) / n))) * 180 / Math.PI;
}

export function createTeachingTools({ root, el, camera, ctl, getMode, getMeta, getGroups, onActivate }) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.classList.add('tb-teaching-overlay');
  svg.setAttribute('aria-label', 'Измерительные инструменты и лазерная указка');
  el.append(svg);
  const panel = document.createElement('div');
  panel.className = 'tb-instrument-panel';
  panel.hidden = true;
  const hint = document.createElement('span');
  hint.setAttribute('role', 'status');
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.textContent = 'Очистить';
  clear.setAttribute('aria-label', 'Очистить измерения');
  panel.append(hint, clear);
  el.append(panel);
  let active = null;
  let selected = [];
  let results = [];
  let lastResult = '';
  let trail = [];
  let laserPointer = null;
  let hover = null;
  let lastDraw = '';
  const buttons = [...root.querySelectorAll('[data-instrument]')];
  const fmt = n => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  const measurementMeta = () => getMeta()?.measurement;
  const measuring = () => active === 'ruler' || active === 'protractor';
  const instruction = () => active === 'laser' ? 'Лазер · ведите мышью или касайтесь экрана · Esc — выход' :
    active === 'ruler' ? `Линейка · выберите ${selected.length ? 'вторую' : 'первую'} точку` :
    active === 'protractor' ? ['Транспортир · первая точка луча', 'Транспортир · вершина угла (вторая точка)', 'Транспортир · точка второго луча'][selected.length] : '';

  function sync() {
    const supported = getMode() === 'model' && !!measurementMeta();
    for (const b of buttons) {
      b.disabled = b.dataset.instrument !== 'laser' && !supported;
      b.setAttribute('aria-pressed', String(active === b.dataset.instrument));
      if (b.dataset.instrument !== 'laser') b.title = supported
        ? (b.dataset.instrument === 'ruler' ? 'Линейка · выберите 2 точки модели' : 'Транспортир · 3 точки, вторая — вершина')
        : 'Измерения доступны в геометрических моделях; размеры физических установок условные';
    }
    svg.style.pointerEvents = active ? 'all' : 'none';
    svg.style.cursor = active ? 'crosshair' : '';
    ctl.enabled = getMode() === 'model' && !active;
    panel.hidden = !active && !results.length;
    clear.hidden = !results.length && !selected.length;
    hint.textContent = [lastResult, instruction()].filter(Boolean).join(' · ');
  }

  function activate(tool) {
    if (tool && tool !== 'laser' && (getMode() !== 'model' || !measurementMeta())) return;
    active = active === tool ? null : tool;
    selected = [];
    trail = [];
    hover = null;
    laserPointer = null;
    if (active) {
      ctl.autoRotate = false;
      onActivate?.();
    }
    sync();
    lastDraw = '';
  }
  buttons.forEach(b => b.addEventListener('click', () => activate(b.dataset.instrument)));
  clear.onclick = () => { selected = []; results = []; lastResult = ''; sync(); lastDraw = ''; };

  function reset() {
    active = null;
    selected = [];
    results = [];
    lastResult = '';
    trail = [];
    hover = null;
    laserPointer = null;
    svg.replaceChildren();
    lastDraw = '';
    sync();
  }

  function project(point) {
    const p = new window.THREE.Vector3(...point).project(camera);
    return { x: (p.x + 1) * el.clientWidth / 2, y: (1 - p.y) * el.clientHeight / 2, valid: p.z > -1 && p.z < 1 };
  }
  function candidates() {
    return (measurementMeta()?.points || []).filter(p => !p.layer || getGroups()[p.layer]?.visible);
  }
  function pick(e) {
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, dist = e.pointerType === 'touch' ? 34 : 24;
    for (const p of candidates()) {
      const q = project(p.position);
      const d = Math.hypot(q.x - x, q.y - y);
      if (q.valid && d < dist) { best = p; dist = d; }
    }
    return best;
  }
  function laser(e) {
    const r = el.getBoundingClientRect();
    trail.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() });
    if (trail.length > 100) trail.shift();
  }
  svg.addEventListener('pointerdown', e => {
    if (!active || e.button !== 0 || !e.isPrimary) return;
    e.preventDefault();
    if (active === 'laser') {
      laserPointer = e.pointerId;
      svg.setPointerCapture(e.pointerId);
      laser(e);
      return;
    }
    selectPoint(pick(e));
  });

  function selectPoint(p) {
    if (!p) { hint.textContent = 'Нажмите на цветную точку модели'; return; }
    if (selected.some(q => distance3D(q.position, p.position) < 1e-8)) { hint.textContent = 'Выберите другую точку'; return; }
    selected.push(p);
    const needed = active === 'ruler' ? 2 : 3;
    if (selected.length === needed) {
      const pts = selected.map(q => q.position);
      const value = active === 'ruler' ? distance3D(pts[0], pts[1], measurementMeta().scale) : angle3D(...pts);
      const names = selected.map(q => q.name).join(active === 'ruler' ? '–' : '');
      const label = `${active === 'ruler' ? '' : '∠'}${names} = ${fmt(value)}${active === 'ruler' ? ' ' + (measurementMeta().unit || 'ед.') : '°'}`;
      results.push({ points: selected, label });
      if (results.length > 12) results.shift();
      lastResult = label;
      selected = [];
    }
    sync(); lastDraw = '';
  }
  svg.addEventListener('pointermove', e => {
    if (active === 'laser' && (e.pointerType === 'mouse' || laserPointer === e.pointerId)) laser(e);
    else if (measuring()) hover = pick(e)?.name || null;
  });
  ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave'].forEach(type => svg.addEventListener(type, e => {
    if (laserPointer === e.pointerId) laserPointer = null;
    hover = null;
  }));
  function keydown(e) {
    if (measuring() && (e.key === 'Enter' || e.key === ' ') && e.target.dataset?.measurePoint) {
      selectPoint(candidates().find(p => p.name === e.target.dataset.measurePoint));
      e.preventDefault();
    }
    if (e.key === 'Escape' && active) { activate(null); e.preventDefault(); }
  }
  document.addEventListener('keydown', keydown);

  function tick(now) {
    if (!active && !results.length && !trail.length && !lastDraw) return;
    const w = el.clientWidth, h = el.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${w || 1} ${h || 1}`);
    trail = trail.filter(p => now - p.t < 650);
    const nodes = [];
    const add = (tag, attrs, text) => {
      const n = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
      if (text) n.textContent = text;
      nodes.push(n);
    };
    for (const result of [...results, ...(selected.length ? [{ points: selected }] : [])]) {
      const pts = result.points.map(p => project(p.position));
      if (pts.some(p => !p.valid)) continue;
      add('polyline', { points: pts.map(p => `${p.x},${p.y}`).join(' '), fill: 'none', stroke: '#fbbf24', 'stroke-width': 2.5, 'stroke-dasharray': '6 4' });
      pts.forEach(p => add('circle', { cx: p.x, cy: p.y, r: 5, fill: '#fbbf24', stroke: '#111827', 'stroke-width': 2 }));
      if (result.label) {
        const mid = pts.length === 3 ? pts[1] : { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        add('text', { x: Math.max(16, Math.min(w - 150, mid.x + 12)), y: Math.max(24, Math.min(h - 48, mid.y - 14)), class: 'tb-measure-label' }, result.label);
      }
    }
    if (measuring()) for (const p of candidates()) {
      const q = project(p.position);
      if (!q.valid) continue;
      add('circle', { 'data-measure-point': p.name, role: 'button', tabindex: 0, 'aria-label': `Точка ${p.name}`, cx: q.x, cy: q.y, r: hover === p.name ? 10 : 7, fill: hover === p.name ? '#fff' : '#fbbf24', stroke: '#111827', 'stroke-width': 2.5 });
      add('text', { x: q.x + 11, y: q.y + 4, class: 'tb-measure-label' }, p.name);
    }
    for (let i = 1; i < trail.length; i++) {
      const p = trail[i], prev = trail[i - 1];
      add('line', { x1: prev.x, y1: prev.y, x2: p.x, y2: p.y, stroke: '#ff365d', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: Math.max(0, 1 - (now - p.t) / 650) });
    }
    const tip = trail.at(-1);
    if (tip) {
      const opacity = 1 - (now - tip.t) / 650;
      add('circle', { cx: tip.x, cy: tip.y, r: 13, fill: '#ff365d', opacity: opacity * 0.2 });
      add('circle', { cx: tip.x, cy: tip.y, r: 4.5, fill: '#fff', stroke: '#ff365d', 'stroke-width': 2, opacity });
    }
    const signature = nodes.map(n => n.outerHTML).join('');
    if (signature !== lastDraw) { svg.replaceChildren(...nodes); lastDraw = signature; }
  }
  sync();
  return { sync, reset, tick, dispose() { document.removeEventListener('keydown', keydown); svg.remove(); panel.remove(); } };
}
