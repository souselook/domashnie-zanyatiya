// Конфигурация ядра приложения «Домашние занятия».
export const CORE_SUPPORTED_API = 1; // поддерживаемый мажор API модулей
export const CORE_VERSION = '1.0.0';  // версия ядра (semver), сравнивается с minCoreVersion
export const MODULES_BASE = import.meta.env.BASE_URL + 'modules/';

/** Жёсткое правило этапа 2: zip-модуль обязан содержать ровно 12 уроков. */
export const REQUIRED_LESSON_COUNT = 12;
