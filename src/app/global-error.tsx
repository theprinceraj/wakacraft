'use client';

// The same hex equivalents of the light theme tokens as the OG images (globals.css isn't loaded here).
const CREAM = '#fefdf7';
const INK = '#131b34';
const MUTED = '#515869';
const EMBER = '#ea6300';

/** Replaces the root layout when it fails, so it brings its own document and plain inline styles. */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
	return (
		<html lang="en">
			<head>
				<title>Something went wrong · wakacraft</title>
			</head>
			<body
				style={{
					margin: 0,
					minHeight: '100dvh',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					padding: '0 24px',
					fontFamily: 'system-ui, sans-serif',
					background: CREAM,
					color: INK,
				}}
			>
				<div style={{ maxWidth: 560, margin: '0 auto' }}>
					<h1 style={{ fontSize: 40, margin: 0 }}>
						Something went wrong<span style={{ color: EMBER }}>.</span>
					</h1>
					<p style={{ marginTop: 16, lineHeight: 1.6, color: MUTED }}>
						wakacraft hit an unexpected error. Try again, or come back in a moment.
					</p>
					<button
						type="button"
						onClick={() => retry()}
						style={{
							marginTop: 24,
							height: 44,
							padding: '0 22px',
							border: 0,
							borderRadius: 999,
							background: INK,
							color: CREAM,
							fontSize: 14,
							fontWeight: 500,
							cursor: 'pointer',
						}}
					>
						Try again
					</button>
				</div>
			</body>
		</html>
	);
}
