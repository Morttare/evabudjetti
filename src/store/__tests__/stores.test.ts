jest.mock('@react-native-async-storage/async-storage', () => ({
	getItem: jest.fn().mockResolvedValue(null),
	setItem: jest.fn().mockResolvedValue(undefined),
	removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-localization', () => ({
	getLocales: () => [{ languageCode: 'fi' }],
}));

import { useInstructionStore } from '../useInstructionStore';
import { useLanguageStore } from '../useLanguageStore';
import { useTimeframeStore } from '../useTimeframeStore';

// Note: months are zero-based in the app (10 = November, 11 = December)

describe('useTimeframeStore: current and later timeframes', () => {
	function setTimeframe(
		start: Date,
		length: number,
		type: 'days' | 'weeks' | 'months' | 'years',
	) {
		useTimeframeStore.getState().setStartDate(start);
		useTimeframeStore.getState().setLength(length, type);
	}

	function timeframeOn(date: Date) {
		const { getCurrentTimeframeStart, getCurrentTimeframeEnd } =
			useTimeframeStore.getState();
		return {
			start: getCurrentTimeframeStart(date),
			end: getCurrentTimeframeEnd(date),
		};
	}

	it('returns the current timeframe when the date is inside it', () => {
		// Monthly timeframe from 15 November
		setTimeframe(new Date(2026, 10, 15), 1, 'months');

		expect(timeframeOn(new Date(2026, 10, 20))).toEqual({
			start: new Date(2026, 10, 15),
			end: new Date(2026, 11, 14),
		});
	});

	it('moves to the next timeframe after the end date', () => {
		setTimeframe(new Date(2026, 10, 15), 1, 'months');

		expect(timeframeOn(new Date(2026, 11, 20))).toEqual({
			start: new Date(2026, 11, 15),
			end: new Date(2027, 0, 14),
		});
	});

	it('calculates a 4-week timeframe from the daily allowance payment day', () => {
		// Customer example: daily allowance every 4 weeks from 6 November
		setTimeframe(new Date(2026, 10, 6), 4, 'weeks');

		// 6.11.–3.12. -> 4.12.–31.12.
		expect(timeframeOn(new Date(2026, 11, 10))).toEqual({
			start: new Date(2026, 11, 4),
			end: new Date(2026, 11, 31),
		});
	});

	it('calculates a yearly timeframe', () => {
		setTimeframe(new Date(2026, 0, 1), 1, 'years');

		expect(timeframeOn(new Date(2027, 2, 5))).toEqual({
			start: new Date(2027, 0, 1),
			end: new Date(2027, 11, 31),
		});
	});

	it('returns a single day for a one-day timeframe', () => {
		setTimeframe(new Date(2026, 10, 1), 1, 'days');
		const date = new Date(2026, 10, 20);

		expect(timeframeOn(date)).toEqual({ start: date, end: date });
	});
});

describe('useInstructionStore', () => {
	it('starts with the introduction not shown', () => {
		expect(useInstructionStore.getState().instructionShown).toBe(false);
	});

	it('marks the introduction as shown', () => {
		useInstructionStore.getState().setInstructionShown(true);

		expect(useInstructionStore.getState().instructionShown).toBe(true);
	});
});

describe('useLanguageStore', () => {
	it('uses the device language by default', () => {
		expect(useLanguageStore.getState().language).toBe('fi');
	});

	it('changes the language', () => {
		useLanguageStore.getState().setLanguage('en');

		expect(useLanguageStore.getState().language).toBe('en');
	});
});