import * as vscode from 'vscode';
import {
	countPluses,
	findDayBlocks,
	parseBlockDate,
	parseTag,
	parseTaskLine,
} from './parser';
import { formatMinutes } from './format';

const TAG_RE = /=([^\s=,;]+)/g;

export function getTagAtPosition(
	document: vscode.TextDocument,
	position: vscode.Position,
): string | null {
	const line = document.lineAt(position.line).text;
	TAG_RE.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = TAG_RE.exec(line)) !== null) {
		const start = match.index;
		const end = start + match[0].length;
		if (position.character >= start && position.character <= end) {
			return match[1];
		}
	}
	return null;
}

interface TagUsage {
	lineNumber: number;
	preview: string;
	minutes: number;
	dayLabel: string | null;
}

function formatDayLabel(lines: string[], lineIndex: number): string | null {
	const blocks = findDayBlocks(lines);
	for (const block of blocks) {
		if (lineIndex >= block.startLine && lineIndex < block.endLine) {
			const date = parseBlockDate(block.parsed.datePart);
			if (date) {
				const day = String(date.getDate()).padStart(2, '0');
				const month = String(date.getMonth() + 1).padStart(2, '0');
				return `${day}-${month}-${date.getFullYear()}`;
			}
		}
		if (block.dateLineIndex === lineIndex) {
			const date = parseBlockDate(block.parsed.datePart);
			if (date) {
				const day = String(date.getDate()).padStart(2, '0');
				const month = String(date.getMonth() + 1).padStart(2, '0');
				return `${day}-${month}-${date.getFullYear()}`;
			}
		}
	}
	return null;
}

function formatTaskPreview(line: string): string {
	const task = parseTaskLine(line);
	if (!task) {
		return line.trim();
	}
	let text = task.content
		.replace(/\s*=[^\s=]+\s*$/, '')
		.replace(/\s*\++\s*$/, '')
		.trimEnd();
	const pluses = countPluses(task.content);
	if (pluses > 0) {
		text += ` ${'+'.repeat(pluses)}`;
	}
	return text;
}

export function collectTagUsages(lines: string[], tag: string): TagUsage[] {
	const usages: TagUsage[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const task = parseTaskLine(line);
		if (!task || parseTag(task.content) !== tag) {
			continue;
		}
		const pluses = countPluses(task.content);
		usages.push({
			lineNumber: i + 1,
			preview: formatTaskPreview(line),
			minutes: pluses * 15,
			dayLabel: formatDayLabel(lines, i),
		});
	}

	return usages;
}

function buildHoverMarkdown(tag: string, usages: TagUsage[]): vscode.MarkdownString {
	const totalMinutes = usages.reduce((sum, u) => sum + u.minutes, 0);
	const md = new vscode.MarkdownString();
	md.isTrusted = true;
	md.supportHtml = false;

	md.appendMarkdown(`**=${tag}** — ${formatMinutes(totalMinutes)} (${usages.length})\n\n`);

	if (usages.length === 0) {
		md.appendMarkdown('_No tasks with this tag_');
		return md;
	}

	for (const usage of usages) {
		const day = usage.dayLabel ? `${usage.dayLabel}, ` : '';
		const time = usage.minutes > 0 ? ` _${formatMinutes(usage.minutes)}_` : '';
		md.appendMarkdown(`- ${day}Ln. ${usage.lineNumber}:${time} ${usage.preview}\n`);
	}

	return md;
}

export function provideTagHover(
	document: vscode.TextDocument,
	position: vscode.Position,
): vscode.Hover | null {
	const tag = getTagAtPosition(document, position);
	if (!tag) {
		return null;
	}

	const lines = document.getText().split(/\r?\n/);
	const usages = collectTagUsages(lines, tag);
	const markdown = buildHoverMarkdown(tag, usages);
	const line = document.lineAt(position.line).text;
	TAG_RE.lastIndex = 0;
	let match: RegExpExecArray | null;
	let range: vscode.Range | undefined;
	while ((match = TAG_RE.exec(line)) !== null) {
		if (match[1] === tag) {
			const start = match.index;
			const end = start + match[0].length;
			if (position.character >= start && position.character <= end) {
				range = new vscode.Range(position.line, start, position.line, end);
				break;
			}
		}
	}

	return new vscode.Hover(markdown, range);
}

export function registerHoverProvider(): vscode.Disposable {
	return vscode.languages.registerHoverProvider('notes', {
		provideHover(document, position) {
			if (document.languageId !== 'notes') {
				return null;
			}
			return provideTagHover(document, position);
		},
	});
}
