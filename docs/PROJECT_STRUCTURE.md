# TECKSTUDIO — Complete Application Structure

## Application Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TECKSTUDIO                               │
│                  AI-Powered Design Platform                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   Frontend   │    │   Backend    │    │   Database   │     │
│  │   React App  │◄──►│   FastAPI    │◄──►│    MySQL     │     │
│  │   Port 5173  │    │   Port 5001  │    │   Port 3306  │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Flow

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Login  │────►│ Dashboard│────►│  Editor  │────►│  Export  │
│ /register│    │   Home   │     │  Canvas  │     │ PNG/JPG/ │
└─────────┘     └──────────┘     └──────────┘     │ SVG/PDF  │
                         │                        └──────────┘
                         │
                    ┌────┴────┐
                    │         │
               ┌────▼───┐ ┌──▼────────┐
               │Templates│ │ Brand Hub │
               │ Browser │ │  Manager  │
               └─────────┘ └───────────┘
```

---

## Frontend Component Hierarchy

```
App.tsx (Router)
├── AuthPages.tsx (Login/Register)
├── Dashboard.tsx (Main Dashboard)
│   ├── Sidebar Navigation
│   ├── Home Page
│   │   ├── Welcome Banner
│   │   ├── Recent Designs (with preview images)
│   │   └── Popular Templates (6 categories)
│   ├── Projects Page (All user designs)
│   ├── Templates Page (27 categories)
│   ├── Brand Hub (Colors, Fonts, Logos)
│   ├── Shared Page (Shared designs)
│   └── Trash Page (Deleted designs)
│
└── Editor.tsx (Canvas Editor)
    ├── Toolbar.tsx (Top bar)
    │   ├── Undo/Redo
    │   ├── Delete/Duplicate
    │   ├── Clear Canvas
    │   ├── Rulers Toggle
    │   ├── Design/Dev Mode Switch
    │   ├── Export Dropdown
    │   └── Share Button
    │
    ├── Sidebar.tsx (Left panel - 9 tabs)
    │   ├── Templates Tab (27 sector templates)
    │   ├── Elements Tab (Quick elements, symbols, arrows)
    │   ├── Shapes Tab (30+ shapes in 6 categories)
    │   ├── Text Tab (Heading, Subheading, Body)
    │   ├── Draw Tab (Brush + Pen tool)
    │   ├── Uploads Tab (Image upload)
    │   ├── Pages Tab (Multi-page support)
    │   ├── Layers Tab (Layer management)
    │   └── History Tab (Timeline + Snapshots)
    │
    ├── CanvasWorkspace.tsx (Center canvas)
    │   ├── Fabric.js Canvas (800x800)
    │   ├── Grid Overlay
    │   ├── Rulers
    │   ├── Smart Guides
    │   ├── Distance Measurement
    │   ├── Pen Tool
    │   └── Lasso Selection
    │
    ├── ZoomController.tsx (Floating zoom)
    │
    └── Right Panel (4 tabs)
        ├── AI Assistant Tab
        │   ├── AI Poster Generator (25+ themes)
        │   ├── AI Image Generator
        │   ├── Slogan & Copy Writer
        │   └── Color Palette Generator
        │
        ├── Assets Tab
        │   ├── Image Search (12 categories)
        │   ├── SVG Elements (40+)
        │   └── Gradient Overlays (10)
        │
        ├── Brand Tab (Brand Kit)
        │   ├── Brand Colors
        │   ├── Brand Fonts
        │   └── Brand Logos
        │
        └── Properties Tab
            ├── Transform Controls
            ├── Fill Color
            ├── Text Properties
            ├── Border Settings
            ├── Effects (Opacity, Shadow)
            ├── Image Filters
            ├── Image Cropper
            ├── Alignment Tools
            └── Animation Panel
