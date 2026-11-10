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
