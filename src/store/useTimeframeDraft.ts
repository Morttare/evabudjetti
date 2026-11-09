import { useState } from 'react';
import type { TimeframeSuggestion } from '@/src/finance/logic/timeframeSuggestion';
import { type LengthOptions, useTimeframeStore } from './useTimeframeStore';

export interface TimeframeDraft {
	startDate: Date;
	setStartDate: (date: Date) => void;
	lengthInput: string;
	setLengthInput: (value: string) => void;
	option: LengthOptions;
	setOption: (option: LengthOptions) => void;
	validateLength: () => number;
	applySuggestion: (suggestion: TimeframeSuggestion) => void;
	reset: () => void;
	save: () => void;
}

/**
 * Editable copy of the saved timeframe, shared by Settings and the budget wizard.
 * Changes are only stored in useTimeframeStore when save() is called, so the user can cancel.
 */
export function useTimeframeDraft(): TimeframeDraft {
	const {
		timeframeStartYear,
		timeframeStartMonth,
		timeframeStartDay,
		timeframeLength,
		setStartDate: saveStartDate,
		setLength: saveLength,
	} = useTimeframeStore();

	const savedStartDate = () =>
		new Date(timeframeStartYear, timeframeStartMonth, timeframeStartDay);

	const [startDate, setStartDate] = useState<Date>(savedStartDate);
	const [lengthInput, setLengthInput] = useState(
		String(timeframeLength.length),
	);
	const [option, setOption] = useState<LengthOptions>(timeframeLength.type);

	const validateLength = (): number => {
		const length = Number(lengthInput);
		if (!Number.isNaN(length) && length > 0) {
			return length;
		}

		setLengthInput('1');
		return 1;
	};

	const applySuggestion = (suggestion: TimeframeSuggestion) => {
		setStartDate(suggestion.startDate);
		setLengthInput(String(suggestion.length));
		setOption(suggestion.type);
	};

	const reset = () => {
		setStartDate(savedStartDate());
		setLengthInput(String(timeframeLength.length));
		setOption(timeframeLength.type);
	};

	const save = () => {
		saveStartDate(startDate);
		saveLength(validateLength(), option);
	};

	return {
		startDate,
		setStartDate,
		lengthInput,
		setLengthInput,
		option,
		setOption,
		validateLength,
		applySuggestion,
		reset,
		save,
	};
}
