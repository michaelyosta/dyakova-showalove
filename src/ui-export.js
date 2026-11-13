/** Модальное окно экспорта снэпов для учеников: HD PNG (+ Поделиться) и многостраничный PDF-конспект. */

import { attachModalController } from './dom-utils.js';
import { canShareFiles } from './snap-exporter.js';

export function createExportUI({
  root,
  initialPrefs,
  onPrefsChange,
  onRenderPreview,
  onExportPng,
  onExportPdf,
}) {
  const backdrop = root.querySelector('[data-ref="export-backdrop"]');
  const closeBtn = root.querySelector('[data-action="close-export"]');
  const snapSelect = root.querySelector('[data-ref="export-snap-select"]');
  const themeBtns = root.querySelectorAll('[data-export-theme]');
  const gridCb = root.querySelector('[data-ref="exp-grid"]');
  const diagramCb = root.querySelector('[data-ref="exp-diagram"]');
  const calcCb = root.querySelector('[data-ref="exp-calc"]');
  const notesCb = root.querySelector('[data-ref="exp-notes"]');
  const previewImg = root.querySelector('[data-ref="export-preview-img"]');
  const previewMeta = root.querySelector('[data-ref="export-preview-meta"]');
  const pngSaveBtn = root.querySelector('[data-action="export-png"]');
  const pngShareBtn = root.querySelector('[data-action="share-png"]');
  const pdfSaveBtn = root.querySelector('[data-action="export-pdf"]');
  const pdfSaveLabel = root.querySelector('[data-ref="export-pdf-label"]');
  const pdfShareBtn = root.querySelector('[data-action="share-pdf"]');
  const statusEl = root.querySelector('[data-ref="export-status"]');

  let prefs = { ...initialPrefs };
  let snaps = [];
  let selectedSnapId = null;
  let previewSeq = 0;
  let previewBlobUrl = null;
  let busy = false;

  function revokePreviewUrl() {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      previewBlobUrl = null;
    }
  }

  function clearPreviewImage() {
    if (previewImg) {
      previewImg.onload = null;
      previewImg.onerror = null;
      previewImg.hidden = true;
      previewImg.removeAttribute('src');
    }
    revokePreviewUrl();
  }

  if (previewImg) previewImg.hidden = true;

  const supportsPngShare = canShareFiles('image/png');
  const supportsPdfShare = canShareFiles('application/pdf');
  if (pngShareBtn) pngShareBtn.hidden = !supportsPngShare;
  if (pdfShareBtn) pdfShareBtn.hidden = !supportsPdfShare;

  function applyPrefsToInputs() {
    themeBtns.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.exportTheme === prefs.theme));
    });
    if (gridCb) gridCb.checked = prefs.includeGrid !== false;
    if (diagramCb) diagramCb.checked = prefs.includeDiagram !== false;
    if (calcCb) calcCb.checked = prefs.includeCalc !== false;
    if (notesCb) notesCb.checked = prefs.includeNotes !== false;
  }

  function setBusy(state, msg = '') {
    busy = state;
    if (closeBtn) closeBtn.disabled = state;
    [pngSaveBtn, pngShareBtn, pdfSaveBtn, pdfShareBtn].forEach((b) => {
      if (b) b.disabled = state || !snaps.length;
    });
    if (statusEl) statusEl.textContent = msg;
  }

  async function refreshPreview() {
    const targetSnap = snaps.find((s) => s.id === selectedSnapId) || snaps[0];
    if (!targetSnap) {
      clearPreviewImage();
      if (previewMeta) previewMeta.textContent = 'Создайте хотя бы один снэп для экспорта';
      setBusy(false, 'В проекте пока нет снэпов');
      return;
    }

    const mySeq = ++previewSeq;
    if (previewImg) previewImg.hidden = true;
    if (previewMeta) previewMeta.textContent = 'Подготовка предпросмотра';
    try {
      const res = await onRenderPreview(targetSnap, prefs);
      if (mySeq !== previewSeq || !res) {
        if (res?.blobUrl) URL.revokeObjectURL(res.blobUrl);
        return;
      }
      clearPreviewImage();
      const nextSrc = res.blobUrl || res.dataUrl || '';
      if (res.blobUrl) previewBlobUrl = res.blobUrl;
      if (previewImg && nextSrc) {
        previewImg.hidden = true;
        previewImg.onload = () => {
          if (mySeq === previewSeq) previewImg.hidden = false;
        };
        previewImg.onerror = () => {
          if (mySeq === previewSeq) previewImg.hidden = true;
        };
        previewImg.src = nextSrc;
        if (previewImg.complete && previewImg.naturalWidth > 0) {
          previewImg.hidden = false;
        }
      }
      if (previewMeta) {
        previewMeta.textContent = `${targetSnap.name} · итоговый экспорт ~${res.fullWidth}×${res.fullHeight} px`;
      }
      setBusy(false, '');
    } catch (err) {
      if (mySeq === previewSeq) {
        clearPreviewImage();
        if (previewMeta) previewMeta.textContent = 'Не удалось подготовить предпросмотр';
        setBusy(false, err?.message || 'Ошибка предпросмотра');
      }
    }
  }

  function updatePrefs(patch) {
    prefs = { ...prefs, ...patch };
    applyPrefsToInputs();
    onPrefsChange?.(prefs);
    if (!backdrop.hidden) refreshPreview();
  }

  function open({ projectTitle, snaps: list, activeSnapId }) {
    snaps = list || [];
    selectedSnapId = activeSnapId && snaps.some((s) => s.id === activeSnapId)
      ? activeSnapId
      : snaps[snaps.length - 1]?.id || null;

    if (snapSelect) {
      snapSelect.replaceChildren();
      snaps.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        snapSelect.append(opt);
      });
      if (selectedSnapId) snapSelect.value = selectedSnapId;
      snapSelect.disabled = !snaps.length;
    }

    const subtitleEl = root.querySelector('[data-ref="export-project-title"]');
    if (subtitleEl) subtitleEl.textContent = projectTitle || 'Текущий проект';
    if (pdfSaveLabel) {
      pdfSaveLabel.textContent = snaps.length > 1 ? `Скачать PDF (${snaps.length} стр.)` : 'Скачать PDF';
    }

    applyPrefsToInputs();
    if (previewImg) previewImg.hidden = true;
    backdrop.hidden = false;
    setBusy(false, '');
    modalCtl?.onOpened?.();
    refreshPreview();
  }

  function close() {
    if (busy || backdrop.hidden) return;
    backdrop.hidden = true;
    previewSeq++;
    clearPreviewImage();
    modalCtl?.onClosed?.();
  }

  const modalCtl = attachModalController({
    backdrop,
    closeBtn,
    openerBtn: root.querySelector('[data-action="open-export"]'),
    initialFocus: () => (snapSelect && !snapSelect.disabled ? snapSelect : themeBtns[0] || closeBtn),
    canClose: () => !busy,
    onClose: close,
  });

  snapSelect?.addEventListener('change', () => {
    selectedSnapId = snapSelect.value;
    refreshPreview();
  });

  themeBtns.forEach((btn) => {
    btn.addEventListener('click', () => updatePrefs({ theme: btn.dataset.exportTheme }));
  });
  gridCb?.addEventListener('change', () => updatePrefs({ includeGrid: gridCb.checked }));
  diagramCb?.addEventListener('change', () => updatePrefs({ includeDiagram: diagramCb.checked }));
  calcCb?.addEventListener('change', () => updatePrefs({ includeCalc: calcCb.checked }));
  notesCb?.addEventListener('change', () => updatePrefs({ includeNotes: notesCb.checked }));

  async function runAction(fn, waitMsg, doneMsg) {
    const targetSnap = snaps.find((s) => s.id === selectedSnapId) || snaps[0];
    if (!targetSnap || busy) return;
    setBusy(true, waitMsg);
    try {
      const outcome = await fn(targetSnap, prefs, (txt) => {
        if (statusEl) statusEl.textContent = txt;
      });
      setBusy(false, outcome === 'shared' ? 'Отправлено' : doneMsg);
    } catch (err) {
      if (err?.name === 'AbortError') {
        setBusy(false, 'Отправка отменена');
      } else {
        setBusy(false, err?.message || 'Ошибка при экспорте');
      }
    }
  }

  pngSaveBtn?.addEventListener('click', () =>
    runAction((s, pr) => onExportPng(s, pr, false), 'Рендер HD PNG', 'PNG сохранён')
  );
  pngShareBtn?.addEventListener('click', () =>
    runAction((s, pr) => onExportPng(s, pr, true), 'Подготовка PNG', 'PNG отправлен')
  );
  pdfSaveBtn?.addEventListener('click', () =>
    runAction((_, pr, prog) => onExportPdf(pr, false, prog), 'Сборка PDF-конспекта', 'PDF сохранён')
  );
  pdfShareBtn?.addEventListener('click', () =>
    runAction((_, pr, prog) => onExportPdf(pr, true, prog), 'Сборка PDF', 'PDF отправлен')
  );

  return {
    open,
    close,
    setPrefs: (next) => {
      prefs = { ...prefs, ...next };
      applyPrefsToInputs();
    },
    isOpen: () => !backdrop.hidden,
  };
}
