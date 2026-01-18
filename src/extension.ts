import * as vscode from 'vscode';
import * as l10n from '@vscode/l10n';
import { laconToJson } from './laconToJson';
import { LaconJsonProvider } from './previewProvider';

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
    let timeout: NodeJS.Timeout | undefined = undefined;

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

    function getCharDetails(char: string, hex: string) {
        const codePoint = char.codePointAt(0) || 0;
        const md = new vscode.MarkdownString();
        md.isTrusted = true;
        md.supportHtml = true;

        let category = "Unknown";
        if (/\p{L}/u.test(char)) category = l10n.t("unicode.category.letter");
        else if (/\p{N}/u.test(char)) category = l10n.t("unicode.category.number");
        else if (/\p{P}/u.test(char)) category = l10n.t("unicode.category.punctuation");
        else if (/\p{S}/u.test(char)) category = l10n.t("unicode.category.symbol");
        else if (/\p{Z}/u.test(char)) category = l10n.t("unicode.category.separator");

        md.appendMarkdown(`${l10n.t("unicode.preview.title")}: U+${hex.toUpperCase()}\n\n---\n\n`);
        md.appendMarkdown(`<span style="font-size:40px;">${char}</span>\n\n`);
        md.appendMarkdown(`| ${l10n.t("unicode.property")} | ${l10n.t("unicode.value")} |\n`);
        md.appendMarkdown(`| :--- | :--- |\n`);
        md.appendMarkdown(`| **${l10n.t("unicode.category")}** | ${category} |\n`);
        md.appendMarkdown(`| **Dec** | ${codePoint} |\n`);
        md.appendMarkdown(`| **UTF-16** | \`\\u${codePoint.toString(16).padStart(4, '0')}\` |\n`);
        md.appendMarkdown(`| **HTML** | \`&#${codePoint};\` |\n`);

        return md;
    }

    function getVarDetails(name: string, info: { value: string, line: number, doc?: string }) {
        const md = new vscode.MarkdownString();
        md.isTrusted = true;
        md.appendMarkdown(`${l10n.t("var.title")}$${name}\n\n---\n\n`);
        if (info.doc) md.appendMarkdown(`${info.doc}\n\n---\n\n`);
        md.appendMarkdown(`| ${l10n.t("unicode.property")} | ${l10n.t("unicode.value")} |\n`);
        md.appendMarkdown(`| :--- | :--- |\n`);
        md.appendMarkdown(`| **${l10n.t("var.current")}** | \`${info.value}\` |\n`);
        md.appendMarkdown(`| **${l10n.t("var.defined")}** | ${l10n.t("var.line")} ${info.line + 1} |\n`);
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


    function updateDecorations() {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== LANG_ID) return;

        const text = editor.document.getText();
        const decorations: vscode.DecorationOptions[] = [];
        const selections = editor.selections;
        const activeLines = new Set(selections.map(s => s.active.line));
        const embeddedRanges = getEmbeddedLanguageRanges(text);

        variables.clear();

        const combinedRegex = /(?:\/\*\*([\s\S]*?)\*\/[\r\n\s]*)?^\$([\p{L}_](?:[\p{L}0-9._-]*[\p{L}0-9_])?)\s+(.+)$/gum;
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
            if (isInEmbeddedLanguage(m.index, embeddedRanges)) continue;
            const startPos = editor.document.positionAt(m.index);
            const range = new vscode.Range(startPos, editor.document.positionAt(m.index + m[0].length));
            if (activeLines.has(startPos.line)) {
                shouldShowHover = true;
            } else {
                try {
                    const char = String.fromCodePoint(parseInt(m[1], 16));
                    decorations.push({
                        range: range,
                        renderOptions: { before: { contentText: char, color: new vscode.ThemeColor('charts.blue'), backgroundColor: 'rgba(0, 122, 204, 0.1)' } }
                    });
                } catch {}
            }
        }

        const varUsageRegEx = /\$([\p{L}_](?:[\p{L}0-9._-]*[\p{L}0-9_])?)(~?)/gum;
        while ((m = varUsageRegEx.exec(text))) {
            if (isInEmbeddedLanguage(m.index, embeddedRanges)) continue;
            const varName = m[1];
            const hasGlue = m[2] === '~';
            const startPos = editor.document.positionAt(m.index);
            const range = new vscode.Range(startPos, editor.document.positionAt(m.index + m[0].length));
            const varInfo = variables.get(varName);

            if (activeLines.has(startPos.line)) {
                shouldShowHover = true;
            } else if (varInfo && startPos.line > varInfo.line) {
                decorations.push({
                    range: range,
                    renderOptions: { before: { contentText: varInfo.value, color: new vscode.ThemeColor('symbolIcon.variableForeground'), fontStyle: 'italic', backgroundColor: 'rgba(128, 128, 128, 0.1)' } }
                });
            }
        }

        editor.setDecorations(concealDecorationType, decorations);
        if (shouldShowHover) {
            Promise.resolve().then(() => vscode.commands.executeCommand('editor.action.showHover'));
        }
    }

    function triggerUpdate() {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            updateDecorations();
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === LANG_ID) {
                jsonProvider.update(getVirtualUri(editor.document.uri));
            }
        }, 50);
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
                const unicodeRegEx = /\\u\{([0-9a-fA-F]+)\}/g;
                while ((m = unicodeRegEx.exec(lineText)) !== null) {
                    const range = new vscode.Range(position.line, m.index, position.line, m.index + m[0].length);
                    if (range.contains(position)) return new vscode.Hover(getCharDetails(String.fromCodePoint(parseInt(m[1], 16)), m[1]), range);
                }

                const varUsageRegEx = /\$([\p{L}_](?:[\p{L}0-9._-]*[\p{L}0-9_])?)(~?)/gum;
                while ((m = varUsageRegEx.exec(lineText)) !== null) {
                    const range = new vscode.Range(position.line, m.index, position.line, m.index + m[0].length);
                    if (range.contains(position)) {
                        const info = variables.get(m[1]);
                        if (info && position.line > info.line) return new vscode.Hover(getVarDetails(m[1], info), range);
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
            if (e.document.languageId === LANG_ID) triggerUpdate();
        }),
        vscode.window.onDidChangeTextEditorSelection(e => {
            if (e.textEditor.document.languageId === LANG_ID) triggerUpdate();
        })
    );

    triggerUpdate();
}

export function deactivate() {}