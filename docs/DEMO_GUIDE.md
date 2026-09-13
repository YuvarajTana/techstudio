# TECKSTUDIO — Complete Project Demo Guide

## 1. Project Overview

### What Is TECKSTUDIO?

TECKSTUDIO is a full-stack, AI-powered design platform that enables users to create professional posters, thumbnails, social media posts, and marketing materials. It combines a Canva-like canvas editor with generative AI capabilities, allowing users to generate designs from text prompts, customize every element, and export in multiple formats.

### Problem Being Solved

Professional design tools are either too complex (Photoshop, Illustrator) or too limited (basic online editors). TECKSTUDIO bridges this gap by providing an intuitive, AI-assisted design experience where users describe what they want in natural language and get a fully editable design they can refine and export.

### Target Users

- Small business owners creating marketing materials
- Social media managers producing content at scale
- Event organizers designing invitations and posters
- Students and educators creating presentations
- Freelance designers seeking rapid prototyping

### Key Statistics

| Metric | Count |
|--------|-------|
| Frontend source files | 112 TypeScript/TSX files |
| Frontend lines of code | ~34,300 |
| Backend lines of code | ~16,500 |
| Database models | 35 tables |
| API route files | 20 modules |
| API endpoint functions | ~340 |
| Template categories | 27 pre-seeded |
| Design presets | 26 dimensions |
| Shape types | 15+ |
| Font families | 20+ |
| AI providers | 4 (Gemini, OpenAI, Stability, Pollinations) |

### Demo Opening Script

> "Good morning everyone. My project is TECKSTUDIO — an AI-powered design platform that allows users to create professional posters, thumbnails, and marketing materials using artificial intelligence. The application features a full canvas editor with real-time collaboration tools, AI-assisted design generation, a template library with 27 industry categories, brand kit management, and multi-format export. The system is built with React and Fabric.js on the frontend, Python FastAPI on the backend, MySQL for persistence, and integrates with multiple AI providers including Google Gemini, OpenAI, and Pollinations for image generation."

---

## 2. Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI component framework |
| TypeScript | 6.x | Type-safe JavaScript |
| Vite | 8.x | Build tool and dev server |
| Tailwind CSS | 4.x | Utility-first styling |
| Fabric.js | 5.x | HTML5 Canvas manipulation library |
| Zustand | 5.x | Lightweight state management |
| React Router | 7.x | Client-side routing |
| Lucide React | 1.22.x | Icon library |

**Why these choices:**
- **Fabric.js** provides a powerful object model for canvas manipulation (shapes, text, images, groups) with built-in selection, transformation, and serialization to JSON.
- **Zustand** was chosen over Redux for its simplicity — a single store with no boilerplate, perfect for canvas state that changes rapidly.
- **Vite** provides instant HMR during development and optimized production builds.

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.10+ | Runtime |
| FastAPI | Latest | Async web framework |
| SQLAlchemy | Latest | ORM for MySQL |
| Pydantic | Latest | Data validation and settings |
| python-jose | Latest | JWT token handling |
| bcrypt | Latest | Password hashing |
| Uvicorn | Latest | ASGI server |
| PyMySQL | Latest | MySQL driver |
| Pillow (PIL) | Latest | Server-side image processing |

**Why FastAPI:** Automatic OpenAPI docs, async support, Pydantic validation, and high performance for AI proxy calls.

### Database

| Technology | Purpose |
|------------|---------|
| MySQL 9.x | Primary relational database |
| SQLAlchemy ORM | Model definition and queries |
| Auto-migration | Schema evolution on startup |

**35 Database Tables:**
- **Core:** users, auth_sessions, projects, design_versions
- **Templates:** templates, categories, template_subcategories, template_favourites, template_usage
- **Brand:** brand_kits, brand_colors, brand_fonts, brand_logos
- **Assets:** assets, uploaded_assets, font_assets, generated_assets, processed_images
- **AI:** chat_sessions, chat_messages, generation_jobs
- **Social:** shared_designs, favorites, notifications
- **Elements:** element_categories, element_favorites, element_recent_items, element_collections, element_collection_items
- **System:** deleted_items, content_calendar_events, audit_logs, feature_flags, recent_history, export_metadata

