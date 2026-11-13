/** Общие утилиты DOM, SVG-санитизации, модальной доступности и валидации параметров сцен. */

export const VALID_INK_COLORS = new Set(['graphite', 'blue', 'red']);
const SAFE_THUMB_DATA_RE = /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=\s]+$/i;

export function isSafeThumbDataUrl(url) {
  return typeof url === 'string' && SAFE_THUMB_DATA_RE.test(url.trim());
}

function isFiniteVec(arr, len) {
  return Array.isArray(arr) && arr.length === len && arr.every((v) => typeof v === 'number' && Number.isFinite(v));
}

export function sanitizeCamera(rawCam) {
  if (!rawCam || typeof rawCam !== 'object') return null;
  if (!isFiniteVec(rawCam.position, 3) || !isFiniteVec(rawCam.target, 3)) return null;
  if (!isFiniteVec(rawCam.up, 3) || !isFiniteVec(rawCam.quaternion, 4)) return null;
  const posNum = (v, fb, min = 1e-4, max = 1e4) =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : fb;
  let view = null;
  if (rawCam.view && typeof rawCam.view === 'object' && rawCam.view.enabled) {
    const fw = posNum(rawCam.view.fullWidth, 0, 1, 1e6);
    const fh = posNum(rawCam.view.fullHeight, 0, 1, 1e6);
    const w = posNum(rawCam.view.width, 0, 1, 1e6);
    const h = posNum(rawCam.view.height, 0, 1, 1e6);
    if (fw > 0 && fh > 0 && w > 0 && h > 0) {
      view = {
        enabled: true,
        fullWidth: fw,
        fullHeight: fh,
        offsetX: typeof rawCam.view.offsetX === 'number' && Number.isFinite(rawCam.view.offsetX) ? rawCam.view.offsetX : 0,
        offsetY: typeof rawCam.view.offsetY === 'number' && Number.isFinite(rawCam.view.offsetY) ? rawCam.view.offsetY : 0,
        width: w,
        height: h,
      };
    }
  }
  return {
    position: [...rawCam.position],
    target: [...rawCam.target],
    up: [...rawCam.up],
    quaternion: [...rawCam.quaternion],
    zoom: posNum(rawCam.zoom, 1, 0.05, 50),
    fov: posNum(rawCam.fov, 38, 10, 120),
    near: posNum(rawCam.near, 0.1, 1e-4, 100),
    far: posNum(rawCam.far, 100, 1, 1e5),
    aspect: posNum(rawCam.aspect, 1.6, 0.2, 5),
    view,
  };
}

export function sanitizeStrokes(rawStrokes) {
  if (!Array.isArray(rawStrokes)) return [];
  const out = [];
  for (const st of rawStrokes) {
    if (!st || !Array.isArray(st.points) || !st.points.length) continue;
    const pts = [];
    for (const pt of st.points) {
      if (
        Array.isArray(pt) &&
        pt.length >= 2 &&
        typeof pt[0] === 'number' &&
        typeof pt[1] === 'number' &&
        Number.isFinite(pt[0]) &&
        Number.isFinite(pt[1]) &&
        Math.abs(pt[0]) <= 12 &&
        Math.abs(pt[1]) <= 12
      ) {
        pts.push([pt[0], pt[1]]);
      }
    }
    if (!pts.length) continue;
    const color = VALID_INK_COLORS.has(st.color) ? st.color : 'blue';
    const width =
      typeof st.width === 'number' && Number.isFinite(st.width)
        ? Math.max(0.5, Math.min(40, st.width))
        : 2.8;
    out.push({ points: pts, color, width });
  }
  return out;
}

export function sanitizeSnapshot(rawSnap, catalogById) {
  if (!rawSnap || typeof rawSnap !== 'object' || !catalogById.has(rawSnap.modelId)) return null;
  const camera = sanitizeCamera(rawSnap.camera);
  if (!camera) return null;
  return {
    modelId: rawSnap.modelId,
    kind: rawSnap.kind === 'simulation' ? 'simulation' : 'geometry',
    params: rawSnap.params && typeof rawSnap.params === 'object' ? { ...rawSnap.params } : {},
    paramSummary: typeof rawSnap.paramSummary === 'string' ? rawSnap.paramSummary : '',
    step: typeof rawSnap.step === 'number' && Number.isFinite(rawSnap.step) ? Math.max(0, Math.round(rawSnap.step)) : 0,
    visible: Array.isArray(rawSnap.visible) ? rawSnap.visible.map(Boolean) : undefined,
    simTime: typeof rawSnap.simTime === 'number' && Number.isFinite(rawSnap.simTime) ? Math.max(0, rawSnap.simTime) : null,
    simSeed: typeof rawSnap.simSeed === 'number' && Number.isFinite(rawSnap.simSeed) ? rawSnap.simSeed : null,
    simState: rawSnap.simState && typeof rawSnap.simState === 'object' ? rawSnap.simState : null,
    camera,
    ratio:
      typeof rawSnap.ratio === 'number' && Number.isFinite(rawSnap.ratio) && rawSnap.ratio >= 0.25 && rawSnap.ratio <= 4
        ? rawSnap.ratio
        : 1.6,
  };
}

export function defaultParamsFor(model) {
  const out = {};
  (model?.params || []).forEach((p) => {
    out[p.key] = p.default;
  });
  return out;
}

