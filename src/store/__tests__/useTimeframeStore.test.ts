jest.mock('@react-native-async-storage/async-storage', () => ({
	getItem: jest.fn().mockResolvedValue(null),
	setItem: jest.fn().mockResolvedValue(undefined),
	removeItem: jest.fn().mockResolvedValue(undefined),
}));

import { useTimeframeStore } from '../useTimeframeStore';

describe('current timeframe boundaries before the configured start', () => {
	beforeEach(() => {
		useTimeframeStore.getState().setStartDate(new Date(2026, 5, 15));
		useTimeframeStore.getState().setLength(1, 'months');
	});

	it('returns the immediately preceding timeframe', () => {
		const date = new Date(2026, 5, 14);
		const { getCurrentTimeframeStart, getCurrentTimeframeEnd } =
			useTimeframeStore.getState();

		expect(getCurrentTimeframeStart(date)).toEqual(new Date(2026, 4, 15));
		expect(getCurrentTimeframeEnd(date)).toEqual(new Date(2026, 5, 14));
	});

	it('returns an earlier timeframe when the date is multiple periods back', () => {
		const date = new Date(2026, 2, 20);
		const { getCurrentTimeframeStart, getCurrentTimeframeEnd } =
			useTimeframeStore.getState();

		expect(getCurrentTimeframeStart(date)).toEqual(new Date(2026, 2, 15));
		expect(getCurrentTimeframeEnd(date)).toEqual(new Date(2026, 3, 14));
	});
});

describe('current timeframe at the boundary of the next timeframe', () => {
	beforeEach(() => {
		// Monthly timeframe from 15 November: 15.11.–14.12., next 15.12.–14.1.
		useTimeframeStore.getState().setStartDate(new Date(2026, 10, 15));
		useTimeframeStore.getState().setLength(1, 'months');
	});

	it('moves to the next timeframe at midnight on its first day', () => {
		const midnight = new Date(2026, 11, 15, 0, 0);
		const { getCurrentTimeframeStart, getCurrentTimeframeEnd } =
			useTimeframeStore.getState();

		expect(getCurrentTimeframeStart(midnight)).toEqual(
			new Date(2026, 11, 15),
		);
		expect(getCurrentTimeframeEnd(midnight)).toEqual(new Date(2027, 0, 14));
	});

	it('stays in the current timeframe on its last day', () => {
		const lastDay = new Date(2026, 11, 14, 23, 59);
		const { getCurrentTimeframeStart, getCurrentTimeframeEnd } =
			useTimeframeStore.getState();

		expect(getCurrentTimeframeStart(lastDay)).toEqual(
			new Date(2026, 10, 15),
		);
		expect(getCurrentTimeframeEnd(lastDay)).toEqual(new Date(2026, 11, 14));
	});
});
