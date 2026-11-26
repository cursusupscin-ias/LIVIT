# LIVIT

Targeted repair of the supplied LIVIT single-file application. Only the Android launcher icon and Android Google sign-in path are changed.

## Preserved application architecture

- The existing `index.html` application remains the source of the UI and data model.
- The existing local storage keys (`livit_app_data_v1` and `livit_theme`) are unchanged.
- The existing Firestore document path and synchronization code are unchanged.
- Browser Google sign-in continues to use Firebase JavaScript `signInWithPopup`.
- Android Google sign-in uses the native `@capacitor-firebase/authentication` plugin, then exchanges the returned Google ID token into the existing Firebase JavaScript Auth instance using `GoogleAuthProvider.credential()` and `signInWithCredential()`.
- The existing Firebase JavaScript CDN imports remain on version 11.10.0. The `firebase@12.6.0` npm package satisfies the current v8 plugin peer dependency; the single-file app continues to use its existing CDN Firebase instance for Auth and Firestore.
- Email/password registration and sign-in remain on the existing Firebase JavaScript Auth instance.

## Android launcher icon

The exact supplied `assets/livit-full-logo.webp` is the source of `assets/icon-only.png`. The adaptive icon foreground is an alpha-separated extraction of the existing white emblem, and its blue gradient background is sampled from the supplied logo's original gradient. No new logo design is introduced.

The build generates legacy density launcher icons, adaptive icons, and round launcher icons with the official `@capacitor/assets` tool after `npx cap add android` and `npx cap sync android`, so the generated resources exist in the fresh Android project and are not overwritten by a later Capacitor sync.

## Android Google sign-in

The native plugin is pinned to `@capacitor-firebase/authentication` 8.6.0, which supports Capacitor 8. The plugin configuration enables only `google.com`. The build configures the plugin's documented Android variables (`rgcfaIncludeGoogle = true` and `androidxCredentialsVersion = '1.3.0'`).

On Android, the app initializes its one Firebase JavaScript Auth instance with `initializeAuth(... indexedDBLocalPersistence)` so the JavaScript session survives app restarts. Native sign-in returns an ID token; the existing Firebase JavaScript SDK exchanges it into the existing Auth instance. The existing Firestore listener then receives the same Firebase user UID. On web, the current `getAuth()` and popup flow remain in place.

The native plugin also has a sign-out call; the app signs out both native and JavaScript sessions on Android.

## Firebase Console actions required

The supplied `google-services.json` belongs to project `livit-lifebucket` and package `com.livit.app`. It currently contains Android OAuth certificate hash:

`E7:E4:D7:0D:8E:63:7C:AE:F9:56:1E:87:AD:4E:4A:D9:B1:C5:BB:13`

The uploaded `LIVIT-debug-apk.zip` was signed with a different debug certificate. Its actual SHA-1, read from the APK Signing Block certificate, is:

`BA:B6:9A:26:26:B6:D8:0B:F0:D4:80:77:F3:C8:A1:F9:A8:E7:07:C9`

Therefore the uploaded APK's signing certificate does **not** match the Android OAuth certificate hash currently in the supplied `google-services.json`.

For Google sign-in to work reliably on every clean GitHub Actions runner, use a stable CI debug keystore. GitHub-hosted runners are ephemeral; their default Android debug keystore is newly generated and its SHA-1 changes between clean runners. Do not register a one-off runner fingerprint and assume it will remain stable.

### Create a stable debug keystore on Windows PowerShell

Run this once on your Windows PC (use your own strong passwords):

```powershell
$keyPath = "$env:USERPROFILE\livit-ci-debug.keystore"
keytool -genkeypair -v `
  -keystore $keyPath `
  -storetype JKS `
  -storepass "CHANGE_THIS_STORE_PASSWORD" `
  -alias "livitdebug" `
  -keypass "CHANGE_THIS_KEY_PASSWORD" `
  -keyalg RSA -keysize 2048 -validity 10000 `
  -dname "CN=LIVIT CI Debug, OU=Android, O=LIVIT, C=IN"

keytool -list -v -keystore $keyPath `
  -storepass "CHANGE_THIS_STORE_PASSWORD" -alias "livitdebug"
```

Copy the displayed **SHA1** fingerprint. In Firebase Console:

1. Open project `livit-lifebucket` → Project settings → Your apps → Android app `com.livit.app`.
2. Add the stable keystore SHA-1 fingerprint.
3. In Authentication → Sign-in method, ensure Google is enabled.
4. Download the refreshed `google-services.json` and replace the repository-root `google-services.json` with it. Keep project ID `livit-lifebucket` and package `com.livit.app`.

Then create the four GitHub Actions repository secrets under Settings → Secrets and variables → Actions:

- `LIVIT_DEBUG_KEYSTORE_BASE64`
- `LIVIT_DEBUG_KEYSTORE_PASSWORD`
- `LIVIT_DEBUG_KEY_ALIAS`
- `LIVIT_DEBUG_KEY_PASSWORD`

Create the base64 value in PowerShell and copy it directly to the GitHub secret:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes($keyPath)) | Set-Clipboard
```

Never commit the keystore or its passwords. The workflow uses the secret keystore only to sign the debug APK consistently. If these secrets are absent, the workflow still builds using the runner's temporary debug key and reports its SHA-1, but Google sign-in will not be stable across fresh runners.

## Build on GitHub

1. Replace/add the files from this ZIP in the existing `cursusupscin-ias/LIVIT` repository.
2. Commit and push to `main`.
3. Open the repository's **Actions** tab.
4. Select **Build LIVIT Android APK** → **Run workflow**.
5. When the run completes, open it and download the `LIVIT-debug-apk` artifact.
6. Extract `app-debug.apk` from the artifact ZIP and install it on the Android device.

The workflow generates a fresh Android project, registers the plugin, copies `google-services.json`, generates the LIVIT icon resources, verifies the generated Android project, builds the debug APK, and reports the exact signing SHA-1.

## Local PowerShell workflow

Requires Node.js 22, Java 21, and Git. Android Studio is not required.

```powershell
npm install
npm run build:web
npx cap add android
npx cap sync android
node scripts/configure-android.mjs
npx capacitor-assets generate --android
npm run verify:android
```

Then build from the generated Android folder:

```powershell
cd android
.\gradlew assembleDebug
```

## Verification limits

The source package was inspected and static source/configuration checks are included. This execution environment could not reach the npm registry and does not have the Android SDK/Gradle Android build toolchain installed, so the final generated Android project and APK cannot be built here. A real Android device/emulator sign-in test is also not available here. The GitHub Actions workflow is the intended clean-runner build and includes checks for plugin registration, icon resource generation, web bundle inclusion, APK existence, and signing fingerprint reporting. A successful Gradle build alone is not proof of successful Google sign-in; verify the native sign-in on the installed APK after the Firebase SHA-1 setup above.
