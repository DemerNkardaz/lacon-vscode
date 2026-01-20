/**
 * Обработка функций в LACON (@f - форматирование)
 */

/**
 * Форматирует значение согласно спецификации
 * @f"текст с {}"(значение) или @f"текст с {:X}"(значение)
 */
export function formatValue(formatStr: string, value: string | number, vars: Record<string, string>): string {
    // Преобразуем значение в число если это hex строка или число
    let numValue: number;
    if (typeof value === 'string') {
        if (value.startsWith('0x') || value.startsWith('0X')) {
            numValue = parseInt(value, 16);
        } else {
            numValue = Number(value);
        }
    } else {
        numValue = value;
    }

    // Если не число, возвращаем как строку
    if (isNaN(numValue)) {
        return String(value);
    }

    // Обрабатываем форматирование
    return formatStr.replace(/\{(:0?(\d+)?([xX]))?\}/g, (match, group1, pad, type) => {
        // Если просто {}, возвращаем значение как есть
        if (!group1) {
            return String(value);
        }

        // Форматирование в hex
        let hex = numValue.toString(16);
        if (type === 'X') {
            hex = hex.toUpperCase();
        }

        // Добавляем ведущие нули
        if (pad) {
            hex = hex.padStart(Number(pad), '0');
        }

        return hex;
    });
}

/**
 * Парсит вызов функции @f"формат"(значение)
 * Возвращает { format: string, arg: string } или null
 */
export function parseFunctionCall(text: string): { format: string; arg: string } | null {
    // Регулярное выражение для @f"формат"(аргумент)
    const match = text.match(/@f\(([^"]+),\s([^)]+)\)/);
    if (!match) {
        return null;
    }

    return {
        format: match[1],
        arg: match[2].trim()
    };
}

/**
 * Выполняет функцию форматирования в строке
 */
export function executeFunctionCall(
    text: string,
    vars: Record<string, string>,
    currentValue?: number
): string {
    const funcCall = parseFunctionCall(text);
    if (!funcCall) {
        return text;
    }

    // Если аргумент - @current, используем currentValue
    let argValue: string | number = funcCall.arg;
    if (funcCall.arg === '@current' && currentValue !== undefined) {
        argValue = currentValue;
    } else if (funcCall.arg.startsWith('$')) {
        // Подставляем переменную
        const varName = funcCall.arg.substring(1);
        argValue = vars[varName] || funcCall.arg;
    }

    return formatValue(funcCall.format, argValue, vars);
}

/**
 * Обрабатывает все вызовы функций в строке
 */
export function processFunctionsInText(
    text: string,
    vars: Record<string, string>,
    currentValue?: number
): string {
    let result = text;
    const funcRegex = /@f\([^"]+,\s[^)]+\)/g;
    
    result = result.replace(funcRegex, (match) => {
        return executeFunctionCall(match, vars, currentValue);
    });

    return result;
}
