export const WakatimeImportStatuses = {
	Running: 'running',
	Done: 'done',
	Failed: 'failed',
	Cancelled: 'cancelled',
} as const;
export type WakatimeImportStatus = (typeof WakatimeImportStatuses)[keyof typeof WakatimeImportStatuses];
export const WakatimeImportStatusesList: WakatimeImportStatus[] = Object.values(WakatimeImportStatuses);
