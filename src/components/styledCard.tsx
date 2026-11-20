import { Card, styled } from 'tamagui';

const StyledCard = Object.assign(
	styled(Card, {
		name: 'StyledCard',
		backgroundColor: '$primary200',
		borderRadius: '$2',
		marginBottom: 15,
		gap: '$1',

		variants: {
			size: {
				small: { borderRadius: 10 },
			},
		},
	}),
	{
		Header: Card.Header,
		Footer: Card.Footer,
	},
);

export default StyledCard;
