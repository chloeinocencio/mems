// ─── Data models ────────────────────────────────────────────────────────────

export interface DayPhoto {
  /** ISO date string: YYYY-MM-DD */
  date: string;
  /** Absolute path inside the app's Documents directory */
  photoPath: string;
  /** Unix timestamp (ms) when the photo was saved */
  timestamp: number;
}

// ─── Navigation param list ───────────────────────────────────────────────────

export type RootStackParamList = {
  Home: undefined;
  Camera: { date: string };
  PhotoPicker: { date: string };
  Gallery: { year: number; month: number };
  VideoExport: { year: number; month: number };
};
