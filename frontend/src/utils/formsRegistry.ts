/**
 * Centralized Forms Registry — editable form templates for the canvas editor.
 * Each template creates a Fabric.js group with editable child elements.
 */
import { fabric } from 'fabric';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FormCategory = 'business' | 'education' | 'events' | 'feedback' | 'other';

export interface FormTemplate {
  id: string;
  name: string;
  category: FormCategory;
  tags: string[];
  defaultWidth: number;
  defaultHeight: number;
  /** Returns SVG markup for sidebar thumbnail */
  thumbnail: () => string;
  /** Creates a Fabric.js group for canvas insertion */
  create: (opts?: FormCreateOptions) => fabric.Group;
}

export interface FormCreateOptions {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BG = '#ffffff';
const BORDER = '#e5e7eb';
const TEXT = '#1f2937';
const MUTED = '#6b7280';
const ACCENT = '#3b82f6';
const LABEL = '#374151';

function svg(inner: string, w = 200, h = 260): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%">${inner}</svg>`;
}

function makeInput(y: number, label: string, placeholder = 'Enter text', w = 160): fabric.Object[] {
  const lbl = new fabric.Text(label, { fontSize: 11, fill: LABEL, fontFamily: 'sans-serif', left: 20, top: y, fontWeight: '600' });
  const bg = new fabric.Rect({ width: w, height: 32, rx: 6, ry: 6, fill: '#f9fafb', stroke: BORDER, strokeWidth: 1, left: 20, top: y + 18 });
  const txt = new fabric.Text(placeholder, { fontSize: 10, fill: '#9ca3af', fontFamily: 'sans-serif', left: 28, top: y + 26 });
  return [lbl, bg, txt];
}

function makeTextarea(y: number, label: string, h = 60): fabric.Object[] {
  const lbl = new fabric.Text(label, { fontSize: 11, fill: LABEL, fontFamily: 'sans-serif', left: 20, top: y, fontWeight: '600' });
  const bg = new fabric.Rect({ width: 160, height: h, rx: 6, ry: 6, fill: '#f9fafb', stroke: BORDER, strokeWidth: 1, left: 20, top: y + 18 });
  const txt = new fabric.Text('Enter your message...', { fontSize: 10, fill: '#9ca3af', fontFamily: 'sans-serif', left: 28, top: y + 26 });
  return [lbl, bg, txt];
}

function makeCheckbox(y: number, label: string): fabric.Object[] {
  const box = new fabric.Rect({ width: 14, height: 14, rx: 3, ry: 3, fill: 'transparent', stroke: BORDER, strokeWidth: 1.5, left: 20, top: y });
  const txt = new fabric.Text(label, { fontSize: 10, fill: TEXT, fontFamily: 'sans-serif', left: 40, top: y + 1 });
  return [box, txt];
}

function makeButton(y: number, text: string, color = ACCENT): fabric.Object[] {
  const bg = new fabric.Rect({ width: 160, height: 34, rx: 8, ry: 8, fill: color, left: 20, top: y });
  const txt = new fabric.Text(text, { fontSize: 12, fill: '#ffffff', fontFamily: 'sans-serif', fontWeight: '600', left: 80, top: y + 9, originX: 'center' });
  return [bg, txt];
}

function makeRating(y: number, label: string): fabric.Object[] {
  const lbl = new fabric.Text(label, { fontSize: 11, fill: LABEL, fontFamily: 'sans-serif', left: 20, top: y, fontWeight: '600' });
  const stars: fabric.Object[] = [];
  for (let i = 0; i < 5; i++) {
    stars.push(new fabric.Text('★', { fontSize: 18, fill: i < 3 ? '#f59e0b' : '#d1d5db', left: 20 + i * 24, top: y + 20 }));
  }
  return [lbl, ...stars];
}

function makeRadioGroup(y: number, label: string, options: string[]): fabric.Object[] {
  const objs: fabric.Object[] = [new fabric.Text(label, { fontSize: 11, fill: LABEL, fontFamily: 'sans-serif', left: 20, top: y, fontWeight: '600' })];
  options.forEach((opt, i) => {
    const cy = y + 20 + i * 22;
    objs.push(new fabric.Circle({ radius: 6, fill: 'transparent', stroke: BORDER, strokeWidth: 1.5, left: 22, top: cy }));
    objs.push(new fabric.Text(opt, { fontSize: 10, fill: TEXT, fontFamily: 'sans-serif', left: 36, top: cy - 4 }));
  });
  return objs;
}

// ─── Forms Registry ───────────────────────────────────────────────────────────

