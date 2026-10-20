// Типизированные ошибки загрузчика модулей (см. STAGE1_SPEC.md §6).
export type CoreErrorCode =
  | 'NETWORK'        // не удалось выполнить fetch
  | 'NOT_FOUND'      // 404: файл модуля отсутствует
  | 'INVALID_JSON'   // файл не является корректным JSON
  | 'INVALID_SCHEMA' // JSON прочитан, но не проходит схему
  | 'INCOMPATIBLE'   // apiVersion/minCoreVersion несовместимы с ядром
  | 'DUPLICATE_ID';  // id в реестре не совпадает с id манифеста / дубликаты

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

/** Русский текст ошибки для UI. */
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
      return 'Модуль несовместим с этой версией ядра.';
    case 'DUPLICATE_ID':
      return 'Ошибка в реестре: идентификатор модуля повторяется или не совпадает с манифестом.';
  }
}
