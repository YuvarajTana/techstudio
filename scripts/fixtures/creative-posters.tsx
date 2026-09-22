/** Native authoring/render test fixture; it never opens the user's browser. */
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Composition, Img, continueRender, delayRender, registerRoot} from 'remotion';
import {fabric} from 'fabric';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-700.css';
import {createPosterData} from '../../frontend/src/features/creative/posterTemplates';
import {POSTER_FAMILIES, POSTER_FORMATS, type Brand, type PosterCopy} from '../../frontend/src/features/creative/types';

const image = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const logo = image('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="130"><rect x="5" y="5" width="170" height="120" rx="16" fill="#173d37"/><path d="M30 90V45h30v45m15 0V25h30v65m15 0V55h30v35" stroke="#b7802d" stroke-width="10" fill="none"/></svg>');
const hero = image('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#dce8e4"/><circle cx="950" cy="190" r="120" fill="#dfbd76"/><path d="M0 740L350 390 610 630 930 310 1200 630V900H0Z" fill="#6c8e81"/><rect x="300" y="375" width="570" height="400" fill="#efece4"/><path d="M270 375L580 180 900 375Z" fill="#173d37"/><path d="M355 455h120v140H355Zm310 0h120v140H665ZM520 560h110v215H520Z" fill="#819db0"/></svg>');
const brand: Brand = {id:'fixture-brand',name:'Example Studio',company_name:'Example Studio & Services',revision:1,profile_json:{tagline:'Thoughtful work. Clear communication.',phone:'+1 555 0100',email:'hello@example.test',locations:['Example City']},colors:[{role:'primary',hex_value:'#173d37'},{role:'accent',hex_value:'#b7802d'}],fonts:[{family:'Inter',role:'heading'},{family:'Inter',role:'body'}],logos:[{id:'fixture-logo',name:'Logo',role:'primary',file_data:logo}]};

type Issue = {family:string;format:string;message:string};
type Preview = {label:string;url:string};
type TextObject = {type?:string;id?:string;posterRole?:string;text?:string;left?:number;top?:number;width?:number;height?:number;scaleX?:number;scaleY?:number};

function PosterChecks() {
  const [handle] = useState(()=>delayRender('Compile native poster templates',{timeoutInMilliseconds:120000}));
  const [previews,setPreviews] = useState<Preview[]>([]);
  useEffect(()=>{
    let alive=true;
    void (async()=>{
      await document.fonts.load('400 20px Inter');
      await document.fonts.load('700 20px Inter');
      const issues:Issue[]=[], next:Preview[]=[];
      for(const family of POSTER_FAMILIES) for(const format of POSTER_FORMATS) {
        const fail=(message:string)=>issues.push({family:family.id,format:format.id,message});
        const copy:PosterCopy={schema:'creative-poster/v1',family:family.id,headline:family.id==='festival'?'A thoughtful celebration together':'Better ideas for everyday spaces',subheadline:'An occasion to create, learn and connect',body:'Bring your next idea to life with clear planning, thoughtful design and practical support. Explore a reusable approach that works for new products, trusted services and concepts worth teaching.',cta:'Discover what we can create together',contact:'+1 555 0100  •  hello@example.test  •  Example City',services:['Residential and commercial spaces','Careful planning and design','Practical support at every step','Clear communication throughout','Ideas that help people learn'],imagePrompt:''};
        try {
          const serialized=await createPosterData({...format,copy,brand,hero});
          const data=JSON.parse(serialized) as {objects:TextObject[];width:number;height:number};
          if(data.width!==format.width||data.height!==format.height)fail('Document dimensions changed.');
          if(new Set(data.objects.map(object=>object.id)).size!==data.objects.length)fail('Native layer IDs are missing or duplicated.');
          const texts=data.objects.filter(object=>['textbox','text','i-text'].includes(object.type||''));
          if(!texts.some(object=>object.posterRole==='contact'&&object.text===copy.contact))fail('Exact contact text was lost.');
          if(!data.objects.some(object=>object.posterRole==='brand-logo'&&object.type==='image'))fail('Brand logo is not a separate image layer.');
          const bounds=texts.map(object=>({object,x:object.left||0,y:object.top||0,w:(object.width||0)*(object.scaleX||1),h:(object.height||0)*(object.scaleY||1)}));
          for(const b of bounds) if(b.x < -1 || b.y < -1 || b.x+b.w > format.width+1 || b.y+b.h > format.height+1)fail(`Text ${b.object.posterRole} extends outside the poster.`);
          for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++) {
            const a=bounds[i],b=bounds[j];
            const overlapWidth=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);
            const overlapHeight=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
            if(overlapWidth>2&&overlapHeight>2)fail(`Text ${a.object.posterRole} overlaps ${b.object.posterRole}.`);
          }
          const canvas=new fabric.StaticCanvas(document.createElement('canvas'),{width:format.width,height:format.height,renderOnAddRemove:false});
          try {
            await new Promise<void>(resolve=>canvas.loadFromJSON(data,()=>resolve()));
            canvas.renderAll();
            next.push({label:`${family.label} · ${format.id}`,url:canvas.toDataURL({format:'png',multiplier:240/format.width})});
          } finally {canvas.dispose();}
        } catch(error) {fail(error instanceof Error?error.message:'Template compilation failed.');}
      }
      console.log('CREATIVE_POSTER_CHECKS='+JSON.stringify({cases:POSTER_FAMILIES.length*POSTER_FORMATS.length,issues}));
      if(alive)setPreviews(next);
      continueRender(handle);
    })().catch(error=>{console.log('CREATIVE_POSTER_CHECKS='+JSON.stringify({cases:0,issues:[{message:String(error)}]}));continueRender(handle);});
    return()=>{alive=false;};
  },[handle]);
  return <AbsoluteFill style={{background:'#d4d8d5',padding:16,display:'grid',gridTemplateColumns:'repeat(6, 1fr)',gridTemplateRows:'repeat(6, 1fr)',gap:12,fontFamily:'Inter'}}>{previews.map(preview=><div key={preview.label} style={{minHeight:0,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}><div style={{fontSize:11,textAlign:'center',fontWeight:700}}>{preview.label}</div><Img src={preview.url} style={{minHeight:0,maxHeight:394,maxWidth:'100%',objectFit:'contain'}}/></div>)}</AbsoluteFill>;
}
registerRoot(()=> <Composition id="PosterChecks" component={PosterChecks} width={1536} height={2600} fps={30} durationInFrames={1}/>);