export function mergeParamsFor(model, incoming) {
  const out = defaultParamsFor(model);
  if (!incoming || typeof incoming !== 'object') return out;
  (model?.params || []).forEach((p) => {
    const val = incoming[p.key];
    if (p.type === 'select') {
      if (typeof val === 'string' && (p.options || []).some((o) => o.value === val)) {
        out[p.key] = val;
      }
      return;
    }
    const num = typeof val === 'number' ? val : typeof val === 'string' && val.trim() ? Number(val) : NaN;
    if (!Number.isFinite(num)) return;
    let clamped = Math.max(p.min, Math.min(p.max, num));
    if (typeof p.step === 'number' && p.step >= 1 && Number.isInteger(p.step)) {
      clamped = Math.min(p.max, Math.max(p.min, p.min + Math.round((clamped - p.min) / p.step) * p.step));
    }
    out[p.key] = clamped;
  });
  return out;
}

const FORBIDDEN_SVG_TAGS = new Set(['script', 'foreignobject', 'iframe', 'object', 'embed', 'style']);

export function parseSafeSvgElement(svgMarkup) {
  if (!svgMarkup || typeof svgMarkup !== 'string') return null;
  const trimmed = svgMarkup.trim();
  if (!trimmed.startsWith('<svg')) return null;

  const hasXmlns = /\bxmlns\s*=/.test(trimmed.slice(0, trimmed.indexOf('>') + 1));
  const xmlInput = hasXmlns ? trimmed : trimmed.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');

  const doc = new DOMParser().parseFromString(xmlInput, 'image/svg+xml');
  if (!doc || doc.querySelector('parsererror')) return null;
  const rootEl = doc.documentElement;
  if (!rootEl || rootEl.localName !== 'svg') return null;

  const walk = (node) => {
    const children = [...node.children];
    for (const child of children) {
      if (FORBIDDEN_SVG_TAGS.has(child.localName?.toLowerCase())) {
        child.remove();
        continue;
      }
      for (const attr of [...child.attributes]) {
        const name = attr.name.toLowerCase();
        const val = attr.value.trim().toLowerCase();
        if (name.startsWith('on')) {
          child.removeAttribute(attr.name);
        } else if ((name === 'href' || name === 'xlink:href') && !val.startsWith('#')) {
          child.removeAttribute(attr.name);
        }
      }
      walk(child);
    }
  };
  for (const attr of [...rootEl.attributes]) {
    if (attr.name.toLowerCase().startsWith('on')) {
      rootEl.removeAttribute(attr.name);
    }
  }
  walk(rootEl);
  return rootEl;
}

export function syncCalcTable(tableEl, rows) {
  if (!tableEl) return;
  const trs = tableEl.rows;
  if (trs.length !== rows.length) {
    tableEl.replaceChildren();
    rows.forEach(([k, v]) => {
      const tr = document.createElement('tr');
      const tdK = document.createElement('td');
      tdK.textContent = k;
      const tdV = document.createElement('td');
      tdV.textContent = typeof v === 'number' ? v.toFixed(2) : String(v);
      tr.append(tdK, tdV);
      tableEl.append(tr);
    });
    return;
  }
  for (let i = 0; i < rows.length; i++) {
    const [k, v] = rows[i];
    const nextK = String(k);
    const nextV = typeof v === 'number' ? v.toFixed(2) : String(v);
    const c0 = trs[i].cells[0];
    const c1 = trs[i].cells[1];
    if (c0 && c0.textContent !== nextK) c0.textContent = nextK;
    if (c1 && c1.textContent !== nextV) c1.textContent = nextV;
  }
}

const FOCUSABLE_SEL =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function attachModalController({
  backdrop,
  closeBtn,
  openerBtn,
  initialFocus,
  canClose = () => true,
  onEscape,
  onClose,
}) {
  let prevFocused = null;

  const getFocusables = () =>
    backdrop
      ? [...backdrop.querySelectorAll(FOCUSABLE_SEL)].filter(
          (el) =>
            !el.hidden &&
            !el.closest('[hidden]') &&
            el.getAttribute('aria-disabled') !== 'true' &&
            el.getClientRects().length > 0
        )
      : [];

  const handleClose = () => {
    if (!canClose()) return;
    onClose?.();
  };

  closeBtn?.addEventListener('click', handleClose);
  backdrop?.addEventListener('click', (e) => {
    if (e.target === backdrop) handleClose();
  });

  document.addEventListener('keydown', (e) => {
    if (!backdrop || backdrop.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (onEscape?.()) return;
      handleClose();
      return;
    }
    if (e.key === 'Tab') {
      const items = getFocusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !backdrop.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  const rememberFocus = () => {
    prevFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  };
  const focusFirst = (preferredEl) => {
    const resolved =
      preferredEl || (typeof initialFocus === 'function' ? initialFocus() : initialFocus);
    const target =
      resolved &&
      !resolved.disabled &&
      !resolved.hidden &&
      !resolved.closest('[hidden]') &&
      resolved.getAttribute('aria-disabled') !== 'true'
        ? resolved
        : getFocusables()[0];
    target?.focus({ preventScroll: true });
  };
  const restoreFocus = () => {
    const back =
      (prevFocused && prevFocused !== document.body && prevFocused.isConnected ? prevFocused : null) ||
      (openerBtn && openerBtn.isConnected ? openerBtn : null);
    prevFocused = null;
    back?.focus({ preventScroll: true });
  };

  return {
    rememberFocus,
    focusFirst,
    restoreFocus,
    onOpened(preferredEl) {
      rememberFocus();
      focusFirst(preferredEl);
    },
    onClosed() {
      restoreFocus();
    },
  };
}
