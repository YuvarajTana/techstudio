import type { PosterSpec, PosterSpecCard, PosterSpecThemeId } from '../utils/posterSpecRenderer';

export type TemplateAccess = 'Free' | 'Premium';
export type TemplateOrientation = 'Portrait' | 'Landscape' | 'Square';
export type TemplateLayoutFamily =
  | 'Numbered Technical Cards'
  | 'Cheatsheet Grid'
  | 'Timeline Roadmap'
  | 'Architecture Flow'
  | 'Side-by-Side Comparison'
  | 'Layered Technology Stack'
  | 'Process Steps'
  | 'Hero Promotion'
  | 'Event Poster'
  | 'Product Feature Grid'
  | 'Quote and Motivation'
  | 'Image and Content Split';

export interface TechPosterTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  subCategory: string;
  designType: string;
  format: string;
  orientation: TemplateOrientation;
  width: number;
  height: number;
  aspectRatio: string;
  layoutFamily: TemplateLayoutFamily;
  style: string[];
  industry: string[];
  themeId: PosterSpecThemeId;
  tags: string[];
  isFeatured: boolean;
  isFree: boolean;
  popularity: number;
  createdAt: string;
  posterSpec: PosterSpec;
}

type CardProfile = 'ai' | 'engineering' | 'cloud' | 'education' | 'business' | 'event' | 'social' | 'lifestyle';

interface TemplateSeed {
  name: string;
  description: string;
  category: string;
  subCategory: string;
  designType: string;
  format: string;
  orientation?: TemplateOrientation;
  aspectRatio?: string;
  layoutFamily: TemplateLayoutFamily;
  style: string[];
  industry: string[];
  themeId: PosterSpecThemeId;
  tags: string[];
  featured?: boolean;
  premium?: boolean;
  popularity: number;
  cardProfile: CardProfile;
}

export const DESIGN_TYPE_OPTIONS = [
  'All',
  'Technical Posters',
  'Infographics',
  'Cheatsheets',
  'Architecture Diagrams',
  'Learning Roadmaps',
  'LinkedIn Posts',
  'Instagram Posts',
  'Presentations',
  'YouTube Thumbnails',
  'Blog Hero Images',
  'Event Posters',
  'Marketing Posters',
];

export const TEMPLATE_FILTER_OPTIONS = {
  format: ['Poster', 'Infographic', 'Cheatsheet', 'Roadmap', 'Architecture Diagram', 'LinkedIn Post', 'Instagram Post', 'Presentation', 'YouTube Thumbnail', 'Blog Hero'],
  orientation: ['Portrait', 'Landscape', 'Square'],
  aspectRatio: ['4:5', '1:1', '16:9', 'A4', 'Letter', 'Custom'],
  style: ['Modern', 'Minimal', 'Professional', 'Corporate', 'Bold', 'Creative', 'Futuristic', 'Elegant', 'Dark', 'Light', 'Gradient', 'Editorial'],
  industry: ['Technology', 'Software Engineering', 'Artificial Intelligence', 'Education', 'Business', 'Marketing', 'Healthcare', 'Food', 'Travel', 'Fitness', 'Real Estate', 'Entertainment'],
  theme: ['Tech Blue', 'Purple AI', 'Minimal Light', 'Corporate Navy', 'Black and Gold', 'Green Growth', 'Orange Energy', 'Neon Future'],
  access: ['All', 'Free', 'Premium'],
};

export const TEMPLATE_CATEGORY_ROWS = [
  { title: 'Technology & AI', description: 'Explain AI systems, data workflows, and modern technical concepts.' },
  { title: 'Software Engineering', description: 'System design, architecture, DevOps, database, and clean code templates.' },
  { title: 'Cloud & Infrastructure', description: 'Cloud architecture, containers, CI/CD, platform, and security diagrams.' },
  { title: 'Education & Learning', description: 'Roadmaps, study guides, tutorials, and classroom-ready explainers.' },
  { title: 'Business & Product', description: 'Strategy, launches, product roadmaps, funnels, and business overviews.' },
  { title: 'Events & Promotions', description: 'Conference, workshop, webinar, launch, and promotion-ready posters.' },
];

const THEME_LABELS: Record<PosterSpecThemeId, string> = {
  'tech-blue': 'Tech Blue',
  'purple-ai': 'Purple AI',
  'minimal-light': 'Minimal Light',
  'corporate-navy': 'Corporate Navy',
  'black-gold': 'Black and Gold',
  'green-growth': 'Green Growth',
  'orange-energy': 'Orange Energy',
  'neon-future': 'Neon Future',
};

