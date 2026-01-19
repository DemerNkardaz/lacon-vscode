"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLaconFile = exports.laconToJson = void 0;
const fs = require("fs");
const path = require("path");
function laconToJson(text, sourcePath) {
    const currentDir = sourcePath ? path.dirname(sourcePath) : process.cwd();
    const obj = laconToJsonInternal(text, currentDir, new Set());
    return JSON.stringify(obj, null, 2);
}
exports.laconToJson = laconToJson;
function parseLaconFile(filePath, importStack = new Set()) {
    const absolutePath = path.resolve(filePath);
    if (importStack.has(absolutePath)) {
        throw new Error(`Circular import detected: ${absolutePath}`);
    }
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found: ${absolutePath}`);
    }
    const content = fs.readFileSync(absolutePath, 'utf-8');
    importStack.add(absolutePath);
    const result = laconToJsonInternal(content, path.dirname(absolutePath), importStack);
    importStack.delete(absolutePath);
    return result;
}
exports.parseLaconFile = parseLaconFile;
function laconToJsonInternal(text, currentDir, importStack) {
    const lines = text.split('\n');
    const result = {};
    const stack = [result];
    const indentStack = [-1];
    const variableRegistry = {};
    let exportValue = undefined;
    let hasExport = false;
    const exportRegex = /^@export\s+(.+)$/;
    let isMultiline = false;
    let isRawMultiline = false;
    let multilineKey = '';
    let multilineContent = [];
    let isExportMultiline = false;
    let isArrayMode = false;
    let arrayKey = '';
    let arrayContent = [];
    let isExportArray = false;
    let isBlockMode = false;
    let blockKey = '';
    let isExportBlock = false;
    const varRegex = /^\s*(?<!\\)\$([\p{L}\d._-]+)\s*=?\s*(.+)$/u;
    const blockStartRegex = /^\s*([\p{L}\d._-]+)\s*(?:>\s*([\p{L}\d._-]+)\s*)?=?\s*\{\s*$/u;
    const multiKeyRegex = /^\s*\[([\p{L}\d\s,.*_-]+)\]\s*=?\s*(.+)$/u;
    const multilineStartRegex = /^\s*([\p{L}\d._-]+)\s*=?\s*(@?\()\s*$/u;
    const arrayStartRegex = /^\s*([\p{L}\d._-]+)\s*=?\s*\[\s*$/u;
    const exportMultilineRegex = /^@export\s*=?\s*(@?\()\s*$/;
    const exportArrayRegex = /^@export\s*=?\s*\[\s*$/;
    const exportBlockRegex = /^@export\s*=?\s*\{\s*$/;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const currentLine = line.replace(/\r/g, '');
        const trimmed = currentLine.trim();
        if (!trimmed && !isMultiline)
            continue;
        if (!isMultiline && !isArrayMode && trimmed.startsWith('@import')) {
            const currentScope = stack[stack.length - 1];
            const resolvedImportLine = resolveVariables(trimmed, variableRegistry);
            const match = resolvedImportLine.match(/^@import\s+(=)?\s*(?:"([^"]+)"|([^\s"{}|[\]]+))/);
            if (match) {
                const importPath = match[2] || match[3];
                const fullImportPath = path.resolve(currentDir, importPath);
                const importedData = parseLaconFile(fullImportPath, importStack);
                if (isBlockMode) {
                    const target = isExportBlock ? exportValue : (stack[stack.length - 1][blockKey] || {});
                    Object.assign(target, importedData);
                    if (!isExportBlock)
                        stack[stack.length - 1][blockKey] = target;
                }
                else {
                    Object.assign(currentScope, importedData);
                }
                continue;
            }
        }
        if (!isMultiline && !isArrayMode && !isBlockMode && trimmed.startsWith('@export')) {
            if (exportBlockRegex.test(trimmed)) {
                isExportBlock = true;
                isBlockMode = true;
                hasExport = true;
                exportValue = {};
                continue;
            }
            if (exportArrayRegex.test(trimmed)) {
                isExportArray = true;
                isArrayMode = true;
                hasExport = true;
                continue;
            }
            if (exportMultilineRegex.test(trimmed)) {
                const match = trimmed.match(exportMultilineRegex);
                isRawMultiline = match[1].startsWith('@');
                isMultiline = true;
                isExportMultiline = true;
                hasExport = true;
                continue;
            }
            const match = trimmed.match(exportRegex);
            if (match) {
                const value = match[1].trim();
                exportValue = parseValue(resolveVariables(value, variableRegistry), variableRegistry, currentDir, importStack);
                hasExport = true;
                continue;
            }
        }
        if (isMultiline) {
            if (trimmed === ')') {
                const finalRawValue = isRawMultiline
                    ? processRawMultiline(multilineContent)
                    : processQuotedMultiline(multilineContent);
                let resolved = resolveVariables(finalRawValue, variableRegistry);
                const processedValue = unescapeString(resolved);
                if (isExportMultiline) {
                    exportValue = processedValue;
                    isExportMultiline = false;
                }
                else {
                    const currentScope = stack[stack.length - 1];
                    if (typeof currentScope[multilineKey] === 'string' && currentScope[multilineKey] !== "") {
                        currentScope[multilineKey] += '\n' + processedValue;
                    }
                    else {
                        currentScope[multilineKey] = processedValue;
                    }
                }
                isMultiline = false;
                multilineContent = [];
                continue;
            }
            multilineContent.push(currentLine);
            continue;
        }
        if (isBlockMode) {
            if (trimmed === '}') {
                if (isExportBlock) {
                    isExportBlock = false;
                }
                else {
                    const currentScope = stack[stack.length - 1];
                    currentScope[blockKey] = exportValue || {};
                }
                isBlockMode = false;
                exportValue = exportValue || {};
                continue;
            }
            const cleanLine = trimmed.replace(/\/\/.*$/, '').trim();
            if (!cleanLine)
                continue;
            const target = isExportBlock ? exportValue : (stack[stack.length - 1][blockKey] || {});
            parseInlinePairs(cleanLine, target, variableRegistry, true, currentDir, importStack);
            if (!isExportBlock) {
                stack[stack.length - 1][blockKey] = target;
            }
            continue;
        }
        if (isArrayMode) {
            if (trimmed === ']') {
                if (isExportArray) {
                    exportValue = arrayContent;
                    isExportArray = false;
                }
                else {
                    const currentScope = stack[stack.length - 1];
                    currentScope[arrayKey] = arrayContent;
                }
                isArrayMode = false;
                arrayContent = [];
                continue;
            }
            const cleanItem = trimmed.replace(/\/\/.*$/, '').replace(/,$/, '').trim();
            if (cleanItem) {
                const parsed = parseValue(resolveVariables(cleanItem, variableRegistry), variableRegistry, currentDir, importStack);
                if (parsed && typeof parsed === 'object' && parsed.__lacon_spread__) {
                    if (Array.isArray(parsed.value))
                        arrayContent.push(...parsed.value);
                    else
                        arrayContent.push(parsed.value);
                }
                else {
                    arrayContent.push(parsed);
                }
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
            assignMultiValues(currentScope, keys, value, variableRegistry, currentDir, importStack);
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
        processComplexLine(cleanLine, currentScope, variableRegistry, currentDir, importStack);
    }
    return hasExport ? exportValue : result;
}
function parseValue(val, vars, currentDir, importStack) {
    val = val.trim();
    if (!val)
        return val;
    const resolvedVal = resolveVariables(val, vars);
    if (resolvedVal.startsWith('@import...')) {
        const isAssignment = resolvedVal.includes('=');
        const startPos = isAssignment ? resolvedVal.indexOf('=') + 1 : 10;
        const rawPath = resolvedVal.substring(startPos).trim();
        const importPath = unwrapQuotes(rawPath);
        const fullImportPath = path.resolve(currentDir, importPath);
        const imported = parseLaconFile(fullImportPath, importStack);
        return { __lacon_spread__: true, value: imported };
    }
    if (resolvedVal.startsWith('@import')) {
        const isAssignment = resolvedVal.includes('=');
        const startPos = isAssignment ? resolvedVal.indexOf('=') + 1 : 7;
        const rawPath = resolvedVal.substring(startPos).trim();
        const importPath = unwrapQuotes(rawPath);
        const fullImportPath = path.resolve(currentDir, importPath);
        return parseLaconFile(fullImportPath, importStack);
    }
    if (resolvedVal.startsWith('"') && resolvedVal.endsWith('"'))
        return unescapeString(resolvedVal.slice(1, -1));
    if (resolvedVal === 'true')
        return true;
    if (resolvedVal === 'false')
        return false;
    if (resolvedVal === 'auto')
        return 'auto';
    if (resolvedVal.startsWith('{') && resolvedVal.endsWith('}')) {
        const obj = {};
        parseInlinePairs(resolvedVal.slice(1, -1).trim(), obj, vars, false, currentDir, importStack);
        return obj;
    }
    if (resolvedVal.startsWith('[') && resolvedVal.endsWith(']')) {
        const inner = resolvedVal.slice(1, -1).trim();
        if (!inner)
            return [];
        const items = [];
        let current = "", depth = 0, inQuotes = false;
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
        const results = [];
        for (const item of items) {
            const parsed = parseValue(item, vars, currentDir, importStack);
            if (parsed && typeof parsed === 'object' && parsed.__lacon_spread__) {
                const spreadValue = parsed.value;
                if (Array.isArray(spreadValue))
                    results.push(...spreadValue);
                else if (typeof spreadValue === 'object' && spreadValue !== null)
                    results.push(...Object.values(spreadValue));
                else
                    results.push(spreadValue);
            }
            else {
                results.push(parsed);
            }
        }
        return results;
    }
    if (/^-?\d+(\.\d+)?$/.test(resolvedVal))
        return Number(resolvedVal);
    return unescapeString(resolvedVal);
}
function parseInlinePairs(text, target, vars, overwrite, currentDir, importStack) {
    const trimmedText = text.trim();
    if (!trimmedText)
        return;
    if (trimmedText.startsWith('@import')) {
        const imported = parseValue(trimmedText, vars, currentDir, importStack);
        if (imported && typeof imported === 'object' && imported.__lacon_spread__) {
            Object.assign(target, imported.value);
        }
        else if (typeof imported === 'object' && imported !== null) {
            Object.assign(target, imported);
        }
        return;
    }
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
    if (trimmedText.includes('=')) {
        const keyPositions = [];
        const findKeysRegex = /(?:^|\s+)([\p{L}\d._-]+|\[[\p{L}\d\s,.*_-]+\]|@import(?:\.\.\.)?)\s*=/gu;
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
                    const imported = parseValue(fullCmd, vars, currentDir, importStack);
                    if (imported?.__lacon_spread__)
                        Object.assign(currentTarget, imported.value);
                    else
                        Object.assign(currentTarget, imported);
                }
                else if (cur.isMulti) {
                    assignMultiValues(currentTarget, cur.key.split(',').map((k) => k.trim()), rawVal, vars, currentDir, importStack);
                }
                else {
                    const parsed = parseValue(rawVal, vars, currentDir, importStack);
                    if (parsed && typeof parsed === 'object' && parsed.__lacon_spread__) {
                        if (typeof parsed.value === 'object' && !Array.isArray(parsed.value))
                            Object.assign(currentTarget, parsed.value);
                        else
                            currentTarget[cur.key] = parsed.value;
                    }
                    else {
                        currentTarget[cur.key] = parsed;
                    }
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
        const remaining = trimmedText.substring(firstSpaceIndex).trim();
        if (remaining.includes('=') && !remaining.startsWith('[') && !remaining.startsWith('"')) {
            ensureObject(target, key);
            parseInlinePairs(remaining, target[key], vars, overwrite, currentDir, importStack);
        }
        else {
            const parsed = parseValue(remaining, vars, currentDir, importStack);
            if (parsed && typeof parsed === 'object' && parsed.__lacon_spread__) {
                target[key] = parsed.value;
            }
            else {
                target[key] = parsed;
            }
        }
    }
}
function processComplexLine(line, scope, vars, currentDir, importStack) {
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
            appendValue(current, pathParts[pathParts.length - 1], valueToAppend, vars, currentDir, importStack);
        }
        else {
            appendValue(scope, keyPath, valueToAppend, vars, currentDir, importStack);
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
        const isAssignment = !lastPart.endsWith('{}') && !lastPart.endsWith('[]') && (lastPart.includes('=') || lastPart.includes(' '));
        parseInlinePairs(lastPart, current, vars, isAssignment, currentDir, importStack);
        return;
    }
    parseInlinePairs(line, scope, vars, true, currentDir, importStack);
}
function unescapeString(str) {
    if (!str)
        return str;
    return str.replace(/\\(n|r|t|b|f|"|\\|\$|~|u\{([0-9A-Fa-f]+)\})/g, (match, type, unicodeCode) => {
        if (type.startsWith('u{'))
            return String.fromCodePoint(parseInt(unicodeCode, 16));
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
function ensureObject(parent, key) {
    if (typeof parent[key] !== 'object' || parent[key] === null || Array.isArray(parent[key]))
        parent[key] = {};
}
function appendValue(target, key, value, vars, currentDir, importStack) {
    const parsed = parseValue(value, vars, currentDir, importStack);
    if (!(key in target)) {
        target[key] = parsed;
        return;
    }
    if (Array.isArray(target[key])) {
        if (parsed && parsed.__lacon_spread__ && Array.isArray(parsed.value))
            target[key].push(...parsed.value);
        else
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
function assignMultiValues(target, keys, rawValue, vars, currentDir, importStack) {
    const parsed = parseValue(rawValue, vars, currentDir, importStack);
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
    const actualValue = (parsed && parsed.__lacon_spread__) ? parsed.value : parsed;
    if (Array.isArray(actualValue) && actualValue.length === processedKeys.length) {
        processedKeys.forEach((k, idx) => { target[k] = actualValue[idx]; });
    }
    else {
        processedKeys.forEach(k => { target[k] = actualValue; });
    }
}
function isBalanced(text) {
    let brackets = 0, braces = 0, inQuotes = false;
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
    return lines.map(l => (l.length >= actualMin ? l.substring(actualMin) : l.trim())).join('\n').trim();
}
function processQuotedMultiline(lines) {
    return lines.filter(l => l.trim().length > 0).map(l => {
        let p = l.trim();
        if (p.endsWith(','))
            p = p.slice(0, -1).trim();
        return unwrapQuotes(p);
    }).join('\n');
}
function resolveVariables(value, vars) {
    if (!value)
        return value;
    return value.replace(/(?<!\\)\$([\p{L}\d._-]+)(~?)/gu, (match, varName) => {
        return vars[varName] !== undefined ? vars[varName] : match;
    });
}
function unwrapQuotes(val) {
    if (val.startsWith('"') && val.endsWith('"'))
        return val.slice(1, -1);
    return val;
}
//# sourceMappingURL=laconToJson.js.map