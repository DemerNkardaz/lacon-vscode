/**
 * Парсинг значений в LACON
 */

import * as path from 'path';
import { numberRegex } from './regex';
import { unescapeString, unwrapQuotes } from './utils';
import { resolveVariables } from './variable-parser';

/**
 * Парсит значение любого типа
 */
export function parseValue(
    val: string,
    vars: Record<string, string>,
    currentDir: string,
    importStack: Set<string>,
    parseInlinePairsFn: Function,
    parseLaconFileFn: Function
): any {
    val = val.trim();
    if (!val) return val;

    const resolvedVal = resolveVariables(val, vars);

    // Обработка @import...
    if (resolvedVal.startsWith('@import...')) {
        const isAssignment = resolvedVal.includes('=');
        const startPos = isAssignment ? resolvedVal.indexOf('=') + 1 : 10;
        const rawPath = resolvedVal.substring(startPos).trim();
        const importPath = unwrapQuotes(rawPath);
        const fullImportPath = path.resolve(currentDir, importPath);
        const imported = parseLaconFileFn(fullImportPath, importStack);
        return { __lacon_spread__: true, value: imported };
    }

    // Обработка @import
    if (resolvedVal.startsWith('@import')) {
        const isAssignment = resolvedVal.includes('=');
        const startPos = isAssignment ? resolvedVal.indexOf('=') + 1 : 7;
        const rawPath = resolvedVal.substring(startPos).trim();
        const importPath = unwrapQuotes(rawPath);
        const fullImportPath = path.resolve(currentDir, importPath);
        return parseLaconFileFn(fullImportPath, importStack);
    }

    // Строка в кавычках
    if (resolvedVal.startsWith('"') && resolvedVal.endsWith('"')) {
        return unescapeString(resolvedVal.slice(1, -1));
    }

    // Булевы значения и auto
    if (resolvedVal === 'true') return true;
    if (resolvedVal === 'false') return false;
    if (resolvedVal === 'auto') return 'auto';

    // Объект
    if (resolvedVal.startsWith('{') && resolvedVal.endsWith('}')) {
        const obj = {};
        parseInlinePairsFn(resolvedVal.slice(1, -1).trim(), obj, vars, false, currentDir, importStack);
        return obj;
    }

    // Массив
    if (resolvedVal.startsWith('[') && resolvedVal.endsWith(']')) {
        const inner = resolvedVal.slice(1, -1).trim();
        if (!inner) return [];
        const items: string[] = [];
        let current = "", depth = 0, inQuotes = false;
        for (let i = 0; i < inner.length; i++) {
            const char = inner[i];
            if (char === '"' && inner[i - 1] !== '\\') inQuotes = !inQuotes;
            if (!inQuotes) {
                if (char === '[' || char === '{') depth++;
                if (char === ']' || char === '}') depth--;
                if (char === ',' && depth === 0) {
                    items.push(current.trim());
                    current = "";
                    continue;
                }
            }
            current += char;
        }
        items.push(current.trim());
        const results: any[] = [];
        for (const item of items) {
            const parsed = parseValue(item, vars, currentDir, importStack, parseInlinePairsFn, parseLaconFileFn);
            if (parsed && typeof parsed === 'object' && parsed.__lacon_spread__) {
                const spreadValue = parsed.value;
                if (Array.isArray(spreadValue)) {
                    results.push(...spreadValue);
                } else if (typeof spreadValue === 'object' && spreadValue !== null) {
                    results.push(...Object.values(spreadValue));
                } else {
                    results.push(spreadValue);
                }
            } else {
                results.push(parsed);
            }
        }
        return results;
    }

    // Число
    if (numberRegex.test(resolvedVal)) return Number(resolvedVal);

    // Строка без кавычек
    return unescapeString(resolvedVal);
}
