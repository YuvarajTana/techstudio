# TECKSTUDIO Complete Module Inventory

Source of truth analyzed: `/Users/sandhya.arkadu/Desktop/realworld_projects/canva`

This document inventories the current application modules, frontend and backend ownership, APIs, database tables, workflows, dependencies, and implementation status based on the current codebase.

---

## 1. Project Architecture Overview

```text
Application
├── Frontend: React + Vite + TypeScript + Fabric.js + Zustand
│   ├── Authentication
│   ├── Dashboard
│   ├── Editor Shell
│   ├── Canvas Editor
│   ├── Pages / Layers / History
│   ├── Text / Typography / Fonts
│   ├── Elements / Shapes / Diagrams / Charts / QR
│   ├── Stickers
│   ├── Templates
│   ├── Brand Kit
│   ├── Assets / Uploads / Image Processing
│   ├── AI Studio
│   ├── Timeline / Audio / Video Export
│   └── Static Export / Sharing / Support UI
├── Backend: FastAPI + SQLAlchemy + MySQL + filesystem media storage
│   ├── main.py
│   ├── config.py
│   ├── auth.py
│   ├── database.py
│   ├── routes/
│   ├── services/
│   ├── schemas/
│   ├── migrations/
│   ├── scripts/
│   └── tests
└── Database
    ├── 37 SQLAlchemy models/tables
    ├── MySQL connection from backend/config.py
    └── Media files under backend/media
```

### Root Structure

- `frontend/` — Vite React application.
- `backend/` — FastAPI application, services, schemas, database models, migrations, tests, and media storage.
- `docs/` — architecture, HLD/LLD, scope, integration, and module documentation.
- `.mimocode/` — project planning/tool metadata.
- `.git/` — repository metadata.

### Important Frontend Files

- `frontend/src/App.tsx` — application routes and protected route handling.
- `frontend/src/Editor.tsx` — editor shell and panel composition.
- `frontend/src/store/useEditorStore.ts` — central Zustand editor/project/timeline state.
- `frontend/src/services/apiClient.ts` — API base URL, auth token handling, request helper.
- `frontend/src/config/design.ts` — canonical design composition constants.
- `frontend/src/types/timeline.ts` — timeline project, clips, transitions, audio clip types.
- `frontend/src/services/videoExportService.ts` — video render API client.

### Important Backend Files

- `backend/main.py` — FastAPI app, CORS, static media mount, router registration, health endpoints.
- `backend/config.py` — environment and settings.
- `backend/auth.py` — JWT/bcrypt/session dependency.
- `backend/database.py` — SQLAlchemy engine, session, models, schema initialization.
- `backend/routes/*.py` — route modules.
- `backend/services/*.py` — media, upload, poster analysis, video render services.
- `backend/schemas/*.py` — typed response/request schemas for selected modules.
- `backend/migrations/*.py` — schema migrations.

---

## 2. Total Module Count

- **TOTAL MAJOR MODULES:** 24
- **TOTAL SUB-MODULES:** 175
- **TOTAL FRONTEND MODULES:** 20
- **TOTAL BACKEND MODULES:** 24
- **TOTAL DATABASE MODELS/TABLES:** 37
- **TOTAL API ENDPOINTS:** 140

---

## 3. Complete Major Module List

1. Authentication & User Sessions
2. Dashboard & Project Management
3. Editor Shell & Canvas Core
4. Pages, Layers, History & Undo/Redo
5. Text, Typography & Fonts
6. Elements, Shapes, Diagrams, Charts & QR
7. Stickers
8. Templates
9. Brand Kit
10. Asset Library
11. Uploads & Editable Poster Imports
12. Image Processing & Media Fitting
13. AI Studio & AI Generators
14. Timeline & Playback
15. Audio, Background Music, SFX & Voiceover
16. Video Rendering, Animation & Video Export
17. Static Export & Sharing
18. Design Styling, Quality, Resize & Patterns
19. Notifications
20. Content Calendar
21. Generic Favorites
22. Audit Logs & Feature Flags
23. System Health, Config, Migrations & Stats
24. Tests, Documentation, Seeds & Catalogs

---

## 4. Detailed Explanation of Each Module

### Module 1 — Authentication & User Sessions

#### Purpose

Handles signup, login, logout, current-user lookup, JWT generation, and server-side session validation/revocation.

#### Main Features

- User registration.
- User login.
- JWT token generation.
- Auth session persistence by token hash.
- Protected route handling.
- Current-user endpoint.
- Logout/session revocation.
- Legacy password rehash support.

#### Sub-Modules

- Login form.
- Signup form.
- Protected route.
- Token storage.
- JWT decode/verify.
- Auth session table.
- Password hashing.

#### Frontend Files

- `frontend/src/App.tsx` — defines protected routes and redirects unauthenticated users.
- `frontend/src/components/auth/AuthPages.tsx` — login/signup UI and submit handlers.
- `frontend/src/services/apiClient.ts` — reads `teckstudio_auth_token` and attaches Authorization headers.

#### Backend Files

- `backend/routes/auth.py` — register, login, me, logout endpoints.
- `backend/auth.py` — bcrypt hashing, token creation/decode, `get_current_user`.
- `backend/config.py` — JWT settings.
- `backend/database.py` — `User`, `AuthSession`.

#### API Endpoints

| Method | Endpoint | Request | Response | Purpose | Auth |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | name, email, password | token, user | Create account | No |
| POST | `/api/auth/login` | email, password | token, user | Authenticate user | No |
| GET | `/api/auth/me` | Bearer token | user | Resolve current user | Yes |
| POST | `/api/auth/logout` | Bearer token | message | Revoke current session | Yes |

#### Database

- `users`
  - PK: `id`
  - Fields: `name`, `email`, `password_hash`, `avatar_url`, timestamps.
  - Relationships: projects, brand kits, favorites, templates, sessions, assets, uploads.
- `auth_sessions`
  - PK: `id`
  - FK: `user_id -> users.id`
  - Fields: `token_hash`, `user_agent`, `ip_address`, `expires_at`, `revoked_at`.

#### State Management

- `localStorage.teckstudio_auth_token`
- `localStorage.teckstudio_user`
- React local form state in `AuthPages`.

#### External Dependencies

- `python-jose`
- `bcrypt`
- FastAPI `HTTPBearer`

#### Workflow

```text
User submits login/signup
↓
AuthPages.tsx
↓
handleSubmit
↓
apiFetch('/api/auth/login' or '/api/auth/register')
↓
backend/routes/auth.py
↓
auth.py password/token logic
↓
users + auth_sessions tables
↓
AuthResponse
↓
localStorage token/user
↓
Navigate to dashboard
```

#### Status

✅ Fully Implemented

---

### Module 2 — Dashboard & Project Management

#### Purpose

Manages project listing, creation, opening, saving, autosave, deletion, trash, and restore.

#### Main Features

- Dashboard project list.
- Create blank project.
- Create AI-prompt project entry points.
- Open project in editor.
- Save project canvas JSON.
- Project rename metadata save.
- Trash and restore.
- Permanent delete.
- Local project fallback.
- Design version snapshots.

#### Sub-Modules

- Project grid.
- Quick create presets.
- Recent projects.
- Trash.
- Local project fallback.
- Autosave/versioning.
- Project load/apply.

#### Frontend Files

- `frontend/src/components/dashboard/Dashboard.tsx` — dashboard UI and project CRUD actions.
- `frontend/src/store/useEditorStore.ts` — `loadProject`, `saveHistory`, `setProjectName`, local/server persistence.
- `frontend/src/App.tsx` — dashboard route.

#### Backend Files

- `backend/routes/projects.py` — project CRUD/trash/restore APIs.
- `backend/database.py` — `Project`, `DesignVersion`, `DeletedItem`.

#### API Endpoints

