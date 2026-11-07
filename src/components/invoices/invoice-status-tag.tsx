import { Tag } from '@/components/app/chip';
import { InvoiceStatuses, type InvoiceStatus } from '@/lib/util/Invoices';

const TONES = {
	[InvoiceStatuses.Draft]: 'neutral',
	[InvoiceStatuses.Sent]: 'ember',
	[InvoiceStatuses.Paid]: 'good',
} as const;

export function InvoiceStatusTag({ status }: { status: InvoiceStatus }) {
	return (
		<Tag tone={TONES[status]} className="capitalize">
			{status}
		</Tag>
	);
}
