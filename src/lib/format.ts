/** Compact duration for dense widgets: `4h 02m`, `38m`, `45s`, `0m`. */
export function formatDuration(seconds: number): string {
	const whole = Math.max(0, Math.floor(seconds));
	const hours = Math.floor(whole / 3600);
	const minutes = Math.floor((whole % 3600) / 60);
	if (hours) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
	if (minutes) return `${minutes}m`;
	return whole > 0 ? `${whole}s` : '0m';
}

/** Hours with one decimal for axes: `3.5h`. */
export const formatHours = (seconds: number) => `${(seconds / 3600).toFixed(seconds >= 36_000 ? 0 : 1)}h`;

const parseDate = (date: string) => {
	const [year, month, day] = date.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day));
};

export const formatDay = (date: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) =>
	new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(parseDate(date));

export const formatWeekday = (date: string, style: 'short' | 'narrow' = 'short') =>
	new Intl.DateTimeFormat('en-US', { weekday: style, timeZone: 'UTC' }).format(parseDate(date));

export const formatPercent = (percent: number) => `${percent >= 10 ? Math.round(percent) : percent.toFixed(1)}%`;

/** Clock time of an epoch-seconds instant in a timezone: `14:05`. */
export const formatClock = (epochSeconds: number, timezone: string) =>
	new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(
		new Date(epochSeconds * 1000),
	);
