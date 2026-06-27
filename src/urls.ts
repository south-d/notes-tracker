export const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;

export interface UrlSpan {
	start: number;
	end: number;
	url: string;
}

export function findUrlSpans(line: string): UrlSpan[] {
	const spans: UrlSpan[] = [];
	URL_RE.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = URL_RE.exec(line)) !== null) {
		const raw = match[0];
		const trimmed = raw.replace(/[.,;:)]+$/g, '');
		if (trimmed.length === 0) {
			continue;
		}
		spans.push({
			start: match.index,
			end: match.index + trimmed.length,
			url: trimmed,
		});
	}
	return spans;
}

export function subtractUrlSpans(
	spanStart: number,
	spanEnd: number,
	urlSpans: UrlSpan[],
): Array<{ start: number; end: number }> {
	const overlapping = urlSpans
		.filter((url) => url.start < spanEnd && url.end > spanStart)
		.sort((a, b) => a.start - b.start);

	const parts: Array<{ start: number; end: number }> = [];
	let cursor = spanStart;

	for (const url of overlapping) {
		const gapEnd = Math.max(spanStart, url.start);
		if (cursor < gapEnd) {
			parts.push({ start: cursor, end: gapEnd });
		}
		cursor = Math.max(cursor, url.end);
	}

	if (cursor < spanEnd) {
		parts.push({ start: cursor, end: spanEnd });
	}

	return parts;
}
