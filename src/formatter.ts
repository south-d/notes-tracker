import { INDENT_DAY, INDENT_MONTH, INDENT_TASK } from './indent';
import {
	isDateLine,
	isMonthLine,
	parseBlockDate,
	parseDateLine,
	parseTaskLine,
} from './parser';

export function formatNotesIndents(lines: string[]): string[] {
	const result: string[] = [];
	let inDay = false;

	for (const line of lines) {
		if (line.trim() === '') {
			result.push(line);
			continue;
		}

		if (isMonthLine(line)) {
			inDay = false;
			result.push(INDENT_MONTH + line.trimStart());
			continue;
		}

		const dayParsed = parseDateLine(line);
		if (dayParsed && parseBlockDate(dayParsed.datePart)) {
			inDay = true;
			result.push(INDENT_DAY + line.trimStart());
			continue;
		}

		const task = parseTaskLine(line);
		if (task && inDay) {
			const body = `${task.done ? '# ' : ''}- ${task.content}`;
			result.push(INDENT_TASK + body);
			continue;
		}

		result.push(line);
	}

	return result;
}
