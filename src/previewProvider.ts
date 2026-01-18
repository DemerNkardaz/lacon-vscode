import * as vscode from 'vscode';
import { laconToJson } from './laconToJson';

export class LaconJsonProvider implements vscode.TextDocumentContentProvider {
    static scheme = 'lacon-json';
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    readonly onDidChange = this._onDidChange.event;

    update(uri: vscode.Uri) {
        this._onDidChange.fire(uri);
    }

    provideTextDocumentContent(uri: vscode.Uri): string {
        const sourceUri = vscode.Uri.parse(uri.query);
        const document = vscode.workspace.textDocuments.find(d => d.uri.toString() === sourceUri.toString());
        
        if (!document) return '{ "error": "Source document not found" }';
        
        try {
            return laconToJson(document.getText());
        } catch (e) {
            return JSON.stringify({ error: "Parser error", details: String(e) }, null, 2);
        }
    }
}