### AI Providers

| Provider | Models | Capabilities | Status |
|----------|--------|-------------|--------|
| Google Gemini | gemini-2.0-flash, gemini-2.5-flash-image | Chat, poster planning, image generation | Primary |
| OpenAI | gpt-4o-mini, gpt-image-1 | Chat, image generation | Fallback |
| Stability AI | stable-image-core | Image generation | Optional |
| Pollinations | flux, text | Free image/chat fallback | Always available |

**Multi-provider fallback chain:** The system tries providers in configurable order (default: OpenAI → Gemini → Stability → Pollinations). If one fails (quota, timeout, error), it automatically falls back to the next. This ensures the AI features work even when a paid provider is unavailable.

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER BROWSER                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  React Frontend (Vite, port 5173)               │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐│    │
│  │  │Dashboard │ │ Editor   │ │ Templates Page   ││    │
│  │  │(Home)    │ │(Canvas)  │ │(Browsing)        ││    │
│  │  └──────────┘ └────┬─────┘ └──────────────────┘│    │
│  │                     │                            │    │
│  │  ┌─────────────────┴────────────────────────┐   │    │
│  │  │     Fabric.js Canvas Engine              │   │    │
│  │  │  (Shapes, Text, Images, Groups, Paths)   │   │    │
│  │  └─────────────────┬────────────────────────┘   │    │
│  │                     │                            │    │
│  │  ┌─────────────────┴────────────────────────┐   │    │
│  │  │     Zustand Store (State Management)     │   │    │
│  │  │  (Selection, History, Canvas, Projects)  │   │    │
│  │  └─────────────────┬────────────────────────┘   │    │
│  └─────────────────────┼────────────────────────────┘    │
│                        │ HTTP/JSON API                    │
└────────────────────────┼────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────┐
│  FastAPI Backend (port 5001)                             │
│  ┌─────────────────────┴────────────────────────┐       │
│  │           20 Route Modules                   │       │
│  │  auth, projects, templates, ai, ai_poster,   │       │
│  │  brand_kits, assets, stickers, fonts, images,│       │
│  │  shared, favorites, categories, qrcode,      │       │
│  │  charts, notifications, content_calendar,    │       │
│  │  audit_logs, feature_flags, elements         │       │
│  └──────┬──────────────┬──────────────┬─────────┘       │
│         │              │              │                   │
│  ┌──────┴──────┐ ┌─────┴─────┐ ┌─────┴──────────┐     │
│  │  MySQL DB   │ │ AI Prox   │ │ Media Storage  │     │
│  │  (35 tables)│ │ (4 provid)│ │ (local /media) │     │
│  └─────────────┘ └───────────┘ └────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Request Flow

1. **User** interacts with React UI (clicks "Generate Poster")
2. **Frontend** sends POST request to `/api/ai/generate-poster` with prompt
3. **FastAPI** receives request, validates with Pydantic
4. **AI Router** tries configured provider (e.g., Gemini)
5. **Gemini API** returns poster design JSON + image
6. **Backend** normalizes data, saves to database, returns response
7. **Frontend** receives response, loads Fabric.js canvas data
8. **Fabric.js** renders editable objects on HTML5 Canvas
9. **User** edits elements, history is saved via `PUT /api/projects/:id`
10. **Export** serializes canvas to PNG/JPG/SVG/PDF

---

## 4. Module-by-Module Demo Guide

### Module 1: Authentication System

**What it does:** User registration, login, session management, and JWT-based authentication.

**Why required:** Protects user projects, enables sharing, and personalizes the experience.

**User interaction:**
- Register with name, email, password
- Login with email and password
- Automatic session persistence via localStorage token

