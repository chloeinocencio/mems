/**
 * DayCell
 *
 * A single square in the monthly calendar grid.
 * Shows the day number + a thumbnail when a photo exists for that day.
 * The cell for "today" receives a highlighted border.
 */

import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { todayString } from '../utils/dateUtils';

interface Props {
  /** YYYY-MM-DD — the logical date this cell represents */
  date: string;
  /** 1-31 day number rendered in the cell */
  day: number;
  /** Absolute file path to the photo for this day, or undefined */
  photoPath?: string;
  /** Called when the user taps a cell that has a photo */
  onPress?: (date: string) => void;
}

export default function DayCell({
  date,
  day,
  photoPath,
  onPress,
}: Props): React.JSX.Element {
  const today = todayString();
  const isToday = date === today;
  const hasPhoto = !!photoPath;

  const containerStyle: ViewStyle[] = [
    styles.container,
    isToday && styles.todayBorder,
    hasPhoto && styles.filledContainer,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={() => hasPhoto && onPress?.(date)}
      activeOpacity={hasPhoto ? 0.7 : 1}
      disabled={!hasPhoto}
    >
      {hasPhoto ? (
        <>
          <Image
            source={{ uri: `file://${photoPath}` }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          {/* Day number overlay on top of thumbnail */}
          <View style={styles.dayOverlay}>
            <Text style={styles.dayLabelOnPhoto}>{day}</Text>
          </View>
        </>
      ) : (
        <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
          {day}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Empty cell (filler for offset days before the 1st of the month) ─────────

export function EmptyCell(): React.JSX.Element {
  return <View style={styles.container} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CELL_SIZE = 48;

const styles = StyleSheet.create({
  container: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: 2,
    borderRadius: 8,
    backgroundColor: '#F0F0F5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  todayBorder: {
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  filledContainer: {
    backgroundColor: '#1A202C',
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
  },
  dayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
  },
  dayLabelToday: {
    color: '#FF6B35',
  },
  dayLabelOnPhoto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
