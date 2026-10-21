import { cn } from '@/lib/utils';

/** Mark: an anvil-like stepped block with an ember spark — "craft" without leaning on a clock icon. */
export function Logo({ className, withWordmark = true }: { className?: string; withWordmark?: boolean }) {
	return (
		<span className={cn('inline-flex items-center gap-2', className)}>
			<svg viewBox="0 0 24 24" className="size-5" aria-hidden>
				<path d="M3 9h13l-3 4H8v3h6v3H5v-3h2v-3L3 9Z" fill="currentColor" opacity="0.92" />
				<circle cx="19.5" cy="5.5" r="2.5" fill="var(--ember)" className="glow text-ember" />
			</svg>
			{withWordmark ? <span className="text-[15px] font-semibold tracking-tight">wakacraft</span> : null}
		</span>
	);
}
