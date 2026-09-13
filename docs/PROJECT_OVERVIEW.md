# TECKSTUDIO — AI-Powered Design Platform

## 1. Project Overview

TECKSTUDIO is a full-stack web application for creating professional posters, social media content, and marketing materials with AI assistance. It is a Canva-like design platform built with React, Fabric.js, Python FastAPI, and MySQL.

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Canvas Engine | Fabric.js 5.x |
| State Management | Zustand |
| Backend | Python 3 + FastAPI + Uvicorn |
| Database | MySQL 9.x (12 tables) |
| Authentication | JWT (python-jose) |
| AI Integration | Pollinations API (free, no key) |
| Styling | Tailwind CSS |

---

## 3. Project Structure

```
canva/
├── frontend/                    # React + Fabric.js editor
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/            # Login/Register pages
│   │   │   ├── dashboard/       # Dashboard with templates, projects
│   │   │   └── editor/          # Canvas editor, AI tools, sidebar
│   │   │       ├── AIAssistant.tsx
│   │   │       ├── AlignmentTools.tsx
│   │   │       ├── AnimationPanel.tsx
│   │   │       ├── BrandKit.tsx
│   │   │       ├── CanvasWorkspace.tsx
│   │   │       ├── DevModeInspector.tsx
│   │   │       ├── ExportSettings.tsx
│   │   │       ├── GradientPicker.tsx
│   │   │       ├── GridOverlay.tsx
│   │   │       ├── HistoryPanel.tsx
│   │   │       ├── ImageCropper.tsx
│   │   │       ├── ImageFilters.tsx
│   │   │       ├── KeyboardShortcutsModal.tsx
│   │   │       ├── PagesPanel.tsx
│   │   │       ├── PropertiesPanel.tsx
│   │   │       ├── RoyaltyFreeAssets.tsx
│   │   │       ├── Rulers.tsx
│   │   │       ├── ShareModal.tsx
│   │   │       ├── Sidebar.tsx
│   │   │       ├── TextOnPath.tsx
│   │   │       ├── Toolbar.tsx
│   │   │       └── ZoomController.tsx
│   │   ├── hooks/               # Custom React hooks
│   │   │   ├── useCanvasTools.ts
│   │   │   ├── useDistanceMeasurement.ts
│   │   │   ├── useKeyboardShortcuts.ts
│   │   │   ├── useLassoSelection.ts
│   │   │   ├── usePenTool.ts
│   │   │   ├── useSmartGuides.ts
│   │   │   └── useSnapToGrid.ts
│   │   ├── store/               # Zustand state
│   │   │   └── useEditorStore.ts
│   │   ├── data/                # Template definitions
│   │   │   └── templates.ts
│   │   ├── App.tsx              # Router + Auth
│   │   ├── Editor.tsx           # Editor layout
│   │   └── main.tsx             # Entry point
│   └── package.json
├── backend/                     # Python FastAPI
│   ├── routes/
│   │   ├── auth.py              # Register, Login, JWT
│   │   ├── projects.py          # Project CRUD
│   │   ├── templates.py         # Template CRUD
│   │   ├── categories.py        # Template categories
│   │   ├── brand_kits.py        # Brand kit management
│   │   ├── shared.py            # Design sharing
│   │   ├── favorites.py         # User favorites
│   │   └── assets.py            # Asset library
│   ├── database.py              # 12 SQLAlchemy models
│   ├── auth.py                  # JWT + password hashing
│   ├── config.py                # Environment settings
│   ├── main.py                  # FastAPI application
│   └── requirements.txt
├── docs/                        # Documentation
└── README.md
```

---

## 4. Database Schema (12 Tables)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| users | User accounts | id, name, email, password_hash, avatar_url |
| projects | Design projects | id, name, data (Fabric.js JSON), width, height, user_id |
| design_versions | Version snapshots | id, project_id, version_number, name, data |
| templates | Template library | id, name, category_id, data, thumbnail, tags |
| categories | Template categories | id, name, slug, icon, color, group_name |
| brand_kits | Brand kit containers | id, name, user_id |
| brand_colors | Brand color palettes | id, brand_kit_id, name, hex_value |
| brand_fonts | Brand font collections | id, brand_kit_id, name, family, weight |
| brand_logos | Brand logo uploads | id, brand_kit_id, name, file_data (base64) |
| shared_designs | Design sharing | id, project_id, shared_by, shared_with_email, access_level, share_token |
| favorites | User favorites | id, user_id, item_type, item_id |
| assets | SVG/icon library | id, name, category, file_data, file_type |

