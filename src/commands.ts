import * as vscode from 'vscode';
import { addQuarterToTask, parseTaskLine, toggleTaskDone } from './parser';
import { applyDateLineUpdates } from './recalculate';

export async function toggleDone(editor: vscode.TextEditor): Promise<void> {
	const document = editor.document;
	const lineIndex = editor.selection.active.line;
	const line = document.lineAt(lineIndex).text;

	const toggled = toggleTaskDone(line);
	if (toggled === null) {
		await vscode.commands.executeCommand('editor.action.commentLine');
		return;
	}

	const edit = new vscode.WorkspaceEdit();
	edit.replace(document.uri, document.lineAt(lineIndex).range, toggled);
	await vscode.workspace.applyEdit(edit);
	await applyDateLineUpdates(document);
}

export async function addQuarter(editor: vscode.TextEditor): Promise<void> {
	const document = editor.document;
	const lineIndex = editor.selection.active.line;
	const line = document.lineAt(lineIndex).text;

	if (!parseTaskLine(line)) {
		vscode.window.showInformationMessage('Place the cursor on a task line (- ...)');
		return;
	}

	const updated = addQuarterToTask(line);
	if (updated === null) {
		return;
	}

	const edit = new vscode.WorkspaceEdit();
	edit.replace(document.uri, document.lineAt(lineIndex).range, updated);
	await vscode.workspace.applyEdit(edit);
	await applyDateLineUpdates(document);
}
