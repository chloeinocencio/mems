import { Platform, PermissionsAndroid } from 'react-native';
import { Camera } from 'react-native-vision-camera';

/**
 * Requests camera permission via VisionCamera (handles both iOS and Android).
 * Returns true if granted.
 */
export async function requestCameraPermission(): Promise<boolean> {
  const status = await Camera.requestCameraPermission();
  return status === 'granted';
}

/**
 * Requests read access to the photo library.
 * On Android 13+ we need READ_MEDIA_IMAGES; below that READ_EXTERNAL_STORAGE.
 * On iOS, VisionCamera's camera permission is separate from library access —
 * react-native-image-picker handles the iOS library permission prompt itself.
 */
export async function requestPhotoLibraryPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    // react-native-image-picker triggers the system prompt automatically
    return true;
  }

  const permission =
    Number(Platform.Version) >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Requests write access to external storage (Android < 29 only).
 * On Android 29+ and iOS this is a no-op — saving to CameraRoll is allowed.
 */
export async function requestSavePermission(): Promise<boolean> {
  if (Platform.OS === 'ios') return true;
  if (Number(Platform.Version) >= 29) return true;

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}
