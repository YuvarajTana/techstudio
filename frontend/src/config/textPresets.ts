import type { fabric } from 'fabric';

export type TextPreset = {
  id: string;
  name: string;
  preview: string;
  text: string;
  category?: 'heading' | 'preset';
  fontFamily: string;
  fontFallbacks?: string[];
  fontSize: number;
  fontSizeRatio?: number;
  minFontSize?: number;
  maxFontSize?: number;
  fontWeight: string | number;
  fontStyle?: 'normal' | 'italic';
  fill: string;
  textAlign: fabric.Textbox['textAlign'];
  charSpacing?: number;
  letterSpacingPx?: number;
  lineHeight?: number;
  stroke?: string;
  strokeWidth?: number;
  shadow?: fabric.IShadowOptions;
  gradient?: string[];
  highlightColor?: string;
  opacity?: number;
};

export const ROUNDED_BOLD_HIGHLIGHT_PRESET_ID = 'rounded-bold-highlight';

export const TEXT_PRESETS: TextPreset[] = [
  {
    id: ROUNDED_BOLD_HIGHLIGHT_PRESET_ID,
    name: 'Rounded Bold Highlight',
    preview: 'Rounded',
    text: 'Rounded Title',
    category: 'heading',
    fontFamily: 'Fredoka',
    fontFallbacks: ['Baloo 2', 'Nunito', 'M PLUS Rounded 1c', 'Arial Rounded MT Bold', 'sans-serif'],
    fontSize: 86,
    fontSizeRatio: 0.08,
    minFontSize: 36,
    maxFontSize: 110,
    fontWeight: 700,
    fill: '#F5F2E8',
    textAlign: 'center',
    letterSpacingPx: -1.5,
    lineHeight: 1,
    highlightColor: '#E3A83B',
  },
  { id: 'architecture-main-heading', name: 'Poster Main Heading', preview: 'AI SYSTEM', text: 'AI CHAT SYSTEM', fontFamily: 'Manrope, Inter, Arial, sans-serif', fontSize: 62, fontWeight: 800, fill: '#F1F3F5', textAlign: 'center', charSpacing: 75, lineHeight: 1 },
  { id: 'architecture-subtitle', name: 'Poster Subtitle', preview: 'FLOW', text: 'HOW THE REPLY TRAVELS', fontFamily: 'Manrope, Inter, Arial, sans-serif', fontSize: 27, fontWeight: 500, fill: '#858C98', textAlign: 'center', charSpacing: 110, lineHeight: 1 },
  { id: 'architecture-card-title', name: 'Card Title', preview: 'NODE', text: 'SYSTEM NODE', fontFamily: 'IBM Plex Sans, Inter, Arial, sans-serif', fontSize: 21, fontWeight: 700, fill: '#F1F3F5', textAlign: 'left', charSpacing: 30, lineHeight: 1 },
  { id: 'architecture-card-subtitle', name: 'Card Subtitle', preview: 'service', text: 'service / responsibility', fontFamily: 'IBM Plex Sans, Inter, Arial, sans-serif', fontSize: 15, fontWeight: 400, fill: '#858C98', textAlign: 'left', charSpacing: 0, lineHeight: 1.15 },
  { id: 'architecture-connector-label', name: 'Connector Label', preview: 'REQUEST', text: 'REQUEST', fontFamily: 'IBM Plex Mono, Space Mono, Menlo, monospace', fontSize: 11, fontWeight: 700, fill: '#43D68A', textAlign: 'center', charSpacing: 55, lineHeight: 1 },
  { id: 'editorial-hero', name: 'Editorial Hero', preview: 'Editorial', text: 'Editorial Hero', fontFamily: 'Playfair Display, Georgia, serif', fontSize: 104, fontWeight: 600, fill: '#F3F0E8', textAlign: 'center', charSpacing: 0, lineHeight: 0.98 },
  { id: 'gold-italic-emphasis', name: 'Gold Italic Emphasis', preview: 'Emphasis', text: 'Gold Italic Emphasis', fontFamily: 'Playfair Display, Georgia, serif', fontSize: 72, fontWeight: 500, fontStyle: 'italic', fill: '#C89A4B', textAlign: 'center', charSpacing: 0, lineHeight: 1 },
  { id: 'technical-eyebrow', name: 'Technical Eyebrow', preview: 'TECHNICAL', text: 'TECHNICAL EYEBROW', fontFamily: 'Space Mono, Menlo, monospace', fontSize: 20, fontWeight: 600, fill: '#858A85', textAlign: 'center', charSpacing: 240, lineHeight: 1 },
  { id: 'footer-caption', name: 'Footer Caption', preview: 'FOOTER', text: 'FOOTER CAPTION', fontFamily: 'Space Mono, Menlo, monospace', fontSize: 15, fontWeight: 500, fill: '#858A85', textAlign: 'center', charSpacing: 210, lineHeight: 1 },
  { id: 'modern-heading', name: 'Modern Heading', preview: 'Modern', text: 'Modern Heading', fontFamily: 'Outfit', fontSize: 72, fontWeight: 800, fill: '#ffffff', textAlign: 'center', charSpacing: 10, lineHeight: 1.05 },
  { id: 'bold-poster-title', name: 'Bold Poster Title', preview: 'POSTER', text: 'BOLD POSTER TITLE', fontFamily: 'Outfit', fontSize: 82, fontWeight: 900, fill: '#f8fafc', textAlign: 'center', charSpacing: 35, lineHeight: 0.95, stroke: '#111827', strokeWidth: 2 },
  { id: 'gradient-ai', name: 'Gradient AI', preview: 'AI', text: 'Gradient AI', fontFamily: 'Outfit', fontSize: 78, fontWeight: 900, fill: '#8b5cf6', textAlign: 'center', gradient: ['#8b5cf6', '#06b6d4'], shadow: { color: 'rgba(139,92,246,0.35)', blur: 18, offsetX: 0, offsetY: 8 } },
  { id: 'gold-luxury', name: 'Gold Luxury', preview: 'Luxury', text: 'Gold Luxury', fontFamily: 'Georgia', fontSize: 68, fontWeight: 700, fill: '#f59e0b', textAlign: 'center', gradient: ['#fef3c7', '#f59e0b', '#92400e'], charSpacing: 18 },
  { id: 'retro-outline', name: 'Retro Outline', preview: 'Retro', text: 'Retro Outline', fontFamily: 'Outfit', fontSize: 70, fontWeight: 900, fill: '#f97316', textAlign: 'center', stroke: '#111827', strokeWidth: 4, shadow: { color: '#facc15', blur: 0, offsetX: 6, offsetY: 6 } },
  { id: 'soft-shadow', name: 'Soft Shadow', preview: 'Soft', text: 'Soft Shadow', fontFamily: 'Inter', fontSize: 58, fontWeight: 700, fill: '#ffffff', textAlign: 'center', shadow: { color: 'rgba(0,0,0,0.35)', blur: 22, offsetX: 0, offsetY: 12 } },
  { id: 'corporate-heading', name: 'Corporate Heading', preview: 'Business', text: 'Corporate Heading', fontFamily: 'Inter', fontSize: 54, fontWeight: 800, fill: '#0f172a', textAlign: 'left', lineHeight: 1.15 },
  { id: 'sale-poster', name: 'Sale Poster', preview: 'SALE', text: 'SALE 50% OFF', fontFamily: 'Outfit', fontSize: 78, fontWeight: 900, fill: '#ef4444', textAlign: 'center', charSpacing: 20, stroke: '#ffffff', strokeWidth: 3 },
  { id: 'gold-highlight', name: 'Gold Highlight', preview: 'Gold', text: 'Gold Highlight', fontFamily: 'Playfair Display', fontSize: 62, fontWeight: 800, fill: '#fbbf24', textAlign: 'center', charSpacing: 8 },
  { id: 'technical-label', name: 'Technical Label', preview: 'Label', text: 'Technical Label', fontFamily: 'Courier New', fontSize: 28, fontWeight: 700, fill: '#67e8f9', textAlign: 'left', charSpacing: 40 },

  { id: 'technical-reel-hero-heading', name: 'Hero Heading', preview: 'LLM', text: 'LLM FUNDAMENTALS', fontFamily: 'Manrope, Inter, Arial, sans-serif', fontSize: 64, fontWeight: 900, fill: '#F5F8FA', textAlign: 'left', charSpacing: 120, lineHeight: 0.92 },
  { id: 'technical-reel-two-line-heading', name: 'Two-Line Hero Heading', preview: 'AI CORE', text: 'BACKEND\nCORE', fontFamily: 'Inter, Manrope, Arial, sans-serif', fontSize: 74, fontWeight: 900, fill: '#F5F8FA', textAlign: 'left', charSpacing: 90, lineHeight: 0.9 },
  { id: 'technical-reel-large-two-line-heading', name: 'Large Two-Line Heading', preview: 'BEFORE', text: 'BEFORE YOU\nTOUCH AI', fontFamily: 'Inter, Manrope, Arial, sans-serif', fontSize: 74, fontWeight: 900, fill: '#F5F8FA', textAlign: 'left', charSpacing: 80, lineHeight: 0.9 },
  { id: 'technical-reel-accent-highlight-heading', name: 'Accent Highlight Heading', preview: 'TOUCH AI', text: 'TOUCH AI', fontFamily: 'Inter, Manrope, Arial, sans-serif', fontSize: 76, fontWeight: 900, fill: '#FF6F61', textAlign: 'left', charSpacing: 90, lineHeight: 0.95 },
  { id: 'technical-reel-scene-number', name: 'Scene Number', preview: '01', text: '01', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 38, fontWeight: 800, fill: '#37E7B1', textAlign: 'center', charSpacing: 120, lineHeight: 1 },
  { id: 'technical-reel-section-number', name: 'Technical Section Number', preview: '01', text: '01', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 38, fontWeight: 800, fill: '#37E7B1', textAlign: 'center', charSpacing: 120, lineHeight: 1 },
  { id: 'technical-reel-section-number-short', name: 'Section Number', preview: '01', text: '01', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 42, fontWeight: 800, fill: '#37E7B1', textAlign: 'center', charSpacing: 80, lineHeight: 1 },
  { id: 'technical-reel-breadcrumb', name: 'Breadcrumb', preview: 'SYSTEM', text: 'SYSTEM CHECKLIST', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 15, fontWeight: 800, fill: '#30D5E8', textAlign: 'left', charSpacing: 180, lineHeight: 1 },
  { id: 'technical-reel-mono-subtitle', name: 'Mono Subtitle', preview: 'context layer', text: 'Prompt, context and token flow', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 18, fontWeight: 600, fill: '#7F8B93', textAlign: 'left', charSpacing: 45, lineHeight: 1.25 },
  { id: 'technical-reel-section-label', name: 'Section Label', preview: 'SECTION', text: 'SECTION LABEL', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 13, fontWeight: 800, fill: '#37E7B1', textAlign: 'left', charSpacing: 180, lineHeight: 1 },
  { id: 'technical-reel-card-label', name: 'Card Label', preview: 'CARD', text: 'BACKEND CORE', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 15, fontWeight: 800, fill: '#F5F8FA', textAlign: 'left', charSpacing: 90, lineHeight: 1 },
  { id: 'technical-reel-small-uppercase-label', name: 'Small Uppercase Label', preview: 'STATUS', text: 'SYSTEM STATUS', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 12, fontWeight: 800, fill: '#37E7B1', textAlign: 'left', charSpacing: 180, lineHeight: 1 },
  { id: 'technical-reel-small-label', name: 'Small Technical Label', preview: 'PROBABILITY', text: 'NEXT TOKEN PROBABILITY', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 12, fontWeight: 800, fill: '#7F8B93', textAlign: 'left', charSpacing: 160, lineHeight: 1 },
  { id: 'technical-reel-body', name: 'Body Text', preview: 'Body', text: 'Master the engineering foundation first.', fontFamily: 'Inter, Manrope, Arial, sans-serif', fontSize: 22, fontWeight: 600, fill: '#B9C5CC', textAlign: 'left', charSpacing: 10, lineHeight: 1.28 },
  { id: 'technical-reel-code-text', name: 'Code Text', preview: '$ run', text: '$ docker compose up', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 16, fontWeight: 600, fill: '#B5F7D6', textAlign: 'left', charSpacing: 10, lineHeight: 1.35 },
  { id: 'technical-reel-terminal-text', name: 'Terminal Text', preview: '$ deploy', text: '$ deploy --verify', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 16, fontWeight: 600, fill: '#B5F7D6', textAlign: 'left', charSpacing: 0, lineHeight: 1.35 },
  { id: 'technical-reel-accent-heading', name: 'Accent Heading', preview: 'AI', text: 'PRODUCTION MINDSET', fontFamily: 'Manrope, Inter, Arial, sans-serif', fontSize: 34, fontWeight: 900, fill: '#FF6F61', textAlign: 'left', charSpacing: 70, lineHeight: 1 },
  { id: 'technical-reel-footer-text', name: 'Footer Text', preview: 'FOOTER', text: 'ENGINEERING FOUNDATION FIRST.', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 22, fontWeight: 800, fill: '#F5F8FA', textAlign: 'center', charSpacing: 120, lineHeight: 1 },
  { id: 'technical-reel-footer-statement', name: 'Footer Statement', preview: 'FOUNDATION', text: 'ENGINEERING FOUNDATION FIRST.', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 24, fontWeight: 800, fill: '#F5F8FA', textAlign: 'center', charSpacing: 110, lineHeight: 1 },
  { id: 'technical-reel-tiny-metadata-text', name: 'Tiny Metadata Text', preview: 'meta', text: 'latency 120ms / tokens 512', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 11, fontWeight: 600, fill: '#7F8B93', textAlign: 'left', charSpacing: 35, lineHeight: 1.2 },
  { id: 'technical-reel-tag-chip-text', name: 'Tag Chip Text', preview: 'TAG', text: 'FASTAPI', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 13, fontWeight: 800, fill: '#30D5E8', textAlign: 'center', charSpacing: 100, lineHeight: 1 },
  { id: 'technical-reel-caption', name: 'Caption', preview: 'caption', text: 'small technical annotation', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 13, fontWeight: 600, fill: '#7F8B93', textAlign: 'left', charSpacing: 40, lineHeight: 1.2 },
  { id: 'technical-reel-footer-caption', name: 'Footer Caption', preview: 'FOOTER', text: 'ENGINEERING FOUNDATION FIRST.', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 22, fontWeight: 800, fill: '#F5F8FA', textAlign: 'center', charSpacing: 120, lineHeight: 1 },

  { id: 'prompt-harness-main-heading', name: 'Technical Main Heading', preview: 'PROMPT', text: 'PROMPT / CONTEXT / HARNESS', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 48, fontWeight: 800, fill: '#F4F7F5', textAlign: 'center', charSpacing: 105, lineHeight: 1, opacity: 1 },
  { id: 'prompt-harness-wide-tracking', name: 'Wide Tracking Heading', preview: 'HARNESS', text: 'HARNESS ENGINEERING', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 26, fontWeight: 800, fill: '#F4F7F5', textAlign: 'left', charSpacing: 120, lineHeight: 1.05, opacity: 1 },
  { id: 'prompt-harness-small-label', name: 'Small Technical Label', preview: 'SECTION', text: 'SECTION 01', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 12, fontWeight: 800, fill: '#38F08C', textAlign: 'left', charSpacing: 160, lineHeight: 1, opacity: 1 },
  { id: 'prompt-harness-diagram-text', name: 'Diagram Text', preview: 'NODE', text: 'PROCESS NODE', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 15, fontWeight: 800, fill: '#F4F7F5', textAlign: 'center', charSpacing: 90, lineHeight: 1.1, opacity: 1 },
  { id: 'prompt-harness-body-caption', name: 'Body Caption', preview: 'caption', text: 'small technical annotation', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 12, fontWeight: 500, fill: '#8D9A96', textAlign: 'left', charSpacing: 40, lineHeight: 1.25, opacity: 0.9 },
  { id: 'prompt-harness-footer-heading', name: 'Footer Heading', preview: 'SOFTWARE', text: 'SOFTWARE HARNESS > ONE PERFECT PROMPT', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 25, fontWeight: 800, fill: '#F4F7F5', textAlign: 'center', charSpacing: 120, lineHeight: 1, opacity: 1 },
  { id: 'technical-hero-title', name: 'Technical Hero Title', preview: 'SYSTEM', text: 'SYSTEM WORKFLOW', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 64, fontWeight: 800, fill: '#F4F7F5', textAlign: 'left', charSpacing: 180, lineHeight: 0.95, opacity: 1 },
  { id: 'technical-wide-title', name: 'Wide Letter Spacing Heading', preview: 'TECH MAP', text: 'TECHNICAL MAP', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 34, fontWeight: 800, fill: '#F4F7F5', textAlign: 'left', charSpacing: 260, lineHeight: 1, opacity: 1 },
  { id: 'technical-section-number', name: 'Section Number', preview: '01', text: '01', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 44, fontWeight: 800, fill: '#38F08C', textAlign: 'center', charSpacing: 40, lineHeight: 1, opacity: 1 },
  { id: 'technical-section-heading', name: 'Section Heading', preview: 'SECTION', text: 'SECTION HEADING', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 24, fontWeight: 800, fill: '#F4F7F5', textAlign: 'left', charSpacing: 140, lineHeight: 1.05, opacity: 1 },
  { id: 'technical-mono-subtitle', name: 'Mono Subtitle', preview: 'input layer', text: 'Input orchestration layer', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 20, fontWeight: 500, fill: '#8D9A96', textAlign: 'left', charSpacing: 20, lineHeight: 1.2, opacity: 1 },
  { id: 'technical-body', name: 'Technical Body', preview: 'Body', text: 'Readable technical explanation for a dark infographic card.', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 18, fontWeight: 400, fill: '#DDE7E2', textAlign: 'left', charSpacing: 0, lineHeight: 1.32, opacity: 0.92 },
  { id: 'technical-small-label', name: 'Technical Label', preview: 'LABEL', text: 'STATUS LABEL', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 12, fontWeight: 800, fill: '#8D9A96', textAlign: 'left', charSpacing: 220, lineHeight: 1, opacity: 1 },
  { id: 'technical-accent-text', name: 'Accent Text', preview: 'ACTIVE', text: 'ACTIVE SIGNAL', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 16, fontWeight: 800, fill: '#38F08C', textAlign: 'left', charSpacing: 120, lineHeight: 1, opacity: 1 },
  { id: 'technical-caption', name: 'Caption', preview: 'note 001', text: 'system note 001', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 13, fontWeight: 500, fill: '#75827E', textAlign: 'left', charSpacing: 20, lineHeight: 1.15, opacity: 0.86 },
  { id: 'technical-code-terminal', name: 'Code/Terminal Text', preview: '$ run', text: '$ run workflow --trace', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 16, fontWeight: 500, fill: '#B8F7D0', textAlign: 'left', charSpacing: 10, lineHeight: 1.35, opacity: 1 },
  { id: 'technical-diagram-node', name: 'Diagram Text', preview: 'NODE', text: 'PROCESS NODE', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 15, fontWeight: 800, fill: '#F4F7F5', textAlign: 'center', charSpacing: 100, lineHeight: 1.1, opacity: 1 },
  { id: 'technical-status-label', name: 'Status Label', preview: 'ONLINE', text: 'ONLINE', fontFamily: 'Space Mono, IBM Plex Mono, Menlo, monospace', fontSize: 12, fontWeight: 800, fill: '#38F08C', textAlign: 'center', charSpacing: 160, lineHeight: 1, opacity: 1 },
];
