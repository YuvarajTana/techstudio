import {useState} from 'react';
import {fabric} from 'fabric';
import {useEditorStore} from '../../store/useEditorStore';
import {CUSTOM_FABRIC_PROPERTIES} from '../../utils/editorElementFactory';

export function printGeometry(size:'a4'|'a3', landscape:boolean, bleed:boolean) {
  const mm=size==='a4'?[210,297]:[297,420];
  const [trimWidth,trimHeight]=landscape?[mm[1],mm[0]]:mm;
  const bleedMm=bleed?3:0, widthMm=trimWidth+bleedMm*2, heightMm=trimHeight+bleedMm*2;
  return {trimWidth,trimHeight,bleedMm,widthMm,heightMm,widthPx:Math.round(widthMm/25.4*300),heightPx:Math.round(heightMm/25.4*300)};
}

export default function PrintExport() {
  const canvas=useEditorStore(s=>s.canvas), name=useEditorStore(s=>s.projectName);
  const [size,setSize]=useState<'a4'|'a3'>('a4'),[format,setFormat]=useState<'pdf'|'png'>('pdf'),[bleed,setBleed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function exportPrint(){if(!canvas)return;setBusy(true);setMessage('');let clone:fabric.StaticCanvas|undefined;try{
    await document.fonts.ready;
    const geometry=printGeometry(size,canvas.getWidth()>canvas.getHeight(),bleed);
    if(geometry.widthPx*geometry.heightPx>20_000_000)throw new Error('Print export exceeds the supported pixel budget.');
    clone=new fabric.StaticCanvas(document.createElement('canvas'),{width:canvas.getWidth(),height:canvas.getHeight(),renderOnAddRemove:false});
    const json=canvas.toJSON(CUSTOM_FABRIC_PROPERTIES);
    await new Promise<void>(resolve=>clone!.loadFromJSON(json,()=>resolve()));
    clone.getObjects().filter(object=>object.get('editorOnly' as keyof fabric.Object)||object.get('excludeFromExport' as keyof fabric.Object)).forEach(object=>clone!.remove(object));
    clone.setViewportTransform([1,0,0,1,0,0]);clone.renderAll();
    const pixelsPerMm=300/25.4, target=document.createElement('canvas');target.width=geometry.widthPx;target.height=geometry.heightPx;
    const context=target.getContext('2d');if(!context)throw new Error('Unable to prepare print canvas.');
    context.fillStyle='#ffffff';context.fillRect(0,0,target.width,target.height);
    const fit=Math.min(geometry.trimWidth*pixelsPerMm/canvas.getWidth(),geometry.trimHeight*pixelsPerMm/canvas.getHeight());
    const raster=clone.toCanvasElement(fit),left=(target.width-raster.width)/2,top=(target.height-raster.height)/2;
    context.drawImage(raster,left,top);
    if(bleed){context.strokeStyle='#333';context.lineWidth=1;const b=geometry.bleedMm*pixelsPerMm;[[b,b],[target.width-b,b],[b,target.height-b],[target.width-b,target.height-b]].forEach(([x,y])=>{context.beginPath();context.moveTo(x,Math.max(0,y-b));context.lineTo(x,Math.min(target.height,y+b));context.moveTo(Math.max(0,x-b),y);context.lineTo(Math.min(target.width,x+b),y);context.stroke();});}
    const data=target.toDataURL('image/png');
    if(format==='pdf'){const {jsPDF}=await import('jspdf');const pdf=new jsPDF({unit:'mm',format:[geometry.widthMm,geometry.heightMm],orientation:geometry.widthMm>geometry.heightMm?'landscape':'portrait'});pdf.addImage(data,'PNG',0,0,geometry.widthMm,geometry.heightMm);pdf.save(`${name||'poster'}-${size}-rgb.pdf`);}else{const link=document.createElement('a');link.href=data;link.download=`${name||'poster'}-${size}-300ppi-rgb.png`;link.click();}
    setMessage(`Exported ${geometry.widthPx} × ${geometry.heightPx} pixels in RGB. Canvas and layers unchanged.`);
  }catch(e){setMessage(e instanceof Error?e.message:'Print export failed.');}finally{clone?.dispose();setBusy(false);}}
  return <section className="space-y-3 border-b border-zinc-700 p-4 text-xs text-zinc-200"><h3 className="font-bold text-base">A4 / A3 RGB export</h3><p className="text-zinc-400">300 pixels per inch, fitted inside the selected paper size. RGB PDF or PNG; your printer may need CMYK conversion. Artwork keeps its aspect ratio.</p><div className="flex gap-2"><select aria-label="Paper size" value={size} onChange={e=>setSize(e.target.value as 'a4'|'a3')} className="bg-zinc-900 p-2 rounded"><option value="a4">A4 · 210 × 297 mm</option><option value="a3">A3 · 297 × 420 mm</option></select><select aria-label="Print format" value={format} onChange={e=>setFormat(e.target.value as 'pdf'|'png')} className="bg-zinc-900 p-2 rounded"><option value="pdf">PDF</option><option value="png">PNG</option></select></div><label className="flex gap-2"><input type="checkbox" checked={bleed} onChange={e=>setBleed(e.target.checked)}/>Add 3 mm white margin and trim guides</label><p className="text-zinc-500">Margin adds room for cutting; it does not extend edge artwork into a bleed.</p><button disabled={busy||!canvas} onClick={()=>void exportPrint()} className="rounded bg-emerald-700 px-4 py-2 disabled:opacity-50">{busy?'Exporting…':'Export paper size'}</button>{message&&<p role="status">{message}</p>}</section>;
}
