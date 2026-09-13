# Low-Level Design (LLD)
## TECKSTUDIO - Professional Poster Generator

**Document Version:** 1.0  
**Date:** July 2026  
**Author:** Development Team

---

## 1. Module Design

### 1.1 Editor Module

#### 1.1.1 CanvasWorkspace Component

```typescript
// Props Interface
interface CanvasWorkspaceProps {
  // No external props - uses store
}

// State
interface CanvasState {
  canvas: fabric.Canvas | null;
  isDragging: boolean;
  lastPosX: number;
  lastPosY: number;
}

// Key Methods
- initializeCanvas(): void
- setupEventListeners(): void
- handleWheel(event: WheelEvent): void
- handleMouseDown(event: MouseEvent): void
- handleMouseMove(event: MouseEvent): void
- handleMouseUp(event: MouseEvent): void
- handleDrop(event: DragEvent): void
- renderCanvas(): void
```

#### 1.1.2 useEditorStore (Zustand Store)

```typescript
// State Schema
interface EditorState {
  // Canvas State
  canvas: fabric.Canvas | null;
  selectedObject: fabric.Object | null;
  zoom: number;
  
  // Style Properties
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  
  // Text Properties
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  underline: boolean;
  textAlign: 'left' | 'center' | 'right';
  
  // History
  history: string[];
  historyIndex: number;
  
  // Project
  projectId: string | null;
  projectName: string;
  projectCreatedAt: string;
  projectUpdatedAt: string;
  
  // UI State
  editorMode: 'design' | 'dev';
  isPenMode: boolean;
  rulersEnabled: boolean;
  showGuides: boolean;
}

// Actions
interface EditorActions {
  // Canvas
  setCanvas: (canvas: fabric.Canvas | null) => void;
  setSelectedObject: (obj: fabric.Object | null) => void;
  setZoom: (zoom: number) => void;
  
  // Styling
  setFillColor: (color: string) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setOpacity: (opacity: number) => void;
  
  // Typography
  setFontFamily: (family: string) => void;
  setFontSize: (size: number) => void;
  setFontWeight: (weight: string) => void;
  setFontStyle: (style: string) => void;
  setUnderline: (underline: boolean) => void;
  setTextAlign: (align: string) => void;
  
  // History
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  
  // Operations
  deleteSelected: () => void;
  duplicateSelected: () => void;
  clearCanvas: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  
  // Project
  setProjectId: (id: string) => void;
  setProjectName: (name: string) => void;
  loadProject: (id: string) => void;
  
  // UI
  setEditorMode: (mode: 'design' | 'dev') => void;
  setPenMode: (active: boolean) => void;
  setRulersEnabled: (enabled: boolean) => void;
  setShowGuides: (show: boolean) => void;
}
```

### 1.2 AI Module

#### 1.2.1 AIAssistant Component

```typescript
// State Interface
interface AIState {
  // Image Generator
  imgPrompt: string;
  imgLoading: boolean;
  imgError: string;
  imgPreview: string;
  
  // Poster Generator
  posterTheme: string;
  posterLoading: boolean;
  posterStyle: string;
  
  // Layout Generator
  layoutPrompt: string;
  layoutLoading: boolean;
  
  // Copy Writer
  copyTopic: string;
  copyStyle: string;
  copyResult: CopyTemplates | null;
  
  // Color Palette
  paletteMood: string;
  generatedPalette: string[];
  
  // API Key
  apiKey: string;
  showApiKeyInput: boolean;
}

// Key Methods
- handleGenerateImage(): Promise<void>
- handleGeneratePoster(): Promise<void>
- handleGenerateLayout(): Promise<void>
- handleGenerateCopy(): void
- handleGeneratePalette(): void
- handleGetSuggestions(): Promise<void>
- callGeminiAPI(prompt: string): Promise<GeminiResponse>
```

#### 1.2.2 API Integration

```typescript
// Pollinations API
const generateImage = async (prompt: string): Promise<string> => {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
  return url;
};

// Gemini API
const callGeminiAPI = async (prompt: string, apiKey: string): Promise<GeminiResponse> => {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  });
  return response.json();
};
```

### 1.3 Template Module

#### 1.3.1 Template Data Structure

