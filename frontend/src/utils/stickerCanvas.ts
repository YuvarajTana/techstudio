import { fabric } from 'fabric';
import type { StickerItem } from '../types/editorFeatures';

const objectId = () => window.crypto?.randomUUID
  ? window.crypto.randomUUID()
  : `sticker_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const decodeSvgDataUrl = (source: string) => {
  const [, metadata = '', encoded = ''] = source.match(/^data:image\/svg\+xml([^,]*),(.*)$/i) || [];
  if (!encoded) throw new Error('Sticker SVG data is invalid.');
  return metadata.includes(';base64') ? window.atob(encoded) : decodeURIComponent(encoded);
};

const loadSvg = async (source: string) => {
  const svg = source.startsWith('data:image/svg+xml')
    ? decodeSvgDataUrl(source)
    : await fetch(source).then(async (response) => {
        if (!response.ok) throw new Error(`Sticker could not be loaded (${response.status}).`);
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('image/svg+xml') && !contentType.includes('text/')) {
          throw new Error('Sticker provider returned an invalid SVG response.');
        }
        return response.text();
      });

  return new Promise<fabric.Object>((resolve, reject) => {
    fabric.loadSVGFromString(svg, (objects, options) => {
      if (!objects.length) {
        reject(new Error('Sticker SVG does not contain any visible objects.'));
        return;
      }
      resolve(fabric.util.groupSVGElements(objects, options));
    });
  });
};

const loadRaster = (source: string) => new Promise<fabric.Image>((resolve, reject) => {
  fabric.Image.fromURL(source, (image) => {
    if (!image.width || !image.height) {
      reject(new Error('Sticker image could not be decoded.'));
      return;
    }
    resolve(image);
  }, { crossOrigin: 'anonymous' });
});

export async function addStickerToCanvas(
  canvas: fabric.Canvas,
  sticker: StickerItem,
  point?: { x: number; y: number },
) {
  const object = sticker.fileType === 'svg'
    ? await loadSvg(sticker.sourceUrl)
    : await loadRaster(sticker.sourceUrl);

  const maxSize = Math.min(220, canvas.getWidth() * 0.3, canvas.getHeight() * 0.3);
  const width = object.width || sticker.width || 1;
  const height = object.height || sticker.height || 1;
  const scale = Math.min(maxSize / width, maxSize / height, 1);
  const center = point || { x: canvas.getWidth() / 2, y: canvas.getHeight() / 2 };

  object.set({
    id: objectId(),
    name: `Sticker — ${sticker.name}`,
    objectType: 'sticker',
    teckstudioObjectType: 'sticker',
    stickerId: sticker.id,
    stickerName: sticker.name,
    stickerCategory: sticker.category,
    stickerFileType: sticker.fileType,
    sourceUrl: sticker.sourceUrl,
    thumbnailUrl: sticker.thumbnailUrl,
    isPremium: sticker.isPremium,
    left: center.x,
    top: center.y,
    originX: 'center',
    originY: 'center',
    scaleX: scale,
    scaleY: scale,
    selectable: true,
    evented: true,
  } as Record<string, unknown>);
  object.setCoords();
  canvas.add(object);
  canvas.setActiveObject(object);
  canvas.requestRenderAll();
  return object;
}
