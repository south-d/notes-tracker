import * as vscode from 'vscode';
import { getDoneTaskMainTextSpan, isMonthLine, parseDateLine } from './parser';
import { assignTagColors, tagColor } from './tagColors';
import { findUrlSpans, subtractUrlSpans } from './urls';

const TAG_RE = /=([^\s=,;]+)/g;
const MONTH_QUOTE_RE = /"\d{2}-\d{4}"/;
const DAY_QUOTE_RE = /"\d{2}-\d{2}-\d{4}[^"]*"/;
const GOALS_QUOTE_RE = /"\d{2}-\d{2}-\d{4}[^"]*"\s+("(?:[^"\\]|\\.)*")/;
const SUMMARY_RE = /\|.*$/;

const decorationTypes = new Map<string, vscode.TextEditorDecorationType>();
let doneTaskDecoration: vscode.TextEditorDecorationType | undefined;
let urlDecoration: vscode.TextEditorDecorationType | undefined;
let monthDateDecoration: vscode.TextEditorDecorationType | undefined;
let dayDateDecoration: vscode.TextEditorDecorationType | undefined;
let goalsDecoration: vscode.TextEditorDecorationType | undefined;
let summaryDecoration: vscode.TextEditorDecorationType | undefined;

function getDecorationForColor(color: string): vscode.TextEditorDecorationType {
	let decoration = decorationTypes.get(color);
	if (!decoration) {
		decoration = vscode.window.createTextEditorDecorationType({
			color,
			fontWeight: '600',
			rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
		});
		decorationTypes.set(color, decoration);
	}
	return decoration;
}

function getDoneTaskDecoration(): vscode.TextEditorDecorationType {
	if (!doneTaskDecoration) {
		doneTaskDecoration = vscode.window.createTextEditorDecorationType({
			opacity: '0.5',
		});
	}
	return doneTaskDecoration;
}

function getUrlDecoration(): vscode.TextEditorDecorationType {
	if (!urlDecoration) {
		urlDecoration = vscode.window.createTextEditorDecorationType({
			color: '#4FC3F7',
			backgroundColor: '#4FC3F722',
			textDecoration: 'underline',
			fontWeight: '600',
			cursor: 'pointer',
			rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
		});
	}
	return urlDecoration;
}

function getMonthDateDecoration(): vscode.TextEditorDecorationType {
	if (!monthDateDecoration) {
		monthDateDecoration = vscode.window.createTextEditorDecorationType({
			color: '#4A9EFF',
			fontWeight: '700',
		});
	}
	return monthDateDecoration;
}

function getDayDateDecoration(): vscode.TextEditorDecorationType {
	if (!dayDateDecoration) {
		dayDateDecoration = vscode.window.createTextEditorDecorationType({
			color: '#6EB5FF',
			fontWeight: '700',
		});
	}
	return dayDateDecoration;
}

function getGoalsDecoration(): vscode.TextEditorDecorationType {
	if (!goalsDecoration) {
		goalsDecoration = vscode.window.createTextEditorDecorationType({
			color: '#8FA8C3',
		});
	}
	return goalsDecoration;
}

function getSummaryDecoration(): vscode.TextEditorDecorationType {
	if (!summaryDecoration) {
		summaryDecoration = vscode.window.createTextEditorDecorationType({
			color: '#7A8FA6',
			fontStyle: 'italic',
		});
	}
	return summaryDecoration;
}

function collectTags(document: vscode.TextDocument): string[] {
	const tags: string[] = [];
	for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
		const text = document.lineAt(lineIndex).text;
		TAG_RE.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = TAG_RE.exec(text)) !== null) {
			tags.push(match[1]);
		}
	}
	return tags;
}

