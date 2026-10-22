export const InvoiceStatuses = { Draft: 'draft', Sent: 'sent', Paid: 'paid' } as const;
export type InvoiceStatus = (typeof InvoiceStatuses)[keyof typeof InvoiceStatuses];
export const InvoiceStatusesList: InvoiceStatus[] = Object.values(InvoiceStatuses);

export const RoundingOptions = [0, 6, 15, 30, 60] as const;
