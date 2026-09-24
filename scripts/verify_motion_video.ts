/**
 * Render check for creative-video motion features (transitions, easing,
 * themes, slide/code/listing/stats/logo scenes, every preset).
 * Renders key-frame stills per preset plus one MP4. No app servers.
 *
 *   node --import tsx scripts/verify_motion_video.ts [--no-video]
 *
 * Chrome: .local/video-runtime.json (npm run video:prepare), CHROME_PATH, or the
 * preinstalled Playwright headless shell.
 */
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {PRESET_SIZES, compileVideo, validateCreativeVideo, type CreativePreset, type CreativeVideoSpec} from '@teckstudio/lesson-video';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, '.local/tests/motion-video');
await fs.mkdir(output, {recursive: true});
const fixture = JSON.parse(await fs.readFile(path.join(root, 'packages/lesson-video/tests/fixtures/creative-motion.json'), 'utf8'));

async function browserExecutable(): Promise<string> {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const runtimeFile = path.join(root, '.local/video-runtime.json');
  if (existsSync(runtimeFile)) return JSON.parse(await fs.readFile(runtimeFile, 'utf8')).browserExecutable;
  const playwright = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
  if (existsSync(playwright)) return playwright;
  throw new Error('No Chrome found. Run `npm run video:prepare` or set CHROME_PATH.');
}

const photo = (hue: number) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="hsl(${hue},40%,72%)"/><path d="M0 760L420 460 720 700 1100 380 1600 720V1000H0Z" fill="hsl(${hue},32%,42%)"/><rect x="560" y="420" width="520" height="360" fill="#f4efe6"/><path d="M520 430L820 240 1120 430Z" fill="#334155"/></svg>`)}`;
const assetSources = {'photo-a': photo(35), 'photo-b': photo(200)};

const executable = await browserExecutable();
const serveUrl = await bundle({entryPoint: path.join(root, 'renderer/src/index.ts'), outDir: path.join(output, 'bundle'), rootDir: root, publicDir: path.join(root, 'renderer/public')});
const browser = await openBrowser('chrome', {browserExecutable: executable, logLevel: 'error', chromiumOptions: {gl: 'swiftshader'}});
const problems: string[] = [];
try {
  for (const preset of Object.keys(PRESET_SIZES) as CreativePreset[]) {
    const spec: CreativeVideoSpec = {...structuredClone(fixture.spec), output: {preset, fps: 30}};
    const errors = validateCreativeVideo(spec);
    if (errors.length) { problems.push(`${preset}: ${errors.join('; ')}`); continue; }
    const plan = compileVideo(spec);
    const inputProps = {spec, assetSources};
    const common = {serveUrl, browserExecutable: executable, puppeteerInstance: browser, logLevel: 'error' as const, inputProps, timeoutInMilliseconds: 120000};
    const composition = await selectComposition({...common, id: 'LessonVideo'});
    if (composition.width !== plan.width || composition.height !== plan.height || composition.durationInFrames !== plan.durationInFrames) problems.push(`${preset}: composition metadata does not match the plan`);
    // Mid-scene frame for every scene plus the midpoint of every transition.
    const frames = new Set<number>();
    plan.scenes.forEach((scene, i) => {
      frames.add(Math.min(scene.endFrame - 1, scene.startFrame + 45));
      const overlap = i > 0 ? plan.scenes[i - 1].endFrame - scene.startFrame : 0;
      if (overlap > 0) frames.add(scene.startFrame + Math.floor(overlap / 2));
    });
    for (const frame of [...frames].sort((a, b) => a - b)) {
      await renderStill({...common, composition, frame, imageFormat: 'png', output: path.join(output, `${preset}-${String(frame).padStart(4, '0')}.png`), overwrite: true});
    }
    console.log(`${preset}: ${plan.width}x${plan.height}, ${plan.durationInFrames} frames, ${frames.size} stills`);
  }
  if (!process.argv.includes('--no-video')) {
    const spec: CreativeVideoSpec = {...structuredClone(fixture.spec), output: {preset: 'square-1080', fps: 30}};
    const inputProps = {spec, assetSources};
    const common = {serveUrl, browserExecutable: executable, puppeteerInstance: browser, logLevel: 'error' as const, inputProps, timeoutInMilliseconds: 120000};
    const composition = await selectComposition({...common, id: 'LessonVideo'});
    const file = path.join(output, 'motion-square.mp4');
    await renderMedia({...common, composition, codec: 'h264', outputLocation: file, overwrite: true, concurrency: 2});
    try {
      // Prefer a system ffprobe; fall back to the one bundled with Remotion's compositor.
      const bundled = path.join(root, 'node_modules/@remotion/compositor-linux-x64-gnu');
      const [probeBin, env] = existsSync(path.join(bundled, 'ffprobe')) ? [path.join(bundled, 'ffprobe'), {...process.env, LD_LIBRARY_PATH: bundled}] : ['ffprobe', process.env];
      const probe = execFileSync(probeBin, ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,nb_read_frames', '-of', 'csv=p=0', file], {env}).toString().trim().replace(/,$/, '');
      console.log(`MP4: ${file} (${probe})`);
      if (probe !== `1080,1080,${compileVideo(spec).durationInFrames}`) problems.push(`MP4 probe mismatch: ${probe}`);
    } catch {
      console.log(`MP4: ${file} (ffprobe unavailable, not probed)`);
    }
  }
} finally {
  await browser.close({silent: true});
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else console.log(`Stills written to ${output}`);
