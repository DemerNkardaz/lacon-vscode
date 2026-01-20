import * as vscode from 'vscode';
import * as l10n from '@vscode/l10n';
import { LaconJsonProvider } from './previewProvider';
import { parseEmitDirective } from './laconToJson/emit-parser';
import { parseFunctionCall, executeFunctionCall } from './laconToJson/function-parser';

export async function activate(context: vscode.ExtensionContext) {
    const locale = vscode.env.language;
    const l10nDir = vscode.Uri.joinPath(context.extensionUri, 'l10n');
    let l10nFile = vscode.Uri.joinPath(l10nDir, 'bundle.l10n.json');

    if (locale !== 'en') {
        const specificFile = vscode.Uri.joinPath(l10nDir, `bundle.l10n.${locale}.json`);
        try {
            await vscode.workspace.fs.stat(specificFile);
            l10nFile = specificFile;
        } catch {
            console.log(`Localization for "${locale}" not found, falling back to English.`);
        }
    }

    try {
        await l10n.config({ uri: l10nFile.toString() });
    } catch (e) {
        console.error("Critical error loading l10n:", e);
    }

    const LANG_ID = 'lacon';
    const jsonProvider = new LaconJsonProvider();
    const variables = new Map<string, { value: string, line: number, doc?: string }>();
    const localVariables = new Map<number, Map<string, string>>(); // line -> var map
    
    let decorationTimeout: NodeJS.Timeout | undefined = undefined;
    let previewTimeout: NodeJS.Timeout | undefined = undefined;
    let lastText = "";

    const concealDecorationType = vscode.window.createTextEditorDecorationType({
        textDecoration: 'none; display: none;',
        cursor: 'pointer'
    });

    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider(LaconJsonProvider.scheme, jsonProvider)
    );

    function getVirtualUri(laconUri: vscode.Uri): vscode.Uri {
        return vscode.Uri.parse(`${LaconJsonProvider.scheme}:Preview.json?${encodeURIComponent(laconUri.toString())}`);
    }

    function replaceUnicodeSequences(text: string): string {
        return text.replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) => {
            try {
                return String.fromCodePoint(parseInt(hex, 16));
            } catch {
                return _;
            }
        });
    }

    function getCharTableMarkdown(char: string, hex: string): string {
        const codePoint = char.codePointAt(0) || 0;
        let category = "Unknown";
        if (/\p{L}/u.test(char)) category = l10n.t("unicode.category.letter");
        else if (/\p{N}/u.test(char)) category = l10n.t("unicode.category.number");
        else if (/\p{P}/u.test(char)) category = l10n.t("unicode.category.punctuation");
        else if (/\p{S}/u.test(char)) category = l10n.t("unicode.category.symbol");
        else if (/\p{Z}/u.test(char)) category = l10n.t("unicode.category.separator");

        let table = `| ${l10n.t("property")} | ${l10n.t("value")} |\n`;
        table += `| :--- | :--- |\n`;
        table += `| **${l10n.t("unicode.category")}** | ${category} |\n`;
        table += `| **Dec** | ${codePoint} |\n`;
        table += `| **UTF-16** | \`\\u${codePoint.toString(16).padStart(4, '0')}\` |\n`;
        table += `| **HTML** | \`&#${codePoint};\` |\n`;
        return table;
    }

    function getCharDetails(char: string, hex: string) {
        const md = new vscode.MarkdownString();
        md.isTrusted = true;
        md.supportHtml = true;
        md.appendMarkdown(`${l10n.t("unicode.preview.title")}: U+${hex.toUpperCase()}\n\n---\n\n`);
        md.appendMarkdown(`# ${char}\n\n`);
        md.appendMarkdown(getCharTableMarkdown(char, hex));
        return md;
    }

    function getVarDetails(name: string, info: { value: string, line: number, doc?: string }) {
        const md = new vscode.MarkdownString();
        md.isTrusted = true;
        md.supportHtml = true;
        const displayValue = replaceUnicodeSequences(info.value);
        md.appendMarkdown(`${l10n.t("var.title")}$${name}\n\n---\n\n`);
        if (info.doc) md.appendMarkdown(`${info.doc}\n\n---\n\n`);
        md.appendMarkdown(`| ${l10n.t("property")} | ${l10n.t("value")} |\n`);
        md.appendMarkdown(`| :--- | :--- |\n`);
        md.appendMarkdown(`| **${l10n.t("var.current")}** | \`${displayValue}\` |\n`);
        md.appendMarkdown(`| **${l10n.t("var.defined")}** | ${l10n.t("var.line")} ${info.line + 1} |\n\n`);

        const trimmedValue = info.value.replace(/^["']|["']$/g, '').trim();
        const unicodeMatch = trimmedValue.match(/^\\u\{([0-9a-fA-F]+)\}$/);
        if (unicodeMatch) {
            const hex = unicodeMatch[1];
            const char = String.fromCodePoint(parseInt(hex, 16));
            md.appendMarkdown(`---\n\n`);
            md.appendMarkdown(`${l10n.t("unicode.preview.title")}: U+${hex.toUpperCase()}\n\n`);
            md.appendMarkdown(`# ${char}\n\n`);
            md.appendMarkdown(getCharTableMarkdown(char, hex));
        }
        return md;
    }

    function getEmbeddedLanguageRanges(text: string): Array<{ start: number, end: number }> {
        const ranges: Array<{ start: number, end: number }> = [];
        const embeddedRegex = /\/\*\*\s*(json|javascript|js|typescript|ts|python|py|css|html|xml|yaml|yml|sql|markdown|md|regex|regexp|shell|bash|sh)\s*\n([\s\S]*?)\*\//gi;
        let match;
        while ((match = embeddedRegex.exec(text)) !== null) {
            ranges.push({ start: match.index, end: match.index + match[0].length });
        }
        return ranges;
    }

    function isInEmbeddedLanguage(position: number, ranges: Array<{ start: number, end: number }>): boolean {
        return ranges.some(range => position >= range.start && position < range.end);
    }

    function updateDecorations(onlyCursorMove: boolean = false) {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== LANG_ID) return;

        const text = editor.document.getText();
        const embeddedRanges = getEmbeddedLanguageRanges(text);

        if (!onlyCursorMove || text !== lastText) {
            variables.clear();
            localVariables.clear();
            
            // Сбор глобальных переменных
            const combinedRegex = /(?:\/\*\*([\s\S]*?)\*\/[\r\n\s]*)?^(?<!\\)\$([\p{L}_](?:[\p{L}0-9._-]*[\p{L}0-9_])?)(?:\s*=\s*|\s+)(.+)$/gum;
            let match;
            while ((match = combinedRegex.exec(text))) {
                const rawDoc = match[1];
                const varName = match[2];
                const varValue = match[3].trim();
                const line = editor.document.positionAt(match.index + (match[0].indexOf('$'))).line;
                let cleanDoc = rawDoc ? rawDoc.split('\n').map(l => l.replace(/^\s*\* ?/, '').trim()).filter(l => l !== '').join('\n') : undefined;
                variables.set(varName, { value: varValue, line: line, doc: cleanDoc });
            }
            
            // Сбор локальных переменных из <emit> директив и их дочерних элементов
            const lines = text.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes('<emit:')) {
                    const directive = parseEmitDirective(line);
                    if (directive && directive.localVar) {
                        // Вычисляем первое значение локальной переменной
                        let firstValue: string;
                        if (!directive.localVarExpr || directive.localVarExpr.trim() === '@current') {
                            // Форматируем в зависимости от isHex
                            if (directive.isHex) {
                                firstValue = directive.start.toString(16).toUpperCase().padStart(4, '0');
                            } else {
                                firstValue = directive.start.toString();
                            }
                        } else {
                            // Выполняем выражение для первой итерации
                            const globalVarsObj: Record<string, string> = {};
                            variables.forEach((info, name) => {
                                globalVarsObj[name] = info.value;
                            });
                            firstValue = executeFunctionCall(directive.localVarExpr, globalVarsObj, directive.start) || directive.localVarExpr;
                        }
                        
                        // Находим все строки блока emit
                        const baseIndent = line.match(/^(\s*)/)?.[1].length || 0;
                        const hasOpenBrace = directive.restOfLine.trim().endsWith('{');
                        
                        if (hasOpenBrace) {
                            // Это блок - помечаем все дочерние строки до закрывающей скобки
                            let j = i + 1;
                            while (j < lines.length) {
                                const childLine = lines[j];
                                const childIndent = childLine.match(/^(\s*)/)?.[1].length || 0;
                                
                                if (childLine.trim() === '}' && childIndent === baseIndent) {
                                    break;
                                }
                                
                                // Создаём или обновляем map для этой строки
                                if (!localVariables.has(j)) {
                                    localVariables.set(j, new Map());
                                }
                                localVariables.get(j)!.set(directive.localVar, firstValue);
                                j++;
                            }
                        }
                        
                        // Помечаем саму строку с emit
                        const lineVars = new Map<string, string>();
                        lineVars.set(directive.localVar, firstValue);
                        localVariables.set(i, lineVars);
                    }
                }
            }
            
            lastText = text;
        }

        const decorations: vscode.DecorationOptions[] = [];
        const selections = editor.selections;
        const activeLines = new Set(selections.map(s => s.active.line));

        const unicodeRegEx = /\\u\{([0-9a-fA-F]+)\}/g;
        const varUsageRegEx = /(?<!\\)\$([\p{L}_](?:[\p{L}0-9._-]*[\p{L}0-9_])?)(~?)/gum;
        const emitRegEx = /<emit:\s*(.+?)\s+to\s+([+-])(\d+)(?:\s+as\s+local\s+(\$[\w-]+)\s*=\s*(.+?))?>/g;
        const functionRegEx = /@f\(([^"]+),\s([^)]+)\)/g;

        for (const visibleRange of editor.visibleRanges) {
            const startLine = Math.max(0, visibleRange.start.line - 5);
            const endLine = Math.min(editor.document.lineCount - 1, visibleRange.end.line + 5);

            for (let i = startLine; i <= endLine; i++) {
                if (activeLines.has(i)) continue;

                const line = editor.document.lineAt(i);
                const lineOffset = editor.document.offsetAt(line.range.start);
                
                if (isInEmbeddedLanguage(lineOffset, embeddedRanges)) continue;

                let m;
                
                // Декоратор для <emit>
                const isEmitLine = line.text.includes('<emit:');
                if (isEmitLine) {
                    const directive = parseEmitDirective(line.text);
                    if (directive) {
                        const count = directive.end - directive.start;
                        let startStr, endStr;
                        
                        if (directive.isHex) {
                            startStr = directive.start.toString(16).toUpperCase().padStart(4, '0');
                            endStr = (directive.end - 1).toString(16).toUpperCase().padStart(4, '0');
                        } else {
                            startStr = directive.start.toString();
                            endStr = (directive.end - 1).toString();
                        }
                        
                        const label = `${count} ${l10n.t("emit.entries")} ${startStr}-${endStr}`;
                        
                        const emitStart = line.text.indexOf('<emit:');
                        const emitEnd = line.text.indexOf('>', emitStart) + 1;
                        
                        decorations.push({
                            range: new vscode.Range(i, emitStart, i, emitEnd),
                            renderOptions: {
                                after: {
																		contentText: label,
                                    fontStyle: 'normal',
                                    color: '#ff57f4',
                                    textDecoration: 'none; font-family: sans-serif; display: inline-block; text-align: center; border-radius: 3px; padding: 0 0.9em; line-height: 1.135em; vertical-align: middle;',
                                    backgroundColor: 'rgba(255, 87, 244, 0.15)',
                                    border: '1px solid #ff57f4',
                                    margin: '0 2px',
                                }
                            }
                        });
                    }
                }
                
                // Декоратор для @f функций (не внутри <emit>)
                if (!isEmitLine) {
                    functionRegEx.lastIndex = 0;
                    while ((m = functionRegEx.exec(line.text))) {
                        try {
                            const globalVarsObj: Record<string, string> = {};
                            variables.forEach((info, name) => {
                                globalVarsObj[name] = info.value;
                            });
                            const result = executeFunctionCall(m[0], globalVarsObj);
                            
                            decorations.push({
                                range: new vscode.Range(i, m.index, i, m.index + m[0].length),
                                renderOptions: {
                                    after: {
                                        contentText: result,
                                        color: '#ff57a3',
                                        fontStyle: 'italic',
                                        textDecoration: 'none; font-family: sans-serif; display: inline-block; text-align: center; border-radius: 3px; padding: 0 0.9em; line-height: 1.135em; vertical-align: middle;',
                                        backgroundColor: 'rgba(255, 106, 153, 0.15)',
                                        border: '1px solid #ff57a3',
                                        margin: '0 2px',
                                    }
                                }
                            });
                        } catch {}
                    }
                }
                
                // Декоратор для Unicode
                unicodeRegEx.lastIndex = 0;
                while ((m = unicodeRegEx.exec(line.text))) {
                    const charRange = new vscode.Range(i, m.index, i, m.index + m[0].length);
                    try {
                        const char = String.fromCodePoint(parseInt(m[1], 16));
                        decorations.push({
                            range: charRange,
                            renderOptions: {
                                after: {
                                    contentText: char,
                                    color: '#eae059',
                                    textDecoration: 'none; font-family: sans-serif; display: inline-block; text-align: center; border-radius: 3px; padding: 0 0.9em; line-height: 1.135em; vertical-align: middle;',
                                    backgroundColor: 'rgba(234, 224, 89, 0.15)',
                                    border: '1px solid #eae059',
                                    margin: '0 2px',
                                }
                            }
                        });
                    } catch {}
                }

                // Декораторы для переменных
                varUsageRegEx.lastIndex = 0;
                while ((m = varUsageRegEx.exec(line.text))) {
                    const varName = m[1];
                    
                    // Проверяем, это локальная переменная?
                    const lineLocals = localVariables.get(i);
                    const isLocal = lineLocals && lineLocals.has(varName);
                    
                    if (isLocal) {
                        // Локальная переменная - фиолетовый декоратор с значением
                        const localValue = lineLocals.get(varName) || '(local)';
                        decorations.push({
                            range: new vscode.Range(i, m.index, i, m.index + m[0].length),
                            renderOptions: {
                                after: {
                                    contentText: localValue,
                                    color: '#ff57f4',
                                    fontStyle: 'italic',
                                    textDecoration: 'none; font-family: sans-serif; display: inline-block; text-align: center; border-radius: 3px; padding: 0 0.9em; line-height: 1.135em; vertical-align: middle;',
                                    backgroundColor: 'rgba(255, 87, 244, 0.15)',
                                    border: '1px solid #ff57f4',
                                    margin: '0 2px',
                                }
                            }
                        });
                    } else {
                        // Глобальная переменная - синий декоратор
                        const varInfo = variables.get(varName);
                        if (varInfo && i > varInfo.line) {
                            const displayValue = replaceUnicodeSequences(varInfo.value);
                            const hasCJK = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(displayValue);

                            decorations.push({
                                range: new vscode.Range(i, m.index, i, m.index + m[0].length),
                                renderOptions: {
                                    after: {
                                        contentText: displayValue,
                                        color: '#6a9fff',
                                        fontStyle: hasCJK ? 'normal' : 'italic',
                                        textDecoration: 'none; font-family: sans-serif; display: inline-block; text-align: center; border-radius: 3px; padding: 0 0.9em; line-height: 1.135em; vertical-align: middle;',
                                        backgroundColor: 'rgba(89, 147, 234, 0.15)',
                                        border: '1px solid #6a9fff',
                                        margin: '0 2px',
                                    }
                                }
                            });
                        }
                    }
                }
            }
        }
        editor.setDecorations(concealDecorationType, decorations);
    }

    function triggerPreviewUpdate() {
        if (previewTimeout) clearTimeout(previewTimeout);
        
        previewTimeout = setTimeout(() => {
            vscode.workspace.textDocuments.forEach(doc => {
                if (doc.uri.scheme === LaconJsonProvider.scheme) {
                    jsonProvider.update(doc.uri);
                }
            });
        }, 50);
    }

    function triggerUpdate(onlyCursorMove: boolean = false) {
        if (decorationTimeout) clearTimeout(decorationTimeout);
        const delay = onlyCursorMove ? 10 : 100;

        decorationTimeout = setTimeout(() => {
            updateDecorations(onlyCursorMove);
        }, delay);

        if (!onlyCursorMove) {
            triggerPreviewUpdate();
        }
    }

    const hoverProvider = vscode.languages.registerHoverProvider(
        { language: LANG_ID, scheme: 'file' },
        {
            provideHover(document, position) {
                const text = document.getText();
                const offset = document.offsetAt(position);
                const embeddedRanges = getEmbeddedLanguageRanges(text);
                if (isInEmbeddedLanguage(offset, embeddedRanges)) return null;

                const lineText = document.lineAt(position.line).text;
                let m;
                
                // Hover для <emit>
                if (lineText.includes('<emit:')) {
                    const directive = parseEmitDirective(lineText);
                    if (directive) {
                        const emitStart = lineText.indexOf('<emit:');
                        const emitEnd = lineText.indexOf('>', emitStart) + 1;
                        const range = new vscode.Range(position.line, emitStart, position.line, emitEnd);
                        if (range.contains(position)) {
                            const md = new vscode.MarkdownString();
                            md.isTrusted = true;
                            md.appendMarkdown(`${l10n.t("emit.title")}\n\n`);
                            md.appendMarkdown(`| ${l10n.t("property")} | ${l10n.t("value")} |\n`);
                            md.appendMarkdown(`| :--- | :--- |\n`);
                            md.appendMarkdown(`| **${l10n.t("emit.start")}** | 0x${directive.start.toString(16).toUpperCase()} (${directive.start}) |\n`);
                            md.appendMarkdown(`| **${l10n.t("emit.end")}** | 0x${(directive.end - 1).toString(16).toUpperCase()} (${directive.end - 1}) |\n`);
                            md.appendMarkdown(`| **${l10n.t("emit.count")}** | ${directive.end - directive.start} ${l10n.t("emit.entries")} |\n`);
                            md.appendMarkdown(`| **${l10n.t("emit.direction")}** | ${directive.direction === '+' ? `${l10n.t("increment")}` : `${l10n.t("decrement")}`} |\n`);
                            if (directive.localVar) {
                                md.appendMarkdown(`| **${l10n.t("emit.localVar")}** | \`$${directive.localVar}\` |\n`);
                                if (directive.localVarExpr) {
                                    md.appendMarkdown(`| **${l10n.t("emit.localVarExpr")}** | \`${directive.localVarExpr}\` |\n`);
                                }
                            }
                            return new vscode.Hover(md, range);
                        }
                    }
                }
                
                // Hover для @f функций
                const functionRegEx = /@f\(([^"]+),\s([^)]+)\)/g;
                while ((m = functionRegEx.exec(lineText)) !== null) {
                    const range = new vscode.Range(position.line, m.index, position.line, m.index + m[0].length);
                    if (range.contains(position)) {
                        const md = new vscode.MarkdownString();
                        md.isTrusted = true;
                        md.appendMarkdown(`### ${l10n.t("format.title")}\n\n`);
                        md.appendMarkdown(`| ${l10n.t("property")} | ${l10n.t("value")} |\n`);
                        md.appendMarkdown(`| :--- | :--- |\n`);
                        md.appendMarkdown(`| **${l10n.t("format.format")}** | \`${m[1]}\` |\n`);
                        md.appendMarkdown(`| **${l10n.t("format.value")}** | \`${m[2]}\` |\n`);
                        
                        try {
                            const globalVarsObj: Record<string, string> = {};
                            variables.forEach((info, name) => {
                                globalVarsObj[name] = info.value;
                            });
                            const result = executeFunctionCall(m[0], globalVarsObj);
                            md.appendMarkdown(`| **${l10n.t("format.result")}** | \`${result}\` |\n`);
                        } catch (e: any) {
                            md.appendMarkdown(`| **${l10n.t("error")}** | ${e.message} |\n`);
                        }
                        
                        return new vscode.Hover(md, range);
                    }
                }
                
                // Hover для Unicode
                const unicodeRegEx = /\\u\{([0-9a-fA-F]+)\}/g;
                while ((m = unicodeRegEx.exec(lineText)) !== null) {
                    const range = new vscode.Range(position.line, m.index, position.line, m.index + m[0].length);
                    if (range.contains(position)) {
                        return new vscode.Hover(getCharDetails(String.fromCodePoint(parseInt(m[1], 16)), m[1]), range);
                    }
                }

                // Hover для переменных
                const varUsageRegEx = /\$([\p{L}_](?:[\p{L}0-9._-]*[\p{L}0-9_])?)(~?)/gum;
                while ((m = varUsageRegEx.exec(lineText)) !== null) {
                    const range = new vscode.Range(position.line, m.index, position.line, m.index + m[0].length);
                    if (range.contains(position)) {
                        // Проверяем локальную переменную
                        const lineLocals = localVariables.get(position.line);
                        if (lineLocals && lineLocals.has(m[1])) {
                            const localValue = lineLocals.get(m[1]) || '';
                            const md = new vscode.MarkdownString();
                            md.isTrusted = true;
                            md.appendMarkdown(`${l10n.t("var.local.title")}$${m[1]}\n\n`);
                            md.appendMarkdown(`| ${l10n.t("property")} | ${l10n.t("value")} |\n`);
                            md.appendMarkdown(`| :--- | :--- |\n`);
                            md.appendMarkdown(`| **${l10n.t("type")}** | Local (emit) |\n`);
                            md.appendMarkdown(`| **${l10n.t("var.current")}** | \`${localValue}\` |\n`);
                            md.appendMarkdown(`\n${l10n.t("var.local.description")}\n`);
                            return new vscode.Hover(md, range);
                        }
                        
                        // Глобальная переменная
                        const info = variables.get(m[1]);
                        if (info && position.line > info.line) {
                            return new vscode.Hover(getVarDetails(m[1], info), range);
                        }
                    }
                }
                return null;
            }
        }
    );

    const toggleJsonCommand = vscode.commands.registerCommand('lacon.toggleJsonPreview', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== LANG_ID) return;

        const virtualUri = getVirtualUri(editor.document.uri);
        const doc = await vscode.workspace.openTextDocument(virtualUri);
        await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.Beside,
            preserveFocus: true,
            preview: true
        });
    });

    context.subscriptions.push(
        hoverProvider,
        toggleJsonCommand,
        vscode.window.onDidChangeActiveTextEditor(() => triggerUpdate()),
        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.languageId === LANG_ID) {
                triggerUpdate(false);
            }
        }),
        vscode.window.onDidChangeTextEditorSelection(e => {
            if (e.textEditor.document.languageId === LANG_ID) triggerUpdate(true);
        }),
        vscode.window.onDidChangeTextEditorVisibleRanges(e => {
            if (e.textEditor.document.languageId === LANG_ID) triggerUpdate(true);
        })
    );

    triggerUpdate();
}

export function deactivate() { }