import {
	BlockTimeStats,
	buildDateLine,
	buildMonthLine,
	computeBlockTimeStats,
	computeMonthRemainingMinutes,
	computeMonthTimeStats,
	computeRemainingMinutes,
	DayBlock,
	findDayBlocks,
	findMonthBlocks,
	parseBlockDate,
} from './parser';
import { formatMinutes } from './format';

function buildTagSummaryFromStats(stats: BlockTimeStats): string | null {
	if (stats.totalMinutes === 0) {
		return null;
	}

	const parts = [...stats.tagged.entries()]
		.sort(([, a], [, b]) => b - a)
		.map(([tag, minutes]) => `${formatMinutes(minutes)} =${tag}`);

	if (stats.untaggedMinutes > 0) {
		parts.push(`untracked: ${formatMinutes(stats.untaggedMinutes)}`);
	}

	return parts.join(', ');
}

export interface DateLineUpdate {
	lineIndex: number;
	newText: string;
}

export function computeDateLineUpdates(lines: string[], now = new Date()): DateLineUpdate[] {
	const dayBlocks = findDayBlocks(lines);
	const monthBlocks = findMonthBlocks(lines);
	const updates: DateLineUpdate[] = [];

	for (const block of dayBlocks) {
		const stats = computeBlockTimeStats(lines, block);
		const tagSummary = buildTagSummaryFromStats(stats);
		const blockDate = parseBlockDate(block.parsed.datePart);
		const remainingMinutes = blockDate
			? computeRemainingMinutes(blockDate, stats.totalMinutes, now)
			: 24 * 60 - stats.totalMinutes;

		const newLine = buildDateLine(block.parsed, remainingMinutes, tagSummary);
		const currentLine = lines[block.dateLineIndex];
		if (newLine !== currentLine) {
			updates.push({
				lineIndex: block.dateLineIndex,
				newText: newLine,
			});
		}
	}

	for (const block of monthBlocks) {
		const stats = computeMonthTimeStats(lines, block, dayBlocks);
		const tagSummary = buildTagSummaryFromStats(stats);
		const remainingMinutes = computeMonthRemainingMinutes(
			block.parsed.year,
			block.parsed.month,
			stats.totalMinutes,
			now,
		);

		const newLine = buildMonthLine(block.parsed, remainingMinutes, tagSummary);
		const currentLine = lines[block.monthLineIndex];
		if (newLine !== currentLine) {
			updates.push({
				lineIndex: block.monthLineIndex,
				newText: newLine,
			});
		}
	}

	return updates;
}
