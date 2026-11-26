import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const apkPath = path.resolve(
  'android/app/build/outputs/apk/debug/app-debug.apk'
);

if (!fs.existsSync(apkPath)) {
  throw new Error(`APK not found: ${apkPath}`);
}

const androidHome =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT;

if (!androidHome) {
  throw new Error('Android SDK path not found.');
}

const buildTools = path.join(androidHome, 'build-tools');

const versions = fs.readdirSync(buildTools)
  .filter(version =>
    fs.existsSync(path.join(buildTools, version, 'apksigner'))
  )
  .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

if (!versions.length) {
  throw new Error('apksigner not found.');
}

const apksigner = path.join(
  buildTools,
  versions[0],
  'apksigner'
);

const output = execFileSync(
  apksigner,
  ['verify', '--print-certs', apkPath],
  { encoding: 'utf8' }
);

const match = output.match(
  /certificate SHA-1 digest:\s*([a-fA-F0-9:]+)/i
);

if (!match) {
  console.error(output);
  throw new Error('Could not extract APK SHA-1 certificate.');
}

const sha1 = match[1]
  .replace(/:/g, '')
  .toUpperCase()
  .match(/.{2}/g)
  .join(':');

console.log('\nLIVIT ANDROID APK SIGNING CERTIFICATE');
console.log('======================================');
console.log(`APK: ${apkPath}`);
console.log(`SHA-1: ${sha1}`);
console.log('======================================');
console.log('APK signature verified successfully.');
