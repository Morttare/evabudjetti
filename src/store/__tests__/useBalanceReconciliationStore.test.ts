import AsyncStorage from '@react-native-async-storage/async-storage';
import useBalanceReconciliationStore from '../useBalanceReconciliationStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
	getItem: jest.fn().mockResolvedValue(null),
	setItem: jest.fn().mockResolvedValue(undefined),
	removeItem: jest.fn().mockResolvedValue(undefined),
}));

// Note: months are zero-based in the app (10 = November, 11 = December)

const store = () => useBalanceReconciliationStore.getState();

/** The user checks the bank and saves the real balance */
function reconcile(amount: number, date: Date) {
	return store().upsertForDay(amount, date, 1);
}

beforeEach(() => {
	useBalanceReconciliationStore.setState({ reconciliations: [], nextId: 1 });
});

describe('upsertForDay', () => {
	it('saves a new reconciliation with the next id', () => {
		const saved = reconcile(300, new Date(2026, 10, 15, 10, 0));

		expect(saved).toEqual({
			id: 1,
			accountId: 1,
			amount: 300,
			date: new Date(2026, 10, 15, 10, 0),
		});
		expect(store().reconciliations).toEqual([saved]);
		expect(store().nextId).toBe(2);
	});

	it('saves reconciliations on different days as separate records', () => {
		reconcile(300, new Date(2026, 10, 15));
		reconcile(250, new Date(2026, 10, 20));

		expect(store().reconciliations.map((r) => r.id)).toEqual([1, 2]);
		expect(store().nextId).toBe(3);
	});

	it('updates the existing reconciliation of the same day', () => {
		// Checked 300 € in the morning, corrected to 280 € in the evening
		reconcile(300, new Date(2026, 10, 15, 9, 0));
		const updated = reconcile(280, new Date(2026, 10, 15, 21, 30));

		expect(updated.id).toBe(1);
		expect(store().reconciliations).toEqual([
			{
				id: 1,
				accountId: 1,
				amount: 280,
				date: new Date(2026, 10, 15, 21, 30),
			},
		]);
		expect(store().nextId).toBe(2);
	});

	it('treats midnight and 23:59 as the same day', () => {
		reconcile(300, new Date(2026, 10, 15, 0, 0));
		reconcile(280, new Date(2026, 10, 15, 23, 59));

		expect(store().reconciliations).toHaveLength(1);
		expect(store().reconciliations[0].amount).toBe(280);
	});

	it('treats midnight of the next day as a new day', () => {
		reconcile(300, new Date(2026, 10, 15, 23, 59));
		reconcile(280, new Date(2026, 10, 16, 0, 0));

		expect(store().reconciliations).toHaveLength(2);
	});
});

describe('getBeforeOrIn', () => {
	it('returns reconciliations up to the last moment of the month', () => {
		reconcile(300, new Date(2026, 10, 15));
		reconcile(250, new Date(2026, 10, 30, 23, 59));
		reconcile(200, new Date(2026, 11, 1, 0, 0));

		const result = store().getBeforeOrIn(2026, 10);

		expect(result.map((r) => r.amount)).toEqual([300, 250]);
	});

	it('returns reconciliations from earlier months too, oldest first', () => {
		// Saved in a mixed order
		reconcile(250, new Date(2026, 10, 20));
		reconcile(400, new Date(2026, 8, 5));
		reconcile(300, new Date(2026, 9, 10));

		const result = store().getBeforeOrIn(2026, 10);

		expect(result.map((r) => r.amount)).toEqual([400, 300, 250]);
	});

	it('returns nothing for a month before every reconciliation', () => {
		reconcile(300, new Date(2026, 10, 15));

		expect(store().getBeforeOrIn(2026, 9)).toEqual([]);
	});
});

describe('restoring saved data', () => {
	it('turns saved dates back into Date objects when the app is reopened', async () => {
		// AsyncStorage stores JSON, so dates come back as text
		jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(
			JSON.stringify({
				state: {
					reconciliations: [
						{
							id: 1,
							accountId: 1,
							amount: 300,
							date: '2026-11-15T10:00:00.000Z',
						},
					],
					nextId: 2,
				},
				version: 0,
			}),
		);

		await useBalanceReconciliationStore.persist.rehydrate();

		const [restored] = store().reconciliations;
		expect(restored.date).toBeInstanceOf(Date);
		expect(restored.date.toISOString()).toBe('2026-11-15T10:00:00.000Z');
		expect(store().nextId).toBe(2);
	});
});
