# Photo a Day — Setup Guide

> React Native CLI · TypeScript · iOS-first · No Expo

---

## Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 18 LTS |
| Ruby | 3.1 (macOS — required by CocoaPods) |
| CocoaPods | 1.14 |
| Xcode | 15 |
| Android Studio | Hedgehog (2023.1.1) |
| React Native CLI | latest (`npm i -g react-native-cli`) |

---

## 1. Create the bare React Native project

```bash
npx react-native@0.74 init PhotoADay --template react-native-template-typescript
cd PhotoADay
```

Then **replace** the generated `package.json`, `tsconfig.json`, `babel.config.js`,
`App.tsx`, `index.js`, `app.json`, and the entire `src/` folder with the files
provided in this repo.

---

## 2. Install JavaScript dependencies

```bash
npm install
```

All dependencies are declared in `package.json`:

| Package | Purpose |
|---|---|
| `react-native-vision-camera` | Live camera viewfinder + photo capture |
| `react-native-image-picker` | Native photo-library picker |
| `@react-native-camera-roll/camera-roll` | Save exported MP4 to the Photos app |
| `react-native-fs` | Copy photos into app storage; write FFmpeg concat file |
| `react-native-mmkv` | Fast synchronous key-value store for photo metadata |
| `ffmpeg-kit-react-native` | Run FFmpeg commands in-process for video generation |
| `@notifee/react-native` | Daily local notification (8 PM reminder) |
| `@react-navigation/native` + `@react-navigation/stack` | Screen navigation |
| `react-native-gesture-handler` | Required by React Navigation |
| `react-native-safe-area-context` | Safe area insets (notch, home bar) |
| `react-native-screens` | Native screen containers for React Navigation |

---

## 3. iOS setup

### 3a. Set the FFmpeg variant in the Podfile

The `ios/Podfile` already contains:

```ruby
$FFmpegKitPackage = "full-lts"
```

`full-lts` bundles **libx264**, which is required for H.264 encoding.
If binary size is a concern, `video-lts` is smaller and still includes libx264.

### 3b. Install Pods

```bash
cd ios
pod install
cd ..
```

> **Tip:** The first `pod install` after adding ffmpeg-kit takes several minutes
> because CocoaPods downloads the pre-built binary (~50 MB).

### 3c. Open the workspace and verify capabilities

```bash
open ios/PhotoADay.xcworkspace
```

In Xcode:
1. Select the **PhotoADay** target → **Signing & Capabilities**
2. Ensure **Push Notifications** capability is added (needed by `@notifee`)
3. Ensure **Background Modes → Background fetch** is checked (for rescheduling
   notifications after reboot)

### 3d. Info.plist — permissions already set

The provided `ios/PhotoADay/Info.plist` includes all required keys:

| Key | Purpose |
|---|---|
| `NSCameraUsageDescription` | Camera access (VisionCamera) |
| `NSPhotoLibraryUsageDescription` | Library read (image-picker) |
| `NSPhotoLibraryAddUsageDescription` | Library write (saving the MP4) |
| `NSMicrophoneUsageDescription` | Required by some VisionCamera builds |

### 3e. Run on device / simulator

```bash
npx react-native run-ios --device "Your iPhone Name"
# or
npx react-native run-ios   # boots the default simulator
```

---

## 4. Android setup

### 4a. `android/app/src/main/AndroidManifest.xml`

Replace the generated manifest with the provided file. Key permissions:

| Permission | Reason |
|---|---|
| `CAMERA` | VisionCamera |
| `READ_MEDIA_IMAGES` | Android 13+ photo library |
| `READ_EXTERNAL_STORAGE` | Android ≤ 12 photo library |
| `WRITE_EXTERNAL_STORAGE` | Android ≤ 9 saving to gallery |
| `POST_NOTIFICATIONS` | @notifee daily reminder |
| `SCHEDULE_EXACT_ALARM` | Precise 8 PM trigger |
| `RECEIVE_BOOT_COMPLETED` | Re-schedule after reboot |

### 4b. `android/app/build.gradle` — FFmpeg pack variant

Add **one** line inside `android { defaultConfig { ... } }`:

```groovy
android {
    defaultConfig {
        // ...existing config...
        buildConfigField "String", "FFMPEG_KIT_PACKAGE", "\"full-lts\""
    }
}
```

This tells `ffmpeg-kit-react-native` which native binary to link.

### 4c. Minimum SDK version

In `android/build.gradle` (project-level), confirm:

```groovy
buildscript {
    ext {
        minSdkVersion    = 24   // required by VisionCamera v4
        compileSdkVersion = 34
        targetSdkVersion  = 34
    }
}
```

### 4d. Run

```bash
npx react-native run-android
```

---

## 5. Project structure

