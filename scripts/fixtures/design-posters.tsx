/** Render-only check of the DesignSpec → Fabric adapter inside the Remotion headless browser. */
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Composition, Img, continueRender, delayRender, registerRoot} from 'remotion';
import {fabric} from 'fabric';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/outfit/latin-400.css';
import '@fontsource/outfit/latin-600.css';
import '@fontsource/outfit/latin-700.css';
import '@fontsource/outfit/latin-800.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import '@fontsource/playfair-display/latin-400.css';
import '@fontsource/playfair-display/latin-700.css';
import {STARTER_TEMPLATES, adaptLegacyPosterTemplate, instantiateTemplate} from '@teckstudio/design-spec/catalog';
import {renderDesignToProjectData} from '@teckstudio/design-spec/fabric';
import {TECH_POSTER_TEMPLATES} from '../../frontend/src/data/techPosterTemplates';

type Issue = {template: string; format: string; page: number; message: string};
type Preview = {label: string; url: string};
type Obj = {type?: string; id?: string; designSlot?: string; designRole?: string; left?: number; top?: number; width?: number; height?: number; scaleX?: number; scaleY?: number; fontSize?: number; text?: string};

const photo = (hue: number) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="hsl(${hue},35%,70%)"/><path d="M0 620L300 380 520 560 820 300 1200 600V800H0Z" fill="hsl(${hue},30%,45%)"/><rect x="420" y="330" width="380" height="270" fill="#f4efe6"/><path d="M390 340L610 190 830 340Z" fill="#3b4a55"/></svg>`)}`;

function withPhotos<T>(value: T): T {
  let hue = 20;
  return JSON.parse(JSON.stringify(value), (key, v) => (v && typeof v === 'object' && !Array.isArray(v) && v.src === '' ? {...v, src: photo((hue += 47) % 360)} : v));
}

function DesignChecks() {
  const [handle] = useState(() => delayRender('Render DesignSpec templates', {timeoutInMilliseconds: 600000}));
  const [previews, setPreviews] = useState<Preview[]>([]);
  useEffect(() => {
    void (async () => {
      const issues: Issue[] = [];
      const next: Preview[] = [];
      let cases = 0;
      const jobs: {name: string; format: string; spec: ReturnType<typeof instantiateTemplate>; preview: boolean}[] = [];
      for (const template of STARTER_TEMPLATES) {
        for (const format of new Set([template.spec.format, ...template.altFormats])) {
          const spec = instantiateTemplate(template, {format, id: `${template.id}-${format}`});
          jobs.push({name: template.name, format, spec: format === template.spec.format ? withPhotos(spec) : spec, preview: format === template.spec.format});
        }
      }
      for (const template of TECH_POSTER_TEMPLATES.map(adaptLegacyPosterTemplate)) jobs.push({name: template.name, format: template.spec.format, spec: template.spec, preview: false});
      for (const job of jobs) {
        cases += 1;
        const fail = (page: number, message: string) => issues.push({template: job.name, format: job.format, page, message});
        try {
          const result = await renderDesignToProjectData(fabric, job.spec);
          const project = JSON.parse(result.projectData);
          if (project.teckstudioPages?.length !== job.spec.pages.length) fail(0, 'Page count mismatch.');
          for (const [index, page] of result.pages.entries()) {
            const data = JSON.parse(page.data) as {objects: Obj[]; width: number; height: number};
            if (data.width !== result.width || data.height !== result.height) fail(index, 'Page size changed.');
            if (new Set(data.objects.map((o) => o.id)).size !== data.objects.length) fail(index, 'Duplicate object ids.');
            const texts = data.objects.filter((o) => o.type === 'textbox').map((o) => ({o, x: o.left || 0, y: o.top || 0, w: (o.width || 0) * (o.scaleX || 1), h: (o.height || 0) * (o.scaleY || 1)}));
            for (const t of texts) if (t.x < -1 || t.y < -1 || t.x + t.w > data.width + 1 || t.y + t.h > data.height + 1) fail(index, `Text ${t.o.designSlot ?? t.o.designRole} extends outside the page.`);
            for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
              const a = texts[i], b = texts[j];
              const ow = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
              const oh = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
              if (ow > 2 && oh > 2) fail(index, `Text ${a.o.designSlot ?? a.o.designRole} overlaps ${b.o.designSlot ?? b.o.designRole}.`);
            }
            if (job.preview) {
              const canvas = new fabric.StaticCanvas(document.createElement('canvas'), {width: data.width, height: data.height, renderOnAddRemove: false});
              try {
                await new Promise<void>((resolve) => canvas.loadFromJSON(data, () => resolve()));
                canvas.renderAll();
                next.push({label: `${job.name}${result.pages.length > 1 ? ` · ${index + 1}` : ''} · ${job.format}`, url: canvas.toDataURL({format: 'png', multiplier: 300 / Math.max(data.width, data.height)})});
              } finally {
                canvas.dispose();
              }
            }
          }
        } catch (error) {
          fail(0, error instanceof Error ? error.message : String(error));
        }
      }
      console.log('DESIGN_POSTER_CHECKS=' + JSON.stringify({cases, issues}));
      setPreviews(next);
      continueRender(handle);
    })().catch((error) => {
      console.log('DESIGN_POSTER_CHECKS=' + JSON.stringify({cases: 0, issues: [{message: String(error)}]}));
      continueRender(handle);
    });
  }, [handle]);
  return (
    <AbsoluteFill style={{background: '#d4d8d5', padding: 16, display: 'flex', flexWrap: 'wrap', gap: 14, alignContent: 'flex-start', fontFamily: 'Inter'}}>
      {previews.map((preview) => (
        <div key={preview.label} style={{width: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4}}>
          <Img src={preview.url} style={{maxWidth: 300, maxHeight: 300, boxShadow: '0 2px 8px rgba(0,0,0,.25)'}} />
          <div style={{fontSize: 12, textAlign: 'center'}}>{preview.label}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
}

registerRoot(() => <Composition id="DesignChecks" component={DesignChecks} width={1600} height={2800} fps={30} durationInFrames={1} />);
