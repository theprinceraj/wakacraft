import { Geist, Geist_Mono } from 'next/font/google';

import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

import type { Metadata } from 'next';

import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
	title: { default: 'wakacraft', template: '%s · wakacraft' },
	description: 'Automatic time tracking for developers. Works with every WakaTime editor plugin.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
			<body className="flex min-h-full flex-col">
				<TooltipProvider delayDuration={150}>{children}</TooltipProvider>
				<Toaster position="bottom-right" theme="dark" />
			</body>
		</html>
	);
}
