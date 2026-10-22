import { ForbiddenException, NotFoundException } from '@/lib/http/errors';
import { mongoProjectService } from '@/lib/mongo/project/project.service';
import { eachDate, addDays, todayIn, weekdayOf } from '@/lib/util/Time';
import { loadDayTotals } from '@/server/stats/day-totals';
import { statsService, sumTotals } from '@/server/stats/stats.service';

import { userProfileService } from './user-profile.service';
import { userService } from './user.service';

import type { PublicUserResponse } from './public-profile.response.dto';
import type { IUserProfileZodSchema } from '@/lib/mongo/zod';
import type { StatsSettingsQuery } from '@/server/stats/stats.request.dto';
import type { StatsResponse } from '@/server/stats/stats.response.dto';

const HEATMAP_WEEKS = 53;

class PublicProfileService {
	public async getProfile(username: string): Promise<IUserProfileZodSchema> {
		const profile = await userProfileService.findByUsername(username);
		if (!profile?.username) throw new NotFoundException('User not found');
		return profile;
	}

	public async getPublicUser(userId: string): Promise<PublicUserResponse> {
		const user = await userService.getCurrentUser(userId);
		return {
			id: user.id,
			username: user.username,
			display_name: user.display_name,
			full_name: user.full_name,
			photo: user.is_photo_public ? user.photo : null,
			email: user.is_email_public ? user.email : null,
			bio: user.bio,
			website: user.website,
			github_username: user.github_username,
			twitter_username: user.twitter_username,
			linkedin_username: user.linkedin_username,
			city: user.city,
			is_hireable: user.is_hireable,
			logged_time_public: user.logged_time_public,
			languages_used_public: user.languages_used_public,
			editors_used_public: user.editors_used_public,
			categories_used_public: user.categories_used_public,
			os_used_public: user.os_used_public,
			created_at: user.created_at,
		};
	}

	/**
	 * Another user's stats, as WakaTime shows them publicly: only when logged time is public, with each breakdown
	 * included only if its own flag is on. Projects appear only when marked public; machines and dependencies never.
	 */
	public async getPublicStats(userId: string, range: string, query: StatsSettingsQuery): Promise<StatsResponse> {
		const profile = await userProfileService.getProfile(userId);
		if (!profile.loggedTimePublic) throw new ForbiddenException("This user's coding activity is private");

		// The owner's own settings decide how their time is counted, not the viewer's query.
		const { data } = await statsService.getStats(userId, range, { timezone: query.timezone });
		const publicProjects = new Set(
			(await mongoProjectService.find({ userId, hasPublicUrl: true }, ['name'])).map((project) => project.name),
		);

		return {
			data: {
				...data,
				is_language_usage_visible: profile.languagesUsedPublic,
				is_editor_usage_visible: profile.editorsUsedPublic,
				is_category_usage_visible: profile.categoriesUsedPublic,
				is_os_usage_visible: profile.osUsedPublic,
				languages: profile.languagesUsedPublic ? data.languages : [],
				editors: profile.editorsUsedPublic ? data.editors : [],
				categories: profile.categoriesUsedPublic ? data.categories : [],
				operating_systems: profile.osUsedPublic ? data.operating_systems : [],
				projects: data.projects.filter((project) => publicProjects.has(project.name)),
				machines: [],
				dependencies: [],
			},
		};
	}

	/** Everything the public profile page renders. */
	public async getPageView(username: string) {
		const profile = await this.getProfile(username);
		const user = await this.getPublicUser(profile.userId);
		if (!profile.loggedTimePublic) return { user, stats: null, heatmap: null };

		const [stats, settings] = await Promise.all([
			this.getPublicStats(profile.userId, 'last_7_days', {}),
			statsService.resolveSettings(profile.userId),
		]);
		const today = todayIn(settings.timezone);
		const rawStart = addDays(today, -(HEATMAP_WEEKS * 7 - 1));
		const start = addDays(rawStart, -((weekdayOf(rawStart) - settings.weekStartDay + 7) % 7));
		const dates = eachDate(start, today);
		const totals = await loadDayTotals(profile.userId, dates, settings);
		const year = sumTotals(dates.map((date) => totals.get(date)!));

		return {
			user,
			stats: stats.data,
			yearSeconds: year.totalSeconds,
			heatmap: dates.map((date) => ({ date, seconds: totals.get(date)?.totalSeconds ?? 0 })),
		};
	}
}

export const publicProfileService = new PublicProfileService();
