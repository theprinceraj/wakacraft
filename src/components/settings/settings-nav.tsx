'use client';

import { useEffect, useRef, useState } from 'react';

import { chipClass } from '@/components/app/chip';
import { HookSidebar } from '@/components/ui/hook-sidebar';

export type SettingsSection = { id: string; label: string; group: string };

/** A section counts as current once its top passes this line, just under the sticky bars. */
const SPY_OFFSET_RAIL = 110;
const SPY_OFFSET_CHIPS = 150;
const RAIL_MIN_WIDTH = 1024;

/**
 * In-page navigation for the settings page: a grouped sticky rail on desktop and a sticky row of chips on small
 * screens. Clicking scrolls to a section; scrolling moves the marker to whichever section is in view.
 */
export function SettingsNav({ sections }: { sections: SettingsSection[] }) {
	const [active, setActive] = useState(0);
	const chips = useRef<HTMLElement>(null);
	// While a click-triggered smooth scroll runs, the spy would walk the marker through every section in between.
	const scrollingTo = useRef<number | null>(null);

	useEffect(() => {
		const spy = () => {
			if (scrollingTo.current !== null) return;
			const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
			if (atBottom) return setActive(sections.length - 1);
			const line = window.innerWidth >= RAIL_MIN_WIDTH ? SPY_OFFSET_RAIL : SPY_OFFSET_CHIPS;
			let current = 0;
			sections.forEach((section, index) => {
				const el = document.getElementById(section.id);
				if (el && el.getBoundingClientRect().top <= line) current = index;
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

	// Keep the current chip visible, moving only the row and never the page.
	useEffect(() => {
		const row = chips.current;
		const chip = row?.querySelector<HTMLElement>('[aria-current="true"]');
		if (row && chip && row.offsetParent) row.scrollTo({ left: chip.offsetLeft - 16, behavior: 'smooth' });
	}, [active]);

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

	const groups = [...new Set(sections.map((section) => section.group))];

	return (
		<>
			<aside className="hidden lg:block">
				<div className="sticky top-22 flex flex-col gap-4">
					{groups.map((group) => {
						const start = sections.findIndex((section) => section.group === group);
						const items = sections.filter((section) => section.group === group);
						const inGroup = active - start;
						return (
							<HookSidebar
								key={group}
								label={group}
								aria-label={`${group} settings`}
								items={items.map((section) => section.label)}
								value={inGroup >= 0 && inGroup < items.length ? inGroup : -1}
								onChange={(index) => select(start + index)}
								color="var(--ember)"
								dashed={false}
							/>
						);
					})}
				</div>
			</aside>

			<nav
				ref={chips}
				aria-label="Settings sections"
				className="scroll-x-quiet sticky top-16 z-20 -mx-4 flex gap-1.5 bg-background/88 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:hidden"
			>
				{sections.map((section, index) => (
					<button
						key={section.id}
						type="button"
						aria-current={index === active ? 'true' : undefined}
						onClick={() => select(index)}
						className={chipClass(index === active)}
					>
						{section.label}
					</button>
				))}
			</nav>
		</>
	);
}
