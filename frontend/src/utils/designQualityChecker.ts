import { fabric } from 'fabric';

export interface QualityIssue {
  id: string;
  type: 'contrast' | 'font-size' | 'alignment' | 'text-overlap';
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  suggestion: string;
  objectId?: string;
}

export interface DesignQualityScore {
  score: number; // 0 - 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  issues: QualityIssue[];
  metrics: {
    contrastScore: number;
    typographyScore: number;
    alignmentScore: number;
    totalObjects: number;
  };
}

// Convert Hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    return {
      r: parseInt(cleanHex[0] + cleanHex[0], 16),
      g: parseInt(cleanHex[1] + cleanHex[1], 16),
      b: parseInt(cleanHex[2] + cleanHex[2], 16),
    };
  }
  if (cleanHex.length === 6) {
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16),
    };
  }
  return null;
}

// Calculate relative luminance for WCAG 2.1
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate WCAG contrast ratio between two hex colors
export function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1) || { r: 0, g: 0, b: 0 };
  const rgb2 = hexToRgb(color2) || { r: 255, g: 255, b: 255 };

  const l1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

// Analyze active Fabric.js canvas and generate quality score
export function analyzeDesignQuality(canvas: fabric.Canvas | null): DesignQualityScore {
  if (!canvas) {
    return {
      score: 100,
      grade: 'A+',
      issues: [],
      metrics: { contrastScore: 100, typographyScore: 100, alignmentScore: 100, totalObjects: 0 },
    };
  }

  const objects = canvas.getObjects().filter((obj) => obj.visible !== false);
  const issues: QualityIssue[] = [];
  const canvasBg = (canvas.backgroundColor as string) || '#ffffff';

  let contrastPenalties = 0;
  let fontPenalties = 0;

  objects.forEach((obj, idx) => {
    const isText = ['text', 'i-text', 'textbox'].includes(obj.type || '');
    if (isText) {
      const textObj = obj as fabric.Text;
      const textColor = (textObj.fill as string) || '#000000';
      const fontSize = textObj.fontSize || 16;

      // 1. Contrast Check (WCAG AA threshold = 4.5:1 for normal text, 3.0:1 for large text)
      if (typeof textColor === 'string' && textColor.startsWith('#')) {
        const ratio = calculateContrastRatio(textColor, typeof canvasBg === 'string' && canvasBg.startsWith('#') ? canvasBg : '#ffffff');
        const minRatio = fontSize >= 24 ? 3.0 : 4.5;
        if (ratio < minRatio) {
          contrastPenalties += 15;
          issues.push({
            id: `contrast_${idx}`,
            type: 'contrast',
            severity: 'error',
            title: `Low Text Contrast (${ratio}:1)`,
            description: `Text layer "${textObj.text?.slice(0, 15)}..." has contrast ratio ${ratio}:1 against background, below WCAG minimum of ${minRatio}:1.`,
            suggestion: 'Increase text brightness or change background color for better legibility.',
            objectId: textObj.get('id' as any),
          });
        }
      }

      // 2. Small Font Size Check
      if (fontSize < 12) {
        fontPenalties += 10;
        issues.push({
          id: `fontsize_${idx}`,
          type: 'font-size',
          severity: 'warning',
          title: `Small Font Size (${fontSize}px)`,
          description: `Text layer "${textObj.text?.slice(0, 15)}..." uses a font size smaller than 12px.`,
          suggestion: 'Increase font size to at least 14px for print and mobile readability.',
          objectId: textObj.get('id' as any),
        });
      }
    }
  });

  const totalObjects = objects.length;
  const contrastScore = Math.max(0, 100 - contrastPenalties);
  const typographyScore = Math.max(0, 100 - fontPenalties);
  const alignmentScore = totalObjects > 1 ? 95 : 100;

  const rawScore = Math.round((contrastScore * 0.45) + (typographyScore * 0.35) + (alignmentScore * 0.20));
  const score = Math.max(10, Math.min(100, rawScore));

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A+';
  if (score < 50) grade = 'F';
  else if (score < 65) grade = 'D';
  else if (score < 75) grade = 'C';
  else if (score < 85) grade = 'B';
  else if (score < 95) grade = 'A';

  return {
    score,
    grade,
    issues,
    metrics: { contrastScore, typographyScore, alignmentScore, totalObjects },
  };
}
