import * as vscode from 'vscode';
import {
	computeBlockTimeStats,
	computeRemainingMinutes,
	findDayBlocks,
	isToday,
	parseBlockDate,
} from './parser';
import { formatMinutes, formatRemaining } from './format';

let statusBarItem: vscode.StatusBarItem | undefined;

function findDisplayBlock(lines: string[]) {
	const blocks = findDayBlocks(lines);
	if (blocks.length === 0) {
		return undefined;
	}
	const now = new Date();
	const todayBlock = blocks.find((block) => {
		const date = parseBlockDate(block.parsed.datePart);
		return date && isToday(date, now);
	});
	return todayBlock ?? blocks[blocks.length - 1];
}

export function updateStatusBar(editor: vscode.TextEditor | undefined): void {
	if (!statusBarItem) {
		statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		statusBarItem.name = 'Notes Tracker';
	}

	if (!editor || editor.document.languageId !== 'notes') {
		statusBarItem.hide();
		return;
	}

	const lines = editor.document.getText().split(/\r?\n/);
	const block = findDisplayBlock(lines);
	if (!block) {
		statusBarItem.text = '$(notebook) Notes';
		statusBarItem.show();
		return;
	}

	const stats = computeBlockTimeStats(lines, block);
	const blockDate = parseBlockDate(block.parsed.datePart);
	const remainingMinutes = blockDate
		? computeRemainingMinutes(blockDate, stats.totalMinutes)
		: 24 * 60 - stats.totalMinutes;

	const remainingText = formatRemaining(remainingMinutes);
	const parts = [`$(notebook) ${remainingText} remaining`];

	if (stats.totalMinutes > 0) {
		parts.push(`${formatMinutes(stats.totalMinutes)} logged`);
	}
	if (stats.untaggedMinutes > 0) {
		parts.push(`${formatMinutes(stats.untaggedMinutes)} untracked`);
	}

	statusBarItem.text = parts.join(', ');
	statusBarItem.show();
}

export function disposeStatusBar(): void {
	statusBarItem?.dispose();
	statusBarItem = undefined;
}
