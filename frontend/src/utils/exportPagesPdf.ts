import { formatForSize } from '@teckstudio/design-spec';
import type { EditorPage } from '../types/timeline';
import { renderPageToCanvas } from './sceneTimelineRenderer';

export interface PagesPdfOptions {
  fileName: string;
  /** JPEG keeps decks small; PNG keeps flat colours crisp. */
  imageFormat?: 'PNG' | 'JPEG';
  onProgress?: (done: number, total: number) => void;
}

function pageSize(width: number, height: number) {
  const print = formatForSize(width, height)?.print;
  return print ? { unit: 'mm' as const, width: print.widthMm, height: print.heightMm } : { unit: 'px' as const, width, height };
}

/**
 * Export every editor page, in order, into one PDF (one page per canvas page).
 * Print formats (A4, A3, Letter) use their physical size; others use pixels.
 */
export async function exportPagesPdf(pages: EditorPage[], options: PagesPdfOptions): Promise<void> {
  const usable = pages.filter((page) => page.data);
  if (!usable.length) throw new Error('There are no saved pages to export.');
  const { default: jsPDF } = await import('jspdf');
  let pdf: InstanceType<typeof jsPDF> | undefined;
  for (const [index, page] of usable.entries()) {
    const canvas = await renderPageToCanvas(page);
    const size = pageSize(canvas.width, canvas.height);
    const orientation = size.width > size.height ? 'landscape' : 'portrait';
    if (!pdf) pdf = new jsPDF({ orientation, unit: size.unit, format: [size.width, size.height], hotfixes: ['px_scaling'] });
    else pdf.addPage([size.width, size.height], orientation);
    const format = options.imageFormat ?? 'PNG';
    const dataUrl = canvas.toDataURL(format === 'PNG' ? 'image/png' : 'image/jpeg', 0.92);
    pdf.addImage(dataUrl, format, 0, 0, size.width, size.height);
    options.onProgress?.(index + 1, usable.length);
  }
  pdf!.save(`${options.fileName}.pdf`);
}
