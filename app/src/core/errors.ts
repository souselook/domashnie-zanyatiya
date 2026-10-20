// Типизированные ошибки загрузчика модулей (см. STAGE1_SPEC.md §6 + требование C этапа 2).
export type CoreErrorCode =
  | 'NETWORK'        // не удалось выполнить fetch
  | 'NOT_FOUND'      // 404: файл модуля отсутствует
  | 'INVALID_JSON'   // файл не является корректным JSON
  | 'INVALID_SCHEMA' // JSON прочитан, но не проходит схему
  | 'INCOMPATIBLE'   // apiVersion/minCoreVersion несовместимы с ядром
  | 'DUPLICATE_ID'   // id в реестре не совпадает с id манифеста / дубликаты
  // ── ошибки загрузки zip-модуля (человеческие тексты — без стектрейсов) ──
  | 'ZIP_INVALID'            // архив повреждён / это не zip
  | 'ZIP_NO_MANIFEST'        // в архиве нет module.json
  | 'ZIP_MULTI_MANIFEST'     // module.json больше одного
  | 'ZIP_LESSON_COUNT'       // уроков не 12
  | 'ZIP_REFLECTION'         // нет reflection или она не последняя
  | 'ZIP_MODULE_MISMATCH'    // lesson.moduleId ≠ manifest.id
  | 'ZIP_EMPTY';             // архив пуст

export interface CoreError {
  code: CoreErrorCode;
  /** Человекочитаемое сообщение на русском для ErrorPanel. */
  message: string;
  /** Техническая деталь (путь, поле схемы и т.п.) — показывается мелким шрифтом. */
  detail?: string;
}

export type LoadResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CoreError };

export function coreError(code: CoreErrorCode, message: string, detail?: string): LoadResult<never> {
  return { ok: false, error: { code, message, detail } };
}

/** Русский текст ошибки для UI. Никаких «Error: 400» и стектрейсов. */
export function describeError(e: CoreError): string {
  switch (e.code) {
    case 'NETWORK':
      return 'Не удалось загрузить файлы модуля. Проверьте подключение или запустите приложение локально.';
    case 'NOT_FOUND':
      return 'Файл модуля не найден. Убедитесь, что папка модуля лежит в /modules/ и путь в реестре верный.';
    case 'INVALID_JSON':
      return 'Файл модуля повреждён: это не корректный JSON.';
    case 'INVALID_SCHEMA':
      return 'Файл модуля не соответствует формату. Возможно, опечатка в схеме или урок использует неизвестный тип шага.';
    case 'INCOMPATIBLE':
      return 'Модуль создан для более новой версии ядра. Обновите приложение.';
    case 'DUPLICATE_ID':
      return 'Ошибка в реестре: идентификатор модуля повторяется или не совпадает с манифестом.';
    case 'ZIP_INVALID':
      return 'Архив повреждён или это не ZIP-файл. Скачайте модуль заново.';
    case 'ZIP_NO_MANIFEST':
      return 'В архиве нет module.json. Проверьте структуру пакета модуля.';
    case 'ZIP_MULTI_MANIFEST':
      return 'В архиве больше одного module.json. Модуль должен содержать ровно один манифест.';
    case 'ZIP_LESSON_COUNT':
      return e.message; // «Уроков должно быть ровно 12, найдено N»
    case 'ZIP_REFLECTION':
      return e.message; // «В уроке <id> нет reflection или она не последняя»
    case 'ZIP_MODULE_MISMATCH':
      return e.message; // mismatch moduleId
    case 'ZIP_EMPTY':
      return 'Архив пуст.';
  }
}
