export const INDENT_MONTH = '';
export const INDENT_DAY = '    ';
export const INDENT_TASK = '        ';

export function getIndent(line: string): string {
	const match = line.match(/^(\s*)/);
	return match ? match[1] : '';
}

export function getIndentLevel(line: string): number {
	return getIndent(line).length;
}
