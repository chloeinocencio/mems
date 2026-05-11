/**
 * StorageService
 *
 * Persists daily photo metadata using react-native-mmkv (synchronous, fast).
 * Key schema:  "photo_YYYY-MM-DD" → JSON-serialised DayPhoto
 *
 * Photos themselves are stored as files in the app's Documents directory:
 *   <DocumentsDir>/photos/YYYY-MM/<filename>.jpg
 */

import { MMKV } from 'react-native-mmkv';
import RNFS from 'react-native-fs';
import { DayPhoto } from '../types';
import { daysInMonth } from '../utils/dateUtils';

const storage = new MMKV({ id: 'mems' });
const PHOTO_KEY_PREFIX = 'photo_';

// ─── Key helpers ─────────────────────────────────────────────────────────────

function keyForDate(date: string): string {
  return `${PHOTO_KEY_PREFIX}${date}`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Retrieves the DayPhoto record for a given YYYY-MM-DD date, or null. */
export function getPhotoForDate(date: string): DayPhoto | null {
  const raw = storage.getString(keyForDate(date));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DayPhoto;
  } catch {
    return null;
  }
}

/** Persists a DayPhoto record, overwriting any existing entry for that date. */
export function savePhotoForDate(photo: DayPhoto): void {
  storage.set(keyForDate(photo.date), JSON.stringify(photo));
}

/**
 * Deletes the metadata record for a date and removes the photo file from disk.
 * Safe to call if no record exists.
 */
export async function deletePhotoForDate(date: string): Promise<void> {
  const photo = getPhotoForDate(date);
  if (photo) {
    try {
      const exists = await RNFS.exists(photo.photoPath);
      if (exists) await RNFS.unlink(photo.photoPath);
    } catch {
      // Ignore file-system errors — the record is still removed below
    }
  }
  storage.delete(keyForDate(date));
}

/** Returns all DayPhoto records for a given month (only days that have one). */
export function getPhotosForMonth(year: number, month: number): DayPhoto[] {
  const total = daysInMonth(year, month);
  const results: DayPhoto[] = [];

  for (let day = 1; day <= total; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const photo = getPhotoForDate(date);
    if (photo) results.push(photo);
  }

  return results;
}

/**
 * Ensures the per-month photo directory exists and returns its absolute path.
 * Path: <DocumentsDir>/photos/YYYY-MM/
 */
export async function ensurePhotoDirectory(
  year: number,
  month: number,
): Promise<string> {
  const dir = `${RNFS.DocumentDirectoryPath}/photos/${year}-${String(month).padStart(2, '0')}`;
  const exists = await RNFS.exists(dir);
  if (!exists) await RNFS.mkdir(dir);
  return dir;
}

/**
 * Copies a source photo (from camera or picker) into the app's storage
 * directory, saves the metadata record, and returns the DayPhoto.
 *
 * @param sourcePath  Absolute path to the source photo (no file:// prefix)
 * @param date        YYYY-MM-DD
 */
export async function importPhoto(
  sourcePath: string,
  date: string,
): Promise<DayPhoto> {
  const [year, month] = date.split('-').map(Number);
  const dir = await ensurePhotoDirectory(year, month);
  const filename = `${date}_${Date.now()}.jpg`;
  const destPath = `${dir}/${filename}`;

  // If an existing photo already lives at a different path, delete it first
  const existing = getPhotoForDate(date);
  if (existing && existing.photoPath !== destPath) {
    try {
      const exists = await RNFS.exists(existing.photoPath);
      if (exists) await RNFS.unlink(existing.photoPath);
    } catch { /* ignore */ }
  }

  await RNFS.copyFile(sourcePath, destPath);

  const photo: DayPhoto = {
    date,
    photoPath: destPath,
    timestamp: Date.now(),
  };

  savePhotoForDate(photo);
  return photo;
}
