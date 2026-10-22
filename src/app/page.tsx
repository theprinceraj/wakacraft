import Link from 'next/link';
import { Suspense } from 'react';

import { Logo } from '@/components/app/logo';
import { RedirectIfSignedIn } from '@/components/app/redirect-if-signed-in';
import { Button } from '@/components/ui/button';

const FEATURES = [
	['Automatic', 'Editor heartbeats become time. No timers to start, nothing to forget.'],
	['Every editor', 'Uses the WakaTime plugins you already have: VS Code, JetBrains, Neovim and 100+ more.'],
	['Yours', 'Projects, languages, branches, machines and AI-assisted lines, broken down to the minute.'],
	['Open source', 'AGPL-licensed and self-hostable. Every feature included, nothing behind a paid plan.'],
];

const REPO_URL = 'https://github.com/theprinceraj/wakacraft';

export default function HomePage() {
	return (
		<div className="canvas-grid flex min-h-full flex-1 flex-col">
			<Suspense>
				<RedirectIfSignedIn />
			</Suspense>
			<header className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
				<Logo />
				<div className="flex items-center gap-2">
					<Button variant="ghost" className="max-sm:hidden" asChild>
						<a href={REPO_URL}>GitHub</a>
					</Button>
					<Button variant="ghost" asChild>
						<Link href="/login">Sign in</Link>
					</Button>
					<Button asChild>
						<Link href="/login">Get started</Link>
					</Button>
				</div>
			</header>
			<main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-14 px-4 py-20">
				<div className="max-w-2xl">
					<p className="tabular text-xs tracking-[0.16em] text-ember uppercase">Open-source WakaTime alternative</p>
					<h1 className="mt-4 text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
						Know where your
						<br />
						coding hours go.
					</h1>
					<p className="mt-5 max-w-lg text-muted-foreground">
						wakacraft turns editor activity into a precise, private record of your work — and plugs into every WakaTime
						plugin with one line of config. Every feature is free, and you can self-host it.
					</p>
					<div className="mt-8 flex gap-3">
						<Button size="lg" asChild>
							<Link href="/login">Start tracking free</Link>
						</Button>
						<Button size="lg" variant="outline" asChild>
							<a href={REPO_URL}>View source</a>
						</Button>
					</div>
				</div>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{FEATURES.map(([title, body]) => (
						<div key={title} className="rounded-lg border bg-card/70 p-4">
							<p className="text-sm font-medium">{title}</p>
							<p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
						</div>
					))}
				</div>
			</main>
		</div>
	);
}
