/**
 * Основной цикл парсинга LACON
 */

import { ParserState } from './types';
import {
    varRegex,
    arrayStartRegex,
    multilineStartRegex,
    blockStartRegex,
    multiKeyRegex,
    exportBlockRegex,
    exportArrayRegex,
    exportMultilineRegex
} from './regex';
import { unescapeString, unwrapQuotes, ensureObject } from './utils';
import { assignMultiValues } from './variable-parser';
import {
    handleMultilineEnd,
    handleBlockEnd,
    handleBlockLine,
    handleArrayEnd,
    handleArrayItem
} from './block-parser';
import { processComplexLine } from './inline-parser';
import {
    processImportDirective,
    processExportValue
} from './import-parser';

/**
 * Создаёт начальное состояние парсера
 */
function createInitialState(): ParserState {
    const result: any = {};
    return {
        result,
        stack: [result],
        indentStack: [-1],
        variableRegistry: {},
        exportValue: undefined,
        hasExport: false,
        isMultiline: false,
        isRawMultiline: false,
        multilineKey: '',
        multilineContent: [],
        isExportMultiline: false,
        isArrayMode: false,
        arrayKey: '',
        arrayContent: [],
        isExportArray: false,
        isBlockMode: false,
        blockKey: '',
        isExportBlock: false,
        isCommentBlock: false
    };
}

/**
 * Основная функция парсинга LACON
 */
