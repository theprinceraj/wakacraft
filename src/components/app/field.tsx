import type { ReactNode } from 'react';

const LABEL = 'text-[13px] font-medium';

/**
 * A labelled form control in a dialog. Wrapping the control is what associates the two. A set of chips is several
 * controls, where a wrapping label would toggle the first chip on any click, so `group` labels the set instead.
 */
export function Field({ label, group = false, children }: { label: string; group?: boolean; children: ReactNode }) {
	if (group) {
		return (
			<div role="group" aria-label={label} className="grid gap-1.5">
				<span className={LABEL}>{label}</span>
				{children}
			</div>
		);
	}
	return (
		<label className="grid gap-1.5">
			<span className={LABEL}>{label}</span>
			{children}
		</label>
	);
}
