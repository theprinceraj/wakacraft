'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { Segmented } from '@/components/app/segmented';

const TABS = [
	{ value: 'overview', label: 'Overview' },
	{ value: 'commits', label: 'Commits' },
	{ value: 'settings', label: 'Settings' },
];

/**
 * A project's three jobs, one at a time, linkable by hash. The range only applies to Overview, so it hides on the
 * other tabs rather than doing nothing there.
 */
export function ProjectTabs({
	range,
	overview,
	commits,
	settings,
}: {
	range: ReactNode;
	overview: ReactNode;
	commits: ReactNode;
	settings: ReactNode;
}) {
	const [tab, setTab] = useState('overview');
	// Mounted on first visit, so that Overview alone doesn't call GitHub; kept after that, to preserve unsaved edits and
	// the commits page. Overview has no such state, and its charts can't measure themselves while hidden.
	const [visited, setVisited] = useState<string[]>([]);
	const show = (next: string) => {
		setTab(next);
		setVisited((current) => (current.includes(next) ? current : [...current, next]));
	};

	useEffect(() => {
		const fromHash = () => {
			const hash = window.location.hash.slice(1);
			if (TABS.some((item) => item.value === hash)) show(hash);
		};
		fromHash();
		window.addEventListener('hashchange', fromHash);
		return () => window.removeEventListener('hashchange', fromHash);
	}, []);

	return (
		<>
			<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
				<Segmented
					aria-label="Project sections"
					value={tab}
					options={TABS}
					onValueChange={(next) => {
						show(next);
						history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${next}`);
					}}
				/>
				{tab === 'overview' ? range : null}
			</div>
			{tab === 'overview' ? overview : null}
			{visited.includes('commits') ? <div hidden={tab !== 'commits'}>{commits}</div> : null}
			{visited.includes('settings') ? <div hidden={tab !== 'settings'}>{settings}</div> : null}
		</>
	);
}