| Method | Endpoint | Request | Response | Purpose | Auth |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/projects` | none | projects[] | List projects | Yes |
| POST | `/api/projects` | project create body | project | Create project | Yes |
| GET | `/api/projects/trash` | none | deleted items[] | List trash | Yes |
| POST | `/api/projects/trash/{deleted_item_id}/restore` | none | project | Restore project | Yes |
| DELETE | `/api/projects/trash/{deleted_item_id}` | none | message | Permanent delete | Yes |
| GET | `/api/projects/{project_id}` | path ID | project | Load project | Yes |
| PUT | `/api/projects/{project_id}` | partial project update | project | Save/update project | Yes |
| DELETE | `/api/projects/{project_id}` | path ID | message | Move to trash | Yes |

#### Database

- `projects`
  - PK: `id`
  - FK: `user_id`
  - Fields: `name`, `data`, `thumbnail`, `width`, `height`, `background_color`, `design_type`, `prompt`, `provider`, timestamps.
- `design_versions`
  - PK: `id`
  - FK: `project_id`
  - Fields: `version_number`, `name`, `data`, `thumbnail`.
- `deleted_items`
  - Stores deleted project metadata for restore.

#### State Management

- Dashboard React state for project lists.
- Zustand project state: `projectId`, `projectName`, `projectUpdatedAt`, canvas state, history.
- `localStorage.teckstudio_local_projects` for local projects.

#### External Dependencies

- Fabric.js for serialized canvas JSON.

#### Workflow

```text
User creates/opens project
↓
Dashboard.tsx
↓
apiFetch('/api/projects')
↓
backend/routes/projects.py
↓
Project / DesignVersion / DeletedItem
↓
ProjectResponse
↓
Navigate to /editor/:id
↓
useEditorStore.loadProject
↓
Canvas and metadata restore
```

#### Status

✅ Fully Implemented

---

### Module 3 — Editor Shell & Canvas Core

#### Purpose

Provides the main design editor surface and Fabric.js canvas interaction layer.

#### Main Features

- Editor page layout.
- Top toolbar.
- Left sidebar.
- Right panel tabs.
- Fabric canvas initialization.
- Object selection and transform.
- Floating object toolbar.
- Zoom controls.
- Context menu.
- Keyboard shortcuts.
- Snap/grid/ruler helpers.
- Dev mode inspector.

#### Sub-Modules

- Canvas workspace.
- Toolbar.
- Sidebar.
- Properties panel.
- Context menu.
- Zoom controller.
- Grid/rulers.
- Keyboard shortcuts.
- Smart guides.
- Lasso/pen tools.

#### Frontend Files

- `frontend/src/Editor.tsx` — editor shell and panel composition.
- `frontend/src/components/editor/CanvasWorkspace.tsx` — Fabric canvas lifecycle and canvas event wiring.
- `frontend/src/components/editor/Toolbar.tsx` — top-level actions.
- `frontend/src/components/editor/Sidebar.tsx` — left module panels.
- `frontend/src/components/editor/PropertiesPanel.tsx` — object properties.
- `frontend/src/components/editor/ElementToolbar.tsx` — selected-object floating actions.
- `frontend/src/components/editor/ContextMenu.tsx` — canvas/object context menu.
- `frontend/src/components/editor/ZoomController.tsx` — zoom UI.
- `frontend/src/components/editor/GridOverlay.tsx` — grid overlay.
- `frontend/src/components/editor/Rulers.tsx` — ruler UI.
- `frontend/src/components/editor/DevModeInspector.tsx` — debug inspector.
- `frontend/src/hooks/useCanvasTools.ts` — shape/canvas tool actions.
- `frontend/src/hooks/useKeyboardShortcuts.ts` — keyboard actions.
- `frontend/src/hooks/useSmartGuides.ts` — alignment guide helpers.
- `frontend/src/hooks/useSnapToGrid.ts` — snapping behavior.

#### Backend Files

- No dedicated editor backend.
- Uses `backend/routes/projects.py` indirectly for persistence.

#### API Endpoints

- Uses project APIs indirectly: `GET /api/projects/{project_id}`, `PUT /api/projects/{project_id}`.

#### Database

- `projects.data` stores serialized Fabric canvas and TECKSTUDIO metadata.
- `design_versions.data` stores snapshots.

#### State Management

- Zustand `useEditorStore`.
- Fabric canvas object state.
- React local state in editor panels.

#### External Dependencies

- Fabric.js
- React
- Zustand

#### Workflow

```text
User opens editor
↓
Editor.tsx
↓
CanvasWorkspace mounts Fabric canvas
↓
useEditorStore.setCanvas
↓
User edits object
↓
Fabric event handlers
↓
useEditorStore.saveHistory
↓
Serialized canvas JSON
↓
Project API save
↓
UI shows saved state
```

#### Status

🟡 Partially Implemented

---

### Module 4 — Pages, Layers, History & Undo/Redo

#### Purpose

Manages multiple poster pages, object ordering, layer list, undo/redo history, and page-specific canvas synchronization.

#### Main Features

- Page list.
- Add/duplicate/delete pages.
- Active page switching.
- Layer list and names.
- Object lock/visibility.
- History panel.
- Undo/redo.
- Active page sync into project JSON.

#### Sub-Modules

- Pages panel.
- Layers panel.
- Layer item controls.
- History panel.
- Page serialization.
- Undo/redo stack.

#### Frontend Files

- `frontend/src/components/editor/PagesPanel.tsx`
- `frontend/src/components/editor/LayerItem.tsx`
- `frontend/src/components/editor/HistoryPanel.tsx`
- `frontend/src/components/editor/layerUtils.ts`
- `frontend/src/store/useEditorStore.ts`

#### Backend Files

- `backend/routes/projects.py` stores page/layer/history-relevant canvas JSON.

#### API Endpoints

- `PUT /api/projects/{project_id}` — saves serialized pages/layers.
- `GET /api/projects/{project_id}` — loads serialized pages/layers.

#### Database

- `projects.data`
- `design_versions.data`

#### State Management

- Zustand `pages`, `activePageId`, `history`, `historyIndex`.
- Fabric object state.

#### Workflow

```text
User changes page/layer
↓
PagesPanel / LayerItem / HistoryPanel
↓
useEditorStore action
↓
Canvas state sync
↓
saveHistory serializes pages + canvas
↓
Project API save
↓
DB stores serialized data
```

#### Status

🟡 Partially Implemented

---

### Module 5 — Text, Typography & Fonts

#### Purpose

Adds and styles text objects, applies typography presets/effects, and manages built-in/uploaded fonts.

#### Main Features

- Text presets.
- Font family selection.
- Font upload.
- Font favorites.
- Font use tracking.
- Text size control.
- Text effects.
- Rounded highlight.
- Gradient text.
- Text on path.
- Editable text properties.

#### Sub-Modules

- Text presets.
- Font browser.
- Font upload.
- Text effects.
- Text path tools.
- Font loading.

#### Frontend Files

- `frontend/src/components/editor/TextStylesPanel.tsx`
- `frontend/src/components/editor/TextToolsPanel.tsx`
- `frontend/src/components/editor/TextFontSizeControl.tsx`
- `frontend/src/components/editor/TextEffectsPanel.tsx`
- `frontend/src/components/editor/TextOnPath.tsx`
- `frontend/src/components/editor/RoundedHighlightControls.tsx`
- `frontend/src/components/editor/FontBrowserPanel.tsx`
- `frontend/src/config/textPresets.ts`
- `frontend/src/services/fontsApi.ts`
- `frontend/src/utils/fontLoader.ts`
- `frontend/src/utils/textEffects.ts`
- `frontend/src/utils/roundedHighlightText.ts`

#### Backend Files

- `backend/routes/fonts.py`
- `backend/font_catalog.py`
- `backend/database.py`

#### API Endpoints

| Method | Endpoint | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/api/fonts` | List built-in/uploaded fonts | Optional/public |
| POST | `/api/fonts/upload` | Upload font file | Yes |
| DELETE | `/api/fonts/{font_id}` | Delete uploaded font | Yes |
| POST | `/api/fonts/{font_id}/favorite` | Favorite font | Yes |
| DELETE | `/api/fonts/{font_id}/favorite` | Unfavorite font | Yes |
| POST | `/api/fonts/{font_id}/use` | Record font use | Yes |

#### Database

- `font_assets`
- `favorites`

#### State Management

- React panel state.
- Fabric text object properties.
- Server state from fonts API.
- Project persistence through canvas JSON.

#### External Dependencies

- Browser font loading APIs.
- Fabric text objects.

#### Workflow

```text
User picks text preset/font/effect
↓
Text panel component
↓
Fabric text object mutation
↓
Font API when listing/uploading/favoriting fonts
↓
DB/media for uploaded fonts
↓
saveHistory persists project JSON
```

#### Status

🟡 Partially Implemented

---

### Module 6 — Elements, Shapes, Diagrams, Charts & QR

#### Purpose

Provides insertable design elements, generated elements, architecture diagrams, chart generation, QR generation, and shape registries.

#### Main Features

- Element categories.
- Element listing/search.
- Recent/favorite elements.
- Recommendations.
- AI element generation.
- Collections.
- Shapes and graphics registries.
- Architecture diagram nodes/connectors.
- Chart generator.
- QR code generator.

#### Sub-Modules

- Elements browser.
- Shapes.
- Graphics registry.
- Architecture diagrams.
- Charts.
- QR codes.
- Element favorites/recent.
- Collections.

#### Frontend Files

- `frontend/src/components/editor/ElementsPanel.tsx`
- `frontend/src/components/editor/ArchitectureDiagramPanel.tsx`
- `frontend/src/components/editor/ChartGeneratorModal.tsx`
- `frontend/src/components/editor/QRCodeModal.tsx`
- `frontend/src/components/editor/ElementPropertiesControls.tsx`
- `frontend/src/utils/editorElementFactory.ts`
- `frontend/src/utils/architectureLibrary.ts`
- `frontend/src/utils/architectureDiagram.ts`
- `frontend/src/utils/architectureDiagramTypes.ts`
- `frontend/src/utils/diagramConnectors.ts`
- `frontend/src/utils/shapeRegistry.ts`
- `frontend/src/utils/graphicsRegistry.ts`
- `frontend/src/utils/formsRegistry.ts`
- `frontend/src/utils/svgElementUtils.ts`

#### Backend Files

- `backend/routes/elements.py`
- `backend/routes/charts.py`
- `backend/routes/qrcode.py`
- `backend/database.py`

#### API Endpoints

- `GET /api/elements/categories`
- `GET /api/elements`
- `GET /api/elements/search`
- `GET /api/elements/recent`
- `POST /api/elements/recent`
- `GET /api/elements/favorites`
- `POST /api/elements/favorites/{element_id}`
- `GET /api/elements/recommendations`
- `POST /api/elements/generate`
- `GET /api/elements/collections`
- `POST /api/elements/collections`
- `DELETE /api/elements/collections/{collection_id}`
- `POST /api/charts/generate`
- `POST /api/qrcode/generate`

#### Database

- `element_categories`
- `element_favorites`
- `element_recent_items`
- `element_collections`
- `element_collection_items`

#### State Management

- React panel state.
- Fabric object state.
- Server state for recent/favorites/collections.

#### External Dependencies

- Fabric.js
- AI provider code for generated elements.

#### Workflow

```text
User selects/generates element
↓
ElementsPanel / modal
↓
Element API if server-backed
↓
Backend route and optional DB
↓
Frontend inserts Fabric object
↓
saveHistory persists project JSON
```

#### Status

🟡 Partially Implemented

---

### Module 7 — Stickers

#### Purpose

Provides sticker catalog browsing, favorites, use tracking, and sticker editing controls.

#### Main Features

- Sticker categories.
- Sticker list.
- Favorite/unfavorite sticker.
- Record sticker use.
- Tint/opacity/effect controls.

#### Sub-Modules

- Sticker catalog.
- Favorites.
- Usage.
- Sticker editing.

#### Frontend Files

- `frontend/src/components/editor/StickersPanel.tsx`
- `frontend/src/components/editor/StickerEditingControls.tsx`
- `frontend/src/services/stickersApi.ts`
- `frontend/src/utils/stickerCanvas.ts`

#### Backend Files

- `backend/routes/stickers.py`
- `backend/sticker_catalog.py`

#### API Endpoints

- `GET /api/stickers/categories`
- `GET /api/stickers`
- `POST /api/stickers/{sticker_id}/favorite`
- `POST /api/stickers/{sticker_id}/favourite`
- `DELETE /api/stickers/{sticker_id}/favorite`
- `DELETE /api/stickers/{sticker_id}/favourite`
- `POST /api/stickers/{sticker_id}/use`

#### Database

- `favorites`

#### State Management

- React panel state.
- Fabric sticker object metadata.
- Server favorite/use state.

