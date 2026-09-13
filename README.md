<div align="center">

# TECKSTUDIO

### AI-Powered Design Platform

Professional poster and graphic design generator with AI assistance, built for creators, marketers, and teams across all industry sectors.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![MySQL](https://img.shields.io/badge/MySQL-9.x-4479A1?logo=mysql)](https://www.mysql.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## Overview

### Local setup and teaching guide — updated September 11, 2026

Start with [START_HERE](docs/START_HERE.md), the [local setup guide](docs/LOCAL_SETUP.md),
the [product deep dive and improvement plan](docs/PRODUCT_DEEP_DIVE.md), and the
[teaching playbook](docs/TEACHING_PLAYBOOK.md). The [visual guide](frontend/public/guide.html)
opens as a standalone HTML document or at `http://127.0.0.1:5173/guide.html` while running locally.

**Lesson Video is now implemented with Remotion.** Create structured lessons, edit four scene
types, preview, save and render a silent 1080p MP4 locally. Use **Quick Create → Create Lesson Video**
or render JSON from the CLI. The [usage guide](docs/REMOTION_LOCAL_GUIDE.md) includes visual flows,
API contracts and commands; the [validation record](docs/REMOTION_VALIDATION.md) records real renders
and recovery checks. The [integration design](docs/REMOTION_INTEGRATION_PLAN.md) and
[implementation record](docs/REMOTION_IMPLEMENTATION_PLAN.md) retain the next milestones.

On macOS/Linux with the prerequisites installed:

```bash
./scripts/setup_local.sh
./scripts/start_local.sh
```

The launcher uses a project-owned MySQL instance on **3307**, API on **5001**, and
frontend on **5173**, plus a local Node render worker. It preserves existing configuration and data. For an existing
database or Windows, use the manual setup guide. AI providers need separate
configuration. The reviewed guides distinguish verified behavior from gaps;
the older sections below remain a historical feature inventory.

TECKSTUDIO is a full-stack Canva-style design application combining a **React + Fabric.js canvas editor** with a **Python FastAPI backend** and **multi-provider AI integration**. Users can create professional posters, images, and graphic designs from prompts, templates, or scratch — then export, share, and manage their creative work.

### Key Capabilities

- **AI Poster Generation** — Describe a design in natural language; AI generates a complete, editable poster
- **AI Image Generation** — Create standalone visuals via OpenAI, Gemini, Stability AI, or Pollinations
- **Professional Canvas Editor** — 100+ shapes, text effects, image filters, layers, pen tool, smart guides
- **Template Library** — 27+ categories with AI remix, quick-replace, and brand-kit application
- **Brand Kit Management** — Save and apply reusable colors, fonts, and logos across projects
- **Multi-format Export** — PNG, JPG, SVG, PDF with DPI presets up to 600
- **Design Sharing** — Shareable token-based links with access level control

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, TypeScript, Vite 8 | SPA with fast builds |
| **Canvas** | Fabric.js 5.x | Interactive canvas manipulation |
| **State** | Zustand 5.x | Lightweight global state |
| **Styling** | Tailwind CSS 4.x | Utility-first CSS |
| **Backend** | Python 3.10+, FastAPI | REST API server |
| **Database** | MySQL 9.x via SQLAlchemy | Persistent storage |
| **Auth** | JWT (python-jose) + bcrypt | Session management |
| **AI Chat** | Google Gemini 2.0 Flash | Design assistant |
| **AI Image** | OpenAI, Gemini, Stability, Pollinations | Multi-provider fallback |
| **PDF** | jsPDF | Client-side PDF export |
| **Image Processing** | Pillow | Server-side effects |

---

## Project Structure

```
canva/
├── frontend/                          # React + Fabric.js application
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/                  # Login & registration
│   │   │   │   └── AuthPages.tsx
│   │   │   ├── dashboard/             # Dashboard with 6 pages
│   │   │   │   └── Dashboard.tsx
│   │   │   ├── editor/                # 53 editor components
│   │   │   │   ├── AIAssistant.tsx        # AI chat + poster/image generation
│   │   │   │   ├── CanvasWorkspace.tsx    # Fabric.js canvas initialization
│   │   │   │   ├── Sidebar.tsx            # Left panel: templates, elements, layers
│   │   │   │   ├── Toolbar.tsx            # Top toolbar: undo, export, share
│   │   │   │   ├── PropertiesPanel.tsx    # Right panel: object properties
│   │   │   │   ├── ElementsPanel.tsx      # Shapes, photos, charts, frames
│   │   │   │   ├── BrandKit.tsx           # Brand kit management
│   │   │   │   ├── EnhancedExportPanel.tsx # PNG/JPG/SVG/PDF export
│   │   │   │   ├── ShareModal.tsx         # Design sharing
│   │   │   │   ├── TextEffectsPanel.tsx   # 13 text effects
│   │   │   │   ├── ImageFilters.tsx       # Image filter presets
│   │   │   │   ├── EffectsPanel.tsx       # AI background removal, effects
│   │   │   │   ├── StickersPanel.tsx      # Sticker library
│   │   │   │   ├── FontBrowserPanel.tsx   # Font browser + upload
│   │   │   │   ├── AnimationPanel.tsx     # Object animations
│   │   │   │   ├── PagesPanel.tsx         # Multi-page support
│   │   │   │   ├── HistoryPanel.tsx       # Undo/redo timeline
│   │   │   │   ├── GridOverlay.tsx        # Grid + snap
│   │   │   │   ├── Rulers.tsx             # Pixel rulers
│   │   │   │   ├── QRCodeModal.tsx        # QR code generation
│   │   │   │   ├── ChartGeneratorModal.tsx # Chart creation
│   │   │   │   ├── ContextMenu.tsx        # Right-click menu
│   │   │   │   ├── ElementToolbar.tsx     # Floating element toolbar
│   │   │   │   └── ... (53 total)
│   │   │   └── templates/             # 18 template components
│   │   ├── hooks/                     # 11 custom hooks
│   │   ├── store/                     # Zustand store (1052 lines)
│   │   │   └── useEditorStore.ts
│   │   ├── services/                  # API client layer
│   │   │   ├── apiClient.ts               # Core HTTP + auth
│   │   │   ├── aiClient.ts                # AI provider client
│   │   │   ├── templatesApi.ts            # Template API
│   │   │   ├── fontsApi.ts                # Font API
│   │   │   ├── imageProcessingApi.ts      # Image effects API
│   │   │   └── stickersApi.ts             # Sticker API
│   │   ├── types/                     # TypeScript type definitions
│   │   ├── utils/                     # 18 utility modules
│   │   └── data/                      # Template data
│   └── package.json
│
├── backend/                           # Python FastAPI server
│   ├── main.py                        # App entry point, CORS, routers
│   ├── auth.py                        # JWT + bcrypt authentication
│   ├── config.py                      # Pydantic settings
│   ├── database.py                    # SQLAlchemy models (35 tables)
│   ├── persistence.py                 # File storage helpers
│   ├── routes/                        # 20 route modules
│   │   ├── auth.py                        # /api/auth/*
│   │   ├── projects.py                    # /api/projects/*
│   │   ├── templates.py                   # /api/templates/*
│   │   ├── categories.py                  # /api/categories/*
│   │   ├── brand_kits.py                  # /api/brand-kits/*
│   │   ├── shared.py                      # /api/shared/*
│   │   ├── favorites.py                   # /api/favorites/*
│   │   ├── assets.py                      # /api/assets/*
│   │   ├── ai.py                          # /api/ai/*
│   │   ├── ai_poster.py                   # /api/ai-poster/*
│   │   ├── charts.py                      # /api/charts/*
│   │   ├── elements.py                    # /api/elements/*
│   │   ├── fonts.py                       # /api/fonts/*
│   │   ├── images.py                      # /api/images/*
│   │   ├── stickers.py                    # /api/stickers/*
│   │   ├── qrcode.py                      # /api/qrcode/*
│   │   ├── notifications.py               # /api/notifications/*
│   │   ├── audit_logs.py                  # /api/audit-logs/*
│   │   ├── feature_flags.py               # /api/feature-flags/*
│   │   └── content_calendar.py            # /api/content-calendar/*
│   ├── schemas/                       # Pydantic request/response models
│   ├── migrations/                    # 13 database migrations
│   ├── font_catalog.py                # 7 built-in fonts
│   ├── sticker_catalog.py             # 32 sticker categories
│   ├── asset_providers.py             # Asset search provider
│   ├── curated_asset_seed.py          # Photo catalog seeder
│   ├── requirements.txt
│   └── .env.example
│
├── docs/                              # Project documentation
│   ├── PRD.md
│   ├── HLD.md
│   ├── LLD.md
│   ├── System_Design.md
│   ├── architecture.md
│   ├── DEMO_GUIDE.md
│   └── MODULES_VERIFICATION_STATUS.md
│
└── README.md
```

---

## Quick Start

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 22.12+ or 24 LTS | Frontend runtime; Node 18 is insufficient for Vite 8 |
| Python | 3.10+ | Backend runtime |
| MySQL | 8.x or 9.x | Database |

### 1. Clone the Repository

```bash
git clone https://github.com/sandhyaARKADU/canva1.git
cd canva1
```

### 2. Database Setup

```sql
CREATE DATABASE teckstudio;
-- Tables auto-create on first backend startup
```

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MySQL credentials and AI API keys

# Start the server
python3 -m uvicorn main:app --host 0.0.0.0 --port 5001 --reload
```

The API is now running at `http://localhost:5001`. Auto-creates 35 database tables and seeds 27 template categories on first run.

### 4. Frontend and lesson renderer setup

```bash
# From the repository root (one workspace lockfile)

# Install dependencies
npm ci
npm run video:prepare

# Start development server
npm run dev
# In another terminal, with the API running:
npm run video:worker
```

Open **http://localhost:5173** in your browser.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_HOST` | Yes | `localhost` | MySQL host |
| `DB_PORT` | Yes | `3306` | MySQL port |
| `DB_USER` | Yes | `root` | MySQL username |
| `DB_PASSWORD` | Yes | | MySQL password |
| `DB_NAME` | Yes | `teckstudio` | Database name |
| `JWT_SECRET` | Yes | | JWT signing secret (32+ chars) |
| `GEMINI_API_KEY` | No | | Google Gemini API key |
| `OPENAI_API_KEY` | No | | OpenAI API key |
| `STABILITY_API_KEY` | No | | Stability AI key |
| `IMAGE_PROVIDER_ORDER` | No | `openai,gemini,pollinations` | Image generation fallback chain |
| `AI_CHAT_PROVIDER_PRIORITY` | No | `gemini,openai,pollinations` | Chat provider fallback chain |
| `ENABLE_POLLINATIONS_FALLBACK` | No | `true` | Allow free Pollinations fallback |
| `PORT` | No | `5001` | Backend server port |

> **Note:** At least one AI provider key (Gemini or OpenAI) is recommended for full AI features. Pollinations works without API keys as a free fallback.

---

## Features

### Canvas Editor

A professional-grade canvas built on Fabric.js with:

| Feature | Details |
|---------|---------|
| **Shapes** | 100+ shapes: rectangles, circles, polygons, stars, arrows, speech bubbles, symbols |
| **Text** | Multi-style textboxes, 7+ built-in fonts, custom font upload (TTF/OTF/WOFF/WOFF2) |
| **Text Effects** | 13 effects: shadow, glow, neon, gradient, 3D, splice, echo, glitch, outline, hollow |
| **Text on Path** | Place text along circle, wave, heart, star, spiral paths |
| **Images** | Upload, crop, flip, rotate, 17 filter presets, brightness/contrast/saturation controls |
| **Drawing** | Freehand brush tool, vector pen tool for custom paths |
| **Layers** | Drag-reorder, lock/unlock, visibility toggle, group/ungroup |
| **Selection** | Lasso multi-select, click-select, keyboard shortcuts |
| **Alignment** | 7 page alignments, smart guides, distance measurement |
| **Grid & Rulers** | Configurable grid with snap-to-grid, pixel rulers |
| **Zoom** | 10%-500% zoom, fit-to-screen |
| **History** | Array-based undo/redo with named snapshots |
| **Multi-page** | Create, duplicate, delete, and switch between pages |
| **Keyboard Shortcuts** | 25+ shortcuts for all common operations |

### AI Features

| Feature | Provider | Description |
|---------|----------|-------------|
| **AI Poster Generator** | Gemini + Image API | Generate complete posters from text prompts with 8 themes |
| **AI Image Generator** | OpenAI / Gemini / Stability / Pollinations | Create images with multi-provider fallback |
| **AI Chat Assistant** | Gemini 2.0 Flash | Design advice, copywriting, layout suggestions |
| **AI Prompt Enhancement** | Gemini | Improve prompts for better generation results |
| **AI Element Generation** | Image API | Generate icons, illustrations, stickers, patterns |
| **AI Background Removal** | Server-side / remove.bg | Remove backgrounds from images |
| **AI Color Palette** | Algorithmic | Generate complementary, analogous, triadic palettes |
| **AI Layout Suggester** | Predefined | 6 professional layout templates |

### Template Library

- **27+ categories** pre-seeded (business, marketing, events, food, fashion, education, technology, etc.)
- **Template types:** Posters, Instagram Posts/Stories, YouTube Thumbnails, LinkedIn Posts, Business Cards, Flyers
- **AI Remix:** Modify any template with a natural language prompt
- **Quick Replace:** Swap colors, fonts, and text across templates
- **Brand Kit Apply:** Apply saved brand assets to any template
- **Favorites:** Save and filter templates

### Brand Kit Management

- Create multiple brand kits per user
- **Colors:** Named colors with roles (primary, secondary, accent) and hex validation
- **Fonts:** Font family, weight, style, role (heading, body, accent)
- **Logos:** Upload logos with role assignment (stored as base64)
- **Apply:** One-click apply brand kit to canvas (sets fills, fonts, backgrounds, adds logos)

### Export & Download

| Format | Options |
|--------|---------|
| **PNG** | Transparency option, DPI multiplier (1x-6x) |
| **JPG** | Quality slider (10%-100%), background color |
| **SVG** | Vector output |
| **PDF** | Via jsPDF, auto page size from canvas |
| **DPI Presets** | Web (72), Standard (150), Print (300), High-Res (600) |
| **Extras** | Bleed marks, watermark overlay |

### Sharing & Collaboration

- Generate shareable token-based links (`/view/:token`)
- Three access levels: Private, Link-accessible, Public
- Email sharing via mailto links
- Native Web Share API on supported devices
- Design preview thumbnails

### Dashboard

- **Home:** AI composer, quick create presets, featured templates, recent projects
- **Projects:** Full project list with search, create, delete
- **Templates:** Browsable template library with filters and search
- **Brand Hub:** Brand kit CRUD with color/font/logo management
- **Shared:** Designs shared by collaborators
- **Trash:** Soft-deleted projects with restore/permanent-delete

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/me` | Yes | Get current user profile |
| POST | `/api/auth/logout` | Yes | Revoke session |

### Projects

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/projects` | Yes | List user's projects |
| POST | `/api/projects` | Yes | Create new project |
| GET | `/api/projects/:id` | Yes | Get project details |
| PUT | `/api/projects/:id` | Yes | Update project (auto-creates version) |
| DELETE | `/api/projects/:id` | Yes | Soft-delete project |
| GET | `/api/projects/trash` | Yes | List deleted projects |
| POST | `/api/projects/trash/:id/restore` | Yes | Restore from trash |
| DELETE | `/api/projects/trash/:id` | Yes | Permanent delete |

### Templates

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/templates` | Optional | List/search templates (paginated) |
| GET | `/api/templates/categories` | No | List categories with subcategories |
| GET | `/api/templates/:id` | Optional | Get template detail |
| GET | `/api/templates/:id/related` | Optional | Get related templates |
| POST | `/api/templates/:id/use` | Yes | Create project from template |
| POST | `/api/templates/:id/remix` | Yes | AI-remix a template |
| POST | `/api/templates/:id/quick-replace` | Yes | Quick replace colors/fonts/text |
| POST | `/api/templates/:id/favourite` | Yes | Add to favourites |
| DELETE | `/api/templates/:id/favourite` | Yes | Remove from favourites |

### AI Services

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ai/chat` | Yes | AI design chat assistant |
| POST | `/api/ai/generate-poster-spec` | Yes | Generate poster content spec |
| POST | `/api/ai/generate-poster` | Yes | Generate poster image |
| POST | `/api/ai/generate-image` | Yes | Generate AI image |
| POST | `/api/ai/generate-image-prompt` | No | Enhanced image prompt |
| POST | `/api/ai/generate-thumbnail` | Yes | Generate thumbnail |
| GET | `/api/ai/health` | Yes | AI service health check |
| POST | `/api/ai-poster/generate` | No | Complete AI poster generation |
| POST | `/api/ai-poster/analyze` | No | Analyze prompt parameters |

### Brand Kits

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/brand-kits` | Yes | List user's brand kits |
| POST | `/api/brand-kits` | Yes | Create brand kit |
| PATCH | `/api/brand-kits/:id` | Yes | Update brand kit |
| DELETE | `/api/brand-kits/:id` | Yes | Delete brand kit |
| POST | `/api/brand-kits/:id/duplicate` | Yes | Duplicate brand kit |
| POST | `/api/brand-kits/:id/colors` | Yes | Add color to kit |
| POST | `/api/brand-kits/:id/fonts` | Yes | Add font to kit |
| POST | `/api/brand-kits/:id/logos` | Yes | Add logo to kit |

### Assets & Elements

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/assets` | No | List/search assets |
| GET | `/api/assets/categories` | No | List asset categories |
| GET | `/api/elements` | No | List elements with filtering |
| GET | `/api/elements/search` | No | Search elements |
| POST | `/api/elements/generate` | Yes | AI-generate element |
| GET | `/api/stickers` | Optional | List stickers |
| GET | `/api/fonts` | Optional | List fonts |

### Other Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/shared` | Yes | List shared designs |
| POST | `/api/shared` | Yes | Share a design |
| GET | `/api/shared/by-token/:token` | No | Access shared design |
| GET | `/api/favorites` | Yes | List favorites |
| POST | `/api/charts/generate` | Yes | Generate SVG chart |
| POST | `/api/qrcode/generate` | Yes | Generate QR code |
| POST | `/api/images/remove-background` | Yes | Remove image background |
| POST | `/api/images/apply-effect` | Yes | Apply image effects |
| GET | `/api/health` | No | Server health check |
| GET | `/api/health/database` | No | Database connectivity |

---

## Database Schema

**35 tables** with SQLAlchemy ORM and auto-migration:

| Table | Purpose |
|-------|---------|
| `users` | User accounts with bcrypt password hashing |
| `auth_sessions` | JWT session tracking with revocation |
| `projects` | Design projects with Fabric.js JSON data |
| `design_versions` | Version history snapshots |
| `templates` | Template library with metadata |
| `categories` | Template categories (27 seeded) |
| `template_subcategories` | Nested category support |
| `template_favourites` | User-template favourite mappings |
| `template_usage` | Template usage tracking |
| `brand_kits` | Brand kit containers |
| `brand_colors` | Brand color palettes |
| `brand_fonts` | Brand font collections |
| `brand_logos` | Brand logo uploads (base64) |
| `shared_designs` | Design sharing with tokens |
| `favorites` | Polymorphic user favourites |
| `assets` | Asset library (SVG, photos, elements) |
| `generated_assets` | AI-generated content tracking |
| `element_categories` | Hierarchical element categories |
| `element_favorites` | User element favourites |
| `element_recent_items` | Recent element usage |
| `element_collections` | User-created collections |
| `uploaded_assets` | File upload tracking |
| `font_assets` | Uploaded custom fonts |
| `processed_images` | Image processing results |
| `chat_sessions` | AI chat conversation sessions |
| `chat_messages` | AI chat message history |
| `deleted_items` | Soft-delete trash |
| `notifications` | In-app notifications |
| `content_calendar_events` | Content scheduling |
| `audit_logs` | Security audit trail |
| `feature_flags` | Feature toggles |
| `recent_history` | Recent activity tracking |
| `generation_jobs` | AI generation job tracking |
| `export_metadata` | Export history tracking |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/⌘ + Z` | Undo |
| `Ctrl/⌘ + Y` | Redo |
| `Ctrl/⌘ + C` | Copy |
| `Ctrl/⌘ + V` | Paste |
| `Ctrl/⌘ + X` | Cut |
| `Ctrl/⌘ + D` | Duplicate |
| `Ctrl/⌘ + A` | Select all |
| `Ctrl/⌘ + S` | Save |
| `Ctrl/⌘ + G` | Group |
| `Ctrl/⌘ + Shift + G` | Ungroup |
| `Ctrl/⌘ + B` | Bold |
| `Ctrl/⌘ + I` | Italic |
| `Ctrl/⌘ + U` | Underline |
| `Ctrl/⌘ + ]` | Bring forward |
| `Ctrl/⌘ + [` | Send backward |
| `Ctrl/⌘ + +` | Zoom in |
| `Ctrl/⌘ + -` | Zoom out |
| `Ctrl/⌘ + 0` | Fit to screen |
| `Delete / Backspace` | Delete selected |
| `Arrow keys` | Nudge selected object |
| `Shift + Arrow` | Nudge by 10px |
| `Space` (hold) | Pan canvas |
| `Escape` | Deselect all |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (SPA)                         │
│                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Auth   │  │  Dashboard   │  │   Canvas Editor  │  │
│  │  Pages   │  │  (6 pages)   │  │  (53 components) │  │
│  └────┬─────┘  └──────┬───────┘  └────────┬─────────┘  │
│       │               │                    │             │
│  ┌────┴───────────────┴────────────────────┴──────────┐ │
│  │              Services Layer (6 modules)             │ │
│  └────────────────────────┬───────────────────────────┘ │
│                           │                              │
│  ┌────────────────────────┴───────────────────────────┐ │
│  │          Zustand Store (canvas, history, project)   │ │
│  └────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP/REST + JWT
                            ▼
┌───────────────────────────────────────────────────────────┐
│                  FastAPI Backend (20 routes)               │
│                                                           │
│  ┌──────┐ ┌─────────┐ ┌──────┐ ┌───────┐ ┌───────────┐  │
│  │ Auth │ │Projects │ │  AI  │ │Templates│ │Brand Kits │  │
│  └──┬───┘ └────┬────┘ └──┬───┘ └───┬───┘ └─────┬─────┘  │
│     │          │         │         │            │         │
│  ┌──┴──────────┴─────────┴─────────┴────────────┴──────┐  │
│  │         Auth Middleware + Persistence Layer          │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                  │
│  ┌──────────────────────┴──────────────────────────────┐  │
│  │           SQLAlchemy ORM (35 tables)                 │  │
│  └──────────────────────┬──────────────────────────────┘  │
└─────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────┐
│                    External Services                       │
│                                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │ Gemini   │ │ OpenAI   │ │Stability │ │Pollinations  │  │
│  │ (Chat +  │ │ (DALL-E) │ │  (SD)    │ │  (Free)      │  │
│  │  Image)  │ │          │ │          │ │              │  │
│  └──────────┘ └──────────┘ └──────────┘ └─────────────┘  │
│                                                           │
│  ┌──────────┐ ┌──────────────────────────────────────┐   │
│  │remove.bg │ │      MySQL 9.x Database               │   │
│  │(optional)│ │      35 tables + auto-migration       │   │
│  └──────────┘ └──────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

---

## Scripts

| Command | Location | Description |
|---------|----------|-------------|
| `npm run dev` | `frontend/` | Start Vite dev server (port 5173) |
| `npm run build` | `frontend/` | Production build |
| `npm run lint` | `frontend/` | ESLint check |
| `npm run validate:templates` | `frontend/` | Validate template data |
| `uvicorn main:app --reload` | `backend/` | Start FastAPI dev server (port 5001) |
| `python3 test_*.py` | `backend/` | Run test suites |

---

## Documentation

Detailed documentation is available in the [`docs/`](docs/) directory:

| Document | Description |
|----------|-------------|
| [PRD.md](docs/PRD.md) | Product Requirements Document |
| [HLD.md](docs/HLD.md) | High-Level Design |
| [LLD.md](docs/LLD.md) | Low-Level Design |
| [System_Design.md](docs/System_Design.md) | System architecture and design decisions |
| [architecture.md](docs/architecture.md) | Technical architecture overview |
| [DEMO_GUIDE.md](docs/DEMO_GUIDE.md) | Step-by-step demo walkthrough |
| [MODULES_VERIFICATION_STATUS.md](docs/MODULES_VERIFICATION_STATUS.md) | Feature verification matrix |

---

## Supported Platforms

Tested on desktop browsers:

- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

Mobile responsive for dashboard and templates. Canvas editor optimized for desktop use.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with React, Fabric.js, FastAPI, and Multi-Provider AI**

[Report Bug](https://github.com/sandhyaARKADU/canva1/issues) · [Request Feature](https://github.com/sandhyaARKADU/canva1/issues)

</div>
