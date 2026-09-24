/**
 * Render-only integration check of DesignSpec templates through the real
 * Fabric adapter in headless Chrome. Checks bounds/overlaps with real font
 * metrics and writes a contact sheet. No app servers are started.
 *
 *   node --import tsx scripts/verify_design_posters.ts
 *
 * Uses .local/video-runtime.json (npm run video:prepare) when present,
 * otherwise CHROME_PATH or the preinstalled Playwright Chromium.
 */
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition, type BrowserLog} from '@remotion/renderer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, '.local/tests/design-posters');
await fs.mkdir(output, {recursive: true});

async function browserExecutable(): Promise<string> {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const runtimeFile = path.join(root, '.local/video-runtime.json');
  if (existsSync(runtimeFile)) return JSON.parse(await fs.readFile(runtimeFile, 'utf8')).browserExecutable;
  const playwright = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
  if (existsSync(playwright)) return playwright;
  throw new Error('No Chrome found. Run `npm run video:prepare` or set CHROME_PATH.');
}

const executable = await browserExecutable();
const serveUrl = await bundle({entryPoint: path.join(root, 'scripts/fixtures/design-posters.tsx'), outDir: path.join(output, 'bundle'), rootDir: root, publicDir: path.join(root, 'renderer/public')});
let result: {cases: number; issues: unknown[]} | undefined;
const onBrowserLog = (entry: BrowserLog) => {
  const prefix = 'DESIGN_POSTER_CHECKS=';
  if (entry.text.startsWith(prefix)) result = JSON.parse(entry.text.slice(prefix.length));
};
const browser = await openBrowser('chrome', {browserExecutable: executable, logLevel: 'error', chromiumOptions: {gl: 'swiftshader'}});
try {
  const common = {serveUrl, browserExecutable: executable, puppeteerInstance: browser, logLevel: 'error' as const, onBrowserLog, timeoutInMilliseconds: 600000};
  const composition = await selectComposition({...common, id: 'DesignChecks'});
  await renderStill({...common, composition, frame: 0, imageFormat: 'png', output: path.join(output, 'contact-sheet.png'), overwrite: true});
} finally {
  await browser.close({silent: true});
}
if (!result) throw new Error('The design geometry check did not return a result.');
await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(result, null, 2));
console.log(`Cases: ${result.cases}, issues: ${result.issues.length}`);
if (result.issues.length) console.log(JSON.stringify(result.issues.slice(0, 40), null, 2));
console.log(`Contact sheet: ${path.join(output, 'contact-sheet.png')}`);
if (!result.cases || result.issues.length) process.exitCode = 1;
