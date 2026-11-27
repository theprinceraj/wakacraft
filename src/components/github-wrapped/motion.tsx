'use client';

import { animate, motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

import type { ReactNode } from 'react';

/** Fades and lifts its content in the first time it scrolls into view, so the wrapped reads as a story. */
export function Reveal({
	children,
	className,
	delay = 0,
}: {
	children: ReactNode;
	className?: string;
	delay?: number;
}) {
	const reduced = useReducedMotion();
	return (
		<motion.div
			className={className}
			// The same `initial` on server and client keeps hydration clean; reduced motion just skips the animation.
			initial={{ opacity: 0, y: 28 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: '0px 0px -12% 0px' }}
			transition={reduced ? { duration: 0 } : { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
		>
			{children}
		</motion.div>
	);
}

/**
 * Counts up to `value` once visible. The server markup already holds the final number, so it reads right without
 * JavaScript and for screen readers.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
	const ref = useRef<HTMLSpanElement>(null);
	const inView = useInView(ref, { once: true });
	const reduced = useReducedMotion();
	const animated = !reduced && value >= 10;

	// Written straight to the DOM rather than through state: one frame per tick, no re-render.
	useEffect(() => {
		const node = ref.current;
		if (!node || !animated) return;
		if (!inView) {
			node.textContent = '0';
			return;
		}
		const controls = animate(0, value, {
			duration: Math.min(2.2, 0.8 + Math.log10(value) * 0.4),
			ease: [0.16, 1, 0.3, 1],
			onUpdate: (latest) => {
				node.textContent = Math.round(latest).toLocaleString('en-US');
			},
		});
		return () => controls.stop();
	}, [animated, inView, value]);

	return (
		<span className={className}>
			<span className="sr-only">{value.toLocaleString('en-US')}</span>
			<span ref={ref} aria-hidden>
				{value.toLocaleString('en-US')}
			</span>
		</span>
	);
}
