export function formatMinutes(minutes: number): string {
	const hours = Math.round((minutes / 60) * 100) / 100;
	return `${hours}h`;
}

export function formatRemaining(minutes: number): string {
	return formatMinutes(minutes);
}
