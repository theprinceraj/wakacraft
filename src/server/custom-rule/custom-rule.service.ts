import { NotFoundException } from '@/lib/http/errors';
import { mongoCustomRuleService } from '@/lib/mongo/custom-rule/custom-rule.service';
import { mongoDailySummaryService } from '@/lib/mongo/daily-summary/daily-summary.service';
import { mongoHeartbeatService } from '@/lib/mongo/heartbeat/heartbeat.service';
import { mongoProjectService } from '@/lib/mongo/project/project.service';
import { mongoRuleJobService } from '@/lib/mongo/rule-job/rule-job.service';
import { RuleJobStatuses } from '@/lib/util/CustomRules';
import { generateFlake } from '@/lib/util/Snowflake';

import { ruleFilter, ruleUpdate, type Rule } from './custom-rule.matcher';
import { toCustomRuleResponse, type CustomRuleResponse } from './custom-rule.response.dto';

import type { RuleInput } from './custom-rule.request.dto';
import type { ICustomRuleZodSchema, IRuleJobZodSchema } from '@/lib/mongo/zod';

type RuleShape = Pick<ICustomRuleZodSchema, 'action' | 'source' | 'operation' | 'sourceValue'> & {
	destinations: Pick<ICustomRuleZodSchema['destinations'][number], 'destination' | 'destinationValue'>[];
};

/** A rule's identity for change reporting: what it matches and what it does. */
const signature = (rule: RuleShape) =>
	JSON.stringify([
		rule.action,
		rule.source,
		rule.operation,
		rule.sourceValue,
		rule.destinations.map((destination) => [destination.destination, destination.destinationValue]),
	]);

class CustomRuleService {
	public async rulesFor(userId: string): Promise<ICustomRuleZodSchema[]> {
		return mongoCustomRuleService.find({ userId }, '', { sort: { priority: 1 } });
	}

	public async list(userId: string): Promise<{ data: CustomRuleResponse[]; job_id?: string }> {
		const [rules, running] = await Promise.all([
			this.rulesFor(userId),
			mongoRuleJobService.findOne({ userId, status: RuleJobStatuses.Running }, 'id'),
		]);
		return { data: rules.map(toCustomRuleResponse), ...(running ? { job_id: running.id } : {}) };
	}

	/**
	 * Replaces the whole rule set (WakaTime's PUT semantics) and returns a job that applies it to past heartbeats.
	 * The caller schedules `applyToHistory(job)` after responding.
	 */
	public async replace(userId: string, inputs: RuleInput[]) {
		const previous = await this.rulesFor(userId);
		// Explicit priorities first, then input order for the rest.
		const ordered = inputs
			.map((input, index) => ({ input, index }))
			.sort((a, b) => (a.input.priority ?? Infinity) - (b.input.priority ?? Infinity) || a.index - b.index)
			.map(({ input }, index) => ({ ...input, priority: index + 1 }));

		const before = new Map(previous.map((rule) => [signature(rule), rule.priority]));
		const after = new Map(ordered.map((rule) => [signature(rule), rule.priority]));
		const changes = {
			added: ordered.filter((rule) => !before.has(signature(rule))).map((rule) => rule.priority),
			removed: previous.filter((rule) => !after.has(signature(rule))).map((rule) => rule.id),
			rearranged: ordered
				.filter((rule) => before.has(signature(rule)) && before.get(signature(rule)) !== rule.priority)
				.map((rule) => rule.priority),
		};

		await mongoCustomRuleService.deleteMany({ userId });
		await Promise.all(
			ordered.map((rule) =>
				mongoCustomRuleService.create({
					userId,
					action: rule.action,
					source: rule.source,
					operation: rule.operation,
					sourceValue: rule.sourceValue,
					destinations: rule.destinations.map((destination) => ({ id: generateFlake(), ...destination })),
					priority: rule.priority,
				}),
			),
		);

		const job = await mongoRuleJobService.create({ userId, status: RuleJobStatuses.Running, progress: 0 });
		return { changes, job };
	}

	public async remove(userId: string, ruleId: string) {
		if (!(await mongoCustomRuleService.deleteOne({ userId, id: ruleId }, 'id')))
			throw new NotFoundException('Rule not found');
		// Removing a rule doesn't undo rewrites it already made; re-applying keeps history consistent with the rest.
		return mongoRuleJobService.create({ userId, status: RuleJobStatuses.Running, progress: 0 });
	}

	public async progress(userId: string, jobId: string) {
		const job = await mongoRuleJobService.findOne({ userId, id: jobId });
		if (!job) throw new NotFoundException('Job not found');
		return {
			data: {
				job_id: job.id,
				progress: job.progress,
				status: job.status,
				changed_heartbeats: job.changedHeartbeats,
				deleted_heartbeats: job.deletedHeartbeats,
				...(job.error ? { error: job.error } : {}),
			},
		};
	}

	/** Rewrites stored heartbeats rule by rule (so later rules see earlier changes), then rebuilds derived data. */
	public async applyToHistory(job: Pick<IRuleJobZodSchema, 'id' | 'userId'>): Promise<void> {
		const { userId } = job;
		try {
			const rules: Rule[] = await this.rulesFor(userId);
			let changed = 0;
			let deleted = 0;

			for (const [index, rule] of rules.entries()) {
				const filter = { userId, ...ruleFilter(rule) };
				if (rule.action === 'delete') deleted += (await mongoHeartbeatService.deleteMany(filter)).deletedCount;
				else changed += (await mongoHeartbeatService.updateMany(filter, { $set: ruleUpdate(rule) })).modifiedCount;

				await mongoRuleJobService.updateMany(
					{ id: job.id },
					{
						$set: {
							progress: Math.round(((index + 1) / (rules.length + 1)) * 100),
							changedHeartbeats: changed,
							deletedHeartbeats: deleted,
						},
					},
				);
			}

			await Promise.all([mongoDailySummaryService.deleteMany({ userId }), this.rebuildProjects(userId)]);
			await mongoRuleJobService.updateMany(
				{ id: job.id },
				{ $set: { status: RuleJobStatuses.Done, progress: 100, finishedAt: new Date() } },
			);
		} catch (error) {
			console.error('Applying custom rules failed', error);
			await mongoRuleJobService.updateMany(
				{ id: job.id },
				{
					$set: {
						status: RuleJobStatuses.Failed,
						error: error instanceof Error ? error.message : String(error),
						finishedAt: new Date(),
					},
				},
			);
		}
	}

	/** Recomputes each project's activity window from heartbeats; projects left without heartbeats are removed. */
	private async rebuildProjects(userId: string) {
		const windows: { name: string; first: number; last: number }[] = await mongoHeartbeatService.aggregate([
			{ $match: { userId, project: { $type: 'string', $ne: '' } } },
			// eslint-disable-next-line no-restricted-syntax -- $group's grouping key must be named _id
			{ $group: { _id: '$project', first: { $min: '$time' }, last: { $max: '$time' } } },
			{ $project: { name: '$_id', first: 1, last: 1 } },
		]);

		await Promise.all(
			windows.map((window) =>
				mongoProjectService.updateOne(
					{ userId, name: window.name },
					{
						$set: { firstHeartbeatAt: new Date(window.first * 1000), lastHeartbeatAt: new Date(window.last * 1000) },
						$setOnInsert: { userId, name: window.name },
					},
					{ upsert: true, setDefaultsOnInsert: true },
				),
			),
		);
		await mongoProjectService.deleteMany({ userId, name: { $nin: windows.map((window) => window.name) } });
	}
}

export const customRuleService = new CustomRuleService();
