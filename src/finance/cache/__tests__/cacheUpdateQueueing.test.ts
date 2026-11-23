import { queueCacheUpdate } from '../cacheUpdateQueueing';

/** A promise that the test can resolve or reject by hand */
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

describe('queueCacheUpdate', () => {
	it('runs the update and returns its result', async () => {
		const result = await queueCacheUpdate(async () => 'November updated');

		expect(result).toBe('November updated');
	});

	it('starts the next update only after the previous one has finished', async () => {
		const order: string[] = [];
		const first = deferred<void>();

		const firstUpdate = queueCacheUpdate(async () => {
			order.push('first started');
			await first.promise;
			order.push('first finished');
		});
		const secondUpdate = queueCacheUpdate(async () => {
			order.push('second started');
		});

		// Let pending promise callbacks run: the second update must still wait
		await Promise.resolve();
		await Promise.resolve();
		expect(order).toEqual(['first started']);

		first.resolve();
		await Promise.all([firstUpdate, secondUpdate]);

		expect(order).toEqual([
			'first started',
			'first finished',
			'second started',
		]);
	});

	it('runs several updates in the order they were queued', async () => {
		const order: number[] = [];

		await Promise.all(
			[1, 2, 3].map((n) =>
				queueCacheUpdate(async () => {
					order.push(n);
				}),
			),
		);

		expect(order).toEqual([1, 2, 3]);
	});

	it('gives each caller the result of its own update', async () => {
		const [balance, summary] = await Promise.all([
			queueCacheUpdate(async () => 560),
			queueCacheUpdate(async () => 'summary'),
		]);

		expect(balance).toBe(560);
		expect(summary).toBe('summary');
	});

	it('passes an error to the caller of the failed update', async () => {
		await expect(
			queueCacheUpdate(async () => {
				throw new Error('Database read failed');
			}),
		).rejects.toThrow('Database read failed');
	});

	it('continues with the next update after a failed update', async () => {
		const failed = queueCacheUpdate(async () => {
			throw new Error('Database read failed');
		});
		const next = queueCacheUpdate(async () => 'next update ran');

		await expect(failed).rejects.toThrow('Database read failed');
		await expect(next).resolves.toBe('next update ran');
	});
});