const PROFILE_CARDS: Record<CardProfile, Array<Omit<PosterSpecCard, 'number'>>> = {
  ai: [
    { title: 'Core Idea', description: 'Define the concept, audience, and practical outcome before adding detail.', icon: 'spark' },
    { title: 'Data Flow', description: 'Show how data, prompts, context, and outputs move through the system.', icon: 'database' },
    { title: 'Model Layer', description: 'Explain where models reason, classify, generate, or retrieve information.', icon: 'chip' },
    { title: 'User Value', description: 'Connect the technical workflow to a clear benefit for beginners or teams.', icon: 'chart' },
    { title: 'Safety', description: 'Add guardrails for privacy, validation, hallucination, and unsafe outputs.', icon: 'shield' },
    { title: 'Evaluation', description: 'Measure quality, relevance, cost, speed, and failure cases with examples.', icon: 'chart' },
    { title: 'Next Step', description: 'End with a concrete action viewers can try immediately.', icon: 'spark' },
  ],
  engineering: [
    { title: 'Problem', description: 'State the engineering challenge, constraints, scale, and success target.', icon: 'chart' },
    { title: 'Interface', description: 'Define clear API, UI, event, or workflow boundaries before internals.', icon: 'code' },
    { title: 'Data Model', description: 'Map entities, relationships, indexes, ownership, and lifecycle rules.', icon: 'database' },
    { title: 'Architecture', description: 'Separate services, responsibilities, integrations, and failure domains.', icon: 'cloud' },
    { title: 'Reliability', description: 'Plan retries, queues, monitoring, fallbacks, and safe degradation.', icon: 'shield' },
    { title: 'Performance', description: 'Use caching, batching, pagination, and async processing where needed.', icon: 'chip' },
    { title: 'Trade-Offs', description: 'Document cost, complexity, speed, maintainability, and operational risk.', icon: 'spark' },
  ],
  cloud: [
    { title: 'Workload', description: 'Identify compute, storage, networking, database, and user traffic needs.', icon: 'cloud' },
    { title: 'Network', description: 'Show DNS, load balancing, private access, regions, and edge routing.', icon: 'cloud' },
    { title: 'Compute', description: 'Choose containers, functions, VMs, or managed services by workload shape.', icon: 'chip' },
    { title: 'State', description: 'Separate durable data, cache, queue, object storage, and search layers.', icon: 'database' },
    { title: 'Security', description: 'Use least privilege, secrets, encryption, identity, and audit trails.', icon: 'shield' },
    { title: 'Delivery', description: 'Automate builds, tests, deployments, rollback, and infrastructure changes.', icon: 'code' },
    { title: 'Operations', description: 'Track logs, metrics, traces, alerts, cost, and runbook ownership.', icon: 'chart' },
  ],
  education: [
    { title: 'Learning Goal', description: 'Clarify the exact skill, concept, or outcome learners should retain.', icon: 'spark' },
    { title: 'Prerequisites', description: 'List the basic knowledge needed before starting this topic.', icon: 'code' },
    { title: 'Key Concepts', description: 'Break the topic into memorable chunks with a clear hierarchy.', icon: 'chip' },
    { title: 'Examples', description: 'Use one practical example to make the lesson concrete and repeatable.', icon: 'database' },
    { title: 'Practice', description: 'Give learners a short exercise or checklist they can complete.', icon: 'chart' },
    { title: 'Common Mistakes', description: 'Call out misconceptions, traps, and debugging habits early.', icon: 'shield' },
    { title: 'Review', description: 'End with a summary, next resource, or reflection prompt.', icon: 'spark' },
  ],
  business: [
    { title: 'Objective', description: 'Start with the business goal, audience, timeline, and success metric.', icon: 'chart' },
    { title: 'Audience', description: 'Define who the message is for and what problem it solves.', icon: 'spark' },
    { title: 'Offer', description: 'Explain the product, service, strategy, or value proposition clearly.', icon: 'chip' },
    { title: 'Channel', description: 'Connect the message to launch, marketing, sales, or product channels.', icon: 'cloud' },
    { title: 'Proof', description: 'Use outcomes, benefits, testimonials, or data points to build trust.', icon: 'database' },
    { title: 'Action', description: 'Make the next step obvious with a focused call to action.', icon: 'spark' },
    { title: 'Measure', description: 'Track conversion, adoption, retention, revenue, and feedback loops.', icon: 'chart' },
  ],
  event: [
    { title: 'Hook', description: 'Lead with the event promise, audience, and reason to attend.', icon: 'spark' },
    { title: 'Program', description: 'Summarize sessions, activities, speakers, or experiences clearly.', icon: 'chart' },
    { title: 'Details', description: 'Reserve space for date, time, venue, access link, and entry notes.', icon: 'code' },
    { title: 'Visual Mood', description: 'Use color, contrast, and spacing to match the event energy.', icon: 'chip' },
    { title: 'Audience Fit', description: 'Clarify whether it is beginner-friendly, professional, or community-led.', icon: 'shield' },
    { title: 'CTA', description: 'Make registration, RSVP, purchase, or sharing the obvious next action.', icon: 'spark' },
    { title: 'Follow-Up', description: 'Mention reminders, resources, recordings, or next community steps.', icon: 'cloud' },
  ],
  social: [
    { title: 'Scroll Stopper', description: 'Open with one sharp claim, visual hook, or audience problem.', icon: 'spark' },
    { title: 'Context', description: 'Explain why the topic matters in one short supporting line.', icon: 'chart' },
    { title: 'Main Point', description: 'Make the central insight readable at mobile thumbnail size.', icon: 'chip' },
    { title: 'Proof Point', description: 'Add a statistic, example, principle, or small framework.', icon: 'database' },
    { title: 'Design Rhythm', description: 'Use repeatable spacing, contrast, and visual hierarchy.', icon: 'code' },
    { title: 'Share Value', description: 'Make the content saveable, useful, and easy to repost.', icon: 'cloud' },
    { title: 'CTA', description: 'End with a comment, follow, download, or read-more action.', icon: 'spark' },
  ],
  lifestyle: [
    { title: 'Mood', description: 'Set the feeling with color, typography, imagery space, and pacing.', icon: 'spark' },
    { title: 'Audience', description: 'Clarify who the message serves and what transformation it promises.', icon: 'chart' },
    { title: 'Offer', description: 'Describe the experience, routine, service, or destination clearly.', icon: 'cloud' },
    { title: 'Benefits', description: 'Highlight outcomes, comfort, health, taste, enjoyment, or aspiration.', icon: 'chip' },
    { title: 'Details', description: 'Keep date, place, price, contact, or booking information legible.', icon: 'database' },
    { title: 'Trust', description: 'Use a simple proof point, guarantee, or credibility cue.', icon: 'shield' },
    { title: 'Action', description: 'Invite the viewer to book, visit, join, try, or learn more.', icon: 'spark' },
  ],
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function dimensionsFor(format: string, orientation: TemplateOrientation) {
  if (format === 'Instagram Post') return { width: 1080, height: 1080, aspectRatio: '1:1' };
  if (format === 'LinkedIn Post') return { width: 1200, height: 627, aspectRatio: 'Custom' };
  if (format === 'Presentation') return { width: 1920, height: 1080, aspectRatio: '16:9' };
  if (format === 'YouTube Thumbnail') return { width: 1280, height: 720, aspectRatio: '16:9' };
  if (format === 'Blog Hero') return { width: 1600, height: 900, aspectRatio: '16:9' };
  if (orientation === 'Landscape') return { width: 1280, height: 720, aspectRatio: '16:9' };
  if (orientation === 'Square') return { width: 1080, height: 1080, aspectRatio: '1:1' };
  return { width: 800, height: 1132, aspectRatio: '4:5' };
}

function cardsFor(profile: CardProfile): PosterSpecCard[] {
  return PROFILE_CARDS[profile].map((card, index) => ({ ...card, number: index + 1 }));
}

function makeTemplate(seed: TemplateSeed, index: number): TechPosterTemplate {
  const orientation = seed.orientation || 'Portrait';
  const dimensions = dimensionsFor(seed.format, orientation);
  const slug = slugify(seed.name);
  return {
    id: `tpl-${slug}-${String(index + 1).padStart(3, '0')}`,
    name: seed.name,
    slug,
    description: seed.description,
    category: seed.category,
    subCategory: seed.subCategory,
    designType: seed.designType,
    format: seed.format,
    orientation,
    width: dimensions.width,
    height: dimensions.height,
    aspectRatio: seed.aspectRatio || dimensions.aspectRatio,
    layoutFamily: seed.layoutFamily,
    style: seed.style,
    industry: seed.industry,
    themeId: seed.themeId,
    tags: Array.from(new Set([...seed.tags, seed.category, seed.subCategory, seed.format, seed.layoutFamily, THEME_LABELS[seed.themeId]])).map((tag) => tag.toLowerCase()),
    isFeatured: Boolean(seed.featured),
    isFree: !seed.premium,
    popularity: seed.popularity,
    createdAt: `2026-07-${String((index % 24) + 1).padStart(2, '0')}`,
    posterSpec: {
      title: seed.name,
      subtitle: seed.subCategory,
      description: seed.description,
      posterType: 'numbered-cards',
      theme: seed.themeId,
      cards: cardsFor(seed.cardProfile),
      cta: {
        text: seed.cardProfile === 'event' ? 'Reserve your spot today' : 'Customize every section in TechPoster Studio',
        tag: `#${slug.split('-').slice(0, 2).map((part) => part[0]?.toUpperCase() + part.slice(1)).join('')}`,
      },
    },
  };
}

const TEMPLATE_SEEDS: TemplateSeed[] = [
  { name: 'System Design Fundamentals', description: 'A professional numbered-card technical explainer for scalable systems.', category: 'Software Engineering', subCategory: 'System Design', designType: 'Technical Posters', format: 'Poster', layoutFamily: 'Numbered Technical Cards', style: ['Modern', 'Professional', 'Dark'], industry: ['Technology', 'Software Engineering', 'Education'], themeId: 'tech-blue', tags: ['system design', 'architecture', 'scalability'], featured: true, popularity: 99, cardProfile: 'engineering' },
  { name: 'Generative AI Explained', description: 'Explain prompts, models, context, safety, and evaluation for beginners.', category: 'Technology & AI', subCategory: 'Generative AI', designType: 'Technical Posters', format: 'Poster', layoutFamily: 'Numbered Technical Cards', style: ['Modern', 'Futuristic', 'Dark'], industry: ['Artificial Intelligence', 'Technology', 'Education'], themeId: 'purple-ai', tags: ['ai', 'generative ai', 'llm'], featured: true, popularity: 98, cardProfile: 'ai' },
  { name: 'AI Engineer Roadmap', description: 'A roadmap-style poster for moving from AI foundations to production systems.', category: 'Technology & AI', subCategory: 'AI Careers', designType: 'Learning Roadmaps', format: 'Roadmap', layoutFamily: 'Timeline Roadmap', style: ['Modern', 'Gradient', 'Dark'], industry: ['Artificial Intelligence', 'Education'], themeId: 'neon-future', tags: ['ai engineer', 'roadmap', 'career'], featured: true, popularity: 97, cardProfile: 'ai' },
  { name: 'Cloud Architecture Overview', description: 'A clear cloud poster covering compute, network, storage, security, and operations.', category: 'Cloud & Infrastructure', subCategory: 'Cloud Architecture', designType: 'Architecture Diagrams', format: 'Architecture Diagram', layoutFamily: 'Architecture Flow', style: ['Corporate', 'Professional', 'Dark'], industry: ['Technology', 'Software Engineering'], themeId: 'corporate-navy', tags: ['cloud', 'architecture', 'infrastructure', 'system design'], featured: true, popularity: 96, cardProfile: 'cloud' },
  { name: 'Python Developer Cheatsheet', description: 'A compact technical cheatsheet for Python syntax, functions, files, and production basics.', category: 'Education & Learning', subCategory: 'Programming', designType: 'Cheatsheets', format: 'Cheatsheet', layoutFamily: 'Cheatsheet Grid', style: ['Minimal', 'Light', 'Professional'], industry: ['Education', 'Software Engineering'], themeId: 'minimal-light', tags: ['python', 'cheatsheet', 'programming'], featured: true, popularity: 95, cardProfile: 'education' },
  { name: 'Product Launch Strategy', description: 'A premium product launch poster for audience, offer, channels, proof, and actions.', category: 'Business & Product', subCategory: 'Product Launch', designType: 'Marketing Posters', format: 'Poster', layoutFamily: 'Hero Promotion', style: ['Bold', 'Professional', 'Gradient'], industry: ['Business', 'Marketing'], themeId: 'orange-energy', tags: ['product launch', 'strategy', 'marketing'], featured: true, popularity: 94, cardProfile: 'business' },
  { name: 'Cybersecurity Essentials', description: 'A security fundamentals poster for identity, threats, data protection, and monitoring.', category: 'Software Engineering', subCategory: 'Security', designType: 'Technical Posters', format: 'Poster', layoutFamily: 'Layered Technology Stack', style: ['Dark', 'Professional', 'Corporate'], industry: ['Technology', 'Software Engineering'], themeId: 'black-gold', tags: ['security', 'cybersecurity', 'auth'], featured: true, popularity: 93, cardProfile: 'engineering' },
  { name: 'Machine Learning Workflow', description: 'A visual workflow for data preparation, training, evaluation, deployment, and monitoring.', category: 'Technology & AI', subCategory: 'Machine Learning', designType: 'Infographics', format: 'Infographic', layoutFamily: 'Process Steps', style: ['Modern', 'Professional', 'Gradient'], industry: ['Artificial Intelligence', 'Education'], themeId: 'tech-blue', tags: ['machine learning', 'workflow', 'data science'], featured: true, popularity: 92, cardProfile: 'ai' },
  { name: 'Machine Learning Lifecycle', description: 'A lifecycle template for dataset, model, validation, release, and feedback loops.', category: 'Technology & AI', subCategory: 'Machine Learning', designType: 'Infographics', format: 'Infographic', layoutFamily: 'Process Steps', style: ['Modern', 'Light'], industry: ['Artificial Intelligence', 'Education'], themeId: 'minimal-light', tags: ['ml lifecycle', 'model training'], popularity: 88, cardProfile: 'ai' },
  { name: 'Neural Networks Explained', description: 'Explain inputs, layers, weights, activation, loss, and optimization in one poster.', category: 'Technology & AI', subCategory: 'Deep Learning', designType: 'Technical Posters', format: 'Poster', layoutFamily: 'Architecture Flow', style: ['Futuristic', 'Dark'], industry: ['Artificial Intelligence', 'Education'], themeId: 'neon-future', tags: ['neural networks', 'deep learning'], popularity: 86, cardProfile: 'ai' },
  { name: 'Prompt Engineering Guide', description: 'A structured prompt design guide covering instructions, examples, constraints, and outputs.', category: 'Technology & AI', subCategory: 'Prompt Engineering', designType: 'Cheatsheets', format: 'Cheatsheet', layoutFamily: 'Cheatsheet Grid', style: ['Purple AI', 'Modern', 'Dark'], industry: ['Artificial Intelligence', 'Education'], themeId: 'purple-ai', tags: ['prompt engineering', 'ai prompts'], popularity: 90, cardProfile: 'ai' },
  { name: 'RAG Architecture', description: 'Explain retrieval augmented generation from documents to embeddings and answers.', category: 'Technology & AI', subCategory: 'RAG', designType: 'Architecture Diagrams', format: 'Architecture Diagram', layoutFamily: 'Architecture Flow', style: ['Modern', 'Professional', 'Dark'], industry: ['Artificial Intelligence', 'Software Engineering'], themeId: 'tech-blue', tags: ['rag', 'retrieval', 'embeddings'], popularity: 91, cardProfile: 'ai' },
  { name: 'AI Agent Workflow', description: 'A workflow poster for agent planning, tools, memory, guardrails, and execution.', category: 'Technology & AI', subCategory: 'AI Agents', designType: 'Architecture Diagrams', format: 'Architecture Diagram', layoutFamily: 'Process Steps', style: ['Futuristic', 'Dark'], industry: ['Artificial Intelligence', 'Software Engineering'], themeId: 'neon-future', tags: ['ai agent', 'tools', 'workflow'], popularity: 89, cardProfile: 'ai' },
  { name: 'Data Science Process', description: 'A complete data science process from question to deployment and measurement.', category: 'Technology & AI', subCategory: 'Data Science', designType: 'Infographics', format: 'Infographic', layoutFamily: 'Timeline Roadmap', style: ['Modern', 'Professional'], industry: ['Artificial Intelligence', 'Education'], themeId: 'green-growth', tags: ['data science', 'analytics', 'workflow'], popularity: 83, cardProfile: 'ai' },
  { name: 'LLM Evaluation Checklist', description: 'A practical evaluation checklist for quality, safety, cost, latency, and regressions.', category: 'Technology & AI', subCategory: 'Evaluation', designType: 'Cheatsheets', format: 'Cheatsheet', layoutFamily: 'Cheatsheet Grid', style: ['Minimal', 'Professional'], industry: ['Artificial Intelligence', 'Technology'], themeId: 'minimal-light', tags: ['llm evaluation', 'quality', 'testing'], premium: true, popularity: 82, cardProfile: 'ai' },
  { name: 'AI Product Requirements', description: 'A product planning template for AI use cases, data, risks, and measurable outcomes.', category: 'Technology & AI', subCategory: 'AI Product', designType: 'Technical Posters', format: 'Poster', layoutFamily: 'Side-by-Side Comparison', style: ['Corporate', 'Professional'], industry: ['Artificial Intelligence', 'Business'], themeId: 'corporate-navy', tags: ['ai product', 'requirements', 'strategy'], popularity: 80, cardProfile: 'business' },
  { name: 'Computer Vision Pipeline', description: 'A visual pipeline for capture, labeling, training, inference, and QA.', category: 'Technology & AI', subCategory: 'Computer Vision', designType: 'Architecture Diagrams', format: 'Architecture Diagram', layoutFamily: 'Architecture Flow', style: ['Modern', 'Dark'], industry: ['Artificial Intelligence', 'Technology'], themeId: 'tech-blue', tags: ['computer vision', 'pipeline'], popularity: 77, cardProfile: 'ai' },
  { name: 'REST API Best Practices', description: 'A software poster for resource design, validation, errors, auth, and versioning.', category: 'Software Engineering', subCategory: 'APIs', designType: 'Cheatsheets', format: 'Cheatsheet', layoutFamily: 'Cheatsheet Grid', style: ['Modern', 'Professional'], industry: ['Software Engineering', 'Technology'], themeId: 'tech-blue', tags: ['rest api', 'backend', 'api design'], popularity: 90, cardProfile: 'engineering' },
  { name: 'Software Development Lifecycle', description: 'A lifecycle poster for planning, building, testing, shipping, and learning.', category: 'Software Engineering', subCategory: 'SDLC', designType: 'Infographics', format: 'Infographic', layoutFamily: 'Timeline Roadmap', style: ['Corporate', 'Professional'], industry: ['Software Engineering', 'Business'], themeId: 'corporate-navy', tags: ['sdlc', 'software process'], popularity: 85, cardProfile: 'engineering' },
  { name: 'DevOps Pipeline', description: 'A CI/CD poster covering code, test, build, release, observe, and rollback.', category: 'Software Engineering', subCategory: 'DevOps', designType: 'Architecture Diagrams', format: 'Architecture Diagram', layoutFamily: 'Process Steps', style: ['Dark', 'Professional'], industry: ['Software Engineering', 'Technology'], themeId: 'green-growth', tags: ['devops', 'ci cd', 'pipeline'], popularity: 87, cardProfile: 'engineering' },
  { name: 'Microservices Architecture', description: 'Explain service boundaries, APIs, data ownership, observability, and resilience.', category: 'Software Engineering', subCategory: 'Architecture', designType: 'Architecture Diagrams', format: 'Architecture Diagram', layoutFamily: 'Architecture Flow', style: ['Modern', 'Dark'], industry: ['Software Engineering', 'Technology'], themeId: 'tech-blue', tags: ['microservices', 'architecture', 'system design'], popularity: 88, cardProfile: 'engineering' },
  { name: 'Database Design Basics', description: 'A database design poster for entities, keys, indexes, queries, and consistency.', category: 'Software Engineering', subCategory: 'Databases', designType: 'Technical Posters', format: 'Poster', layoutFamily: 'Layered Technology Stack', style: ['Professional', 'Dark'], industry: ['Software Engineering', 'Technology', 'Education'], themeId: 'black-gold', tags: ['database design', 'sql', 'schema', 'system design'], popularity: 84, cardProfile: 'engineering' },
  { name: 'Git Workflow', description: 'A clean Git workflow template for branches, commits, reviews, releases, and rollback.', category: 'Software Engineering', subCategory: 'Developer Workflow', designType: 'Cheatsheets', format: 'Cheatsheet', layoutFamily: 'Process Steps', style: ['Minimal', 'Light'], industry: ['Software Engineering', 'Education'], themeId: 'minimal-light', tags: ['git', 'workflow', 'developer'], popularity: 79, cardProfile: 'engineering' },
  { name: 'Clean Code Principles', description: 'A practical clean code poster for naming, functions, tests, and refactoring.', category: 'Software Engineering', subCategory: 'Code Quality', designType: 'Technical Posters', format: 'Poster', layoutFamily: 'Quote and Motivation', style: ['Editorial', 'Professional'], industry: ['Software Engineering', 'Education'], themeId: 'corporate-navy', tags: ['clean code', 'quality', 'refactoring'], popularity: 81, cardProfile: 'engineering' },
  { name: 'Frontend Performance Checklist', description: 'A performance checklist for assets, rendering, network, caching, and metrics.', category: 'Software Engineering', subCategory: 'Frontend', designType: 'Cheatsheets', format: 'Cheatsheet', layoutFamily: 'Cheatsheet Grid', style: ['Modern', 'Dark'], industry: ['Software Engineering', 'Technology'], themeId: 'neon-future', tags: ['frontend performance', 'web vitals'], premium: true, popularity: 78, cardProfile: 'engineering' },
  { name: 'Testing Strategy Pyramid', description: 'A poster for unit, integration, contract, E2E, visual, and regression tests.', category: 'Software Engineering', subCategory: 'Testing', designType: 'Infographics', format: 'Infographic', layoutFamily: 'Layered Technology Stack', style: ['Professional', 'Minimal'], industry: ['Software Engineering', 'Education'], themeId: 'minimal-light', tags: ['testing', 'qa', 'e2e'], popularity: 76, cardProfile: 'engineering' },
  { name: 'Incident Response Flow', description: 'A clear response flow for detect, triage, mitigate, communicate, and review.', category: 'Software Engineering', subCategory: 'Reliability', designType: 'Architecture Diagrams', format: 'Architecture Diagram', layoutFamily: 'Process Steps', style: ['Corporate', 'Dark'], industry: ['Software Engineering', 'Technology'], themeId: 'black-gold', tags: ['incident response', 'sre', 'ops'], popularity: 74, cardProfile: 'engineering' },
  { name: 'Code Review Checklist', description: 'A concise checklist for correctness, readability, security, tests, and maintainability.', category: 'Software Engineering', subCategory: 'Code Review', designType: 'Cheatsheets', format: 'Cheatsheet', layoutFamily: 'Cheatsheet Grid', style: ['Minimal', 'Professional'], industry: ['Software Engineering', 'Education'], themeId: 'minimal-light', tags: ['code review', 'checklist'], popularity: 75, cardProfile: 'engineering' },
  { name: 'AWS Services Overview', description: 'A service overview for compute, storage, networking, databases, and security.', category: 'Cloud & Infrastructure', subCategory: 'AWS', designType: 'Technical Posters', format: 'Poster', layoutFamily: 'Layered Technology Stack', style: ['Corporate', 'Professional'], industry: ['Technology', 'Software Engineering'], themeId: 'orange-energy', tags: ['aws', 'cloud services'], popularity: 86, cardProfile: 'cloud' },
  { name: 'Azure Fundamentals', description: 'A fundamentals poster for Azure compute, identity, storage, network, and monitoring.', category: 'Cloud & Infrastructure', subCategory: 'Azure', designType: 'Technical Posters', format: 'Poster', layoutFamily: 'Layered Technology Stack', style: ['Corporate', 'Dark'], industry: ['Technology', 'Software Engineering'], themeId: 'corporate-navy', tags: ['azure', 'cloud'], popularity: 79, cardProfile: 'cloud' },
  { name: 'Kubernetes Architecture', description: 'A Kubernetes poster for control plane, nodes, pods, services, and observability.', category: 'Cloud & Infrastructure', subCategory: 'Kubernetes', designType: 'Architecture Diagrams', format: 'Architecture Diagram', layoutFamily: 'Architecture Flow', style: ['Modern', 'Dark'], industry: ['Technology', 'Software Engineering'], themeId: 'tech-blue', tags: ['kubernetes', 'containers'], popularity: 84, cardProfile: 'cloud' },
  { name: 'Docker Workflow', description: 'A Docker workflow template for image builds, registry, deployment, and operations.', category: 'Cloud & Infrastructure', subCategory: 'Containers', designType: 'Infographics', format: 'Infographic', layoutFamily: 'Process Steps', style: ['Modern', 'Professional'], industry: ['Software Engineering', 'Technology'], themeId: 'tech-blue', tags: ['docker', 'containers'], popularity: 80, cardProfile: 'cloud' },
  { name: 'CI/CD Pipeline', description: 'A production CI/CD pipeline poster with tests, artifacts, environments, and rollback.', category: 'Cloud & Infrastructure', subCategory: 'Delivery', designType: 'Architecture Diagrams', format: 'Architecture Diagram', layoutFamily: 'Process Steps', style: ['Dark', 'Professional'], industry: ['Software Engineering', 'Technology'], themeId: 'green-growth', tags: ['ci cd', 'pipeline', 'delivery'], popularity: 82, cardProfile: 'cloud' },
  { name: 'Serverless Architecture', description: 'An architecture poster for events, functions, queues, storage, and monitoring.', category: 'Cloud & Infrastructure', subCategory: 'Serverless', designType: 'Architecture Diagrams', format: 'Architecture Diagram', layoutFamily: 'Architecture Flow', style: ['Futuristic', 'Dark'], industry: ['Technology', 'Software Engineering'], themeId: 'neon-future', tags: ['serverless', 'architecture'], popularity: 78, cardProfile: 'cloud' },
  { name: 'Cloud Security Checklist', description: 'A cloud security checklist for identity, network, encryption, audit, and response.', category: 'Cloud & Infrastructure', subCategory: 'Security', designType: 'Cheatsheets', format: 'Cheatsheet', layoutFamily: 'Cheatsheet Grid', style: ['Corporate', 'Dark'], industry: ['Technology', 'Software Engineering'], themeId: 'black-gold', tags: ['cloud security', 'checklist'], popularity: 77, cardProfile: 'cloud' },
  { name: 'Programming Roadmap', description: 'A beginner programming roadmap from fundamentals to projects and deployment.', category: 'Education & Learning', subCategory: 'Programming', designType: 'Learning Roadmaps', format: 'Roadmap', layoutFamily: 'Timeline Roadmap', style: ['Modern', 'Light'], industry: ['Education', 'Software Engineering'], themeId: 'minimal-light', tags: ['programming roadmap', 'learning'], popularity: 84, cardProfile: 'education' },
  { name: 'Study Guide', description: 'A study planning poster for goals, concepts, practice, mistakes, and review.', category: 'Education & Learning', subCategory: 'Study Skills', designType: 'Infographics', format: 'Infographic', layoutFamily: 'Process Steps', style: ['Minimal', 'Light'], industry: ['Education'], themeId: 'minimal-light', tags: ['study guide', 'learning'], popularity: 72, cardProfile: 'education' },
  { name: 'Course Announcement', description: 'A polished course announcement template with outcomes, modules, and enrollment CTA.', category: 'Education & Learning', subCategory: 'Courses', designType: 'Marketing Posters', format: 'Poster', layoutFamily: 'Hero Promotion', style: ['Bold', 'Professional'], industry: ['Education', 'Marketing'], themeId: 'purple-ai', tags: ['course', 'announcement'], popularity: 76, cardProfile: 'education' },
  { name: 'Learning Timeline', description: 'A timeline template for mapping weekly learning stages and milestones.', category: 'Education & Learning', subCategory: 'Timeline', designType: 'Learning Roadmaps', format: 'Roadmap', layoutFamily: 'Timeline Roadmap', style: ['Modern', 'Professional'], industry: ['Education'], themeId: 'green-growth', tags: ['timeline', 'learning roadmap'], popularity: 70, cardProfile: 'education' },
  { name: 'Concept Explanation', description: 'A template for explaining one technical concept with examples and review points.', category: 'Education & Learning', subCategory: 'Explainers', designType: 'Technical Posters', format: 'Poster', layoutFamily: 'Numbered Technical Cards', style: ['Professional', 'Light'], industry: ['Education', 'Technology'], themeId: 'minimal-light', tags: ['concept', 'explainer'], popularity: 73, cardProfile: 'education' },
  { name: 'Exam Preparation', description: 'A structured exam preparation poster for topics, schedule, practice, and review.', category: 'Education & Learning', subCategory: 'Exam Prep', designType: 'Cheatsheets', format: 'Cheatsheet', layoutFamily: 'Cheatsheet Grid', style: ['Corporate', 'Light'], industry: ['Education'], themeId: 'corporate-navy', tags: ['exam', 'preparation'], popularity: 71, cardProfile: 'education' },
  { name: 'Classroom Infographic', description: 'A classroom-ready infographic for summarizing lessons and activities.', category: 'Education & Learning', subCategory: 'Classroom', designType: 'Infographics', format: 'Infographic', layoutFamily: 'Product Feature Grid', style: ['Creative', 'Light'], industry: ['Education'], themeId: 'orange-energy', tags: ['classroom', 'infographic'], popularity: 69, cardProfile: 'education' },
  { name: 'Step-by-Step Tutorial', description: 'A tutorial poster for breaking any workflow into clear beginner-friendly steps.', category: 'Education & Learning', subCategory: 'Tutorials', designType: 'Infographics', format: 'Infographic', layoutFamily: 'Process Steps', style: ['Modern', 'Professional'], industry: ['Education', 'Technology'], themeId: 'tech-blue', tags: ['tutorial', 'steps'], popularity: 74, cardProfile: 'education' },
  { name: 'Startup Growth Strategy', description: 'A startup strategy poster for audience, channels, offer, traction, and metrics.', category: 'Business & Product', subCategory: 'Growth', designType: 'Marketing Posters', format: 'Poster', layoutFamily: 'Process Steps', style: ['Bold', 'Professional'], industry: ['Business', 'Marketing'], themeId: 'green-growth', tags: ['startup', 'growth strategy'], popularity: 83, cardProfile: 'business' },
  { name: 'Product Roadmap', description: 'A product roadmap poster for vision, milestones, releases, and feedback loops.', category: 'Business & Product', subCategory: 'Product', designType: 'Learning Roadmaps', format: 'Roadmap', layoutFamily: 'Timeline Roadmap', style: ['Corporate', 'Professional'], industry: ['Business', 'Technology'], themeId: 'corporate-navy', tags: ['product roadmap', 'planning'], popularity: 81, cardProfile: 'business' },
  { name: 'Business Model Overview', description: 'A business model overview for customer, value, channels, revenue, and costs.', category: 'Business & Product', subCategory: 'Business Model', designType: 'Infographics', format: 'Infographic', layoutFamily: 'Side-by-Side Comparison', style: ['Professional', 'Light'], industry: ['Business', 'Marketing'], themeId: 'minimal-light', tags: ['business model', 'strategy'], popularity: 76, cardProfile: 'business' },
  { name: 'Marketing Funnel', description: 'A funnel poster for awareness, interest, conversion, retention, and measurement.', category: 'Business & Product', subCategory: 'Marketing', designType: 'Marketing Posters', format: 'Poster', layoutFamily: 'Layered Technology Stack', style: ['Bold', 'Gradient'], industry: ['Marketing', 'Business'], themeId: 'orange-energy', tags: ['marketing funnel', 'sales'], popularity: 78, cardProfile: 'business' },
  { name: 'Sales Process', description: 'A sales process poster for prospecting, discovery, demo, proposal, and close.', category: 'Business & Product', subCategory: 'Sales', designType: 'Infographics', format: 'Infographic', layoutFamily: 'Process Steps', style: ['Corporate', 'Professional'], industry: ['Business', 'Marketing'], themeId: 'black-gold', tags: ['sales process', 'business'], popularity: 73, cardProfile: 'business' },
  { name: 'Company Services', description: 'A services overview poster for positioning, benefits, proof, and contact CTA.', category: 'Business & Product', subCategory: 'Services', designType: 'Marketing Posters', format: 'Poster', layoutFamily: 'Product Feature Grid', style: ['Elegant', 'Professional'], industry: ['Business', 'Marketing'], themeId: 'corporate-navy', tags: ['services', 'company'], popularity: 72, cardProfile: 'business' },
  { name: 'Quarterly Highlights', description: 'A quarterly report poster for results, milestones, learnings, and next priorities.', category: 'Business & Product', subCategory: 'Reports', designType: 'Infographics', format: 'Infographic', layoutFamily: 'Product Feature Grid', style: ['Corporate', 'Professional'], industry: ['Business'], themeId: 'tech-blue', tags: ['quarterly report', 'highlights'], popularity: 70, cardProfile: 'business' },
  { name: 'LinkedIn Thought Leadership', description: 'A LinkedIn post template for a professional insight, framework, and CTA.', category: 'Business & Product', subCategory: 'Social Content', designType: 'LinkedIn Posts', format: 'LinkedIn Post', orientation: 'Landscape', layoutFamily: 'Quote and Motivation', style: ['Editorial', 'Professional'], industry: ['Business', 'Marketing'], themeId: 'minimal-light', tags: ['linkedin', 'thought leadership'], popularity: 75, cardProfile: 'social' },
  { name: 'Technology Conference', description: 'A conference poster for agenda, speakers, date, venue, and registration.', category: 'Events & Promotions', subCategory: 'Conference', designType: 'Event Posters', format: 'Poster', layoutFamily: 'Event Poster', style: ['Futuristic', 'Dark', 'Bold'], industry: ['Technology', 'Entertainment'], themeId: 'neon-future', tags: ['technology conference', 'event'], popularity: 82, cardProfile: 'event' },
  { name: 'Webinar Announcement', description: 'A professional webinar announcement poster with topic, value, and registration CTA.', category: 'Events & Promotions', subCategory: 'Webinar', designType: 'Event Posters', format: 'Poster', layoutFamily: 'Event Poster', style: ['Corporate', 'Professional'], industry: ['Business', 'Education'], themeId: 'corporate-navy', tags: ['webinar', 'announcement'], popularity: 78, cardProfile: 'event' },
  { name: 'Coding Workshop', description: 'A workshop poster for beginner-friendly coding sessions and hands-on outcomes.', category: 'Events & Promotions', subCategory: 'Workshop', designType: 'Event Posters', format: 'Poster', layoutFamily: 'Event Poster', style: ['Modern', 'Dark'], industry: ['Software Engineering', 'Education'], themeId: 'tech-blue', tags: ['coding workshop', 'event'], popularity: 77, cardProfile: 'event' },
  { name: 'College Tech Fest', description: 'A high-energy campus tech festival poster for activities, dates, and participation.', category: 'Events & Promotions', subCategory: 'Festival', designType: 'Event Posters', format: 'Poster', layoutFamily: 'Hero Promotion', style: ['Creative', 'Gradient', 'Bold'], industry: ['Education', 'Entertainment'], themeId: 'purple-ai', tags: ['college tech fest', 'festival'], popularity: 73, cardProfile: 'event' },
  { name: 'Music Event', description: 'A bold event poster for lineup, venue, date, mood, and ticket CTA.', category: 'Events & Promotions', subCategory: 'Music', designType: 'Event Posters', format: 'Poster', layoutFamily: 'Image and Content Split', style: ['Bold', 'Creative', 'Dark'], industry: ['Entertainment'], themeId: 'black-gold', tags: ['music event', 'concert'], popularity: 74, cardProfile: 'event' },
  { name: 'Product Launch Event', description: 'A launch event poster for reveal, demo, benefits, and signup information.', category: 'Events & Promotions', subCategory: 'Launch', designType: 'Event Posters', format: 'Poster', layoutFamily: 'Hero Promotion', style: ['Bold', 'Professional'], industry: ['Business', 'Marketing'], themeId: 'orange-energy', tags: ['product launch event', 'event'], popularity: 76, cardProfile: 'event' },
  { name: 'Restaurant Promotion', description: 'A local restaurant promotion poster for offer, menu highlights, and visit CTA.', category: 'Events & Promotions', subCategory: 'Restaurant', designType: 'Marketing Posters', format: 'Poster', layoutFamily: 'Image and Content Split', style: ['Elegant', 'Bold'], industry: ['Food', 'Marketing'], themeId: 'orange-energy', tags: ['restaurant', 'promotion', 'food'], popularity: 70, cardProfile: 'lifestyle' },
  { name: 'Fitness Challenge', description: 'A fitness challenge poster for goal, routine, community, and signup CTA.', category: 'Events & Promotions', subCategory: 'Fitness', designType: 'Marketing Posters', format: 'Poster', layoutFamily: 'Hero Promotion', style: ['Bold', 'Modern'], industry: ['Fitness', 'Marketing'], themeId: 'green-growth', tags: ['fitness challenge', 'health'], popularity: 71, cardProfile: 'lifestyle' },
  { name: 'Instagram Product Tips', description: 'A square social post template for product education and quick actionable tips.', category: 'Business & Product', subCategory: 'Instagram', designType: 'Instagram Posts', format: 'Instagram Post', orientation: 'Square', layoutFamily: 'Product Feature Grid', style: ['Modern', 'Light'], industry: ['Marketing', 'Business'], themeId: 'minimal-light', tags: ['instagram', 'product tips'], popularity: 69, cardProfile: 'social' },
  { name: 'YouTube Tech Thumbnail', description: 'A 16:9 thumbnail template for technical tutorials and bold visual hierarchy.', category: 'Technology & AI', subCategory: 'Video', designType: 'YouTube Thumbnails', format: 'YouTube Thumbnail', orientation: 'Landscape', layoutFamily: 'Hero Promotion', style: ['Bold', 'Dark', 'Futuristic'], industry: ['Technology', 'Education'], themeId: 'neon-future', tags: ['youtube thumbnail', 'tech tutorial'], popularity: 80, cardProfile: 'social' },
  { name: 'Blog Hero: AI Trends', description: 'A blog hero template for technical articles, trend reports, and launch posts.', category: 'Technology & AI', subCategory: 'Blog Hero', designType: 'Blog Hero Images', format: 'Blog Hero', orientation: 'Landscape', layoutFamily: 'Image and Content Split', style: ['Editorial', 'Professional'], industry: ['Artificial Intelligence', 'Technology'], themeId: 'purple-ai', tags: ['blog hero', 'ai trends'], popularity: 72, cardProfile: 'social' },
  { name: 'Healthcare Awareness', description: 'A calm awareness poster for healthcare education, benefits, and next actions.', category: 'Education & Learning', subCategory: 'Healthcare', designType: 'Infographics', format: 'Infographic', layoutFamily: 'Process Steps', style: ['Minimal', 'Light', 'Professional'], industry: ['Healthcare', 'Education'], themeId: 'green-growth', tags: ['healthcare', 'awareness'], premium: true, popularity: 67, cardProfile: 'lifestyle' },
  { name: 'Travel Destination Guide', description: 'A destination guide template for highlights, itinerary, tips, and booking CTA.', category: 'Events & Promotions', subCategory: 'Travel', designType: 'Marketing Posters', format: 'Poster', layoutFamily: 'Image and Content Split', style: ['Creative', 'Editorial'], industry: ['Travel', 'Marketing'], themeId: 'orange-energy', tags: ['travel', 'destination'], popularity: 68, cardProfile: 'lifestyle' },
  { name: 'Real Estate Open House', description: 'An open house promotion poster for property highlights, location, and visit details.', category: 'Business & Product', subCategory: 'Real Estate', designType: 'Marketing Posters', format: 'Poster', layoutFamily: 'Image and Content Split', style: ['Elegant', 'Professional'], industry: ['Real Estate', 'Marketing'], themeId: 'black-gold', tags: ['real estate', 'open house'], premium: true, popularity: 66, cardProfile: 'business' },
];

export const TECH_POSTER_TEMPLATES: TechPosterTemplate[] = TEMPLATE_SEEDS.map(makeTemplate);

export const VALID_TECH_POSTER_TEMPLATES = TECH_POSTER_TEMPLATES.filter((template) => validateTemplate(template).valid);

export function validateTemplate(template: TechPosterTemplate) {
  const problems: string[] = [];
  if (!template.id || !template.name) problems.push('Missing id or name');
  if (!template.posterSpec?.title) problems.push('Missing PosterSpec title');
  if (!Array.isArray(template.posterSpec?.cards) || template.posterSpec.cards.length < 3) problems.push('PosterSpec requires at least three cards');
  if (!template.width || !template.height) problems.push('Missing dimensions');
  if (!template.themeId) problems.push('Missing theme');
  return { valid: problems.length === 0, problems };
}

export function templateSearchText(template: TechPosterTemplate) {
  return [
    template.name,
    template.description,
    template.category,
    template.subCategory,
    template.designType,
    template.format,
    template.orientation,
    template.aspectRatio,
    template.layoutFamily,
    template.style.join(' '),
    template.industry.join(' '),
    THEME_LABELS[template.themeId],
    template.tags.join(' '),
    template.posterSpec.title,
    template.posterSpec.subtitle,
    template.posterSpec.description,
  ].join(' ').toLowerCase();
}

export function getThemeLabel(themeId: PosterSpecThemeId) {
  return THEME_LABELS[themeId];
}