**Default Data:** 27 template categories auto-seeded on startup.

---

## 5. API Endpoints (30+)

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login with email/password |
| GET | /api/auth/me | Get current user profile |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects | List all user projects |
| POST | /api/projects | Create new project |
| GET | /api/projects/:id | Get project by ID |
| PUT | /api/projects/:id | Update project (name, data) |
| DELETE | /api/projects/:id | Delete project |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/templates | List templates (filter by category, search) |
| GET | /api/templates/:id | Get template |
| POST | /api/templates | Create template |
| PUT | /api/templates/:id | Update template |
| DELETE | /api/templates/:id | Delete template |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/categories | List all categories |
| GET | /api/categories/:id | Get category |

### Brand Kits
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/brand-kits | List user brand kits |
| POST | /api/brand-kits | Create brand kit |
| DELETE | /api/brand-kits/:id | Delete brand kit |
| POST | /api/brand-kits/:id/colors | Add color to kit |
| DELETE | /api/brand-kits/:id/colors/:cid | Remove color |
| POST | /api/brand-kits/:id/fonts | Add font to kit |
| DELETE | /api/brand-kits/:id/fonts/:fid | Remove font |
| POST | /api/brand-kits/:id/logos | Upload logo |
| DELETE | /api/brand-kits/:id/logos/:lid | Remove logo |

### Sharing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/shared | List shared designs |
| POST | /api/shared | Share a design |
| GET | /api/shared/by-token/:token | View shared design (public) |
| DELETE | /api/shared/:id | Remove share |

### Favorites
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/favorites | List favorites |
| POST | /api/favorites | Add favorite |
| DELETE | /api/favorites/:id | Remove favorite |

### Assets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/assets | List assets (filter by category, search) |
| POST | /api/assets | Create asset |
| DELETE | /api/assets/:id | Delete asset |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /api/stats | Database statistics |

---

## 6. Features Implemented

### 6.1 Canvas Editor (30+ Shapes)

| Category | Shapes |
|----------|--------|
| Basic | Rectangle, Rounded Rectangle, Pill, Circle, Triangle, Line |
| Polygons | Diamond, Pentagon, Hexagon, Octagon, Cross |
| Arrows | Right, Up, Down |
| Symbols | Badge, Shield, Heart, Star, Flame, Bookmark, Quote |
| UI Icons | Checkmark, X Mark, Plus, Minus, Eye, Lock |
| Communication | Speech Bubble, Cloud, Lightning, Camera, Bell, Flag |

**Object Manipulation:** Select, Move, Resize, Rotate, Multi-select, Group/Ungroup, Copy, Paste, Duplicate, Delete, Layer reorder, Lock/Unlock, Visibility toggle.

**Text Editing:** 20+ font families, font size, bold, italic, underline, text alignment (left/center/right), letter spacing, line height.

**Properties Panel:** Fill color, stroke color, stroke width, opacity, border radius, shadow (color, blur, offset), transform controls (position, size, rotation).

### 6.2 AI Features

| Feature | Description |
|---------|-------------|
| AI Poster Generator | 25+ themes (movie, fashion, fitness, tech, food, wedding, etc.) |
| AI Image Generator | Generates images via Pollinations API |
| Slogan & Copy Writer | 5 writing styles (Bold, Professional, Creative, Minimalist, Luxury) |
| Color Palette Generator | 8 palette moods (warm, ocean, cyber, pastel, dark, gold, nature, pink) |

### 6.3 Asset Library

| Category | Items |
|----------|-------|
| SVG Elements | 40+ (star, heart, diamond, hexagon, cloud, shield, crown, ribbon, etc.) |
| Gradient Overlays | 10 (sunset, ocean, forest, berry, midnight, peach, emerald, royal, coral, lavender) |
| Solid Colors | 20 preset colors |
| Image Search | Browse by category (nature, business, food, tech, fashion, fitness, travel, etc.) |

### 6.4 Export System

| Format | Options |
|--------|---------|
| PNG | Transparency support, DPI scaling |
| JPG | Quality control (10-100%) |
| SVG | Vector export |
| PDF | Dynamic import jsPDF |

