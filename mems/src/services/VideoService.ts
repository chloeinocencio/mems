/**
 * VideoService
 *
 * Builds a monthly MP4 from the saved daily photos using ffmpeg-kit-react-native.
 *
 * Output spec:
 *   - Codec:      H.264 (libx264)
 *   - Resolution: 1080 × 1920  (vertical / portrait)
 *   - Frame rate: 30 fps
 *   - Pixel fmt:  yuv420p  (required for iOS Photos compatibility)
 *   - Duration:   1 second per photo (30 photos → 30 s, 31 → 31 s)
 *   - Audio:      none (-an)  — add AAC later if music is desired
 *
 * FFmpeg concat-demuxer approach:
 *   We write a text file listing each image path + "duration 1", then pipe it
 *   through a scale+pad filter to letterbox/pillarbox every image to 1080×1920
 *   without distortion.
 */

import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
import RNFS from 'react-native-fs';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import type { DayPhoto } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VideoProgress {
  /** 0–1 */
  fraction: number;
  /** Seconds of video processed so far */
  timeMs: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Builds the FFmpeg concat-demuxer file content.
 *
 * The last photo is listed twice (without a duration on the second entry)
 * so FFmpeg does not drop the final frame — this is a known FFmpeg quirk
 * with the concat demuxer when using image inputs.
 */
function buildConcatFileContent(photos: DayPhoto[]): string {
  const lines: string[] = [];

  for (const photo of photos) {
    // Escape single quotes inside paths (extremely rare but defensive)
    const escapedPath = photo.photoPath.replace(/'/g, "'\\''");
    lines.push(`file '${escapedPath}'`);
    lines.push(`duration 1`);
  }

  // Repeat last file without duration to lock the final frame
  const last = photos[photos.length - 1];
  const escapedLast = last.photoPath.replace(/'/g, "'\\''");
  lines.push(`file '${escapedLast}'`);

  return lines.join('\n');
}

/**
 * The core FFmpeg filter chain applied to every frame:
 *
 *  1. scale=1080:1920:force_original_aspect_ratio=decrease
 *     → Shrink the photo to fit inside 1080×1920 while preserving its ratio.
 *
 *  2. pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black
 *     → Add black bars on whichever axis is shorter (letterbox / pillarbox).
 *
 *  3. setsar=1
 *     → Force square pixels so the video plays correctly everywhere.
 *
 *  4. fps=30
 *     → Normalise the frame rate to exactly 30 fps.
 */
const VIDEO_FILTER =
  'scale=1080:1920:force_original_aspect_ratio=decrease,' +
  'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,' +
  'setsar=1,' +
  'fps=30';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates the monthly MP4 and returns its absolute path in the caches dir.
 *
 * @param photos      Array of DayPhoto objects (already sorted by date)
 * @param year        4-digit year
 * @param month       1-based month
 * @param onProgress  Optional progress callback (fraction 0–1)
 */
export async function generateMonthlyVideo(
  photos: DayPhoto[],
  year: number,
  month: number,
  onProgress?: (p: VideoProgress) => void,
): Promise<string> {
  if (photos.length === 0) {
    throw new Error('No photos available for this month.');
  }

  // Sort chronologically — callers may not guarantee order
  const sorted = [...photos].sort((a, b) => a.date.localeCompare(b.date));

  // Ensure output directory exists
  const outputDir = `${RNFS.CachesDirectoryPath}/mems_videos`;
  if (!(await RNFS.exists(outputDir))) {
    await RNFS.mkdir(outputDir);
  }

  // Unique output filename so multiple exports don't collide
  const monthPadded = String(month).padStart(2, '0');
  const outputPath = `${outputDir}/${year}_${monthPadded}_${Date.now()}.mp4`;

  // Write the concat control file
  const concatPath = `${RNFS.CachesDirectoryPath}/concat_${year}_${monthPadded}.txt`;
  await RNFS.writeFile(concatPath, buildConcatFileContent(sorted), 'utf8');

  // Expected total video duration in milliseconds (1 s per photo)
  const totalMs = sorted.length * 1000;

  const command =
    `-f concat -safe 0 -i '${concatPath}' ` +
    `-vf '${VIDEO_FILTER}' ` +
    `-c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p ` +
    `-movflags +faststart ` + // enables streaming / fast-open in Photos
    `-an ` + // no audio track
    `'${outputPath}'`;

  return new Promise<string>((resolve, reject) => {
    FFmpegKit.executeAsync(
      command,
      // Completion callback
      async session => {
        const rc = await session.getReturnCode();
        if (ReturnCode.isSuccess(rc)) {
          resolve(outputPath);
        } else {
          const logs = await session.getLogsAsString();
          reject(new Error(`FFmpeg error:\n${logs}`));
        }
      },
      // Per-log-line callback (unused, required positional arg)
      _log => {},
      // Statistics callback — used for progress reporting
      stats => {
        if (onProgress) {
          const timeMs = stats.getTime();
          onProgress({
            fraction: Math.min(timeMs / totalMs, 1),
            timeMs,
          });
        }
      },
    );
  });
}

/**
 * Saves a local MP4 file to the device's Photos app / Camera Roll.
 * Returns the Photos URI of the saved asset.
 */
export async function saveVideoToCameraRoll(videoPath: string): Promise<string> {
  // CameraRoll requires a file:// URI on both platforms
  const uri = videoPath.startsWith('file://') ? videoPath : `file://${videoPath}`;
  const result = await CameraRoll.saveAsset(uri, { type: 'video' });
  return result.node.image.uri;
}