function addLineHeaderDecorations(
	line: string,
	lineIndex: number,
	monthRanges: vscode.Range[],
	dayRanges: vscode.Range[],
	goalsRanges: vscode.Range[],
	summaryRanges: vscode.Range[],
): void {
	const leading = line.length - line.trimStart().length;
	const trimmed = line.trimStart();

	const summaryMatch = trimmed.match(SUMMARY_RE);
	if (summaryMatch && summaryMatch.index !== undefined) {
		const start = leading + summaryMatch.index;
		summaryRanges.push(
			new vscode.Range(lineIndex, start, lineIndex, start + summaryMatch[0].length),
		);
	}

	if (isMonthLine(line)) {
		const monthMatch = trimmed.match(MONTH_QUOTE_RE);
		if (monthMatch && monthMatch.index !== undefined) {
			const start = leading + monthMatch.index;
			monthRanges.push(
				new vscode.Range(lineIndex, start, lineIndex, start + monthMatch[0].length),
			);
		}
		return;
	}

	if (!parseDateLine(line)) {
		return;
	}

	const dayMatch = trimmed.match(DAY_QUOTE_RE);
	if (dayMatch && dayMatch.index !== undefined) {
		const start = leading + dayMatch.index;
		dayRanges.push(new vscode.Range(lineIndex, start, lineIndex, start + dayMatch[0].length));
	}

	const goalsMatch = trimmed.match(GOALS_QUOTE_RE);
	if (goalsMatch && goalsMatch.index !== undefined) {
		const quote = goalsMatch[1];
		const start = leading + goalsMatch.index + goalsMatch[0].indexOf(quote);
		goalsRanges.push(new vscode.Range(lineIndex, start, lineIndex, start + quote.length));
	}
}

export function updateDecorations(editor: vscode.TextEditor): void {
	if (editor.document.languageId !== 'notes') {
		return;
	}

	const document = editor.document;
	const colorByTag = assignTagColors(collectTags(document));
	const rangesByColor = new Map<string, vscode.Range[]>();
	const doneTaskRanges: vscode.Range[] = [];
	const urlRanges: vscode.Range[] = [];
	const monthRanges: vscode.Range[] = [];
	const dayRanges: vscode.Range[] = [];
	const goalsRanges: vscode.Range[] = [];
	const summaryRanges: vscode.Range[] = [];

	for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
		const line = document.lineAt(lineIndex);
		const text = line.text;
		const urlSpans = findUrlSpans(text);

		addLineHeaderDecorations(text, lineIndex, monthRanges, dayRanges, goalsRanges, summaryRanges);

		for (const span of urlSpans) {
			urlRanges.push(new vscode.Range(lineIndex, span.start, lineIndex, span.end));
		}

		const doneSpan = getDoneTaskMainTextSpan(text);
		if (doneSpan) {
			for (const part of subtractUrlSpans(doneSpan.start, doneSpan.end, urlSpans)) {
				doneTaskRanges.push(new vscode.Range(lineIndex, part.start, lineIndex, part.end));
			}
		}

		TAG_RE.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = TAG_RE.exec(text)) !== null) {
			const tag = match[1];
			const color = colorByTag.get(tag) ?? tagColor(tag);
			getDecorationForColor(color);
			const start = match.index;
			const range = new vscode.Range(lineIndex, start, lineIndex, start + match[0].length);
			const ranges = rangesByColor.get(color) ?? [];
			ranges.push(range);
			rangesByColor.set(color, ranges);
		}
	}

	editor.setDecorations(getMonthDateDecoration(), monthRanges);
	editor.setDecorations(getDayDateDecoration(), dayRanges);
	editor.setDecorations(getGoalsDecoration(), goalsRanges);
	editor.setDecorations(getSummaryDecoration(), summaryRanges);
	editor.setDecorations(getDoneTaskDecoration(), doneTaskRanges);
	editor.setDecorations(getUrlDecoration(), urlRanges);

	for (const [color, decoration] of decorationTypes) {
		editor.setDecorations(decoration, rangesByColor.get(color) ?? []);
	}
}

export function disposeDecorations(): void {
	doneTaskDecoration?.dispose();
	doneTaskDecoration = undefined;
	urlDecoration?.dispose();
	urlDecoration = undefined;
	monthDateDecoration?.dispose();
	monthDateDecoration = undefined;
	dayDateDecoration?.dispose();
	dayDateDecoration = undefined;
	goalsDecoration?.dispose();
	goalsDecoration = undefined;
	summaryDecoration?.dispose();
	summaryDecoration = undefined;
	for (const decoration of decorationTypes.values()) {
		decoration.dispose();
	}
	decorationTypes.clear();
}
