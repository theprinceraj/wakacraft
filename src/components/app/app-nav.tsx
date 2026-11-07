'use client';

import {
	FolderGit2,
	LayoutDashboard,
	Lightbulb,
	LogOut,
	Menu,
	Monitor,
	Moon,
	Receipt,
	Settings,
	Sparkles,
	Sun,
	Target,
	Trophy,
	Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { signOut } from '@/lib/auth/auth-client';
import { initialsOf } from '@/lib/format';
import { cn } from '@/lib/utils';

import { Logo } from './logo';
import { useTheme } from './theme';

const LINKS = [
	{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
	{ href: '/projects', label: 'Projects', icon: FolderGit2 },
	{ href: '/insights', label: 'Insights', icon: Lightbulb },
	{ href: '/goals', label: 'Goals', icon: Target },
	{ href: '/leaderboards', label: 'Leaderboards', icon: Trophy },
	{ href: '/orgs', label: 'Teams', icon: Users },
	{ href: '/invoices', label: 'Invoices', icon: Receipt },
	{ href: '/wrapped', label: 'Wrapped', icon: Sparkles },
];

const HEADER = 'sticky top-0 z-30 bg-background/85 backdrop-blur-md print:hidden';
const INNER = 'mx-auto flex h-16 w-full max-w-7xl items-center gap-5 px-4 sm:px-6';

export function AppNavSkeleton() {
	return (
		<header className={HEADER}>
			<div className={INNER}>
				<Logo />
				<div className="ml-auto size-9 rounded-full bg-card" />
			</div>
		</header>
	);
}

export function AppNav({ user }: { user: { name: string; email: string; image?: string | null } }) {
	const pathname = usePathname();
	const router = useRouter();
	const { theme, setTheme } = useTheme();
	const [menuOpen, setMenuOpen] = useState(false);
	const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
	const initials = initialsOf(user.name);

	return (
		<header className={HEADER}>
			<div className={INNER}>
				<Link href="/dashboard" className="rounded-lg text-foreground" aria-label="wakacraft dashboard">
					<Logo />
				</Link>

				<nav className="ml-auto hidden items-center gap-0.5 min-[1100px]:flex" aria-label="Main">
					{LINKS.map(({ href, label }) => (
						<Link
							key={href}
							href={href}
							aria-current={isActive(href) ? 'page' : undefined}
							className={cn(
								'flex h-9 items-center rounded-full px-3 text-sm whitespace-nowrap text-foreground/78 transition-colors hover:text-foreground',
								isActive(href) && 'bg-card font-medium text-foreground',
							)}
						>
							{label}
						</Link>
					))}
				</nav>

				<div className="ml-auto flex items-center gap-2 min-[1100px]:ml-0">
					<Button asChild size="icon" variant="ghost" className="rounded-full text-muted-foreground">
						<Link href="/settings" aria-label="Settings" aria-current={isActive('/settings') ? 'page' : undefined}>
							<Settings className="size-4.5" />
						</Link>
					</Button>

					<DropdownMenu>
						<DropdownMenuTrigger
							className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
							aria-label="Account menu"
						>
							<Avatar className="size-9">
								{user.image ? <AvatarImage src={user.image} alt="" /> : null}
								<AvatarFallback className="bg-ember/12 text-xs font-semibold text-ember-text">
									{initials || '?'}
								</AvatarFallback>
							</Avatar>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5">
							<DropdownMenuLabel className="flex flex-col">
								<span className="truncate text-sm font-medium text-foreground">{user.name}</span>
								<span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link href="/settings">
									<Settings /> Settings
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Theme</DropdownMenuLabel>
							<DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
								<DropdownMenuRadioItem value="light">
									<Sun /> Light
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="dark">
									<Moon /> Dark
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="system">
									<Monitor /> System
								</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
							<DropdownMenuSeparator />
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

					<Sheet open={menuOpen} onOpenChange={setMenuOpen}>
						<SheetTrigger asChild>
							<Button
								size="icon"
								variant="ghost"
								className="rounded-full text-muted-foreground min-[1100px]:hidden"
								aria-label="Open menu"
							>
								<Menu className="size-5" />
							</Button>
						</SheetTrigger>
						<SheetContent
							side="top"
							className="max-h-dvh gap-0 overflow-y-auto rounded-b-[28px] px-4 pt-4 pb-5"
							aria-describedby={undefined}
						>
							<SheetTitle className="mb-3 flex h-8 items-center">
								<Logo />
							</SheetTitle>
							<nav className="flex flex-col" aria-label="Main">
								{[...LINKS, { href: '/settings', label: 'Settings', icon: Settings }].map(
									({ href, label, icon: Icon }) => (
										<Link
											key={href}
											href={href}
											onClick={() => setMenuOpen(false)}
											aria-current={isActive(href) ? 'page' : undefined}
											className={cn(
												'flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px]',
												isActive(href) && 'bg-card font-medium',
											)}
										>
											<Icon className="size-4.5 text-muted-foreground" aria-hidden />
											{label}
										</Link>
									),
								)}
							</nav>
						</SheetContent>
					</Sheet>
				</div>
			</div>
		</header>
	);
}
