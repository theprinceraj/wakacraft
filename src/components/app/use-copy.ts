'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const COPIED_FOR_MS = 1500;

/** Copy to the clipboard, with a short-lived `copied` flag for the button's feedback. */
export function useCopy() {
	const [copied, setCopied] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => () => clearTimeout(timer.current), []);

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			clearTimeout(timer.current);
			timer.current = setTimeout(() => setCopied(false), COPIED_FOR_MS);
		} catch {
			// Browsers refuse clipboard access on insecure origins or without permission.
			toast.error('Could not copy. Select the text and copy it yourself.');
		}
	}

	return { copied, copy };
}
