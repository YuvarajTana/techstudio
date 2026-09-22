/** Render-only integration check using the installed Remotion browser. No app servers. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {openBrowser,renderStill,selectComposition,type BrowserLog} from '@remotion/renderer';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'.local/tests/creative-posters');
await fs.mkdir(output,{recursive:true});
const runtime=JSON.parse(await fs.readFile(path.join(root,'.local/video-runtime.json'),'utf8'));
const serveUrl=await bundle({entryPoint:path.join(root,'scripts/fixtures/creative-posters.tsx'),outDir:path.join(output,'bundle'),rootDir:root,publicDir:path.join(root,'renderer/public')});
let result:{cases:number;issues:unknown[]}|undefined;
const onBrowserLog=(entry:BrowserLog)=>{
  const prefix='CREATIVE_POSTER_CHECKS=';
  if(entry.text.startsWith(prefix))result=JSON.parse(entry.text.slice(prefix.length));
};
const shellQuote=(value:string)=>`'${value.replaceAll("'","'\\''")}'`;
const wrapper=path.join(output,'chrome-local-only.sh');
await fs.writeFile(wrapper,`#!/bin/sh\nexec ${shellQuote(runtime.browserExecutable)} --proxy-server=http://127.0.0.1:9 '--proxy-bypass-list=localhost;127.0.0.1' '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost' "$@"\n`,{mode:0o700});
const browser=await openBrowser('chrome',{browserExecutable:wrapper,logLevel:'error'});
try {
  const common={serveUrl,browserExecutable:wrapper,puppeteerInstance:browser,logLevel:'error' as const,onBrowserLog,timeoutInMilliseconds:120000};
  const composition=await selectComposition({...common,id:'PosterChecks'});
  await renderStill({...common,composition,frame:0,imageFormat:'png',output:path.join(output,'contact-sheet.png'),overwrite:true});
} finally {await browser.close({silent:true});}
if(!result)throw new Error('The native poster geometry check did not return a result.');
await fs.writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
console.log(`Contact sheet: ${path.join(output,'contact-sheet.png')}`);
if(result.cases!==36||result.issues.length)process.exitCode=1;
