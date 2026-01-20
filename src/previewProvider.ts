import * as vscode from 'vscode';
import { laconToJson } from './laconToJson';

export class LaconJsonProvider implements vscode.TextDocumentContentProvider {
	static scheme = 'lacon-json';
	private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
	readonly onDidChange = this._onDidChange.event;

	update(uri: vscode.Uri) {
		setImmediate(() => {
			this._onDidChange.fire(uri);
		});
	}

	provideTextDocumentContent(uri: vscode.Uri): string {
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
			return laconToJson(document.getText(), document.uri.fsPath);
		} catch (e: any) {
			return JSON.stringify({
				error: "Parser error",
				message: e.message || String(e),
				details: "Check if all @import paths are correct and there are no circular dependencies."
			}, null, 2);
		}
	}
}