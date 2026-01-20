/**
 * Обработка импортов и экспортов в парсере LACON
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Парсит файл LACON и возвращает результат
 */
export function parseLaconFile(
    filePath: string,
    importStack: Set<string> = new Set(),
    laconToJsonInternalFn: Function
): any {
    const absolutePath = path.resolve(filePath);

    if (importStack.has(absolutePath)) {
        throw new Error(`Circular import detected: ${absolutePath}`);
    }

    if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found: ${absolutePath}`);
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    importStack.add(absolutePath);
    const result = laconToJsonInternalFn(content, path.dirname(absolutePath), importStack);
    importStack.delete(absolutePath);

    return result;
}

/**
 * Обрабатывает директиву @import
 */
export function processImportDirective(
    trimmed: string,
    variableRegistry: Record<string, string>,
    currentDir: string,
    importStack: Set<string>,
    currentScope: any,
    isBlockMode: boolean,
    isExportBlock: boolean,
    exportValue: any,
    blockKey: string,
    resolveVariablesFn: Function,
    parseLaconFileFn: Function
): boolean {
    const resolvedImportLine = resolveVariablesFn(trimmed, variableRegistry);
    const match = resolvedImportLine.match(/^@import\s+(=)?\s*(?:"([^"]+)"|([^\s"{}|[\]]+))/);

    if (match) {
        const importPath = match[2] || match[3];
        const fullImportPath = path.resolve(currentDir, importPath);
        const importedData = parseLaconFileFn(fullImportPath, importStack);

        if (isBlockMode) {
            const target = isExportBlock ? exportValue : (currentScope[blockKey] || {});
            Object.assign(target, importedData);
            if (!isExportBlock) currentScope[blockKey] = target;
        } else {
            Object.assign(currentScope, importedData);
        }
        return true;
    }
    return false;
}

/**
 * Обрабатывает экспорт значения
 */
export function processExportValue(
    trimmed: string,
    variableRegistry: Record<string, string>,
    currentDir: string,
    importStack: Set<string>,
    exportRegex: RegExp,
    resolveVariablesFn: Function,
    parseValueFn: Function
): any {
    const match = trimmed.match(exportRegex);
    if (match) {
        const value = match[1].trim();
        return parseValueFn(resolveVariablesFn(value, variableRegistry), variableRegistry, currentDir, importStack);
    }
    return undefined;
}
