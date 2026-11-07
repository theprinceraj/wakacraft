import { ColumnBars } from './column-bars';

const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Seven columns, ordered from the user's week start. */
export function WeekdayBars({
	weekdays,
	weekStartDay = 1,
}: {
	weekdays: { weekday: number; seconds: number }[];
	weekStartDay?: number;
}) {
	const ordered = Array.from({ length: 7 }, (_, index) => weekdays[(weekStartDay + index) % 7]);

	return (
		<ColumnBars
			height={180}
			items={ordered.map((day) => ({
				key: day.weekday,
				label: NAMES[day.weekday],
				title: FULL_NAMES[day.weekday],
				seconds: day.seconds,
			}))}
		/>
	);
}
