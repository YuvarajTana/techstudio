import fs from 'node:fs/promises';
import path from 'node:path';
import {parseLesson, type DiagramScene} from '@teckstudio/lesson-video';
import example from '@teckstudio/lesson-video/example';
import {prepareRuntime, renderLesson, RUNTIME} from '../renderer/src/render-lesson.ts';

// Prepare first. The render browser then has only loopback network access.
const runtime = await prepareRuntime();
const directory = await fs.mkdtemp(path.join(RUNTIME, 'offline-video-'));
const shellQuote = (s: string) => `'${s.replaceAll("'", "'\\''")}'`;
const wrapper = path.join(directory, 'chrome-local-only.sh');
await fs.writeFile(wrapper, `#!/bin/sh\nexec ${shellQuote(runtime.browserExecutable)} --proxy-server=http://127.0.0.1:9 '--proxy-bypass-list=localhost;127.0.0.1' '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost' "$@"\n`, {mode:0o700});
const spec = parseLesson(example);
const labels = ['Client prepares a lesson request', 'Service validates the parameters', 'A reusable explanation component', 'A dependency handles the lookup', 'Service prepares a useful result', 'Client receives the final result'];
const scene: DiagramScene = {id:'local-assets',type:'diagram',title:'Read a six-step workflow',layout:'left-to-right',durationFrames:150,
  nodes:labels.map((label,i)=>({id:`n${i}`,label})),
  edges:labels.slice(1).map((_,i)=>({id:`e${i}`,from:`n${i}`,to:`n${i+1}`,label:'Follow the next step carefully'})),
  steps:[{atFrame:0,label:'This layout check uses packaged fonts and six nodes with long labels.',activeNodeIds:['n0','n1'],activeEdgeIds:['e0']}],
};
spec.scenes=[scene];
await renderLesson(spec,directory,{...runtime,browserExecutable:wrapper});
await fs.writeFile(path.join(RUNTIME,'offline-video-results.json'),JSON.stringify({directory,restriction:'Browser outbound proxy blocked; only loopback bypassed',frames:150,fps:30,fontHashes:runtime.fontHashes},null,2));
console.log(`PASS local-assets render with browser outbound networking blocked: ${directory}`);
