import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const appDir = path.join(process.cwd(), 'android', 'app');
const stable = path.join(appDir, 'livit-debug.keystore');
const defaultKey = path.join(process.env.HOME || '', '.android', 'debug.keystore');
const key = fs.existsSync(stable) ? stable : defaultKey;
if (!fs.existsSync(key)) {
  console.error('No debug keystore was found; Gradle may not have completed the APK signing step.');
  process.exit(1);
}
const alias = stable === key ? process.env.LIVIT_DEBUG_KEY_ALIAS : 'androiddebugkey';
const password = stable === key ? process.env.LIVIT_DEBUG_KEYSTORE_PASSWORD : 'android';
const result = spawnSync('keytool', ['-list', '-v', '-keystore', key, '-storepass', password, '-alias', alias], { encoding: 'utf8' });
if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status || 1);
}
const sha1 = (result.stdout.match(/SHA1:\s*([A-F0-9:]+)/i) || [])[1];
if (!sha1) throw new Error('Could not read SHA-1 from keytool output.');
console.log(`LIVIT Android debug signing SHA-1: ${sha1}`);
console.log('Register this exact SHA-1 in Firebase Console > Project settings > Your apps > Android app (com.livit.app), then download the refreshed google-services.json into the project root.');
const summary = process.env.GITHUB_STEP_SUMMARY;
if (summary) fs.appendFileSync(summary, `\n### LIVIT Android signing\nDebug certificate SHA-1: \`${sha1}\`\n\nRegister this SHA-1 in Firebase Console for \`com.livit.app\` and commit the refreshed \`google-services.json\`.\n`);