**Frontend files:**
- `components/auth/AuthPages.tsx` — Login/Register form with validation
- `services/apiClient.ts` — `getAuthToken()` reads token from localStorage, `apiFetch()` adds Authorization header

**Backend files:**
- `routes/auth.py` — `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`
- `auth.py` — JWT creation (`create_token`), verification (`decode_token`), password hashing (bcrypt), session tracking (`AuthSession` model)

**API calls:**
```
POST /api/auth/register  → { token, user }
POST /api/auth/login     → { token, user }
GET  /api/auth/me        → { id, name, email }
POST /api/auth/logout    → { message }
```

**Data storage:**
- `users` table: id, name, email, password_hash, avatar_url, created_at
- `auth_sessions` table: id, user_id, token_hash, user_agent, ip_address, expires_at, revoked_at

**Technical challenge solved:** Password hashing uses bcrypt with SHA-256 pre-hashing for uniform input length. Legacy SHA-256 hashes are transparently re-hashed to bcrypt on next login.

---

### Module 2: Dashboard

**What it does:** Central hub showing recent designs, quick-create options, template browsing, brand kits, and shared designs.

**Why required:** Entry point for all user workflows — creating new designs, browsing templates, managing brands.

**User interaction:**
- View recent designs with thumbnails
- Quick-create with design presets (Poster, Instagram, YouTube, etc.)
- Navigate to Templates, Projects, Brand Hub, Shared, Trash pages
- AI entry points: Chat, Poster Generator, Image Generator

**Frontend files:**
- `components/dashboard/Dashboard.tsx` (1,847 lines) — Main dashboard with 6 pages: home, projects, templates, brand-hub, shared, trash
- `utils/designPresets.ts` — 26 centralized design presets (poster, instagram-post, youtube-thumbnail, presentation, business-card, etc.)

**Key design presets:**
| Preset | Dimensions | Use Case |
|--------|-----------|----------|
| Poster | 800×1132 | Marketing posters |
| Instagram Post | 1080×1080 | Social media |
| Instagram Story | 1080×1920 | Stories/Reels |
| YouTube Thumbnail | 1280×720 | Video thumbnails |
| LinkedIn Post | 1200×627 | Professional posts |
| Presentation | 1920×1080 | Slides |
| Business Card | 1050×600 | Print cards |

**Data flow:** Dashboard fetches projects via `GET /api/projects`, templates via `GET /api/templates`, and brand kits via `GET /api/brand-kits`.

---

### Module 3: Canvas Editor

**What it does:** Professional design canvas with real-time manipulation of shapes, text, images, and other elements.

**Why required:** Core of the application — where all design work happens.

**User interaction:**
- Add shapes (15+ types), text, images, stickers
- Select, move, resize, rotate elements
- Multi-select and group/ungroup
- Draw freehand or with pen tool
- Edit properties (fill, stroke, opacity, shadow)
- Undo/Redo with full history
- Zoom, pan, grid, rulers, smart guides

**Frontend files:**
- `Editor.tsx` — Editor layout with toolbar, sidebar, canvas, right panel
- `components/editor/CanvasWorkspace.tsx` — Fabric.js canvas initialization, selection handling, drag-and-drop
- `components/editor/Toolbar.tsx` — Top toolbar (undo, redo, export, share)
- `components/editor/Sidebar.tsx` — Left panel (templates, elements, text, draw, uploads, pages, layers, history)
- `components/editor/ElementToolbar.tsx` — Floating toolbar above selected elements
- `components/editor/ContextMenu.tsx` — Right-click context menu
- `components/editor/PropertiesPanel.tsx` — Right panel properties
- `store/useEditorStore.ts` — Zustand store (canvas state, selection, history, project data)

