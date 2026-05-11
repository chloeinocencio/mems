/**
 * PhotoPickerScreen
 *
 * Opens the native photo library picker via react-native-image-picker.
 * After the user selects a photo:
 *   1. Show a preview with Confirm / Cancel.
 *   2. On confirm, copy the image into app storage and navigate back to Home.
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  launchImageLibrary,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import { importPhoto } from '../services/StorageService';

type Props = StackScreenProps<RootStackParamList, 'PhotoPicker'>;

export default function PhotoPickerScreen({
  navigation,
  route,
}: Props): React.JSX.Element {
  const { date } = route.params;
  const insets = useSafeAreaInsets();

  // The selected image URI (local path with or without file:// prefix)
  const [selectedUri, setSelectedUri] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [pickerLaunched, setPickerLaunched] = useState(false);

  // Launch the picker once when the screen mounts
  useEffect(() => {
    if (pickerLaunched) return;
    setPickerLaunched(true);

    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 1,
        selectionLimit: 1,
      },
      (response: ImagePickerResponse) => {
        if (response.didCancel || response.errorCode) {
          // User cancelled — go back
          navigation.goBack();
          return;
        }
        const asset = response.assets?.[0];
        if (asset?.uri) {
          setSelectedUri(asset.uri);
        } else {
          navigation.goBack();
        }
      },
    );
  }, [pickerLaunched, navigation]);

  const handleConfirm = async () => {
    if (!selectedUri) return;
    setIsSaving(true);
    try {
      // Strip the file:// prefix if present — RNFS.copyFile expects bare paths
      const cleanPath = selectedUri.startsWith('file://')
        ? selectedUri.slice(7)
        : selectedUri;
      await importPhoto(cleanPath, date);
      navigation.navigate('Home');
    } catch (err) {
      Alert.alert('Save Failed', String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  // ── Loading / picker not yet returned ────────────────────────────────────────
  if (!selectedUri) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Opening photo library…</Text>
      </View>
    );
  }

  // ── Preview + confirm ─────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
      {/* Photo preview */}
      <View style={styles.previewWrapper}>
        <Image
          source={{ uri: selectedUri }}
          style={styles.preview}
          resizeMode="contain"
        />
      </View>

      {/* Date label */}
      <Text style={styles.dateLabel}>Photo for {date}</Text>

      {/* Action buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={isSaving}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmButton, isSaving && styles.disabledButton]}
          onPress={handleConfirm}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmText}>Use This Photo</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 20,
  },
  centered: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: { fontSize: 15, color: '#718096' },

  previewWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 20,
  },
  preview: { flex: 1 },

  dateLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 20,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#2D3748' },
  confirmButton: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 16,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
  },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  disabledButton: { opacity: 0.6 },
});
