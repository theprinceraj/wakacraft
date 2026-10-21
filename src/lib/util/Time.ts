import { TZDate } from '@date-fns/tz';

/** WakaTime's human-readable time block: `{ total_seconds, digital, decimal, text, hours, minutes, seconds }`. */
export interface HumanDuration {
	total_seconds: number;
	digital: string;
	decimal: string;
	text: string;
	hours: number;
	minutes: number;
	seconds: number;
}

const plural = (value: number, unit: string) => `${value} ${unit}${value === 1 ? '' : 's'}`;

export function humanizeSeconds(totalSeconds: number): string {
	const whole = Math.floor(totalSeconds);
	const hours = Math.floor(whole / 3600);
	const minutes = Math.floor((whole % 3600) / 60);

	if (hours === 0 && minutes === 0) return plural(whole, 'sec');
	if (hours === 0) return plural(minutes, 'min');
	if (minutes === 0) return plural(hours, 'hr');
	return `${plural(hours, 'hr')} ${plural(minutes, 'min')}`;
}

export function toHumanDuration(totalSeconds: number): HumanDuration {
	const whole = Math.floor(totalSeconds);
	const hours = Math.floor(whole / 3600);
	const minutes = Math.floor((whole % 3600) / 60);
	const seconds = whole % 60;

	return {
		total_seconds: round(totalSeconds, 6),
		digital: `${hours}:${String(minutes).padStart(2, '0')}`,
		decimal: (totalSeconds / 3600).toFixed(2),
		text: humanizeSeconds(totalSeconds),
		hours,
		minutes,
		seconds,
	};
}

export const round = (value: number, digits = 2) => {
	const factor = 10 ** digits;
	return Math.round(value * factor) / factor;
};

export function isValidTimezone(timezone: string): boolean {
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: timezone });
		return true;
	} catch {
		return false;
	}
}

const dateKeyFormatters = new Map<string, Intl.DateTimeFormat>();

/** The local calendar date (YYYY-MM-DD) of an epoch-seconds instant in `timezone`. */
export function localDateOf(epochSeconds: number, timezone: string): string {
	let formatter = dateKeyFormatters.get(timezone);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat('en-CA', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		});
		dateKeyFormatters.set(timezone, formatter);
	}
	return formatter.format(new Date(epochSeconds * 1000));
}

/** Epoch seconds of local midnight that starts `date` (YYYY-MM-DD) in `timezone`. */
export function startOfLocalDay(date: string, timezone: string): number {
	const [year, month, day] = date.split('-').map(Number);
	return new TZDate(year, month - 1, day, timezone).getTime() / 1000;
}

/** `[start, end)` epoch-second bounds of a local calendar day; DST days are 23 or 25 hours long. */
export function localDayBounds(date: string, timezone: string): { start: number; end: number } {
	return { start: startOfLocalDay(date, timezone), end: startOfLocalDay(addDays(date, 1), timezone) };
}

/** Calendar arithmetic on YYYY-MM-DD strings; independent of any timezone. */
export function addDays(date: string, days: number): string {
	const [year, month, day] = date.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Inclusive list of dates from `start` to `end`. */
export function eachDate(start: string, end: string): string[] {
	const dates: string[] = [];
	for (let date = start; date <= end; date = addDays(date, 1)) dates.push(date);
	return dates;
}

export function todayIn(timezone: string): string {
	return localDateOf(Date.now() / 1000, timezone);
}

/** 0 = Sunday … 6 = Saturday, for a calendar date. */
export function weekdayOf(date: string): number {
	const [year, month, day] = date.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}
