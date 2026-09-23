/** Print every starter template as a creative-video/v2 spec (JSON array). Used by backend parity tests. */
import { STARTER_TEMPLATES } from '../packages/design-spec/src/catalog/index.ts';
import { toCreativeVideo } from '../packages/design-spec/src/video/index.ts';

const presets = ['landscape-1080p', 'portrait-1080p', 'square-1080', 'portrait-4x5'] as const;
const out = STARTER_TEMPLATES.flatMap((template) => presets.map((preset) => ({ template: template.id, preset, video: toCreativeVideo(template.spec, { preset }) })));
process.stdout.write(JSON.stringify(out));
