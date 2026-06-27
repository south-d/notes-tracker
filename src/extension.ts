import * as vscode from 'vscode';
import { addQuarter, toggleDone } from './commands';
import { disposeDecorations, updateDecorations } from './decorations';
import { registerHoverProvider } from './hover';
import { registerDocumentLinkProvider } from './links';
import { applyDateLineUpdates, recalculateDocument } from './recalculate';
import { disposeStatusBar, updateStatusBar } from './statusBar';

function refreshUi(editor: vscode.TextEditor | undefined): void {
	if (editor?.document.languageId === 'notes') {
		updateDecorations(editor);
	}
	updateStatusBar(editor);
}

export function activate(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('notes.toggleDone', () => {
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				return toggleDone(editor);
			}
		}),
		vscode.commands.registerCommand('notes.addQuarter', () => {
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				return addQuarter(editor);
			}
		}),
		vscode.commands.registerCommand('notes.recalculate', async () => {
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				await recalculateDocument(editor.document);
				refreshUi(editor);
			}
		}),
		vscode.workspace.onWillSaveTextDocument((event) => {
			if (event.document.languageId !== 'notes') {
				return;
			}
			event.waitUntil(
				applyDateLineUpdates(event.document).then(() => {
					const editor = vscode.window.activeTextEditor;
					if (editor?.document.uri.toString() === event.document.uri.toString()) {
						refreshUi(editor);
					}
				}),
			);
		}),
		vscode.window.onDidChangeActiveTextEditor(async (editor) => {
			if (editor?.document.languageId === 'notes') {
				await applyDateLineUpdates(editor.document);
			}
			refreshUi(editor);
		}),
		vscode.workspace.onDidChangeTextDocument((event) => {
			const editor = vscode.window.activeTextEditor;
			if (
				editor &&
				editor.document.uri.toString() === event.document.uri.toString() &&
				editor.document.languageId === 'notes'
			) {
				updateDecorations(editor);
			}
		}),
		vscode.window.onDidChangeTextEditorSelection((event) => {
			if (event.textEditor.document.languageId === 'notes') {
				updateDecorations(event.textEditor);
			}
		}),
		startRemainingTimer(context),
		registerHoverProvider(),
		registerDocumentLinkProvider(),
		{ dispose: () => { disposeDecorations(); disposeStatusBar(); } },
	);

	refreshUi(vscode.window.activeTextEditor);
	const editor = vscode.window.activeTextEditor;
	if (editor?.document.languageId === 'notes') {
		void applyDateLineUpdates(editor.document).then(() => refreshUi(editor));
	}
}

function startRemainingTimer(context: vscode.ExtensionContext): vscode.Disposable {
	const interval = setInterval(async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || editor.document.languageId !== 'notes') {
			return;
		}
		await applyDateLineUpdates(editor.document);
		refreshUi(editor);
	}, 60_000);

	return { dispose: () => clearInterval(interval) };
}

export function deactivate(): void {
	disposeDecorations();
	disposeStatusBar();
}
