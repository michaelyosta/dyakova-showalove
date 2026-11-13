/** Dynamic left parameter panel, layers checklist, calculation table, 2D diagram, steps & simulation player UI. */

import { parseSafeSvgElement, syncCalcTable } from './dom-utils.js';

export function createPanelController({
  root,
  onParamChange,
  onPresetSelect,
  onLayerToggle,
  onStepGo,
  onPlayerAction,
}) {
  const paramsHost = root.querySelector('[data-ref="params-host"]');
  const presetsHost = root.querySelector('[data-ref="presets-host"]');
  const calcEl = root.querySelector('[data-ref="calc"]');
  const tgEl = root.querySelector('[data-ref="tg"]');
  const secEl = root.querySelector('[data-ref="sec"]');
  const panelHelp = root.querySelector('[data-ref="panel-help"]');
  const stepsBar = root.querySelector('[data-ref="steps-bar"]');
  const playerBar = root.querySelector('[data-ref="player-bar"]');
  const hintEl = root.querySelector('[data-ref="hint"]');
  const snEl = root.querySelector('[data-ref="sn"]');
  const pvEl = root.querySelector('[data-ref="pv"]');
  const nxEl = root.querySelector('[data-ref="nx"]');

  const simResetBtn = root.querySelector('[data-action="sim-reset"]');
  const simBackBtn = root.querySelector('[data-action="sim-back"]');
  let lastSvgHtml = '';
  const simPlayBtn = root.querySelector('[data-action="sim-play"]');
  const simPlayLabel = root.querySelector('[data-ref="sim-play-label"]');
  const simFwdBtn = root.querySelector('[data-action="sim-fwd"]');
  const simScrubWrap = root.querySelector('[data-ref="sim-scrub-wrap"]');
  const simScrub = root.querySelector('[data-ref="sim-scrub"]');
  const simTimeEl = root.querySelector('[data-ref="sim-time"]');
  const simSpeedBtn = root.querySelector('[data-action="sim-speed"]');

  let layerCheckboxes = [];

  pvEl.onclick = () => onStepGo(-1, true);
  nxEl.onclick = () => onStepGo(1, true);

  simResetBtn?.addEventListener('click', () => onPlayerAction?.({ type: 'reset' }));
  simBackBtn?.addEventListener('click', () => onPlayerAction?.({ type: 'back' }));
  simPlayBtn?.addEventListener('click', () => onPlayerAction?.({ type: 'play' }));
  simFwdBtn?.addEventListener('click', () => onPlayerAction?.({ type: 'fwd' }));
  simSpeedBtn?.addEventListener('click', () => onPlayerAction?.({ type: 'speed' }));
  simScrub?.addEventListener('input', () => {
    onPlayerAction?.({ type: 'scrub', value: Number(simScrub.value) });
  });

  function renderModelSchema(model, params, visible) {
    paramsHost.replaceChildren();
    presetsHost.replaceChildren();
    tgEl.replaceChildren();
    layerCheckboxes = [];

    (model.params || []).forEach((p) => {
      if (p.type === 'select') {
        const label = document.createElement('label');
        label.className = 'tb-select-wrap';
        label.dataset.paramRow = p.key;
        const cap = document.createElement('span');
        cap.textContent = p.label;
        const sel = document.createElement('select');
        sel.className = 'tb-select';
        sel.dataset.p = p.key;
        (p.options || []).forEach((opt) => {
          const o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          sel.append(o);
        });
        sel.value = params[p.key];
        sel.onchange = () => onParamChange(p.key, sel.value);
        label.append(cap, sel);
        paramsHost.append(label);
        return;
      }

      const label = document.createElement('label');
      label.className = 'tb-parameter';
      label.dataset.paramRow = p.key;
      const cap = document.createElement('span');
      cap.textContent = p.label;
      const input = document.createElement('input');
      input.type = 'range';
      input.dataset.p = p.key;
      input.min = String(p.min);
      input.max = String(p.max);
      input.step = String(p.step);
      input.value = String(params[p.key]);
      const valNode = document.createElement('b');
      input.oninput = () => onParamChange(p.key, Number(input.value));
      label.append(cap, input, valNode);
      paramsHost.append(label);
    });

    (model.presets || []).forEach((preset) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tb-preset';
      btn.textContent = preset.label;
      btn.onclick = () => onPresetSelect(preset.values);
      presetsHost.append(btn);
    });

    calcEl.setAttribute('aria-label', model.calcAriaLabel || 'Расчёт параметров');

    (model.layers || []).forEach((layer, idx) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.k = layer.key;
      input.checked = !!visible[idx];
      input.onchange = () => onLayerToggle(idx, layer.key, input.checked);
      const swatch = document.createElement('i');
      swatch.style.background = layer.color;
      label.append(input, swatch, document.createTextNode(layer.label));
      tgEl.append(label);
      layerCheckboxes.push(input);
    });
  }

  function syncValues(model, params, solved, groups) {
    (model.params || []).forEach((p) => {
      const row = paramsHost.querySelector(`[data-param-row="${p.key}"]`);
      if (row) row.hidden = p.visibleIf ? !p.visibleIf(params) : false;
      const ctrl = paramsHost.querySelector(`[data-p="${p.key}"]`);
      if (!ctrl) return;
      const strVal = String(params[p.key]);
      if (ctrl.value !== strVal) ctrl.value = strVal;
      if (p.type !== 'select') {
        const b = ctrl.nextElementSibling;
        const formatted = p.format ? p.format(params[p.key]) : Number(params[p.key]).toFixed(2);
        if (b && b.textContent !== formatted) b.textContent = formatted;
      }
    });

    const rows = model.getCalcRows ? model.getCalcRows(solved, params) : [];
    syncCalcTable(calcEl, rows);

    syncDiagram(model, params, solved, groups);
  }

  function syncDiagram(model, params, solved, groups) {
    const svgHtml = model.renderDiagram ? model.renderDiagram(solved, params) : '';
    const layerOk = !model.diagramLayerKey || !!groups[model.diagramLayerKey]?.visible;
    if (svgHtml && layerOk) {
      const aria = model.diagramAriaLabel || 'Плоский чертёж';
      if (secEl.getAttribute('aria-label') !== aria) secEl.setAttribute('aria-label', aria);
      if (svgHtml !== lastSvgHtml || !secEl.firstElementChild) {
        lastSvgHtml = svgHtml;
        const svgEl = parseSafeSvgElement(svgHtml);
        if (svgEl) secEl.replaceChildren(document.importNode(svgEl, true));
        else secEl.replaceChildren();
      }
      secEl.style.display = 'block';
    } else {
      lastSvgHtml = '';
      secEl.style.display = 'none';
      secEl.replaceChildren();
    }
  }

  function syncLayers(visible) {
    layerCheckboxes.forEach((cb, i) => {
      cb.checked = !!visible[i];
    });
  }

  function updateSteps(model, st) {
    const steps = model.steps || [];
    const step = steps[st] || steps[0];
    hintEl.replaceChildren();
    if (step) {
      const strong = document.createElement('b');
      strong.textContent = `${step.title}.`;
      hintEl.append(strong, document.createTextNode(` ${step.text}`));
    }
    snEl.textContent = steps.length ? `Шаг ${st + 1} из ${steps.length}` : '';
    pvEl.disabled = st <= 0;
    nxEl.disabled = st >= steps.length - 1;
  }

  function setBottomBarKind(model) {
    const isSim = model?.kind === 'simulation';
    if (stepsBar) stepsBar.hidden = isSim;
    if (playerBar) playerBar.hidden = !isSim;
    if (panelHelp) {
      panelHelp.textContent = isSim
        ? 'Вращение — перетаскиванием, масштаб — колесом или двумя пальцами. Пуск/пауза — Пробел, шаг — кнопками или стрелками.'
        : 'Вращение — перетаскиванием, масштаб — колесом или двумя пальцами. Шаги — кнопками или стрелками на клавиатуре.';
    }
  }

  function syncPlayer({ playing, simTime, duration, speed, canScrub }) {
    if (!simPlayBtn) return;
    simPlayBtn.setAttribute('aria-pressed', String(!!playing));
    if (simPlayLabel) simPlayLabel.textContent = playing ? 'Пауза' : 'Пуск';
    if (simSpeedBtn) simSpeedBtn.textContent = `${speed}×`;

    const hasFiniteDur = Number.isFinite(duration) && duration > 0;
    const scrubEnabled = Boolean(canScrub && hasFiniteDur);
    if (simScrubWrap) simScrubWrap.hidden = !scrubEnabled;
    if (scrubEnabled && simScrub) {
      simScrub.min = '0';
      simScrub.max = String(duration);
      simScrub.step = String(Math.max(0.005, duration / 400));
      simScrub.value = String(Math.min(duration, Math.max(0, simTime)));
    }
    if (simTimeEl) {
      simTimeEl.textContent = hasFiniteDur
        ? `t = ${simTime.toFixed(2)} / ${duration.toFixed(2)} с`
        : `t = ${simTime.toFixed(2)} с`;
    }
    if (simBackBtn) simBackBtn.disabled = !canScrub || simTime <= 0.001;
  }

  return {
    renderModelSchema,
    syncValues,
    syncDiagram,
    syncLayers,
    updateSteps,
    setBottomBarKind,
    syncPlayer,
  };
}