#### External Dependencies

- Fabric.js
- Local sticker catalog.

#### Workflow

```text
User selects sticker
↓
StickersPanel
↓
stickersApi for list/favorite/use
↓
routes/stickers.py
↓
favorites table if user action
↓
Fabric object inserted/edited
↓
Project JSON saved
```

#### Status

🟡 Partially Implemented

---

### Module 8 — Templates

#### Purpose

Supports browsing, viewing, favoriting, applying, remixing, quick replacing, creating, updating, and deleting design templates.

#### Main Features

- Template listing.
- Categories and type tabs.
- Search/sort/filter.
- Template detail.
- Related templates.
- Preview modal.
- Favorite/unfavorite.
- Use/apply/remix/quick replace.
- Save current design as template.
- Template CRUD.

#### Sub-Modules

- Template grid.
- Category filters.
- Type tabs.
- Search bar.
- Detail page.
- Preview modal.
- Related templates.
- Favorite button.
- Phase two actions.
- Save as template.

#### Frontend Files

- `frontend/src/components/templates/TemplatesPage.tsx`
- `frontend/src/components/templates/TemplateGrid.tsx`
- `frontend/src/components/templates/TemplateCard.tsx`
- `frontend/src/components/templates/TemplateDetailPage.tsx`
- `frontend/src/components/templates/TemplatePreviewModal.tsx`
- `frontend/src/components/templates/TemplateFavouriteButton.tsx`
- `frontend/src/components/templates/TemplateCategoryFilters.tsx`
- `frontend/src/components/templates/TemplatesSearchBar.tsx`
- `frontend/src/components/templates/TemplateSortDropdown.tsx`
- `frontend/src/components/templates/TemplateTypeTabs.tsx`
- `frontend/src/components/editor/SaveAsTemplate.tsx`
- `frontend/src/hooks/useTemplatesData.ts`
- `frontend/src/hooks/useTemplateDetail.ts`
- `frontend/src/hooks/useTemplateUrlFilters.ts`
- `frontend/src/services/templatesApi.ts`
- `frontend/src/utils/templateCompatibility.ts`

#### Backend Files

- `backend/routes/templates.py`
- `backend/schemas/templates.py`
- `backend/database.py`

#### API Endpoints

- `GET /api/templates/categories`
- `GET /api/templates`
- `GET /api/templates/{template_id}`
- `GET /api/templates/{template_id}/related`
- `POST /api/templates/{template_id}/favourite`
- `POST /api/templates/{template_id}/favorite`
- `DELETE /api/templates/{template_id}/favourite`
- `DELETE /api/templates/{template_id}/favorite`
- `POST /api/templates/{template_id}/use`
- `POST /api/templates/{template_id}/apply`
- `POST /api/templates/{template_id}/remix`
- `POST /api/templates/{template_id}/quick-replace`
- `POST /api/templates`
- `PUT /api/templates/{template_id}`
- `DELETE /api/templates/{template_id}`

#### Database

- `templates`
- `categories`
- `template_subcategories`
- `template_favourites`
- `template_usage`
- `projects`

#### State Management

- React template page state.
- URL filters.
- Server template state.
- Editor project state when applied.

#### External Dependencies

- Fabric canvas JSON compatibility utilities.

#### Workflow

```text
User browses/applies template
↓
Template components / templatesApi
↓
routes/templates.py
↓
templates/category/favourite/usage/project tables
↓
TemplateUseResponse or project response
↓
Editor loads/applies resulting canvas
```

#### Status

🟡 Partially Implemented

---

### Module 9 — Brand Kit

#### Purpose

Manages reusable brand kits containing colors, fonts, and logos.

#### Main Features

- Kit CRUD.
- Duplicate kit.
- Colors CRUD.
- Fonts CRUD.
- Logos CRUD.
- Dashboard brand hub.
- Editor brand panel.
- Queue brand kit application to editor.

#### Sub-Modules

- Kit metadata.
- Brand colors.
- Brand fonts.
- Brand logos.
- Dashboard brand hub.
- Editor brand panel.

#### Frontend Files

- `frontend/src/components/editor/BrandKit.tsx`
- `frontend/src/components/dashboard/Dashboard.tsx`

#### Backend Files

- `backend/routes/brand_kits.py`
- `backend/database.py`

#### API Endpoints

- `GET /api/brand-kits`
- `POST /api/brand-kits`
- `GET /api/brand-kits/{kit_id}`
- `PATCH /api/brand-kits/{kit_id}`
- `POST /api/brand-kits/{kit_id}/duplicate`
- `DELETE /api/brand-kits/{kit_id}`
- `POST /api/brand-kits/{kit_id}/colors`
- `PUT /api/brand-kits/{kit_id}/colors/{color_id}`
- `DELETE /api/brand-kits/{kit_id}/colors/{color_id}`
- `POST /api/brand-kits/{kit_id}/fonts`
- `PUT /api/brand-kits/{kit_id}/fonts/{font_id}`
- `DELETE /api/brand-kits/{kit_id}/fonts/{font_id}`
- `POST /api/brand-kits/{kit_id}/logos`
- `PUT /api/brand-kits/{kit_id}/logos/{logo_id}`
- `DELETE /api/brand-kits/{kit_id}/logos/{logo_id}`

#### Database

- `brand_kits`
- `brand_colors`
- `brand_fonts`
- `brand_logos`

#### State Management

- React panel state.
- Server state.
- `localStorage.teckstudio_pending_brand_kit` for editor handoff.

#### Workflow

```text
User edits brand kit
↓
BrandKit / Dashboard
↓
apiFetch('/api/brand-kits...')
↓
routes/brand_kits.py
↓
brand_* tables
↓
BrandKitResponse
↓
Frontend updates kit UI or applies to canvas
```

#### Status

✅ Fully Implemented for CRUD/API; canvas application is frontend-driven.

---

### Module 10 — Asset Library

#### Purpose

Provides curated/public/private assets, categories, search, CRUD, and data URL retrieval.

#### Main Features

- Asset categories.
- Asset list/search.
- Asset detail.
- Asset data URL.
- Authenticated asset create/update/delete.
- Curated asset seed/catalog support.

#### Sub-Modules

- Asset browser.
- Asset categories.
- Search.
- Data URL resolver.
- Curated seed assets.
- DAM metadata.

#### Frontend Files

- `frontend/src/components/editor/RoyaltyFreeAssets.tsx`
- `frontend/src/utils/assetUrlResolver.ts`

#### Backend Files

- `backend/routes/assets.py`
- `backend/asset_providers.py`
- `backend/curated_asset_seed.py`
- `backend/database.py`

#### API Endpoints

- `GET /api/assets/categories`
- `GET /api/assets/search`
- `GET /api/assets/{asset_id}`
- `GET /api/assets/{asset_id}/data-url`
- `GET /api/assets`
- `POST /api/assets`
- `PUT /api/assets/{asset_id}`
- `DELETE /api/assets/{asset_id}`

#### Database

- `assets`
- `generated_assets`

#### State Management

- React panel state.
- Server asset state.
- Fabric object state after insertion.

#### External Dependencies

- Media files under backend media directories.

#### Workflow

```text
User searches/selects asset
↓
RoyaltyFreeAssets
↓
/api/assets list/search/data-url
↓
routes/assets.py
↓
assets table + media filesystem
↓
Asset response/data URL
↓
Fabric image inserted
↓
Project saved
```

#### Status

🟡 Partially Implemented

---

### Module 11 — Uploads & Editable Poster Imports

#### Purpose

Manages user uploaded images and converts poster images into editable text/region layers.

#### Main Features

- Upload image.
- List uploaded images.
- Rename/delete uploads.
- Upload insertion into canvas.
- Poster analysis job.
- Make poster editable.
- Convert text regions.
- Retry cleanup.

#### Sub-Modules

- Upload manager.
- Upload card.
- Poster conversion dialog.
- Editable import controls.
- Region color controls.
- OCR/poster analysis service.

#### Frontend Files

- `frontend/src/components/editor/uploads/UploadsPanel.tsx`
- `frontend/src/components/editor/uploads/UploadedAssetCard.tsx`
- `frontend/src/components/editor/image/PosterConversionDialog.tsx`
- `frontend/src/components/editor/image/EditableImportControls.tsx`
- `frontend/src/components/editor/image/PosterColourControls.tsx`
- `frontend/src/services/uploadsApi.ts`
- `frontend/src/types/uploads.ts`
- `frontend/src/config/uploads.ts`
- `frontend/src/utils/uploadedImageCanvas.ts`
- `frontend/src/utils/posterConversionCanvas.ts`

#### Backend Files

- `backend/routes/uploads.py`
- `backend/routes/poster_analysis.py`
- `backend/services/upload_service.py`
- `backend/services/poster_analysis_service.py`
- `backend/services/ocr_service.py`
- `backend/schemas/uploads.py`
- `backend/schemas/editable_imports.py`

#### API Endpoints

- `POST /api/uploads/images`
- `GET /api/uploads/images`
- `GET /api/uploads/images/{asset_id}`
- `PATCH /api/uploads/images/{asset_id}`
- `DELETE /api/uploads/images/{asset_id}`
- `POST /api/image-edit/analyze`
- `GET /api/image-edit/jobs/{job_id}`
- `DELETE /api/image-edit/jobs/{job_id}`
- `POST /api/image-edit/make-editable`
- `POST /api/image-edit/regions/convert`
- `POST /api/image-edit/retry-cleanup`

#### Database

- `uploaded_assets`
- `poster_analysis_jobs`

#### State Management

- React upload panel state.
- Server upload/job state.
- Fabric image/object state.

#### External Dependencies

- Pillow.
- OCR providers.
- Gemini/OpenAI fallback for OCR according to config.

#### Workflow

```text
User uploads poster image
↓
UploadsPanel
↓
uploadsApi
↓
routes/uploads.py
↓
upload_service persists image/thumbnail
↓
uploaded_assets table + media files
↓
User starts editable import
↓
routes/poster_analysis.py
↓
poster_analysis_jobs + OCR/service
↓
Frontend converts regions into Fabric objects
```

#### Status

🟡 Partially Implemented

---

### Module 12 — Image Processing & Media Fitting

#### Purpose

Applies image editing operations and media fitting behavior for canvas images.

#### Main Features