export function laconToJsonInternal(
    text: string,
    currentDir: string,
    importStack: Set<string>,
    parseValueFn: Function,
    parseInlinePairsFn: Function,
    parseLaconFileFn: Function,
    resolveVariablesFn: Function,
    appendValueFn: Function,
    exportRegex: RegExp
): any {
    const lines = text.split('\n');
    const state = createInitialState();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const currentLine = line.replace(/\r/g, '');
        const trimmed = currentLine.trim();

        if (!trimmed && !state.isMultiline) continue;

        // Обработка @import
        if (!state.isMultiline && !state.isArrayMode && trimmed.startsWith('@import')) {
            const currentScope = state.stack[state.stack.length - 1];
            const processed = processImportDirective(
                trimmed,
                state.variableRegistry,
                currentDir,
                importStack,
                currentScope,
                state.isBlockMode,
                state.isExportBlock,
                state.exportValue,
                state.blockKey,
                resolveVariablesFn,
                parseLaconFileFn
            );
            if (processed) continue;
        }

        // Обработка @export
        if (!state.isMultiline && !state.isArrayMode && !state.isBlockMode && trimmed.startsWith('@export')) {
            if (exportBlockRegex.test(trimmed)) {
                state.isExportBlock = true;
                state.isBlockMode = true;
                state.hasExport = true;
                state.exportValue = {};
                continue;
            }
            if (exportArrayRegex.test(trimmed)) {
                state.isExportArray = true;
                state.isArrayMode = true;
                state.hasExport = true;
                continue;
            }
            if (exportMultilineRegex.test(trimmed)) {
                const match = trimmed.match(exportMultilineRegex)!;
                state.isRawMultiline = match[1].startsWith('@');
                state.isMultiline = true;
                state.isExportMultiline = true;
                state.hasExport = true;
                continue;
            }
            const exportVal = processExportValue(
                trimmed,
                state.variableRegistry,
                currentDir,
                importStack,
                exportRegex,
                resolveVariablesFn,
                parseValueFn
            );
            if (exportVal !== undefined) {
                state.exportValue = exportVal;
                state.hasExport = true;
                continue;
            }
        }

        // Режим многострочного значения
        if (state.isMultiline) {
            if (trimmed === ')') {
                handleMultilineEnd(state, state.variableRegistry);
                continue;
            }
            state.multilineContent.push(currentLine);
            continue;
        }

        // Режим блока
        if (state.isBlockMode) {
            if (trimmed === '}') {
                handleBlockEnd(state);
                continue;
            }
            const cleanLine = trimmed.replace(/\/\/.*$/, '').trim();
            if (!cleanLine) continue;
            handleBlockLine(cleanLine, state, state.variableRegistry, currentDir, importStack, parseInlinePairsFn);
            continue;
        }

        // Режим массива
        if (state.isArrayMode) {
            if (trimmed === ']') {
                handleArrayEnd(state);
                continue;
            }
            const cleanItem = trimmed.replace(/\/\/.*$/, '').replace(/,$/, '').trim();
            handleArrayItem(cleanItem, state, state.variableRegistry, currentDir, importStack, parseValueFn, resolveVariablesFn);
            continue;
        }

        // Обработка блочных комментариев
        if (!state.isMultiline && !state.isCommentBlock && trimmed.startsWith('/*')) {
            if (!trimmed.endsWith('*/')) state.isCommentBlock = true;
            continue;
        }
        if (state.isCommentBlock) {
            if (trimmed.includes('*/')) state.isCommentBlock = false;
            continue;
        }

        const cleanLine = trimmed.replace(/\/\/.*$/, '').trim();
        if (!cleanLine) continue;

        const indentMatch = currentLine.match(/^(\s*)/);
        const currentIndent = indentMatch ? indentMatch[1].length : 0;

        // Управление стеком отступов
        if (cleanLine !== '}') {
            while (state.stack.length > 1 && currentIndent <= state.indentStack[state.indentStack.length - 1]) {
                state.stack.pop();
                state.indentStack.pop();
            }
        }

        let currentScope = state.stack[state.stack.length - 1];

        // Закрывающая скобка
        if (cleanLine === '}') {
            if (state.stack.length > 1) {
                state.stack.pop();
                state.indentStack.pop();
            }
            continue;
        }

        // Переменная
        if (varRegex.test(cleanLine)) {
            const match = cleanLine.match(varRegex)!;
            state.variableRegistry[match[1]] = unescapeString(unwrapQuotes(match[2].trim()));
            continue;
        }

        // Начало массива
        if (arrayStartRegex.test(cleanLine)) {
            const match = cleanLine.match(arrayStartRegex)!;
            state.arrayKey = match[1];
            state.isArrayMode = true;
            continue;
        }

        // Начало многострочного значения
        if (multilineStartRegex.test(cleanLine)) {
            const match = cleanLine.match(multilineStartRegex)!;
            state.multilineKey = match[1];
            state.isRawMultiline = match[2].startsWith('@');
            state.isMultiline = true;
            continue;
        }

        // Начало блока
        if (blockStartRegex.test(cleanLine)) {
            const [, key1, key2] = cleanLine.match(blockStartRegex)!;
            if (key2) {
                ensureObject(currentScope, key1);
                currentScope[key1][key2] = {};
                state.stack.push(currentScope[key1][key2]);
            } else {
                currentScope[key1] = {};
                state.stack.push(currentScope[key1]);
            }
            state.indentStack.push(currentIndent);
            continue;
        }

        // Мультиключи
        if (multiKeyRegex.test(cleanLine)) {
            const [, keysStr, value] = cleanLine.match(multiKeyRegex)!;
            const keys = keysStr.split(',').map(k => k.trim());
            assignMultiValues(currentScope, keys, value, state.variableRegistry, currentDir, importStack, parseValueFn);
            continue;
        }

        // Проверка следующей строки для неявного объекта
        let nextLineIdx = i + 1;
        let nextLine = lines[nextLineIdx];
        while (nextLine !== undefined && !nextLine.trim()) {
            nextLine = lines[++nextLineIdx];
        }

        if (nextLine !== undefined) {
            const nextIndentMatch = nextLine.match(/^(\s*)/);
            const nextIndent = nextIndentMatch ? nextIndentMatch[1].length : 0;

            if (nextIndent > currentIndent && !cleanLine.includes('=') && !cleanLine.includes(' ') && !cleanLine.includes('>')) {
                currentScope[cleanLine] = {};
                state.stack.push(currentScope[cleanLine]);
                state.indentStack.push(currentIndent);
                continue;
            }
        }

        // Обработка сложной строки
        processComplexLine(cleanLine, currentScope, state.variableRegistry, currentDir, importStack, parseValueFn, appendValueFn);
    }

    return state.hasExport ? state.exportValue : state.result;
}
