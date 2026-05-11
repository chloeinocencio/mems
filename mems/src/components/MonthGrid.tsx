/**
 * MonthGrid
 *
 * Renders a 7-column calendar grid for a given month.
 * Accepts a map of date → photoPath so DayCell can render thumbnails.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DayCell, { EmptyCell } from './DayCell';
import {
  daysInMonth,
  firstWeekdayOfMonth,
  WEEKDAY_LABELS,
} from '../utils/dateUtils';

interface Props {
  year: number;
  /** 1-based month number */
  month: number;
  /** Map from YYYY-MM-DD → absolute photo path */
  photoMap: Record<string, string>;
  /** Called when user taps a day cell that has a photo */
  onDayPress?: (date: string) => void;
}

export default function MonthGrid({
  year,
  month,
  photoMap,
  onDayPress,
}: Props): React.JSX.Element {
  const totalDays = daysInMonth(year, month);
  const startOffset = firstWeekdayOfMonth(year, month); // 0 = Sunday

  // Build an array of cells: null = empty filler, number = day
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  // Pad to a full number of rows so the grid is rectangular
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={styles.container}>
      {/* Weekday header row */}
      <View style={styles.headerRow}>
        {WEEKDAY_LABELS.map(label => (
          <Text key={label} style={styles.headerLabel}>
            {label}
          </Text>
        ))}
      </View>

      {/* Day cells */}
      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) {
            return <EmptyCell key={`empty-${index}`} />;
          }

          const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const photoPath = photoMap[date];

          return (
            <DayCell
              key={date}
              date={date}
              day={day}
              photoPath={photoPath}
              onPress={onDayPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  headerLabel: {
    width: 52,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#A0AEC0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
});