- Crop.
- Filters.
- Background removal.
- Person mask.
- Image effects.
- Media fitting controls.
- Processed image persistence.

#### Sub-Modules

- Cropper.
- Image filters.
- Background remover.
- Media fitting controls.
- Processed-image API.

#### Frontend Files

- `frontend/src/components/editor/ImageCropper.tsx`
- `frontend/src/components/editor/ImageFilters.tsx`
- `frontend/src/components/editor/BackgroundRemover.tsx`
- `frontend/src/components/editor/MediaFittingControls.tsx`
- `frontend/src/services/imageProcessingApi.ts`
- `frontend/src/utils/imageEffects.ts`
- `frontend/src/utils/mediaFittingUtils.ts`

#### Backend Files

- `backend/routes/images.py`
- `backend/services/background_removal_service.py`
- `backend/database.py`

#### API Endpoints

- `POST /api/images/remove-background`
- `POST /api/images/person-mask`
- `POST /api/images/apply-effect`

#### Database

- `processed_images`

#### State Management

- React panel/modal state.
- Fabric image object state.
- Server processed image records.

#### External Dependencies

- Pillow.
- Optional background removal provider.

#### Workflow

```text
User applies image operation
↓
Image component/service
↓
apiFetch('/api/images/...')
↓
routes/images.py
↓
Image processing service/Pillow/provider
↓
processed_images + media file
↓
URL returned
↓
Fabric image updated
```

#### Status

🟡 Partially Implemented

---

### Module 13 — AI Studio & AI Generators

#### Purpose

Provides AI chat, poster spec generation, poster images, image generation, thumbnails, provider status, and prompt enhancement.

#### Main Features

- AI Chat.
- AI poster spec.
- AI poster template.
- Reference poster.
- Poster image generation.
- Image prompt generation.
- AI image generation.
- Thumbnail generation.
- Provider status.
- Cache status/clear.
- AI health.
- Attachments for generation.

#### Sub-Modules

- Chat.
- Poster spec generator.
- Poster image generator.
- Image generator.
- Thumbnail generator.
- Provider health.
- Prompt enhancer.
- AI cache.
- Generated asset actions.

#### Frontend Files

- `frontend/src/components/editor/AIAssistant.tsx`
- `frontend/src/components/editor/GeneratedAssetActions.tsx`
- `frontend/src/components/editor/AILayoutSuggester.tsx`
- `frontend/src/services/aiClient.ts`
- `frontend/src/types/ai.ts`
- `frontend/src/utils/posterSpecRenderer.ts`

#### Backend Files

- `backend/routes/ai.py`
- `backend/routes/ai_poster.py`
- `backend/database.py`
- `backend/config.py`

#### API Endpoints

- `GET /api/ai/provider-status`
- `GET /api/ai/providers/status`
- `POST /api/ai/generate-poster-spec`
- `POST /api/ai/generate-poster-template`
- `POST /api/ai/generate-reference-poster`
- `POST /api/ai/posters/generate`
- `POST /api/ai/generate-poster-image`
- `POST /api/ai/generate-poster`
- `POST /api/ai/generate-image-prompt`
- `POST /api/ai/chat`
- `GET /api/ai/chat/{conversation_id}`
- `POST /api/ai/images/generate`
- `POST /api/ai/generate-image`
- `POST /api/ai/thumbnails/generate`
- `POST /api/ai/generate-thumbnail`
- `GET /api/ai/cache/status`
- `DELETE /api/ai/cache`
- `GET /api/ai/health`
- `POST /api/ai-poster/generate`
- `POST /api/ai-poster/analyze`

#### Database

- `chat_sessions`
- `chat_messages`
- `generated_assets`
- `generation_jobs`

#### State Management

- React AI panel state.
- Server persisted chat/generation records.
- Editor canvas state for applying AI outputs.

#### External Dependencies

- Gemini.
- OpenAI.
- Stability.
- Pollinations.
- HTTPX.
- Pillow.

#### Workflow

```text
User enters AI prompt
↓
AIAssistant
↓
apiFetch('/api/ai/...')
↓
routes/ai.py or routes/ai_poster.py
↓
Provider selection/config/cache
↓
External AI provider or fallback
↓
generated_assets/chat tables
↓
Response to frontend
↓
UI displays reply/asset or inserts into canvas
```

#### Status

⚠️ Cannot Verify fully without external provider credentials/billing.

---

### Module 14 — Timeline & Playback

#### Purpose

Maintains poster scene timeline, FPS, duration, playhead, transitions, and preview playback state.

#### Main Features

- Poster scene clips.
- Add current page.
- Play/pause/stop.
- Seek.
- Previous/next frame.
- Timeline zoom.
- FPS selection: 24/30/60.
- Scene duration.
- Transitions.
- Timeline serialization.

#### Sub-Modules

- Timeline panel.
- Poster scene clips.
- Add poster menu.
- Playback manager.
- FPS/duration calculation.
- Transitions.

#### Frontend Files

- `frontend/src/components/editor/TimelinePanel.tsx`
- `frontend/src/components/editor/timeline/AddPosterMenu.tsx`
- `frontend/src/types/timeline.ts`
- `frontend/src/utils/masterTimelineManager.ts`
- `frontend/src/utils/timelineExport.ts`
- `frontend/src/utils/animationEvaluator.ts`
- `frontend/src/config/design.ts`

#### Backend Files

- `backend/routes/video_render.py`
- `backend/services/video_render_service.py`

#### API Endpoints

- Uses project APIs for persistence.
- Uses video APIs for export.

#### Database

- `projects.data`
- `video_render_jobs.timeline_json`

#### State Management

- Zustand `timelineProject`.
- Master timeline manager runtime state.

#### Workflow

```text
User changes timeline
↓
TimelinePanel
↓
useEditorStore timeline action
↓
timelineProject updated
↓
saveHistory serializes timeline into project JSON
↓
Project API save
↓
Timeline restored on project load
```

#### Status

🟡 Partially Implemented

---

### Module 15 — Audio, Background Music, SFX & Voiceover

#### Purpose

Adds audio clips to timeline, records voiceover, controls mute/volume/ducking/trims, and passes audio into export.

#### Main Features

- Add music.
- Add sound effects.
- Record voiceover.
- Audio clip rows.
- Volume/mute.
- Trim.
- Loop.
- Auto-fit background music.
- Audio ducking.
- Export audio files with video.

#### Sub-Modules

- Multi-track audio panel.
- Audio track row.
- Voice recorder modal.
- Audio ducking.
- Timeline audio clip serialization.

#### Frontend Files

- `frontend/src/components/editor/timeline/MultiTrackAudioPanel.tsx`
- `frontend/src/components/editor/timeline/AudioTrackRow.tsx`
- `frontend/src/components/editor/timeline/VoiceRecorderModal.tsx`
- `frontend/src/types/timeline.ts`
- `frontend/src/components/editor/export/VideoExportDialog.tsx`

#### Backend Files

- `backend/routes/video_render.py`
- `backend/services/video_render_service.py`

#### API Endpoints

- Audio is included in `POST /api/video/render/frames`.
- Audio contributes to video finalization through `/api/video/render/{job_id}/finalize`.

#### Database

- Audio metadata is stored inside `projects.data`.
- Export timeline stored in `video_render_jobs.timeline_json`.

#### State Management

- Zustand `timelineProject.audioClips`.
- React audio upload/recorder state.

#### External Dependencies

- Browser FileReader.
- Browser Audio API.
- Browser MediaRecorder API.
- FFmpeg for export mixing.

#### Workflow

```text
User adds/records audio
↓
MultiTrackAudioPanel / VoiceRecorderModal
↓
Audio file/blob decoded to data/blob URL
↓
timelineProject.audioClips updated
↓
saveHistory persists project
↓
VideoExportDialog materializes audio files
↓
Video render API
↓
FFmpeg mixes audio into output
```

#### Status

🟡 Partially Implemented

---

### Module 16 — Video Rendering, Animation & Video Export

#### Purpose

Exports timeline scenes and animations as MP4/WebM by rendering browser frames and encoding with FFmpeg on the backend.

#### Main Features

- Export video dialog.
- Frame generation.
- Frame upload batches.
- Render job creation/status/cancel.
- Finalization/encoding.
- MP4/WebM output.
- FPS validation.
- Audio mixing.
- FFmpeg command construction.
- Output verification.

#### Sub-Modules

- Video export service.
- Scene timeline renderer.
- Animation evaluator.
- Backend render route.
- Backend render service.
- Render job status/download.

#### Frontend Files

- `frontend/src/components/editor/export/VideoExportDialog.tsx`
- `frontend/src/services/videoExportService.ts`
- `frontend/src/types/videoExport.ts`
- `frontend/src/utils/sceneTimelineRenderer.ts`
- `frontend/src/utils/animationEvaluator.ts`
- `frontend/src/utils/posterVideoComposition.ts`

#### Backend Files

- `backend/routes/video_render.py`
- `backend/services/video_render_service.py`
- `backend/schemas/video_render.py`
- `backend/database.py`

#### API Endpoints

- `POST /api/video/render/frames`
- `POST /api/video/render/{job_id}/frames`
- `POST /api/video/render/{job_id}/finalize`
- `POST /api/video/render`
- `GET /api/video/render/{job_id}`
- `DELETE /api/video/render/{job_id}`
- `GET /api/video/download/{job_id}`

#### Database

- `video_render_jobs`
- `export_metadata`

#### State Management

- React export dialog state.
- Zustand timeline state.
- Server job status state.

#### External Dependencies

- FFmpeg.
- ffprobe.
- Browser canvas rendering.

#### Workflow

```text
User clicks Export Video
↓
VideoExportDialog
↓
Render poster frames from pages/timeline
↓
videoExportService creates render job
↓
routes/video_render.py
↓
video_render_jobs row
↓
Frontend uploads frames
↓
Backend stores frames
↓
Finalize endpoint
↓
video_render_service builds FFmpeg command
↓
Output media file + job status
↓
Frontend downloads final video
```

#### Status

🟡 Partially Implemented; runtime depends on auth and FFmpeg availability.

---

### Module 17 — Static Export & Sharing

#### Purpose

Provides static export UI and shareable design links.

#### Main Features

- Export panel.
- Export settings.
- Share modal.
- Share link creation.
- Share listing.
- Public share token view.
- Share deletion.

