'use client';

import { useEffect, useRef, useState } from 'react';

import { HookSidebar } from '@/components/ui/hook-sidebar';

export type SettingsSection = { id: string; label: string };

/** A section counts as current once its top passes this line, just under the sticky app nav. */
const SPY_OFFSET = 96;

/**
 * Sticky in-page navigation for the settings page. Clicking scrolls to a section; scrolling moves the rail to
 * whichever section is in view.
 */
export function SettingsNav({ sections }: { sections: SettingsSection[] }) {
	const [active, setActive] = useState(0);
	// While a click-triggered smooth scroll runs, the spy would walk the rail through every section in between.
	const scrollingTo = useRef<number | null>(null);

	useEffect(() => {
		const spy = () => {
			if (scrollingTo.current !== null) return;
			const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
			if (atBottom) return setActive(sections.length - 1);
			let current = 0;
			sections.forEach((section, index) => {
				const el = document.getElementById(section.id);
				if (el && el.getBoundingClientRect().top <= SPY_OFFSET) current = index;
			});
			setActive(current);
		};
		const release = () => {
			scrollingTo.current = null;
		};

		spy();
		window.addEventListener('scroll', spy, { passive: true });
		window.addEventListener('scrollend', release);
		return () => {
			window.removeEventListener('scroll', spy);
			window.removeEventListener('scrollend', release);
		};
	}, [sections]);

	const select = (index: number) => {
		const section = sections[index];
		const el = section && document.getElementById(section.id);
		if (!el) return;
		scrollingTo.current = index;
		setActive(index);
		el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		// No scrollend fires when the page can't move (e.g. already at the bottom), so don't hold the lock forever.
		window.setTimeout(() => {
			if (scrollingTo.current === index) scrollingTo.current = null;
		}, 1000);
		history.replaceState(null, '', `#${section.id}`);
	};

	return (
		<HookSidebar
			aria-label="Settings sections"
			items={sections.map((section) => section.label)}
			value={active}
			onChange={select}
			color="var(--primary)"
		/>
	);
}
