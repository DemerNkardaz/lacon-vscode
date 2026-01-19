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
    let timeout = undefined;
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
        md.appendMarkdown(`<span style="font-size:40px;">${char}</span>\n\n`);
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
            md.appendMarkdown(`### ${l10n.t("unicode.preview.title")}: U+${hex.toUpperCase()}\n\n`);
            md.appendMarkdown(`<span style="font-size:30px;">${char}</span>\n\n`);
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
    function updateDecorations() {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== LANG_ID)
            return;
        const text = editor.document.getText();
        const decorations = [];
        const selections = editor.selections;
        const activeLines = new Set(selections.map(s => s.active.line));
        const embeddedRanges = getEmbeddedLanguageRanges(text);
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
        const unicodeRegEx = /\\u\{([0-9a-fA-F]+)\}/g;
        let m;
        let shouldShowHover = false;
        while ((m = unicodeRegEx.exec(text))) {
            if (isInEmbeddedLanguage(m.index, embeddedRanges))
                continue;
            const startPos = editor.document.positionAt(m.index);
            const range = new vscode.Range(startPos, editor.document.positionAt(m.index + m[0].length));
            if (activeLines.has(startPos.line)) {
                shouldShowHover = true;
            }
            else {
                try {
                    const char = String.fromCodePoint(parseInt(m[1], 16));
                    decorations.push({
                        range: range,
                        renderOptions: {
                            before: {
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
        }
        const varUsageRegEx = /(?<!\\)\$([\p{L}_](?:[\p{L}0-9._-]*[\p{L}0-9_])?)(~?)/gum;
        while ((m = varUsageRegEx.exec(text))) {
            if (isInEmbeddedLanguage(m.index, embeddedRanges))
                continue;
            const varName = m[1];
            const startPos = editor.document.positionAt(m.index);
            const range = new vscode.Range(startPos, editor.document.positionAt(m.index + m[0].length));
            const varInfo = variables.get(varName);
            if (activeLines.has(startPos.line)) {
                shouldShowHover = true;
            }
            else if (varInfo && startPos.line > varInfo.line) {
                const displayValue = replaceUnicodeSequences(varInfo.value);
                const hasCJK = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(displayValue);
                decorations.push({
                    range: range,
                    renderOptions: {
                        before: {
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
        editor.setDecorations(concealDecorationType, decorations);
        if (shouldShowHover) {
            Promise.resolve().then(() => vscode.commands.executeCommand('editor.action.showHover'));
        }
    }
    function triggerUpdate() {
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(() => {
            updateDecorations();
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === LANG_ID) {
                jsonProvider.update(getVirtualUri(editor.document.uri));
            }
        }, 50);
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
        if (e.document.languageId === LANG_ID)
            triggerUpdate();
    }), vscode.window.onDidChangeTextEditorSelection(e => {
        if (e.textEditor.document.languageId === LANG_ID)
            triggerUpdate();
    }));
    triggerUpdate();
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map