**Canvas engine (Fabric.js):**
- Object model: `fabric.Rect`, `fabric.Circle`, `fabric.Textbox`, `fabric.Image`, `fabric.Group`, `fabric.Path`
- Selection: `selection:created`, `selection:updated`, `selection:cleared` events
- Serialization: `canvas.toJSON()` / `canvas.loadFromJSON()` for save/load
- Viewport: `viewportTransform` for zoom/pan

**State management (Zustand):**
```typescript
// Key store properties
canvas: fabric.Canvas | null
selectedObject: fabric.Object | null
zoom: number
history: string[]        // JSON snapshots for undo/redo
historyIndex: number
projectId: string | null
canvasWidth: number
canvasHeight: number
```

**Save flow:**
1. User edits canvas → `object:modified` event fires
2. `saveHistory()` serializes canvas to JSON
3. PUT request to `/api/projects/:id` with canvas data
4. Backend saves to `projects` table + creates `design_versions` record

---

### Module 4: AI Poster Generator

**What it does:** Generates complete poster designs from text prompts using AI, including layout, colors, typography, and imagery.

**Why required:** Core AI feature — transforms natural language into editable designs.

**User interaction:**
1. User types a prompt (e.g., "Modern tech startup launch poster")
2. System generates a complete poster with:
   - Background image (AI-generated)
   - Heading and subtitle text
   - Color palette
   - Layout composition
3. Poster loads onto canvas as editable elements
4. User can modify any element

**Frontend files:**
- `components/editor/AIAssistant.tsx` — AI Studio panel with poster generator, image generator, chat
- `services/aiClient.ts` — AI API client
- `utils/posterSpecRenderer.ts` — Renders poster specifications onto Fabric.js canvas

**Backend files:**
- `routes/ai.py` (2,828 lines) — Main AI router with:
  - `POST /api/ai/generate-poster` — Generates poster design JSON via Gemini
  - `POST /api/ai/generate-image` — Generates images via provider chain
  - `POST /api/ai/generate-image-prompt` — Enhances prompts for better image generation
  - `POST /api/ai/chat` — AI chat assistant
  - `GET /api/ai/health` — Provider health check
- `routes/ai_poster.py` (1,600 lines) — Complete poster pipeline:
  - `POST /api/ai-poster/generate` — Full poster with AI image
  - `POST /api/ai-poster/analyze` — Analyzes prompt for design parameters
  - Provider chain: OpenAI → Gemini → Stability → Pollinations
  - PIL-based poster preview rendering (fallback when no image provider works)

**AI integration flow:**
```
User prompt → Backend analyzes prompt → Builds Gemini/OpenAI request
→ Provider returns design JSON + image → Backend normalizes
→ Returns to frontend → Fabric.js renders editable canvas
```

**Multi-provider fallback:**
```python
# Image generation tries providers in order
for provider in ["openai", "gemini", "stability", "pollinations"]:
    result = generate_image(provider, prompt, width, height)
    if result["success"]:
        return result
    record_provider_health(provider, False, error_category)
# If all fail, return structured error (no fake/placeholder images)
```

---

### Module 5: AI Chat Assistant

**What it does:** Conversational AI assistant that provides design advice, suggests layouts, generates color palettes, and helps with copywriting.

**Why required:** Helps users who aren't design experts make better design decisions.

**User interaction:**
- Ask design questions ("What colors work for a fitness poster?")
- Get layout suggestions
- Request color palette recommendations
- Ask for headline variations

**Backend implementation:**
- `POST /api/ai/chat` — Routes to Gemini → OpenAI → Pollinations
- System prompt: "You are TECKSTUDIO AI Chat, a concise senior design assistant"
- Conversation history maintained per session
- Chat sessions stored in `chat_sessions` and `chat_messages` tables

---

### Module 6: AI Image Generator

**What it does:** Generates images from text prompts using multiple AI providers.

**Why required:** Provides visual assets for designs without requiring external tools.

**User interaction:**
- Enter image description
- Choose style (photorealistic, digital art, cinematic, etc.)
- Select aspect ratio
- Generate and add to canvas

