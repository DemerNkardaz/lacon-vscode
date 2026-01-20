/**
 * Обработка блочных конструкций (многострочные, массивы, объекты)
 */

import { processRawMultiline, processQuotedMultiline, unescapeString } from './utils';
import { resolveVariables } from './variable-parser';

/**
 * Обрабатывает завершение многострочного значения
 */
export function handleMultilineEnd(
    state: any,
    variableRegistry: Record<string, string>
): void {
    const finalRawValue = state.isRawMultiline
        ? processRawMultiline(state.multilineContent)
        : processQuotedMultiline(state.multilineContent);

    let resolved = resolveVariables(finalRawValue, variableRegistry);
    const processedValue = unescapeString(resolved);

    if (state.isExportMultiline) {
        state.exportValue = processedValue;
        state.isExportMultiline = false;
    } else {
        const currentScope = state.stack[state.stack.length - 1];
        if (typeof currentScope[state.multilineKey] === 'string' && currentScope[state.multilineKey] !== "") {
            currentScope[state.multilineKey] += '\n' + processedValue;
        } else {
            currentScope[state.multilineKey] = processedValue;
        }
    }

    state.isMultiline = false;
    state.multilineContent = [];
}

/**
 * Обрабатывает завершение блока
 */
export function handleBlockEnd(state: any): void {
    if (state.isExportBlock) {
        state.isExportBlock = false;
    } else {
        const currentScope = state.stack[state.stack.length - 1];
        currentScope[state.blockKey] = state.exportValue || {};
    }
    state.isBlockMode = false;
    state.exportValue = state.exportValue || {};
}

/**
 * Обрабатывает строку внутри блока
 */
export function handleBlockLine(
    cleanLine: string,
    state: any,
    variableRegistry: Record<string, string>,
    currentDir: string,
    importStack: Set<string>,
    parseInlinePairsFn: Function
): void {
    const target = state.isExportBlock ? state.exportValue : (state.stack[state.stack.length - 1][state.blockKey] || {});
    parseInlinePairsFn(cleanLine, target, variableRegistry, true, currentDir, importStack);
    if (!state.isExportBlock) {
        state.stack[state.stack.length - 1][state.blockKey] = target;
    }
}

/**
 * Обрабатывает завершение массива
 */
export function handleArrayEnd(state: any): void {
    if (state.isExportArray) {
        state.exportValue = state.arrayContent;
        state.isExportArray = false;
    } else {
        const currentScope = state.stack[state.stack.length - 1];
        currentScope[state.arrayKey] = state.arrayContent;
    }
    state.isArrayMode = false;
    state.arrayContent = [];
}

/**
 * Обрабатывает элемент массива
 */
export function handleArrayItem(
    cleanItem: string,
    state: any,
    variableRegistry: Record<string, string>,
    currentDir: string,
    importStack: Set<string>,
    parseValueFn: Function,
    resolveVariablesFn: Function
): void {
    if (cleanItem) {
        const parsed = parseValueFn(resolveVariablesFn(cleanItem, variableRegistry), variableRegistry, currentDir, importStack);
        if (parsed && typeof parsed === 'object' && parsed.__lacon_spread__) {
            if (Array.isArray(parsed.value)) {
                state.arrayContent.push(...parsed.value);
            } else {
                state.arrayContent.push(parsed.value);
            }
        } else {
            state.arrayContent.push(parsed);
        }
    }
}
