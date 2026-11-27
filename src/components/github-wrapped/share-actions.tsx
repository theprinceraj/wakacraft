'use client';

import { Check, Link2, Share2 } from 'lucide-react';

import { useSyncExternalStore } from 'react';

import { useCopy } from '@/components/app/use-copy';

const noop = () => () => undefined;

const button =
	'inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';

/** Copy, native share and one-tap posts to X and LinkedIn for a wrapped page. */
export function ShareActions({ url, text }: { url: string; text: string }) {
	const { copied, copy } = useCopy();
	// False on the server and through hydration, so the markup matches; the button appears where the browser can share.
	const canShare = useSyncExternalStore(
		noop,
		() => 'share' in navigator,
		() => false,
	);
	const x = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
	const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

	return (
		<div className="flex flex-wrap items-center gap-3">
			<button
				type="button"
				onClick={() => copy(url)}
				className={`${button} bg-primary text-primary-foreground hover:bg-primary/90`}
			>
				{copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
				{copied ? 'Link copied' : 'Copy link'}
			</button>
			<a
				href={x}
				target="_blank"
				rel="noreferrer"
				className={`${button} bg-foreground text-background hover:bg-foreground/85`}
			>
				Post on X
			</a>
			<a
				href={linkedin}
				target="_blank"
				rel="noreferrer"
				className={`${button} shadow-[inset_0_0_0_1px_var(--input)] hover:bg-accent`}
			>
				Share on LinkedIn
			</a>
			{canShare ? (
				<button
					type="button"
					onClick={() => navigator.share({ title: 'GitHub Wrapped', text, url }).catch(() => undefined)}
					className={`${button} shadow-[inset_0_0_0_1px_var(--input)] hover:bg-accent`}
				>
					<Share2 className="size-4" /> More
				</button>
			) : null}
		</div>
	);
}