**DPI Presets:** 72 (Web), 150 (HD), 300 (Print), 600 (Ultra)
**Size Presets:** Instagram, Facebook, Twitter, YouTube, A4 Print

### 6.5 Dashboard

| Feature | Description |
|---------|-------------|
| Recent Designs | Shows saved projects with preview thumbnails |
| Create Design | Creates blank canvas or sized design |
| Template Browser | 27 categories with unique preview images |
| Brand Hub | Create/manage brand kits (colors, fonts, logos) |
| Shared Designs | View designs shared by others |
| Trash | Deleted designs (30-day retention) |
| Search | Search across designs and templates |

### 6.6 Editor Tools

| Tool | Description |
|------|-------------|
| Keyboard Shortcuts | 20+ shortcuts (Ctrl+Z, Ctrl+C, Ctrl+V, Ctrl+S, Ctrl+B/I/U, etc.) |
| Grid Overlay | Toggle grid, snap-to-grid, adjustable grid size |
| Rulers | Horizontal and vertical rulers |
| Smart Guides | Align objects to centers and edges |
| Distance Measurement | Measure distances between objects |
| Zoom Controller | Zoom in/out, fit to screen |
| History Panel | Visual timeline, named snapshots |
| Pages Panel | Multi-page support with persistence |
| Dev Mode Inspector | Object properties inspector |
| Alignment Tools | Align left/center/right, top/middle/bottom |
| Animation Panel | Object animations |
| Text on Path | Text along circle, wave, heart, star paths |
| Image Cropper | Crop images with aspect ratio |
| Image Filters | Apply filters to images |
| Gradient Picker | Create custom gradients |

### 6.7 Collaboration

| Feature | Description |
|---------|-------------|
| Shareable Links | Generate public view links via /view/:token |
| Email Share | Share via email with mailto: links |
| Access Levels | Private, Anyone with link, Public |
| Design Preview | Thumbnail preview in share modal |

---

## 7. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
| Ctrl+C | Copy |
| Ctrl+V | Paste |
| Ctrl+X | Cut |
| Ctrl+D | Duplicate |
| Ctrl+A | Select All |
| Ctrl+G | Group |
| Ctrl+Shift+G | Ungroup |
| Ctrl+S | Save |
| Ctrl+B | Bold |
| Ctrl+I | Italic |
| Ctrl+U | Underline |
| Ctrl+L | Align Left |
| Ctrl+E | Align Center |
| Ctrl+R | Align Right |
| Ctrl+] | Bring Forward |
| Ctrl+[ | Send Backward |
| Ctrl++ | Zoom In |
| Ctrl+- | Zoom Out |
| Ctrl+0 | Reset Zoom |
| Delete/Backspace | Delete selected |
| Arrow Keys | Nudge (1px, 10px with Shift) |
| Space (hold) | Pan mode |
| Escape | Deselect |

---

## 8. Setup & Installation

### Prerequisites
- Python 3.10+
- MySQL 8.x or 9.x
- Node.js 18+

### Database
```sql
CREATE DATABASE teckstudio;
-- Auto-creates tables and seeds 27 categories on backend startup
```

### Backend
```bash
cd backend
pip install -r requirements.txt
python3 -m uvicorn main:app --port 5001 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Access
- Frontend: http://localhost:5173
- Backend API: http://localhost:5001
- Health Check: http://localhost:5001/health

---

## 9. Environment Variables (backend/.env)

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=teckstudio
JWT_SECRET=your_secret_key
JWT_ALGORITHM=HS256
JWT_EXPIRY_DAYS=7
HOST=0.0.0.0
PORT=5001
```

---

## 10. Project Statistics

| Metric | Count |
|--------|-------|
| Frontend Components | 25+ |
| Custom React Hooks | 8 |
| Backend API Endpoints | 30+ |
| Database Tables | 12 |
| Template Categories | 27 |
| Keyboard Shortcuts | 25+ |
| Shape Types | 30+ |
| SVG Elements | 40+ |
| Gradient Presets | 10 |
| AI Theme Presets | 25+ |
| Export Formats | 4 (PNG, JPG, SVG, PDF) |
| Total Source Files | 60+ |

---

*Document Version: 1.0*
*Last Updated: July 2026*
