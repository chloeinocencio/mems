/**
 * HomeScreen
 *
 * The app's entry point. Shows:
 *  - Today's date and photo status
 *  - Primary actions: Take Photo / Upload Photo (or replace if one exists)
 *  - Navigation shortcuts to the monthly Gallery and Video Export screens
 */

import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import { getPhotoForDate } from '../services/StorageService';
import { todayString, MONTH_NAMES } from '../utils/dateUtils';

type Props = StackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props): React.JSX.Element {
  const today = todayString();
  const [year, monthNum, day] = today.split('-').map(Number);
  const [photoPath, setPhotoPath] = useState<string | undefined>(undefined);

  // Reload the today-photo every time this screen comes into focus so that
  // returning from Camera/PhotoPicker always reflects the latest state.
  useFocusEffect(
    useCallback(() => {
      const photo = getPhotoForDate(today);
      setPhotoPath(photo?.photoPath);
    }, [today]),
  );

  const handleTakePhoto = () => {
    if (photoPath) {
      Alert.alert(
        'Replace Today\'s Photo?',
        'You already have a photo for today. Do you want to replace it?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            onPress: () => navigation.navigate('Camera', { date: today }),
          },
        ],
      );
    } else {
      navigation.navigate('Camera', { date: today });
    }
  };

  const handleUploadPhoto = () => {
    if (photoPath) {
      Alert.alert(
        'Replace Today\'s Photo?',
        'You already have a photo for today. Do you want to replace it?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            onPress: () => navigation.navigate('PhotoPicker', { date: today }),
          },
        ],
      );
    } else {
      navigation.navigate('PhotoPicker', { date: today });
    }
  };

  const formattedDate = `${MONTH_NAMES[monthNum - 1]} ${day}, ${year}`;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Date header ── */}
      <Text style={styles.dateLabel}>{formattedDate}</Text>

      {/* ── Today's photo card ── */}
      <View style={styles.photoCard}>
        {photoPath ? (
          <>
            <Image
              source={{ uri: `file://${photoPath}` }}
              style={styles.photoPreview}
              resizeMode="cover"
            />
            <View style={styles.photoBadge}>
              <Text style={styles.photoBadgeText}>Today's photo saved ✓</Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyPhoto}>
            <Text style={styles.emptyIcon}>📷</Text>
            <Text style={styles.emptyTitle}>No photo yet today</Text>
            <Text style={styles.emptySubtitle}>
              Capture or upload your photo for {MONTH_NAMES[monthNum - 1]} {day}
            </Text>
          </View>
        )}
      </View>

      {/* ── Primary actions ── */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleTakePhoto}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>
            {photoPath ? '📷  Retake Photo' : '📷  Take Photo'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleUploadPhoto}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>
            {photoPath ? '🖼  Change Upload' : '🖼  Upload Photo'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Navigation shortcuts ── */}
      <View style={styles.navSection}>
        <TouchableOpacity
          style={styles.navCard}
          onPress={() =>
            navigation.navigate('Gallery', { year, month: monthNum })
          }
          activeOpacity={0.75}
        >
          <Text style={styles.navCardIcon}>🗓</Text>
          <View style={styles.navCardText}>
            <Text style={styles.navCardTitle}>Monthly Gallery</Text>
            <Text style={styles.navCardSub}>
              View your {MONTH_NAMES[monthNum - 1]} collection
            </Text>
          </View>
          <Text style={styles.navChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() =>
            navigation.navigate('VideoExport', { year, month: monthNum })
          }
          activeOpacity={0.75}
        >
          <Text style={styles.navCardIcon}>🎬</Text>
          <View style={styles.navCardText}>
            <Text style={styles.navCardTitle}>Export Video</Text>
            <Text style={styles.navCardSub}>
              Create your {MONTH_NAMES[monthNum - 1]} {year} reel
            </Text>
          </View>
          <Text style={styles.navChevron}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const ORANGE = '#FF6B35';

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#FAFAFA' },
  container: { padding: 20, paddingBottom: 40 },

  // Date
  dateLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // Photo card
  photoCard: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#EDF2F7',
    marginBottom: 24,
  },
  photoPreview: { flex: 1 },
  photoBadge: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  photoBadgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emptyPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2D3748', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#718096', textAlign: 'center', lineHeight: 20 },

  // Action buttons
  actionsRow: { gap: 12, marginBottom: 28 },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButton: { backgroundColor: ORANGE },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: '#2D3748' },

  // Nav cards
  navSection: { gap: 12 },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navCardIcon: { fontSize: 28, marginRight: 14 },
  navCardText: { flex: 1 },
  navCardTitle: { fontSize: 15, fontWeight: '700', color: '#1A202C' },
  navCardSub: { fontSize: 13, color: '#718096', marginTop: 2 },
  navChevron: { fontSize: 22, color: '#CBD5E0', fontWeight: '300' },
});
