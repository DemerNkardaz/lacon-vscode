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
    const varRegex = /^\s*(?<!\\)\$([\p{L}\d._-]+)\s*=?\s*(.+)$/u;
    const blockStartRegex = /^\s*([\p{L}\d._-]+)\s*(?:>\s*([\p{L}\d._-]+)\s*)?=?\s*\{/u;
    const multiKeyRegex = /^\s*\[([\p{L}\d\s,.*_-]+)\]\s*=?\s*(.+)$/u;
    const multilineStartRegex = /^\s*([\p{L}\d._-]+)\s*=?\s*(@?\()\s*$/u;
    const arrayStartRegex = /^\s*([\p{L}\d._-]+)\s*=?\s*\[\s*$/u;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const currentLine = line.replace(/\r/g, '');
        const trimmed = currentLine.trim();
        if (isMultiline) {
            if (trimmed === ')') {
                const currentScope = stack[stack.length - 1];
                const finalRawValue = isRawMultiline
                    ? processRawMultiline(multilineContent)
                    : processQuotedMultiline(multilineContent);
                let resolved = resolveVariables(finalRawValue, variableRegistry);
                const processedValue = unescapeString(resolved);
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
            const match = cleanLine.match(varRegex);
            variableRegistry[match[1]] = unescapeString(unwrapQuotes(match[2].trim()));
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
            isRawMultiline = match[2].startsWith('@');
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
            assignMultiValues(currentScope, keys, value, variableRegistry);
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
function unescapeString(str) {
    if (!str)
        return str;
    return str.replace(/\\(n|r|t|b|f|"|\\|\$|u\{([0-9A-Fa-f]+)\})/g, (match, type, unicodeCode) => {
        if (type.startsWith('u{')) {
            const codePoint = parseInt(unicodeCode, 16);
            return String.fromCodePoint(codePoint);
        }
        switch (type) {
            case 'n': return '\n';
            case 'r': return '\r';
            case 't': return '\t';
            case 'b': return '\b';
            case 'f': return '\f';
            case '"': return '"';
            case '\\': return '\\';
            case '$': return '$';
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
        const isStructureInit = lastPart.endsWith('{}') || lastPart.endsWith('[]') || lastPart.endsWith('()') || lastPart.endsWith('@()') || lastPart.includes('={}') || lastPart.includes('=[]');
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
        const key = trimmedText.replace(/=?\s*\{\}/, '').trim();
        target[key] = {};
        return;
    }
    if (trimmedText.endsWith('[]')) {
        const key = trimmedText.replace(/=?\s*\[\]/, '').trim();
        target[key] = [];
        return;
    }
    if (trimmedText.endsWith('@()') || trimmedText.endsWith('()')) {
        const key = trimmedText.replace(/=?\s*@?\(\)/, '').trim();
        target[key] = "";
        return;
    }
    if (trimmedText.includes('=')) {
        const keyPositions = [];
        const findKeysRegex = /(?:^|\s+)(?:([\p{L}\d._-]+)|\[([\p{L}\d\s,.*_-]+)\])\s*=/gu;
        let m;
        while ((m = findKeysRegex.exec(trimmedText)) !== null) {
            const prefix = trimmedText.substring(0, m.index);
            if (isBalanced(prefix)) {
                keyPositions.push({
                    key: m[1] || m[2],
                    start: (m.index ?? 0) + (m[0].indexOf(m[1] || '[' + m[2])),
                    valueStart: (m.index ?? 0) + m[0].length,
                    isMulti: !!m[2]
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
                if (current.isMulti) {
                    const keys = current.key.split(',').map(k => k.trim());
                    assignMultiValues(currentTarget, keys, rawValue.trim(), vars);
                }
                else {
                    currentTarget[current.key] = parseValue(resolveVariables(rawValue.trim(), vars), vars);
                }
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
function assignMultiValues(target, keys, rawValue, vars) {
    const resolved = resolveVariables(rawValue, vars);
    const parsed = parseValue(resolved, vars);
    let currentPrefix = "";
    const processedKeys = keys.map((k) => {
        let keyName = k.trim();
        if (keyName.includes('*')) {
            const parts = keyName.split('*');
            currentPrefix = parts[0];
            keyName = currentPrefix + parts[1];
        }
        else if (currentPrefix) {
            keyName = currentPrefix + keyName;
        }
        return keyName;
    });
    if (Array.isArray(parsed) && parsed.length === processedKeys.length) {
        processedKeys.forEach((k, idx) => {
            target[k] = parsed[idx];
        });
    }
    else {
        processedKeys.forEach(k => {
            target[k] = parsed;
        });
    }
}
function isBalanced(text) {
    let brackets = 0;
    let braces = 0;
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '"' && text[i - 1] !== '\\')
            inQuotes = !inQuotes;
        if (!inQuotes) {
            if (text[i] === '[')
                brackets++;
            if (text[i] === ']')
                brackets--;
            if (text[i] === '{')
                braces++;
            if (text[i] === '}')
                braces--;
        }
    }
    return brackets === 0 && braces === 0;
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
function resolveVariables(value, vars) {
    return value.replace(/(?<!\\)\$([\p{L}\d._-]+)(~?)/gu, (match, varName, tilde) => {
        const val = vars[varName] !== undefined ? vars[varName] : match;
        return tilde ? val : val;
    }).replace(/~/g, '');
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
        let inQuotes = false;
        for (let i = 0; i < inner.length; i++) {
            const char = inner[i];
            if (char === '"' && inner[i - 1] !== '\\')
                inQuotes = !inQuotes;
            if (!inQuotes) {
                if (char === '[' || char === '{')
                    depth++;
                if (char === ']' || char === '}')
                    depth--;
                if (char === ',' && depth === 0) {
                    items.push(current.trim());
                    current = "";
                    continue;
                }
            }
            current += char;
        }
        items.push(current.trim());
        return items.map(v => parseValue(v, vars));
    }
    if (/^-?\d+(\.\d+)?$/.test(val))
        return Number(val);
    return unescapeString(val);
}
//# sourceMappingURL=laconToJson.js.map