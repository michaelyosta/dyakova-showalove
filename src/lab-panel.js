/** Teaching UI for laboratory scene modules. Physics remains in the scene modules. */
import { parseSafeSvgElement } from './dom-utils.js';

export function createLabPanel(root, onAction) {
  const host = document.createElement('section'); host.className = 'tb-lab'; host.hidden = true;
  host.setAttribute('aria-label', 'Управление виртуальной лабораторией');
  root.querySelector('.tb-scene-column').append(host);
  const bar = document.createElement('div'); bar.className = 'tb-lab-modes';
  const modes = [['free', 'Свободная лаборатория'], ['demo', 'Демонстрация'], ['steps', 'По шагам']];
  const modeButtons = modes.map(([mode, title]) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = title;
    b.onclick = () => onAction({ type: 'mode', mode }); bar.append(b); return b;
  });
  const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = 'Сбросить опыт';
  reset.onclick = () => onAction({ type: 'defaults' }); bar.append(reset);
  const actions = document.createElement('div'); actions.className = 'tb-lab-actions';
  const navigation = document.createElement('div'); navigation.className = 'tb-lab-navigation';
  const back = document.createElement('button'); back.type = 'button'; back.textContent = '← Этап';
  const progress = document.createElement('span');
  const next = document.createElement('button'); next.type = 'button'; next.textContent = 'Этап →';
  back.onclick = () => onAction({ type: 'step', delta: -1 }); next.onclick = () => onAction({ type: 'step', delta: 1 });
  navigation.append(back, progress, next);
  const title = document.createElement('strong');
  const explanation = document.createElement('p');
  const notice = document.createElement('p'); notice.className = 'tb-lab-notice';
  const readings = document.createElement('div'); readings.className = 'tb-lab-readings';
  const chart = document.createElement('div'); chart.className = 'tb-lab-scope';
  const footnote = document.createElement('p'); footnote.className = 'tb-lab-footnote';
  const quiz = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = 'Проверить понимание'; quiz.append(summary);
  host.append(bar, actions, navigation, title, explanation, notice, readings, chart, footnote, quiz);
  let schemaId = '', lastSvg = '';
  const text = (el, value) => { if (el.textContent !== value) el.textContent = value; };
  function sync(model, params, solved) {
    host.hidden = !model?.lab;
    root.dataset.lab = model?.lab ? model.id : '';
    if (!model?.lab) return;
    const lab = model.lab;
    if (schemaId !== model.id) {
      schemaId = model.id; lastSvg = ''; quiz.querySelectorAll('fieldset').forEach(e => e.remove()); actions.replaceChildren();
      (lab.actions || []).forEach(action => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = action.label;
        b.onclick = () => onAction({ type: 'custom', action: action.id }); actions.append(b);
      });
      (lab.questions || []).forEach((q, index) => {
        const field = document.createElement('fieldset'); const legend = document.createElement('legend'); legend.textContent = `${index + 1}. ${q.question}`;
        const result = document.createElement('p'); result.setAttribute('role', 'status'); result.hidden = true;
        field.append(legend);
        q.options.forEach((option, answer) => {
          const b = document.createElement('button'); b.type = 'button'; b.textContent = option;
          b.onclick = () => { field.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); result.hidden = false; result.textContent = `${answer === q.answer ? 'Верно.' : 'Попробуйте ещё.'} ${q.explanation}`; };
          field.append(b);
        });
        field.append(result); quiz.append(field);
      });
    }
    modeButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(params.labMode === modes[i][0])));
    navigation.hidden = params.labMode !== 'steps';
    back.disabled = params.lessonStep <= 0; next.disabled = params.lessonStep >= lab.steps.length - 1;
    text(progress, `${params.lessonStep + 1} / ${lab.steps.length}`);
    actions.hidden = params.labMode !== 'free' || !lab.actions?.length;
    const e = lab.explanation(solved, params); text(title, e.title); text(explanation, e.text);
    const note = lab.notice?.(solved, params) || (params.labMode === 'demo' ? 'Опыт выполняется автоматически. «Пауза» останавливает показ; «Пуск» продолжает.' : params.labMode === 'steps' ? 'Остановленный кадр выбранного этапа. Нажимайте «Этап →», чтобы продолжить объяснение.' : 'Задайте положение-цель, затем нажмите «Пуск». Снимок на паузе сохраняет показания выбранного момента.');
    notice.hidden = !note; text(notice, note);
    const values = lab.readings(solved, params);
    if (readings.children.length !== values.length) readings.replaceChildren(...values.map(() => { const d = document.createElement('div'); d.append(document.createElement('span'), document.createElement('b')); return d; }));
    values.forEach(([name, value], i) => { text(readings.children[i].children[0], name); text(readings.children[i].children[1], value); });
    const svg = lab.chart(solved, params);
    if (svg !== lastSvg) { lastSvg = svg; const safe = parseSafeSvgElement(svg); chart.replaceChildren(...(safe ? [document.importNode(safe, true)] : [])); }
    footnote.hidden = !lab.footnote; text(footnote, lab.footnote || '');
  }
  return { sync };
}
