import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const androidDir = path.join(root, 'android');
const appDir = path.join(androidDir, 'app');
const sourceConfig = path.join(root, 'google-services.json');
const targetConfig = path.join(appDir, 'google-services.json');
const variablesFile = path.join(androidDir, 'variables.gradle');

if (!fs.existsSync(androidDir) || !fs.existsSync(variablesFile)) {
  throw new Error('Android project or android/variables.gradle is missing. Run npx cap add android and npx cap sync android first.');
}

const firebaseConfig = JSON.parse(fs.readFileSync(sourceConfig, 'utf8'));
if (firebaseConfig.project_info?.project_id !== 'livit-lifebucket') {
  throw new Error('google-services.json does not belong to the expected LIVIT Firebase project.');
}
const androidClients = (firebaseConfig.client || []).filter(
  client => client.client_info?.android_client_info?.package_name === 'com.livit.app'
);
if (!androidClients.length) {
  throw new Error('google-services.json has no Android client for com.livit.app.');
}
fs.copyFileSync(sourceConfig, targetConfig);
console.log('Copied LIVIT google-services.json to android/app/.');

let variables = fs.readFileSync(variablesFile, 'utf8');
const required = [
  ['rgcfaIncludeGoogle', 'true'],
  ['androidxCredentialsVersion', "'1.3.0'"]
];
for (const [name, value] of required) {
  const line = new RegExp('(^\\s*' + name + '\\s*=).*$', 'm');
  if (line.test(variables)) {
    variables = variables.replace(line, `$1 ${value}`);
  } else {
    const extStart = variables.search(/\bext\s*\{/);
    if (extStart < 0) throw new Error('Could not find the ext { } block in android/variables.gradle.');
    const brace = variables.indexOf('{', extStart);
    variables = variables.slice(0, brace + 1) + `\n    ${name} = ${value}` + variables.slice(brace + 1);
  }
}
fs.writeFileSync(variablesFile, variables);
console.log('Configured native Google Sign-In dependencies in android/variables.gradle.');

// Optional stable CI debug signing. The secrets are supplied by GitHub Actions;
// the private keystore itself is never committed to the source project.
const secretNames = [
  'LIVIT_DEBUG_KEYSTORE_BASE64',
  'LIVIT_DEBUG_KEYSTORE_PASSWORD',
  'LIVIT_DEBUG_KEY_ALIAS',
  'LIVIT_DEBUG_KEY_PASSWORD'
];
const supplied = secretNames.filter(name => Boolean(process.env[name]));
if (supplied.length && supplied.length !== secretNames.length) {
  throw new Error('Stable debug signing requires all four LIVIT_DEBUG_* GitHub Actions secrets.');
}
if (supplied.length === secretNames.length) {
  const bytes = Buffer.from(process.env.LIVIT_DEBUG_KEYSTORE_BASE64, 'base64');
  if (bytes.length < 500) throw new Error('LIVIT_DEBUG_KEYSTORE_BASE64 does not look like a valid keystore.');
  const keystorePath = path.join(appDir, 'livit-debug.keystore');
  fs.writeFileSync(keystorePath, bytes, { mode: 0o600 });
  const gradleFile = path.join(appDir, 'build.gradle');
  let gradle = fs.readFileSync(gradleFile, 'utf8');
  const marker = '// LIVIT stable CI debug signing';
  if (!gradle.includes(marker)) {
    gradle += `\n\n${marker}\nandroid {\n    signingConfigs {\n        debug {\n            storeFile file('livit-debug.keystore')\n            storePassword System.getenv('LIVIT_DEBUG_KEYSTORE_PASSWORD')\n            keyAlias System.getenv('LIVIT_DEBUG_KEY_ALIAS')\n            keyPassword System.getenv('LIVIT_DEBUG_KEY_PASSWORD')\n        }\n    }\n}\n`;
    fs.writeFileSync(gradleFile, gradle);
  }
  console.log('Configured stable CI debug signing from GitHub Actions secrets.');
} else {
  console.warn('Stable debug signing secrets are not configured; Gradle will use this runner’s temporary Android debug key. Google sign-in SHA-1 will change between clean runners.');
}