```typescript
interface Template {
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

interface TemplateElement {
  type: 'rect' | 'circle' | 'text' | 'image' | 'line' | 'polygon';
  props: Record<string, any>;
}

interface ThemeConfig {
  bg: string;
  primary: string;
  secondary: string;
  heading: string;
  subtitle: string;
  fontFamily: string;
  gradient?: string;
  elements?: string[];
}
```

---

## 2. Data Models

### 2.1 User Model

```typescript
interface User {
  id: string;          // UUID
  name: string;        // Display name
  email: string;       // Unique email
  password_hash: string; // Bcrypt hash
  created_at: Date;    // Account creation
}
```

### 2.2 Project Model

```typescript
interface Project {
  id: string;          // UUID
  user_id: string;     // Owner reference
  name: string;        // Project name
  data: string;        // Fabric.js JSON
  created_at: Date;    // Creation time
  updated_at: Date;    // Last modification
}
```

### 2.3 BrandKit Model (Local Storage)

```typescript
interface BrandKit {
  name: string;
  colors: BrandColor[];
  fonts: BrandFont[];
  logos: BrandLogo[];
}

interface BrandColor {
  id: string;
  name: string;
  hex: string;
}

interface BrandFont {
  id: string;
  name: string;
  family: string;
  weight: string;
}

interface BrandLogo {
  id: string;
  name: string;
  src: string;  // Base64 data URL
}
```

---

## 3. API Specifications

### 3.1 Authentication API

#### POST /api/auth/register
```typescript
// Request
{
  name: string;
  email: string;
  password: string;
}

// Response (201)
{
  user: {
    id: string;
    name: string;
    email: string;
  },
  token: string;  // JWT
}

// Error (400)
{
  error: string;  // "Email already exists"
}
```

#### POST /api/auth/login
```typescript
// Request
{
  email: string;
  password: string;
}

// Response (200)
{
  user: {
    id: string;
    name: string;
    email: string;
  },
  token: string;  // JWT
}

// Error (401)
{
  error: string;  // "Invalid credentials"
}
```

### 3.2 Projects API

#### GET /api/projects
```typescript
// Headers
Authorization: Bearer <token>

// Response (200)
{
  projects: [
    {
      id: string;
      name: string;
      createdAt: string;
      updatedAt: string;
    }
  ]
}
```

#### POST /api/projects
```typescript
// Headers
Authorization: Bearer <token>

// Request
{
  id: string;
  name: string;
}

// Response (201)
{
  project: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  }
}
```

#### PUT /api/projects/:id
```typescript
// Headers
Authorization: Bearer <token>

// Request
{
  name?: string;
  data?: string;  // Fabric.js JSON
}

// Response (200)
{
  project: {
    id: string;
    name: string;
    updatedAt: string;
  }
}
```

---

## 4. Component Interfaces

### 4.1 Sidebar Component

```typescript
type Tab = 'templates' | 'elements' | 'shapes' | 'text' | 'draw' | 'uploads' | 'layers' | 'pages' | 'history';

interface SidebarState {
  activeTab: Tab;
  layers: fabric.Object[];
  uploadedImages: UploadedImage[];
  editingLayerId: string | null;
  renameValue: string;
  layerSearchQuery: string;
  brushColor: string;
  brushWidth: number;
}

interface UploadedImage {
  id: string;
  src: string;
  name: string;
}
```

### 4.2 PropertiesPanel Component

```typescript
interface PropertiesPanelProps {
  // Uses store directly
}

// Conditional Rendering
- No selection: Page Settings (background, gradient, grid)
- Text selected: Typography controls
- Shape selected: Fill, stroke, opacity
- Image selected: Filters, crop
- Group selected: Ungroup button
- Selection: Group button
```

### 4.3 ExportSettings Component

```typescript
type ExportFormat = 'png' | 'jpg' | 'svg' | 'pdf';
type ExportDPI = 72 | 150 | 300 | 600;

interface ExportConfig {
  format: ExportFormat;
  dpi: ExportDPI;
  quality: number;
  width: number;
  height: number;
  backgroundColor: string;
  transparent: boolean;
}

interface ExportPreset {
  label: string;
  dpi: ExportDPI;
  width: number;
  height: number;
}
```

---

## 5. Hook Interfaces

### 5.1 useKeyboardShortcuts

