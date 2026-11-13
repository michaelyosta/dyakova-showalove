/** Модальный каталог сцен и моделей с фильтрами по предмету, формату, теме и экспортом урока. */

import { attachModalController, parseSafeSvgElement } from './dom-utils.js';

const KIND_FILTERS = [
  { id: 'all', label: 'Все форматы' },
  { id: 'geometry', label: 'Построения' },
  { id: 'simulation', label: 'Симуляции' },
];

export function createCatalogUI({
  root,
  subjects,
  categories,
  models,
  onSelectModel,
  onClearSnaps,
  onExportLesson,
  onImportLesson,
}) {
  const backdrop = root.querySelector('[data-ref="catalog-backdrop"]');
  const subjectsEl = root.querySelector('[data-ref="catalog-subjects"]');
  const kindsEl = root.querySelector('[data-ref="catalog-kinds"]');
  const catsEl = root.querySelector('[data-ref="catalog-cats"]');
  const gridEl = root.querySelector('[data-ref="catalog-grid"]');
  const searchEl = root.querySelector('[data-ref="catalog-search"]');
  const snapsCountEl = root.querySelector('[data-ref="catalog-snaps-info"]');
  const exportBtn = root.querySelector('[data-action="export-lesson"]');
  const importBtn = root.querySelector('[data-action="import-lesson"]');
  const lessonFileEl = root.querySelector('[data-ref="lesson-file"]');
  const clearBtn = root.querySelector('[data-action="clear-snaps"]');
  const closeBtn = root.querySelector('[data-action="close-catalog"]');
  const openBtn = root.querySelector('[data-action="open-catalog"]');

  let activeSubject = 'all';
  let activeKind = 'all';
  let activeCategory = 'all';
  let query = '';
  let currentModelId = null;

  function renderChipRow(container, items, activeId, onPick) {
    if (!container) return;
    container.replaceChildren();
    items.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tb-cat-chip';
      btn.textContent = item.label;
      btn.setAttribute('aria-pressed', String(activeId === item.id));
      btn.onclick = () => onPick(item.id);
      container.append(btn);
    });
  }

  function renderFilters() {
    renderChipRow(
      subjectsEl,
      [{ id: 'all', label: 'Все предметы' }, ...(subjects || [])],
      activeSubject,
      (id) => {
        activeSubject = id;
        if (activeCategory !== 'all') {
          const catObj = categories.find((c) => c.id === activeCategory);
          if (catObj && activeSubject !== 'all' && catObj.subject && catObj.subject !== activeSubject) {
            activeCategory = 'all';
          }
        }
        renderFilters();
        renderCards();
      }
    );

    renderChipRow(kindsEl, KIND_FILTERS, activeKind, (id) => {
      activeKind = id;
      renderFilters();
      renderCards();
    });

    const visibleCats =
      activeSubject === 'all'
        ? categories
        : categories.filter((c) => !c.subject || c.subject === activeSubject);

    renderChipRow(
      catsEl,
      [{ id: 'all', label: 'Все темы' }, ...visibleCats],
      activeCategory,
      (id) => {
        activeCategory = id;
        renderFilters();
        renderCards();
      }
    );
  }

  function renderCards() {
    gridEl.replaceChildren();
    const q = query.trim().toLowerCase();
    const catLabels = Object.fromEntries(categories.map((c) => [c.id, c.label]));
    const filtered = models.filter((m) => {
      const kind = m.kind || 'geometry';
      const subj = m.subject || 'math';
      if (activeSubject !== 'all' && subj !== activeSubject) return false;
      if (activeKind !== 'all' && kind !== activeKind) return false;
      if (activeCategory !== 'all' && m.category !== activeCategory) return false;
      if (!q) return true;
      const hay = `${m.title} ${m.subtitle || ''} ${m.description || ''} ${(m.tags || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });

    if (!filtered.length) {
      const p = document.createElement('p');
      p.className = 'tb-catalog-empty';
      p.textContent = 'Подходящих сцен не найдено';
      gridEl.append(p);
      return;
    }

    filtered.forEach((m) => {
      const kind = m.kind || 'geometry';
      const card = document.createElement('div');
      card.className = 'tb-model-card';
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
      card.dataset.modelId = m.id;
      card.dataset.kind = kind;
      card.setAttribute('aria-pressed', String(m.id === currentModelId));

      const inner = document.createElement('span');
      inner.className = 'tb-model-card-inner';

      const thumb = document.createElement('span');
      thumb.className = 'tb-model-card-thumb';
      thumb.setAttribute('aria-hidden', 'true');
      if (m.previewSvg) {
        const svgEl = parseSafeSvgElement(m.previewSvg);
        if (svgEl) thumb.append(document.importNode(svgEl, true));
      }

      const badges = document.createElement('span');
      badges.className = 'tb-model-card-badges';

      const cat = document.createElement('span');
      cat.className = 'tb-model-card-cat';
      cat.textContent = catLabels[m.category] || m.subtitle || '';

      const kindBadge = document.createElement('span');
      kindBadge.className = 'tb-model-badge';
      kindBadge.dataset.kind = kind;
      kindBadge.textContent = kind === 'simulation' ? 'Симуляция' : 'Построение';

      badges.append(cat, kindBadge);

      const title = document.createElement('span');
      title.className = 'tb-model-card-title';
      title.textContent = m.title;

      const desc = document.createElement('span');
      desc.className = 'tb-model-card-desc';
      desc.textContent = m.description || '';

      inner.append(thumb, badges, title, desc);
      card.append(inner);
      const activateCard = () => {
        close();
        Promise.resolve(onSelectModel(m.id)).catch(() => {});
      };
      card.addEventListener('click', activateCard);
      card.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          activateCard();
        }
      });
      gridEl.append(card);
    });
  }

  function open(modelId, snapsCount) {
    currentModelId = modelId;
    snapsCountEl.textContent = snapsCount ? `В текущем уроке снэпов: ${snapsCount}` : 'Снэпы ещё не созданы';
    clearBtn.disabled = !snapsCount;
    renderFilters();
    renderCards();
    backdrop.hidden = false;
    modalCtl?.onOpened?.();
  }

  function close() {
    if (backdrop.hidden) return;
    backdrop.hidden = true;
    modalCtl?.onClosed?.();
  }

  const modalCtl = attachModalController({
    backdrop,
    closeBtn,
    openerBtn: openBtn,
    initialFocus: () => searchEl || closeBtn,
    onClose: close,
  });
  searchEl.addEventListener('input', () => {
    query = searchEl.value;
    renderCards();
  });
  clearBtn.onclick = () => {
    onClearSnaps();
    snapsCountEl.textContent = 'Снэпы очищены';
    clearBtn.disabled = true;
  };
  exportBtn?.addEventListener('click', async () => {
    const info = await onExportLesson?.();
    if (info) snapsCountEl.textContent = info;
  });
  importBtn?.addEventListener('click', () => {
    if (!lessonFileEl) return;
    lessonFileEl.value = '';
    lessonFileEl.click();
  });
  lessonFileEl?.addEventListener('change', async () => {
    const file = lessonFileEl.files?.[0];
    if (!file) return;
    try {
      const rawText = await file.text();
      const loadedCount = await onImportLesson?.(rawText);
      if (loadedCount == null) return;
      snapsCountEl.textContent = `Урок загружен (${loadedCount} сн.)`;
      clearBtn.disabled = !loadedCount;
      close();
    } catch (err) {
      snapsCountEl.textContent = err?.message || 'Ошибка чтения JSON-файла';
    }
  });

  return { open, close, isOpen: () => !backdrop.hidden };
}
