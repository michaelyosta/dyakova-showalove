/** Ленивый загрузчик сцен «Доски учителя» на базе метаиндекса catalog-index.js. */

import {
  SUBJECTS,
  CATEGORIES,
  SCENE_INDEX,
  DEFAULT_SCENE_ID,
  CATALOG_BY_ID,
} from './catalog-index.js';

export { SUBJECTS, CATEGORIES, SCENE_INDEX, DEFAULT_SCENE_ID, CATALOG_BY_ID };
export const DEFAULT_MODEL_ID = DEFAULT_SCENE_ID;

const loadedModules = new Map();
const loadPromises = new Map();

/** Метаданные сцены из лёгкого индекса (без ожидания импорта 3D-модуля). */
export function getSceneEntry(id) {
  return CATALOG_BY_ID.get(id) || null;
}

/** Возвращает уже загруженный модуль сцены или null. */
export function getLoadedScene(id) {
  return loadedModules.get(id) || null;
}

/** Асинхронно загружает модуль сцены по ID и кеширует его. */
export async function loadSceneModule(id) {
  const targetId = CATALOG_BY_ID.has(id) ? id : DEFAULT_SCENE_ID;
  if (loadedModules.has(targetId)) return loadedModules.get(targetId);
  if (loadPromises.has(targetId)) return loadPromises.get(targetId);

  const entry = CATALOG_BY_ID.get(targetId);
  const promise = import(entry.module)
    .then((mod) => {
      const def = mod.default;
      const normalized = {
        ...def,
        kind: def.kind || entry.kind || 'geometry',
        subject: def.subject || entry.subject || 'math',
        category: def.category || entry.category,
        previewSvg: def.previewSvg || entry.previewSvg,
      };
      loadedModules.set(targetId, normalized);
      loadPromises.delete(targetId);
      return normalized;
    })
    .catch((err) => {
      loadPromises.delete(targetId);
      throw err;
    });

  loadPromises.set(targetId, promise);
  return promise;
}
