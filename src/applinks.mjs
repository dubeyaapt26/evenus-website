// ---------------------------------------------------------------------------
// The two files that let the app open invite links (https://evenus.app/join/<CODE>)
// instead of the browser:
//
//   dist/.well-known/apple-app-site-association   iOS universal links
//   dist/.well-known/assetlinks.json              Android app links
//
// Both name the app by values only the owner has: the Apple Developer Team ID,
// and the SHA-256 fingerprints of the Android signing keys (Play app signing
// key, plus the EAS keystore for preview builds). They are read from the
// environment, or from the gitignored file .env.local at the repo root:
//
//   APPLE_TEAM_ID=ABCDE12345
//   ANDROID_SHA256_FINGERPRINTS=AA:BB:...:FF,11:22:...:EE
//
// The environment wins over the file, so Vercel project env vars work as-is.
//
// ⚠️ NO PLACEHOLDERS EVER SHIP. A file with "<TEAMID>" in it is worse than no
// file: Apple's CDN caches what it fetched, and Android marks the domain
// unverified until the app is reinstalled. A value that is missing means the
// file is skipped with a TODO line; a value that is present but malformed
// stops the build, because shipping a wrong fingerprint fails silently.
//
// Headers (Content-Type: application/json) are set in vercel.json. Vercel
// never trailing-slash-redirects /.well-known/*, so trailingSlash: true is safe.
// See the app repo's docs/17_PLAY_SUBMISSION.md and docs/18_APPLE_SUBMISSION.md.
// ---------------------------------------------------------------------------
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The app's identifier on both platforms (app.json: ios.bundleIdentifier, android.package). */
export const APP_ID = 'evenus.app';
/** The only paths the app answers for. */
export const LINK_PATHS = ['/join/*'];

function readLocalEnv(root) {
  const file = join(root, '.env.local');
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

/**
 * Returns the files to write, as [path, body] pairs, and the TODO lines for
 * anything skipped. Throws on a malformed value.
 */
export function appLinkFiles(root, env = process.env) {
  const local = readLocalEnv(root);
  const get = (k) => (env[k] && String(env[k]).trim()) || (local[k] && local[k].trim()) || '';
  const files = [];
  const todo = [];

  const team = get('APPLE_TEAM_ID').toUpperCase();
  if (!team) {
    todo.push('TODO: set APPLE_TEAM_ID (env or .env.local) to publish /.well-known/apple-app-site-association; iOS invite links open the website until then');
  } else {
    if (!/^[A-Z0-9]{10}$/.test(team)) throw new Error(`APPLE_TEAM_ID must be the 10-character Apple Developer Team ID (got "${team}")`);
    const appID = `${team}.${APP_ID}`;
    files.push(['.well-known/apple-app-site-association', JSON.stringify({
      applinks: {
        // `details` with appIDs/components is the current format; `apps` and
        // `paths` keep iOS 12 and earlier working. Both are read safely.
        apps: [],
        details: [{
          appIDs: [appID],
          components: LINK_PATHS.map((p) => ({ '/': p, comment: 'invite links' })),
          appID,
          paths: LINK_PATHS,
        }],
      },
    }, null, 2) + '\n']);
  }

  const fps = get('ANDROID_SHA256_FINGERPRINTS').split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
  if (!fps.length) {
    todo.push('TODO: set ANDROID_SHA256_FINGERPRINTS (env or .env.local, comma-separated) to publish /.well-known/assetlinks.json; Android invite links open the website until then');
  } else {
    for (const fp of fps) {
      if (!/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(fp)) throw new Error(`ANDROID_SHA256_FINGERPRINTS: "${fp}" is not a SHA-256 fingerprint (32 hex pairs separated by colons)`);
    }
    files.push(['.well-known/assetlinks.json', JSON.stringify([{
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: APP_ID, sha256_cert_fingerprints: [...new Set(fps)] },
    }], null, 2) + '\n']);
  }
  return { files, todo };
}