**Provider chain:**
1. **OpenAI gpt-image-1** — Highest quality, requires API key
2. **Gemini gemini-2.5-flash-image** — Good quality, requires API key
3. **Stability AI** — Good quality, requires API key
4. **Pollinations flux** — Free, no key needed, always available

**Image persistence:**
- Generated images saved to `backend/media/generated_assets/`
- Record created in `generated_assets` table
- Public URL served via FastAPI static files

---

### Module 7: Templates System

**What it does:** Library of pre-designed templates that users can browse, preview, and apply to their designs.

**Why required:** Accelerates design creation — users start from professional layouts instead of blank canvases.

**User interaction:**
1. Browse templates by category (27 categories) or type (Posters, Instagram, YouTube, etc.)
2. Search by keyword
3. Filter by type, category, sort order
4. Preview template details in modal
5. "Use Template" — creates new project from template
6. "Apply to Canvas" — applies template to current open project
7. "AI Remix" — generates AI variation of template
8. "Quick Replace" — batch replace colors, fonts, text, images

**Frontend files:**
- `components/templates/TemplatesPage.tsx` — Full browsing page
- `components/templates/TemplateCard.tsx` — Template card with dynamic aspect ratio
- `components/templates/TemplatePreviewModal.tsx` — Preview modal with keyboard navigation
- `components/templates/TemplateDetailPage.tsx` — Detail view with phase 2 actions
- `components/templates/TemplatePhaseTwoActions.tsx` — AI Remix, Quick Replace, Brand Kit
- `hooks/useTemplatesData.ts` — Data fetching with filters
- `services/templatesApi.ts` — API client

**Backend endpoints:**
```
GET    /api/templates              — List with search, type, category, ratio filtering
GET    /api/templates/categories   — 27 categories with subcategories
GET    /api/templates/:id          — Template detail
GET    /api/templates/:id/related  — Scored related templates
POST   /api/templates/:id/use      — Create new project from template
POST   /api/templates/:id/apply    — Apply template to existing project
POST   /api/templates/:id/remix    — AI remix with palette/font/text changes
POST   /api/templates/:id/quick-replace — Batch replace template elements
POST   /api/templates/:id/favourite — Toggle favourite
DELETE /api/templates/:id/favourite — Remove favourite
```

**Template data structure:**
- `data` field contains Fabric.js JSON (fully editable canvas)
- Templates are normalized on load: viewport transform, object names, text styles
- Canvas dimensions preserved from template definition

---

### Module 8: Elements Panel

**What it does:** Provides shapes, stickers, frames, grids, charts, and other design elements.

**Why required:** Gives users building blocks for custom designs.

**Frontend files:**
- `components/editor/ElementsPanel.tsx` — Main elements panel with categories
- `components/editor/StickersPanel.tsx` — Sticker browser
- `components/editor/FontBrowserPanel.tsx` — Font browser
- `utils/shapeRegistry.ts` — 129 shapes across 14 categories
- `utils/graphicsRegistry.ts` — 39 SVG graphics across 7 categories
- `utils/animationRegistry.ts` — 44 animations across 12 categories
- `utils/formsRegistry.ts` — 26 form templates across 5 categories

**Element types:**
- Shapes: Rectangle, Circle, Triangle, Diamond, Pentagon, Hexagon, Star, Heart, Arrow, etc.
- Stickers: Categorized SVG illustrations
- Frames: Photo frame containers with clip paths
- Charts: Bar, pie, line charts via Canvas API
- Forms: Business cards, certificates, resumes

---

### Module 9: Brand Kit Management

**What it does:** Manages brand identity (colors, fonts, logos) that can be applied to any design.

**Why required:** Ensures brand consistency across all designs.

**User interaction:**
- Create brand kits with company name, industry, description
- Add brand colors with roles (primary, secondary, accent)
- Add brand fonts with roles (heading, body)
- Upload brand logos
- Apply brand kit to any template or design