export const FORMS_REGISTRY: FormTemplate[] = [

  // ═══════════════════════ BUSINESS FORMS ═════════════════════════════════════

  {
    id: 'biz-newsletter-simple', name: 'Simple Newsletter', category: 'business', tags: ['newsletter', 'email', 'subscribe', 'simple'],
    defaultWidth: 200, defaultHeight: 200,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#f8fafc" stroke="#e5e7eb" stroke-width="1.5"/>
      <text x="100" y="35" text-anchor="middle" font-size="14" font-weight="bold" fill="#1f2937" font-family="sans-serif">Subscribe</text>
      <text x="100" y="52" text-anchor="middle" font-size="8" fill="#6b7280" font-family="sans-serif">Get updates</text>
      <rect x="20" y="65" width="160" height="28" rx="6" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <text x="28" y="83" font-size="8" fill="#9ca3af" font-family="sans-serif">Email address</text>
      <rect x="20" y="102" width="160" height="30" rx="8" fill="#3b82f6"/>
      <text x="100" y="121" text-anchor="middle" font-size="9" fill="white" font-weight="600" font-family="sans-serif">Subscribe</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 200, rx: 12, ry: 12, fill: BG, stroke: BORDER, strokeWidth: 1.5 });
      const title = new fabric.Text('Subscribe to Our Newsletter', { fontSize: 16, fontWeight: 'bold', fill: TEXT, fontFamily: 'sans-serif', left: 20, top: 20, width: 160 });
      const subtitle = new fabric.Text('Stay updated with our latest news', { fontSize: 11, fill: MUTED, fontFamily: 'sans-serif', left: 20, top: 48 });
      const fields = [...makeInput(70, 'Email Address', 'you@example.com'), ...makeButton(145, 'Subscribe')];
      return new fabric.Group([bg, title, subtitle, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'biz-newsletter-consent', name: 'Newsletter with Consent', category: 'business', tags: ['newsletter', 'consent', 'gdpr', 'privacy'],
    defaultWidth: 200, defaultHeight: 260,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#f8fafc" stroke="#e5e7eb" stroke-width="1.5"/>
      <text x="100" y="30" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f2937" font-family="sans-serif">Newsletter</text>
      <rect x="20" y="42" width="160" height="24" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <text x="28" y="58" font-size="7" fill="#9ca3af" font-family="sans-serif">Name</text>
      <rect x="20" y="74" width="160" height="24" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <text x="28" y="90" font-size="7" fill="#9ca3af" font-family="sans-serif">Email</text>
      <rect x="20" y="108" width="10" height="10" rx="2" fill="none" stroke="#d1d5db" stroke-width="1"/>
      <text x="36" y="117" font-size="7" fill="#6b7280" font-family="sans-serif">I agree to receive emails</text>
      <rect x="20" y="130" width="160" height="28" rx="8" fill="#3b82f6"/>
      <text x="100" y="148" text-anchor="middle" font-size="9" fill="white" font-weight="600" font-family="sans-serif">Subscribe</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 240, rx: 12, ry: 12, fill: BG, stroke: BORDER, strokeWidth: 1.5 });
      const title = new fabric.Text('Newsletter Signup', { fontSize: 15, fontWeight: 'bold', fill: TEXT, fontFamily: 'sans-serif', left: 20, top: 18 });
      const fields = [...makeInput(45, 'Full Name', 'John Doe'), ...makeInput(85, 'Email', 'you@example.com'), ...makeCheckbox(125, 'I agree to receive marketing emails'), ...makeButton(165, 'Subscribe')];
      return new fabric.Group([bg, title, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'biz-contact-basic', name: 'Contact Form', category: 'business', tags: ['contact', 'inquiry', 'message', 'basic'],
    defaultWidth: 200, defaultHeight: 280,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#f8fafc" stroke="#e5e7eb" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f2937" font-family="sans-serif">Contact Us</text>
      <rect x="20" y="38" width="75" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="105" y="38" width="75" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="68" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="98" width="160" height="50" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="158" width="160" height="26" rx="8" fill="#3b82f6"/>
      <text x="100" y="175" text-anchor="middle" font-size="9" fill="white" font-weight="600" font-family="sans-serif">Send Message</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 280, rx: 12, ry: 12, fill: BG, stroke: BORDER, strokeWidth: 1.5 });
      const title = new fabric.Text('Contact Us', { fontSize: 16, fontWeight: 'bold', fill: TEXT, fontFamily: 'sans-serif', left: 20, top: 18 });
      const nameField = makeInput(45, 'Name', 'Your name');
      const emailField = makeInput(85, 'Email', 'you@example.com');
      const msgField = makeTextarea(125, 'Message');
      const btn = makeButton(210, 'Send Message');
      return new fabric.Group([bg, title, ...nameField, ...emailField, ...msgField, ...btn], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'biz-contact-phone', name: 'Contact with Phone', category: 'business', tags: ['contact', 'phone', 'inquiry'],
    defaultWidth: 200, defaultHeight: 320,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#f8fafc" stroke="#e5e7eb" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f2937" font-family="sans-serif">Get in Touch</text>
      <rect x="20" y="38" width="160" height="20" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="66" width="160" height="20" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="94" width="160" height="20" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="122" width="160" height="40" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="172" width="160" height="26" rx="8" fill="#3b82f6"/>
      <text x="100" y="189" text-anchor="middle" font-size="9" fill="white" font-weight="600" font-family="sans-serif">Submit</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 260, rx: 12, ry: 12, fill: BG, stroke: BORDER, strokeWidth: 1.5 });
      const title = new fabric.Text('Get in Touch', { fontSize: 16, fontWeight: 'bold', fill: TEXT, fontFamily: 'sans-serif', left: 20, top: 18 });
      const fields = [...makeInput(45, 'Name', 'Full name'), ...makeInput(85, 'Email', 'email@example.com'), ...makeInput(125, 'Phone', '+1 (555) 000-0000'), ...makeTextarea(165, 'Message'), ...makeButton(250, 'Submit')];
      return new fabric.Group([bg, title, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'biz-lead-demo', name: 'Request a Demo', category: 'business', tags: ['lead', 'demo', 'sales', 'request'],
    defaultWidth: 200, defaultHeight: 300,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="11" font-weight="bold" fill="#1e40af" font-family="sans-serif">Request a Demo</text>
      <rect x="20" y="40" width="160" height="22" rx="5" fill="white" stroke="#bae6fd" stroke-width="1"/>
      <rect x="20" y="70" width="160" height="22" rx="5" fill="white" stroke="#bae6fd" stroke-width="1"/>
      <rect x="20" y="100" width="160" height="22" rx="5" fill="white" stroke="#bae6fd" stroke-width="1"/>
      <rect x="20" y="130" width="160" height="22" rx="5" fill="white" stroke="#bae6fd" stroke-width="1"/>
      <rect x="20" y="162" width="160" height="26" rx="8" fill="#3b82f6"/>
      <text x="100" y="179" text-anchor="middle" font-size="9" fill="white" font-weight="600" font-family="sans-serif">Book Demo</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 280, rx: 12, ry: 12, fill: '#f0f9ff', stroke: '#bae6fd', strokeWidth: 1.5 });
      const title = new fabric.Text('Request a Demo', { fontSize: 15, fontWeight: 'bold', fill: '#1e40af', fontFamily: 'sans-serif', left: 20, top: 18 });
      const fields = [...makeInput(45, 'Full Name', 'John Doe'), ...makeInput(85, 'Work Email', 'john@company.com'), ...makeInput(125, 'Company', 'Acme Inc'), ...makeInput(165, 'Phone', '+1 (555) 000-0000'), ...makeButton(210, 'Book a Demo')];
      return new fabric.Group([bg, title, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'biz-lead-quote', name: 'Get a Free Quote', category: 'business', tags: ['lead', 'quote', 'pricing', 'estimate'],
    defaultWidth: 200, defaultHeight: 300,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#f8fafc" stroke="#e5e7eb" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="11" font-weight="bold" fill="#1f2937" font-family="sans-serif">Get a Free Quote</text>
      <rect x="20" y="40" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="70" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="100" width="160" height="50" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="160" width="160" height="26" rx="8" fill="#10b981"/>
      <text x="100" y="177" text-anchor="middle" font-size="9" fill="white" font-weight="600" font-family="sans-serif">Get Quote</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 260, rx: 12, ry: 12, fill: BG, stroke: BORDER, strokeWidth: 1.5 });
      const title = new fabric.Text('Get a Free Quote', { fontSize: 15, fontWeight: 'bold', fill: TEXT, fontFamily: 'sans-serif', left: 20, top: 18 });
      const fields = [...makeInput(45, 'Name', 'Your name'), ...makeInput(85, 'Email', 'email@example.com'), ...makeTextarea(125, 'Describe your project'), ...makeButton(200, 'Get Quote', '#10b981')];
      return new fabric.Group([bg, title, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'biz-registration', name: 'Account Registration', category: 'business', tags: ['registration', 'signup', 'account', 'create'],
    defaultWidth: 200, defaultHeight: 320,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#f8fafc" stroke="#e5e7eb" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f2937" font-family="sans-serif">Create Account</text>
      <rect x="20" y="40" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="70" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="100" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="130" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="162" width="160" height="26" rx="8" fill="#8b5cf6"/>
      <text x="100" y="179" text-anchor="middle" font-size="9" fill="white" font-weight="600" font-family="sans-serif">Create Account</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 280, rx: 12, ry: 12, fill: BG, stroke: BORDER, strokeWidth: 1.5 });
      const title = new fabric.Text('Create Account', { fontSize: 16, fontWeight: 'bold', fill: TEXT, fontFamily: 'sans-serif', left: 20, top: 18 });
      const fields = [...makeInput(45, 'Full Name', 'John Doe'), ...makeInput(85, 'Email', 'you@example.com'), ...makeInput(125, 'Password', '••••••••'), ...makeInput(165, 'Confirm Password', '••••••••'), ...makeButton(210, 'Create Account', '#8b5cf6')];
      return new fabric.Group([bg, title, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'biz-booking', name: 'Appointment Booking', category: 'business', tags: ['booking', 'appointment', 'schedule', 'calendar'],
    defaultWidth: 200, defaultHeight: 300,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#f8fafc" stroke="#e5e7eb" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="11" font-weight="bold" fill="#1f2937" font-family="sans-serif">Book Appointment</text>
      <rect x="20" y="40" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="70" width="75" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="105" y="70" width="75" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="100" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="132" width="160" height="26" rx="8" fill="#f59e0b"/>
      <text x="100" y="149" text-anchor="middle" font-size="9" fill="white" font-weight="600" font-family="sans-serif">Book Now</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 240, rx: 12, ry: 12, fill: BG, stroke: BORDER, strokeWidth: 1.5 });
      const title = new fabric.Text('Book an Appointment', { fontSize: 14, fontWeight: 'bold', fill: TEXT, fontFamily: 'sans-serif', left: 20, top: 18 });
      const fields = [...makeInput(45, 'Your Name', 'Full name'), ...makeInput(85, 'Preferred Date', 'MM/DD/YYYY'), ...makeInput(125, 'Time Slot', 'Select time'), ...makeButton(170, 'Book Appointment', '#f59e0b')];
      return new fabric.Group([bg, title, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },

  // ═══════════════════════ EDUCATION FORMS ════════════════════════════════════

  {
    id: 'edu-quiz-multiple', name: 'Multiple Choice Quiz', category: 'education', tags: ['quiz', 'multiple', 'choice', 'test', 'question'],
    defaultWidth: 200, defaultHeight: 260,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#fefce8" stroke="#fde68a" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="11" font-weight="bold" fill="#854d0e" font-family="sans-serif">Quiz Question</text>
      <text x="20" y="50" font-size="9" fill="#713f12" font-family="sans-serif">What is 2 + 2?</text>
      <circle cx="28" cy="68" r="5" fill="none" stroke="#d1d5db" stroke-width="1"/><text x="40" y="71" font-size="8" fill="#374151" font-family="sans-serif">3</text>
      <circle cx="28" cy="88" r="5" fill="none" stroke="#d1d5db" stroke-width="1"/><text x="40" y="91" font-size="8" fill="#374151" font-family="sans-serif">4</text>
      <circle cx="28" cy="108" r="5" fill="none" stroke="#d1d5db" stroke-width="1"/><text x="40" y="111" font-size="8" fill="#374151" font-family="sans-serif">5</text>
      <circle cx="28" cy="128" r="5" fill="none" stroke="#d1d5db" stroke-width="1"/><text x="40" y="131" font-size="8" fill="#374151" font-family="sans-serif">6</text>
      <rect x="20" y="148" width="160" height="24" rx="8" fill="#3b82f6"/>
      <text x="100" y="164" text-anchor="middle" font-size="8" fill="white" font-weight="600" font-family="sans-serif">Submit Answer</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 260, rx: 12, ry: 12, fill: '#fefce8', stroke: '#fde68a', strokeWidth: 1.5 });
      const title = new fabric.Text('Quiz Question', { fontSize: 14, fontWeight: 'bold', fill: '#854d0e', fontFamily: 'sans-serif', left: 20, top: 18 });
      const question = new fabric.Text('What is 2 + 2?', { fontSize: 12, fill: '#713f12', fontFamily: 'sans-serif', left: 20, top: 45 });
      const fields = [...makeRadioGroup(65, 'Select your answer:', ['3', '4', '5', '6']), ...makeButton(170, 'Submit Answer')];
      return new fabric.Group([bg, title, question, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'edu-quiz-truefalse', name: 'True or False Quiz', category: 'education', tags: ['quiz', 'true', 'false', 'boolean'],
    defaultWidth: 200, defaultHeight: 200,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="190" rx="10" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="11" font-weight="bold" fill="#166534" font-family="sans-serif">True or False</text>
      <text x="20" y="52" font-size="9" fill="#15803d" font-family="sans-serif">The Earth orbits the Sun.</text>
      <circle cx="28" cy="72" r="6" fill="none" stroke="#d1d5db" stroke-width="1.5"/><text x="42" y="75" font-size="9" fill="#374151" font-family="sans-serif">True</text>
      <circle cx="28" cy="95" r="6" fill="none" stroke="#d1d5db" stroke-width="1.5"/><text x="42" y="98" font-size="9" fill="#374151" font-family="sans-serif">False</text>
      <rect x="20" y="118" width="160" height="24" rx="8" fill="#22c55e"/>
      <text x="100" y="134" text-anchor="middle" font-size="8" fill="white" font-weight="600" font-family="sans-serif">Submit</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 180, rx: 12, ry: 12, fill: '#f0fdf4', stroke: '#bbf7d0', strokeWidth: 1.5 });
      const title = new fabric.Text('True or False', { fontSize: 14, fontWeight: 'bold', fill: '#166534', fontFamily: 'sans-serif', left: 20, top: 18 });
      const question = new fabric.Text('The Earth orbits the Sun.', { fontSize: 12, fill: '#15803d', fontFamily: 'sans-serif', left: 20, top: 45 });
      const fields = [...makeRadioGroup(65, '', ['True', 'False']), ...makeButton(130, 'Submit', '#22c55e')];
      return new fabric.Group([bg, title, question, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'edu-assessment', name: 'Student Assessment', category: 'education', tags: ['assessment', 'student', 'evaluation', 'grade'],
    defaultWidth: 200, defaultHeight: 300,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#f8fafc" stroke="#e5e7eb" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="11" font-weight="bold" fill="#1f2937" font-family="sans-serif">Student Assessment</text>
      <rect x="20" y="40" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="70" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <text x="20" y="108" font-size="9" fill="#374151" font-weight="600" font-family="sans-serif">Rate understanding:</text>
      <text x="22" y="125" font-size="14" fill="#f59e0b" font-family="sans-serif">★★★☆☆</text>
      <rect x="20" y="140" width="160" height="40" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="190" width="160" height="24" rx="8" fill="#3b82f6"/>
      <text x="100" y="206" text-anchor="middle" font-size="8" fill="white" font-weight="600" font-family="sans-serif">Submit Assessment</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 300, rx: 12, ry: 12, fill: BG, stroke: BORDER, strokeWidth: 1.5 });
      const title = new fabric.Text('Student Assessment', { fontSize: 14, fontWeight: 'bold', fill: TEXT, fontFamily: 'sans-serif', left: 20, top: 18 });
      const fields = [...makeInput(45, 'Student Name', 'Full name'), ...makeInput(85, 'Course', 'Course name'), ...makeRating(125, 'Rate your understanding:'), ...makeTextarea(170, 'Additional Comments'), ...makeButton(250, 'Submit Assessment')];
      return new fabric.Group([bg, title, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'edu-course-eval', name: 'Course Evaluation', category: 'education', tags: ['course', 'evaluation', 'feedback', 'rating'],
    defaultWidth: 200, defaultHeight: 280,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#faf5ff" stroke="#e9d5ff" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="11" font-weight="bold" fill="#6b21a8" font-family="sans-serif">Course Evaluation</text>
      <rect x="20" y="40" width="160" height="22" rx="5" fill="white" stroke="#e9d5ff" stroke-width="1"/>
      <text x="20" y="78" font-size="9" fill="#6b21a8" font-weight="600" font-family="sans-serif">Content quality:</text>
      <text x="22" y="95" font-size="14" fill="#f59e0b" font-family="sans-serif">★★★★☆</text>
      <text x="20" y="118" font-size="9" fill="#6b21a8" font-weight="600" font-family="sans-serif">Instructor:</text>
      <text x="22" y="135" font-size="14" fill="#f59e0b" font-family="sans-serif">★★★★★</text>
      <rect x="20" y="148" width="160" height="40" rx="5" fill="white" stroke="#e9d5ff" stroke-width="1"/>
      <rect x="20" y="198" width="160" height="24" rx="8" fill="#8b5cf6"/>
      <text x="100" y="214" text-anchor="middle" font-size="8" fill="white" font-weight="600" font-family="sans-serif">Submit Evaluation</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 280, rx: 12, ry: 12, fill: '#faf5ff', stroke: '#e9d5ff', strokeWidth: 1.5 });
      const title = new fabric.Text('Course Evaluation', { fontSize: 14, fontWeight: 'bold', fill: '#6b21a8', fontFamily: 'sans-serif', left: 20, top: 18 });
      const fields = [...makeInput(45, 'Course Name', 'Course title'), ...makeRating(85, 'Content quality:'), ...makeRating(120, 'Instructor rating:'), ...makeTextarea(160, 'Comments'), ...makeButton(230, 'Submit', '#8b5cf6')];
      return new fabric.Group([bg, title, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },

  // ═══════════════════════ EVENTS FORMS ═══════════════════════════════════════

  {
    id: 'event-rsvp', name: 'Simple RSVP', category: 'events', tags: ['rsvp', 'event', 'attend', 'yes', 'no'],
    defaultWidth: 200, defaultHeight: 240,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#fff7ed" stroke="#fed7aa" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="12" font-weight="bold" fill="#9a3412" font-family="sans-serif">RSVP</text>
      <rect x="20" y="40" width="160" height="22" rx="5" fill="white" stroke="#fed7aa" stroke-width="1"/>
      <rect x="20" y="70" width="160" height="22" rx="5" fill="white" stroke="#fed7aa" stroke-width="1"/>
      <text x="20" y="108" font-size="9" fill="#9a3412" font-weight="600" font-family="sans-serif">Will you attend?</text>
      <rect x="20" y="115" width="75" height="22" rx="8" fill="#22c55e"/>
      <text x="57" y="130" text-anchor="middle" font-size="9" fill="white" font-weight="600" font-family="sans-serif">Yes</text>
      <rect x="105" y="115" width="75" height="22" rx="8" fill="#ef4444"/>
      <text x="142" y="130" text-anchor="middle" font-size="9" fill="white" font-weight="600" font-family="sans-serif">No</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 220, rx: 12, ry: 12, fill: '#fff7ed', stroke: '#fed7aa', strokeWidth: 1.5 });
      const title = new fabric.Text('RSVP', { fontSize: 16, fontWeight: 'bold', fill: '#9a3412', fontFamily: 'sans-serif', left: 20, top: 18 });
      const fields = [...makeInput(45, 'Your Name', 'Full name'), ...makeInput(85, 'Email', 'email@example.com')];
      const label = new fabric.Text('Will you attend?', { fontSize: 11, fill: '#9a3412', fontFamily: 'sans-serif', fontWeight: '600', left: 20, top: 120 });
      const yesBtn = new fabric.Rect({ width: 75, height: 30, rx: 8, ry: 8, fill: '#22c55e', left: 20, top: 138 });
      const yesTxt = new fabric.Text('Yes', { fontSize: 12, fill: '#ffffff', fontWeight: '600', fontFamily: 'sans-serif', left: 57, top: 146, originX: 'center' });
      const noBtn = new fabric.Rect({ width: 75, height: 30, rx: 8, ry: 8, fill: '#ef4444', left: 105, top: 138 });
      const noTxt = new fabric.Text('No', { fontSize: 12, fill: '#ffffff', fontWeight: '600', fontFamily: 'sans-serif', left: 142, top: 146, originX: 'center' });
      return new fabric.Group([bg, title, ...fields, label, yesBtn, yesTxt, noBtn, noTxt], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'event-registration', name: 'Event Registration', category: 'events', tags: ['event', 'registration', 'attendee', 'ticket'],
    defaultWidth: 200, defaultHeight: 320,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#f8fafc" stroke="#e5e7eb" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="11" font-weight="bold" fill="#1f2937" font-family="sans-serif">Event Registration</text>
      <rect x="20" y="40" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="70" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="100" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="130" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="162" width="160" height="24" rx="8" fill="#3b82f6"/>
      <text x="100" y="178" text-anchor="middle" font-size="8" fill="white" font-weight="600" font-family="sans-serif">Register Now</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 280, rx: 12, ry: 12, fill: BG, stroke: BORDER, strokeWidth: 1.5 });
      const title = new fabric.Text('Event Registration', { fontSize: 14, fontWeight: 'bold', fill: TEXT, fontFamily: 'sans-serif', left: 20, top: 18 });
      const fields = [...makeInput(45, 'Full Name', 'John Doe'), ...makeInput(85, 'Email', 'email@example.com'), ...makeInput(125, 'Phone', '+1 (555) 000-0000'), ...makeInput(165, 'Ticket Type', 'General'), ...makeButton(210, 'Register Now')];
      return new fabric.Group([bg, title, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'event-feedback', name: 'Event Feedback', category: 'events', tags: ['event', 'feedback', 'survey', 'rating'],
    defaultWidth: 200, defaultHeight: 280,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="11" font-weight="bold" fill="#1e40af" font-family="sans-serif">Event Feedback</text>
      <text x="20" y="50" font-size="9" fill="#1e40af" font-weight="600" font-family="sans-serif">Overall experience:</text>
      <text x="22" y="68" font-size="14" fill="#f59e0b" font-family="sans-serif">★★★★★</text>
      <text x="20" y="90" font-size="9" fill="#1e40af" font-weight="600" font-family="sans-serif">Speaker quality:</text>
      <text x="22" y="108" font-size="14" fill="#f59e0b" font-family="sans-serif">★★★★☆</text>
      <rect x="20" y="120" width="160" height="40" rx="5" fill="white" stroke="#bae6fd" stroke-width="1"/>
      <rect x="20" y="170" width="160" height="24" rx="8" fill="#3b82f6"/>
      <text x="100" y="186" text-anchor="middle" font-size="8" fill="white" font-weight="600" font-family="sans-serif">Submit Feedback</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 260, rx: 12, ry: 12, fill: '#f0f9ff', stroke: '#bae6fd', strokeWidth: 1.5 });
      const title = new fabric.Text('Event Feedback', { fontSize: 14, fontWeight: 'bold', fill: '#1e40af', fontFamily: 'sans-serif', left: 20, top: 18 });
      const fields = [...makeRating(45, 'Overall experience:'), ...makeRating(80, 'Speaker quality:'), ...makeTextarea(120, 'Comments'), ...makeButton(200, 'Submit Feedback')];
      return new fabric.Group([bg, title, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },

  // ═══════════════════════ FEEDBACK FORMS ═════════════════════════════════════

  {
    id: 'feedback-star', name: 'Star Rating', category: 'feedback', tags: ['rating', 'star', 'review', 'feedback'],
    defaultWidth: 200, defaultHeight: 200,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="190" rx="10" fill="#fefce8" stroke="#fde68a" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="12" font-weight="bold" fill="#854d0e" font-family="sans-serif">Rate Us</text>
      <text x="100" y="60" text-anchor="middle" font-size="24" fill="#f59e0b" font-family="sans-serif">★★★★☆</text>
      <rect x="20" y="75" width="160" height="35" rx="5" fill="white" stroke="#fde68a" stroke-width="1"/>
      <rect x="20" y="120" width="160" height="24" rx="8" fill="#f59e0b"/>
      <text x="100" y="136" text-anchor="middle" font-size="8" fill="white" font-weight="600" font-family="sans-serif">Submit Rating</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 200, rx: 12, ry: 12, fill: '#fefce8', stroke: '#fde68a', strokeWidth: 1.5 });
      const title = new fabric.Text('Rate Your Experience', { fontSize: 14, fontWeight: 'bold', fill: '#854d0e', fontFamily: 'sans-serif', left: 20, top: 18 });
      const fields = [...makeRating(50, 'How would you rate us?'), ...makeTextarea(95, 'Tell us more'), ...makeButton(155, 'Submit Rating', '#f59e0b')];
      return new fabric.Group([bg, title, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'feedback-nps', name: 'NPS Survey', category: 'feedback', tags: ['nps', 'survey', 'recommend', 'score'],
    defaultWidth: 200, defaultHeight: 240,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#f8fafc" stroke="#e5e7eb" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="11" font-weight="bold" fill="#1f2937" font-family="sans-serif">NPS Survey</text>
      <text x="100" y="50" text-anchor="middle" font-size="9" fill="#6b7280" font-family="sans-serif">How likely are you to recommend us?</text>
      <text x="22" y="75" font-size="8" fill="#ef4444" font-family="sans-serif">0</text>
      <text x="88" y="75" font-size="8" fill="#f59e0b" font-family="sans-serif">5</text>
      <text x="162" y="75" font-size="8" fill="#22c55e" font-family="sans-serif">10</text>
      <rect x="20" y="82" width="15" height="15" rx="3" fill="#fee2e2" stroke="#fca5a5" stroke-width="1"/>
      <rect x="40" y="82" width="15" height="15" rx="3" fill="#fef3c7" stroke="#fcd34d" stroke-width="1"/>
      <rect x="60" y="82" width="15" height="15" rx="3" fill="#d1fae5" stroke="#6ee7b7" stroke-width="1"/>
      <rect x="20" y="110" width="160" height="24" rx="8" fill="#3b82f6"/>
      <text x="100" y="126" text-anchor="middle" font-size="8" fill="white" font-weight="600" font-family="sans-serif">Submit</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 220, rx: 12, ry: 12, fill: BG, stroke: BORDER, strokeWidth: 1.5 });
      const title = new fabric.Text('Net Promoter Score', { fontSize: 13, fontWeight: 'bold', fill: TEXT, fontFamily: 'sans-serif', left: 20, top: 18 });
      const q = new fabric.Text('How likely are you to recommend us?', { fontSize: 10, fill: MUTED, fontFamily: 'sans-serif', left: 20, top: 42 });
      const nums: fabric.Object[] = [];
      for (let i = 0; i <= 10; i++) {
        const x = 20 + (i % 11) * 15;
        const y = 60 + Math.floor(i / 11) * 22;
        nums.push(new fabric.Rect({ width: 14, height: 14, rx: 3, ry: 3, fill: i < 4 ? '#fee2e2' : i < 7 ? '#fef3c7' : '#d1fae5', stroke: '#d1d5db', strokeWidth: 1, left: x, top: y }));
        nums.push(new fabric.Text(String(i), { fontSize: 8, fill: TEXT, fontFamily: 'sans-serif', left: x + 5, top: y + 2 }));
      }
      const fields = [...makeButton(130, 'Submit')];
      return new fabric.Group([bg, title, q, ...nums, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'feedback-customer', name: 'Customer Feedback', category: 'feedback', tags: ['customer', 'feedback', 'experience', 'satisfaction'],
    defaultWidth: 200, defaultHeight: 280,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#f8fafc" stroke="#e5e7eb" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="11" font-weight="bold" fill="#1f2937" font-family="sans-serif">Customer Feedback</text>
      <rect x="20" y="40" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <text x="20" y="78" font-size="9" fill="#374151" font-weight="600" font-family="sans-serif">Satisfaction:</text>
      <text x="22" y="95" font-size="14" fill="#f59e0b" font-family="sans-serif">★★★★☆</text>
      <rect x="20" y="108" width="160" height="40" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="158" width="160" height="24" rx="8" fill="#3b82f6"/>
      <text x="100" y="174" text-anchor="middle" font-size="8" fill="white" font-weight="600" font-family="sans-serif">Submit Feedback</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 260, rx: 12, ry: 12, fill: BG, stroke: BORDER, strokeWidth: 1.5 });
      const title = new fabric.Text('Customer Feedback', { fontSize: 14, fontWeight: 'bold', fill: TEXT, fontFamily: 'sans-serif', left: 20, top: 18 });
      const fields = [...makeInput(45, 'Your Name', 'Full name'), ...makeRating(85, 'Satisfaction:'), ...makeTextarea(130, 'Your feedback'), ...makeButton(200, 'Submit Feedback')];
      return new fabric.Group([bg, title, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'feedback-survey', name: 'Quick Survey', category: 'feedback', tags: ['survey', 'quick', 'poll', 'opinion'],
    defaultWidth: 200, defaultHeight: 280,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#f8fafc" stroke="#e5e7eb" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="11" font-weight="bold" fill="#1f2937" font-family="sans-serif">Quick Survey</text>
      <text x="20" y="50" font-size="9" fill="#374151" font-weight="600" font-family="sans-serif">How did you find us?</text>
      <rect x="20" y="58" width="10" height="10" rx="2" fill="none" stroke="#d1d5db" stroke-width="1"/><text x="36" y="67" font-size="8" fill="#374151" font-family="sans-serif">Search engine</text>
      <rect x="20" y="75" width="10" height="10" rx="2" fill="none" stroke="#d1d5db" stroke-width="1"/><text x="36" y="84" font-size="8" fill="#374151" font-family="sans-serif">Social media</text>
      <rect x="20" y="92" width="10" height="10" rx="2" fill="none" stroke="#d1d5db" stroke-width="1"/><text x="36" y="101" font-size="8" fill="#374151" font-family="sans-serif">Friend referral</text>
      <rect x="20" y="115" width="160" height="24" rx="8" fill="#3b82f6"/>
      <text x="100" y="131" text-anchor="middle" font-size="8" fill="white" font-weight="600" font-family="sans-serif">Submit</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 240, rx: 12, ry: 12, fill: BG, stroke: BORDER, strokeWidth: 1.5 });
      const title = new fabric.Text('Quick Survey', { fontSize: 14, fontWeight: 'bold', fill: TEXT, fontFamily: 'sans-serif', left: 20, top: 18 });
      const fields = [...makeRadioGroup(45, 'How did you find us?', ['Search engine', 'Social media', 'Friend referral', 'Other']), ...makeButton(160, 'Submit')];
      return new fabric.Group([bg, title, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },

  // ═══════════════════════ OTHER FORMS ════════════════════════════════════════

  {
    id: 'other-application', name: 'Application Form', category: 'other', tags: ['application', 'apply', 'job', 'position'],
    defaultWidth: 200, defaultHeight: 320,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#f8fafc" stroke="#e5e7eb" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="11" font-weight="bold" fill="#1f2937" font-family="sans-serif">Application Form</text>
      <rect x="20" y="40" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="70" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="100" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="130" width="160" height="35" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="175" width="160" height="24" rx="8" fill="#3b82f6"/>
      <text x="100" y="191" text-anchor="middle" font-size="8" fill="white" font-weight="600" font-family="sans-serif">Submit Application</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 300, rx: 12, ry: 12, fill: BG, stroke: BORDER, strokeWidth: 1.5 });
      const title = new fabric.Text('Application Form', { fontSize: 14, fontWeight: 'bold', fill: TEXT, fontFamily: 'sans-serif', left: 20, top: 18 });
      const fields = [...makeInput(45, 'Full Name', 'John Doe'), ...makeInput(85, 'Email', 'email@example.com'), ...makeInput(125, 'Position', 'Job title'), ...makeTextarea(170, 'Tell us about yourself'), ...makeButton(240, 'Submit Application')];
      return new fabric.Group([bg, title, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'other-poll', name: 'Simple Poll', category: 'other', tags: ['poll', 'vote', 'question', 'opinion'],
    defaultWidth: 200, defaultHeight: 200,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="190" rx="10" fill="#f8fafc" stroke="#e5e7eb" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f2937" font-family="sans-serif">Poll</text>
      <text x="20" y="50" font-size="9" fill="#374151" font-weight="600" font-family="sans-serif">What's your favorite?</text>
      <rect x="20" y="58" width="10" height="10" rx="5" fill="none" stroke="#d1d5db" stroke-width="1"/><text x="36" y="67" font-size="8" fill="#374151" font-family="sans-serif">Option A</text>
      <rect x="20" y="75" width="10" height="10" rx="5" fill="none" stroke="#d1d5db" stroke-width="1"/><text x="36" y="84" font-size="8" fill="#374151" font-family="sans-serif">Option B</text>
      <rect x="20" y="100" width="160" height="24" rx="8" fill="#3b82f6"/>
      <text x="100" y="116" text-anchor="middle" font-size="8" fill="white" font-weight="600" font-family="sans-serif">Vote</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 180, rx: 12, ry: 12, fill: BG, stroke: BORDER, strokeWidth: 1.5 });
      const title = new fabric.Text('Quick Poll', { fontSize: 14, fontWeight: 'bold', fill: TEXT, fontFamily: 'sans-serif', left: 20, top: 18 });
      const fields = [...makeRadioGroup(45, 'What is your favorite?', ['Option A', 'Option B', 'Option C']), ...makeButton(130, 'Vote')];
      return new fabric.Group([bg, title, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'other-waitlist', name: 'Waitlist Form', category: 'other', tags: ['waitlist', 'signup', 'early', 'access'],
    defaultWidth: 200, defaultHeight: 220,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#f8fafc" stroke="#e5e7eb" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f2937" font-family="sans-serif">Join Waitlist</text>
      <text x="100" y="48" text-anchor="middle" font-size="8" fill="#6b7280" font-family="sans-serif">Be the first to know</text>
      <rect x="20" y="58" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="88" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="120" width="160" height="26" rx="8" fill="#8b5cf6"/>
      <text x="100" y="137" text-anchor="middle" font-size="9" fill="white" font-weight="600" font-family="sans-serif">Join Waitlist</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 200, rx: 12, ry: 12, fill: BG, stroke: BORDER, strokeWidth: 1.5 });
      const title = new fabric.Text('Join Our Waitlist', { fontSize: 15, fontWeight: 'bold', fill: TEXT, fontFamily: 'sans-serif', left: 20, top: 18 });
      const subtitle = new fabric.Text('Be the first to know when we launch!', { fontSize: 10, fill: MUTED, fontFamily: 'sans-serif', left: 20, top: 42 });
      const fields = [...makeInput(60, 'Full Name', 'John Doe'), ...makeInput(100, 'Email', 'you@example.com'), ...makeButton(140, 'Join Waitlist', '#8b5cf6')];
      return new fabric.Group([bg, title, subtitle, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'other-support', name: 'Support Request', category: 'other', tags: ['support', 'help', 'ticket', 'issue'],
    defaultWidth: 200, defaultHeight: 300,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#f8fafc" stroke="#e5e7eb" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="11" font-weight="bold" fill="#1f2937" font-family="sans-serif">Support Request</text>
      <rect x="20" y="40" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="70" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="100" width="160" height="22" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="130" width="160" height="35" rx="5" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="20" y="175" width="160" height="24" rx="8" fill="#ef4444"/>
      <text x="100" y="191" text-anchor="middle" font-size="8" fill="white" font-weight="600" font-family="sans-serif">Submit Ticket</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 280, rx: 12, ry: 12, fill: BG, stroke: BORDER, strokeWidth: 1.5 });
      const title = new fabric.Text('Support Request', { fontSize: 14, fontWeight: 'bold', fill: TEXT, fontFamily: 'sans-serif', left: 20, top: 18 });
      const fields = [...makeInput(45, 'Your Name', 'Full name'), ...makeInput(85, 'Email', 'email@example.com'), ...makeInput(125, 'Subject', 'Brief description'), ...makeTextarea(170, 'Describe your issue'), ...makeButton(230, 'Submit Ticket', '#ef4444')];
      return new fabric.Group([bg, title, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'other-donation', name: 'Donation Interest', category: 'other', tags: ['donation', 'give', 'charity', 'support'],
    defaultWidth: 200, defaultHeight: 240,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="1.5"/>
      <text x="100" y="28" text-anchor="middle" font-size="12" font-weight="bold" fill="#166534" font-family="sans-serif">Donate</text>
      <text x="100" y="48" text-anchor="middle" font-size="8" fill="#15803d" font-family="sans-serif">Support our cause</text>
      <rect x="20" y="58" width="160" height="22" rx="5" fill="white" stroke="#bbf7d0" stroke-width="1"/>
      <rect x="20" y="88" width="160" height="22" rx="5" fill="white" stroke="#bbf7d0" stroke-width="1"/>
      <rect x="20" y="120" width="160" height="26" rx="8" fill="#22c55e"/>
      <text x="100" y="137" text-anchor="middle" font-size="9" fill="white" font-weight="600" font-family="sans-serif">Donate Now</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 220, rx: 12, ry: 12, fill: '#f0fdf4', stroke: '#bbf7d0', strokeWidth: 1.5 });
      const title = new fabric.Text('Support Our Cause', { fontSize: 15, fontWeight: 'bold', fill: '#166534', fontFamily: 'sans-serif', left: 20, top: 18 });
      const subtitle = new fabric.Text('Every contribution helps!', { fontSize: 10, fill: '#15803d', fontFamily: 'sans-serif', left: 20, top: 42 });
      const fields = [...makeInput(60, 'Your Name', 'Full name'), ...makeInput(100, 'Email', 'email@example.com'), ...makeButton(140, 'Donate Now', '#22c55e')];
      return new fabric.Group([bg, title, subtitle, ...fields], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'other-blank', name: 'Blank Form', category: 'other', tags: ['blank', 'empty', 'custom', 'template'],
    defaultWidth: 200, defaultHeight: 200,
    thumbnail: () => svg(`<rect x="5" y="5" width="190" height="250" rx="10" fill="#f8fafc" stroke="#e5e7eb" stroke-width="1.5" stroke-dasharray="4 3"/>
      <text x="100" y="120" text-anchor="middle" font-size="10" fill="#9ca3af" font-family="sans-serif">Blank Form</text>
      <text x="100" y="135" text-anchor="middle" font-size="8" fill="#d1d5db" font-family="sans-serif">Add your fields</text>`),
    create: (o) => {
      const bg = new fabric.Rect({ width: 200, height: 200, rx: 12, ry: 12, fill: BG, stroke: BORDER, strokeWidth: 1.5, strokeDashArray: [6, 4] });
      const placeholder = new fabric.Text('Add your form fields here', { fontSize: 12, fill: '#9ca3af', fontFamily: 'sans-serif', left: 100, top: 90, originX: 'center' });
      const addBtn = new fabric.Text('+ Add Field', { fontSize: 11, fill: ACCENT, fontFamily: 'sans-serif', left: 100, top: 115, originX: 'center', fontWeight: '600' });
      return new fabric.Group([bg, placeholder, addBtn], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export const FORMS_MAP = new Map(FORMS_REGISTRY.map((f) => [f.id, f]));

export const FORMS_BY_CATEGORY = FORMS_REGISTRY.reduce<Record<FormCategory, FormTemplate[]>>((acc, f) => {
  (acc[f.category] ||= []).push(f);
  return acc;
}, {} as any);

export const FORM_CATEGORIES: Array<{ id: FormCategory; label: string }> = [
  { id: 'business', label: 'Business' },
  { id: 'education', label: 'Education' },
  { id: 'events', label: 'Events' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'other', label: 'Other' },
];

export function searchForms(query: string): FormTemplate[] {
  if (!query.trim()) return FORMS_REGISTRY;
  const q = query.toLowerCase();
  return FORMS_REGISTRY.filter((f) =>
    f.name.toLowerCase().includes(q) ||
    f.id.includes(q) ||
    f.tags.some((t) => t.includes(q)) ||
    f.category.includes(q)
  );
}
