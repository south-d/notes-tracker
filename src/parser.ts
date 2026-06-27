import { formatRemaining } from './format';
import { getIndent, INDENT_DAY, INDENT_MONTH } from './indent';

export interface ParsedDateLine {
	indent: string;
	datePart: string;
	goalsPart: string | null;
}

export interface ParsedMonthLine {
	indent: string;
	monthPart: string;
	month: number;
	year: number;
}

export interface DayBlock {
	dateLineIndex: number;
	startLine: number;
	endLine: number;
	parsed: ParsedDateLine;
}

export interface MonthBlock {
	monthLineIndex: number;
	startLine: number;
	endLine: number;
	parsed: ParsedMonthLine;
}

export interface TaskInfo {
	lineIndex: number;
	done: boolean;
	minutes: number;
	tag: string | null;
}

const DATE_LINE_RE = /^("(?:[^"\\]|\\.)*")(?:\s+("(?:[^"\\]|\\.)*"))?(?:\s+\|.*)?$/;
const DAY_DATE_RE = /^"(\d{2})-(\d{2})-(\d{4})/;
const MONTH_LINE_RE = /^"(\d{2})-(\d{4})"(?:\s+\|.*)?$/;
const TASK_LINE_RE = /^(\s*)(#\s*)?-\s+(.*)$/;

export function isMonthLine(line: string): boolean {
	const trimmed = line.trimStart();
	return MONTH_LINE_RE.test(trimmed) && !DAY_DATE_RE.test(trimmed);
}

export function isDateLine(line: string): boolean {
	return line.trimStart().startsWith('"');
}

export function parseMonthLine(line: string): ParsedMonthLine | null {
	if (!isMonthLine(line)) {
		return null;
	}
	const match = line.trimStart().match(MONTH_LINE_RE);
	if (!match) {
		return null;
	}
	return {
		indent: getIndent(line),
		monthPart: `"${match[1]}-${match[2]}"`,
		month: Number(match[1]),
		year: Number(match[2]),
	};
}

export function parseDateLine(line: string): ParsedDateLine | null {
	if (isMonthLine(line)) {
		return null;
	}
	const trimmed = line.trimStart();
	const match = trimmed.match(DATE_LINE_RE);
	if (!match) {
		return null;
	}
	if (!parseBlockDate(match[1])) {
		return null;
	}
	return {
		indent: getIndent(line),
		datePart: match[1],
		goalsPart: match[2] ?? null,
	};
}

export function parseBlockDate(datePart: string): Date | null {
	const match = datePart.match(DAY_DATE_RE);
	if (!match) {
		return null;
	}
	const day = Number(match[1]);
	const month = Number(match[2]);
	const year = Number(match[3]);
	return new Date(year, month - 1, day);
}

function daysInMonth(year: number, month: number): number {
	return new Date(year, month, 0).getDate();
}

export function computeMonthRemainingMinutes(
	year: number,
	month: number,
	loggedMinutes: number,
	now = new Date(),
): number {
	const nowYear = now.getFullYear();
	const nowMonth = now.getMonth() + 1;
	const nowDay = now.getDate();

	let targetMinutes: number;
	if (year === nowYear && month === nowMonth) {
		targetMinutes = nowDay * 24 * 60;
	} else {
		targetMinutes = daysInMonth(year, month) * 24 * 60;
	}

	return targetMinutes - loggedMinutes;
}

export function buildMonthLine(
	parsed: ParsedMonthLine,
	remainingMinutes: number,
	tagSummary: string | null,
): string {
	let line = INDENT_MONTH + parsed.monthPart;
	line += ` | ${formatRemaining(remainingMinutes)}`;
	if (tagSummary) {
		line += ` | ${tagSummary}`;
	}
	return line;
}

export function isToday(blockDate: Date, now = new Date()): boolean {
	return (
		blockDate.getFullYear() === now.getFullYear() &&
		blockDate.getMonth() === now.getMonth() &&
		blockDate.getDate() === now.getDate()
	);
}

function hoursSinceMidnight(now: Date): number {
	return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}

export function computeRemainingMinutes(
	blockDate: Date,
	loggedMinutes: number,
	now = new Date(),
): number {
	const loggedHours = loggedMinutes / 60;
	if (isToday(blockDate, now)) {
		return (hoursSinceMidnight(now) - loggedHours) * 60;
	}
	return (24 - loggedHours) * 60;
}

export function buildDateLine(
	parsed: ParsedDateLine,
	remainingMinutes: number,
	tagSummary: string | null,
): string {
	let line = INDENT_DAY + parsed.datePart;
	if (parsed.goalsPart) {
		line += ` ${parsed.goalsPart}`;
	}
	line += ` | ${formatRemaining(remainingMinutes)}`;
	if (tagSummary) {
		line += ` | ${tagSummary}`;
	}
	return line;
}

export function findMonthBlocks(lines: string[]): MonthBlock[] {
	const blocks: MonthBlock[] = [];
	for (let i = 0; i < lines.length; i++) {
		const parsed = parseMonthLine(lines[i]);
		if (!parsed) {
			continue;
		}
		const monthIndent = getIndent(lines[i]).length;
		let endLine = lines.length;
		for (let j = i + 1; j < lines.length; j++) {
			const nextMonth = parseMonthLine(lines[j]);
			if (nextMonth && getIndent(lines[j]).length <= monthIndent) {
				endLine = j;
				break;
			}
		}
		blocks.push({
			monthLineIndex: i,
			startLine: i + 1,
			endLine,
			parsed,
		});
	}
	return blocks;
}

export function findDayBlocks(lines: string[]): DayBlock[] {
	const blocks: DayBlock[] = [];
	for (let i = 0; i < lines.length; i++) {
		if (!isDateLine(lines[i]) || isMonthLine(lines[i])) {
			continue;
		}
		const parsed = parseDateLine(lines[i]);
		if (!parsed) {
			continue;
		}
		const dayIndent = getIndent(lines[i]).length;
		let endLine = lines.length;
		for (let j = i + 1; j < lines.length; j++) {
			if (!isDateLine(lines[j])) {
				continue;
			}
			const nextIndent = getIndent(lines[j]).length;
			if (parseMonthLine(lines[j]) && nextIndent <= dayIndent) {
				endLine = j;
				break;
			}
			if (parseDateLine(lines[j]) && nextIndent <= dayIndent) {
				endLine = j;
				break;
			}
		}
		blocks.push({
			dateLineIndex: i,
			startLine: i + 1,
			endLine,
			parsed,
		});
	}
	return blocks;
}

export function parseTaskLine(line: string): { indent: string; done: boolean; content: string } | null {
	const match = line.match(TASK_LINE_RE);
	if (!match) {
		return null;
	}
	return {
		indent: match[1],
		done: Boolean(match[2]),
		content: match[3],
	};
}

export function getDoneTaskMainTextSpan(line: string): { start: number; end: number } | null {
	const task = parseTaskLine(line);
	if (!task?.done) {
		return null;
	}
	const prefixMatch = line.match(/^(\s*#\s*)(-\s+)/);
	if (!prefixMatch) {
		return null;
	}
	const start = prefixMatch[1].length;
	const mainText = task.content
		.replace(/\s*=[^\s=]+\s*$/, '')
		.replace(/\s*\++\s*$/, '')
		.trimEnd();
	const end = start + prefixMatch[2].length + mainText.length;
	if (end <= start) {
		return null;
	}
	return { start, end };
}

export function countPluses(content: string): number {
	const withoutTag = content.replace(/\s*=[^\s=]+\s*$/, '');
	const match = withoutTag.match(/\++\s*$/);
	return match ? match[0].trim().length : 0;
}

export function parseTag(content: string): string | null {
	const match = content.match(/=([^\s=]+)\s*$/);
	return match ? match[1] : null;
}

export interface BlockTimeStats {
	tagged: Map<string, number>;
	untaggedMinutes: number;
	totalMinutes: number;
}

export function computeBlockTimeStats(lines: string[], block: DayBlock): BlockTimeStats {
	const tasks = collectTasksInBlock(lines, block);
	const tagged = new Map<string, number>();
	let untaggedMinutes = 0;

	for (const task of tasks) {
		if (task.tag) {
			tagged.set(task.tag, (tagged.get(task.tag) ?? 0) + task.minutes);
		} else {
			untaggedMinutes += task.minutes;
		}
	}

	return {
		tagged,
		untaggedMinutes,
		totalMinutes: tasks.reduce((sum, t) => sum + t.minutes, 0),
	};
}

export function computeMonthTimeStats(
	lines: string[],
	monthBlock: MonthBlock,
	dayBlocks: DayBlock[],
): BlockTimeStats {
	const tagged = new Map<string, number>();
	let untaggedMinutes = 0;
	let totalMinutes = 0;

	for (const day of dayBlocks) {
		if (day.dateLineIndex < monthBlock.startLine || day.dateLineIndex >= monthBlock.endLine) {
			continue;
		}
		const date = parseBlockDate(day.parsed.datePart);
		if (!date) {
			continue;
		}
		if (
			date.getMonth() + 1 !== monthBlock.parsed.month ||
			date.getFullYear() !== monthBlock.parsed.year
		) {
			continue;
		}
		const stats = computeBlockTimeStats(lines, day);
		totalMinutes += stats.totalMinutes;
		untaggedMinutes += stats.untaggedMinutes;
		for (const [tag, minutes] of stats.tagged) {
			tagged.set(tag, (tagged.get(tag) ?? 0) + minutes);
		}
	}

	return { tagged, untaggedMinutes, totalMinutes };
}

export function collectTasksInBlock(lines: string[], block: DayBlock): TaskInfo[] {
	const tasks: TaskInfo[] = [];
	for (let i = block.startLine; i < block.endLine; i++) {
		const task = parseTaskLine(lines[i]);
		if (!task) {
			continue;
		}
		const pluses = countPluses(task.content);
		if (pluses === 0) {
			continue;
		}
		tasks.push({
			lineIndex: i,
			done: task.done,
			minutes: pluses * 15,
			tag: parseTag(task.content),
		});
	}
	return tasks;
}

export function toggleTaskDone(line: string): string | null {
	const task = parseTaskLine(line);
	if (!task) {
		return null;
	}
	if (task.done) {
		return `${task.indent}- ${task.content}`;
	}
	return `${task.indent}# - ${task.content}`;
}

export function addQuarterToTask(line: string): string | null {
	const task = parseTaskLine(line);
	if (!task) {
		return null;
	}
	const tagMatch = task.content.match(/^(.+?)(\s*=[^\s=]+\s*)$/);
	if (tagMatch) {
		const body = tagMatch[1].replace(/\s+$/, '');
		const tag = tagMatch[2];
		const pluses = countPluses(body);
		const newBody = body.replace(/\++\s*$/, '').trimEnd();
		const nextPluses = '+'.repeat(pluses + 1);
		return `${task.indent}${task.done ? '# ' : ''}- ${newBody} ${nextPluses}${tag}`;
	}
	const pluses = countPluses(task.content);
	const newBody = task.content.replace(/\++\s*$/, '').trimEnd();
	const nextPluses = '+'.repeat(pluses + 1);
	return `${task.indent}${task.done ? '# ' : ''}- ${newBody} ${nextPluses}`;
}
