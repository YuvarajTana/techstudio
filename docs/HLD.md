# High-Level Design (HLD)
## TECKSTUDIO - Professional Poster Generator

**Document Version:** 1.0  
**Date:** July 2026  
**Author:** Architecture Team

---

## 1. Architecture Overview

### 1.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   React App  │  │  Fabric.js   │  │   Zustand    │  │   Vite     │ │
│  │   (UI Layer) │  │  (Canvas)    │  │   (State)    │  │  (Bundler) │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Editor Components                            │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │  │
│  │  │Sidebar  │ │Canvas   │ │Properties│ │AI Panel │ │Assets   │  │  │
│  │  │         │ │Workspace│ │Panel    │ │         │ │Panel    │  │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SERVER (Node.js)                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │   Express    │  │  Auth        │  │  Routes      │                │
│  │   Server     │  │  Middleware  │  │  (API)       │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐                                   │
│  │   SQLite     │  │  JWT         │                                   │
│  │   Database   │  │  Auth        │                                   │
│  └──────────────┘  └──────────────┘                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ External APIs
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ Pollinations │  │ Google       │  │ Pexels       │                │
│  │ API          │  │ Gemini API   │  │ API (Future) │                │
│  │ (Free)       │  │ (User Key)   │  │              │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Architecture

### 2.1 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| UI Framework | React 18 | Component-based UI |
| Language | TypeScript | Type safety |
| Build Tool | Vite | Fast development/build |
| Styling | TailwindCSS | Utility-first CSS |
| Canvas | Fabric.js 5.x | Vector graphics editor |
| State | Zustand | Lightweight state management |
| Routing | React Router v6 | Client-side routing |

### 2.2 Component Architecture

```
src/
├── components/
│   ├── auth/              # Authentication components
│   │   └── AuthPages.tsx
│   ├── dashboard/         # Dashboard views
│   │   └── Dashboard.tsx
│   └── editor/            # Editor components
│       ├── AIAssistant.tsx      # AI tools panel
│       ├── AlignmentTools.tsx   # Object alignment
│       ├── AnimationPanel.tsx   # Animation controls
│       ├── BrandKit.tsx         # Brand management
│       ├── CanvasWorkspace.tsx  # Main canvas
│       ├── DevModeInspector.tsx # Dev mode tools
│       ├── ExportSettings.tsx   # Export configuration
│       ├── GradientPicker.tsx   # Gradient editor
│       ├── GridOverlay.tsx      # Grid/guides
│       ├── HistoryPanel.tsx     # Version history
│       ├── ImageCropper.tsx     # Image cropping
│       ├── ImageFilters.tsx     # Image effects
│       ├── KeyboardShortcutsModal.tsx
│       ├── PagesPanel.tsx       # Multi-page support
│       ├── PropertiesPanel.tsx  # Object properties
│       ├── RoyaltyFreeAssets.tsx # Asset library
│       ├── Rulers.tsx           # Canvas rulers
│       ├── ShareModal.tsx       # Sharing dialog
│       ├── Sidebar.tsx          # Left panel
│       ├── TextOnPath.tsx       # Text on path
│       ├── Toolbar.tsx          # Top toolbar
│       └── ZoomController.tsx   # Zoom controls
├── hooks/                 # Custom React hooks
│   ├── useCanvasTools.ts
│   ├── useDistanceMeasurement.ts
│   ├── useKeyboardShortcuts.ts
│   ├── useLassoSelection.ts
│   ├── usePenTool.ts
│   ├── useSmartGuides.ts
│   └── useSnapToGrid.ts
├── store/                 # State management
│   └── useEditorStore.ts
├── data/                  # Static data
│   └── templates.ts
├── App.tsx                # Root component
├── Editor.tsx             # Editor page
└── main.tsx               # Entry point
```

### 2.3 State Management

```typescript
// Zustand Store Structure
interface EditorState {
  // Canvas
  canvas: fabric.Canvas | null;
  selectedObject: fabric.Object | null;
  zoom: number;
  
  // Styling
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  
  // Typography
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  underline: boolean;
  textAlign: string;
  
  // History
  history: string[];
  historyIndex: number;
  
  // Project
  projectId: string | null;
  projectName: string;
  
  // UI State
  editorMode: 'design' | 'dev';
  isPenMode: boolean;
  rulersEnabled: boolean;
  showGuides: boolean;
  
  // Actions
  setCanvas: (canvas) => void;
  setSelectedObject: (obj) => void;
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  // ... more actions
}
```

