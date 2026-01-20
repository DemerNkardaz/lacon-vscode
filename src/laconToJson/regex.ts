/**
 * Регулярные выражения для парсера LACON
 */

// Экспорт
export const exportRegex = /^@export\s+(.+)$/;
export const exportMultilineRegex = /^@export\s*=?\s*(@?\()\s*$/;
export const exportArrayRegex = /^@export\s*=?\s*\[\s*$/;
export const exportBlockRegex = /^@export\s*=?\s*\{\s*$/;

// Переменные
export const varRegex = /^\s*(?<!\\)\$([\p{L}\d._-]+)\s*=?\s*(.+)$/u;

// Блоки
export const blockStartRegex = /^\s*([\p{L}\d._-]+)\s*(?:>\s*([\p{L}\d._-]+)\s*)?=?\s*\{\s*$/u;

// Мультиключи
export const multiKeyRegex = /^\s*\[([\p{L}\d\s,.*_-]+)\]\s*=?\s*(.+)$/u;

// Многострочные значения
export const multilineStartRegex = /^\s*([\p{L}\d._-]+)\s*=?\s*(@?\()\s*$/u;

// Массивы
export const arrayStartRegex = /^\s*([\p{L}\d._-]+)\s*=?\s*\[\s*$/u;

// Импорт
export const importRegex = /^@import\s+(=)?\s*(?:"([^"]+)"|([^\s"{}|[\]]+))/;

// Поиск ключей в инлайн-парах
export const findKeysRegex = /(?:^|\s+)([\p{L}\d._-]+|\[[\p{L}\d\s,.*_-]+\]|@import(?:\.\.\.)?)\s*=/gu;

// Числа
export const numberRegex = /^-?\d+(\.\d+)?$/;
