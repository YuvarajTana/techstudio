import {useState} from 'react';
import type {CreativeScene, CreativeVideoSpec, LessonScene} from '@teckstudio/lesson-video';
import SceneFields, {TextField} from './SceneFields';
import {creativeApi} from '../creative/creativeApi';

export function newCreativeScene(type:CreativeScene['type']):CreativeScene {
  const base={id:`scene-${crypto.randomUUID()}`,durationFrames:180,motion:'fade' as const};
  if(type==='image')return {...base,type,title:'Show the idea',body:'Add context for this image.',imageAssetId:''};
  if(type==='features')return {...base,type,title:'Why it matters',items:['A useful benefit']};
  if(type==='comparison')return {...base,type,title:'Compare the options',left:{title:'Before',points:['The starting point']},right:{title:'After',points:['The change']}};
  if(type==='process')return {...base,type,title:'How it works',steps:['Start here','Continue with the next step']};
  if(type==='cta')return {...base,type,title:'Take the next step',body:'Put the idea into practice.',action:'Try it yourself',contact:''};
  if(type==='title')return {...base,type,title:'A new concept',subtitle:'Explain what your audience should understand.'};
  if(type==='question')return {...base,type,prompt:'What happens next?',answer:'Explain the answer.',explanation:'Connect it to the concept.',revealAtFrame:120};
  if(type==='recap')return {...base,type,title:'Key takeaways',points:['One useful idea'],nextTask:'Try applying this idea.'};
  return {...base,type:'diagram',title:'Follow the process',layout:'left-to-right',nodes:[{id:'input',label:'Input'},{id:'output',label:'Output'}],edges:[{id:'flow',from:'input',to:'output',label:'Transforms into'}],steps:[{atFrame:0,label:'Follow the connection.',activeNodeIds:['input'],activeEdgeIds:['flow']}]};
}

