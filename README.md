# LIVIT

Initial GitHub Pages + Capacitor Android starter, preserving the supplied LIVIT HTML.

## Current scope and honest status
- Includes the supplied LIVIT HTML, full-logo image asset and Firebase Android configuration.
- GitHub Pages workflow deploys the HTML.
- Android workflow generates a Capacitor Android wrapper and uploads a **debug APK**.
- Native Google sign-in is NOT yet bridged. The supplied HTML uses Firebase `signInWithPopup`, which must be adapted to native Android authentication before Google login can be considered working inside the APK.
- The logo is included as an asset but is NOT yet installed as Android adaptive launcher icon/splash resource.
- Release signing is not configured yet. The workflow produces a debug APK for initial testing only.

## Firebase
After `npx cap add android`, copy `google-services.json` into `android/app/google-services.json` and configure the Google Services Gradle plugin. The current workflow does not yet do this automatically.

## PowerShell
Install Node.js 22 and Git. Android Studio is not required for GitHub-hosted builds.
```powershell
cd "$env:USERPROFILE\Downloads\LIVIT"
npm install
npm run copy:web
npx cap add android
npx cap sync android
```
Commit and push to `main`; then inspect the repository Actions tab.

Never commit `livit-release.jks` or its password. Store signing material only as encrypted GitHub Actions secrets.