```
PhotoADay/
├── App.tsx                        Entry point — wraps providers, bootstraps notifications
├── index.js                       RN app registry
├── app.json                       App name
├── babel.config.js
├── tsconfig.json
├── ios/
│   ├── Podfile                    ← $FFmpegKitPackage = "full-lts"
│   └── PhotoADay/
│       └── Info.plist             ← All iOS permission strings
├── android/
│   └── app/src/main/
│       └── AndroidManifest.xml   ← All Android permissions
└── src/
    ├── types/
    │   └── index.ts               DayPhoto model, navigation param list
    ├── utils/
    │   ├── dateUtils.ts           Date formatting, calendar helpers
    │   └── permissionUtils.ts     Runtime permission requests
    ├── services/
    │   ├── StorageService.ts      MMKV metadata + RNFS file management
    │   ├── NotificationService.ts Daily 8 PM reminder via @notifee
    │   └── VideoService.ts        FFmpeg video generation + Camera Roll save
    ├── navigation/
    │   └── AppNavigator.tsx       React Navigation stack
    ├── components/
    │   ├── DayCell.tsx            Single calendar square with thumbnail
    │   └── MonthGrid.tsx          7-column calendar grid
    └── screens/
        ├── HomeScreen.tsx         Today's status + primary actions
        ├── CameraScreen.tsx       Full-screen VisionCamera viewfinder
        ├── PhotoPickerScreen.tsx  react-native-image-picker wrapper
        ├── GalleryScreen.tsx      Monthly calendar + full-screen preview modal
        └── VideoExportScreen.tsx  FFmpeg export UI with progress bar
```

---

## 6. Data model

```ts
interface DayPhoto {
  date: string;       // "YYYY-MM-DD"  — unique key per day
  photoPath: string;  // absolute path inside DocumentDirectoryPath/photos/YYYY-MM/
  timestamp: number;  // Unix ms — when the photo was saved
}
```

Photos are stored under:
```
<DocumentsDir>/photos/YYYY-MM/<date>_<timestamp>.jpg
```

Metadata is persisted in MMKV with the key `photo_YYYY-MM-DD`.

---

## 7. FFmpeg command (annotated)

```bash
ffmpeg \
  -f concat -safe 0 \
  -i '/path/to/concat.txt' \         # list of image files + "duration 1" each
  -vf '
    scale=1080:1920:force_original_aspect_ratio=decrease,
    pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,
    setsar=1,
    fps=30
  ' \
  -c:v libx264 \                     # H.264 — iOS Photos compatible
  -preset medium \                   # encode speed vs. compression trade-off
  -crf 23 \                          # quality (18 = near-lossless, 28 = smaller)
  -pix_fmt yuv420p \                 # required for iPhone Photos playback
  -movflags +faststart \             # enables progressive download / fast open
  -an \                              # no audio track
  '/path/to/output.mp4'
```

**Concat file format** (`concat.txt`):
```
file '/abs/path/2026-05-01_xxx.jpg'
duration 1
file '/abs/path/2026-05-02_xxx.jpg'
duration 1
...
file '/abs/path/2026-05-31_xxx.jpg'
duration 1
file '/abs/path/2026-05-31_xxx.jpg'   ← last frame repeated, no duration
```
> The last file is listed twice without a `duration` line to prevent FFmpeg's
> concat demuxer from dropping the final frame — a known quirk when using
> still-image inputs.

---

## 8. Key flows

### Taking a photo
```
HomeScreen → CameraScreen
  Camera.takePhoto() → capturedPath
  Confirm → StorageService.importPhoto(path, date)
    RNFS.copyFile(source, DocumentsDir/photos/YYYY-MM/date_ts.jpg)
    MMKV.set("photo_YYYY-MM-DD", JSON)
  navigate('Home')
```

### Uploading from library
```
HomeScreen → PhotoPickerScreen
  launchImageLibrary() → selectedUri
  Confirm → StorageService.importPhoto(cleanPath, date)
  navigate('Home')
```

### Generating the video
```
VideoExportScreen
  getPhotosForMonth(year, month) → DayPhoto[]
  generateMonthlyVideo(photos, year, month, onProgress)
    write concat.txt to CachesDir
    FFmpegKit.executeAsync(command, ..., statistics → setProgress)
    resolve(outputPath)
  saveVideoToCameraRoll(outputPath)
    CameraRoll.saveAsset("file://...", { type: 'video' })
```

---

## 9. Customisation tips

| What | Where | How |
|---|---|---|
| Reminder time | `NotificationService.ts` | Change `REMINDER_HOUR` / `REMINDER_MINUTE` |
| Video quality | `VideoService.ts` | Adjust `-crf` (lower = better quality, bigger file) |
| Add background music | `VideoService.ts` | Remove `-an`, add `-i music.mp3 -c:a aac -b:a 128k -shortest` |
| Transition effects | `VideoService.ts` | Add `xfade` filter between images in the filter chain |
| Output resolution | `VideoService.ts` | Change `1080:1920` in `VIDEO_FILTER` |
| Accent colour | All screens | Search `#FF6B35` and replace |

---

## 10. Troubleshooting

**`pod install` fails with architecture errors**
```bash
sudo arch -x86_64 gem install ffi
arch -x86_64 pod install
```

**VisionCamera shows black screen on iOS simulator**
The simulator does not have a real camera. Test on a physical device.

**FFmpeg fails with `No such file or directory`**
Ensure `concatPath` and all photo paths in `concat.txt` are absolute and
contain no unescaped single quotes.

**`saveAsset` throws on Android**
Make sure `WRITE_EXTERNAL_STORAGE` is granted (Android < 29) and
`READ_MEDIA_IMAGES` is granted (Android 13+). Use `requestSavePermission()`
before calling `saveVideoToCameraRoll()`.

**Notification not firing**
On iOS, verify the Push Notifications capability is added in Xcode.
On Android, check that `SCHEDULE_EXACT_ALARM` is granted in system settings
(Settings → Apps → PhotoADay → Permissions → Alarms & Reminders).
