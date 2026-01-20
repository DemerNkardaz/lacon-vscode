/**
 * Обработка директив <emit> в LACON
 */

import { processFunctionsInText } from './function-parser';

export interface EmitDirective {
    start: number;
    end: number;
    direction: '+' | '-';
    localVar?: string;
    localVarExpr?: string;
    restOfLine: string;
}

/**
 * Парсит директиву <emit>
 * Формат: <emit: START to ±COUNT as local $var=выражение>остаток строки
 */
export function parseEmitDirective(line: string): EmitDirective | null {
    // Удаляем \r и пробелы по краям для корректного парсинга
    const cleaned = line.trim().replace(/\r/g, '');
    
    // Регулярное выражение для <emit: num to ±num as local $var=expr>
    const emitRegex = /<emit:\s*(.+?)\s+to\s+([+-])(\d+)(?:\s+as\s+local\s+(\$[\w-]+)\s*=\s*(.+?))?>\s*(.*)$/;
    const match = cleaned.match(emitRegex);

    if (!match) {
        return null;
    }

    const [, startStr, direction, countStr, localVar, localVarExpr, restOfLine] = match;

    // Парсим начальное значение (может быть 0x4E3 или обычное число)
    let start: number;
    if (startStr.startsWith('0x') || startStr.startsWith('0X')) {
        start = parseInt(startStr, 16);
    } else {
        start = parseInt(startStr, 10);
    }

    const count = parseInt(countStr, 10);
    const end = start + count;

    return {
        start,
        end,
        direction: direction as '+' | '-',
        localVar: localVar ? localVar.substring(1) : undefined, // Убираем $
        localVarExpr,
        restOfLine
    };
}

/**
 * Раскрывает директиву <emit> в множество строк
 */
export function expandEmitDirective(
    line: string,
    globalVars: Record<string, string>,
    indentation: string
): string[] {
    const directive = parseEmitDirective(line);
    if (!directive) {
        return [line];
    }

    const result: string[] = [];
    const step = directive.direction === '+' ? 1 : -1;
    const iterations = directive.end - directive.start;

    for (let i = 0; i < iterations; i++) {
        const currentValue = directive.start + (i * step);
        
        // Создаём локальную область видимости переменных
        const localVars = { ...globalVars };

        // Если есть локальная переменная, вычисляем её значение
        if (directive.localVar && directive.localVarExpr) {
            const varValue = processFunctionsInText(
                directive.localVarExpr,
                localVars,
                currentValue
            );
            localVars[directive.localVar] = varValue;
        }

        // Обрабатываем остаток строки, подставляя локальные переменные
        let expandedLine = directive.restOfLine;
        
        // Подставляем переменные
        expandedLine = expandedLine.replace(/\$(\w[\w-]*)(~?)/g, (match, varName) => {
            return localVars[varName] !== undefined ? localVars[varName] : match;
        });

        // Обрабатываем функции
        expandedLine = processFunctionsInText(expandedLine, localVars, currentValue);

        result.push(indentation + expandedLine);
    }

    return result;
}

/**
 * Обрабатывает блок с emit директивой
 * Раскрывает блок для каждой итерации
 */
export function expandEmitBlock(
    lines: string[],
    startIndex: number,
    globalVars: Record<string, string>
): { expandedLines: string[]; endIndex: number } {
    const firstLine = lines[startIndex];
    const directive = parseEmitDirective(firstLine);
    
    if (!directive) {
        return { expandedLines: [firstLine], endIndex: startIndex };
    }

    // Находим блок (до закрывающей скобки)
    const indentMatch = firstLine.match(/^(\s*)/);
    const baseIndent = indentMatch ? indentMatch[1].length : 0;
    
    let endIndex = startIndex + 1;
    const blockLines: string[] = [];
    
    // Собираем строки блока
    while (endIndex < lines.length) {
        const line = lines[endIndex];
        const lineIndent = line.match(/^(\s*)/)?.[1].length || 0;
        
        // Если нашли закрывающую скобку на том же уровне отступа
        if (line.trim() === '}' && lineIndent === baseIndent) {
            break;
        }
        
        blockLines.push(line);
        endIndex++;
    }

    const result: string[] = [];
    const step = directive.direction === '+' ? 1 : -1;
    const iterations = directive.end - directive.start;

    // Генерируем блок для каждой итерации
    for (let i = 0; i < iterations; i++) {
        const currentValue = directive.start + (i * step);
        
        // Создаём локальную область видимости
        const localVars = { ...globalVars };

        // Вычисляем локальную переменную
        if (directive.localVar && directive.localVarExpr) {
            const varValue = processFunctionsInText(
                directive.localVarExpr,
                localVars,
                currentValue
            );
            localVars[directive.localVar] = varValue;
        }

        // Обрабатываем заголовок блока
        let blockHeader = directive.restOfLine;
        blockHeader = blockHeader.replace(/\$(\w[\w-]*)(~?)/g, (match, varName) => {
            return localVars[varName] !== undefined ? localVars[varName] : match;
        });
        blockHeader = processFunctionsInText(blockHeader, localVars, currentValue);
        
        const indent = firstLine.match(/^(\s*)/)?.[1] || '';
        result.push(indent + blockHeader);

        // Обрабатываем строки блока
        for (const blockLine of blockLines) {
            let processedLine = blockLine.replace(/\$(\w[\w-]*)(~?)/g, (match, varName) => {
                return localVars[varName] !== undefined ? localVars[varName] : match;
            });
            processedLine = processFunctionsInText(processedLine, localVars, currentValue);
            result.push(processedLine);
        }

        result.push(indent + '}');
    }

    return { expandedLines: result, endIndex };
}