#### Sub-Modules

- Static export panel.
- Export settings.
- Share modal.
- Public view route.

#### Frontend Files

- `frontend/src/components/editor/EnhancedExportPanel.tsx`
- `frontend/src/components/editor/ExportSettings.tsx`
- `frontend/src/components/editor/ShareModal.tsx`
- `frontend/src/App.tsx`

#### Backend Files

- `backend/routes/shared.py`
- `backend/database.py`

#### API Endpoints

- `GET /api/shared`
- `POST /api/shared`
- `GET /api/shared/by-token/{token}`
- `DELETE /api/shared/{share_id}`

#### Database

- `shared_designs`
- `export_metadata`

#### State Management

- React export/share UI state.
- Server share state.

#### External Dependencies

- jsPDF.
- Fabric canvas static export.

#### Workflow

```text
User exports or shares
↓
Export panel / ShareModal
↓
Frontend canvas export or /api/shared
↓
shared_designs table for links
↓
Share URL or downloaded static asset
```

#### Status

🟡 Partially Implemented

---

### Module 18 — Design Styling, Quality, Resize & Patterns

#### Purpose

Provides frontend design assistance tools such as palettes, effects, patterns, smart resize, and quality checks.

#### Main Features

- Color palette generator.
- Gradient picker.
- Effects panel.
- Background patterns.
- Smart resize.
- Design quality panel.
- Alignment tools.
- Presets.

#### Sub-Modules

- Colors.
- Effects.
- Patterns.
- Resize.
- Audit/quality.
- Alignment.
- Presets.

#### Frontend Files

- `frontend/src/components/editor/ColorPaletteGenerator.tsx`
- `frontend/src/components/editor/GradientPicker.tsx`
- `frontend/src/components/editor/EffectsPanel.tsx`
- `frontend/src/components/editor/BackgroundPatterns.tsx`
- `frontend/src/components/editor/SmartResize.tsx`
- `frontend/src/components/editor/DesignQualityPanel.tsx`
- `frontend/src/components/editor/AlignmentTools.tsx`
- `frontend/src/components/editor/DesignPresetsPanel.tsx`
- `frontend/src/utils/designQualityChecker.ts`
- `frontend/src/utils/designPresets.ts`

#### Backend Files

- No dedicated backend.

#### API Endpoints

- No dedicated endpoint.
- Persists through project save APIs.

#### Database

- `projects.data`

#### State Management

- React local state.
- Fabric object/canvas state.
- Zustand save pipeline.

#### Workflow

```text
User applies style/tool
↓
Frontend styling component
↓
Fabric object/canvas mutation
↓
saveHistory
↓
Project persistence
```

#### Status

⚪ Mostly UI/frontend-only

---

### Module 19 — Notifications

#### Purpose

Manages user notification records and read/delete status.

#### Main Features

- List notifications.
- Create notification.
- Mark one read.
- Mark all read.
- Delete notification.

#### Sub-Modules

- Notification center.
- Notification CRUD.
- Read status.

#### Frontend Files

- `frontend/src/components/editor/NotificationCenter.tsx`

#### Backend Files

- `backend/routes/notifications.py`
- `backend/database.py`

#### API Endpoints

- `GET /api/notifications`
- `POST /api/notifications`
- `POST /api/notifications/{notification_id}/read`
- `POST /api/notifications/read-all`
- `DELETE /api/notifications/{notification_id}`

#### Database

- `notifications`

#### State Management

- React notification center state.
- Server notification state.

#### Workflow

```text
User opens notification center
↓
NotificationCenter
↓
/api/notifications
↓
notifications table
↓
Response updates UI
```

#### Status

🟡 Partially Implemented

---

### Module 20 — Content Calendar

#### Purpose

Manages simple content planning events.

#### Main Features

- List calendar events.
- Create event.
- Delete event.

#### Sub-Modules

- Content planner modal.
- Event CRUD.

#### Frontend Files

- `frontend/src/components/editor/ContentPlannerModal.tsx`

#### Backend Files

- `backend/routes/content_calendar.py`
- `backend/database.py`

#### API Endpoints

- `GET /api/content-calendar`
- `POST /api/content-calendar`
- `DELETE /api/content-calendar/{event_id}`

#### Database

- `content_calendar_events`

#### State Management

- React modal state.
- Server event state.

#### Workflow

```text
User opens planner
↓
ContentPlannerModal
↓
/api/content-calendar
↓
content_calendar_events table
↓
Events render in UI
```

#### Status

🟡 Partially Implemented

---

### Module 21 — Generic Favorites

#### Purpose

Provides a generic favorite record API used by multiple resource types.

#### Main Features

- List favorites.
- Create favorite.
- Delete favorite.

#### Sub-Modules

- Favorite list.
- Favorite create.
- Favorite delete.

#### Frontend Files

- Used indirectly by dashboard/assets/templates/stickers/fonts features.

#### Backend Files

- `backend/routes/favorites.py`
- `backend/database.py`

#### API Endpoints

- `GET /api/favorites`
- `POST /api/favorites`
- `DELETE /api/favorites/{fav_id}`

#### Database

- `favorites`

#### State Management

- Server state; frontend module-specific components maintain local state.

#### Workflow

```text
User favorites resource
↓
Module-specific UI
↓
Favorites API or module-specific favorite API
↓
favorites table
↓
UI updates favorite state
```

#### Status

🔵 Backend Mostly

---

### Module 22 — Audit Logs & Feature Flags

#### Purpose

Provides user audit log retrieval and runtime feature flag listing.

#### Main Features

- Log audit action utility.
- Get user audit logs.
- Get feature flags.

#### Sub-Modules

- Audit log route.
- Feature flags route.

#### Frontend Files

- Minimal/indirect; no major dedicated frontend module found.

#### Backend Files

- `backend/routes/audit_logs.py`
- `backend/routes/feature_flags.py`
- `backend/database.py`

#### API Endpoints

- `GET /api/audit-logs`
- `GET /api/feature-flags`

#### Database

- `audit_logs`
- `feature_flags`

#### State Management

- Server state.

#### Workflow

```text
Frontend/admin-like feature requests logs or flags
↓
Audit/feature API
↓
audit_logs or feature_flags table
↓
Response returned
```

#### Status

🔵 Backend Mostly

---

### Module 23 — System Health, Config, Migrations & Stats

#### Purpose

Bootstraps the backend, configures environment values, runs DB initialization/migrations, mounts media, and exposes health/stat endpoints.

#### Main Features

- App startup.
- CORS.
- Media static mount.
- DB init.
- Migrations.
- Health endpoint.
- Database health endpoint.
- Stats endpoint.

#### Sub-Modules

- Configuration.
- Migrations.
- Health.
- Stats.
- Media serving.

#### Frontend Files

- `frontend/.env`
- `frontend/package.json`
- `frontend/vite.config.ts`

#### Backend Files

- `backend/main.py`
- `backend/config.py`
- `backend/database.py`
- `backend/migrate.py`
- `backend/migrations/*.py`
- `backend/.env`
- `backend/.env.example`

#### API Endpoints

- `GET /health`
- `GET /api/health/database`
- `GET /api/stats`

#### Database

- All tables.

#### State Management

- Environment variables.
- Database schema state.

#### External Dependencies

- MySQL.
- SQLAlchemy.
- Uvicorn.

#### Workflow

```text
Backend starts
↓
main.py startup event
↓
validate_security_settings
↓
init_db
↓
run_migrations
↓
Routers and media available
```

#### Status

✅ Implemented

---

### Module 24 — Tests, Documentation, Seeds & Catalogs

#### Purpose

Provides test coverage, documentation, seed catalogs, and support scripts.

#### Main Features

- Backend tests.
- Integration scripts.
- Asset seed catalogs.
- Sticker/font catalogs.
- Architecture docs.
- Demo/project docs.

#### Sub-Modules

- Test suite.
- Docs.
- Seed scripts.
- Catalogs.

#### Files

- `backend/test_*.py`
- `backend/scripts/*.py`
- `backend/curated_asset_seed.py`
- `backend/sticker_catalog.py`
- `backend/font_catalog.py`
- `docs/*.md`

#### API Endpoints

- None directly.

#### Database

- Seeds may write to application tables.

#### State Management

- Test fixtures and local DB/media state.

#### Status

🟡 Partially Implemented support module

---

## 5. Frontend Module List

1. Authentication
   - Login
   - Signup
   - Protected route
   - Files: `App.tsx`, `AuthPages.tsx`, `apiClient.ts`
2. Dashboard
   - Project grid
   - Create design
   - Trash
   - Brand hub
   - Files: `Dashboard.tsx`
3. Editor Shell
   - Toolbar
   - Sidebar
   - Right panels
   - Files: `Editor.tsx`, `Toolbar.tsx`, `Sidebar.tsx`
4. Canvas Core
   - Fabric canvas
   - Selection
   - Transform
   - Files: `CanvasWorkspace.tsx`, `useCanvasTools.ts`, `useEditorStore.ts`
5. Pages/Layers/History
   - Pages
   - Layers
   - History
   - Files: `PagesPanel.tsx`, `LayerItem.tsx`, `HistoryPanel.tsx`
6. Text/Typography
   - Text presets
   - Text effects
   - Files: `TextStylesPanel.tsx`, `TextToolsPanel.tsx`, `TextEffectsPanel.tsx`
7. Fonts
   - Font browser
   - Upload/favorite/use
   - Files: `FontBrowserPanel.tsx`, `fontsApi.ts`
8. Elements/Shapes
   - Elements
   - Shapes
   - Graphics
   - Files: `ElementsPanel.tsx`, registry utils
9. Diagrams/Charts/QR
   - Architecture diagrams
   - Chart generator
   - QR generator
   - Files: `ArchitectureDiagramPanel.tsx`, `ChartGeneratorModal.tsx`, `QRCodeModal.tsx`
10. Stickers
    - Sticker browser/edit controls
    - Files: `StickersPanel.tsx`, `StickerEditingControls.tsx`
11. Templates
    - Listing/detail/preview/actions
    - Files: `components/templates/*`, `templatesApi.ts`
12. Brand Kit
    - Colors/fonts/logos
    - Files: `BrandKit.tsx`, dashboard brand sections
