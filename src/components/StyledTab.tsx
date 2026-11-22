import { styled, Tabs } from 'tamagui';

const StyledTab = styled(Tabs.Tab, {
	flex: 1,
	borderWidth: 1,
	borderColor: '$color.primary200',
	shadowColor: '$color.black',
	shadowOffset: { width: 0, height: 3 },
	shadowOpacity: 0.25,
	shadowRadius: 3,
	elevation: 2,
	size: '$buttons.xl',
	pressStyle: { backgroundColor: '$primary300' },
	focusStyle: { backgroundColor: '$primary200' },
	justifyContent: 'center',
	alignItems: 'center',
	'$platform-native': {
		backgroundColor: '$color.white',
		pressStyle: {
			backgroundColor: '$primary300',
		},
		focusStyle: {
			backgroundColor: '$primary200',
		},
	},
});

export default StyledTab;
