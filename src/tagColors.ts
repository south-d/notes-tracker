const TAG_PALETTE = [
	'#E74C3C',
	'#E67E22',
	'#F1C40F',
	'#8BC34A',
	'#2ECC71',
	'#1ABC9C',
	'#00BCD4',
	'#3498DB',
	'#3F51B5',
	'#9B59B6',
	'#E91E63',
	'#FF5722',
	'#673AB7',
	'#009688',
	'#CDDC39',
	'#FF9800',
	'#795548',
	'#607D8B',
	'#C0392B',
	'#16A085',
	'#2980B9',
	'#8E44AD',
	'#D35400',
	'#27AE60',
];

function fnv1a(str: string): number {
	let hash = 2166136261;
	for (let i = 0; i < str.length; i++) {
		hash ^= str.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function hexToRgb(hex: string): [number, number, number] {
	const value = hex.slice(1);
	const num = Number.parseInt(value, 16);
	return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
	const rn = r / 255;
	const gn = g / 255;
	const bn = b / 255;
	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);
	const lightness = (max + min) / 2;

	if (max === min) {
		return [0, 0, lightness];
	}

	const delta = max - min;
	const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
	let hue = 0;

	if (max === rn) {
		hue = ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6;
	} else if (max === gn) {
		hue = ((bn - rn) / delta + 2) / 6;
	} else {
		hue = ((rn - gn) / delta + 4) / 6;
	}

	return [hue * 360, saturation, lightness];
}

function colorDistance(hex1: string, hex2: string): number {
	const hsl1 = rgbToHsl(...hexToRgb(hex1));
	const hsl2 = rgbToHsl(...hexToRgb(hex2));
	const rawHueDiff = Math.abs(hsl1[0] - hsl2[0]);
	const hueDiff = Math.min(rawHueDiff, 360 - rawHueDiff) / 180;
	const satDiff = Math.abs(hsl1[1] - hsl2[1]);
	const lightDiff = Math.abs(hsl1[2] - hsl2[2]);
	return hueDiff * 3 + satDiff + lightDiff;
}

function pickColorForTag(tag: string, usedColors: string[]): string {
	const startIdx = fnv1a(tag) % TAG_PALETTE.length;
	const preferred = TAG_PALETTE[startIdx];

	if (!usedColors.includes(preferred)) {
		return preferred;
	}

	let bestColor = preferred;
	let bestScore = -1;

	for (const color of TAG_PALETTE) {
		if (usedColors.includes(color)) {
			continue;
		}
		const minDist = Math.min(...usedColors.map((used) => colorDistance(color, used)));
		if (minDist > bestScore) {
			bestScore = minDist;
			bestColor = color;
		}
	}

	if (bestScore >= 0) {
		return bestColor;
	}

	for (let probe = 1; probe < TAG_PALETTE.length; probe++) {
		const candidate = TAG_PALETTE[(startIdx + probe) % TAG_PALETTE.length];
		if (!usedColors.includes(candidate)) {
			return candidate;
		}
	}

	return preferred;
}

export function assignTagColors(tags: Iterable<string>): Map<string, string> {
	const sorted = [...new Set(tags)].sort((a, b) => a.localeCompare(b, 'en'));
	const assigned = new Map<string, string>();
	const usedColors: string[] = [];

	for (const tag of sorted) {
		const color = pickColorForTag(tag, usedColors);
		assigned.set(tag, color);
		usedColors.push(color);
	}

	return assigned;
}

export function tagColor(tag: string): string {
	return TAG_PALETTE[fnv1a(tag) % TAG_PALETTE.length];
}
