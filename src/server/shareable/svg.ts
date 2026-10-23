/**
 * Server-rendered SVGs for README badges and embeds. Pure string templates: every user-provided string goes through
 * `escape` (project and language names end up inside XML).
 */

export const escape = (value: string) =>
	value.replace(
		/[<>&'"]/g,
		(char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]!,
	);

/** Verdana advance widths at 11px for the characters that differ most from the 6.6px default. */
const CHAR_WIDTHS: Record<string, number> = {
	...Object.fromEntries([...'0123456789'].map((digit) => [digit, 7])),
	' ': 3.9,
	',': 4,
	'.': 4,
	':': 4.6,
	f: 3.9,
	i: 3,
	j: 3.3,
	l: 3,
	r: 4.7,
	t: 4.3,
	c: 5.7,
	s: 5.7,
	z: 5.7,
	m: 10.7,
	w: 9,
	M: 9.6,
	W: 10.9,
};

/** Width of 11px Verdana text, close enough to size a badge without a font engine. */
const textWidth = (text: string) => Math.ceil([...text].reduce((sum, char) => sum + (CHAR_WIDTHS[char] ?? 6.6), 0));

/** wakacraft's primary colour (`--primary` in light mode) in sRGB. */
const BADGE_COLOR = '#ea6300';

/** The app icon's anvil and ember (`app/icon.svg`), drawn into a 14px slot at the badge's left edge. */
const BADGE_LOGO = `<svg x="5" y="3" width="14" height="14" viewBox="4 5 23 22"><g transform="translate(1 4) scale(1.15)"><path d="M3 9h13l-3 4H8v3h6v3H5v-3h2v-3L3 9Z" fill="#fff"/><circle cx="19.5" cy="5.5" r="2.5" fill="#ff8f31"/></g></svg>`;

/** Flat badge in the style of WakaTime's (and shields.io's): logo and grey label, value on wakacraft orange. */
export function badgeSvg(label: string, value: string): string {
	const [labelWidth, valueWidth] = [textWidth(label), textWidth(value)];
	// Logo slot (5 + 14) and a 3px gap, then the label; text is stretched to the estimated width so padding is exact.
	const left = 22 + labelWidth + 6;
	const right = valueWidth + 12;
	const width = left + right;
	const [l, v] = [escape(label), escape(value)];
	const text = (x: number, length: number, content: string) =>
		[`y="15" fill="#010101" fill-opacity=".3"`, `y="14"`]
			.map((attrs) => `<text x="${x}" ${attrs} textLength="${length}" lengthAdjust="spacing">${content}</text>`)
			.join('');
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${l}: ${v}">
<title>${l}: ${v}</title>
<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
<clipPath id="r"><rect width="${width}" height="20" rx="3" fill="#fff"/></clipPath>
<g clip-path="url(#r)"><rect width="${left}" height="20" fill="#555"/><rect x="${left}" width="${right}" height="20" fill="${BADGE_COLOR}"/><rect width="${width}" height="20" fill="url(#s)"/></g>
${BADGE_LOGO}
<g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
${text(22 + labelWidth / 2, labelWidth, l)}${text(left + right / 2, valueWidth, v)}
</g></svg>`;
}

export type Theme = 'dark' | 'light';

const THEMES = {
	dark: { bg: '#11141b', border: '#262a33', text: '#e7e9ee', muted: '#8b90a0', track: '#1f232c' },
	light: { bg: '#ffffff', border: '#e3e5ea', text: '#1c1f26', muted: '#6b7080', track: '#eef0f3' },
} as const;

/** Chart palette, matching the app's chart tokens in sRGB. */
export const PALETTE = ['#f08c2e', '#4cc3dd', '#a37ef0', '#a8e04b', '#f06a86', '#f2cf4a', '#45c7b3'];

const card = (theme: Theme, title: string, subtitle: string, height: number, body: string) => {
	const t = THEMES[theme];
	return `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="${height}" viewBox="0 0 440 ${height}" role="img" aria-label="${escape(title)}">
<rect x="0.5" y="0.5" width="439" height="${height - 1}" rx="8" fill="${t.bg}" stroke="${t.border}"/>
<g font-family="Segoe UI,Ubuntu,Helvetica,Arial,sans-serif">
<text x="20" y="30" font-size="14" font-weight="600" fill="${t.text}">${escape(title)}</text>
<text x="420" y="30" font-size="11" fill="${t.muted}" text-anchor="end">${escape(subtitle)}</text>
${body}
</g></svg>`;
};

/** Ranked bars: name, share bar, time. */
export function breakdownCardSvg(
	theme: Theme,
	title: string,
	subtitle: string,
	items: { name: string; text: string; percent: number }[],
): string {
	const t = THEMES[theme];
	const rows = items.slice(0, 6);
	const body = rows.length
		? rows
				.map((item, index) => {
					const y = 58 + index * 26;
					const width = Math.max(2, (item.percent / Math.max(...rows.map((row) => row.percent))) * 250);
					return `<text x="20" y="${y + 4}" font-size="12" fill="${t.text}">${escape(item.name.slice(0, 18))}</text>
<rect x="140" y="${y - 4}" width="250" height="6" rx="3" fill="${t.track}"/>
<rect x="140" y="${y - 4}" width="${width.toFixed(1)}" height="6" rx="3" fill="${PALETTE[index % PALETTE.length]}"/>
<text x="420" y="${y + 4}" font-size="11" fill="${t.muted}" text-anchor="end">${item.percent.toFixed(0)}%</text>`;
				})
				.join('\n')
		: `<text x="20" y="64" font-size="12" fill="${t.muted}">No activity in the last 7 days</text>`;
	return card(theme, title, subtitle, Math.max(90, 52 + rows.length * 26 + 8), body);
}

/** Seven daily bars with weekday labels. */
export function activityCardSvg(
	theme: Theme,
	title: string,
	subtitle: string,
	days: { label: string; seconds: number; text: string }[],
): string {
	const t = THEMES[theme];
	const max = Math.max(1, ...days.map((day) => day.seconds));
	const slot = 400 / days.length;
	const body = days
		.map((day, index) => {
			const height = day.seconds ? Math.max(3, (day.seconds / max) * 90) : 2;
			const x = 20 + index * slot + slot * 0.2;
			const w = slot * 0.6;
			return `<rect x="${x.toFixed(1)}" y="${(150 - height).toFixed(1)}" width="${w.toFixed(1)}" height="${height.toFixed(1)}" rx="3" fill="${day.seconds ? PALETTE[0] : t.track}"><title>${escape(day.text)}</title></rect>
<text x="${(x + w / 2).toFixed(1)}" y="168" font-size="10" fill="${t.muted}" text-anchor="middle">${escape(day.label)}</text>`;
		})
		.join('\n');
	return card(theme, title, subtitle, 184, body);
}
