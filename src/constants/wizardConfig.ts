import type { Persisted, PlannedTransaction } from '../dataModel';

export interface BudgetWizardStep {
	header: string;
	items: (Persisted<PlannedTransaction> | PlannedTransaction)[];
}

export const BUDGET_WIZARD_STEPS: BudgetWizardStep[] = [
	{
		header: 'Incomes',
		items: [],
	},
	{
		header: 'Expenses',
		items: [],
	},
	{
		header: 'Timeframe',
		items: [],
	},
];
