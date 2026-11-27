import { ImageResponse } from 'next/og';

export const alt = 'wakacraft: Open-source WakaTime alternative. Every feature free.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Hex equivalents of the light theme tokens in globals.css (ImageResponse can't read CSS variables).
const CREAM = '#fefdf7';
const INK = '#131b34';
const MUTED = '#515869';
const EMBER = '#ea6300';
const EMPTY = '#e8e6e0';

const COLS = 14;
const ROWS = 7;
const cells = Array.from({ length: COLS * ROWS }, (_, i) => {
	const noise = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
	const level = noise < 0.3 ? 0 : noise < 0.55 ? 0.3 : noise < 0.8 ? 0.6 : 1;
	return level;
});

export default function Image() {
	return new ImageResponse(
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				background: CREAM,
				color: INK,
				padding: 72,
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>
				wakacraft<span style={{ color: EMBER }}>.</span>
			</div>
			<div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
				<div style={{ display: 'flex', flexDirection: 'column', maxWidth: 600 }}>
					<div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
						Open-source WakaTime alternative.
					</div>
					<div style={{ marginTop: 24, fontSize: 38, color: MUTED }}>Every feature free.</div>
				</div>
				<div style={{ display: 'flex', flexWrap: 'wrap', width: COLS * 32 }}>
					{cells.map((level, i) => (
						<div
							key={i}
							style={{
								width: 26,
								height: 26,
								margin: 3,
								borderRadius: 6,
								background: level === 0 ? EMPTY : EMBER,
								opacity: level === 0 ? 1 : level,
							}}
						/>
					))}
				</div>
			</div>
		</div>,
		size,
	);
}