```

---

## Backend Route Structure

```
FastAPI Application (main.py)
├── /health (GET) - Health check
├── /api/stats (GET) - Database statistics
│
├── /api/auth/
│   ├── /register (POST) - Create account
│   ├── /login (POST) - Authenticate user
│   └── /me (GET) - Current user info
│
├── /api/projects/
│   ├── / (GET) - List user projects
│   ├── / (POST) - Create project
│   ├── /:id (GET) - Get project
│   ├── /:id (PUT) - Update project
│   └── /:id (DELETE) - Delete project
│
├── /api/templates/
│   ├── / (GET) - List templates
│   ├── / (POST) - Create template
│   ├── /:id (GET) - Get template
│   ├── /:id (PUT) - Update template
│   └── /:id (DELETE) - Delete template
│
├── /api/categories/
│   ├── / (GET) - List categories (27 seeded)
│   └── /:id (GET) - Get category
│
├── /api/brand-kits/
│   ├── / (GET) - List brand kits
│   ├── / (POST) - Create brand kit
│   ├── /:id (DELETE) - Delete brand kit
│   ├── /:id/colors (POST) - Add color
│   ├── /:id/colors/:cid (DELETE) - Remove color
│   ├── /:id/fonts (POST) - Add font
│   ├── /:id/fonts/:fid (DELETE) - Remove font
│   ├── /:id/logos (POST) - Upload logo
│   └── /:id/logos/:lid (DELETE) - Remove logo
│
├── /api/shared/
│   ├── / (GET) - List shared designs
│   ├── / (POST) - Share design
│   ├── /by-token/:token (GET) - Public view
│   └── /:id (DELETE) - Remove share
│
├── /api/favorites/
│   ├── / (GET) - List favorites
│   ├── / (POST) - Add favorite
│   └── /:id (DELETE) - Remove favorite
│
└── /api/assets/
    ├── / (GET) - List assets
    ├── / (POST) - Create asset
    └── /:id (DELETE) - Delete asset
```

---

## Database Entity Relationship

```
┌──────────────┐       ┌──────────────┐
│    users     │       │   projects   │
├──────────────┤       ├──────────────┤
│ id (PK)      │──┐    │ id (PK)      │
│ name         │  │    │ name         │
│ email        │  │    │ data (JSON)  │
│ password_hash│  │    │ width        │
│ avatar_url   │  │    │ height       │
│ created_at   │  │    │ user_id (FK) │──┐
│ updated_at   │  │    │ created_at   │  │
└──────────────┘  │    │ updated_at   │  │
                  │    └──────────────┘  │
                  │                      │
                  │    ┌──────────────┐  │
                  │    │design_version│  │
                  │    ├──────────────┤  │
                  │    │ id (PK)      │  │
                  │    │ project_id(FK)│◄─┘
                  │    │ version_num  │
                  │    │ name         │
                  │    │ data (JSON)  │
                  │    │ created_at   │
                  │    └──────────────┘
                  │
                  │    ┌──────────────┐
                  │    │  brand_kits  │
                  │    ├──────────────┤
                  ├───►│ id (PK)      │
                  │    │ name         │
                  │    │ user_id (FK) │
                  │    │ created_at   │
                  │    └──────┬───────┘
                  │           │
                  │    ┌──────┴───────┐
                  │    │              │
                  │  ┌─▼────────┐ ┌──▼─────────┐ ┌────────────┐
                  │  │brand_    │ │brand_      │ │brand_      │
                  │  │colors    │ │fonts       │ │logos       │
                  │  ├──────────┤ ├────────────┤ ├────────────┤
                  │  │id (PK)   │ │id (PK)     │ │id (PK)     │
                  │  │kit_id(FK)│ │kit_id (FK) │ │kit_id (FK) │
                  │  │name      │ │name        │ │name        │
                  │  │hex_value │ │family      │ │file_data   │
                  │  └──────────┘ │weight      │ │file_type   │
                  │               └────────────┘ └────────────┘
                  │
                  │    ┌──────────────┐
                  │    │   shared     │
                  │    │   _designs   │
                  │    ├──────────────┤
                  ├───►│ id (PK)      │
                  │    │ project_id   │
                  │    │ shared_by(FK)│
                  │    │ shared_email │
                  │    │ access_level │
                  │    │ share_token  │
                  │    └──────────────┘
                  │
                  │    ┌──────────────┐
                  │    │  favorites   │
                  │    ├──────────────┤
                  └───►│ id (PK)      │
                       │ user_id (FK) │
                       │ item_type    │
                       │ item_id      │
                       └──────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  categories  │    │  templates   │    │    assets    │
├──────────────┤    ├──────────────┤    ├──────────────┤
│ id (PK)      │◄───│ category_id  │    │ id (PK)      │
│ name         │    │ id (PK)      │    │ name         │
│ slug         │    │ name         │    │ category     │
│ icon         │    │ data (JSON)  │    │ tags         │
│ color        │    │ thumbnail    │    │ file_data    │
│ group_name   │    │ width        │    │ file_type    │
│ sort_order   │    │ height       │    │ is_premium   │
└──────────────┘    │ tags         │    │ use_count    │
                    │ is_premium   │    └──────────────┘
                    │ use_count    │
                    └──────────────┘
