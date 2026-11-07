import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

/** The homepage's headline with its orange full stop, plus the page's description and actions. */
export function PageHeader({
	title,
	titleAction,
	eyebrow,
	description,
	actions,
	back,
	className,
}: {
	title: ReactNode;
	titleAction?: ReactNode;
	eyebrow?: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
	back?: { href: string; label: ReactNode };
	className?: string;
}) {
	return (
		<div className={cn('mb-6', className)}>
			{back ? (
				<Link
					href={back.href}
					className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
				>
					<ArrowLeft className="size-3.5" aria-hidden /> {back.label}
				</Link>
			) : null}
			<div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
				<div className="max-w-full min-w-0">
					{eyebrow ? <p className="mb-2 text-[13px] text-muted-foreground">{eyebrow}</p> : null}
					<div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
						<h1 className="text-[clamp(2rem,5vw,3rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance [overflow-wrap:anywhere]">
							{title}
							<span className="text-ember">.</span>
						</h1>
						{titleAction}
					</div>
					{description ? (
						<div className="mt-2.5 max-w-[62ch] text-[15px] text-muted-foreground">{description}</div>
					) : null}
				</div>
				{actions ? <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
			</div>
		</div>
	);
}
