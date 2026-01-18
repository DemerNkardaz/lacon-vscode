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
        this._onDidChange.fire(uri);
    }
    provideTextDocumentContent(uri) {
        const sourceUri = vscode.Uri.parse(uri.query);
        const document = vscode.workspace.textDocuments.find(d => d.uri.toString() === sourceUri.toString());
        if (!document)
            return '{ "error": "Source document not found" }';
        try {
            return (0, laconToJson_1.laconToJson)(document.getText());
        }
        catch (e) {
            return JSON.stringify({ error: "Parser error", details: String(e) }, null, 2);
        }
    }
}
exports.LaconJsonProvider = LaconJsonProvider;
LaconJsonProvider.scheme = 'lacon-json';
//# sourceMappingURL=previewProvider.js.map