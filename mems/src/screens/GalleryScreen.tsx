/**
 * GalleryScreen
 *
 * Shows a monthly calendar grid with photo thumbnails for each day.
 * Users can navigate between months with prev/next arrows.
 * Tapping a day that has a photo shows a full-screen preview with an
 * option to replace that day's photo.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import type { DayPhoto, RootStackParamList } from '../types';
import { getPhotosForMonth } from '../services/StorageService';
import MonthGrid from '../components/MonthGrid';
import { MONTH_NAMES } from '../utils/dateUtils';

type Props = StackScreenProps<RootStackParamList, 'Gallery'>;

export default function GalleryScreen({
  navigation,
  route,
}: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();

  const [year, setYear] = useState(route.params.year);
  const [month, setMonth] = useState(route.params.month);
  const [photos, setPhotos] = useState<DayPhoto[]>([]);

  // Full-screen preview state
  const [previewPhoto, setPreviewPhoto] = useState<DayPhoto | undefined>(
    undefined,
  );

  const loadPhotos = useCallback(() => {
    setPhotos(getPhotosForMonth(year, month));
  }, [year, month]);

  // Reload whenever the screen gains focus (handles returning from Camera/Picker)
  useFocusEffect(loadPhotos);

  // Build a quick-lookup map: date → photoPath
  const photoMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const p of photos) map[p.date] = p.photoPath;
    return map;
  }, [photos]);

  const goToPrevMonth = () => {
    if (month === 1) {
      setYear(y => y - 1);
      setMonth(12);
    } else {
      setMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setYear(y => y + 1);
      setMonth(1);
    } else {
      setMonth(m => m + 1);
    }
  };

  const handleDayPress = (date: string) => {
    const photo = photos.find(p => p.date === date);
    if (photo) setPreviewPhoto(photo);
  };

  const handleReplaceFromCamera = () => {
    if (!previewPhoto) return;
    setPreviewPhoto(undefined);
    navigation.navigate('Camera', { date: previewPhoto.date });
  };

  const handleReplaceFromLibrary = () => {
    if (!previewPhoto) return;
    setPreviewPhoto(undefined);
    navigation.navigate('PhotoPicker', { date: previewPhoto.date });
  };

  const coverCount = photos.length;
  const progressLabel = `${coverCount} / ${new Date(year, month, 0).getDate()} days`;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Month navigation ── */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={goToPrevMonth}
            style={styles.navArrow}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.navArrowText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.monthLabelWrap}>
            <Text style={styles.monthLabel}>
              {MONTH_NAMES[month - 1]} {year}
            </Text>
            <Text style={styles.progressLabel}>{progressLabel}</Text>
          </View>

          <TouchableOpacity
            onPress={goToNextMonth}
            style={styles.navArrow}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.navArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Calendar grid ── */}
        <MonthGrid
          year={year}
          month={month}
          photoMap={photoMap}
          onDayPress={handleDayPress}
        />

        {/* ── Export shortcut ── */}
        {coverCount > 0 && (
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => navigation.navigate('VideoExport', { year, month })}
            activeOpacity={0.8}
          >
            <Text style={styles.exportButtonText}>
              🎬  Create {MONTH_NAMES[month - 1]} Video ({coverCount} photos)
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Full-screen photo preview modal ── */}
      <Modal
        visible={!!previewPhoto}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPreviewPhoto(undefined)}
      >
        <View style={styles.modalContainer}>
          {previewPhoto && (
            <>
              <Image
                source={{ uri: `file://${previewPhoto.photoPath}` }}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
              />

              {/* Date badge */}
              <View style={[styles.modalTopBar, { paddingTop: insets.top + 8 }]}>
                <Text style={styles.modalDate}>{previewPhoto.date}</Text>
                <TouchableOpacity
                  onPress={() => setPreviewPhoto(undefined)}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Replace actions */}
              <View
                style={[
                  styles.modalBottomBar,
                  { paddingBottom: insets.bottom + 20 },
                ]}
              >
                <TouchableOpacity
                  style={styles.replaceButton}
                  onPress={handleReplaceFromCamera}
                >
                  <Text style={styles.replaceText}>📷  Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.replaceButton}
                  onPress={handleReplaceFromLibrary}
                >
                  <Text style={styles.replaceText}>🖼  Replace</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  // Month nav
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  navArrow: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowText: { fontSize: 32, color: '#FF6B35', fontWeight: '300' },
  monthLabelWrap: { alignItems: 'center' },
  monthLabel: { fontSize: 20, fontWeight: '700', color: '#1A202C' },
  progressLabel: { fontSize: 12, color: '#718096', marginTop: 2 },

  // Export button
  exportButton: {
    margin: 20,
    marginTop: 28,
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  exportButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#000' },
  modalTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  modalDate: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  replaceButton: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  replaceText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
