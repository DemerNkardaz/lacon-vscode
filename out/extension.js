"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const l10n = require("@vscode/l10n");
const previewProvider_1 = require("./previewProvider");
async function activate(context) {
    const locale = vscode.env.language;
    const l10nDir = vscode.Uri.joinPath(context.extensionUri, 'l10n');
    let l10nFile = vscode.Uri.joinPath(l10nDir, 'bundle.l10n.json');
    if (locale !== 'en') {
        const specificFile = vscode.Uri.joinPath(l10nDir, `bundle.l10n.${locale}.json`);
        try {
            await vscode.workspace.fs.stat(specificFile);
            l10nFile = specificFile;
        }
        catch {
            console.log(`Localization for "${locale}" not found, falling back to English.`);
        }
    }
    try {
        await l10n.config({ uri: l10nFile.toString() });
    }
    catch (e) {
        console.error("Critical error loading l10n:", e);
    }
    const LANG_ID = 'lacon';
    const jsonProvider = new previewProvider_1.LaconJsonProvider();
    const variables = new Map();
    let decorationTimeout = undefined;
    let previewTimeout = undefined;
    let lastText = "";
    const concealDecorationType = vscode.window.createTextEditorDecorationType({
        textDecoration: 'none; display: none;',
        cursor: 'pointer'
    });
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(previewProvider_1.LaconJsonProvider.scheme, jsonProvider));
    function getVirtualUri(laconUri) {
        return vscode.Uri.parse(`${previewProvider_1.LaconJsonProvider.scheme}:Preview.json?${encodeURIComponent(laconUri.toString())}`);
    }
    function replaceUnicodeSequences(text) {
        return text.replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) => {
            try {
                return String.fromCodePoint(parseInt(hex, 16));
            }
            catch {
                return _;
            }
        });
    }
    function getCharTableMarkdown(char, hex) {
        const codePoint = char.codePointAt(0) || 0;
        let category = "Unknown";
        if (/\p{L}/u.test(char))
            category = l10n.t("unicode.category.letter");
        else if (/\p{N}/u.test(char))
            category = l10n.t("unicode.category.number");
        else if (/\p{P}/u.test(char))
            category = l10n.t("unicode.category.punctuation");
        else if (/\p{S}/u.test(char))
            category = l10n.t("unicode.category.symbol");
        else if (/\p{Z}/u.test(char))
            category = l10n.t("unicode.category.separator");
        let table = `| ${l10n.t("unicode.property")} | ${l10n.t("unicode.value")} |\n`;
        table += `| :--- | :--- |\n`;
        table += `| **${l10n.t("unicode.category")}** | ${category} |\n`;
        table += `| **Dec** | ${codePoint} |\n`;
        table += `| **UTF-16** | \`\\u${codePoint.toString(16).padStart(4, '0')}\` |\n`;
        table += `| **HTML** | \`&#${codePoint};\` |\n`;
        return table;
    }
    function getCharDetails(char, hex) {
        const md = new vscode.MarkdownString();
        md.isTrusted = true;
        md.supportHtml = true;
        md.appendMarkdown(`${l10n.t("unicode.preview.title")}: U+${hex.toUpperCase()}\n\n---\n\n`);
        md.appendMarkdown(`# ${char}\n\n`);
        md.appendMarkdown(getCharTableMarkdown(char, hex));
        return md;
    }
    function getVarDetails(name, info) {
        const md = new vscode.MarkdownString();
        md.isTrusted = true;
        md.supportHtml = true;
        const displayValue = replaceUnicodeSequences(info.value);
        md.appendMarkdown(`${l10n.t("var.title")}$${name}\n\n---\n\n`);
        if (info.doc)
            md.appendMarkdown(`${info.doc}\n\n---\n\n`);
        md.appendMarkdown(`| ${l10n.t("unicode.property")} | ${l10n.t("unicode.value")} |\n`);
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
    function getEmbeddedLanguageRanges(text) {
        const ranges = [];
        const embeddedRegex = /\/\*\*\s*(json|javascript|js|typescript|ts|python|py|css|html|xml|yaml|yml|sql|markdown|md|regex|regexp|shell|bash|sh)\s*\n([\s\S]*?)\*\//gi;
        let match;
        while ((match = embeddedRegex.exec(text)) !== null) {
            ranges.push({ start: match.index, end: match.index + match[0].length });
        }
        return ranges;
    }
    function isInEmbeddedLanguage(position, ranges) {
        return ranges.some(range => position >= range.start && position < range.end);
    }
    function updateDecorations(onlyCursorMove = false) {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== LANG_ID)
            return;
        const text = editor.document.getText();
        const embeddedRanges = getEmbeddedLanguageRanges(text);
        if (!onlyCursorMove || text !== lastText) {
            variables.clear();
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
            lastText = text;
        }
        const decorations = [];
        const selections = editor.selections;
        const activeLines = new Set(selections.map(s => s.active.line));
        const unicodeRegEx = /\\u\{([0-9a-fA-F]+)\}/g;
        const varUsageRegEx = /(?<!\\)\$([\p{L}_](?:[\p{L}0-9._-]*[\p{L}0-9_])?)(~?)/gum;
        for (const visibleRange of editor.visibleRanges) {
            const startLine = Math.max(0, visibleRange.start.line - 5);
            const endLine = Math.min(editor.document.lineCount - 1, visibleRange.end.line + 5);
            for (let i = startLine; i <= endLine; i++) {
                if (activeLines.has(i))
                    continue;
                const line = editor.document.lineAt(i);
                const lineOffset = editor.document.offsetAt(line.range.start);
                if (isInEmbeddedLanguage(lineOffset, embeddedRanges))
                    continue;
                let m;
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
                    }
                    catch { }
                }
                varUsageRegEx.lastIndex = 0;
                while ((m = varUsageRegEx.exec(line.text))) {
                    const varName = m[1];
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
        editor.setDecorations(concealDecorationType, decorations);
    }
    function triggerPreviewUpdate() {
        if (previewTimeout)
            clearTimeout(previewTimeout);
        previewTimeout = setTimeout(() => {
            vscode.workspace.textDocuments.forEach(doc => {
                if (doc.uri.scheme === previewProvider_1.LaconJsonProvider.scheme) {
                    jsonProvider.update(doc.uri);
                }
            });
        }, 50);
    }
    function triggerUpdate(onlyCursorMove = false) {
        if (decorationTimeout)
            clearTimeout(decorationTimeout);
        const delay = onlyCursorMove ? 10 : 100;
        decorationTimeout = setTimeout(() => {
            updateDecorations(onlyCursorMove);
        }, delay);
        if (!onlyCursorMove) {
            triggerPreviewUpdate();
        }
    }
    const hoverProvider = vscode.languages.registerHoverProvider({ language: LANG_ID, scheme: 'file' }, {
        provideHover(document, position) {
            const text = document.getText();
            const offset = document.offsetAt(position);
            const embeddedRanges = getEmbeddedLanguageRanges(text);
            if (isInEmbeddedLanguage(offset, embeddedRanges))
                return null;
            const lineText = document.lineAt(position.line).text;
            let m;
            const unicodeRegEx = /\\u\{([0-9a-fA-F]+)\}/g;
            while ((m = unicodeRegEx.exec(lineText)) !== null) {
                const range = new vscode.Range(position.line, m.index, position.line, m.index + m[0].length);
                if (range.contains(position)) {
                    return new vscode.Hover(getCharDetails(String.fromCodePoint(parseInt(m[1], 16)), m[1]), range);
                }
            }
            const varUsageRegEx = /\$([\p{L}_](?:[\p{L}0-9._-]*[\p{L}0-9_])?)(~?)/gum;
            while ((m = varUsageRegEx.exec(lineText)) !== null) {
                const range = new vscode.Range(position.line, m.index, position.line, m.index + m[0].length);
                if (range.contains(position)) {
                    const info = variables.get(m[1]);
                    if (info && position.line > info.line) {
                        return new vscode.Hover(getVarDetails(m[1], info), range);
                    }
                }
            }
            return null;
        }
    });
    const toggleJsonCommand = vscode.commands.registerCommand('lacon.toggleJsonPreview', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== LANG_ID)
            return;
        const virtualUri = getVirtualUri(editor.document.uri);
        const doc = await vscode.workspace.openTextDocument(virtualUri);
        await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.Beside,
            preserveFocus: true,
            preview: true
        });
    });
    context.subscriptions.push(hoverProvider, toggleJsonCommand, vscode.window.onDidChangeActiveTextEditor(() => triggerUpdate()), vscode.workspace.onDidChangeTextDocument(e => {
        if (e.document.languageId === LANG_ID) {
            triggerUpdate(false);
        }
    }), vscode.window.onDidChangeTextEditorSelection(e => {
        if (e.textEditor.document.languageId === LANG_ID)
            triggerUpdate(true);
    }), vscode.window.onDidChangeTextEditorVisibleRanges(e => {
        if (e.textEditor.document.languageId === LANG_ID)
            triggerUpdate(true);
    }));
    triggerUpdate();
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map