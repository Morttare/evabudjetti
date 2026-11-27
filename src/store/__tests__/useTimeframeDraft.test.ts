import { act, createElement } from 'react';
import TestRenderer from 'react-test-renderer';
import type { TimeframeSuggestion } from '@/src/finance/logic/timeframeSuggestion';
import { type TimeframeDraft, useTimeframeDraft } from '../useTimeframeDraft';
import { useTimeframeStore } from '../useTimeframeStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
	getItem: jest.fn().mockResolvedValue(null),
	setItem: jest.fn().mockResolvedValue(undefined),
	removeItem: jest.fn().mockResolvedValue(undefined),
}));

// Note: months are zero-based in the app (10 = November, 11 = December)

// Tells React that state updates are wrapped in act() in these tests
(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** Runs the hook inside a tiny test component, like the real screens do */
function renderDraft() {
	const result = { current: undefined as unknown as TimeframeDraft };

	function Probe() {
		result.current = useTimeframeDraft();
		return null;
	}

	act(() => {
		TestRenderer.create(createElement(Probe));
	});

	return { result };
}

/** Saved timeframe: one month starting on 15.11.2026 */
function saveNovemberTimeframe() {
	useTimeframeStore.getState().setStartDate(new Date(2026, 10, 15));
	useTimeframeStore.getState().setLength(1, 'months');
}

function saved() {
	const state = useTimeframeStore.getState();
	return {
		startDate: new Date(
			state.timeframeStartYear,
			state.timeframeStartMonth,
			state.timeframeStartDay,
		),
		length: state.timeframeLength,
	};
}

beforeEach(() => {
	saveNovemberTimeframe();

	// React 19 warns that react-test-renderer is deprecated; hide only that warning
	const originalError = console.error;
	jest.spyOn(console, 'error').mockImplementation((...args) => {
		if (String(args[0]).includes('react-test-renderer is deprecated')) {
			return;
		}
		originalError(...args);
	});
});

afterEach(() => {
	jest.restoreAllMocks();
});

it('starts with the saved timeframe', () => {
	const { result } = renderDraft();

	expect(result.current.startDate).toEqual(new Date(2026, 10, 15));
	expect(result.current.lengthInput).toBe('1');
	expect(result.current.option).toBe('months');
});

it('does not save changes before save is called', () => {
	const { result } = renderDraft();

	act(() => {
		result.current.setStartDate(new Date(2026, 11, 1));
		result.current.setLengthInput('2');
		result.current.setOption('weeks');
	});

	expect(saved()).toEqual({
		startDate: new Date(2026, 10, 15),
		length: { length: 1, type: 'months' },
	});
});

it('saves the edited timeframe', () => {
	const { result } = renderDraft();

	act(() => {
		result.current.setStartDate(new Date(2026, 11, 1));
		result.current.setLengthInput('2');
		result.current.setOption('weeks');
	});
	act(() => {
		result.current.save();
	});

	expect(saved()).toEqual({
		startDate: new Date(2026, 11, 1),
		length: { length: 2, type: 'weeks' },
	});
});

describe('validateLength', () => {
	it('returns a valid length as a number', () => {
		const { result } = renderDraft();

		act(() => {
			result.current.setLengthInput('3');
		});

		expect(result.current.validateLength()).toBe(3);
	});

	it.each([
		'abc',
		'0',
		'-2',
	])('changes the invalid length "%s" to 1', (input) => {
		const { result } = renderDraft();

		act(() => {
			result.current.setLengthInput(input);
		});

		let length = 0;
		act(() => {
			length = result.current.validateLength();
		});

		expect(length).toBe(1);
		expect(result.current.lengthInput).toBe('1');
	});

	it('saves length 1 when the field is left empty', () => {
		const { result } = renderDraft();

		act(() => {
			result.current.setLengthInput('');
			result.current.setOption('days');
		});
		act(() => {
			result.current.save();
		});

		expect(saved().length).toEqual({ length: 1, type: 'days' });
	});
});

it('fills the draft from a suggestion without saving it', () => {
	// Salary paid on the 25th of every month suggests a one-month timeframe from 25.11.
	const suggestion = {
		startDate: new Date(2026, 10, 25),
		length: 1,
		type: 'months',
		basedOn: {},
	} as TimeframeSuggestion;
	const { result } = renderDraft();

	act(() => {
		result.current.applySuggestion(suggestion);
	});

	expect(result.current.startDate).toEqual(new Date(2026, 10, 25));
	expect(result.current.lengthInput).toBe('1');
	expect(result.current.option).toBe('months');
	expect(saved().startDate).toEqual(new Date(2026, 10, 15));
});

it('goes back to the saved timeframe when reset', () => {
	const { result } = renderDraft();

	act(() => {
		result.current.setStartDate(new Date(2027, 0, 1));
		result.current.setLengthInput('5');
		result.current.setOption('years');
	});
	act(() => {
		result.current.reset();
	});

	expect(result.current.startDate).toEqual(new Date(2026, 10, 15));
	expect(result.current.lengthInput).toBe('1');
	expect(result.current.option).toBe('months');
});