13. Assets
    - Royalty-free/curated assets
    - Files: `RoyaltyFreeAssets.tsx`
14. Uploads/Editable Imports
    - Uploads/poster conversion
    - Files: `UploadsPanel.tsx`, `PosterConversionDialog.tsx`, `uploadsApi.ts`
15. Image Processing
    - Crop/filter/background/media fitting
    - Files: `ImageCropper.tsx`, `ImageFilters.tsx`, `BackgroundRemover.tsx`
16. AI Studio
    - Chat/poster/image/thumb
    - Files: `AIAssistant.tsx`, `aiClient.ts`
17. Timeline
    - Scene timeline/FPS/playback
    - Files: `TimelinePanel.tsx`, `masterTimelineManager.ts`
18. Audio/Voiceover
    - Music/SFX/voiceover
    - Files: `MultiTrackAudioPanel.tsx`, `VoiceRecorderModal.tsx`
19. Video Export
    - Frame rendering/export dialog
    - Files: `VideoExportDialog.tsx`, `videoExportService.ts`
20. Styling/Export/Support
    - Color, effects, resize, quality, notifications, calendar, share
    - Files: assorted editor support panels

---

## 6. Backend Module List

1. Authentication API — `backend/routes/auth.py`
2. Projects API — `backend/routes/projects.py`
3. Templates API — `backend/routes/templates.py`
4. Categories API — `backend/routes/categories.py`
5. Brand Kits API — `backend/routes/brand_kits.py`
6. Shared Designs API — `backend/routes/shared.py`
7. Favorites API — `backend/routes/favorites.py`
8. Assets API — `backend/routes/assets.py`
9. AI API — `backend/routes/ai.py`
10. AI Poster API — `backend/routes/ai_poster.py`
11. Stickers API — `backend/routes/stickers.py`
12. Fonts API — `backend/routes/fonts.py`
13. Image Processing API — `backend/routes/images.py`
14. Editable Imports API — `backend/routes/poster_analysis.py`
15. Uploads API — `backend/routes/uploads.py`
16. QR Code API — `backend/routes/qrcode.py`
17. Charts API — `backend/routes/charts.py`
18. Notifications API — `backend/routes/notifications.py`
19. Content Calendar API — `backend/routes/content_calendar.py`
20. Audit Logs API — `backend/routes/audit_logs.py`
21. Feature Flags API — `backend/routes/feature_flags.py`
22. Elements API — `backend/routes/elements.py`
23. Video Render API — `backend/routes/video_render.py`
24. System API — `backend/main.py`

---

## 7. Database Module/Table List

| No. | Model | Table | Purpose |
| --- | --- | --- | --- |
| 1 | User | `users` | User accounts |
| 2 | AuthSession | `auth_sessions` | Token/session tracking |
| 3 | Project | `projects` | Design records and canvas JSON |
| 4 | DesignVersion | `design_versions` | Project snapshots |
| 5 | Template | `templates` | Template records |
| 6 | Category | `categories` | Template/category taxonomy |
| 7 | TemplateSubcategory | `template_subcategories` | Template subcategories |
| 8 | TemplateFavourite | `template_favourites` | Template favorites |
| 9 | TemplateUsage | `template_usage` | Template usage tracking |
| 10 | BrandKit | `brand_kits` | Brand kit root |
| 11 | BrandColor | `brand_colors` | Brand colors |
| 12 | BrandFont | `brand_fonts` | Brand fonts |
| 13 | BrandLogo | `brand_logos` | Brand logos |
| 14 | SharedDesign | `shared_designs` | Share links/tokens |
| 15 | Favorite | `favorites` | Generic favorites |
| 16 | Asset | `assets` | Curated/private assets |
| 17 | GeneratedAsset | `generated_assets` | AI-generated assets |
| 18 | ElementCategory | `element_categories` | Element categories |
| 19 | ElementFavorite | `element_favorites` | Element favorites |
| 20 | ElementRecentItem | `element_recent_items` | Recent element use |
| 21 | ElementCollection | `element_collections` | Element collections |
| 22 | ElementCollectionItem | `element_collection_items` | Collection members |
| 23 | UploadedAsset | `uploaded_assets` | User uploads |
| 24 | PosterAnalysisJob | `poster_analysis_jobs` | Editable poster jobs |
| 25 | FontAsset | `font_assets` | Uploaded fonts |
| 26 | ProcessedImage | `processed_images` | Image processing outputs |
| 27 | ChatSession | `chat_sessions` | AI chat sessions |
| 28 | ChatMessage | `chat_messages` | AI chat messages |
| 29 | DeletedItem | `deleted_items` | Trash/restore metadata |
| 30 | Notification | `notifications` | User notifications |
| 31 | ContentCalendarEvent | `content_calendar_events` | Planner events |
| 32 | AuditLog | `audit_logs` | User audit events |
| 33 | FeatureFlag | `feature_flags` | Runtime feature flags |
| 34 | RecentHistory | `recent_history` | Recent activity |
| 35 | GenerationJob | `generation_jobs` | AI generation jobs |
| 36 | ExportMetadata | `export_metadata` | Export records |
| 37 | VideoRenderJob | `video_render_jobs` | Video render jobs |

---

## 8. Complete API Endpoint List

### Authentication

| Method | Endpoint | Module | Purpose | Auth |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | Authentication | Register user | No |
| POST | `/api/auth/login` | Authentication | Login user | No |
| GET | `/api/auth/me` | Authentication | Current user | Yes |
| POST | `/api/auth/logout` | Authentication | Logout/revoke session | Yes |

### Projects

| Method | Endpoint | Module | Purpose | Auth |
| --- | --- | --- | --- | --- |
| GET | `/api/projects` | Projects | List projects | Yes |
| POST | `/api/projects` | Projects | Create project | Yes |
| GET | `/api/projects/trash` | Projects | List trash | Yes |
| POST | `/api/projects/trash/{deleted_item_id}/restore` | Projects | Restore project | Yes |
| DELETE | `/api/projects/trash/{deleted_item_id}` | Projects | Permanent delete | Yes |
| GET | `/api/projects/{project_id}` | Projects | Load project | Yes |
| PUT | `/api/projects/{project_id}` | Projects | Update/save project | Yes |
| DELETE | `/api/projects/{project_id}` | Projects | Move to trash | Yes |

### AI

| Method | Endpoint | Module | Purpose | Auth |
| --- | --- | --- | --- | --- |
| GET | `/api/ai/provider-status` | AI | Provider status | No |
| GET | `/api/ai/providers/status` | AI | Provider status | Yes |
| POST | `/api/ai/generate-poster-spec` | AI | Poster spec generation | Yes |
| POST | `/api/ai/generate-poster-template` | AI | Poster template generation | No |
| POST | `/api/ai/generate-reference-poster` | AI | Reference poster generation | No |
| POST | `/api/ai/posters/generate` | AI | Poster image generation | Yes |
| POST | `/api/ai/generate-poster-image` | AI | Poster image alias | Yes |
| POST | `/api/ai/generate-poster` | AI | Poster generation alias | Yes |
| POST | `/api/ai/generate-image-prompt` | AI | Prompt generation | No |
| POST | `/api/ai/chat` | AI | Chat response | Yes |
| GET | `/api/ai/chat/{conversation_id}` | AI | Chat history | Yes |
| POST | `/api/ai/images/generate` | AI | Image generation | Yes |
| POST | `/api/ai/generate-image` | AI | Image generation alias | Yes |
| POST | `/api/ai/thumbnails/generate` | AI | Thumbnail generation | Yes |
| POST | `/api/ai/generate-thumbnail` | AI | Thumbnail alias | Yes |
| GET | `/api/ai/cache/status` | AI | Cache status | Yes |
| DELETE | `/api/ai/cache` | AI | Clear cache | Yes |
| GET | `/api/ai/health` | AI | AI health | Yes |
| POST | `/api/ai-poster/generate` | AI Poster | Generate AI poster | Route-level |
| POST | `/api/ai-poster/analyze` | AI Poster | Analyze poster | Route-level |

### Assets

| Method | Endpoint | Module | Purpose | Auth |
| --- | --- | --- | --- | --- |
| GET | `/api/assets/categories` | Assets | Asset categories | No |
| GET | `/api/assets/search` | Assets | Search assets | No |
| GET | `/api/assets/{asset_id}` | Assets | Asset detail | No |
| GET | `/api/assets/{asset_id}/data-url` | Assets | Data URL | No |
| GET | `/api/assets` | Assets | List assets | No |
| POST | `/api/assets` | Assets | Create asset | Yes |
| PUT | `/api/assets/{asset_id}` | Assets | Update asset | Yes |
| DELETE | `/api/assets/{asset_id}` | Assets | Delete asset | Yes |

### Brand Kits

| Method | Endpoint | Module | Purpose | Auth |
| --- | --- | --- | --- | --- |
| GET | `/api/brand-kits` | Brand Kit | List kits | Yes |
| POST | `/api/brand-kits` | Brand Kit | Create kit | Yes |
| GET | `/api/brand-kits/{kit_id}` | Brand Kit | Kit detail | Yes |
| PATCH | `/api/brand-kits/{kit_id}` | Brand Kit | Update kit | Yes |
| POST | `/api/brand-kits/{kit_id}/duplicate` | Brand Kit | Duplicate kit | Yes |
| DELETE | `/api/brand-kits/{kit_id}` | Brand Kit | Delete kit | Yes |
| POST | `/api/brand-kits/{kit_id}/colors` | Brand Kit | Add color | Yes |
| PUT | `/api/brand-kits/{kit_id}/colors/{color_id}` | Brand Kit | Update color | Yes |
| DELETE | `/api/brand-kits/{kit_id}/colors/{color_id}` | Brand Kit | Delete color | Yes |
| POST | `/api/brand-kits/{kit_id}/fonts` | Brand Kit | Add font | Yes |
| PUT | `/api/brand-kits/{kit_id}/fonts/{font_id}` | Brand Kit | Update font | Yes |
| DELETE | `/api/brand-kits/{kit_id}/fonts/{font_id}` | Brand Kit | Delete font | Yes |
| POST | `/api/brand-kits/{kit_id}/logos` | Brand Kit | Add logo | Yes |
| PUT | `/api/brand-kits/{kit_id}/logos/{logo_id}` | Brand Kit | Update logo | Yes |
| DELETE | `/api/brand-kits/{kit_id}/logos/{logo_id}` | Brand Kit | Delete logo | Yes |

