import * as vscode from 'vscode';
import { formatNotesIndents } from './formatter';
import { computeDateLineUpdates } from './summarizer';

export async function applyDateLineUpdates(document: vscode.TextDocument): Promise<void> {
	if (document.languageId !== 'notes') {
		return;
	}

	const originalLines = document.getText().split(/\r?\n/);
	let lines = formatNotesIndents(originalLines);
	const updates = computeDateLineUpdates(lines);

	for (const update of updates) {
		lines[update.lineIndex] = update.newText;
	}

	const edit = new vscode.WorkspaceEdit();
	let hasChanges = false;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i] !== originalLines[i]) {
			const range = document.lineAt(i).range;
			edit.replace(document.uri, range, lines[i]);
			hasChanges = true;
		}
	}

	if (hasChanges) {
		await vscode.workspace.applyEdit(edit);
	}
}

export async function recalculateDocument(document: vscode.TextDocument): Promise<void> {
	await applyDateLineUpdates(document);
}
