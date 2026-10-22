import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

import type { leaderboardService } from '@/server/leaderboard/leaderboard.service';

type Leaders = Awaited<ReturnType<typeof leaderboardService.publicLeaders>>;

const initials = (name: string) =>
	name
		.split(/\s+/)
		.map((word) => word[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();

export function LeadersTable({ leaders, highlightUserId }: { leaders: Leaders['data']; highlightUserId?: string }) {
	if (!leaders.length) {
		return <p className="px-4 py-10 text-center text-xs text-muted-foreground">Nobody has coded in this range yet.</p>;
	}
	const max = leaders[0].running_total.total_seconds;

	return (
		<ol className="divide-y">
			{leaders.map(({ rank, running_total: total, user }) => {
				const name = user.full_name ?? user.username ?? 'Anonymous';
				return (
					<li
						key={user.id}
						className={cn(
							'grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5',
							user.id === highlightUserId && 'bg-ember/5',
						)}
					>
						<span className={cn('tabular text-center text-sm', rank <= 3 ? 'text-ember' : 'text-muted-foreground')}>
							{rank}
						</span>
						<div className="flex min-w-0 items-center gap-3">
							<Avatar className="size-8">
								{user.photo ? <AvatarImage src={user.photo} alt="" /> : null}
								<AvatarFallback className="bg-muted text-[11px]">{initials(name)}</AvatarFallback>
							</Avatar>
							<div className="min-w-0 flex-1">
								<p className="flex items-center gap-2 truncate text-sm">
									{user.username ? (
										<Link href={`/@${user.username}`} className="truncate hover:text-ember">
											{name}
										</Link>
									) : (
										<span className="truncate">{name}</span>
									)}
									{user.is_hireable ? (
										<span className="shrink-0 rounded-full bg-success/15 px-1.5 text-[10px] text-success">
											hireable
										</span>
									) : null}
								</p>
								<div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
									<div
										className="h-full rounded-full bg-ember/70"
										style={{ width: `${(total.total_seconds / max) * 100}%` }}
									/>
								</div>
								{total.languages.length ? (
									<p className="mt-1 truncate text-[11px] text-muted-foreground">
										{total.languages.map((language) => language.name).join(' · ')}
									</p>
								) : null}
							</div>
						</div>
						<div className="text-right">
							<p className="tabular text-sm">{formatDuration(total.total_seconds)}</p>
							<p className="tabular text-[11px] text-muted-foreground">{formatDuration(total.daily_average)}/day</p>
						</div>
					</li>
				);
			})}
		</ol>
	);
}
