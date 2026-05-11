/**
 * VideoExportScreen
 *
 * Shows all available daily photos for a month, lets the user kick off
 * FFmpeg video generation, tracks progress, and saves the resulting MP4
 * to the device's Camera Roll / Photos app.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import type { DayPhoto, RootStackParamList } from '../types';
import { getPhotosForMonth } from '../services/StorageService';
import {
  generateMonthlyVideo,
  saveVideoToCameraRoll,
  type VideoProgress,
} from '../services/VideoService';
import { requestSavePermission } from '../utils/permissionUtils';
import { MONTH_NAMES, daysInMonth } from '../utils/dateUtils';

type Props = StackScreenProps<RootStackParamList, 'VideoExport'>;

type ExportState = 'idle' | 'generating' | 'saving' | 'done' | 'error';

export default function VideoExportScreen({
  route,
}: Props): React.JSX.Element {
  const { year, month } = route.params;
  const insets = useSafeAreaInsets();

  const [photos, setPhotos] = useState<DayPhoto[]>([]);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState(0);
  const [savedUri, setSavedUri] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);

  useEffect(() => {
    const sorted = getPhotosForMonth(year, month).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    setPhotos(sorted);
  }, [year, month]);

  const handleExport = useCallback(async () => {
    if (photos.length === 0) {
      Alert.alert('No Photos', 'Add at least one photo before exporting.');
      return;
    }

    // Request save permission (needed on Android < 29)
    const permitted = await requestSavePermission();
    if (!permitted) {
      Alert.alert(
        'Permission Required',
        'Please allow storage access to save the video.',
      );
      return;
    }

    setExportState('generating');
    setProgress(0);
    setErrorMsg(undefined);

    try {
      const videoPath = await generateMonthlyVideo(
        photos,
        year,
        month,
        (p: VideoProgress) => setProgress(p.fraction),
      );

      setExportState('saving');
      const uri = await saveVideoToCameraRoll(videoPath);
      setSavedUri(uri);
      setExportState('done');
    } catch (err) {
      setErrorMsg(String(err));
      setExportState('error');
    }
  }, [photos, year, month]);

  const totalDays = daysInMonth(year, month);
  const missingDays = totalDays - photos.length;
  const estimatedSeconds = photos.length;
  const monthName = MONTH_NAMES[month - 1];

  // ── Photo strip item renderer ─────────────────────────────────────────────────
  const renderPhoto = ({ item }: { item: DayPhoto }) => (
    <View style={styles.stripItem}>
      <Image
        source={{ uri: `file://${item.photoPath}` }}
        style={styles.stripThumb}
        resizeMode="cover"
      />
      <Text style={styles.stripDate}>{item.date.slice(8)}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
      {/* ── Summary header ── */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryMonth}>
          {monthName} {year}
        </Text>
        <View style={styles.summaryRow}>
          <StatPill
            value={`${photos.length}`}
            label="Photos"
            accent="#FF6B35"
          />
          <StatPill
            value={`~${estimatedSeconds}s`}
            label="Duration"
            accent="#3182CE"
          />
          {missingDays > 0 && (
            <StatPill
              value={`${missingDays}`}
              label="Missing"
              accent="#A0AEC0"
            />
          )}
        </View>
        <Text style={styles.specLabel}>
          1080 × 1920 · H.264 · 30 fps · yuv420p
        </Text>
      </View>

      {/* ── Photo strip ── */}
      {photos.length > 0 ? (
        <FlatList
          data={photos}
          keyExtractor={item => item.date}
          renderItem={renderPhoto}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripList}
          style={styles.strip}
        />
      ) : (
        <View style={styles.emptyStrip}>
          <Text style={styles.emptyStripText}>
            No photos saved for {monthName} yet.
          </Text>
        </View>
      )}

      {/* ── Export area ── */}
      <View style={styles.exportArea}>
        {exportState === 'idle' && (
          <TouchableOpacity
            style={[
              styles.exportButton,
              photos.length === 0 && styles.exportButtonDisabled,
            ]}
            onPress={handleExport}
            disabled={photos.length === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.exportButtonText}>
              🎬  Generate &amp; Save to Photos
            </Text>
          </TouchableOpacity>
        )}

        {(exportState === 'generating' || exportState === 'saving') && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.progressLabel}>
              {exportState === 'generating'
                ? `Building video… ${Math.round(progress * 100)}%`
                : 'Saving to Photos app…'}
            </Text>
            {exportState === 'generating' && (
              <View style={styles.progressBarTrack}>
                <View
                  style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
                />
              </View>
            )}
          </View>
        )}

        {exportState === 'done' && (
          <View style={styles.doneContainer}>
            <Text style={styles.doneIcon}>✅</Text>
            <Text style={styles.doneTitle}>Video Saved!</Text>
            <Text style={styles.doneSub}>
              Your {monthName} reel has been saved to your Photos app.
            </Text>
            {Platform.OS === 'ios' && (
              <Text style={styles.donePath}>{savedUri}</Text>
            )}
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => {
                setExportState('idle');
                setProgress(0);
                setSavedUri(undefined);
              }}
            >
              <Text style={styles.exportButtonText}>Export Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {exportState === 'error' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>❌</Text>
            <Text style={styles.errorTitle}>Export Failed</Text>
            <Text style={styles.errorMsg}>{errorMsg}</Text>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => setExportState('idle')}
            >
              <Text style={styles.exportButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Sub-component ──────────────────────────────────────────────────────────────

function StatPill({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <View style={statStyles.pill}>
      <Text style={[statStyles.value, { color: accent }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  value: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '600', color: '#A0AEC0', marginTop: 2 },
});

// ── Main styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  // Summary card
  summaryCard: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  summaryMonth: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 16,
  },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  specLabel: { fontSize: 11, color: '#A0AEC0', fontFamily: 'Menlo', letterSpacing: 0.3 },

  // Photo strip
  strip: { maxHeight: 110, marginBottom: 8 },
  stripList: { paddingHorizontal: 20, gap: 8 },
  stripItem: { alignItems: 'center' },
  stripThumb: { width: 72, height: 90, borderRadius: 8 },
  stripDate: {
    fontSize: 10,
    fontWeight: '600',
    color: '#718096',
    marginTop: 4,
  },
  emptyStrip: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  emptyStripText: { fontSize: 14, color: '#A0AEC0' },

  // Export area
  exportArea: { flex: 1, paddingHorizontal: 20, justifyContent: 'flex-end' },
  exportButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  exportButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  exportButtonDisabled: { opacity: 0.4 },

  // Progress
  progressContainer: { alignItems: 'center', gap: 16, paddingVertical: 24 },
  progressLabel: { fontSize: 15, fontWeight: '600', color: '#2D3748' },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: '#FF6B35', borderRadius: 3 },

  // Done
  doneContainer: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  doneIcon: { fontSize: 52 },
  doneTitle: { fontSize: 20, fontWeight: '800', color: '#1A202C' },
  doneSub: { fontSize: 14, color: '#718096', textAlign: 'center' },
  donePath: { fontSize: 10, color: '#A0AEC0', fontFamily: 'Menlo' },

  // Error
  errorContainer: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  errorIcon: { fontSize: 52 },
  errorTitle: { fontSize: 20, fontWeight: '800', color: '#E53E3E' },
  errorMsg: { fontSize: 13, color: '#718096', textAlign: 'center' },
});
