import { Calendar, ChevronDown } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Button, SizableText, View, XStack, YStack } from 'tamagui';
import { usePlannedTransactions } from '@/src/finance/hook/usePlannedTransactions';
import { getTransactionOccurrenceCount } from '@/src/finance/logic/util';

interface MonthMeta {
    monthNumber: number; // 0-indexed for calculation (0 = Jan, 11 = Dec)
    translationKey: string; // Key used for i18n
}

export default function YearsScreen() {
    const router = useRouter();
    const { t } = useTranslation();

    const currentYear = new Date().getFullYear();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedYear, setSelectedYear] = useState<string>(
        String(currentYear),
    );

    const yearNum = Number(selectedYear);
    const plannedTransactions = usePlannedTransactions();

    const availableYears = useMemo(() => {
        return Array.from({ length: 6 }, (_, i) => String(currentYear + i));
    }, [currentYear]);

    // Define the 12 months with their index and specific translation keys
    const monthsMeta: MonthMeta[] = useMemo(
        () => [
            { monthNumber: 0, translationKey: 'Jan' },
            { monthNumber: 1, translationKey: 'Feb' },
            { monthNumber: 2, translationKey: 'Mar' },
            { monthNumber: 3, translationKey: 'Apr' },
            { monthNumber: 4, translationKey: 'May' },
            { monthNumber: 5, translationKey: 'Jun' },
            { monthNumber: 6, translationKey: 'Jul' },
            { monthNumber: 7, translationKey: 'Aug' },
            { monthNumber: 8, translationKey: 'Sep' },
            { monthNumber: 9, translationKey: 'Oct' },
            { monthNumber: 10, translationKey: 'Nov' },
            { monthNumber: 11, translationKey: 'Dec' },
        ],
        [],
    );

    // Split months into chunks of 3 for a 3x4 grid structure (4 rows of 3 columns)
    const monthRows = useMemo(() => {
        const rows = [];
        for (let i = 0; i < monthsMeta.length; i += 3) {
            rows.push(monthsMeta.slice(i, i + 3));
        }
        return rows;
    }, [monthsMeta]);

    return (
        <YStack flex={1} backgroundColor="$background">
            <ScrollView contentInsetAdjustmentBehavior="never">
                <YStack padding="$4" gap="$4">
                    <Button
                        backgroundColor="$primary200"
                        borderRadius={40}
                        height={60}
                        onPress={() => router.push('/budget_wizard')}
                    >
                        <SizableText fontWeight="bold" color="$white">
                            {t('Edit Budget')}
                        </SizableText>
                    </Button>

                    {/* Centered Year Dropdown Trigger Button */}
                    <XStack justifyContent="center" width="100%">
                        <Button
                            width="60%"
                            height={55}
                            backgroundColor="white"
                            borderColor="$primary100"
                            borderWidth={1}
                            borderRadius="$4"
                            paddingHorizontal="$3"
                            justifyContent="space-between"
                            onPress={() => setIsOpen(true)}
                            iconAfter={
                                <ChevronDown size={18} color="$color10" />
                            }
                        >
                            <XStack gap="$3" alignItems="center">
                                <View
                                    padding="$2"
                                    borderRadius={100}
                                    backgroundColor="$transparent"
                                >
                                    <Calendar size={18} color="$primary100" />
                                </View>
                                <SizableText fontWeight="bold" size="$5">
                                    {t('Year')} {selectedYear}
                                </SizableText>
                            </XStack>
                        </Button>
                    </XStack>

                    {/* Months Grid (3x4 Layout) */}
                    <YStack gap="$3">
                        {monthRows.map((row) => (
                            <XStack
                                key={row.map((m) => m.translationKey).join('-')}
                                gap="$3"
                                justifyContent="space-between"
                            >
                                {row.map((item) => {
                                    // Calculate cash flow
                                    let monthlyPlannedCashFlow = 0;
                                    for (const txn of plannedTransactions) {
                                        const count =
                                            getTransactionOccurrenceCount(
                                                txn,
                                                yearNum,
                                                item.monthNumber,
                                            );

                                        if (count > 0) {
                                            const totalAmount =
                                                Math.abs(txn.amount) * count;
                                            if (txn.type === 'income') {
                                                monthlyPlannedCashFlow +=
                                                    totalAmount;
                                            } else if (txn.type === 'expense') {
                                                monthlyPlannedCashFlow -=
                                                    totalAmount;
                                            }
                                        }
                                    }

                                    const change = monthlyPlannedCashFlow;
                                    const isWarning = change < 0;
                                    const isNeutral = change === 0;

                                    // Dynamic styling based on the result
                                    const bgColor = isWarning
                                        ? '#fce8e6'
                                        : isNeutral
                                            ? '#f5f5f5'
                                            : '#e6f4ea';
                                    const borderColor = isWarning
                                        ? '#fad2cf'
                                        : isNeutral
                                            ? '#e0e0e0'
                                            : '#ceead6';
                                    const textColor = isWarning
                                        ? '#c5221f'
                                        : isNeutral
                                            ? '#757575'
                                            : '#137333';

                                    const routeId = `${yearNum}-${item.monthNumber.toString().padStart(2, '0')}`;
                                    const roundedChange = change.toFixed(0);

                                    return (
                                        <Button
                                            key={item.monthNumber}
                                            flex={1}
                                            height={100}
                                            backgroundColor={bgColor}
                                            borderRadius="$3"
                                            borderWidth={1}
                                            borderColor={borderColor}
                                            pressStyle={{ opacity: 0.8 }}
                                            onPress={() =>
                                                router.push(
                                                    `/budget/detail/${routeId}`,
                                                )
                                            }
                                        >
                                            <YStack
                                                alignItems="center"
                                                justifyContent="center"
                                                gap="$1"
                                            >
                                                <SizableText
                                                    fontWeight="bold"
                                                    size="$8"
                                                    color="$color"
                                                >
                                                    {t(item.translationKey)}
                                                </SizableText>
                                                <SizableText
                                                    fontWeight="600"
                                                    size="$5"
                                                    color={textColor}
                                                >
                                                    {change > 0
                                                        ? `+${roundedChange}€`
                                                        : `${roundedChange}€`}
                                                </SizableText>
                                            </YStack>
                                        </Button>
                                    );
                                })}
                            </XStack>
                        ))}
                    </YStack>
                </YStack>
            </ScrollView>

            {/* Native Modal to ensure backdrop covers root window (including top/bottom bars) */}
            <Modal
                visible={isOpen}
                transparent={true}
                onRequestClose={() => setIsOpen(false)}
            >
                <TouchableOpacity
                    style={styles.modalBackdrop}
                    activeOpacity={0}
                    onPress={() => setIsOpen(false)}
                >
                    <YStack
                        width="60%"
                        backgroundColor="$background"
                        borderColor="$primary100"
                        borderWidth={2}
                        borderRadius="$4"
                        padding="$3"
                        gap="$2"
                    >
                        {availableYears.map((year) => (
                            <Button
                                key={year}
                                backgroundColor="transparent"
                                borderRadius="$4"
                                justifyContent="center"
                                height={50}
                                pressStyle={{ backgroundColor: '$primary300' }}
                                onPress={() => {
                                    setSelectedYear(year);
                                    setIsOpen(false);
                                }}
                            >
                                <XStack gap="$3" alignItems="center">
                                    <Calendar size={18} color="$primary100" />
                                    <SizableText size="$5" fontWeight="500">
                                        {t('Year')} {year}
                                    </SizableText>
                                </XStack>
                            </Button>
                        ))}
                    </YStack>
                </TouchableOpacity>
            </Modal>
        </YStack>
    );
}

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        padding: 24,
    },
});
