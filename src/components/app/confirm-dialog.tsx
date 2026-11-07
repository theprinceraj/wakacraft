'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';

/**
 * Asks before anything hard to undo. Pass `trigger`, or control it with `open` when it's opened from a menu.
 * Stays open while `onConfirm` runs, so a slow request can't be fired twice. If it throws, the error is shown and the
 * dialog stays open.
 */
export function ConfirmDialog({
	trigger,
	open,
	onOpenChange,
	title,
	description,
	action,
	onConfirm,
}: {
	trigger?: ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	title: ReactNode;
	description: ReactNode;
	action: ReactNode;
	onConfirm: () => void | Promise<void>;
}) {
	const [internalOpen, setInternalOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const isOpen = open ?? internalOpen;
	const setOpen = (next: boolean) => {
		setInternalOpen(next);
		onOpenChange?.(next);
	};

	async function confirm() {
		setPending(true);
		try {
			await onConfirm();
			setOpen(false);
		} catch (error) {
			// Stays open, so the user can retry or cancel knowing it didn't happen.
			toast.error(error instanceof Error ? error.message : 'Something went wrong');
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={(next) => !pending && setOpen(next)}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
			<DialogContent className="sm:max-w-md" showCloseButton={false}>
				<DialogHeader>
					<DialogTitle className="pr-0">{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="ghost" disabled={pending}>
							Cancel
						</Button>
					</DialogClose>
					<Button variant="danger" onClick={confirm} disabled={pending}>
						{action}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
