import Link from 'next/link';

import { Tag } from '@/components/app/chip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDuration, initialsOf } from '@/lib/format';
import { cn } from '@/lib/utils';

import type { leaderboardService } from '@/server/leaderboard/leaderboard.service';

type Leaders = Awaited<ReturnType<typeof leaderboardService.publicLeaders>>;

export function LeadersTable({ leaders, highlightUserId }: { leaders: Leaders['data']; highlightUserId?: string }) {
	if (!leaders.length) {
		return (
			<p className="border-t px-4 py-10 text-center text-sm text-muted-foreground">
				Nobody has coded in this range yet.
			</p>
		);
	}
	const max = Math.max(1, ...leaders.map((entry) => entry.running_total.total_seconds));

	return (
		<ol className="divide-y border-t">
			{leaders.map(({ rank, running_total: total, user }) => {
				const name = user.full_name ?? user.username ?? 'Anonymous';
				const isYou = user.id === highlightUserId;
				return (
					<li
						key={user.id}
						className={cn(
							'grid grid-cols-[1.5rem_2.25rem_minmax(0,1fr)_4.875rem] items-center gap-3 px-5.5 py-3.5 sm:px-7',
							isYou && 'bg-ember/11',
						)}
					>
						<span
							className={cn(
								'text-center text-[15px] font-semibold tabular-nums',
								rank <= 3 ? 'text-ember-text' : 'text-muted-foreground',
							)}
						>
							{rank}
						</span>
						<Avatar className="size-9">
							{user.photo ? <AvatarImage src={user.photo} alt="" /> : null}
							<AvatarFallback className="bg-accent text-xs font-semibold">{initialsOf(name)}</AvatarFallback>
						</Avatar>
						<div className="min-w-0">
							<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
								{user.username ? (
									<Link
										href={`/@${user.username}`}
										className="max-w-full truncate font-medium transition-colors hover:text-ember-text"
									>
										{name}
									</Link>
								) : (
									<span className="max-w-full truncate font-medium">{name}</span>
								)}
								{isYou ? <Tag tone="ember">You</Tag> : null}
								{user.is_hireable ? <Tag tone="good">Hireable</Tag> : null}
							</div>
							<div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-track">
								<div
									className="h-full rounded-full"
									style={{
										width: `${(total.total_seconds / max) * 100}%`,
										background: isYou ? 'var(--ember)' : 'var(--bar)',
									}}
								/>
							</div>
							{total.languages.length ? (
								<p className="mt-1.25 truncate text-xs text-muted-foreground">
									{total.languages.map((language) => language.name).join(' · ')}
								</p>
							) : null}
						</div>
						<div className="text-right">
							<p className="font-semibold tabular-nums">{formatDuration(total.total_seconds)}</p>
							<p className="text-xs text-muted-foreground tabular-nums">{formatDuration(total.daily_average)}/day</p>
						</div>
					</li>
				);
			})}
		</ol>
	);
}
