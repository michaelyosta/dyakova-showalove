/** Модальное окно «Мои проекты» для создания, переименования, дублирования и переключения уроков. */

import { attachModalController, parseSafeSvgElement } from './dom-utils.js';

function formatProjectDate(ts) {
  if (!ts) return '';
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return '';
  }
}

function snapCountLabel(n) {
  return `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'снэп' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'снэпа' : 'снэпов'}`;
}

export function createProjectsUI({
  root,
  catalogById,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDuplicateProject,
  onDeleteProject,
  onImportProjectFile,
}) {
  const backdrop = root.querySelector('[data-ref="projects-backdrop"]');
  const closeBtn = root.querySelector('[data-action="close-projects"]');
  const openBtn = root.querySelector('[data-action="open-projects"]');
  const searchEl = root.querySelector('[data-ref="projects-search"]');
  const createInputEl = root.querySelector('[data-ref="project-new-title"]');
  const createBtn = root.querySelector('[data-action="project-create"]');
  const importBtn = root.querySelector('[data-action="project-import-json"]');
  const importFileEl = root.querySelector('[data-ref="project-import-file"]');
  const listEl = root.querySelector('[data-ref="projects-list"]');
  const statusEl = root.querySelector('[data-ref="projects-status"]');

  let projects = [];
  let activeId = null;
  let query = '';
  let editingId = null;
  let confirmDeleteId = null;
  const coverUrls = new Map();

  function clearCoverUrls() {
    for (const u of coverUrls.values()) {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    }
    coverUrls.clear();
  }

  function renderList() {
    if (!listEl) return;
    clearCoverUrls();
    listEl.replaceChildren();
    const q = query.trim().toLowerCase();
    const filtered = projects.filter((p) => {
      if (!q) return true;
      const mdl = p.activeState?.modelId ? catalogById.get(p.activeState.modelId) : null;
      const hay = `${p.title} ${mdl?.title || ''} ${mdl?.shortTitle || ''}`.toLowerCase();
      return hay.includes(q);
    });

    if (!filtered.length) {
      const p = document.createElement('p');
      p.className = 'tb-catalog-empty';
      p.textContent = 'Подходящих проектов не найдено';
      listEl.append(p);
      return;
    }

    filtered.forEach((proj) => {
      const card = document.createElement('div');
      card.className = 'tb-proj-card';
      card.dataset.projectId = proj.id;
      if (proj.id === activeId) card.dataset.active = 'true';

      const thumb = document.createElement('div');
      thumb.className = 'tb-proj-thumb';
      if (proj.coverBlob instanceof Blob) {
        const url = URL.createObjectURL(proj.coverBlob);
        coverUrls.set(proj.id, url);
        const img = document.createElement('img');
        img.src = url;
        img.alt = proj.title;
        thumb.append(img);
      } else {
        const mdl = proj.activeState?.modelId ? catalogById.get(proj.activeState.modelId) : null;
        const svgEl = mdl?.previewSvg ? parseSafeSvgElement(mdl.previewSvg) : null;
        if (svgEl) {
          thumb.append(document.importNode(svgEl, true));
        } else {
          const ico = document.createElement('i');
          ico.dataset.lucide = 'folder-open';
          ico.setAttribute('aria-hidden', 'true');
          thumb.append(ico);
        }
      }

      const body = document.createElement('div');
      body.className = 'tb-proj-body';

      if (editingId === proj.id) {
        const editRow = document.createElement('form');
        editRow.className = 'tb-proj-rename-form';
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.value = proj.title;
        inp.className = 'tb-proj-rename-input';
        inp.setAttribute('aria-label', 'Новое название проекта');
        const saveBtn = document.createElement('button');
        saveBtn.type = 'submit';
        saveBtn.innerHTML = '<i data-lucide="check" aria-hidden="true"></i>';
        saveBtn.setAttribute('aria-label', 'Сохранить название');
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.innerHTML = '<i data-lucide="x" aria-hidden="true"></i>';
        cancelBtn.setAttribute('aria-label', 'Отменить переименование');
        cancelBtn.onclick = () => {
          editingId = null;
          renderList();
        };
        editRow.onsubmit = async (ev) => {
          ev.preventDefault();
          const nextTitle = inp.value.trim();
          editingId = null;
          if (nextTitle) await onRenameProject(proj.id, nextTitle);
          else renderList();
        };
        editRow.append(inp, saveBtn, cancelBtn);
        body.append(editRow);
        setTimeout(() => {
          inp.focus();
          inp.select();
        }, 0);
      } else {
        const openTrigger = document.createElement('button');
        openTrigger.type = 'button';
        openTrigger.className = 'tb-proj-open';

        const titleRow = document.createElement('span');
        titleRow.className = 'tb-proj-title-row';
        const title = document.createElement('strong');
        title.textContent = proj.title;
        titleRow.append(title);
        if (proj.id === activeId) {
          const badge = document.createElement('span');
          badge.className = 'tb-proj-badge';
          badge.textContent = 'Активный';
          titleRow.append(badge);
        }

        const mdl = proj.activeState?.modelId ? catalogById.get(proj.activeState.modelId) : null;
        const count = Array.isArray(proj.snapIds) ? proj.snapIds.length : 0;
        const meta = document.createElement('span');
        meta.className = 'tb-proj-meta';
        meta.textContent = [
          snapCountLabel(count),
          mdl ? mdl.shortTitle || mdl.title : null,
          formatProjectDate(proj.updatedAt),
        ]
          .filter(Boolean)
          .join(' · ');

        openTrigger.append(titleRow, meta);
        openTrigger.onclick = async () => {
          close();
          if (proj.id !== activeId) await onSelectProject(proj.id);
        };
        body.append(openTrigger);
      }

      const actions = document.createElement('div');
      actions.className = 'tb-proj-actions';

      const renameBtn = document.createElement('button');
      renameBtn.type = 'button';
      renameBtn.title = 'Переименовать';
      renameBtn.setAttribute('aria-label', `Переименовать ${proj.title}`);
      renameBtn.innerHTML = '<i data-lucide="pencil" aria-hidden="true"></i>';
      renameBtn.onclick = () => {
        confirmDeleteId = null;
        editingId = proj.id;
        renderList();
      };

      const dupBtn = document.createElement('button');
      dupBtn.type = 'button';
      dupBtn.title = 'Дублировать как шаблон';
      dupBtn.setAttribute('aria-label', `Дублировать ${proj.title}`);
      dupBtn.innerHTML = '<i data-lucide="copy" aria-hidden="true"></i>';
      dupBtn.onclick = async () => {
        confirmDeleteId = null;
        await onDuplicateProject(proj.id);
      };

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      if (confirmDeleteId === proj.id) {
        delBtn.className = 'tb-proj-del-confirm';
        delBtn.textContent = 'Удалить?';
        delBtn.onclick = async () => {
          confirmDeleteId = null;
          await onDeleteProject(proj.id);
        };
      } else {
        delBtn.title = 'Удалить проект';
        delBtn.setAttribute('aria-label', `Удалить ${proj.title}`);
        delBtn.innerHTML = '<i data-lucide="trash-2" aria-hidden="true"></i>';
        delBtn.onclick = async () => {
          const count = Array.isArray(proj.snapIds) ? proj.snapIds.length : 0;
          if (count > 0) {
            confirmDeleteId = proj.id;
            renderList();
          } else {
            await onDeleteProject(proj.id);
          }
        };
      }

      actions.append(renameBtn, dupBtn, delBtn);
      card.append(thumb, body, actions);
      listEl.append(card);
    });

    globalThis.lucide?.createIcons({ attrs: { width: 16, height: 16, 'stroke-width': 1.5 }, root: listEl });
  }

  function updateData(nextProjects, nextActiveId, message = '') {
    projects = nextProjects || [];
    activeId = nextActiveId || null;
    if (statusEl && message) statusEl.textContent = message;
    else if (statusEl) statusEl.textContent = `Проектов на устройстве: ${projects.length}`;
    if (!backdrop.hidden) renderList();
  }

  function open(nextProjects, nextActiveId) {
    editingId = null;
    confirmDeleteId = null;
    backdrop.hidden = false;
    updateData(nextProjects, nextActiveId);
    modalCtl?.onOpened?.();
  }

  function close() {
    if (backdrop.hidden) return;
    backdrop.hidden = true;
    editingId = null;
    confirmDeleteId = null;
    clearCoverUrls();
    modalCtl?.onClosed?.();
  }

  const modalCtl = attachModalController({
    backdrop,
    closeBtn,
    openerBtn: openBtn,
    initialFocus: () => searchEl || closeBtn,
    onEscape: () => {
      if (editingId) {
        editingId = null;
        renderList();
        return true;
      }
      if (confirmDeleteId) {
        confirmDeleteId = null;
        renderList();
        return true;
      }
      return false;
    },
    onClose: close,
  });
  searchEl?.addEventListener('input', () => {
    query = searchEl.value;
    renderList();
  });

  async function handleCreate() {
    const raw = createInputEl?.value.trim() || '';
    const title = raw || `Урок ${projects.length + 1}`;
    if (createInputEl) createInputEl.value = '';
    await onCreateProject(title);
    close();
  }

  createBtn?.addEventListener('click', handleCreate);
  createInputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    }
  });

  importBtn?.addEventListener('click', () => {
    if (!importFileEl) return;
    importFileEl.value = '';
    importFileEl.click();
  });
  importFileEl?.addEventListener('change', async () => {
    const file = importFileEl.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = await onImportProjectFile(text, file.name);
      if (imported !== false) close();
    } catch (err) {
      if (statusEl) statusEl.textContent = err?.message || 'Ошибка чтения файла';
    }
  });

  return {
    open,
    close,
    updateData,
    isOpen: () => !backdrop.hidden,
  };
}
