export const HeartbeatTypes = { File: 'file', Domain: 'domain', Url: 'url', App: 'app' } as const;
export type HeartbeatType = (typeof HeartbeatTypes)[keyof typeof HeartbeatTypes];
export const HeartbeatTypesList: HeartbeatType[] = Object.values(HeartbeatTypes);

/** The categories wakatime-cli accepts for `--category`. */
export const Categories = {
	Coding: 'coding',
	AiCoding: 'ai coding',
	Building: 'building',
	Indexing: 'indexing',
	Debugging: 'debugging',
	Browsing: 'browsing',
	RunningTests: 'running tests',
	WritingTests: 'writing tests',
	ManualTesting: 'manual testing',
	WritingDocs: 'writing docs',
	Communicating: 'communicating',
	CodeReviewing: 'code reviewing',
	Researching: 'researching',
	Learning: 'learning',
	Designing: 'designing',
	Translating: 'translating',
	Meeting: 'meeting',
	Planning: 'planning',
	Supporting: 'supporting',
	Advising: 'advising',
} as const;
export type Category = (typeof Categories)[keyof typeof Categories];
export const CategoriesList: Category[] = Object.values(Categories);

/** Dimensions a duration timeline / summary can be sliced by — the `slice_by` values WakaTime accepts. */
export const SliceBy = {
	Project: 'project',
	Entity: 'entity',
	Language: 'language',
	Dependencies: 'dependencies',
	Os: 'os',
	Editor: 'editor',
	Category: 'category',
	Machine: 'machine',
} as const;
export type SliceByName = (typeof SliceBy)[keyof typeof SliceBy];
export const SliceByList: SliceByName[] = Object.values(SliceBy);

/** Placeholder names WakaTime shows when a heartbeat lacks a value for a dimension. */
export const UNKNOWN_PROJECT = 'Unknown Project';
export const UNKNOWN_LANGUAGE = 'Other';
export const UNKNOWN_EDITOR = 'Unknown Editor';
export const UNKNOWN_OS = 'Unknown OS';
export const UNKNOWN_MACHINE = 'Unknown Hostname';