```

---

## Canvas Editor Visual Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  ◄  ▶  │  ✂  ⧉  🗑  │  Clear  │  Design/Dev  │  ▼ Export  │ Share │  ← Toolbar
├────────┼─────────────────────────────────────────────────────────┤
│        │                                                         │
│ T      │                                                         │
│ E      │                                                         │
│ M      │                                                         │
│ P      │                    CANVAS                                │
│ L      │                    WORKSPACE                             │
│ A      │                    (800×800)                             │
│ T      │                                                         │
│ E      │                                                         │
│ S      │                                                         │
│ ─────  │                                                         │
│ E      │                                                         │
│ L      │                                                         │
│ E      │                                                         │
│ M      │                                                         │
│ E      │                                                         │
│ N      │                                                         │
│ T      │                                                         │
│ S      │                                                         │
│ ─────  │                                                         │
│ S      │                                                         │
│ H      │                                                         │
│ A      │                                            ┌──────────┐ │
│ P      │                                            │ Zoom: 75%│ │
│ E      │                                            └──────────┘ │
│ S      │                                                         │
│ ─────  │                                                         │
│ T      │                                                         │
│ E      │                                                         │
│ X      │                                                         │
│ T      │                                                         │
│ ─────  │                                                         │
│ D      │                                                         │
│ R      │                                                         │
│ A      │                                                         │
│ W      │                                                         │
│ ─────  │                                                         │
│ U      │                                                         │
│ P      │                                                         │
│ L      │                                                         │
│ O      │                                                         │
│ A      │                                                         │
│ D      │                                                         │
│ S      │                                                         │
│ ─────  │                                                         │
│ P      │                                                         │
│ A      │                                                         │
│ G      │                                                         │
│ E      │                                                         │
│ S      │                                                         │
│ ─────  │                                                         │
│ L      │                                                         │
│ A      │                                                         │
│ Y      │                                                         │
│ E      │                                                         │
│ R      │                                                         │
│ S      │                                                         │
├────────┼─────────────────────────────────────────────────────────┤
│        │  ┌─────┬───────┬───────┬──────────┐                     │
│        │  │ AI  │Assets │ Brand │ Props    │                     │
│        │  ├─────┴───────┴───────┴──────────┤                     │
│        │  │                                │                     │
│        │  │     Right Panel Content        │                     │
│        │  │     (AI Tools / Properties)    │                     │
│        │  │                                │                     │
│        │  └────────────────────────────────┘                     │
├────────┴─────────────────────────────────────────────────────────┤
```

---

## Shape Library (30+ Shapes)

```
BASIC SHAPES          POLYGONS              ARROWS
┌──────────┐         ┌──────────┐          ┌──────────┐
│ ▭ Rect   │         │ ◇ Diamond│          │ → Right  │
│ ▢ Rounded│         │ ⬠ Pentagon│         │ ↑ Up     │
│ ▬ Pill   │         │ ⬡ Hexagon│          │ ↓ Down   │
│ ○ Circle │         │ ⯃ Octagon│          └──────────┘
│ △ Triangle│        │ ✚ Cross  │
│ ─ Line   │         └──────────┘
└──────────┘

SYMBOLS               UI ICONS              COMMUNICATION
┌──────────┐         ┌──────────┐          ┌──────────┐
│ ★ Star   │         │ ✓ Check  │          │ 💬 Bubble│
│ ♥ Heart  │         │ ✕ X Mark │          │ ☁ Cloud  │
│ ⚜ Badge  │         │ ＋ Plus  │          │ ⚡ Lightning│
│ 🛡 Shield │        │ ━ Minus  │          │ 📷 Camera│
│ 🔥 Flame  │        │ 👁 Eye   │          │ 🔔 Bell  │
│ 🔖 Bookmark│       │ 🔒 Lock  │          │ 🚩 Flag  │
│ ❝ Quote  │         └──────────┘          └──────────┘
└──────────┘
```

---

## AI Poster Themes (25+)