---

## 3. Backend Architecture

### 3.1 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | Node.js | Server runtime |
| Framework | Express.js | HTTP server |
| Database | SQLite | Data persistence |
| Auth | JWT | Authentication |
| ORM | better-sqlite3 | Database access |

### 3.2 API Design

```
POST   /api/auth/register    # Create account
POST   /api/auth/login       # Authenticate user
GET    /api/projects          # List user projects
POST   /api/projects          # Create new project
GET    /api/projects/:id      # Get project details
PUT    /api/projects/:id      # Update project
DELETE /api/projects/:id      # Delete project
```

### 3.3 Database Schema

```sql
-- Users Table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  data JSON,  -- Fabric.js canvas JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 4. AI Integration

### 4.1 AI Services Architecture

```
┌─────────────────────────────────────────────────┐
│                AI Service Layer                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    │
│  │  Image Generator │    │  Layout Engine   │    │
│  │  (Pollinations)  │    │  (Gemini)        │    │
│  └─────────────────┘    └─────────────────┘    │
│                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    │
│  │  Copy Writer     │    │  Color Palette   │    │
│  │  (Template)      │    │  (Algorithm)     │    │
│  └─────────────────┘    └─────────────────┘    │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 4.2 AI Feature Implementation

| Feature | API | Authentication | Rate Limit |
|---------|-----|----------------|------------|
| Image Generation | Pollinations | None | 100/day |
| Layout Generation | Gemini | User Key | User quota |
| Copy Writing | Local | None | Unlimited |
| Color Palette | Local | None | Unlimited |

---

## 5. Data Flow

### 5.1 Canvas Save Flow

```
User Action → Canvas Update → saveHistory() → 
  → Serialize Canvas JSON → Update Zustand State →
  → API Call → Backend → Database
```

### 5.2 Export Flow

```
User Click Export → Select Format → Configure Settings →
  → Canvas Render → Generate DataURL/Blob →
  → Trigger Download / Generate PDF
```

### 5.3 AI Generation Flow

```
User Input → API Request → External Service →
  → Parse Response → Generate Canvas Elements →
  → Add to Canvas → Render
```

---

## 6. Security Architecture

### 6.1 Authentication Flow

```
Login Request → Validate Credentials → Generate JWT →
  → Return Token → Store in localStorage →
  → Attach to API Requests → Validate on Backend
```

### 6.2 Security Measures

| Layer | Measure |
|-------|---------|
| Client | Input sanitization, XSS prevention |
| Transport | HTTPS, CORS headers |
| Server | JWT validation, rate limiting |
| Database | Parameterized queries |

---

## 7. Performance Architecture

### 7.1 Optimization Strategies

| Strategy | Implementation |
|----------|----------------|
| Code Splitting | Lazy load editor components |
| Virtualization | Virtual lists for layers |
| Memoization | React.memo, useMemo |
| Canvas Optimization | Object pooling, dirty rendering |
| Asset Loading | Lazy load images, CDN |

### 7.2 Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| First Paint | < 1s | Code splitting |
| Interactive | < 2s | Lazy loading |
| Export | < 5s | Web Workers |
| AI Response | < 10s | Streaming |

---

## 8. Deployment Architecture

### 8.1 Development

```
Local Machine
├── Frontend: Vite Dev Server (port 5173)
├── Backend: Node.js (port 5001)
└── Database: SQLite (local file)
```

### 8.2 Production (Future)

```
Cloud Deployment
├── Frontend: Vercel/Netlify
├── Backend: Railway/Render
├── Database: PostgreSQL (Supabase)
└── CDN: Cloudflare
```

---

## 9. Monitoring & Logging

### 9.1 Client-Side
- Error boundary for React components
- Console logging for development
- Performance metrics (future)

### 9.2 Server-Side
- Request logging
- Error tracking
- Database queries

---

## 10. Future Considerations

### 10.1 Scalability
- Horizontal scaling for backend
- Redis caching layer
- CDN for assets

### 10.2 Features
- Real-time collaboration (WebSocket)
- Plugin system
- Advanced animations
- Mobile apps

---

*Document Version: 1.0*  
*Last Updated: July 2026*