**Backend:** `routes/brand_kits.py` (833 lines) — Full CRUD for brand kits, colors, fonts, logos

**Database tables:** brand_kits, brand_colors, brand_fonts, brand_logos

---

### Module 10: Layers & History

**What it does:** Manages element ordering (z-index) and provides undo/redo functionality.

**Why required:** Essential for complex designs with overlapping elements.

**Layers panel:**
- Lists all canvas objects in reverse z-order
- Drag-and-drop reordering
- Lock/unlock, show/hide, rename, delete per layer
- Bulk lock/unlock all
- Search/filter layers

**History system:**
- Every canvas modification creates a JSON snapshot
- Undo (Ctrl+Z) restores previous snapshot
- Redo (Ctrl+Y) moves forward
- History panel shows all snapshots
- Autosave triggers on every history change

**Frontend:** `components/editor/HistoryPanel.tsx`, `components/editor/LayerItem.tsx`

---

### Module 11: Export System

**What it does:** Exports canvas designs to multiple formats with quality control.

**Why required:** Users need to download their designs for print, web, or social media.

**Supported formats:**
- **PNG** — Transparent background, 2x multiplier
- **JPG** — White background, 95% quality
- **SVG** — Vector format for scalability
- **PDF** — Print-ready via jsPDF

**DPI presets:** 72 (web), 150 (standard), 300 (print), 600 (high-res print)

**Implementation:** `components/editor/ExportSettings.tsx` — Export modal with format/quality/DPI selection. Uses `canvas.toDataURL()` for raster formats and `canvas.toSVG()` for vector.

---

### Module 12: Design Sharing

**What it does:** Generates shareable links for designs with access control.

**Why required:** Enables collaboration and client review.

**User interaction:**
- Share via link (generates token-based URL)
- Share via email
- Set access level: Private, Link (anyone with link), Public
- View shared designs at `/view/:token`

**Backend:** `routes/shared.py` — Token generation, access validation, design preview

---

### Module 13: Assets Library

**What it does:** Provides royalty-free images, SVG elements, gradients, and colors.

**Why required:** Gives users ready-to-use visual assets without leaving the editor.

**Features:**
- Royalty-free image search (via API)
- 40+ curated SVG elements
- Gradient overlays
- Solid color palettes
- Image upload and management

**Backend:** `routes/assets.py` (645 lines) — Asset CRUD, search, licensing metadata

---

### Module 14: Advanced Editor Tools

**What it does:** Professional editing features for precision work.

**Tools:**
- **Grid overlay** with snap-to-grid
- **Rulers** (horizontal/vertical)
- **Smart guides** (alignment snapping)
- **Distance measurement** between objects
- **Zoom controller** (10%-500%)
- **Dev mode inspector** (object properties)
- **Alignment tools** (align to page: left, center, right, top, middle, bottom)
- **Floating toolbar** (quick actions above selected element)
- **Three-dot menu** (layer, align, transform, group, duplicate, delete)
- **Keyboard shortcuts** (Ctrl+Z, Ctrl+C, Ctrl+V, Ctrl+D, Ctrl+G, etc.)

---

### Module 15: Additional Features

**QR Code Generator:** `routes/qrcode.py` — Generate QR codes for URLs/text

**Chart Builder:** `routes/charts.py` — Create bar, pie, line charts

**Content Planner:** `routes/content_calendar.py` — Schedule social media posts

**Notifications:** `routes/notifications.py` — In-app notification system

**Audit Logs:** `routes/audit_logs.py` — Track user actions for compliance

**Feature Flags:** `routes/feature_flags.py` — Toggle features without deployment

---

## 5. Database Schema Overview

### Core Tables

| Table | Records | Purpose |
|-------|---------|---------|
| users | Per-user | User accounts with bcrypt passwords |
| auth_sessions | Per-login | JWT session tracking with revocation |
| projects | Per-design | Canvas data (Fabric.js JSON), dimensions, metadata |
| design_versions | Per-save | Version history snapshots |

