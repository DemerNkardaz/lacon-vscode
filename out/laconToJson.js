"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.laconToJson = void 0;
function laconToJson(text) {
    const lines = text.split('\n');
    const result = {};
    const stack = [result];
    const indentStack = [-1];
    const variableRegistry = {};
    let isMultiline = false;
    let isRawMultiline = false;
    let multilineKey = '';
    let multilineContent = [];
    let isArrayMode = false;
    let arrayKey = '';
    let arrayContent = [];
    // Обновлено: varRegex теперь проверяет, что перед $ нет обратного слеша
    const varRegex = /^\s*(?<!\\)\$([\w.-]+)\s+(.+)$/;
    const blockStartRegex = /^\s*([\w.-]+)\s*(?:>\s*([\w.-]+)\s*)?\{/;
    const multiKeyRegex = /^\s*\[([\w\s,-]+)\]\s*=?\s*(.+)$/;
    const multilineStartRegex = /^\s*([\w.-]+)\s*(@)?\(\s*$/;
    const arrayStartRegex = /^\s*([\w.-]+)\s*\[\s*$/;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const currentLine = line.replace(/\r/g, '');
        const trimmed = currentLine.trim();
        if (isMultiline) {
            if (trimmed === ')') {
                const currentScope = stack[stack.length - 1];
                const finalValue = isRawMultiline
                    ? processRawMultiline(multilineContent)
                    : processQuotedMultiline(multilineContent);
                // Сначала разрешаем переменные, затем убираем экраны \$
                const resolved = resolveVariables(finalValue, variableRegistry);
                const processedValue = isRawMultiline ? resolved : unescapeString(resolved);
                if (typeof currentScope[multilineKey] === 'string' && currentScope[multilineKey] !== "") {
                    currentScope[multilineKey] += '\n' + processedValue;
                }
                else {
                    currentScope[multilineKey] = processedValue;
                }
                isMultiline = false;
                multilineContent = [];
                continue;
            }
            multilineContent.push(currentLine);
            continue;
        }
        if (isArrayMode) {
            if (trimmed === ']') {
                const currentScope = stack[stack.length - 1];
                currentScope[arrayKey] = arrayContent;
                isArrayMode = false;
                arrayContent = [];
                continue;
            }
            const cleanItem = trimmed.replace(/\/\/.*$/, '').replace(/,$/, '').trim();
            if (cleanItem) {
                arrayContent.push(parseValue(resolveVariables(cleanItem, variableRegistry), variableRegistry));
            }
            continue;
        }
        const cleanLine = trimmed.replace(/\/\/.*$/, '').trim();
        if (!cleanLine || cleanLine.startsWith('/*'))
            continue;
        const indentMatch = currentLine.match(/^(\s*)/);
        const currentIndent = indentMatch ? indentMatch[1].length : 0;
        if (cleanLine !== '}') {
            while (stack.length > 1 && currentIndent <= indentStack[indentStack.length - 1]) {
                stack.pop();
                indentStack.pop();
            }
        }
        let currentScope = stack[stack.length - 1];
        if (cleanLine === '}') {
            if (stack.length > 1) {
                stack.pop();
                indentStack.pop();
            }
            continue;
        }
        if (varRegex.test(cleanLine)) {
            const [, name, value] = cleanLine.match(varRegex);
            variableRegistry[name] = unescapeString(unwrapQuotes(value.trim()));
            continue;
        }
        if (arrayStartRegex.test(cleanLine)) {
            const match = cleanLine.match(arrayStartRegex);
            arrayKey = match[1];
            isArrayMode = true;
            continue;
        }
        if (multilineStartRegex.test(cleanLine)) {
            const match = cleanLine.match(multilineStartRegex);
            multilineKey = match[1];
            isRawMultiline = match[2] === '@';
            isMultiline = true;
            continue;
        }
        if (blockStartRegex.test(cleanLine)) {
            const [, key1, key2] = cleanLine.match(blockStartRegex);
            if (key2) {
                ensureObject(currentScope, key1);
                currentScope[key1][key2] = {};
                stack.push(currentScope[key1][key2]);
            }
            else {
                currentScope[key1] = {};
                stack.push(currentScope[key1]);
            }
            indentStack.push(currentIndent);
            continue;
        }
        if (multiKeyRegex.test(cleanLine)) {
            const [, keysStr, value] = cleanLine.match(multiKeyRegex);
            const keys = keysStr.split(',').map(k => k.trim());
            const val = parseValue(resolveVariables(value, variableRegistry), variableRegistry);
            keys.forEach(k => currentScope[k] = val);
            continue;
        }
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
                stack.push(currentScope[cleanLine]);
                indentStack.push(currentIndent);
                continue;
            }
        }
        processComplexLine(cleanLine, currentScope, variableRegistry);
    }
    return JSON.stringify(result, null, 2);
}
exports.laconToJson = laconToJson;
// Изменено: добавлено преобразование \$ в $
function unescapeString(str) {
    return str.replace(/\\(n|r|t|b|f|"|\\|\$|u\{([0-9A-Fa-f]+)\})/g, (match, type, unicodeCode) => {
        switch (type[0]) {
            case 'n': return '\n';
            case 'r': return '\r';
            case 't': return '\t';
            case 'b': return '\b';
            case 'f': return '\f';
            case '"': return '"';
            case '\\': return '\\';
            case '$': return '$'; // Поддержка экранированного доллара
            case 'u':
                const codePoint = parseInt(unicodeCode, 16);
                return String.fromCodePoint(codePoint);
            default: return match;
        }
    });
}
function ensureObject(parent, key) {
    if (typeof parent[key] !== 'object' || parent[key] === null || Array.isArray(parent[key])) {
        parent[key] = {};
    }
}
function processComplexLine(line, scope, vars) {
    let plusIndex = -1;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"' && line[i - 1] !== '\\')
            inQuotes = !inQuotes;
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
            appendValue(current, pathParts[pathParts.length - 1], valueToAppend, vars);
        }
        else {
            appendValue(scope, keyPath, valueToAppend, vars);
        }
        return;
    }
    if (line.includes('>')) {
        const parts = line.split('>').map(p => p.trim());
        let current = scope;
        for (let i = 0; i < parts.length - 1; i++) {
            const key = parts[i];
            ensureObject(current, key);
            current = current[key];
        }
        const lastPart = parts[parts.length - 1];
        const isStructureInit = lastPart.endsWith('{}') || lastPart.endsWith('[]') || lastPart.endsWith('()') || lastPart.endsWith('@()');
        const isAssignment = !isStructureInit && (lastPart.includes('=') || lastPart.includes(' '));
        parseInlinePairs(lastPart, current, vars, isAssignment);
        return;
    }
    parseInlinePairs(line, scope, vars, true);
}
function appendValue(target, key, value, vars) {
    const resolved = resolveVariables(value, vars);
    const parsed = parseValue(resolved, vars);
    if (!(key in target)) {
        target[key] = parsed;
        return;
    }
    if (Array.isArray(target[key])) {
        target[key].push(parsed);
    }
    else if (typeof target[key] === 'string') {
        const cleanVal = typeof parsed === 'string' ? parsed : String(parsed);
        target[key] = target[key] === "" ? cleanVal : target[key] + '\n' + cleanVal;
    }
    else {
        target[key] = parsed;
    }
}
function parseInlinePairs(text, target, vars, overwrite) {
    const trimmedText = text.trim();
    if (!trimmedText)
        return;
    if (trimmedText.endsWith('{}')) {
        target[trimmedText.replace('{}', '').trim()] = {};
        return;
    }
    if (trimmedText.endsWith('[]')) {
        target[trimmedText.replace('[]', '').trim()] = [];
        return;
    }
    if (trimmedText.endsWith('@()') || trimmedText.endsWith('()')) {
        const key = trimmedText.replace(/@?\(\)/, '').trim();
        target[key] = "";
        return;
    }
    if (trimmedText.includes('=')) {
        const keyPositions = [];
        const findKeysRegex = /(?:^|\s+)([\w.-]+)\s*=/g;
        let m;
        while ((m = findKeysRegex.exec(trimmedText)) !== null) {
            const prefix = trimmedText.substring(0, m.index);
            const openBraces = (prefix.match(/\{/g) || []).length;
            const closeBraces = (prefix.match(/\}/g) || []).length;
            const openBrackets = (prefix.match(/\[/g) || []).length;
            const closeBrackets = (prefix.match(/\]/g) || []).length;
            if (openBraces === closeBraces && openBrackets === closeBrackets) {
                keyPositions.push({
                    key: m[1],
                    start: (m.index ?? 0) + (m[0].indexOf(m[1])),
                    valueStart: (m.index ?? 0) + m[0].length
                });
            }
        }
        if (keyPositions.length > 0) {
            const firstKeyStart = keyPositions[0].start;
            const leadText = trimmedText.substring(0, firstKeyStart).trim();
            let currentTarget = target;
            if (leadText) {
                if (overwrite) {
                    target[leadText] = {};
                }
                else {
                    ensureObject(target, leadText);
                }
                currentTarget = target[leadText];
            }
            for (let i = 0; i < keyPositions.length; i++) {
                const current = keyPositions[i];
                const next = keyPositions[i + 1];
                let rawValue = next
                    ? trimmedText.substring(current.valueStart, next.start)
                    : trimmedText.substring(current.valueStart);
                currentTarget[current.key] = parseValue(resolveVariables(rawValue.trim(), vars), vars);
            }
            return;
        }
    }
    const firstSpaceIndex = trimmedText.search(/\s/);
    if (firstSpaceIndex === -1) {
        if (!overwrite && typeof target[trimmedText] === 'object' && target[trimmedText] !== null)
            return;
        target[trimmedText] = true;
    }
    else {
        const key = trimmedText.substring(0, firstSpaceIndex);
        const value = trimmedText.substring(firstSpaceIndex).trim();
        target[key] = parseValue(resolveVariables(value, vars), vars);
    }
}
function processRawMultiline(lines) {
    if (lines.length === 0)
        return "";
    const nonBlankLines = lines.filter(l => l.trim().length > 0);
    if (nonBlankLines.length === 0)
        return lines.join('\n').trim();
    const minIndent = nonBlankLines.reduce((min, line) => {
        const match = line.match(/^(\s*)/);
        const count = match ? match[1].length : 0;
        return count < min ? count : min;
    }, Infinity);
    const actualMin = minIndent === Infinity ? 0 : minIndent;
    return lines
        .map(l => (l.length >= actualMin ? l.substring(actualMin) : l.trim()))
        .join('\n')
        .trim();
}
function processQuotedMultiline(lines) {
    return lines
        .filter(l => l.trim().length > 0)
        .map(l => {
        let processed = l.trim();
        if (processed.endsWith(','))
            processed = processed.slice(0, -1).trim();
        return unwrapQuotes(processed);
    })
        .join('\n');
}
// Изменено: resolveVariables теперь игнорирует \$
function resolveVariables(value, vars) {
    // Используем отрицательный просмотр назад (?<!\\), чтобы не матчить \$
    return value.replace(/(?<!\\)\$([\w.-]+)(~?)/g, (match, varName) => vars[varName] !== undefined ? vars[varName] : match);
}
function unwrapQuotes(val) {
    if (val.startsWith('"') && val.endsWith('"'))
        return val.slice(1, -1);
    return val;
}
function parseValue(val, vars) {
    val = val.trim();
    if (val.startsWith('"') && val.endsWith('"')) {
        return unescapeString(val.slice(1, -1));
    }
    if (val === 'true')
        return true;
    if (val === 'false')
        return false;
    if (val === 'auto')
        return 'auto';
    if (val.startsWith('{') && val.endsWith('}')) {
        const inner = val.slice(1, -1).trim();
        const obj = {};
        parseInlinePairs(inner, obj, vars, false);
        return obj;
    }
    if (val.startsWith('[') && val.endsWith(']')) {
        const inner = val.slice(1, -1).trim();
        if (!inner)
            return [];
        const items = [];
        let current = "";
        let depth = 0;
        for (let char of inner) {
            if (char === '[' || char === '{')
                depth++;
            if (char === ']' || char === '}')
                depth--;
            if (char === ',' && depth === 0) {
                items.push(current.trim());
                current = "";
            }
            else {
                current += char;
            }
        }
        items.push(current.trim());
        return items.map(v => parseValue(v, vars));
    }
    if (/^-?\d+(\.\d+)?$/.test(val))
        return Number(val);
    // В конце обычных строк тоже нужно запустить unescapeString, чтобы убрать \ из \$
    return unescapeString(val);
}
//# sourceMappingURL=laconToJson.js.map