```
┌─────────────────────────────────────────────────────────────┐
│                     AI POSTER GENERATOR                      │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│  Movie   │  Hero    │ Fashion  │ Beauty   │  Fitness       │
│  🎬      │  🦸      │  👗      │  💄      │  💪            │
├──────────┼──────────┼──────────┼──────────┼────────────────┤
│  Gym     │  Music   │ Concert  │  Food    │  Restaurant    │
│  🏋️      │  🎵      │  🎤      │  🍔      │  🍽️            │
├──────────┼──────────┼──────────┼──────────┼────────────────┤
│  Cafe    │  Tech    │ Startup  │  Nature  │  Wedding       │
│  ☕      │  💻      │  🚀      │  🌿      │  💒            │
├──────────┼──────────┼──────────┼──────────┼────────────────┤
│  Luxury  │  Sale    │  Party   │  Sports  │  Yoga          │
│  👑      │  🏷️      │  🎉      │  ⚽      │  🧘            │
├──────────┼──────────┼──────────┼──────────┼────────────────┤
│  Course  │ Education│  Property│  Minimal │  Clean         │
│  📚      │  🎓      │  🏠      │  ⬜      │  ✨            │
└──────────┴──────────┴──────────┴──────────┴────────────────┘
```

---

## Template Categories (27 Categories)

```
SOCIAL MEDIA (7)              MARKETING (6)
├── Instagram Posts (250+)     ├── Posters (300+)
├── Stories & Reels (180+)     ├── Flyers (200+)
├── Facebook Posts (150+)      ├── Web Banners (150+)
├── Twitter/X Posts (120+)     ├── Brochures (120+)
├── LinkedIn Posts (100+)      ├── Newsletters (80+)
├── Pinterest Pins (140+)      └── Digital Ads (160+)
└── YouTube Thumbnails (180+)

EVENTS (4)                    BUSINESS (5)
├── Invitations (200+)         ├── Presentations (150+)
├── Event Posters (180+)       ├── Business Cards (120+)
├── Tickets & Passes (100+)    ├── Resumes (100+)
└── Programs & Menus (80+)     ├── Invoices (60+)
                               └── Letterheads (50+)

INDUSTRY (7)                  OTHER (3)
├── Restaurant & Cafe (180+)   ├── Certificates (60+)
├── Fashion & Beauty (160+)    ├── Infographics (95+)
├── Real Estate (100+)         └── Logos (110+)
├── Health & Fitness (140+)
├── Technology & Startup (120+)
├── Education (100+)
└── Music & Entertainment (90+)
```

---

## Export Options

```
┌─────────────────────────────────────────────────────────────┐
│                      EXPORT SETTINGS                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FORMAT:          DPI/PREQUALITY:                           │
│  ┌─────┬─────┐    ┌─────┬─────┐                            │
│  │ PNG │ JPG │    │  72 │ 150 │                            │
│  │Trans│Comp │    │ Web │ HD  │                            │
│  ├─────┼─────┤    ├─────┼─────┤                            │
│  │ SVG │ PDF │    │ 300 │ 600 │                            │
│  │Vectr│Doc  │    │Print│Ultra│                            │
│  └─────┴─────┘    └─────┴─────┘                            │
│                                                             │
│  SIZE PRESETS:                                              │
│  ┌──────────┬──────────┬──────────┬──────────┐             │
│  │Instagram │ Facebook │ Twitter  │ YouTube  │             │
│  │1080×1080 │1200×630  │1200×675  │1280×720  │             │
│  ├──────────┼──────────┼──────────┼──────────┤             │
│  │A4 Print  │Business  │Present-  │A4 Flyer  │             │
│  │2480×3508 │Card      │ation    │2480×3508 │             │
│  └──────────┴1050×600  │1920×1080 └──────────┘             │
│                        └──────────┘                         │
│                                                             │
│  BACKGROUND:                                                │
│  [Color Picker] [Hex Input] [☑ Transparent]                │
│                                                             │
│              [ 📥 Export PNG ]                               │
└─────────────────────────────────────────────────────────────┘
```

---

## File Sizes & Counts

```
SOURCE FILES                    TOTAL LINES (approx)
─────────────                   ────────────────────
Frontend Components: 25+        ~8,000 lines
Custom Hooks: 8                 ~1,200 lines
Store: 1                        ~600 lines
Data/Templates: 1               ~400 lines
Router/App: 2                   ~150 lines
─────────────                   ────────────────────
Frontend Total: ~37 files       ~10,350 lines

Backend Routes: 8               ~1,500 lines
Database Models: 1              ~250 lines
Auth: 1                         ~65 lines
Config: 1                       ~30 lines
Main: 1                         ~50 lines
─────────────                   ────────────────────
Backend Total: ~12 files        ~1,895 lines

Documentation: 5                ~1,500 lines
───────────────────────────────────────────────────
GRAND TOTAL: ~54 files          ~13,745 lines
```

---

*Document Version: 1.0*
*Last Updated: July 2026*