### Template Tables

| Table | Purpose |
|-------|---------|
| templates | Template library with Fabric.js canvas data |
| categories | 27 industry categories (Social Media, Marketing, Events, etc.) |
| template_subcategories | Sub-category grouping |
| template_favourites | User-template favourite mapping |
| template_usage | Tracks which templates are used |

### Brand Tables

| Table | Purpose |
|-------|---------|
| brand_kits | Brand identity containers |
| brand_colors | Color palettes with roles |
| brand_fonts | Font collections with roles |
| brand_logos | Logo uploads (base64) |

### Asset Tables

| Table | Purpose |
|-------|---------|
| assets | SVG/icon library with licensing metadata |
| uploaded_assets | User-uploaded images |
| font_assets | Uploaded custom fonts |
| generated_assets | AI-generated images |
| processed_images | Background-removed or filtered images |

### AI Tables

| Table | Purpose |
|-------|---------|
| chat_sessions | AI chat conversation threads |
| chat_messages | Individual chat messages |
| generation_jobs | AI generation job tracking |

### System Tables

| Table | Purpose |
|-------|---------|
| shared_designs | Share links with access tokens |
| favorites | User favourites (templates, projects, assets) |
| deleted_items | Soft-delete with restore capability |
| notifications | In-app notifications |
| content_calendar_events | Social media scheduling |
| audit_logs | Action tracking |
| feature_flags | Feature toggle system |
| recent_history | User activity tracking |
| export_metadata | Export history |

---

## 6. Infrastructure & Configuration

### Environment Variables (`.env`)

```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=***
DB_NAME=teckstudio

# JWT Authentication
JWT_SECRET=your-strong-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRY_DAYS=7

# AI Providers (configure at least one)
GEMINI_API_KEY=***
OPENAI_API_KEY=***
STABILITY_API_KEY=***

# Server
HOST=0.0.0.0
PORT=5001
```

### Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 5173 | http://localhost:5173 |
| Backend (Uvicorn) | 5001 | http://localhost:5001 |
| MySQL | 3306 | localhost:3306 |

### Run Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
python3 -m uvicorn main:app --port 5001 --reload

# Frontend
cd frontend
npm install
npm run dev
```

### CORS Configuration

The backend allows requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:5174` (alternate port)
- `http://localhost:3000` (alternative)
- Any `localhost` or `127.0.0.1` port (regex match)

---

## 7. Complete Workflow Demo Script

### Demo Flow 1: AI Poster Generation

1. **Login** → Show registration/login form
2. **Dashboard** → Show recent designs, quick-create options
3. **Create Design** → Click "Poster" preset (800×1132)
4. **AI Studio** → Open AI panel, type "Modern tech startup launch poster with gradient background"
5. **Generate** → Watch AI generate poster with image
6. **Edit** → Select heading text, change to company name
7. **Add Elements** → Add shapes, stickers from Elements panel
8. **Layers** → Reorder elements, lock background
9. **Brand Kit** → Apply brand colors and fonts
10. **Export** → Export as PNG at 300 DPI

### Demo Flow 2: Template Customization

1. **Templates Page** → Browse 27 categories
2. **Filter** → Select "Social Media" → "Instagram Posts"
3. **Preview** → Click template to see details
4. **Use Template** → Creates new project with template data
5. **Edit** → Modify text, colors, images
6. **Share** → Generate shareable link
7. **View** → Open share link in new tab

### Demo Flow 3: Canvas Editor Features

1. **Add Shapes** → Rectangle, Circle, Star from Elements panel
2. **Add Text** → Heading and body text with font selection
3. **Upload Image** → Drag-and-drop photo
4. **Multi-select** → Shift+click to select multiple objects
5. **Group** → Ctrl+G to group selected objects
6. **Align** → Right-click → Align to Page → Center
7. **Draw** → Freehand drawing with brush tool
8. **Undo/Redo** → Ctrl+Z / Ctrl+Y through history
9. **Zoom** → Zoom controller to 150%
10. **Export** → Download as JPG

