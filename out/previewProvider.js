"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaconJsonProvider = void 0;
const vscode = require("vscode");
const laconToJson_1 = require("./laconToJson");
class LaconJsonProvider {
    constructor() {
        this._onDidChange = new vscode.EventEmitter();
        this.onDidChange = this._onDidChange.event;
    }
    update(uri) {
        setImmediate(() => {
            this._onDidChange.fire(uri);
        });
    }
    provideTextDocumentContent(uri) {
        const sourceUriString = decodeURIComponent(uri.query);
        const sourceUri = vscode.Uri.parse(sourceUriString);
        const document = vscode.workspace.textDocuments.find(d => d.uri.toString() === sourceUri.toString());
        if (!document) {
            return JSON.stringify({
                error: "Source document not found in workspace",
                uri: sourceUri.toString()
            }, null, 2);
        }
        try {
            return (0, laconToJson_1.laconToJson)(document.getText(), document.uri.fsPath);
        }
        catch (e) {
            return JSON.stringify({
                error: "Parser error",
                message: e.message || String(e),
                details: "Check if all @import paths are correct and there are no circular dependencies."
            }, null, 2);
        }
    }
}
exports.LaconJsonProvider = LaconJsonProvider;
LaconJsonProvider.scheme = 'lacon-json';
//# sourceMappingURL=previewProvider.js.map