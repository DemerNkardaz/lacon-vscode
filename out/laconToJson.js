"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.laconToJson = void 0;
function laconToJson(text) {
    const lines = text.split('\n');
    const result = {};
    const stack = [result];
    const variableRegistry = {};
    let isMultiline = false;
    let isRawMultiline = false;
    let multilineKey = '';
    let multilineContent = [];
    const varRegex = /^\s*\$([\w.-]+)\s+(.+)$/;
    const blockStartRegex = /^\s*([\w.-]+)\s*(?:>\s*([\w.-]+)\s*)?\{/;
    const multiKeyRegex = /^\s*\[([\w\s,-]+)\]\s*=?\s*(.+)$/;
    const multilineStartRegex = /^\s*([\w.-]+)\s*(@)?\(/;
    for (let line of lines) {
        const currentLine = line.replace(/\r/g, '');
        const trimmed = currentLine.trim();
        if (isMultiline) {
            if (trimmed === ')') {
                const currentScope = stack[stack.length - 1];
                const finalValue = isRawMultiline
                    ? processRawMultiline(multilineContent)
                    : processQuotedMultiline(multilineContent);
                currentScope[multilineKey] = resolveVariables(finalValue, variableRegistry);
                isMultiline = false;
                isRawMultiline = false;
                multilineContent = [];
                continue;
            }
            multilineContent.push(currentLine);
            continue;
        }
        const cleanLine = trimmed.replace(/\/\/.*$/, '').trim();
        if (!cleanLine || cleanLine.startsWith('/*'))
            continue;
        let currentScope = stack[stack.length - 1];
        if (multilineStartRegex.test(cleanLine)) {
            const match = cleanLine.match(multilineStartRegex);
            multilineKey = match[1];
            isRawMultiline = match[2] === '@';
            isMultiline = true;
            continue;
        }
        if (cleanLine === '}') {
            if (stack.length > 1)
                stack.pop();
            continue;
        }
        if (varRegex.test(cleanLine)) {
            const [, name, value] = cleanLine.match(varRegex);
            variableRegistry[name] = unwrapQuotes(value.trim());
            continue;
        }
        if (blockStartRegex.test(cleanLine)) {
            const [, key1, key2] = cleanLine.match(blockStartRegex);
            if (key2) {
                currentScope[key1] = currentScope[key1] || {};
                currentScope[key1][key2] = currentScope[key1][key2] || {};
                stack.push(currentScope[key1][key2]);
            }
            else {
                currentScope[key1] = currentScope[key1] || {};
                stack.push(currentScope[key1]);
            }
            continue;
        }
        if (multiKeyRegex.test(cleanLine)) {
            const [, keysStr, value] = cleanLine.match(multiKeyRegex);
            const keys = keysStr.split(',').map(k => k.trim());
            const val = parseValue(resolveVariables(value, variableRegistry));
            keys.forEach(k => currentScope[k] = val);
            continue;
        }
        processComplexLine(cleanLine, currentScope, variableRegistry);
    }
    return JSON.stringify(result, null, 2);
}
exports.laconToJson = laconToJson;
function processRawMultiline(lines) {
    if (lines.length === 0)
        return "";
    const nonBlankLines = lines.filter(l => l.trim().length > 0);
    const minIndent = nonBlankLines.reduce((min, line) => {
        const match = line.match(/^(\s*)/);
        const count = match ? match[1].length : 0;
        return count < min ? count : min;
    }, Infinity);
    const actualMin = minIndent === Infinity ? 0 : minIndent;
    return lines
        .map(l => l.length >= actualMin ? l.substring(actualMin) : l.trim())
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
        if (processed.startsWith('"') && processed.endsWith('"')) {
            processed = processed.slice(1, -1);
        }
        return processed;
    })
        .join('\n');
}
function processComplexLine(line, scope, vars) {
    if (line.includes('>')) {
        const parts = line.split('>').map(p => p.trim());
        let current = scope;
        for (let i = 0; i < parts.length - 1; i++) {
            const key = parts[i];
            current[key] = current[key] || {};
            current = current[key];
        }
        parseInlinePairs(parts[parts.length - 1], current, vars);
        return;
    }
    parseInlinePairs(line, scope, vars);
}
function parseInlinePairs(text, target, vars) {
    const trimmedText = text.trim();
    if (!trimmedText)
        return;
    if (!trimmedText.includes('=')) {
        const firstSpaceIndex = trimmedText.search(/\s/);
        if (firstSpaceIndex === -1) {
            target[trimmedText] = true;
            return;
        }
        const key = trimmedText.substring(0, firstSpaceIndex);
        const value = trimmedText.substring(firstSpaceIndex).trim();
        target[key] = parseValue(resolveVariables(value, vars));
        return;
    }
    const keyPositions = [];
    const findKeysRegex = /(?:^|\s+)([\w.-]+)\s*=/g;
    let m;
    while ((m = findKeysRegex.exec(trimmedText)) !== null) {
        keyPositions.push({
            key: m[1],
            start: (m.index ?? 0) + (m[0].indexOf(m[1])),
            valueStart: (m.index ?? 0) + m[0].length
        });
    }
    const firstKeyStart = keyPositions[0].start;
    const leadText = trimmedText.substring(0, firstKeyStart).trim();
    let currentTarget = target;
    if (leadText) {
        target[leadText] = target[leadText] || {};
        currentTarget = target[leadText];
    }
    for (let i = 0; i < keyPositions.length; i++) {
        const current = keyPositions[i];
        const next = keyPositions[i + 1];
        let rawValue = next
            ? trimmedText.substring(current.valueStart, next.start)
            : trimmedText.substring(current.valueStart);
        currentTarget[current.key] = parseValue(resolveVariables(rawValue.trim(), vars));
    }
}
function resolveVariables(value, vars) {
    return value.replace(/\$([\w.-]+)(~?)/g, (match, varName) => {
        return vars[varName] !== undefined ? vars[varName] : match;
    });
}
function unwrapQuotes(val) {
    if (val.startsWith('"') && val.endsWith('"'))
        return val.slice(1, -1);
    return val;
}
function parseValue(val) {
    val = val.trim();
    if (val.startsWith('"') && val.endsWith('"'))
        return val.slice(1, -1);
    if (val === 'true')
        return true;
    if (val === 'false')
        return false;
    if (val === 'auto')
        return 'auto';
    if (val.startsWith('[') && val.endsWith(']')) {
        return val.slice(1, -1).split(',').map(v => parseValue(v.trim()));
    }
    if (/^-?\d+(\.\d+)?$/.test(val))
        return Number(val);
    return val;
}
//# sourceMappingURL=laconToJson.js.map