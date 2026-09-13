// Comprehensive template library for all sectors
export interface Template {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  width: number;
  height: number;
  description: string;
  tags: string[];
  elements: TemplateElement[];
}

export interface TemplateElement {
  type: 'rect' | 'circle' | 'text' | 'image' | 'line' | 'polygon';
  props: Record<string, any>;
}

export const CANVAS_PRESETS = {
  'social-media': [
    { name: 'Instagram Post', width: 1080, height: 1080, icon: 'camera' },
    { name: 'Instagram Story', width: 1080, height: 1920, icon: 'smartphone' },
    { name: 'Facebook Post', width: 1200, height: 630, icon: 'share2' },
    { name: 'Facebook Cover', width: 820, height: 312, icon: 'image' },
    { name: 'Twitter Post', width: 1200, height: 675, icon: 'twitter' },
    { name: 'LinkedIn Post', width: 1200, height: 627, icon: 'linkedin' },
    { name: 'Pinterest Pin', width: 1000, height: 1500, icon: 'mapPin' },
    { name: 'YouTube Thumbnail', width: 1280, height: 720, icon: 'play' },
  ],
  'marketing': [
    { name: 'Flyer (A4)', width: 2480, height: 3508, icon: 'fileText' },
    { name: 'Poster (A3)', width: 3508, height: 4961, icon: 'image' },
    { name: 'Banner (Web)', width: 728, height: 90, icon: 'monitor' },
    { name: 'Billboard', width: 1080, height: 1920, icon: 'monitor' },
    { name: 'Brochure', width: 2550, height: 3300, icon: 'bookOpen' },
    { name: 'Newsletter', width: 600, height: 900, icon: 'mail' },
  ],
  'print': [
    { name: 'Business Card', width: 1050, height: 600, icon: 'creditCard' },
    { name: 'Letterhead', width: 2550, height: 3300, icon: 'fileText' },
    { name: 'Envelope', width: 2400, height: 1200, icon: 'mail' },
    { name: 'Certificate', width: 2550, height: 1650, icon: 'award' },
    { name: 'Menu', width: 1200, height: 1800, icon: 'utensils' },
  ],
  'presentations': [
    { name: '16:9 Slide', width: 1920, height: 1080, icon: 'monitor' },
    { name: '4:3 Slide', width: 1440, height: 1080, icon: 'monitor' },
    { name: 'Pitch Deck', width: 1920, height: 1080, icon: 'presentation' },
  ],
};

