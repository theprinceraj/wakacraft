/** Compact duration for dense widgets: `4h 02m`, `38m`, `45s`, `0m`. */
export function formatDuration(seconds: number): string {
	const whole = Math.max(0, Math.floor(seconds));
	const hours = Math.floor(whole / 3600);
	const minutes = Math.floor((whole % 3600) / 60);
	if (hours) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
	if (minutes) return `${minutes}m`;
	return whole > 0 ? `${whole}s` : '0m';
}

export const formatMoney = (amount: number, currency: string) =>
	new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

/** Range names come from the WakaTime-compatible API in title case ("Last 7 Days"); the UI uses sentence case. */
export const formatRangeLabel = (label: string) => label.charAt(0) + label.slice(1).toLowerCase();

/** Axis tick: `2h`, `30m`, `1.5h`. */
export function formatAxisDuration(seconds: number) {
	if (seconds > 0 && seconds < 3600) return `${Math.round(seconds / 60)}m`;
	return `${+(seconds / 3600).toFixed(1)}h`;
}

const TICK_STEPS = [900, 1800, 3600, 7200, 10800, 14400, 18000, 36000, 72000, 180000, 360000];

/** Round axis ticks from zero up to at least `maxSeconds`, so that charts never show ticks like 4.4h. */
export function durationTicks(maxSeconds: number) {
	const step =
		TICK_STEPS.find((candidate) => maxSeconds / candidate <= 4) ?? Math.ceil(maxSeconds / 4 / 360000) * 360000;
	const count = Math.max(1, Math.ceil(maxSeconds / step));
	return Array.from({ length: count + 1 }, (_, index) => index * step);
}

/** Category names arrive in lowercase from editors ("ai coding"). */
export const formatCategory = (name: string) =>
	name.replace(/^ai\b/i, 'AI').replace(/^./, (first) => first.toUpperCase());

export const initialsOf = (name: string) =>
	name
		.split(/\s+/)
		.map((word) => word[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();

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
