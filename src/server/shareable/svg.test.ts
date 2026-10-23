import { describe, expect, it } from 'vitest';

import { activityCardSvg, badgeSvg, breakdownCardSvg, escape, totalCardSvg } from './svg';

describe('svg', () => {
	it('escapes markup in user-provided text', () => {
		expect(escape(`<script>"x" & 'y'</script>`)).toBe('&lt;script&gt;&quot;x&quot; &amp; &apos;y&apos;&lt;/script&gt;');
		const svg = badgeSvg('wakacraft', '<img onerror=alert(1)>');
		expect(svg).not.toContain('<img');
		expect(svg).toContain('&lt;img onerror=alert(1)&gt;');
	});

	it('sizes a badge to its text', () => {
		const short = badgeSvg('wakacraft', '1 hr');
		const long = badgeSvg('wakacraft', '1,234 hrs 56 mins');
		const width = (svg: string) => Number(/width="(\d+)"/.exec(svg)![1]);
		expect(width(long)).toBeGreaterThan(width(short));
	});

	it('renders at most six breakdown rows, and an empty state', () => {
		const items = Array.from({ length: 9 }, (_, index) => ({ name: `Lang ${index}`, text: '1 hr', percent: 10 }));
		expect(breakdownCardSvg('dark', 'Languages', 'Last 7 days', items).match(/Lang \d/g)).toHaveLength(6);
		expect(breakdownCardSvg('light', 'Languages', 'Last 7 days', [])).toContain('No activity');
	});

	it('renders a total card with escaped text', () => {
		const svg = totalCardSvg('dark', 'Lifetime coding time', '@me', '1,721 hrs 4 mins', 'since <today>');
		expect(svg).toContain('1,721 hrs 4 mins');
		expect(svg).toContain('since &lt;today&gt;');
	});

	it('renders one bar per day', () => {
		const days = ['Mon', 'Tue', 'Wed'].map((label, index) => ({
			label,
			seconds: index * 600,
			text: `${index * 10} mins`,
		}));
		expect(activityCardSvg('dark', 'Activity', 'Last 7 days', days).match(/<\/rect>/g)).toHaveLength(3);
	});
});
