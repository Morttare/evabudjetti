import { allocateHeights, CARD_GAP } from '../allocateHeights';

// The detail page shows an income card and an expense card on top of each other.
// allocateHeights splits the available screen height between them.
// Example screen: 616 px available -> 600 px usable after the 16 px gap between the cards.
const AVAILABLE = 616;

describe('allocateHeights', () => {
	it('uses a 16 px gap between the cards', () => {
		expect(CARD_GAP).toBe(16);
	});

	it('returns no heights when there is no usable space', () => {
		expect(allocateHeights(CARD_GAP, 100, 100)).toEqual({});
		expect(allocateHeights(0, 100, 100)).toEqual({});
	});

	it('returns no heights when both cards fit on the screen', () => {
		expect(allocateHeights(AVAILABLE, 200, 300)).toEqual({});
	});

	it('returns no heights when the cards fill the space exactly', () => {
		expect(allocateHeights(AVAILABLE, 250, 350)).toEqual({});
	});

	it('gives the rest of the space to expenses when incomes are short', () => {
		// A few incomes (150 px) and a long list of expenses (900 px)
		expect(allocateHeights(AVAILABLE, 150, 900)).toEqual({
			income: 150,
			expense: 450,
		});
	});

	it('gives the rest of the space to incomes when expenses are short', () => {
		expect(allocateHeights(AVAILABLE, 900, 150)).toEqual({
			income: 450,
			expense: 150,
		});
	});

	it('splits the space in half when both lists are long', () => {
		expect(allocateHeights(AVAILABLE, 800, 900)).toEqual({
			income: 300,
			expense: 300,
		});
	});

	it('gives a card exactly half when it needs exactly half', () => {
		expect(allocateHeights(AVAILABLE, 300, 900)).toEqual({
			income: 300,
			expense: 300,
		});
	});
});
