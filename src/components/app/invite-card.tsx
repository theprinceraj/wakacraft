import { Check, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import type { ReactNode } from 'react';

/** Invite landing card, for boards and teams. Joining shares your data, so it says exactly what, before the click. */
export function InviteCard({
	name,
	kind,
	points,
	join,
	cancelHref,
}: {
	name: string;
	kind: string;
	points: { text: string; icon?: LucideIcon }[];
	join: ReactNode;
	cancelHref: string;
}) {
	return (
		<div className="tile mx-auto mt-6 max-w-[34rem] p-7 sm:p-9">
			<p className="text-[13px] text-muted-foreground">You&apos;ve been invited to</p>
			<h1 className="mt-2 text-[clamp(1.875rem,6vw,2.5rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance [overflow-wrap:anywhere]">
				{name}
				<span className="text-ember">.</span>
			</h1>
			<p className="mt-2 text-[13px] text-muted-foreground">{kind}</p>
			<ul className="mt-6 divide-y border-y">
				{points.map(({ text, icon: Icon = Check }) => (
					<li key={text} className="flex items-center gap-3 py-3.5 text-[13px]">
						<Icon className="size-4 shrink-0 text-ember-text" strokeWidth={2.5} aria-hidden />
						{text}
					</li>
				))}
			</ul>
			<div className="mt-6 flex flex-wrap items-center gap-5">
				{join}
				<Link
					href={cancelHref}
					className="text-sm font-medium underline decoration-ember decoration-2 underline-offset-[6px] transition-colors hover:text-ember-text"
				>
					not now
				</Link>
			</div>
		</div>
	);
}
