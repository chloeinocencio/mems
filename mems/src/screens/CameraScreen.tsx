/**
 * CameraScreen
 *
 * Full-screen camera powered by react-native-vision-camera v4.
 * Flow:
 *   1. Request camera permission if not already granted.
 *   2. Show live viewfinder with a capture button and flip-camera toggle.
 *   3. After capture, show the photo preview with Confirm / Retake options.
 *   4. On confirm, import the photo into storage and return to Home.
 */

import React, { useCallback, useRef, useState } from 'react';
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
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import { importPhoto } from '../services/StorageService';

type Props = StackScreenProps<RootStackParamList, 'Camera'>;
type CameraPosition = 'back' | 'front';

export default function CameraScreen({
  navigation,
  route,
}: Props): React.JSX.Element {
  const { date } = route.params;
  const insets = useSafeAreaInsets();

  const { hasPermission, requestPermission } = useCameraPermission();
  const [position, setPosition] = useState<CameraPosition>('back');
  const device = useCameraDevice(position);

  // capturedPath holds the file path from takePhoto() before the user confirms
  const [capturedPath, setCapturedPath] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const cameraRef = useRef<Camera>(null);

  // Request permission on mount if not yet granted
  React.useEffect(() => {
    if (!hasPermission) {
      requestPermission().then(granted => {
        if (!granted) {
          Alert.alert(
            'Camera Permission Required',
            'Please enable camera access in Settings to take photos.',
            [{ text: 'OK', onPress: () => navigation.goBack() }],
          );
        }
      });
    }
  }, [hasPermission, requestPermission, navigation]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
      });
      // photo.path is an absolute path without the file:// scheme
      setCapturedPath(photo.path);
    } catch (err) {
      Alert.alert('Capture Failed', String(err));
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!capturedPath) return;
    setIsSaving(true);
    try {
      await importPhoto(capturedPath, date);
      navigation.navigate('Home');
    } catch (err) {
      Alert.alert('Save Failed', String(err));
    } finally {
      setIsSaving(false);
    }
  }, [capturedPath, date, navigation]);

  const handleRetake = useCallback(() => {
    setCapturedPath(undefined);
  }, []);

  const togglePosition = useCallback(() => {
    setPosition(p => (p === 'back' ? 'front' : 'back'));
  }, []);

  // ── Permission not yet granted ──────────────────────────────────────────────
  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.permissionText}>Requesting camera access…</Text>
      </View>
    );
  }

  // ── No camera device found (simulator, denied) ──────────────────────────────
  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>Camera unavailable.</Text>
      </View>
    );
  }

  // ── Photo preview / confirm step ─────────────────────────────────────────────
  if (capturedPath) {
    return (
      <View style={[styles.full, { backgroundColor: '#000' }]}>
        <Image
          source={{ uri: `file://${capturedPath}` }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
        />

        {/* Confirm / Retake bar */}
        <View style={[styles.previewBar, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={handleRetake}
            disabled={isSaving}
          >
            <Text style={styles.retakeText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmButton, isSaving && styles.disabledButton]}
            onPress={handleConfirm}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmText}>Use Photo</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Live viewfinder ───────────────────────────────────────────────────────────
  return (
    <View style={styles.full}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />

      {/* Top bar: close button */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.iconButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.dateLabel}>{date}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Bottom bar: flip + capture */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          onPress={togglePosition}
          style={styles.flipButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.flipText}>🔄</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleCapture}
          activeOpacity={0.8}
        >
          <View style={styles.captureInner} />
        </TouchableOpacity>

        {/* Spacer to keep capture button centred */}
        <View style={{ width: 56 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  permissionText: { color: '#fff', fontSize: 15 },

  // Viewfinder overlays
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  dateLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  flipButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipText: { fontSize: 24 },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },

  // Preview step
  previewBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 30,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  retakeButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  retakeText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  confirmButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    minWidth: 120,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },
});