```typescript
// No parameters - uses store directly
export const useKeyboardShortcuts: () => void;

// Keyboard shortcuts handled:
// Delete/Backspace - Delete selected
// Arrow keys - Nudge selection
// Ctrl+A - Select all
// Ctrl+Z - Undo
// Ctrl+Y / Ctrl+Shift+Z - Redo
// Ctrl+C - Copy
// Ctrl+V - Paste
// Ctrl+D - Duplicate
// Ctrl+G - Group
// Ctrl+Shift+G - Ungroup
```

### 5.2 useCanvasTools

```typescript
interface CanvasTools {
  addRectangle: () => void;
  addCircle: () => void;
  addTriangle: () => void;
  addLine: () => void;
  addArrow: () => void;
  addStar: () => void;
  addPolygon: () => void;
  addHeart: () => void;
  addSpeechBubble: () => void;
  addText: (type: 'heading' | 'subheading' | 'body') => void;
}

export const useCanvasTools: () => CanvasTools;
```

---

## 6. Event Flow Diagrams

### 6.1 Object Selection Flow

```
User Click on Canvas
       │
       ▼
Canvas Event: mouse:down
       │
       ▼
Find Target Object
       │
       ├── No Object Found ──► Clear Selection
       │                            │
       │                            ▼
       │                    Update Store: selectedObject = null
       │
       └── Object Found
              │
              ▼
       Set Active Object
              │
              ▼
       Update Store: selectedObject = object
              │
              ▼
       Sync Properties to Store
              │
              ▼
       Render Properties Panel
```

### 6.2 Save History Flow

```
Canvas Modified
       │
       ▼
Trigger: object:modified / object:added / object:removed
       │
       ▼
Call saveHistory()
       │
       ▼
Serialize Canvas to JSON
       │
       ▼
Check for Duplicate State
       │
       ├── Duplicate ──► Skip
       │
       └── New State
              │
              ▼
       Add to History Array
              │
              ▼
       Update historyIndex
              │
              ▼
       Auto-save to Backend (if projectId exists)
```

---

## 7. Error Handling

### 7.1 Client-Side Errors

```typescript
// Error Boundary
class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Canvas Error:', error, errorInfo);
  }
}

// API Error Handling
const handleAPIError = (error: any) => {
  if (error.response) {
    // Server error
    console.error('API Error:', error.response.data);
  } else if (error.request) {
    // Network error
    console.error('Network Error');
  } else {
    // Other error
    console.error('Error:', error.message);
  }
};
```

### 7.2 Canvas Errors

```typescript
// Fabric.js Error Handling
canvas.on('error', (error: any) => {
  console.error('Canvas Error:', error);
  // Recover gracefully
});

// Image Load Error
fabric.Image.fromURL(url, (img) => {
  if (!img) {
    // Handle load failure
    console.error('Failed to load image');
    return;
  }
  // Success
});
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
// Store Tests
describe('useEditorStore', () => {
  test('should set canvas', () => {});
  test('should update fill color', () => {});
  test('should save and undo history', () => {});
});

// Component Tests
describe('Sidebar', () => {
  test('should render all tabs', () => {});
  test('should switch tabs on click', () => {});
  test('should add shape to canvas', () => {});
});
```

### 8.2 Integration Tests

```typescript
describe('Export Flow', () => {
  test('should export PNG with correct settings', () => {});
  test('should export PDF with jsPDF', () => {});
});

describe('AI Features', () => {
  test('should generate image from prompt', () => {});
  test('should create poster from theme', () => {});
});
```

---

## 9. Code Conventions

### 9.1 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `CanvasWorkspace` |
| Functions | camelCase | `handleExport` |
| Variables | camelCase | `selectedObject` |
| Constants | UPPER_SNAKE | `PRESET_COLORS` |
| Types/Interfaces | PascalCase | `ExportConfig` |
| Files | PascalCase | `AIAssistant.tsx` |

### 9.2 File Structure

```
ComponentName/
├── ComponentName.tsx      # Main component
├── ComponentName.test.tsx # Tests
└── index.ts              # Export
```

### 9.3 Import Order

```typescript
// 1. React imports
import React, { useState } from 'react';

// 2. Third-party libraries
import { fabric } from 'fabric';
import { useEditorStore } from '../../store/useEditorStore';

// 3. Icons
import { Download, Upload } from 'lucide-react';

// 4. Local components
import { SomeComponent } from './SomeComponent';

// 5. Types
import type { ExportConfig } from './types';
```

---

*Document Version: 1.0*  
*Last Updated: July 2026*