export const TEMPLATE_CATEGORIES = [
  {
    id: 'social-media',
    name: 'Social Media',
    subcategories: [
      { id: 'instagram', name: 'Instagram Posts', count: 45 },
      { id: 'stories', name: 'Stories & Reels', count: 38 },
      { id: 'facebook', name: 'Facebook', count: 25 },
      { id: 'twitter', name: 'Twitter/X', count: 20 },
      { id: 'linkedin', name: 'LinkedIn', count: 18 },
      { id: 'pinterest', name: 'Pinterest', count: 22 },
      { id: 'youtube', name: 'YouTube', count: 30 },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    subcategories: [
      { id: 'flyers', name: 'Flyers', count: 35 },
      { id: 'posters', name: 'Posters', count: 40 },
      { id: 'banners', name: 'Web Banners', count: 28 },
      { id: 'brochures', name: 'Brochures', count: 20 },
      { id: 'newsletters', name: 'Newsletters', count: 15 },
      { id: 'ads', name: 'Digital Ads', count: 32 },
    ],
  },
  {
    id: 'events',
    name: 'Events',
    subcategories: [
      { id: 'invitations', name: 'Invitations', count: 30 },
      { id: 'event-posters', name: 'Event Posters', count: 25 },
      { id: 'tickets', name: 'Tickets & Passes', count: 18 },
      { id: 'programs', name: 'Programs & Menus', count: 12 },
      { id: 'signage', name: 'Event Signage', count: 15 },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    subcategories: [
      { id: 'presentations', name: 'Presentations', count: 22 },
      { id: 'business-cards', name: 'Business Cards', count: 20 },
      { id: 'reports', name: 'Reports & Proposals', count: 15 },
      { id: 'invoices', name: 'Invoices', count: 10 },
      { id: 'letterheads', name: 'Letterheads', count: 8 },
      { id: 'pitch-decks', name: 'Pitch Decks', count: 12 },
    ],
  },
  {
    id: 'food-beverage',
    name: 'Food & Beverage',
    subcategories: [
      { id: 'restaurant', name: 'Restaurant', count: 28 },
      { id: 'cafe', name: 'Cafe & Coffee', count: 22 },
      { id: 'bakery', name: 'Bakery', count: 18 },
      { id: 'food-truck', name: 'Food Truck', count: 12 },
      { id: 'bar-pub', name: 'Bar & Pub', count: 15 },
      { id: 'catering', name: 'Catering', count: 10 },
    ],
  },
  {
    id: 'fashion-beauty',
    name: 'Fashion & Beauty',
    subcategories: [
      { id: 'fashion-sale', name: 'Sales & Promos', count: 25 },
      { id: 'lookbook', name: 'Lookbooks', count: 18 },
      { id: 'cosmetics', name: 'Cosmetics', count: 20 },
      { id: 'jewelry', name: 'Jewelry', count: 15 },
      { id: 'salon', name: 'Salon & Spa', count: 22 },
    ],
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    subcategories: [
      { id: 'property-listing', name: 'Property Listings', count: 20 },
      { id: 'open-house', name: 'Open House', count: 15 },
      { id: 'property-management', name: 'Property Management', count: 10 },
    ],
  },
  {
    id: 'education',
    name: 'Education',
    subcategories: [
      { id: 'courses', name: 'Online Courses', count: 20 },
      { id: 'school', name: 'School & College', count: 15 },
      { id: 'workshops', name: 'Workshops', count: 12 },
      { id: 'certificates', name: 'Certificates', count: 10 },
    ],
  },
  {
    id: 'health-fitness',
    name: 'Health & Fitness',
    subcategories: [
      { id: 'gym', name: 'Gym & Training', count: 22 },
      { id: 'yoga', name: 'Yoga & Wellness', count: 18 },
      { id: 'healthcare', name: 'Healthcare', count: 15 },
      { id: 'nutrition', name: 'Nutrition', count: 12 },
    ],
  },
  {
    id: 'technology',
    name: 'Technology',
    subcategories: [
      { id: 'app-launch', name: 'App Launch', count: 18 },
      { id: 'saas', name: 'SaaS & Software', count: 15 },
      { id: 'tech-event', name: 'Tech Events', count: 12 },
      { id: 'startup', name: 'Startup', count: 20 },
    ],
  },
  {
    id: 'creative',
    name: 'Creative',
    subcategories: [
      { id: 'photography', name: 'Photography', count: 15 },
      { id: 'portfolio', name: 'Portfolio', count: 12 },
      { id: 'art', name: 'Art & Illustration', count: 18 },
      { id: 'music', name: 'Music & Entertainment', count: 15 },
    ],
  },
];

// Pre-built template designs for each sector
export const SECTOR_TEMPLATES: Record<string, any[]> = {
  'instagram': [
    {
      id: 'insta-promo-1',
      name: 'Product Promotion',
      preview: 'gradient-purple',
      elements: [
        { type: 'rect', props: { left: 0, top: 0, width: 1080, height: 1080, fill: '#1a1a2e', selectable: false } },
        { type: 'rect', props: { left: 54, top: 54, width: 972, height: 972, fill: '#16213e', rx: 20, ry: 20 } },
        { type: 'circle', props: { left: 700, top: 100, radius: 200, fill: 'rgba(139,92,246,0.2)' } },
        { type: 'text', props: { text: 'NEW\nCOLLECTION', left: 100, top: 200, fontSize: 96, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', textAlign: 'left', lineHeight: 1.1 } },
        { type: 'text', props: { text: 'Discover our latest arrivals', left: 100, top: 480, fontSize: 32, fill: '#a78bfa', fontFamily: 'Outfit' } },
        { type: 'rect', props: { left: 100, top: 600, width: 300, height: 60, fill: '#8b5cf6', rx: 30, ry: 30 } },
        { type: 'text', props: { text: 'SHOP NOW', left: 100, top: 612, fontSize: 20, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', textAlign: 'center' } },
      ],
    },
    {
      id: 'insta-quote-1',
      name: 'Inspirational Quote',
      preview: 'gradient-dark',
      elements: [
        { type: 'rect', props: { left: 0, top: 0, width: 1080, height: 1080, fill: '#0f0f23', selectable: false } },
        { type: 'text', props: { text: '"', left: 80, top: 200, fontSize: 200, fill: '#8b5cf6', fontFamily: 'Georgia' } },
        { type: 'text', props: { text: 'The only way to do\ngreat work is to love\nwhat you do.', left: 120, top: 350, width: 840, fontSize: 56, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', textAlign: 'center', lineHeight: 1.3 } },
        { type: 'text', props: { text: '— Steve Jobs', left: 120, top: 680, width: 840, fontSize: 28, fill: '#a78bfa', fontFamily: 'Outfit', textAlign: 'center' } },
        { type: 'line', props: { x1: 440, y1: 640, x2: 640, y2: 640, stroke: '#8b5cf6', strokeWidth: 3 } },
      ],
    },
    {
      id: 'insta-sale-1',
      name: 'Flash Sale',
      preview: 'gradient-red',
      elements: [
        { type: 'rect', props: { left: 0, top: 0, width: 1080, height: 1080, fill: '#1a0000', selectable: false } },
        { type: 'rect', props: { left: 54, top: 54, width: 972, height: 972, fill: 'transparent', stroke: '#ff3366', strokeWidth: 4, rx: 20, ry: 20 } },
        { type: 'text', props: { text: 'MEGA\nSALE', left: 100, top: 200, width: 880, fontSize: 140, fontWeight: 'bold', fill: '#ff3366', fontFamily: 'Outfit', textAlign: 'center', lineHeight: 1.0 } },
        { type: 'text', props: { text: 'UP TO 70% OFF', left: 100, top: 560, width: 880, fontSize: 48, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', textAlign: 'center' } },
        { type: 'text', props: { text: 'Limited time only • This weekend', left: 100, top: 650, width: 880, fontSize: 24, fill: '#ff6b9d', fontFamily: 'Outfit', textAlign: 'center' } },
        { type: 'rect', props: { left: 390, top: 750, width: 300, height: 70, fill: '#ff3366', rx: 35, ry: 35 } },
        { type: 'text', props: { text: 'SHOP NOW', left: 390, top: 765, width: 300, fontSize: 24, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', textAlign: 'center' } },
      ],
    },
  ],
  'food-beverage': [
    {
      id: 'food-cafe-1',
      name: 'Coffee Shop Special',
      preview: 'gradient-brown',
      elements: [
        { type: 'rect', props: { left: 0, top: 0, width: 1080, height: 1080, fill: '#2c1810', selectable: false } },
        { type: 'rect', props: { left: 0, top: 0, width: 1080, height: 400, fill: '#1a0f0a', selectable: false } },
        { type: 'circle', props: { left: 800, top: -100, radius: 300, fill: 'rgba(212,165,116,0.15)' } },
        { type: 'text', props: { text: 'FRESH BREWS', left: 80, top: 120, fontSize: 72, fontWeight: 'bold', fill: '#d4a574', fontFamily: 'Georgia' } },
        { type: 'text', props: { text: 'Handcrafted coffee for every mood', left: 80, top: 230, fontSize: 28, fill: '#f5e6d3', fontFamily: 'Georgia' } },
        { type: 'rect', props: { left: 80, top: 340, width: 120, height: 4, fill: '#d4a574', rx: 2, ry: 2 } },
        { type: 'text', props: { text: '☕ LATTE', left: 80, top: 500, fontSize: 36, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Georgia' } },
        { type: 'text', props: { text: '$4.50', left: 800, top: 500, fontSize: 36, fontWeight: 'bold', fill: '#d4a574', fontFamily: 'Georgia' } },
        { type: 'text', props: { text: '☕ CAPPUCCINO', left: 80, top: 580, fontSize: 36, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Georgia' } },
        { type: 'text', props: { text: '$5.00', left: 800, top: 580, fontSize: 36, fontWeight: 'bold', fill: '#d4a574', fontFamily: 'Georgia' } },
        { type: 'text', props: { text: '☕ ESPRESSO', left: 80, top: 660, fontSize: 36, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Georgia' } },
        { type: 'text', props: { text: '$3.50', left: 800, top: 660, fontSize: 36, fontWeight: 'bold', fill: '#d4a574', fontFamily: 'Georgia' } },
        { type: 'line', props: { x1: 80, y1: 740, x2: 1000, y2: 740, stroke: 'rgba(212,165,116,0.3)', strokeWidth: 1 } },
        { type: 'text', props: { text: 'Open Daily • 7AM - 9PM', left: 80, top: 920, fontSize: 22, fill: '#a08060', fontFamily: 'Georgia' } },
      ],
    },
    {
      id: 'food-restaurant-1',
      name: 'Restaurant Menu',
      preview: 'gradient-dark',
      elements: [
        { type: 'rect', props: { left: 0, top: 0, width: 1080, height: 1080, fill: '#0a0a0a', selectable: false } },
        { type: 'text', props: { text: 'MENU', left: 80, top: 80, fontSize: 64, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit' } },
        { type: 'text', props: { text: '━━━━━━━━━━', left: 80, top: 160, fontSize: 24, fill: '#ffd700', fontFamily: 'monospace' } },
        { type: 'text', props: { text: 'STARTERS', left: 80, top: 240, fontSize: 32, fontWeight: 'bold', fill: '#ffd700', fontFamily: 'Outfit' } },
        { type: 'text', props: { text: 'Bruschetta', left: 80, top: 300, fontSize: 26, fill: '#ffffff', fontFamily: 'Outfit' } },
        { type: 'text', props: { text: '$12', left: 900, top: 300, fontSize: 26, fill: '#ffd700', fontFamily: 'Outfit' } },
        { type: 'text', props: { text: 'Grilled Calamari', left: 80, top: 360, fontSize: 26, fill: '#ffffff', fontFamily: 'Outfit' } },
        { type: 'text', props: { text: '$16', left: 900, top: 360, fontSize: 26, fill: '#ffd700', fontFamily: 'Outfit' } },
        { type: 'text', props: { text: 'MAIN COURSE', left: 80, top: 460, fontSize: 32, fontWeight: 'bold', fill: '#ffd700', fontFamily: 'Outfit' } },
        { type: 'text', props: { text: 'Grilled Salmon', left: 80, top: 520, fontSize: 26, fill: '#ffffff', fontFamily: 'Outfit' } },
        { type: 'text', props: { text: '$28', left: 900, top: 520, fontSize: 26, fill: '#ffd700', fontFamily: 'Outfit' } },
        { type: 'text', props: { text: 'Filet Mignon', left: 80, top: 580, fontSize: 26, fill: '#ffffff', fontFamily: 'Outfit' } },
        { type: 'text', props: { text: '$42', left: 900, top: 580, fontSize: 26, fill: '#ffd700', fontFamily: 'Outfit' } },
      ],
    },
  ],
  'fashion-beauty': [
    {
      id: 'fashion-sale-1',
      name: 'Fashion Sale',
      preview: 'gradient-pink',
      elements: [
        { type: 'rect', props: { left: 0, top: 0, width: 1080, height: 1080, fill: '#1a0015', selectable: false } },
        { type: 'circle', props: { left: 750, top: 50, radius: 250, fill: 'rgba(236,72,153,0.15)' } },
        { type: 'circle', props: { left: -50, top: 700, radius: 200, fill: 'rgba(236,72,153,0.1)' } },
        { type: 'text', props: { text: 'SUMMER\nCOLLECTION', left: 80, top: 180, width: 900, fontSize: 96, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', textAlign: 'left', lineHeight: 1.1 } },
        { type: 'text', props: { text: '50% OFF', left: 80, top: 460, fontSize: 72, fontWeight: 'bold', fill: '#ec4899', fontFamily: 'Outfit' } },
        { type: 'text', props: { text: 'Elevate your style this season', left: 80, top: 580, fontSize: 28, fill: '#f9a8d4', fontFamily: 'Outfit' } },
        { type: 'rect', props: { left: 80, top: 700, width: 300, height: 70, fill: '#ec4899', rx: 35, ry: 35 } },
        { type: 'text', props: { text: 'SHOP THE LOOK', left: 80, top: 715, width: 300, fontSize: 20, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', textAlign: 'center' } },
      ],
    },
  ],
  'events': [
    {
      id: 'event-party-1',
      name: 'Party Invitation',
      preview: 'gradient-neon',
      elements: [
        { type: 'rect', props: { left: 0, top: 0, width: 1080, height: 1080, fill: '#0a0a0a', selectable: false } },
        { type: 'circle', props: { left: 300, top: 200, radius: 300, fill: 'rgba(255,0,255,0.08)' } },
        { type: 'circle', props: { left: 500, top: 400, radius: 200, fill: 'rgba(0,255,255,0.06)' } },
        { type: 'text', props: { text: "YOU'RE\nINVITED", left: 100, top: 150, width: 880, fontSize: 100, fontWeight: 'bold', fill: '#ff00ff', fontFamily: 'Outfit', textAlign: 'center', lineHeight: 1.1 } },
        { type: 'text', props: { text: 'NEON NIGHTS', left: 100, top: 420, width: 880, fontSize: 48, fontWeight: 'bold', fill: '#00ffff', fontFamily: 'Outfit', textAlign: 'center' } },
        { type: 'line', props: { x1: 340, y1: 500, x2: 740, y2: 500, stroke: '#ff00ff', strokeWidth: 2 } },
        { type: 'text', props: { text: 'Saturday, July 20th\n9:00 PM - 2:00 AM', left: 100, top: 540, width: 880, fontSize: 28, fill: '#ffffff', fontFamily: 'Outfit', textAlign: 'center', lineHeight: 1.5 } },
        { type: 'text', props: { text: 'Club Paradiso, Downtown', left: 100, top: 660, width: 880, fontSize: 24, fill: '#a0a0a0', fontFamily: 'Outfit', textAlign: 'center' } },
        { type: 'rect', props: { left: 390, top: 780, width: 300, height: 60, fill: 'transparent', stroke: '#ff00ff', strokeWidth: 2, rx: 30, ry: 30 } },
        { type: 'text', props: { text: 'RSVP NOW', left: 390, top: 793, width: 300, fontSize: 20, fontWeight: 'bold', fill: '#ff00ff', fontFamily: 'Outfit', textAlign: 'center' } },
      ],
    },
  ],
  'business': [
    {
      id: 'biz-corporate-1',
      name: 'Corporate Presentation',
      preview: 'gradient-blue',
      elements: [
        { type: 'rect', props: { left: 0, top: 0, width: 1920, height: 1080, fill: '#0f172a', selectable: false } },
        { type: 'rect', props: { left: 0, top: 0, width: 800, height: 1080, fill: '#1e3a5f', selectable: false } },
        { type: 'text', props: { text: 'QUARTERLY\nREPORT', left: 80, top: 300, width: 640, fontSize: 80, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', lineHeight: 1.1 } },
        { type: 'text', props: { text: 'Q3 2026 Performance Review', left: 80, top: 540, width: 640, fontSize: 28, fill: '#94a3b8', fontFamily: 'Outfit' } },
        { type: 'text', props: { text: 'KEY METRICS', left: 900, top: 200, fontSize: 24, fontWeight: 'bold', fill: '#4a90d9', fontFamily: 'Outfit' } },
        { type: 'text', props: { text: 'Revenue Growth', left: 900, top: 280, fontSize: 20, fill: '#94a3b8', fontFamily: 'Outfit' } },
        { type: 'text', props: { text: '+42%', left: 1400, top: 280, fontSize: 32, fontWeight: 'bold', fill: '#22c55e', fontFamily: 'Outfit' } },
        { type: 'text', props: { text: 'New Customers', left: 900, top: 350, fontSize: 20, fill: '#94a3b8', fontFamily: 'Outfit' } },
        { type: 'text', props: { text: '1,240', left: 1400, top: 350, fontSize: 32, fontWeight: 'bold', fill: '#4a90d9', fontFamily: 'Outfit' } },
      ],
    },
  ],
  'health-fitness': [
    {
      id: 'fitness-gym-1',
      name: 'Gym Promotion',
      preview: 'gradient-dark-red',
      elements: [
        { type: 'rect', props: { left: 0, top: 0, width: 1080, height: 1080, fill: '#0a0a0a', selectable: false } },
        { type: 'rect', props: { left: 0, top: 0, width: 1080, height: 540, fill: 'rgba(220,38,38,0.15)', selectable: false } },
        { type: 'text', props: { text: 'PUSH\nYOUR\nLIMITS', left: 80, top: 150, width: 920, fontSize: 110, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', textAlign: 'center', lineHeight: 1.0 } },
        { type: 'text', props: { text: '30 DAYS CHALLENGE', left: 80, top: 550, width: 920, fontSize: 36, fontWeight: 'bold', fill: '#ef4444', fontFamily: 'Outfit', textAlign: 'center' } },
        { type: 'text', props: { text: 'Transform your body. Transform your life.', left: 80, top: 630, width: 920, fontSize: 24, fill: '#a0a0a0', fontFamily: 'Outfit', textAlign: 'center' } },
        { type: 'rect', props: { left: 390, top: 750, width: 300, height: 70, fill: '#ef4444', rx: 35, ry: 35 } },
        { type: 'text', props: { text: 'JOIN NOW', left: 390, top: 765, width: 300, fontSize: 22, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', textAlign: 'center' } },
        { type: 'text', props: { text: 'Starting at $29/month', left: 80, top: 870, width: 920, fontSize: 18, fill: '#666666', fontFamily: 'Outfit', textAlign: 'center' } },
      ],
    },
  ],
  'technology': [
    {
      id: 'tech-startup-1',
      name: 'App Launch',
      preview: 'gradient-cyan',
      elements: [
        { type: 'rect', props: { left: 0, top: 0, width: 1080, height: 1080, fill: '#0a192f', selectable: false } },
        { type: 'circle', props: { left: 650, top: 50, radius: 300, fill: 'rgba(0,200,255,0.06)' } },
        { type: 'text', props: { text: 'INTRODUCING', left: 80, top: 200, fontSize: 24, fontWeight: 'bold', fill: '#00c8ff', fontFamily: 'Outfit', letterSpacing: 8 } },
        { type: 'text', props: { text: 'NEXUS\nAPP', left: 80, top: 280, width: 920, fontSize: 120, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', lineHeight: 1.0 } },
        { type: 'text', props: { text: 'The future of productivity', left: 80, top: 540, fontSize: 28, fill: '#64ffda', fontFamily: 'Outfit' } },
        { type: 'text', props: { text: '• AI-Powered Insights\n• Real-time Collaboration\n• Cross-Platform Sync', left: 80, top: 640, fontSize: 22, fill: '#8892b0', fontFamily: 'Outfit', lineHeight: 1.8 } },
        { type: 'rect', props: { left: 80, top: 860, width: 280, height: 60, fill: '#00c8ff', rx: 30, ry: 30 } },
        { type: 'text', props: { text: 'DOWNLOAD FREE', left: 80, top: 873, width: 280, fontSize: 16, fontWeight: 'bold', fill: '#0a192f', fontFamily: 'Outfit', textAlign: 'center' } },
      ],
    },
  ],
  'education': [
    {
      id: 'edu-course-1',
      name: 'Online Course',
      preview: 'gradient-teal',
      elements: [
        { type: 'rect', props: { left: 0, top: 0, width: 1080, height: 1080, fill: '#0d1117', selectable: false } },
        { type: 'rect', props: { left: 54, top: 54, width: 972, height: 972, fill: 'transparent', stroke: '#00b4d8', strokeWidth: 2, rx: 20, ry: 20 } },
        { type: 'text', props: { text: 'MASTER\nWEB\nDEVELOPMENT', left: 80, top: 150, width: 920, fontSize: 80, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', textAlign: 'center', lineHeight: 1.1 } },
        { type: 'text', props: { text: '12-Week Comprehensive Bootcamp', left: 80, top: 460, width: 920, fontSize: 28, fill: '#00b4d8', fontFamily: 'Outfit', textAlign: 'center' } },
        { type: 'text', props: { text: '✓ HTML, CSS, JavaScript\n✓ React & Node.js\n✓ Database Design\n✓ Deployment & DevOps', left: 200, top: 560, width: 680, fontSize: 22, fill: '#8b949e', fontFamily: 'Outfit', lineHeight: 1.8 } },
        { type: 'rect', props: { left: 340, top: 850, width: 400, height: 70, fill: '#00b4d8', rx: 35, ry: 35 } },
        { type: 'text', props: { text: 'ENROLL NOW — $299', left: 340, top: 865, width: 400, fontSize: 20, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', textAlign: 'center' } },
      ],
    },
  ],
  'real-estate': [
    {
      id: 're-property-1',
      name: 'Property Listing',
      preview: 'gradient-green',
      elements: [
        { type: 'rect', props: { left: 0, top: 0, width: 1080, height: 1080, fill: '#0f1f0f', selectable: false } },
        { type: 'rect', props: { left: 0, top: 0, width: 1080, height: 600, fill: '#1a2e1a', selectable: false } },
        { type: 'text', props: { text: 'FOR SALE', left: 54, top: 50, fontSize: 20, fontWeight: 'bold', fill: '#22c55e', fontFamily: 'Outfit', letterSpacing: 4 } },
        { type: 'text', props: { text: 'LUXURY\nVILLA', left: 54, top: 100, width: 972, fontSize: 96, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', lineHeight: 1.1 } },
        { type: 'rect', props: { left: 54, top: 540, width: 972, height: 540, fill: '#0f1f0f', selectable: false } },
        { type: 'text', props: { text: '$1,250,000', left: 54, top: 560, fontSize: 48, fontWeight: 'bold', fill: '#22c55e', fontFamily: 'Outfit' } },
        { type: 'text', props: { text: '4 Bedrooms  •  3 Bathrooms  •  3,200 sq ft', left: 54, top: 630, fontSize: 22, fill: '#86efac', fontFamily: 'Outfit' } },
        { type: 'line', props: { x1: 54, y1: 690, x2: 1026, y2: 690, stroke: 'rgba(34,197,94,0.3)', strokeWidth: 1 } },
        { type: 'text', props: { text: '• Modern Open Floor Plan\n• Gourmet Kitchen\n• Infinity Pool\n• Smart Home System\n• 2-Car Garage', left: 54, top: 720, fontSize: 20, fill: '#a0a0a0', fontFamily: 'Outfit', lineHeight: 1.8 } },
      ],
    },
  ],
};

export const getTemplatePreviewColor = (id: string): string => {
  const colors: Record<string, string> = {
    'gradient-purple': 'from-purple-600 to-violet-600',
    'gradient-dark': 'from-zinc-800 to-zinc-900',
    'gradient-red': 'from-red-600 to-pink-600',
    'gradient-brown': 'from-amber-800 to-amber-950',
    'gradient-pink': 'from-pink-600 to-rose-600',
    'gradient-neon': 'from-fuchsia-600 to-cyan-600',
    'gradient-blue': 'from-blue-600 to-indigo-600',
    'gradient-dark-red': 'from-red-900 to-red-950',
    'gradient-cyan': 'from-cyan-600 to-teal-600',
    'gradient-teal': 'from-teal-600 to-emerald-600',
    'gradient-green': 'from-green-700 to-green-900',
  };
  return colors[id] || 'from-violet-600 to-fuchsia-600';
};
