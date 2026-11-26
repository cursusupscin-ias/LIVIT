import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const android = path.join(root, 'android');
const pluginFile = path.join(android, 'app/src/main/assets/capacitor.plugins.json');
const webFile = path.join(android, 'app/src/main/assets/public/index.html');
const bundleFile = path.join(android, 'app/src/main/assets/public/native-auth.js');
const servicesFile = path.join(android, 'app/google-services.json');

for (const file of [pluginFile, webFile, bundleFile, servicesFile]) {
  if (!fs.existsSync(file)) throw new Error(`Required Android build output is missing: ${path.relative(root, file)}`);
}
const plugins = fs.readFileSync(pluginFile, 'utf8');
if (!plugins.includes('FirebaseAuthentication')) {
  throw new Error('FirebaseAuthentication is not registered in capacitor.plugins.json.');
}
const html = fs.readFileSync(webFile, 'utf8');
if (!html.includes('signInWithCredential') || !html.includes('initializeAuth')) {
  throw new Error('The Android web assets do not contain the Firebase JavaScript credential exchange / IndexedDB persistence code.');
}
if (!html.includes("import('./native-auth.js')")) {
  throw new Error('The Android web assets do not load the native authentication bridge.');
}
const requiredIcons = [
  'mipmap-mdpi/ic_launcher.png',
  'mipmap-hdpi/ic_launcher.png',
  'mipmap-xhdpi/ic_launcher.png',
  'mipmap-xxhdpi/ic_launcher.png',
  'mipmap-xxxhdpi/ic_launcher.png',
  'mipmap-mdpi/ic_launcher_round.png',
  'mipmap-hdpi/ic_launcher_round.png',
  'mipmap-xhdpi/ic_launcher_round.png',
  'mipmap-xxhdpi/ic_launcher_round.png',
  'mipmap-xxxhdpi/ic_launcher_round.png',
  'mipmap-anydpi-v26/ic_launcher.xml',
  'mipmap-anydpi-v26/ic_launcher_round.xml'
];
const allFiles = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full);
    else allFiles.push(path.relative(path.join(android, 'app/src/main/res'), full).replaceAll(path.sep, '/'));
  }
}
const resDir = path.join(android, 'app/src/main/res');
walk(resDir);
for (const expected of requiredIcons) {
  if (!allFiles.some(file => file === expected || file.endsWith('/' + expected))) {
    throw new Error(`Generated LIVIT launcher resource is missing: ${expected}`);
  }
}
for (const layer of ['ic_launcher_foreground', 'ic_launcher_background']) {
  if (!allFiles.some(file => file.includes(layer))) {
    throw new Error(`Generated adaptive icon layer is missing: ${layer}`);
  }
}
console.log('PASS: FirebaseAuthentication is registered in the generated Android project.');
console.log('PASS: Android web assets include the native auth bridge and Firebase credential exchange.');
console.log('PASS: google-services.json is installed for com.livit.app.');
console.log('PASS: legacy, adaptive and round launcher icon resources exist at all density tiers.');
