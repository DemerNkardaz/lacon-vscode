/**
 * Вспомогательные утилиты для парсера LACON
 */

/**
 * Удаляет экранирование из строки
 */
export function unescapeString(str: string): string {
    if (!str) return str;
    return str.replace(/\\(n|r|t|b|f|"|\\|\$|~|u\{([0-9A-Fa-f]+)\})/g, (match, type, unicodeCode) => {
        if (type.startsWith('u{')) return String.fromCodePoint(parseInt(unicodeCode, 16));
        switch (type) {
            case 'n': return '\n';
            case 'r': return '\r';
            case 't': return '\t';
            case 'b': return '\b';
            case 'f': return '\f';
            case '"': return '"';
            case '\\': return '\\';
            case '$': return '$';
            case '~': return '~';
            default: return match;
        }
    });
}

/**
 * Убирает кавычки из строки
 */
export function unwrapQuotes(val: string): string {
    if (val.startsWith('"') && val.endsWith('"')) return val.slice(1, -1);
    return val;
}

/**
 * Проверяет, что все скобки сбалансированы
 */
export function isBalanced(text: string): boolean {
    let brackets = 0, braces = 0, inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '"' && text[i - 1] !== '\\') inQuotes = !inQuotes;
        if (!inQuotes) {
            if (text[i] === '[') brackets++;
            if (text[i] === ']') brackets--;
            if (text[i] === '{') braces++;
            if (text[i] === '}') braces--;
        }
    }
    return brackets === 0 && braces === 0;
}

/**
 * Гарантирует, что поле является объектом
 */
export function ensureObject(parent: any, key: string) {
    if (typeof parent[key] !== 'object' || parent[key] === null || Array.isArray(parent[key])) {
        parent[key] = {};
    }
}

/**
 * Обрабатывает сырое многострочное значение
 */
export function processRawMultiline(lines: string[]): string {
    if (lines.length === 0) return "";
    const nonBlankLines = lines.filter(l => l.trim().length > 0);
    if (nonBlankLines.length === 0) return lines.join('\n').trim();
    const minIndent = nonBlankLines.reduce((min, line) => {
        const match = line.match(/^(\s*)/);
        const count = match ? match[1].length : 0;
        return count < min ? count : min;
    }, Infinity);
    const actualMin = minIndent === Infinity ? 0 : minIndent;
    return lines.map(l => (l.length >= actualMin ? l.substring(actualMin) : l.trim())).join('\n').trim();
}

/**
 * Обрабатывает многострочное значение в кавычках
 */
export function processQuotedMultiline(lines: string[]): string {
    return lines.filter(l => l.trim().length > 0).map(l => {
        let p = l.trim();
        if (p.endsWith(',')) p = p.slice(0, -1).trim();
        return unwrapQuotes(p);
    }).join('\n');
}

/**
 * Добавляет значение к существующему ключу
 */
export function appendValue(
    target: any,
    key: string,
    value: string,
    vars: Record<string, string>,
    currentDir: string,
    importStack: Set<string>,
    parseValueFn: Function
) {
    const parsed = parseValueFn(value, vars, currentDir, importStack);
    if (!(key in target)) {
        target[key] = parsed;
        return;
    }
    if (Array.isArray(target[key])) {
        if (parsed && parsed.__lacon_spread__ && Array.isArray(parsed.value)) {
            target[key].push(...parsed.value);
        } else {
            target[key].push(parsed);
        }
    } else if (typeof target[key] === 'string') {
        const cleanVal = typeof parsed === 'string' ? parsed : String(parsed);
        target[key] = target[key] === "" ? cleanVal : target[key] + '\n' + cleanVal;
    } else {
        target[key] = parsed;
    }
}