---

## 8. Technical Challenges Solved

### 1. Multi-Provider AI Fallback
**Challenge:** AI providers have quotas, outages, and varying response formats.
**Solution:** Configurable provider chain with health tracking, error categorization, and automatic fallback. No placeholder/fake images — structured errors when all providers fail.

### 2. Canvas State Synchronization
**Challenge:** Keeping React state, Fabric.js canvas, and backend database in sync.
**Solution:** Zustand store bridges React and Fabric.js. Canvas events trigger store updates. Store changes trigger API calls. Optimistic updates with error recovery.

### 3. Template Data Normalization
**Challenge:** Templates from different sources have inconsistent Fabric.js JSON.
**Solution:** Backend normalizes viewport transforms, text styles, object names, and backgrounds before serving to frontend.

### 4. Real-Time Selection Toolbar
**Challenge:** Floating toolbar must follow selected element during zoom/pan/drag.
**Solution:** Toolbar uses `getBoundingRect()` with viewport transform math. Repositions on every `after:render`, `object:modified`, `object:scaling` event.

### 5. Large Canvas Serialization
**Challenge:** Complex canvases with many objects produce large JSON payloads.
**Solution:** Compact JSON serialization, incremental saves (only on modification), and version history with lazy loading.

### 6. Image Generation Pipeline
**Challenge:** AI-generated images need validation, storage, and database tracking.
**Solution:** `persistence.py` handles image byte reading (data URLs and HTTP), MIME validation, PIL dimension verification, local file storage, and database record creation.

---

## 9. Future Improvements

| Area | Improvement |
|------|-------------|
| **Real-time Collaboration** | WebSocket-based multi-user editing (like Figma) |
| **Version Branching** | Branch/merge design versions |
| **Advanced AI** | Style transfer, image inpainting, background replacement |
| **Video Export** | Animated poster export via Canvas recording |
| **Plugin System** | Third-party extensions for custom elements |
| **Mobile Responsive** | Touch-optimized editor for tablets |
| **Print Integration** | Direct print with bleed marks and crop marks |
| **Cloud Storage** | AWS S3 / GCS for asset storage |
| **Analytics** | Usage analytics dashboard for template popularity |
| **Accessibility** | WCAG 2.1 AA compliance for all UI components |

---

## 10. Quick Reference Card

### Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `backend/routes/ai.py` | 2,828 | AI integration (chat, image, poster) |
| `backend/routes/ai_poster.py` | 1,600 | Poster generation pipeline |
| `backend/routes/templates.py` | 1,283 | Template CRUD and management |
| `backend/database.py` | 1,272 | 35 SQLAlchemy models |
| `backend/routes/brand_kits.py` | 833 | Brand kit management |
| `frontend/src/store/useEditorStore.ts` | 1,052 | Canvas state management |
| `frontend/src/components/dashboard/Dashboard.tsx` | 1,847 | Dashboard hub |
| `frontend/src/components/editor/AIAssistant.tsx` | 2,517 | AI Studio panel |
| `frontend/src/components/editor/Sidebar.tsx` | 1,026 | Left panel (templates, elements, layers) |
| `frontend/src/components/editor/CanvasWorkspace.tsx` | 535 | Fabric.js canvas setup |

### Key APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ai/generate-poster` | POST | Generate poster from prompt |
| `/api/ai/generate-image` | POST | Generate AI image |
| `/api/ai/chat` | POST | AI chat assistant |
| `/api/templates` | GET | List templates with filters |
| `/api/templates/:id/use` | POST | Create project from template |
| `/api/templates/:id/apply` | POST | Apply template to current project |
| `/api/projects` | GET/POST | List/create projects |
| `/api/projects/:id` | PUT | Save project canvas data |
| `/api/auth/login` | POST | User login |
| `/api/brand-kits` | GET/POST | Brand kit management |
