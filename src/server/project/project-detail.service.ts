import { eachDate, todayIn } from '@/lib/util/Time';
import { DashboardRanges, type Breakdown, type DashboardRangeSlug } from '@/server/dashboard/dashboard.service';
import { loadDayTotals } from '@/server/stats/day-totals';
import { type StatTotal } from '@/server/stats/engine';
import { resolveSummaryRange } from '@/server/stats/ranges';
import { statsService, sumTotals } from '@/server/stats/stats.service';

import { projectService } from './project.service';

import type { IProjectZodSchema } from '@/lib/mongo/zod';

const TOP_LANGUAGES = 5;

export interface ProjectDetailView {
	project: Pick<IProjectZodSchema, 'id' | 'name' | 'color' | 'repository' | 'firstHeartbeatAt' | 'lastHeartbeatAt'>;
	range: { slug: DashboardRangeSlug; label: string; start: string; end: string; days: number };
	totals: {
		seconds: number;
		activeDays: number;
		dailyAverageSeconds: number;
		aiLineChanges: number;
		humanLineChanges: number;
	};
	/** Daily seconds stacked by the project's top languages (rest folded into "Other"). */
	daily: { date: string; total: number; series: Record<string, number> }[];
	seriesNames: string[];
	languages: Breakdown[];
	branches: Breakdown[];
	files: Breakdown[];
	editors: Breakdown[];
	categories: Breakdown[];
	machines: Breakdown[];
}

const toBreakdown = (items: StatTotal[], total: number): Breakdown[] =>
	items
		.filter((item) => item.totalSeconds > 0)
		.map((item) => ({
			name: item.name,
			seconds: item.totalSeconds,
			percent: total ? (item.totalSeconds / total) * 100 : 0,
		}));

class ProjectDetailService {
	public async getView(userId: string, projectName: string, slug: DashboardRangeSlug): Promise<ProjectDetailView> {
		const [project, settings] = await Promise.all([
			projectService.getByName(userId, projectName),
			statsService.resolveSettings(userId),
		]);
		const range = resolveSummaryRange(DashboardRanges[slug], todayIn(settings.timezone), settings.weekStartDay);
		const dates = eachDate(range.start, range.end);

		// Filtered by project, so branches and entities (files) are tallied too; never served from rollups.
		const totals = await loadDayTotals(userId, dates, settings, { project: project.name });
		const days = dates.map((date) => totals.get(date)!);
		const total = sumTotals(days);
		const active = days.filter((day) => day.totalSeconds > 0).length;

		const seriesNames = total.languages.slice(0, TOP_LANGUAGES).map((language) => language.name);
		const hasOther = total.languages.length > TOP_LANGUAGES;

		return {
			project: {
				id: project.id,
				name: project.name,
				color: project.color,
				repository: project.repository,
				firstHeartbeatAt: project.firstHeartbeatAt,
				lastHeartbeatAt: project.lastHeartbeatAt,
			},
			range: { slug, label: range.text, start: range.start, end: range.end, days: dates.length },
			totals: {
				seconds: total.totalSeconds,
				activeDays: active,
				dailyAverageSeconds: active ? total.totalSeconds / active : 0,
				aiLineChanges: total.aiLineChanges,
				humanLineChanges: total.humanLineChanges,
			},
			daily: dates.map((date, index) => {
				const series: Record<string, number> = Object.fromEntries(seriesNames.map((name) => [name, 0]));
				for (const language of days[index].languages) {
					if (language.name in series) series[language.name] += language.totalSeconds;
					else series.Other = (series.Other ?? 0) + language.totalSeconds;
				}
				return { date, total: days[index].totalSeconds, series };
			}),
			seriesNames: hasOther ? [...seriesNames, 'Other'] : seriesNames,
			languages: toBreakdown(total.languages, total.totalSeconds),
			branches: toBreakdown(total.branches, total.totalSeconds),
			files: toBreakdown(total.entities, total.totalSeconds),
			editors: toBreakdown(total.editors, total.totalSeconds),
			categories: toBreakdown(total.categories, total.totalSeconds),
			machines: toBreakdown(total.machines, total.totalSeconds),
		};
	}
}

export const projectDetailService = new ProjectDetailService();
