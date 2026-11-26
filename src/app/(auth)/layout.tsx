import Link from 'next/link';
import { Suspense } from 'react';

import { Logo } from '@/components/app/logo';
import { RedirectIfSignedIn } from '@/components/app/redirect-if-signed-in';
import { ActivityHeatmap } from '@/components/landing/activity-heatmap';

const NEXT_STEPS = [
	['Create an API key', 'Under Settings, in a few seconds.'],
	['Connect your editor', 'The wakacraft extension, or one line in ~/.wakatime.cfg.'],
	['Write code', 'Your dashboard fills in by itself.'],
] as const;

/**
 * Sign-in wears the homepage's look (`.landing` keeps it cream in any theme), without its nav or footer. It is at least
 * one screen tall: on desktop the content fits a screen, so there is nothing to scroll; when it doesn't fit (phones,
 * tablets, very short windows) the page scrolls rather than clipping.
 */
export default function AuthLayout({ children }: LayoutProps<'/'>) {
	return (
		<div className="landing flex min-h-dvh flex-col">
			<Suspense>
				<RedirectIfSignedIn />
			</Suspense>
			<main className="grid flex-1 gap-4 p-4 sm:p-6 lg:grid-cols-2">
				<div className="tile flex flex-col p-8 sm:p-12">
					<Link href="/" className="self-start text-foreground">
						<Logo />
					</Link>
					<div className="flex flex-1 flex-col justify-center py-12">
						<div className="w-full max-w-md">{children}</div>
					</div>
				</div>
				<aside className="flex flex-col justify-between gap-8 rounded-[28px] bg-ink p-10 text-ink-foreground max-lg:hidden xl:p-12">
					<div>
						<ActivityHeatmap className="w-full max-w-md" />
						<p className="mt-8 max-w-sm text-3xl [@media(max-height:760px)]:hidden leading-tight font-semibold tracking-[-0.03em]">
							Every day you coded, at a glance.
						</p>
					</div>
					<div>
						<p className="text-sm text-ink-foreground/60">After you sign in</p>
						<ol className="mt-5 divide-y divide-ink-foreground/10 border-y border-ink-foreground/10">
							{NEXT_STEPS.map(([title, body], index) => (
								<li key={title} className="flex items-baseline gap-5 py-4">
									<span className="tabular text-sm text-ink-foreground/60">0{index + 1}</span>
									<span>
										<span className="font-semibold">{title}</span>
										<span className="block text-sm text-ink-foreground/60">{body}</span>
									</span>
								</li>
							))}
						</ol>
					</div>
				</aside>
			</main>
		</div>
	);
}
