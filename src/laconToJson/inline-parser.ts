/**
 * Парсинг инлайн-пар ключ-значение
 */

import { findKeysRegex } from './regex';
import { ensureObject, isBalanced } from './utils';
import { assignMultiValues } from './variable-parser';

/**
 * Парсит инлайн-пары вида key=value или key value
 */
export function parseInlinePairs(
    text: string,
    target: any,
    vars: Record<string, string>,
    overwrite: boolean,
    currentDir: string,
    importStack: Set<string>,
    parseValueFn: Function
) {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    // Обработка @import
    if (trimmedText.startsWith('@import')) {
        const imported = parseValueFn(trimmedText, vars, currentDir, importStack);
        if (imported && typeof imported === 'object' && imported.__lacon_spread__) {
            Object.assign(target, imported.value);
        } else if (typeof imported === 'object' && imported !== null) {
            Object.assign(target, imported);
        }
        return;
    }

    // Пустой объект или массив
    if (trimmedText.endsWith('{}')) {
        const key = trimmedText.replace(/=?\s*\{\}/, '').trim();
        target[key] = {};
        return;
    }
    if (trimmedText.endsWith('[]')) {
        const key = trimmedText.replace(/=?\s*\[\]/, '').trim();
        target[key] = [];
        return;
    }

    // Обработка выражений с =
    if (trimmedText.includes('=')) {
        const keyPositions: any[] = [];
        let m;
        while ((m = findKeysRegex.exec(trimmedText)) !== null) {
            const potentialKey = m[1];
            const keyStart = m.index + m[0].indexOf(potentialKey);

            if (isBalanced(trimmedText.substring(0, keyStart))) {
                keyPositions.push({
                    key: potentialKey.replace(/^\[|\]$/g, ''),
                    start: keyStart,
                    valueStart: m.index + m[0].length,
                    isMulti: potentialKey.startsWith('['),
                    isImport: potentialKey.startsWith('@import')
                });
            }
        }

        if (keyPositions.length > 0) {
            const firstKeyStart = keyPositions[0].start;
            const prefix = trimmedText.substring(0, firstKeyStart).trim();

            let currentTarget = target;
            if (prefix) {
                ensureObject(target, prefix);
                currentTarget = target[prefix];
            }

            for (let i = 0; i < keyPositions.length; i++) {
                const cur = keyPositions[i];
                const next = keyPositions[i + 1];
                let rawVal = next ? trimmedText.substring(cur.valueStart, next.start) : trimmedText.substring(cur.valueStart);
                rawVal = rawVal.trim();

                if (cur.isImport) {
                    const fullCmd = (cur.isMulti ? "[" + cur.key + "]" : cur.key) + "=" + rawVal;
                    const imported = parseValueFn(fullCmd, vars, currentDir, importStack);
                    if (imported?.__lacon_spread__) {
                        Object.assign(currentTarget, imported.value);
                    } else {
                        Object.assign(currentTarget, imported);
                    }
                } else if (cur.isMulti) {
                    assignMultiValues(
                        currentTarget,
                        cur.key.split(',').map((k: any) => k.trim()),
                        rawVal,
                        vars,
                        currentDir,
                        importStack,
                        parseValueFn
                    );
                } else {
                    const parsed = parseValueFn(rawVal, vars, currentDir, importStack);
                    if (parsed && typeof parsed === 'object' && parsed.__lacon_spread__) {
                        if (typeof parsed.value === 'object' && !Array.isArray(parsed.value)) {
                            Object.assign(currentTarget, parsed.value);
                        } else {
                            currentTarget[cur.key] = parsed.value;
                        }
                    } else {
                        currentTarget[cur.key] = parsed;
                    }
                }
            }
            return;
        }
    }

    // Обработка ключ без значения или ключ + значение через пробел
    const firstSpaceIndex = trimmedText.search(/\s/);
    if (firstSpaceIndex === -1) {
        if (!overwrite && typeof target[trimmedText] === 'object' && target[trimmedText] !== null) return;
        target[trimmedText] = true;
    } else {
        const key = trimmedText.substring(0, firstSpaceIndex);
        const remaining = trimmedText.substring(firstSpaceIndex).trim();

        // Проверяем, является ли это мультиключом [a, b]=value или содержит =
        const isMultiKeyAssignment = remaining.startsWith('[') && remaining.includes(']=');
        const hasAssignment = remaining.includes('=') && !remaining.startsWith('"');
        
        if ((hasAssignment || isMultiKeyAssignment) && !remaining.match(/^\[[\s\S]*\]$/)) {
            ensureObject(target, key);
            parseInlinePairs(remaining, target[key], vars, overwrite, currentDir, importStack, parseValueFn);
        } else {
            const parsed = parseValueFn(remaining, vars, currentDir, importStack);
            if (parsed && typeof parsed === 'object' && parsed.__lacon_spread__) {
                target[key] = parsed.value;
            } else {
                target[key] = parsed;
            }
        }
    }
}

/**
 * Обрабатывает сложную строку с навигацией (>) или добавлением (+)
 */
export function processComplexLine(
    line: string,
    scope: any,
    vars: Record<string, string>,
    currentDir: string,
    importStack: Set<string>,
    parseValueFn: Function,
    appendValueFn: Function
) {
    // Поиск оператора +
    let plusIndex = -1;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"' && line[i - 1] !== '\\') inQuotes = !inQuotes;
        if (!inQuotes && line[i] === '+') {
            const prefix = line.substring(0, i).trim();
            if (!prefix.includes(' ') || line[i - 1] === ' ' || line[i + 1] === ' ') {
                plusIndex = i;
                break;
            }
        }
    }

    if (plusIndex !== -1) {
        const keyPath = line.substring(0, plusIndex).trim();
        const valueToAppend = line.substring(plusIndex + 1).trim();
        if (keyPath.includes('>')) {
            const pathParts = keyPath.split('>').map(p => p.trim());
            let current = scope;
            for (let i = 0; i < pathParts.length - 1; i++) {
                ensureObject(current, pathParts[i]);
                current = current[pathParts[i]];
            }
            appendValueFn(current, pathParts[pathParts.length - 1], valueToAppend, vars, currentDir, importStack, parseValueFn);
        } else {
            appendValueFn(scope, keyPath, valueToAppend, vars, currentDir, importStack, parseValueFn);
        }
        return;
    }

    // Обработка навигации >
    if (line.includes('>')) {
        const parts = line.split('>').map(p => p.trim());
        let current = scope;
        for (let i = 0; i < parts.length - 1; i++) {
            const key = parts[i];
            ensureObject(current, key);
            current = current[key];
        }
        const lastPart = parts[parts.length - 1];
        const isAssignment = !lastPart.endsWith('{}') && !lastPart.endsWith('[]') && (lastPart.includes('=') || lastPart.includes(' '));
        parseInlinePairs(lastPart, current, vars, isAssignment, currentDir, importStack, parseValueFn);
        return;
    }

    parseInlinePairs(line, scope, vars, true, currentDir, importStack, parseValueFn);
}
