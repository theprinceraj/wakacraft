export const DataDumpTypes = { Heartbeats: 'heartbeats', Daily: 'daily' } as const;
export type DataDumpType = (typeof DataDumpTypes)[keyof typeof DataDumpTypes];
export const DataDumpTypesList: DataDumpType[] = Object.values(DataDumpTypes);

/** Download links stay valid this long, as on WakaTime. */
export const DATA_DUMP_TTL_DAYS = 7;
