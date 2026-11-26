import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const apkPath = path.resolve(
  'android/app/build/outputs/apk/debug/app-debug.apk'
);

if (!fs.existsSync(apkPath)) {
  console.error(`APK not found: ${apkPath}`);
  process.exit(1);
}

const androidHome =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT;

if (!androidHome) {
  console.error('ANDROID_HOME and ANDROID_SDK_ROOT are not set.');
  process.exit(1);
}

const buildTools = path.join(androidHome, 'build-tools');

if (!fs.existsSync(buildTools)) {
  console.error(`Android build-tools directory not found: ${buildTools}`);
  process.exit(1);
}

const versions = fs.readdirSync(buildTools)
  .filter(name => fs.existsSync(path.join(buildTools, name, 'apksigner')))
  .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

if (versions.length === 0) {
  console.error('Could not find apksigner in Android build-tools.');
  process.exit(1);
}

const apksigner = path.join(
  buildTools,
  versions[0],
  'apksigner'
);

try {
  const output = execFileSync(
    apksigner,
    ['verify', '--print-certs', apkPath],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );

  const match = output.match(
    /Signer #1 certificate SHA-1 digest:\s*([a-fA-F0-9:]+)/i
  );

  if (!match) {
    console.error('APK verified, but its SHA-1 certificate digest was not found.');
    console.error(output);
    process.exit(1);
  }

  console.log('');
  console.log('LIVIT APK SIGNING CERTIFICATE');
  console.log('--------------------------------');
  console.log(`APK: ${apkPath}`);
  console.log(`SHA-1: ${match[1].toUpperCase()}`);
  console.log('--------------------------------');
  console.log('Certificate successfully extracted from the APK.');

} catch (error) {
  console.error('Failed to verify APK signature.');
  console.error(error.stderr?.toString() || error.message);
  process.exit(1);
}