### Templates

| Method | Endpoint | Module | Purpose | Auth |
| --- | --- | --- | --- | --- |
| GET | `/api/templates/categories` | Templates | Categories | No |
| GET | `/api/templates` | Templates | List templates | Optional |
| GET | `/api/templates/{template_id}` | Templates | Template detail | Optional |
| GET | `/api/templates/{template_id}/related` | Templates | Related templates | No |
| POST | `/api/templates/{template_id}/favourite` | Templates | Favorite | Yes |
| POST | `/api/templates/{template_id}/favorite` | Templates | Favorite alias | Yes |
| DELETE | `/api/templates/{template_id}/favourite` | Templates | Unfavorite | Yes |
| DELETE | `/api/templates/{template_id}/favorite` | Templates | Unfavorite alias | Yes |
| POST | `/api/templates/{template_id}/use` | Templates | Create project from template | Yes |
| POST | `/api/templates/{template_id}/apply` | Templates | Apply template | Yes |
| POST | `/api/templates/{template_id}/remix` | Templates | Remix template | Yes |
| POST | `/api/templates/{template_id}/quick-replace` | Templates | Quick replace | Yes |
| POST | `/api/templates` | Templates | Create template | Yes |
| PUT | `/api/templates/{template_id}` | Templates | Update template | Yes |
| DELETE | `/api/templates/{template_id}` | Templates | Delete template | Yes |

### Elements, Charts, QR

| Method | Endpoint | Module | Purpose | Auth |
| --- | --- | --- | --- | --- |
| GET | `/api/elements/categories` | Elements | Categories | No |
| GET | `/api/elements` | Elements | List elements | No |
| GET | `/api/elements/search` | Elements | Search elements | No |
| GET | `/api/elements/recent` | Elements | Recent elements | Yes |
| POST | `/api/elements/recent` | Elements | Add recent | Yes |
| GET | `/api/elements/favorites` | Elements | Favorites | Yes |
| POST | `/api/elements/favorites/{element_id}` | Elements | Toggle favorite | Yes |
| GET | `/api/elements/recommendations` | Elements | Recommendations | No |
| POST | `/api/elements/generate` | Elements | AI element generation | Yes |
| GET | `/api/elements/collections` | Elements | Collections | Yes |
| POST | `/api/elements/collections` | Elements | Create collection | Yes |
| DELETE | `/api/elements/collections/{collection_id}` | Elements | Delete collection | Yes |
| POST | `/api/charts/generate` | Charts | Generate chart | Route-level |
| POST | `/api/qrcode/generate` | QR | Generate QR | Route-level |

### Uploads, Editable Imports, Images

| Method | Endpoint | Module | Purpose | Auth |
| --- | --- | --- | --- | --- |
| POST | `/api/uploads/images` | Uploads | Upload image | Yes |
| GET | `/api/uploads/images` | Uploads | List uploads | Yes |
| GET | `/api/uploads/images/{asset_id}` | Uploads | Upload detail | Yes |
| PATCH | `/api/uploads/images/{asset_id}` | Uploads | Rename upload | Yes |
| DELETE | `/api/uploads/images/{asset_id}` | Uploads | Delete upload | Yes |
| POST | `/api/image-edit/analyze` | Editable Import | Analyze poster | Yes |
| GET | `/api/image-edit/jobs/{job_id}` | Editable Import | Job status | Yes |
| DELETE | `/api/image-edit/jobs/{job_id}` | Editable Import | Cancel job | Yes |
| POST | `/api/image-edit/make-editable` | Editable Import | Make editable | Yes |
| POST | `/api/image-edit/regions/convert` | Editable Import | Convert region | Yes |
| POST | `/api/image-edit/retry-cleanup` | Editable Import | Retry cleanup | Yes |
| POST | `/api/images/remove-background` | Image Processing | Remove background | Yes |
| POST | `/api/images/person-mask` | Image Processing | Person mask | Yes |
| POST | `/api/images/apply-effect` | Image Processing | Apply effect | Yes |

### Fonts and Stickers

| Method | Endpoint | Module | Purpose | Auth |
| --- | --- | --- | --- | --- |
| GET | `/api/fonts` | Fonts | List fonts | Optional |
| POST | `/api/fonts/upload` | Fonts | Upload font | Yes |
| DELETE | `/api/fonts/{font_id}` | Fonts | Delete font | Yes |
| POST | `/api/fonts/{font_id}/favorite` | Fonts | Favorite font | Yes |
| DELETE | `/api/fonts/{font_id}/favorite` | Fonts | Unfavorite font | Yes |
| POST | `/api/fonts/{font_id}/use` | Fonts | Record use | Yes |
| GET | `/api/stickers/categories` | Stickers | Categories | No |
| GET | `/api/stickers` | Stickers | List stickers | Optional |
| POST | `/api/stickers/{sticker_id}/favorite` | Stickers | Favorite | Yes |
| POST | `/api/stickers/{sticker_id}/favourite` | Stickers | Favorite alias | Yes |
| DELETE | `/api/stickers/{sticker_id}/favorite` | Stickers | Unfavorite | Yes |
| DELETE | `/api/stickers/{sticker_id}/favourite` | Stickers | Unfavorite alias | Yes |
| POST | `/api/stickers/{sticker_id}/use` | Stickers | Record use | Yes |

### Video

| Method | Endpoint | Module | Purpose | Auth |
| --- | --- | --- | --- | --- |
| POST | `/api/video/render/frames` | Video | Create frame render job | Yes |
| POST | `/api/video/render/{job_id}/frames` | Video | Upload frames | Yes |
| POST | `/api/video/render/{job_id}/finalize` | Video | Encode final video | Yes |
| POST | `/api/video/render` | Video | Legacy render | Yes |
| GET | `/api/video/render/{job_id}` | Video | Render status | Yes |
| DELETE | `/api/video/render/{job_id}` | Video | Cancel render | Yes |
| GET | `/api/video/download/{job_id}` | Video | Download video | Yes |

### Sharing and Support

| Method | Endpoint | Module | Purpose | Auth |
| --- | --- | --- | --- | --- |
| GET | `/api/shared` | Sharing | List shares | Yes |
| POST | `/api/shared` | Sharing | Create share | Yes |
| GET | `/api/shared/by-token/{token}` | Sharing | Public shared view | No |
| DELETE | `/api/shared/{share_id}` | Sharing | Delete share | Yes |
| GET | `/api/favorites` | Favorites | List favorites | Yes |
| POST | `/api/favorites` | Favorites | Create favorite | Yes |
| DELETE | `/api/favorites/{fav_id}` | Favorites | Delete favorite | Yes |
| GET | `/api/notifications` | Notifications | List notifications | Yes |
| POST | `/api/notifications` | Notifications | Create notification | Yes |
| POST | `/api/notifications/{notification_id}/read` | Notifications | Mark read | Yes |
| POST | `/api/notifications/read-all` | Notifications | Mark all read | Yes |
| DELETE | `/api/notifications/{notification_id}` | Notifications | Delete notification | Yes |
| GET | `/api/content-calendar` | Calendar | List events | Yes |
| POST | `/api/content-calendar` | Calendar | Create event | Yes |
| DELETE | `/api/content-calendar/{event_id}` | Calendar | Delete event | Yes |
| GET | `/api/audit-logs` | Audit | List audit logs | Yes |
| GET | `/api/feature-flags` | Flags | List flags | No |

### System

| Method | Endpoint | Module | Purpose | Auth |
| --- | --- | --- | --- | --- |
| GET | `/health` | System | Service health | No |
| GET | `/api/health/database` | System | DB health | No |
| GET | `/api/stats` | System | Aggregate DB stats | No |
| GET | `/api/categories` | Categories | List categories | No |
| GET | `/api/categories/{category_id}` | Categories | Category detail | No |

---

## 9. Module Dependency Map

```text
Authentication
↓
Dashboard & Project Management
↓
Editor Shell & Canvas Core
├── Pages / Layers / History
├── Text / Typography / Fonts
├── Elements / Shapes / Diagrams / Charts / QR
├── Stickers
├── Templates
├── Brand Kit
├── Asset Library
├── Uploads / Editable Imports
├── Image Processing
├── AI Studio
├── Styling / Quality / Resize / Patterns
├── Notifications
└── Content Calendar
↓
Timeline & Playback
├── Audio / Background Music / SFX / Voiceover
├── Animation Evaluation
└── Video Export
↓
Sharing / Static Export / Video Download
↓
Database + Media Storage + External Providers
```

---

## 10. Complete End-to-End Application Workflow

```text
Application Start
↓
Vite loads React app
↓
App.tsx evaluates route and token state
↓
Unauthenticated user goes to /login
↓
AuthPages submits login/signup
↓
FastAPI auth route creates/verifies user/session
↓
Frontend stores token/user in localStorage
↓
Dashboard loads projects from /api/projects
↓
User creates or opens project
↓
Editor route /editor/:id loads Editor.tsx
↓
CanvasWorkspace initializes Fabric canvas
↓
useEditorStore.loadProject fetches project data
↓
Project canvas JSON, pages, and timeline metadata restore
↓
User adds content:
  - Text / fonts / effects
  - Elements / shapes / diagrams
  - Stickers
  - Templates
  - Brand kit
  - Assets
  - Uploads / editable imports
  - AI-generated content
↓
Fabric object state and Zustand state update
↓
saveHistory serializes:
  - Fabric canvas objects
  - pages
  - activePageId
  - timelineProject
↓
PUT /api/projects/{project_id}
↓
Backend updates projects and design_versions
↓
User configures timeline/audio/animations
↓
Timeline state persists in project JSON
↓
User exports:
  - Static export mostly frontend-side
  - Share link through /api/shared
  - Video export through /api/video/render/*
↓
Backend stores render/share/export metadata and media files
↓
Frontend displays output, download link, or share link
```

---

## 11. Module Status Report

