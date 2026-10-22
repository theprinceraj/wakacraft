/** Runs `task` over `items` at most `size` at a time, keeping the input order. */
export async function inBatches<T, R>(items: T[], size: number, task: (item: T) => Promise<R>): Promise<R[]> {
	const results: R[] = [];
	for (let index = 0; index < items.length; index += size) {
		results.push(...(await Promise.all(items.slice(index, index + size).map(task))));
	}
	return results;
}
