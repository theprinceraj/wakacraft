import { Geist, Geist_Mono } from 'next/font/google';

import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PUBLIC_ORIGIN } from '@/lib/public-origin';
import { THEME_SCRIPT } from '@/lib/theme-script';

import type { Metadata } from 'next';

import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

const description =
	'Open-source WakaTime alternative: automatic time tracking for developers that works with every WakaTime editor plugin.';

export const metadata: Metadata = {
	metadataBase: new URL(PUBLIC_ORIGIN),
	title: { default: 'wakacraft', template: '%s · wakacraft' },
	description,
	openGraph: { siteName: 'wakacraft', type: 'website', title: 'wakacraft', description },
	twitter: { card: 'summary_large_image', title: 'wakacraft', description },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		// The theme script sets the class before hydration, so the server markup can't match it.
		<html
			lang="en"
			suppressHydrationWarning
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
		>
			<head>
				{/* Light is the default; dark and "follow the system" are opt-in from the account menu. */}
				<script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
			</head>
			<body className="flex min-h-full flex-col">
				<TooltipProvider delayDuration={150}>{children}</TooltipProvider>
				<Toaster position="bottom-right" />
			</body>
		</html>
	);
}
