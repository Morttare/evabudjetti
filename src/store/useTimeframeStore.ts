import AsyncStorage from '@react-native-async-storage/async-storage';
import {
	addDays,
	addMonths,
	addYears,
	subDays,
	subMonths,
	subYears,
} from 'date-fns';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type LengthOptions = 'days' | 'weeks' | 'months' | 'years';

type TimeframeLength = { length: number; type: LengthOptions };

interface TimeframeState {
	timeframeStartYear: number;
	timeframeStartMonth: number;
	timeframeStartDay: number;
	timeframeLength: TimeframeLength;
	setStartDate: (date: Date) => void;
	setLength: (num: number, option: LengthOptions) => void;
	getCurrentTimeframeStart: (date: Date) => Date;
	getCurrentTimeframeEnd: (date: Date) => Date;
}

const addLength = (date: Date, timeframe: TimeframeLength) => {
	let endDate = date;
	switch (timeframe.type) {
		case 'days':
			endDate = addDays(date, timeframe.length);
			break;
		case 'weeks':
			endDate = addDays(date, timeframe.length * 7);
			break;
		case 'months':
			endDate = addMonths(date, timeframe.length);
			break;
		case 'years':
			endDate = addYears(date, timeframe.length);
	}
	// remove next timeframes first day from current timeframe
	endDate = addDays(endDate, -1);

	return endDate;
};

const subtractLength = (date: Date, timeframe: TimeframeLength) => {
	switch (timeframe.type) {
		case 'days':
			return subDays(date, timeframe.length);
		case 'weeks':
			return subDays(date, timeframe.length * 7);
		case 'months':
			return subMonths(date, timeframe.length);
		case 'years':
			return subYears(date, timeframe.length);
	}
};

const getTimeframeRange = (
	date: Date,
	startDate: Date,
	timeframeLength: TimeframeLength,
): { start: Date; end: Date } => {
	if (timeframeLength.type === 'days' && timeframeLength.length === 1) {
		return { start: date, end: date };
	}

	let currentTimeframeStart = startDate;
	if (date < currentTimeframeStart) {
		let currentTimeframeEnd = subDays(currentTimeframeStart, 1);
		currentTimeframeStart = subtractLength(
			currentTimeframeStart,
			timeframeLength,
		);

		while (date < currentTimeframeStart) {
			currentTimeframeEnd = subDays(currentTimeframeStart, 1);
			currentTimeframeStart = subtractLength(
				currentTimeframeStart,
				timeframeLength,
			);
		}

		return { start: currentTimeframeStart, end: currentTimeframeEnd };
	}

	let currentTimeframeEnd = addLength(currentTimeframeStart, timeframeLength);

	while (date > addDays(currentTimeframeEnd, 1)) {
		currentTimeframeStart = addDays(currentTimeframeEnd, 1);
		currentTimeframeEnd = addLength(currentTimeframeStart, timeframeLength);
	}

	return { start: currentTimeframeStart, end: currentTimeframeEnd };
};

/**
 * Store for timeframe. For use outside of settings, use the current timeframe getters.
 * The saved timeframe start date is the one that is originally set in settings
 * and wont show the current timeframes start date.
 */
export const useTimeframeStore = create<TimeframeState>()(
	persist(
		(set, get) => ({
			timeframeStartYear: new Date().getFullYear(),
			timeframeStartMonth: new Date().getMonth(),
			timeframeStartDay: new Date().getDate(),
			timeframeLength: { length: 1, type: 'months' },

			setStartDate: (date: Date) =>
				set({
					timeframeStartYear: date.getFullYear(),
					timeframeStartMonth: date.getMonth(),
					timeframeStartDay: date.getDate(),
				}),

			setLength: (length: number, type: LengthOptions) =>
				set({
					timeframeLength: { length: length, type: type },
				}),

			/**
			 * @param date The date for which the current timeframe needs to be calculated
			 * @returns The start date of the current timeframe.
			 */
			getCurrentTimeframeStart: (date: Date) => {
				const {
					timeframeStartYear,
					timeframeStartMonth,
					timeframeStartDay,
					timeframeLength,
				} = get();
				const startDate = new Date(
					timeframeStartYear,
					timeframeStartMonth,
					timeframeStartDay,
				);

				const { start } = getTimeframeRange(
					date,
					startDate,
					timeframeLength,
				);

				return start;
			},

			/**
			 * Function to calculate the end of the current timeframe.
			 *
			 * @param date The date for which the current timeframe needs to be calculated
			 * @returns The end date of the current timeframe.
			 */
			getCurrentTimeframeEnd: (date: Date) => {
				const {
					timeframeStartYear,
					timeframeStartMonth,
					timeframeStartDay,
					timeframeLength,
				} = get();
				const startDate = new Date(
					timeframeStartYear,
					timeframeStartMonth,
					timeframeStartDay,
				);

				const { end } = getTimeframeRange(
					date,
					startDate,
					timeframeLength,
				);

				return end;
			},
		}),
		{
			name: 'timeframe-storage',
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
);
