'use client';

import {
	FolderGit2,
	LayoutDashboard,
	Lightbulb,
	LogOut,
	Receipt,
	Settings,
	Sparkles,
	Target,
	Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/lib/auth/auth-client';
import { cn } from '@/lib/utils';

import { Logo } from './logo';

const LINKS = [
	{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
	{ href: '/projects', label: 'Projects', icon: FolderGit2 },
	{ href: '/goals', label: 'Goals', icon: Target },
	{ href: '/insights', label: 'Insights', icon: Lightbulb },
	{ href: '/leaderboards', label: 'Leaderboards', icon: Trophy },
	{ href: '/invoices', label: 'Invoices', icon: Receipt },
	{ href: '/wrapped', label: 'Wrapped', icon: Sparkles },
	{ href: '/settings', label: 'Settings', icon: Settings },
];

export function AppNavSkeleton() {
	return (
		<header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
			<div className="mx-auto flex h-12 max-w-[1440px] items-center gap-6 px-4">
				<Logo />
				<div className="ml-auto size-7 rounded-full bg-muted" />
			</div>
		</header>
	);
}

export function AppNav({ user }: { user: { name: string; email: string; image?: string | null } }) {
	const pathname = usePathname();
	const router = useRouter();
	const initials = user.name
		.split(/\s+/)
		.map((part) => part[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();

	return (
		<header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
			<div className="mx-auto flex h-12 max-w-[1440px] items-center gap-6 px-4">
				<Link href="/dashboard" className="text-foreground">
					<Logo />
				</Link>
				<nav className="flex items-center gap-0.5">
					{LINKS.map(({ href, label, icon: Icon }) => {
						const active = pathname === href || pathname.startsWith(`${href}/`);
						return (
							<Link
								key={href}
								href={href}
								className={cn(
									'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground',
									active && 'bg-accent text-foreground',
								)}
							>
								<Icon className="size-3.5" aria-hidden />
								<span className="hidden sm:inline">{label}</span>
							</Link>
						);
					})}
				</nav>
				<div className="ml-auto">
					<DropdownMenu>
						<DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
							<Avatar className="size-7">
								{user.image ? <AvatarImage src={user.image} alt="" /> : null}
								<AvatarFallback className="bg-ember/15 text-[11px] text-ember">{initials || '?'}</AvatarFallback>
							</Avatar>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							<DropdownMenuLabel className="flex flex-col">
								<span className="truncate text-sm">{user.name}</span>
								<span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link href="/settings">
									<Settings /> Settings
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem
								onSelect={async () => {
									await signOut();
									router.push('/login');
									router.refresh();
								}}
							>
								<LogOut /> Sign out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</header>
	);
}
