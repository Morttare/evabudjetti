import { memo, useEffect, useState } from 'react';
import { type LayoutChangeEvent, ScrollView } from 'react-native';
import { Card, SizableText, XStack, YStack } from 'tamagui';

export const CARD_BORDER_WIDTH = 2;

export type ProcessedItem = {
	id: number;
	name: string;
	count: number;
	totalAmount: number;
};

export type Breakdown = {
	categoryName: string;
	total: number;
	items: ProcessedItem[];
}[];

type MonthBreakdownCardProps = {
	title: string;
	total: number;
	breakdown: Breakdown;
	emptyText: string;
	keyPrefix: string;
	maxHeight?: number;
	onNaturalHeightChange?: (height: number) => void;
};

export const MonthBreakdownCard = memo(function MonthBreakdownCard({
	title,
	total,
	breakdown,
	emptyText,
	keyPrefix,
	maxHeight,
	onNaturalHeightChange,
}: MonthBreakdownCardProps) {
	const [headerHeight, setHeaderHeight] = useState(0);
	const [contentHeight, setContentHeight] = useState(0);

	useEffect(() => {
		if (headerHeight > 0 && contentHeight > 0) {
			onNaturalHeightChange?.(
				headerHeight + contentHeight + CARD_BORDER_WIDTH * 2,
			);
		}
	}, [headerHeight, contentHeight, onNaturalHeightChange]);

	return (
		<Card
			bordered
			borderColor="$primary200"
			borderWidth={CARD_BORDER_WIDTH}
			overflow="hidden"
			backgroundColor="$primary300"
			width="100%"
			maxHeight={maxHeight}
			flexGrow={0}
			flexShrink={1}
		>
			<XStack
				backgroundColor="$primary200"
				padding="$3"
				justifyContent="space-between"
				flexShrink={0}
				onLayout={(e: LayoutChangeEvent) =>
					setHeaderHeight(e.nativeEvent.layout.height)
				}
			>
				<SizableText color="white" fontWeight="bold" fontSize={16}>
					{title}
				</SizableText>
				<SizableText color="white" fontWeight="bold" fontSize={16}>
					{total.toFixed(2)} €
				</SizableText>
			</XStack>

			<ScrollView style={{ flexGrow: 0, flexShrink: 1, minHeight: 0 }}>
				<YStack
					paddingVertical="$2"
					paddingHorizontal="$3"
					onLayout={(e: LayoutChangeEvent) =>
						setContentHeight(e.nativeEvent.layout.height)
					}
				>
					{breakdown.length === 0 ? (
						<SizableText
							color="$primary100"
							textAlign="center"
							paddingVertical="$2"
						>
							{emptyText}
						</SizableText>
					) : (
						breakdown.map((cat, index) => (
							<YStack
								key={`${keyPrefix}-cat-${cat.categoryName}`}
								gap="$1"
								marginTop={index > 0 ? '$2' : '$0'}
							>
								<SizableText
									fontWeight="bold"
									fontSize='$5'
									color="$primary100"
								>
									{cat.categoryName}
								</SizableText>
								{cat.items.map((item) => (
									<XStack
										key={`${keyPrefix}-item-${item.id}`}
										justifyContent="space-between"
									>
										<SizableText fontSize='$true' color="$primary100">
											{item.name}
										</SizableText>
										<SizableText fontSize={18} color="$primary100">
											{Math.abs(item.totalAmount).toFixed(2)} €
										</SizableText>
									</XStack>
								))}
							</YStack>
						))
					)}
				</YStack>
			</ScrollView>
		</Card>
	);
});