| Status | Modules |
| --- | --- |
| ✅ Fully Implemented | Authentication, Project CRUD, Brand Kit CRUD, System Health/Config |
| 🟡 Partially Implemented | Editor, Pages/Layers/History, Text/Fonts, Elements, Stickers, Templates, Assets, Uploads, Image Processing, Timeline, Audio, Video Render, Export/Share, Notifications, Content Calendar |
| ⚪ UI Only / Mostly Frontend | Design styling, quality audit, resize, patterns, alignment |
| 🔵 Backend Mostly | Generic Favorites, Audit Logs, Feature Flags |
| ⚠️ Cannot Verify Fully | AI providers, FFmpeg video runtime, external OCR/background/image providers |
| ❌ Placeholder / Incomplete Surface | Some sidebar categories marked `SOON`, such as videos/music/sound effects/voiceover in browse categories, while separate audio timeline tools exist |

---

## 12. Module Summary Table

| No. | Module | Sub-Modules / Features | Frontend | Backend | Database | APIs | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Authentication | login, signup, me, logout, sessions | Yes | Yes | Yes | 4 | ✅ |
| 2 | Project Management | dashboard, create, save, load, trash | Yes | Yes | Yes | 8 | ✅ |
| 3 | Editor Canvas Core | Fabric canvas, toolbar, zoom, selection | Yes | Indirect | Yes | Project APIs | 🟡 |
| 4 | Pages/Layers/History | pages, layers, undo, redo | Yes | Indirect | Yes | Project APIs | 🟡 |
| 5 | Text/Typography/Fonts | presets, effects, fonts, upload | Yes | Yes | Yes | 6 | 🟡 |
| 6 | Elements/Shapes/Charts/QR | elements, diagrams, charts, QR | Yes | Yes | Yes | 14 | 🟡 |
| 7 | Stickers | catalog, favorites, editing | Yes | Yes | Yes | 7 | 🟡 |
| 8 | Templates | browse, detail, apply, remix, CRUD | Yes | Yes | Yes | 15 | 🟡 |
| 9 | Brand Kit | kits, colors, fonts, logos | Yes | Yes | Yes | 15 | ✅ |
| 10 | Asset Library | categories, search, data URL, CRUD | Yes | Yes | Yes | 8 | 🟡 |
| 11 | Uploads & Editable Imports | upload, analyze, make editable | Yes | Yes | Yes | 11 | 🟡 |
| 12 | Image Processing | remove bg, mask, effects, crop | Yes | Yes | Yes | 3 | 🟡 |
| 13 | AI Studio | chat, poster, image, thumbnail | Yes | Yes | Yes | 20 | ⚠️ |
| 14 | Timeline | scenes, FPS, seek, playback | Yes | Indirect | Yes | Project/Video | 🟡 |
| 15 | Audio & Voiceover | music, SFX, voiceover, ducking | Yes | Video indirect | Yes | Video APIs | 🟡 |
| 16 | Video Render & Export | frames, encode, status, download | Yes | Yes | Yes | 7 | 🟡 |
| 17 | Static Export & Sharing | image/PDF export, share links | Yes | Yes | Yes | 4+video | 🟡 |
| 18 | Styling/Quality/Resize | colors, effects, patterns, audit | Yes | Indirect | Yes | Project APIs | ⚪ |
| 19 | Notifications | list, create, read, delete | Yes | Yes | Yes | 5 | 🟡 |
| 20 | Content Calendar | list, create, delete events | Yes | Yes | Yes | 3 | 🟡 |
| 21 | Generic Favorites | favorite CRUD | Indirect | Yes | Yes | 3 | 🔵 |
| 22 | Audit Logs & Flags | logs, feature flags | Partial | Yes | Yes | 2 | 🔵 |
| 23 | System | health, stats, startup, migrations | No | Yes | Yes | 3 | ✅ |
| 24 | Tests/Docs/Seeds | tests, docs, catalogs, seed data | No | Support | No | 0 | 🟡 |

---

## 13. File-to-Module Mapping

### Shared Files

- `frontend/src/App.tsx` → routing, auth route protection, shared view.
- `frontend/src/Editor.tsx` → editor shell, right panel composition.
- `frontend/src/store/useEditorStore.ts` → project, canvas, page, timeline, history, persistence state.
- `frontend/src/services/apiClient.ts` → API URL, auth headers, request helper.
- `backend/main.py` → FastAPI app, router registration, health APIs, media mount.
- `backend/database.py` → all SQLAlchemy models and DB initialization.
- `backend/auth.py` → JWT/session dependency.
- `backend/config.py` → environment configuration.

### Module Mapping

- Authentication
  - Frontend: `AuthPages.tsx`, `App.tsx`, `apiClient.ts`
  - Backend: `routes/auth.py`, `auth.py`
  - Models: `User`, `AuthSession`
  - Tables: `users`, `auth_sessions`
  - APIs: `/api/auth/*`

- Project Management
  - Frontend: `Dashboard.tsx`, `useEditorStore.ts`
  - Backend: `routes/projects.py`
  - Models: `Project`, `DesignVersion`, `DeletedItem`
  - Tables: `projects`, `design_versions`, `deleted_items`
  - APIs: `/api/projects/*`

- Editor Canvas Core
  - Frontend: `Editor.tsx`, `CanvasWorkspace.tsx`, `Toolbar.tsx`, `Sidebar.tsx`, `PropertiesPanel.tsx`, `ElementToolbar.tsx`, `ContextMenu.tsx`, `ZoomController.tsx`
  - Backend: project APIs indirectly
  - Models: `Project`, `DesignVersion`

- Pages/Layers/History
  - Frontend: `PagesPanel.tsx`, `LayerItem.tsx`, `HistoryPanel.tsx`, `layerUtils.ts`, `useEditorStore.ts`
  - Backend: project APIs indirectly
  - Tables: `projects`, `design_versions`

- Text/Typography/Fonts
  - Frontend: `TextStylesPanel.tsx`, `TextToolsPanel.tsx`, `TextEffectsPanel.tsx`, `FontBrowserPanel.tsx`, `fontsApi.ts`
  - Backend: `routes/fonts.py`, `font_catalog.py`
  - Models: `FontAsset`, `Favorite`
  - APIs: `/api/fonts/*`

- Elements/Shapes/Diagrams/Charts/QR
  - Frontend: `ElementsPanel.tsx`, `ArchitectureDiagramPanel.tsx`, `ChartGeneratorModal.tsx`, `QRCodeModal.tsx`, registry utils
  - Backend: `routes/elements.py`, `routes/charts.py`, `routes/qrcode.py`
  - Models: element category/favorite/recent/collection models
  - APIs: `/api/elements/*`, `/api/charts/generate`, `/api/qrcode/generate`

- Stickers
  - Frontend: `StickersPanel.tsx`, `StickerEditingControls.tsx`, `stickersApi.ts`
  - Backend: `routes/stickers.py`, `sticker_catalog.py`
  - Models: `Favorite`
  - APIs: `/api/stickers/*`

- Templates
  - Frontend: `components/templates/*`, `templatesApi.ts`, `SaveAsTemplate.tsx`
  - Backend: `routes/templates.py`, `schemas/templates.py`
  - Models: `Template`, `Category`, `TemplateSubcategory`, `TemplateFavourite`, `TemplateUsage`
  - APIs: `/api/templates/*`

- Brand Kit
  - Frontend: `BrandKit.tsx`, dashboard brand sections
  - Backend: `routes/brand_kits.py`
  - Models: `BrandKit`, `BrandColor`, `BrandFont`, `BrandLogo`
  - APIs: `/api/brand-kits/*`

- Asset Library
  - Frontend: `RoyaltyFreeAssets.tsx`, `assetUrlResolver.ts`
  - Backend: `routes/assets.py`, `asset_providers.py`, `curated_asset_seed.py`
  - Models: `Asset`, `GeneratedAsset`
  - APIs: `/api/assets/*`

- Uploads & Editable Imports
  - Frontend: `UploadsPanel.tsx`, `UploadedAssetCard.tsx`, `PosterConversionDialog.tsx`, `EditableImportControls.tsx`, `uploadsApi.ts`
  - Backend: `routes/uploads.py`, `routes/poster_analysis.py`, `services/upload_service.py`, `services/poster_analysis_service.py`
  - Models: `UploadedAsset`, `PosterAnalysisJob`
  - APIs: `/api/uploads/images/*`, `/api/image-edit/*`

- Image Processing
  - Frontend: `ImageCropper.tsx`, `ImageFilters.tsx`, `BackgroundRemover.tsx`, `MediaFittingControls.tsx`, `imageProcessingApi.ts`
  - Backend: `routes/images.py`, `services/background_removal_service.py`
  - Models: `ProcessedImage`
  - APIs: `/api/images/*`

- AI Studio
  - Frontend: `AIAssistant.tsx`, `GeneratedAssetActions.tsx`, `aiClient.ts`
  - Backend: `routes/ai.py`, `routes/ai_poster.py`
  - Models: `ChatSession`, `ChatMessage`, `GeneratedAsset`, `GenerationJob`
  - APIs: `/api/ai/*`, `/api/ai-poster/*`

- Timeline / Audio / Video
  - Frontend: `TimelinePanel.tsx`, `MultiTrackAudioPanel.tsx`, `VoiceRecorderModal.tsx`, `VideoExportDialog.tsx`, `videoExportService.ts`, timeline/video utils
  - Backend: `routes/video_render.py`, `services/video_render_service.py`, `schemas/video_render.py`
  - Models: `VideoRenderJob`, `ExportMetadata`
  - APIs: `/api/video/*`

- Export / Sharing
  - Frontend: `EnhancedExportPanel.tsx`, `ExportSettings.tsx`, `ShareModal.tsx`
  - Backend: `routes/shared.py`
  - Models: `SharedDesign`, `ExportMetadata`
  - APIs: `/api/shared/*`

- Support Modules
  - Notifications: `NotificationCenter.tsx`, `routes/notifications.py`, `Notification`
  - Content Calendar: `ContentPlannerModal.tsx`, `routes/content_calendar.py`, `ContentCalendarEvent`
  - Favorites: `routes/favorites.py`, `Favorite`
  - Audit/Flags: `routes/audit_logs.py`, `routes/feature_flags.py`, `AuditLog`, `FeatureFlag`
  - System: `main.py`, `config.py`, `migrate.py`, `migrations/*`

---

## 14. Final Counts

- **Major Modules:** 24
- **Sub-Modules:** 175
- **Frontend Modules:** 20
- **Backend Modules:** 24
- **Database Models/Tables:** 37
- **API Endpoints:** 140