export async function textHash(text:string) {const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');}

export default function VideoV2Fields({scene,spec,onChange,onSpec,projectId}:{scene:CreativeScene;spec:CreativeVideoSpec;onChange:(scene:CreativeScene)=>void;onSpec:(spec:CreativeVideoSpec)=>void;projectId:string}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const legacy=['title','diagram','question','recap'].includes(scene.type);
  async function attach(file:File|undefined,kind:'image'|'audio') {if(!file)return;setBusy(true);setError('');try{if(kind==='audio'&&!scene.narration?.text.trim())throw new Error('Write the matching narration script before attaching voice audio.');const asset=await creativeApi.upload(file,kind==='audio'?'narration':'hero',projectId);if(asset.kind!==kind)throw new Error(`Choose ${kind} media.`);const alias=`asset-${crypto.randomUUID()}`;let next:CreativeScene=scene;if(kind==='image'&&scene.type==='image')next={...scene,imageAssetId:alias};if(kind==='audio')next={...scene,narration:{text:scene.narration!.text,assetId:alias,durationFrames:Math.ceil((asset.duration_ms||0)/1000*30),approvedTextHash:await textHash(scene.narration!.text)}};onSpec({...spec,assets:[...spec.assets,{id:alias,kind,source:asset.source,assetId:asset.id}],scenes:spec.scenes.map(item=>item.id===scene.id?next:item)});}catch(e){setError(e instanceof Error?e.message:'Unable to attach media.');}finally{setBusy(false);}}
  return <>
    {legacy?<SceneFields scene={scene as LessonScene} onChange={next=>onChange({...next,motion:scene.motion,narration:scene.narration,captions:scene.captions})}/>:<>
      <TextField label="Scene title" value={'title'in scene?scene.title:''} limit={160} onChange={title=>onChange({...scene,title} as CreativeScene)}/>
      <label className="lv-field">Duration · seconds<input type="number" min={.5} max={90} step={.5} value={scene.durationFrames/30} onChange={e=>onChange({...scene,durationFrames:Math.round(Number(e.target.value)*30)})}/></label>
      {scene.type==='image'&&<><TextField label="Image description" value={scene.body} area limit={500} onChange={body=>onChange({...scene,body})}/><label className="lv-field">Image asset<select value={scene.imageAssetId} onChange={e=>onChange({...scene,imageAssetId:e.target.value})}><option value="">Select an image</option>{spec.assets.filter(a=>a.kind==='image').map(a=><option key={a.id} value={a.id}>{a.id}</option>)}</select></label><label className="lv-field">Upload image<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>void attach(e.target.files?.[0],'image')}/></label></>}
      {scene.type==='features'&&<TextField label="Benefits · one per line" value={scene.items.join('\n')} area limit={1200} onChange={text=>onChange({...scene,items:text.split('\n')})}/>}
      {scene.type==='process'&&<TextField label="Steps · one per line" value={scene.steps.join('\n')} area limit={1200} onChange={text=>onChange({...scene,steps:text.split('\n')})}/>}
      {scene.type==='comparison'&&(['left','right'] as const).map(side=><div key={side}><TextField label={`${side} heading`} value={scene[side].title} limit={80} onChange={title=>onChange({...scene,[side]:{...scene[side],title}})}/><TextField label={`${side} points · one per line`} value={scene[side].points.join('\n')} area limit={1200} onChange={text=>onChange({...scene,[side]:{...scene[side],points:text.split('\n')}})}/></div>)}
      {scene.type==='cta'&&<><TextField label="Message" value={scene.body} area limit={500} onChange={body=>onChange({...scene,body})}/><TextField label="Call to action" value={scene.action} limit={100} onChange={action=>onChange({...scene,action})}/><TextField label="Contact details" value={scene.contact} limit={200} onChange={contact=>onChange({...scene,contact})}/></>}
    </>}
    <label className="lv-field">Motion<select value={scene.motion||'none'} onChange={e=>onChange({...scene,motion:e.target.value as CreativeScene['motion']})}>{['none','fade','slide','zoom'].map(value=><option key={value}>{value}</option>)}</select></label>
    <hr/><h3>Narration</h3><p className="lv-small">Write a script, then attach a recording or generate speech below. Changing the script detaches old audio.</p>
    <TextField label="Narration script" value={scene.narration?.text||''} area limit={2500} onChange={text=>onChange({...scene,narration:text?{text}:undefined,captions:undefined})}/>
    <label className="lv-field">Attach recording for this script<input disabled={busy} type="file" accept="audio/*,.m4a,.webm" onChange={e=>void attach(e.target.files?.[0],'audio')}/></label>{scene.narration?.assetId&&<p className="lv-small">Measured audio: {(scene.narration.durationFrames!/30).toFixed(2)} seconds. The scene expands to fit.</p>}
    <button onClick={()=>onChange({...scene,narration:undefined,captions:undefined})}>Use silent scene</button>
    <h3>Captions</h3><p className="lv-small">Generate timing from attached speech, or enter caption cues in seconds.</p>{(scene.captions||[]).map((cue,i)=><div className="lv-field" key={i}><div className="lv-inline"><input aria-label={`Caption ${i+1} start seconds`} type="number" step=".1" min={0} value={cue.startFrame/30} onChange={e=>onChange({...scene,captions:scene.captions!.map((c,j)=>j===i?{...c,startFrame:Math.round(Number(e.target.value)*30)}:c)})}/><input aria-label={`Caption ${i+1} end seconds`} type="number" step=".1" min={0} value={cue.endFrame/30} onChange={e=>onChange({...scene,captions:scene.captions!.map((c,j)=>j===i?{...c,endFrame:Math.round(Number(e.target.value)*30)}:c)})}/></div><input aria-label={`Caption ${i+1} text`} value={cue.text} onChange={e=>onChange({...scene,captions:scene.captions!.map((c,j)=>j===i?{...c,text:e.target.value}:c)})}/><button onClick={()=>onChange({...scene,captions:scene.captions!.filter((_,j)=>j!==i)})}>Remove caption</button></div>)}<button onClick={()=>onChange({...scene,captions:[...(scene.captions||[]),{startFrame:scene.captions?.at(-1)?.endFrame||0,endFrame:Math.min(scene.durationFrames,(scene.captions?.at(-1)?.endFrame||0)+90),text:'Caption text'}]})}>Add caption</button>{error&&<p role="alert">{error}</p>}
  </>;
}
