/** Compact floating stage HUD for 3D laboratory modes, overlaid oscilloscope, and quiz options. */

export function createLabPanel(root, onAction) {
  const sceneCol = root.querySelector('.tb-scene-column');
  const stage = root.querySelector('.tb-scene-stage');
  const hud = document.createElement('div');
  hud.className = 'tb-lab-hud';
  hud.hidden = true;
  hud.setAttribute('role', 'region');
  hud.setAttribute('aria-label', 'Управление 3D-лабораторией и презентацией');

  const modeGroup = document.createElement('div');
  modeGroup.className = 'tb-lab-pill-group';
  const modes = [
    ['free', 'Свободно'],
    ['demo', 'Демо'],
    ['steps', 'Презентация'],
    ['quiz', 'Тест'],
  ];
  const modeButtons = modes.map(([mode, title]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = title;
    b.dataset.labMode = mode;
    b.onclick = () => onAction({ type: 'mode', mode });
    modeGroup.append(b);
    return b;
  });

  const actionGroup = document.createElement('div');
  actionGroup.className = 'tb-lab-pill-group';

  const camGroup = document.createElement('div');
  camGroup.className = 'tb-lab-pill-group';
  const camButtons = [
    ['overview', 'Общий'],
    ['apparatus', 'Крупно'],
  ].map(([view, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.dataset.labCam = view;
    b.onclick = () => onAction({ type: 'cameraView', view });
    camGroup.append(b);
    return b;
  });

  const scopeToggleBtn = document.createElement('button');
  scopeToggleBtn.type = 'button';
  scopeToggleBtn.className = 'tb-lab-scope-btn';
  scopeToggleBtn.dataset.labScope = 'toggle';
  scopeToggleBtn.textContent = 'Осциллограф';

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'tb-lab-reset';
  resetBtn.textContent = 'Сброс';
  resetBtn.onclick = () => onAction({ type: 'defaults' });

  hud.append(modeGroup, actionGroup, camGroup, scopeToggleBtn, resetBtn);

  // Overlaid crisp oscilloscope widget floating cleanly over the stage corner.
  const scopeFloat = document.createElement('section');
  scopeFloat.className = 'tb-scope-float';
  scopeFloat.hidden = true;
  scopeFloat.setAttribute('aria-label', 'Осциллограф');

  const scopeHead = document.createElement('div');
  scopeHead.className = 'tb-scope-head';
  const scopeTitle = document.createElement('span');
  scopeTitle.className = 'tb-scope-title';
  scopeTitle.textContent = 'Осциллограф';
  const scopePills = document.createElement('span');
  scopePills.className = 'tb-scope-pills';
  const scopeClose = document.createElement('button');
  scopeClose.type = 'button';
  scopeClose.className = 'tb-scope-close';
  scopeClose.textContent = '−';
  scopeClose.setAttribute('aria-label', 'Свернуть осциллограф');
  scopeHead.append(scopeTitle, scopePills, scopeClose);

  const scopeWarn = document.createElement('div');
  scopeWarn.className = 'tb-scope-warn';
  scopeWarn.hidden = true;

  const scopeCanvas = document.createElement('canvas');
  scopeCanvas.className = 'tb-scope-canvas';
  scopeFloat.append(scopeHead, scopeWarn, scopeCanvas);

  // Compact bottom floating bar shown only during 3D Quiz mode.
  const quizBar = document.createElement('div');
  quizBar.className = 'tb-lab-quizbar';
  quizBar.hidden = true;
  quizBar.setAttribute('role', 'region');
  quizBar.setAttribute('aria-label', 'Выбор ответа на вопрос теста');

  const qPrev = document.createElement('button');
  qPrev.type = 'button';
  qPrev.textContent = '←';
  qPrev.setAttribute('aria-label', 'Предыдущий вопрос');
  qPrev.onclick = () => onAction({ type: 'quizNav', delta: -1 });

  const qCount = document.createElement('span');
  qCount.className = 'tb-lab-quiz-count';

  const qNext = document.createElement('button');
  qNext.type = 'button';
  qNext.textContent = '→';
  qNext.setAttribute('aria-label', 'Следующий вопрос');
  qNext.onclick = () => onAction({ type: 'quizNav', delta: 1 });

  const qAnswers = ['А', 'Б', 'В'].map((letter, idx) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tb-lab-quiz-opt';
    b.textContent = letter;
    b.onclick = () => onAction({ type: 'quizAnswer', optIndex: idx });
    return b;
  });

  quizBar.append(qPrev, qCount, qNext, ...qAnswers);
  sceneCol.prepend(hud);
  stage.append(scopeFloat, quizBar);

  let lastActionSig = '';
  let userScopePref = null;
  let lastScopeModel = null;
  let lastScopeParams = null;
  let lastScopeSolved = null;
  const text = (el, v) => {
    if (el.textContent !== v) el.textContent = v;
  };
  const isScopeVisible = () => (userScopePref !== null ? userScopePref : window.innerWidth > 680);
  const toggleScope = () => {
    userScopePref = !isScopeVisible();
    if (lastScopeModel) sync(lastScopeModel, lastScopeParams, lastScopeSolved);
  };
  scopeToggleBtn.onclick = toggleScope;
  scopeClose.onclick = toggleScope;

  function sync(model, params, solved) {
    lastScopeModel = model;
    lastScopeParams = params;
    lastScopeSolved = solved;
    const hasLab = !!model?.lab;
    hud.hidden = !hasLab;
    root.dataset.lab = hasLab ? model.id : '';
    if (!hasLab) {
      quizBar.hidden = true;
      scopeFloat.hidden = true;
      scopeToggleBtn.hidden = true;
      return;
    }

    modeButtons.forEach((b) => {
      b.setAttribute('aria-pressed', String(params.labMode === b.dataset.labMode));
    });

    const defs =
      typeof model.lab.actions === 'function'
        ? model.lab.actions(solved, params)
        : model.lab.actions || [];
    const sig = defs.map((d) => `${d.id}:${d.label}:${!!d.pressed}`).join('|');
    if (sig !== lastActionSig) {
      lastActionSig = sig;
      actionGroup.replaceChildren();
      defs.forEach((def) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = def.label;
        b.dataset.labAct = def.id;
        if (def.pressed !== undefined) b.setAttribute('aria-pressed', String(!!def.pressed));
        b.onclick = () => onAction({ type: 'custom', action: def.id });
        actionGroup.append(b);
      });
    }
    actionGroup.hidden = !defs.length;
    camGroup.hidden = !model.lab.cameraViews;

    const hasScope = typeof model.getScopeOverlay === 'function';
    scopeToggleBtn.hidden = !hasScope;
    const showScope = hasScope && isScopeVisible();
    scopeToggleBtn.setAttribute('aria-pressed', String(showScope));
    scopeFloat.hidden = !showScope;
    if (showScope) {
      const payload = model.getScopeOverlay(solved, params);
      text(scopePills, (payload.summaryPills || []).map((p) => p.text).slice(0, 2).join(' · '));
      scopeWarn.hidden = !payload.warningBanner;
      if (payload.warningBanner) text(scopeWarn, payload.warningBanner);
      payload.draw?.(scopeCanvas);
    }

    const isQuiz = params.labMode === 'quiz' && !!model.lab.questions?.length;
    quizBar.hidden = !isQuiz;
    if (isQuiz) {
      const qs = model.lab.questions;
      const qi = Math.max(0, Math.min(qs.length - 1, params.quizIndex || 0));
      qPrev.disabled = qi <= 0;
      qNext.disabled = qi >= qs.length - 1;
      text(qCount, `Вопрос ${qi + 1}/${qs.length}`);
      qAnswers.forEach((b, idx) => {
        b.hidden = idx >= qs[qi].options.length;
        b.setAttribute('aria-pressed', String((params.quizAnswer ?? -1) === idx));
        b.title = qs[qi].options[idx] || '';
        b.setAttribute('aria-label', `${b.textContent}: ${qs[qi].options[idx] || ''}`);
      });
    }
  }

  return { sync };
}
