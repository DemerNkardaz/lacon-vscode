/**
 * Точка входа для модульного парсера LACON
 */

import * as path from 'path';
import { laconToJsonInternal } from './core-parser';
import { parseValue } from './value-parser';
import { parseInlinePairs, processComplexLine } from './inline-parser';
import { parseLaconFile as parseLaconFileImport } from './import-parser';
import { resolveVariables, assignMultiValues } from './variable-parser';
import { appendValue } from './utils';
import { exportRegex } from './regex';
import { preprocessLacon } from './preprocessor';

/**
 * Конвертирует текст LACON в JSON-строку
 */
export function laconToJson(text: string, sourcePath?: string): string {
    const currentDir = sourcePath ? path.dirname(sourcePath) : process.cwd();
    // Препроцессинг: раскрываем <emit> и обрабатываем функции @f
    const preprocessed = preprocessLacon(text);
    const obj = laconToJsonInternalWrapper(preprocessed, currentDir, new Set());
    return JSON.stringify(obj, null, 2);
}

/**
 * Парсит файл LACON и возвращает объект
 */
export function parseLaconFile(filePath: string, importStack: Set<string> = new Set()): any {
    return parseLaconFileImport(filePath, importStack, laconToJsonInternalWrapper);
}

/**
 * Обёртка для laconToJsonInternal с инжекцией зависимостей
 */
function laconToJsonInternalWrapper(
    text: string,
    currentDir: string,
    importStack: Set<string>
): any {
    // Препроцессинг уже выполнен на верхнем уровне, здесь просто парсим
    return laconToJsonInternal(
        text,
        currentDir,
        importStack,
        parseValueWrapper,
        parseInlinePairsWrapper,
        parseLaconFileWrapper,
        resolveVariables,
        appendValueWrapper,
        exportRegex
    );
}

/**
 * Обёртка для parseValue
 */
function parseValueWrapper(
    val: string,
    vars: Record<string, string>,
    currentDir: string,
    importStack: Set<string>
): any {
    return parseValue(
        val,
        vars,
        currentDir,
        importStack,
        parseInlinePairsWrapper,
        parseLaconFileWrapper
    );
}

/**
 * Обёртка для parseInlinePairs
 */
function parseInlinePairsWrapper(
    text: string,
    target: any,
    vars: Record<string, string>,
    overwrite: boolean,
    currentDir: string,
    importStack: Set<string>
): void {
    parseInlinePairs(
        text,
        target,
        vars,
        overwrite,
        currentDir,
        importStack,
        parseValueWrapper
    );
}

/**
 * Обёртка для parseLaconFile
 */
function parseLaconFileWrapper(
    filePath: string,
    importStack: Set<string>
): any {
    return parseLaconFileImport(
        filePath,
        importStack,
        laconToJsonInternalWrapper
    );
}

/**
 * Обёртка для appendValue
 */
function appendValueWrapper(
    target: any,
    key: string,
    value: string,
    vars: Record<string, string>,
    currentDir: string,
    importStack: Set<string>,
    parseValueFn: Function
): void {
    appendValue(
        target,
        key,
        value,
        vars,
        currentDir,
        importStack,
        parseValueFn
    );
}
