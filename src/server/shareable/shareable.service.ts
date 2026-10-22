import { ForbiddenException, NotFoundException } from '@/lib/http/errors';
import { mongoProjectService } from '@/lib/mongo/project/project.service';
import { formatDuration } from '@/lib/format';
import { statsService } from '@/server/stats/stats.service';
import { publicProfileService } from '@/server/user/public-profile.service';

import { activityCardSvg, badgeSvg, breakdownCardSvg, type Theme } from './svg';

export const ShareCharts = ['languages', 'editors', 'activity'] as const;
export type ShareChart = (typeof ShareCharts)[number];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

class ShareableService {
	/**
	 * README badge with a project's all-time total. Only projects their owner marked public; anything else is a 404
	 * so badge URLs can't be used to probe which private projects exist.
	 */
	public async projectBadge(username: string, projectName: string): Promise<string> {
		const profile = await publicProfileService.getProfile(username);
		const project = await mongoProjectService.findOne({ userId: profile.userId, name: projectName }, [
			'name',
			'hasPublicUrl',
		]);
		if (!project?.hasPublicUrl) throw new NotFoundException('Project not found');
		const { data } = await statsService.getAllTimeSinceToday(profile.userId, project.name);
		return badgeSvg('wakacraft', data.text);
	}

	/** Last-7-days chart data, through the same privacy rules as the public profile. */
	public async chartData(username: string, chart: ShareChart) {
		const profile = await publicProfileService.getProfile(username);
		const { data: stats } = await publicProfileService.getPublicStats(profile.userId, 'last_7_days', {});

		if (chart === 'activity') {
			const summaries = await statsService.getSummaries(profile.userId, { range: 'Last 7 Days' });
			return {
				username: profile.username!,
				title: 'Coding activity',
				total: stats.human_readable_total_including_other_language,
				days: summaries.data.map((day) => {
					const [year, month, date] = day.range.date.split('-').map(Number);
					return {
						date: day.range.date,
						label: WEEKDAYS[new Date(Date.UTC(year, month - 1, date)).getUTCDay()],
						seconds: day.grand_total.total_seconds,
						text: day.grand_total.text,
					};
				}),
			};
		}

		const visible = chart === 'languages' ? stats.is_language_usage_visible : stats.is_editor_usage_visible;
		if (!visible) throw new ForbiddenException(`This user's ${chart} are private`);
		const items = (chart === 'languages' ? stats.languages : stats.editors).map((item) => ({
			name: item.name,
			text: item.text,
			percent: item.percent,
		}));
		return {
			username: profile.username!,
			title: chart === 'languages' ? 'Languages' : 'Editors',
			total: stats.human_readable_total_including_other_language,
			items,
		};
	}

	public async chartSvg(username: string, chart: ShareChart, theme: Theme): Promise<string> {
		const data = await this.chartData(username, chart);
		const subtitle = `@${data.username} · last 7 days · ${data.total}`;
		if (data.days) {
			const days = data.days.map((day) => ({ ...day, text: `${day.label}: ${formatDuration(day.seconds)}` }));
			return activityCardSvg(theme, data.title, subtitle, days);
		}
		return breakdownCardSvg(theme, data.title, subtitle, data.items ?? []);
	}
}

export const shareableService = new ShareableService();
