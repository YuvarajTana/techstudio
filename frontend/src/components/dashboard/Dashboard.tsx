import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  FolderOpen,
  LayoutTemplate,
  Users,
  Trash2,
  Search,
  Plus,
  Star,
  MonitorPlay,
  Film,
  FileText,
  Image,
  Palette,
  ArrowLeft,
  Upload,
  Type,
  Sparkles,
  ImagePlus,
  Bot,
  X,
  Menu,
} from 'lucide-react';
import { apiFetch, getAuthToken } from '../../services/apiClient';
import { aiClient } from '../../services/aiClient';
import {
  VALID_TECH_POSTER_TEMPLATES,
  type TechPosterTemplate,
} from '../../data/techPosterTemplates';
import { createPosterSpecProjectData } from '../../utils/posterSpecRenderer';
import { TemplatesPage } from '../templates/TemplatesPage';
import type { TemplateProject } from '../templates/templateTypes';
import { DESIGN_PRESETS } from '../../utils/designPresets';

const createClientProjectId = () => window.crypto?.randomUUID?.() ?? `project_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;

type DashboardPage = 'home' | 'projects' | 'templates' | 'brand-hub' | 'shared' | 'trash';
type AiEntryPoint = 'chat' | 'poster' | 'image' | 'thumbnail';
type HomeAiTool = 'assistant' | 'image' | 'poster' | 'thumbnail';

const DASHBOARD_PAGES: DashboardPage[] = ['home', 'projects', 'templates', 'brand-hub', 'shared', 'trash'];

const parseDashboardPage = (value: string | null): DashboardPage => {
  if (value === 'brand') return 'brand-hub';
  return DASHBOARD_PAGES.includes(value as DashboardPage) ? value as DashboardPage : 'home';
};
interface ProjectMeta {
  design_type?: string;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  data?: string;
  width?: number | null;
  height?: number | null;
  thumbnail?: string | null;
}

interface DeletedProjectMeta {
  id: string;
  item_id: string;
  name: string;
  deletedAt: string;
  data?: string | null;
  width?: number | null;
  height?: number | null;
}

type BrandHubTab = 'overview' | 'colors' | 'fonts' | 'logos';

interface DashboardBrandColor {
  id: string;
  name: string;
  hex_value: string;
  role?: string;
  description?: string | null;
  is_primary?: boolean;
  sort_order?: number;
}

interface DashboardBrandFont {
  id: string;
  name: string;
  family: string;
  weight: string;
  role?: string;
  style?: string | null;
  fallback?: string | null;
  sort_order?: number;
}

interface DashboardBrandLogo {
  id: string;
  name: string;
  file_data: string;
  file_type: string;
  role?: string;
  width?: number | null;
  height?: number | null;
  file_size?: number | null;
  sort_order?: number;
}

interface DashboardBrandKit {
  id: string;
  name: string;
  company_name?: string | null;
  description?: string | null;
  industry?: string | null;
  website?: string | null;
  colors: DashboardBrandColor[];
  fonts: DashboardBrandFont[];
  logos: DashboardBrandLogo[];
  created_at: string;
  updated_at: string;
}

interface BrandKitFormState {
  name: string;
  company_name: string;
  description: string;
  industry: string;
  website: string;
}

interface CreateDesignPreset {
  name: string;
  width: number;
  height: number;
  description: string;
  accent: string;
  presetId?: string;
}

const CREATE_DESIGN_PRESETS: CreateDesignPreset[] = [
  { name: DESIGN_PRESETS.find(p => p.id === 'poster')!.name, width: DESIGN_PRESETS.find(p => p.id === 'poster')!.width, height: DESIGN_PRESETS.find(p => p.id === 'poster')!.height, description: 'Portrait marketing poster', accent: 'from-amber-500 to-orange-500', presetId: 'poster' },
  { name: DESIGN_PRESETS.find(p => p.id === 'instagram-post')!.name, width: DESIGN_PRESETS.find(p => p.id === 'instagram-post')!.width, height: DESIGN_PRESETS.find(p => p.id === 'instagram-post')!.height, description: 'Square social post', accent: 'from-pink-500 to-purple-500', presetId: 'instagram-post' },
  { name: DESIGN_PRESETS.find(p => p.id === 'youtube-thumbnail')!.name, width: DESIGN_PRESETS.find(p => p.id === 'youtube-thumbnail')!.width, height: DESIGN_PRESETS.find(p => p.id === 'youtube-thumbnail')!.height, description: '16:9 video thumbnail', accent: 'from-red-500 to-orange-500', presetId: 'youtube-thumbnail' },
  { name: DESIGN_PRESETS.find(p => p.id === 'presentation-16-9')!.name, width: DESIGN_PRESETS.find(p => p.id === 'presentation-16-9')!.width, height: DESIGN_PRESETS.find(p => p.id === 'presentation-16-9')!.height, description: 'Widescreen slide', accent: 'from-blue-500 to-indigo-500', presetId: 'presentation-16-9' },
  { name: DESIGN_PRESETS.find(p => p.id === 'instagram-story')!.name, width: DESIGN_PRESETS.find(p => p.id === 'instagram-story')!.width, height: DESIGN_PRESETS.find(p => p.id === 'instagram-story')!.height, description: 'Vertical story layout', accent: 'from-fuchsia-500 to-pink-500', presetId: 'instagram-story' },
  { name: DESIGN_PRESETS.find(p => p.id === 'business-card')!.name, width: DESIGN_PRESETS.find(p => p.id === 'business-card')!.width, height: DESIGN_PRESETS.find(p => p.id === 'business-card')!.height, description: 'Print-ready card', accent: 'from-zinc-400 to-zinc-600', presetId: 'business-card' },
];

const HOME_QUICK_CREATE_PRESETS: CreateDesignPreset[] = [
  { name: 'Blank Poster', width: DESIGN_PRESETS.find(p => p.id === 'poster')!.width, height: DESIGN_PRESETS.find(p => p.id === 'poster')!.height, description: '4:5 portrait', accent: 'from-violet-500 to-fuchsia-500', presetId: 'poster' },
  { name: 'Square Post', width: DESIGN_PRESETS.find(p => p.id === 'instagram-post')!.width, height: DESIGN_PRESETS.find(p => p.id === 'instagram-post')!.height, description: '1:1 social', accent: 'from-pink-500 to-purple-500', presetId: 'instagram-post' },
  { name: 'Portrait Poster', width: 1080, height: 1350, description: '4:5 social poster', accent: 'from-amber-500 to-orange-500' },
  { name: 'Landscape Poster', width: 1600, height: 900, description: '16:9 wide', accent: 'from-blue-500 to-cyan-500' },
  { name: 'Instagram Post', width: DESIGN_PRESETS.find(p => p.id === 'instagram-post')!.width, height: DESIGN_PRESETS.find(p => p.id === 'instagram-post')!.height, description: '1080 × 1080', accent: 'from-fuchsia-500 to-pink-500', presetId: 'instagram-post' },
  { name: 'LinkedIn Post', width: DESIGN_PRESETS.find(p => p.id === 'linkedin-post')!.width, height: DESIGN_PRESETS.find(p => p.id === 'linkedin-post')!.height, description: '1200 × 627', accent: 'from-sky-500 to-blue-600', presetId: 'linkedin-post' },
  { name: 'YouTube Thumbnail', width: DESIGN_PRESETS.find(p => p.id === 'youtube-thumbnail')!.width, height: DESIGN_PRESETS.find(p => p.id === 'youtube-thumbnail')!.height, description: '1280 × 720', accent: 'from-red-500 to-orange-500', presetId: 'youtube-thumbnail' },
  { name: 'Presentation', width: DESIGN_PRESETS.find(p => p.id === 'presentation-16-9')!.width, height: DESIGN_PRESETS.find(p => p.id === 'presentation-16-9')!.height, description: '1920 × 1080', accent: 'from-indigo-500 to-violet-500', presetId: 'presentation-16-9' },
];

const HOME_ASSET_CATEGORIES = [
  { name: 'Photos', description: 'Curated stock images', icon: Image },
  { name: 'Graphics', description: 'Illustrations and SVGs', icon: Sparkles },
  { name: 'Shapes', description: 'Badges, frames, and forms', icon: LayoutTemplate },
  { name: 'Backgrounds', description: 'Textures and gradients', icon: Palette },
  { name: 'Icons', description: 'Simple UI symbols', icon: Star },
  { name: 'Grids', description: 'Layout helpers', icon: FileText },
];



const formatRelativeDate = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.max(1, Math.round(diffMinutes / 60));
  if (diffHours < 24) {
    return `${diffHours} hours ago`;
  }

  const diffDays = Math.max(1, Math.round(diffHours / 24));
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  return date.toLocaleDateString();
};

// ─── Component ──────────────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState<DashboardPage>(() => parseDashboardPage(new URLSearchParams(window.location.search).get('view')));
  const [searchQuery, setSearchQuery] = useState('');
  const [homePrompt, setHomePrompt] = useState('');
  const [homeAiTool, setHomeAiTool] = useState<HomeAiTool>('assistant');
  const [homeUploads, setHomeUploads] = useState<File[]>([]);
  const [showIdeas, setShowIdeas] = useState(false);
  const [enhancingPrompt, setEnhancingPrompt] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const homeUploadRef = useRef<HTMLInputElement | null>(null);
  const homePromptRef = useRef<HTMLTextAreaElement | null>(null);
  const [savedDesigns, setSavedDesigns] = useState<ProjectMeta[]>([]);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [trashedDesigns, setTrashedDesigns] = useState<DeletedProjectMeta[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashError, setTrashError] = useState('');
  const [showCreateDesignModal, setShowCreateDesignModal] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [customDesignSize, setCustomDesignSize] = useState({ width: 800, height: 800 });
  const [creatingLessonVideo, setCreatingLessonVideo] = useState(false);

  // Get user profile info
  const storedUser = localStorage.getItem('teckstudio_user');
  const user = storedUser ? JSON.parse(storedUser) : { name: 'User' };

  // Show notification helper
  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (activePage === 'home') {
      params.delete('view');
    } else {
      params.set('view', activePage);
    }
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, '', nextUrl);
    }
  }, [activePage]);

  useEffect(() => {
    const handlePopState = () => {
      setActivePage(parseDashboardPage(new URLSearchParams(window.location.search).get('view')));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const homeAiTools: Array<{ id: HomeAiTool; label: string; icon: React.ElementType; entryPoint: AiEntryPoint }> = [
    { id: 'assistant', label: 'AI Chat', icon: Bot, entryPoint: 'chat' },
    { id: 'image', label: 'AI Image', icon: ImagePlus, entryPoint: 'image' },
    { id: 'poster', label: 'AI Poster', icon: FileText, entryPoint: 'poster' },
    { id: 'thumbnail', label: 'AI Thumbnail', icon: MonitorPlay, entryPoint: 'thumbnail' },
  ];

  const promptIdeas = [
    'Movie Poster',
    'Business Flyer',
    'Instagram Post',
    'Music Album',
    'Gaming Poster',
    'AI Conference',
    'Education',
    'Festival',
    'Sports',
    'Corporate',
    'Travel',
    'Restaurant',
    'Wedding Invitation',
  ];

  const selectedHomeTool = homeAiTools.find((tool) => tool.id === homeAiTool) || homeAiTools[0];

  const activateHomeAiTool = (toolId: HomeAiTool) => {
    setHomeAiTool(toolId);
    window.setTimeout(() => homePromptRef.current?.focus(), 0);
  };

  const focusHomeAiComposer = () => {
    window.setTimeout(() => homePromptRef.current?.focus(), 0);
  };

  const handleHomeUploads = (files: FileList | null) => {
    if (!files) return;
    const allowedExtensions = ['pdf', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'webp'];
    const accepted = Array.from(files).filter((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const valid = allowedExtensions.includes(extension);
      if (!valid) showNotification(`${file.name} is not supported`, 'error');
      return valid;
    });
    setHomeUploads((current) => [...current, ...accepted].slice(0, 8));
  };

  const enhanceHomePrompt = async () => {
    if (!homePrompt.trim() || enhancingPrompt) return;
    setEnhancingPrompt(true);
    try {
      const data = await aiClient.enhancePrompt({
        prompt: homePrompt,
        style: homeAiTool === 'image' ? 'photorealistic' : 'digital-art',
        aspect_ratio: homeAiTool === 'image' ? '1:1' : '4:5',
      });
      if (!data.enhanced_prompt) throw new Error('Unable to enhance prompt');
      setEnhancedPrompt(data.enhanced_prompt);
      if (data.fallbackUsed || data.success === false) {
        showNotification('AI provider unavailable. Showing a local prompt draft instead.', 'error');
      }
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Prompt enhancement failed', 'error');
    } finally {
      setEnhancingPrompt(false);
    }
  };

  const stashHomeUploadsForEditor = async () => {
    if (homeUploads.length === 0) return;
    const serialized = await Promise.all(homeUploads.map((file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: reader.result,
      });
      reader.readAsDataURL(file);
    })));
    sessionStorage.setItem('teckstudio_pending_ai_uploads', JSON.stringify(serialized));
  };

  const generateFromHomeComposer = async () => {
    await stashHomeUploadsForEditor();
    handleCreateDesign(`${selectedHomeTool.label} Workspace`, undefined, undefined, selectedHomeTool.entryPoint, enhancedPrompt || homePrompt);
  };

  // Fetch user projects list from the backend only; UI state is not persistence proof.
  const fetchProjects = async () => {
    const token = getAuthToken();
    if (!token) {
      setSavedDesigns([]);
      showNotification('Please log in again to load saved designs.', 'error');
      setTimeout(() => navigate('/login'), 1200);
      return;
    }

    try {
      const response = await apiFetch('/api/projects');
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('teckstudio_auth_token');
          localStorage.removeItem('teckstudio_user');
          setTimeout(() => navigate('/login'), 1200);
        }
        throw new Error(data?.detail || data?.error || `Failed to load projects (${response.status})`);
      }
      setSavedDesigns(data?.projects || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load projects.';
      setSavedDesigns([]);
      showNotification(message, 'error');
    }
  };

  React.useEffect(() => {
    fetchProjects();
  }, []);

  const fetchTrash = async () => {
    const token = getAuthToken();
    if (!token) {
      setTrashedDesigns([]);
      setTrashError('Please log in again to load trash.');
      return;
    }

    setTrashLoading(true);
    setTrashError('');
    try {
      const response = await apiFetch('/api/projects/trash');
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || `Failed to load trash (${response.status})`);
      }
      setTrashedDesigns(data?.items || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load trash.';
      setTrashedDesigns([]);
      setTrashError(message);
      showNotification(message, 'error');
    } finally {
      setTrashLoading(false);
    }
  };

  React.useEffect(() => {
    if (activePage === 'trash') fetchTrash();
  }, [activePage]);

  const getEditorPath = (id: string, aiEntryPoint?: AiEntryPoint, prompt?: string) => {
    const params = new URLSearchParams();
    if (aiEntryPoint) params.set('ai', aiEntryPoint);
    if (prompt?.trim()) params.set('prompt', prompt.trim());
    const query = params.toString();
    return `/editor/${id}${query ? `?${query}` : ''}`;
  };

  const handleCreateDesign = async (name?: string, _width?: number, _height?: number, aiEntryPoint?: AiEntryPoint, prompt?: string, templateData?: string | null) => {
    const token = getAuthToken();
    const designName = name?.trim() || 'New Design';
    if (!token) {
      showNotification('Please log in again to create persistent designs.', 'error');
      setTimeout(() => navigate('/login'), 1200);
      return;
    }

    try {
      const newId = createClientProjectId();
      const response = await apiFetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: newId,
          name: designName,
          width: _width,
          height: _height,
          data: templateData || undefined,
          background_color: '#000000',
        })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || `Failed to create design (${response.status})`);
      }
      const createdProject = data?.project || data;
      setSavedDesigns((current) => [createdProject, ...current.filter((project) => project.id !== createdProject.id)]);
      showNotification('Design created and saved.');
      navigate(getEditorPath(createdProject.id, aiEntryPoint, prompt));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create design.';
      showNotification(message, 'error');
    }
  };

  const openTemplatePreview = (template: TechPosterTemplate) => {
    void template;
    setActivePage('templates');
  };

  const handleUseTechTemplate = async (template: TechPosterTemplate) => {
    try {
      const clonedSpec = JSON.parse(JSON.stringify(template.posterSpec));
      const projectData = createPosterSpecProjectData(clonedSpec, template.themeId);
      await handleCreateDesign(`${template.name} Copy`, projectData.width, projectData.height, undefined, undefined, projectData.data);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to create project from template.', 'error');
    }
  };

  const handleTemplateProjectCreated = (project: TemplateProject) => {
    const savedProject: ProjectMeta = {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      data: project.data || undefined,
      width: project.width ?? null,
      height: project.height ?? null,
      thumbnail: project.thumbnail ?? null,
    };
    setSavedDesigns((current) => [savedProject, ...current.filter((item) => item.id !== savedProject.id)]);
    showNotification('Template opened as a new editable design.');
    navigate(getEditorPath(savedProject.id));
  };

  const createLessonVideo = async () => {
    if (creatingLessonVideo) return;
    setCreatingLessonVideo(true);
    try {
      const response = await apiFetch('/api/lesson-videos', {method: 'POST', body: '{}'});
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Unable to create lesson video.');
      navigate(`/lesson-video/${result.project_id}`);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Unable to create lesson.', 'error');
    } finally {
      setCreatingLessonVideo(false);
    }
  };

  const projectTypeLabel = (project: Pick<ProjectMeta, 'id' | 'design_type'>) => {
    if (project.design_type === 'creative-video') return 'Creative Video';
    if (project.design_type === 'creative-poster') return 'Creative Poster';
    if (project.design_type === 'lesson-video') return 'Lesson Video';
    return project.id.startsWith('local_') ? 'Local Design' : 'Cloud Design';
  };

  const openCreateDesignFlow = () => {
    setShowCreateDesignModal(true);
  };

  const createPresetDesign = async (preset: CreateDesignPreset) => {
    setShowCreateDesignModal(false);
    await handleCreateDesign(preset.name, preset.width, preset.height);
  };

  const createCustomDesign = async () => {
    const width = Math.max(100, Math.round(customDesignSize.width || 800));
    const height = Math.max(100, Math.round(customDesignSize.height || 800));
    setShowCreateDesignModal(false);
    await handleCreateDesign('Custom Size', width, height);
  };

  const openAssetsWorkspace = async (categoryName = 'Assets') => {
    sessionStorage.setItem('teckstudio_pending_editor_panel', JSON.stringify({ panel: 'assets', categoryName }));
    await handleCreateDesign(`${categoryName} Asset Workspace`, 1080, 1080);
  };

  const handleOpenDesign = (id: string) => {
    const project = savedDesigns.find(item => item.id === id);
    navigate(project?.design_type === 'creative-video' ? `/video/${id}` : project?.design_type === 'lesson-video' ? `/lesson-video/${id}` : `/editor/${id}`);
  };

  const handleDeleteDesign = async (id: string) => {
    if (id.startsWith('local_')) {
      showNotification('This local-only design is not database-backed and cannot be verified as persisted.', 'error');
      return;
    }
    try {
      const response = await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || `Failed to delete design (${response.status})`);
      }
      setSavedDesigns(prev => prev.filter(d => d.id !== id));
      await fetchTrash();
      showNotification('Design moved to trash.');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to delete design.', 'error');
    }
  };

  const handleRestoreDesign = async (deletedItemId: string) => {
    try {
      const response = await apiFetch(`/api/projects/trash/${deletedItemId}/restore`, { method: 'POST' });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || `Failed to restore design (${response.status})`);
      }
      const restoredProject = data?.project || data;
      setSavedDesigns((current) => [restoredProject, ...current.filter((project) => project.id !== restoredProject.id)]);
      setTrashedDesigns((current) => current.filter((item) => item.id !== deletedItemId));
      showNotification('Design restored.');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to restore design.', 'error');
    }
  };

  const handlePermanentDelete = async (deletedItemId: string) => {
    try {
      const response = await apiFetch(`/api/projects/trash/${deletedItemId}`, { method: 'DELETE' });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || `Failed to permanently delete design (${response.status})`);
      }
      setTrashedDesigns((current) => current.filter((item) => item.id !== deletedItemId));
      showNotification('Design permanently deleted.');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to permanently delete design.', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Local logout must still succeed if the session is already expired.
    } finally {
      localStorage.removeItem('teckstudio_auth_token');
      localStorage.removeItem('teckstudio_user');
      navigate('/login');
    }
  };

  // ─── Sidebar Nav Items ──────────────────────────────────────────────────────
  const navItems: { id: DashboardPage; icon: React.ElementType; label: string }[] = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'projects', icon: FolderOpen, label: 'Projects' },
    { id: 'templates', icon: LayoutTemplate, label: 'Templates' },
    { id: 'brand-hub', icon: Star, label: 'Brand Hub' },
  ];

  const secondaryNavItems: { id: DashboardPage; icon: React.ElementType; label: string }[] = [
    { id: 'shared', icon: Users, label: 'Shared with you' },
    { id: 'trash', icon: Trash2, label: 'Trash' },
  ];

  // ─── Shared Home/Dashboard UI ───────────────────────────────────────────────
  const SectionHeader = ({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) => (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight text-[#F8FAFC]">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-[#A8A8B8]">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );

  const EmptyState = ({ icon: Icon, title, description, action }: { icon: React.ElementType; title: string; description: string; action?: React.ReactNode }) => (
    <div className="rounded-2xl border border-dashed border-white/[0.10] p-6 text-center" style={{ background: 'rgba(8, 8, 13, 0.50)' }}>
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.10] bg-[#12121B] text-[#71717F]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-semibold text-[#F8FAFC]">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-[#71717F]">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );

  const DesignCard = ({ design }: { design: { id: string; name: string; type: string; editedAt: string; gradient: string; thumbnail?: string | null; width?: number | null; height?: number | null } }) => (
    <article className="group flex h-full flex-col rounded-2xl border border-white/[0.10] p-3 transition-all hover:-translate-y-0.5 hover:border-[rgba(139,92,246,0.50)] hover:shadow-lg focus-within:border-[rgba(139,92,246,0.50)]" style={{ background: '#12121B', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
      <button type="button" className="min-w-0 text-left cursor-pointer" onClick={() => handleOpenDesign(design.id)}>
        <div className="relative mb-3 aspect-video overflow-hidden rounded-xl border border-white/[0.10] bg-[#0E0E16]">
          {design.thumbnail ? (
            <img src={design.thumbnail} alt={`${design.name} thumbnail`} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <div className={`absolute inset-0 bg-gradient-to-br ${design.gradient}`} />
              <div className="absolute inset-0 flex items-center justify-center">
                <FileText className="h-8 w-8 text-zinc-500/50" />
              </div>
            </>
          )}
          <span className="absolute left-2 top-2 rounded-full border border-black/10 bg-black/45 px-2 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-sm">{design.type}</span>
        </div>
        <h3 className="truncate text-sm font-semibold text-[#F8FAFC]">{design.name}</h3>
        <p className="mt-1 text-xs text-[#71717F]">{design.width && design.height ? `${design.width} × ${design.height} · ` : ''}Edited {design.editedAt}</p>
      </button>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => handleOpenDesign(design.id)} className="h-9 flex-1 rounded-lg border border-white/[0.10] bg-[#0E0E16] text-xs font-semibold text-[#A8A8B8] transition-all hover:border-[rgba(139,92,246,0.50)] hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-400/40 cursor-pointer">Open</button>
        <button
          type="button"
          onClick={() => {
            if (confirm('Move this design to trash?')) handleDeleteDesign(design.id);
          }}
          className="h-9 rounded-lg border border-white/[0.10] bg-[#0E0E16] px-3 text-[#71717F] transition-all hover:border-rose-500/40 hover:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400/30 cursor-pointer"
          aria-label={`Move ${design.name} to trash`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );

  // ─── Page: Home ─────────────────────────────────────────────────────────────
  const renderHome = () => {
    const aiCards: Array<{ id: HomeAiTool; title: string; description: string; action: string; icon: React.ElementType; examples: string[] }> = [
      { id: 'poster', title: 'AI Poster Generator', description: 'Generate prompt-based posters and open them directly in the editor.', action: 'Generate Poster', icon: FileText, examples: ['Event launch', 'Brand campaign'] },
      { id: 'image', title: 'AI Image Generator', description: 'Create standalone visuals for campaigns, products, and hero artwork.', action: 'Generate Image', icon: ImagePlus, examples: ['Product visual', 'Hero artwork'] },
      { id: 'thumbnail', title: 'AI Thumbnail Generator', description: 'Create YouTube and social thumbnails with the right dimensions.', action: 'Generate Thumbnail', icon: MonitorPlay, examples: ['YouTube cover', 'Social hook'] },
      { id: 'assistant', title: 'AI Chat', description: 'Get practical copy, layout, palette, and prompt guidance.', action: 'Start Chat', icon: Bot, examples: ['Improve copy', 'Pick colours'] },
    ];
    const featuredTemplates = VALID_TECH_POSTER_TEMPLATES.filter((template) => template.isFeatured).slice(0, 6);
    const visibleProjects = savedDesigns.slice(0, 4);
    const primaryBrandKit = lastUpdatedBrandKit;
    const primaryBrandColor = primaryBrandKit?.colors?.find((color) => color.role === 'primary' || color.is_primary) || primaryBrandKit?.colors?.[0];
    const primaryBrandFont = primaryBrandKit?.fonts?.find((font) => font.role === 'heading') || primaryBrandKit?.fonts?.[0];
    const primaryBrandLogo = primaryBrandKit?.logos?.find((logo) => logo.role === 'primary') || primaryBrandKit?.logos?.[0];

    return (
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 lg:gap-10">
        <section className="relative overflow-hidden rounded-3xl border border-[rgba(139,92,246,0.20)] p-5 shadow-xl shadow-black/10 sm:p-6 lg:p-8" style={{ background: 'linear-gradient(135deg, rgba(18,18,27,0.98), rgba(12,12,20,0.98))' }}>
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)' }} />
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="min-w-0">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#C4B5FD]">TechPoster Studio</p>
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl lg:text-5xl">Welcome back, {user.name || 'Sandhya'}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#A8A8B8] sm:text-base">Create posters in the canvas editor, or start a Lesson Video — a silent 1080p MP4 rendered from scenes, not from a canvas export.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <button type="button" onClick={createLessonVideo} disabled={creatingLessonVideo} className="flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-400/50 disabled:cursor-not-allowed disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #A855F7 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)' }}>{creatingLessonVideo ? 'Creating lesson…' : 'Create Lesson Video'}</button>
              <button type="button" onClick={() => handleCreateDesign('New Poster', 800, 1132)} className="flex h-11 items-center justify-center rounded-xl border border-[rgba(196,181,253,0.18)] bg-[#171720] px-4 text-sm font-semibold text-[#F8FAFC] transition-all hover:border-[rgba(168,85,247,0.60)] hover:bg-[#1C1C2A] focus:outline-none focus:ring-2 focus:ring-violet-400/40 cursor-pointer">Create New Poster</button>
              <button type="button" onClick={() => { activateHomeAiTool('poster'); focusHomeAiComposer(); }} className="flex h-11 items-center justify-center rounded-xl border border-white/[0.10] bg-[#0E0E16] px-4 text-sm font-semibold text-[#A8A8B8] transition-all hover:border-white/[0.18] hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-400/40 cursor-pointer">Generate with AI</button>
              <button type="button" onClick={() => setActivePage('templates')} className="flex h-11 items-center justify-center rounded-xl border border-white/[0.10] bg-[#0E0E16] px-4 text-sm font-semibold text-[#A8A8B8] transition-all hover:border-white/[0.18] hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-400/40 cursor-pointer">Browse Templates</button>
            </div>
          </div>
        </section>

        <section>
          <SectionHeader title="Lesson Video" description="The programmatic Remotion pipeline: edit scenes, preview, then render a silent landscape 1080p MP4. This is not canvas poster export." />
          <article className="overflow-hidden rounded-2xl border border-[rgba(139,92,246,0.40)] p-5 sm:p-6" style={{ background: 'linear-gradient(135deg, rgba(22,22,38,0.98), rgba(18,18,27,0.98))' }}>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'rgba(139, 92, 246, 0.14)', border: '1px solid rgba(168, 85, 247, 0.30)' }}>
                  <Film className="h-6 w-6 text-[#C4B5FD]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-[#F8FAFC]">Start a Lesson Video</h3>
                  <p className="mt-1 text-sm leading-6 text-[#A8A8B8]">Opens the Lesson Video workspace with the API-request starter. Edit scenes, scrub the preview, save, and render locally. Canvas export stays in the poster editor.</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#C4B5FD]">Silent · 1920×1080 · MP4</p>
                </div>
              </div>
              <button type="button" onClick={createLessonVideo} disabled={creatingLessonVideo} className="flex h-11 shrink-0 items-center justify-center rounded-xl px-6 text-sm font-semibold text-white transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-400/50 disabled:cursor-not-allowed disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #A855F7 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)' }}>{creatingLessonVideo ? 'Creating lesson…' : 'Create Lesson Video'}</button>
            </div>
          </article>
        </section>

        <section>
          <SectionHeader title="Create with AI" description="Turn your ideas into editable posters, images, and design content." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {aiCards.map((tool) => {
              const Icon = tool.icon;
              const active = homeAiTool === tool.id;
              return (
                <article key={tool.id} className={`flex h-full min-h-[244px] flex-col rounded-2xl border p-5 transition-all ${active ? 'border-[rgba(139,92,246,0.65)] shadow-lg' : 'border-white/[0.10] hover:border-[rgba(139,92,246,0.50)]'}`} style={{ background: active ? '#161621' : '#12121B', boxShadow: active ? '0 8px 32px rgba(139, 92, 246, 0.12)' : undefined, transform: 'translateY(0)' }}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'rgba(139, 92, 246, 0.14)', border: '1px solid rgba(168, 85, 247, 0.30)' }}>
                      <Icon className="h-5 w-5 text-[#C4B5FD]" />
                    </div>
                    {active && <span className="rounded-full border border-[rgba(139,92,246,0.30)] bg-[rgba(139,92,246,0.10)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#C4B5FD]">Active</span>}
                  </div>
                  <h3 className="text-base font-semibold leading-6 text-[#F8FAFC]">{tool.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#A8A8B8]">{tool.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tool.examples.map((example) => <span key={example} className="rounded-full border border-white/[0.10] bg-[#0E0E16] px-2.5 py-1 text-[11px] text-[#71717F] transition-all hover:bg-[rgba(139,92,246,0.08)] hover:text-[#C4B5FD] hover:border-[rgba(139,92,246,0.30)]">{example}</span>)}
                  </div>
                  <button type="button" onClick={() => activateHomeAiTool(tool.id)} className="mt-auto flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-400/50" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #A855F7 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)' }}>{tool.action}</button>
                </article>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-white/[0.10] p-4 sm:p-5 lg:p-6" style={{ background: '#12121B' }}>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-[#F8FAFC]">{selectedHomeTool.label}</span>
                  <span className="rounded-full border border-[rgba(139,92,246,0.20)] bg-[rgba(139,92,246,0.10)] px-2 py-0.5 text-xs text-[#C4B5FD]">AI</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-[#A8A8B8]">Add a prompt, optional files, then continue in the editor.</p>
              </div>
              <span className="text-xs text-[#71717F] sm:text-right">⌘/Ctrl + Enter to generate</span>
            </div>
            <div className="rounded-2xl border border-white/[0.10] p-3 transition-all sm:p-4" style={{ background: '#12121A' }} onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.50)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.10)'; }}>
              <textarea
                ref={homePromptRef}
                value={homePrompt}
                onChange={(event) => setHomePrompt(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && homePrompt.trim()) generateFromHomeComposer();
                }}
                placeholder="Describe your design in detail..."
                className="min-h-[132px] w-full resize-none border-0 bg-transparent p-1 text-sm leading-7 text-[#F8FAFC] outline-none placeholder:text-[#71717F] sm:min-h-[148px]"
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => homeUploadRef.current?.click()} className="inline-flex h-10 items-center rounded-xl border border-[rgba(196,181,253,0.18)] bg-[#171720] px-3 text-sm font-semibold text-[#F8FAFC] transition-all hover:border-[rgba(168,85,247,0.60)] hover:bg-[#1C1C2A] cursor-pointer"><Upload className="mr-2 h-4 w-4" />Upload</button>
                  <input ref={homeUploadRef} type="file" multiple accept=".pdf,.docx,.txt,image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={(event) => { handleHomeUploads(event.target.files); event.currentTarget.value = ''; }} />
                  <button type="button" onClick={() => setShowIdeas((current) => !current)} className="inline-flex h-10 items-center rounded-xl border border-[rgba(196,181,253,0.18)] bg-[#171720] px-3 text-sm font-semibold text-[#F8FAFC] transition-all hover:border-[rgba(168,85,247,0.60)] hover:bg-[#1C1C2A] cursor-pointer"><Sparkles className="mr-2 h-4 w-4" />Ideas</button>
                  <button type="button" onClick={enhanceHomePrompt} disabled={!homePrompt.trim() || enhancingPrompt} className="inline-flex h-10 items-center rounded-xl border border-[rgba(139,92,246,0.40)] bg-[rgba(139,92,246,0.10)] px-3 text-sm font-semibold text-[#C4B5FD] transition-all hover:bg-[rgba(139,92,246,0.20)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer">{enhancingPrompt ? 'Enhancing...' : 'Enhance'}</button>
                </div>
                <button type="button" onClick={generateFromHomeComposer} disabled={!homePrompt.trim() && !enhancedPrompt.trim()} className="flex h-11 w-full items-center justify-center rounded-xl px-6 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto cursor-pointer" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #A855F7 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)' }}>Generate</button>
              </div>
            </div>

            {enhancedPrompt && (
              <div className="mt-3 rounded-2xl border border-[rgba(139,92,246,0.20)] bg-[rgba(139,92,246,0.08)] p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C4B5FD]">Enhanced prompt</span>
                  <div className="flex gap-2"><button type="button" onClick={() => setEnhancedPrompt('')} className="text-xs font-semibold text-[#A8A8B8] hover:text-white transition-colors cursor-pointer">Restore</button><button type="button" onClick={() => setHomePrompt(enhancedPrompt)} className="text-xs font-semibold text-[#C4B5FD] hover:text-white transition-colors cursor-pointer">Accept</button></div>
                </div>
                <textarea value={enhancedPrompt} onChange={(event) => setEnhancedPrompt(event.target.value)} className="min-h-[84px] w-full resize-none rounded-xl border border-white/[0.10] bg-[#0E0E16] px-3 py-2 text-xs leading-6 text-[#F8FAFC] outline-none focus:border-[rgba(139,92,246,0.50)]" />
              </div>
            )}

            {homeUploads.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {homeUploads.map((file, index) => (
                  <span key={`${file.name}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-[#0E0E16] px-3 py-1.5 text-xs text-[#A8A8B8]">
                    {file.type.startsWith('image/') ? <ImagePlus className="h-3.5 w-3.5 text-[#C4B5FD]" /> : <FileText className="h-3.5 w-3.5 text-[#C4B5FD]" />}
                    <span className="max-w-[180px] truncate">{file.name}</span>
                    <button type="button" onClick={() => setHomeUploads((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="text-[#71717F] hover:text-rose-300 transition-colors cursor-pointer" aria-label={`Remove ${file.name}`}><X className="h-3.5 w-3.5" /></button>
                  </span>
                ))}
              </div>
            )}

            {showIdeas && (
              <div className="mt-3 flex flex-wrap gap-2 rounded-2xl border border-white/[0.10] bg-[#0E0E16] p-3">
                {promptIdeas.map((idea) => (
                  <button key={idea} type="button" onClick={() => { setHomePrompt(`Create a professional ${idea.toLowerCase()} with premium typography, strong visual hierarchy, cohesive colors, relevant imagery, and clear call to action.`); setShowIdeas(false); focusHomeAiComposer(); }} className="rounded-full border border-white/[0.10] bg-[#12121B] px-3 py-1.5 text-xs text-[#A8A8B8] transition-all hover:border-[rgba(139,92,246,0.50)] hover:bg-[rgba(139,92,246,0.08)] hover:text-[#C4B5FD] cursor-pointer">{idea}</button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <SectionHeader title="Quick Create" description="Poster canvases open in the editor. Lesson Video is a separate workspace that renders a silent 1080p MP4." />
          <button type="button" onClick={() => navigate('/create')} className="mb-4 flex w-full items-center gap-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-left text-white hover:bg-emerald-500/20"><Palette className="h-8 w-8 text-emerald-300"/><span><strong className="block text-base">Creative Studio</strong><span className="text-sm text-zinc-300">Branded posters, products and services, social formats and A4/A3 exports.</span></span></button>
          <button type="button" onClick={createLessonVideo} disabled={creatingLessonVideo} className="mb-4 flex w-full items-center gap-4 rounded-2xl border border-violet-500/40 bg-violet-500/10 p-5 text-left text-white transition-all hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60">
            <Film className="h-8 w-8 shrink-0 text-violet-300" />
            <span>
              <strong className="block text-base">{creatingLessonVideo ? 'Creating lesson…' : 'Create Lesson Video'}</strong>
              <span className="text-sm text-zinc-300">Silent landscape 1080p MP4 via Remotion — not a canvas poster export.</span>
            </span>
          </button>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8">
            {HOME_QUICK_CREATE_PRESETS.map((preset) => (
              <button key={preset.name} type="button" onClick={() => handleCreateDesign(preset.name, preset.width, preset.height)} className="group flex min-h-[132px] flex-col rounded-2xl border border-white/[0.10] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[rgba(139,92,246,0.50)] focus:outline-none focus:ring-2 focus:ring-violet-400/40 cursor-pointer" style={{ background: '#12121B' }}>
                <span className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${preset.accent}`}><Image className="h-4 w-4 text-white" /></span>
                <span className="text-sm font-semibold text-white">{preset.name}</span>
                <span className="mt-1 text-xs text-zinc-500">{preset.width} × {preset.height}</span>
                <span className="mt-auto pt-3 text-[11px] text-zinc-500">{preset.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="Recent Projects" description="Open your latest designs or create a new poster." action={<button type="button" onClick={() => setActivePage('projects')} className="text-sm font-semibold text-[#C4B5FD] hover:text-[#E9D5FF] transition-colors cursor-pointer">View All</button>} />
          {savedDesigns.length === 0 ? (
            <EmptyState icon={FileText} title="No projects yet" description="Create a Lesson Video, start a poster, or pick a template." action={<div className="flex flex-wrap justify-center gap-2"><button type="button" onClick={createLessonVideo} disabled={creatingLessonVideo} className="h-10 rounded-xl px-4 text-sm font-semibold text-white cursor-pointer disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}>{creatingLessonVideo ? 'Creating lesson…' : 'Create Lesson Video'}</button><button type="button" onClick={() => handleCreateDesign('New Poster', 800, 1132)} className="h-10 rounded-xl border border-white/[0.10] px-4 text-sm font-semibold text-[#F8FAFC] transition-all hover:border-[rgba(139,92,246,0.50)] cursor-pointer">Create Poster</button><button type="button" onClick={() => setActivePage('templates')} className="h-10 rounded-xl border border-white/[0.10] px-4 text-sm font-semibold text-[#F8FAFC] transition-all hover:border-[rgba(139,92,246,0.50)] cursor-pointer">Browse Templates</button></div>} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visibleProjects.map((project) => (
                <DesignCard key={project.id} design={{ id: project.id, name: project.name, type: projectTypeLabel(project), editedAt: formatRelativeDate(project.updatedAt), gradient: project.design_type === 'lesson-video' ? 'from-fuchsia-500/30 to-violet-500/30' : project.id.startsWith('local_') ? 'from-cyan-500/30 to-blue-500/30' : 'from-violet-500/30 to-fuchsia-500/30', thumbnail: project.thumbnail, width: project.width, height: project.height }} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeader title="Start with a Template" description="Choose a professionally designed layout and customize every section." action={<button type="button" onClick={() => setActivePage('templates')} className="text-sm font-semibold text-[#C4B5FD] hover:text-[#E9D5FF] transition-colors cursor-pointer">View All Templates</button>} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {featuredTemplates.map((template) => (
              <article key={template.id} className="flex h-full flex-col rounded-2xl border border-white/[0.10] p-3 transition-all hover:border-[rgba(139,92,246,0.50)]" style={{ background: '#12121B' }}>
                <button type="button" onClick={() => openTemplatePreview(template)} className="group block overflow-hidden rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-violet-400/40 cursor-pointer">
                  <div className="aspect-[4/5] overflow-hidden rounded-xl border border-white/[0.10] bg-[#0E0E16]">
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[rgba(139,92,246,0.25)] to-[rgba(168,85,247,0.20)] p-3 transition-transform group-hover:scale-[1.02]">
                      <LayoutTemplate className="h-9 w-9 text-[#C4B5FD]" />
                    </div>
                  </div>
                </button>
                <div className="mt-3 flex flex-1 flex-col">
                  <h3 className="truncate text-sm font-semibold text-[#F8FAFC]">{template.name}</h3>
                  <p className="mt-1 truncate text-xs text-[#71717F]">{template.category} · {template.aspectRatio}</p>
                  <div className="mt-auto flex gap-2 pt-3"><button type="button" onClick={() => openTemplatePreview(template)} className="h-9 flex-1 rounded-lg border border-white/[0.10] text-xs font-semibold text-[#A8A8B8] hover:border-white/[0.18] hover:text-white transition-all cursor-pointer">Preview</button><button type="button" onClick={() => handleUseTechTemplate(template)} className="h-9 flex-1 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer" style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}>Use</button></div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="Explore Assets" description="Open the editor asset browser for photos, graphics, shapes, and backgrounds." />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {HOME_ASSET_CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <button key={category.name} type="button" onClick={() => openAssetsWorkspace(category.name)} className="rounded-2xl border border-white/[0.10] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[rgba(34,211,238,0.40)] focus:outline-none focus:ring-2 focus:ring-cyan-400/30 cursor-pointer" style={{ background: '#12121B' }}>
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(139, 92, 246, 0.14)', border: '1px solid rgba(168, 85, 247, 0.30)' }}><Icon className="h-4 w-4 text-[#C4B5FD]" /></span>
                  <span className="block text-sm font-semibold text-[#F8FAFC]">{category.name}</span>
                  <span className="mt-1 block text-xs leading-5 text-[#71717F]">{category.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-white/[0.10] p-5" style={{ background: '#12121B' }}>
            <SectionHeader title="Brand Hub" description="Reusable colours, fonts, and logos for consistent designs." action={<button type="button" onClick={() => { setActivePage('brand-hub'); if (!brandKitsLoaded) fetchBrandKits(); }} className="text-sm font-semibold text-[#C4B5FD] hover:text-[#E9D5FF] transition-colors cursor-pointer">Open Brand Hub</button>} />
            {brandKitsLoaded && brandKits.length === 0 ? (
              <EmptyState icon={Palette} title="Create your first Brand Kit" description="Save reusable colours, fonts, and logos for consistent designs." action={<button type="button" onClick={() => { resetBrandKitForm(); setShowNewKitForm(true); setActivePage('brand-hub'); }} className="h-10 rounded-xl px-4 text-sm font-semibold text-white cursor-pointer" style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}>Create Brand Kit</button>} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-[88px_minmax(0,1fr)]">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.10] bg-white/95">
                  {primaryBrandLogo ? <img src={primaryBrandLogo.file_data} alt={primaryBrandLogo.name} loading="lazy" className="h-full w-full object-contain p-2" /> : <Palette className="h-7 w-7 text-[#8B5CF6]" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-[#F8FAFC]">{primaryBrandKit?.name || 'Brand Kits'}</p>
                  <p className="mt-1 text-sm text-[#71717F]">{brandKitsLoaded ? `${brandKits.length} saved kit${brandKits.length === 1 ? '' : 's'}` : 'Loading brand kits...'}</p>
                  <div className="mt-4 flex gap-1.5">{primaryBrandKit?.colors?.slice(0, 6).map((color) => <span key={color.id} className="h-7 w-7 rounded-lg border border-white/[0.10]" style={{ backgroundColor: color.hex_value }} title={color.name} />)}{!primaryBrandKit?.colors?.length && <span className="text-xs text-[#71717F]">No colours yet</span>}</div>
                  <p className="mt-3 truncate text-xs text-[#71717F]">Primary: {primaryBrandColor?.hex_value || 'not set'} · Font: {primaryBrandFont?.family || 'not set'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.10] p-5" style={{ background: '#12121B' }}>
            <SectionHeader title="Shared & Exports" description="Secondary workspace activity stays available without crowding creation tools." />
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setActivePage('shared')} className="rounded-2xl border border-white/[0.10] bg-[#0E0E16] p-4 text-left transition-all hover:border-[rgba(139,92,246,0.40)] cursor-pointer">
                <Users className="mb-3 h-5 w-5 text-[#C4B5FD]" />
                <p className="text-sm font-semibold text-[#F8FAFC]">Shared with Me</p>
                <p className="mt-1 text-xs text-[#71717F]">Open projects shared by collaborators.</p>
              </button>
              <button type="button" onClick={() => setActivePage('projects')} className="rounded-2xl border border-white/[0.10] bg-[#0E0E16] p-4 text-left transition-all hover:border-[rgba(139,92,246,0.40)] cursor-pointer">
                <Upload className="mb-3 h-5 w-5 text-[#C4B5FD]" />
                <p className="text-sm font-semibold text-[#F8FAFC]">Recent Exports</p>
                <p className="mt-1 text-xs text-[#71717F]">Exports are available from each open design.</p>
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  };

  // ─── Page: Projects ─────────────────────────────────────────────────────────
  const renderProjects = () => (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">All Projects</h2>
          <p className="mt-1 text-sm text-zinc-400">Browse every saved design from the studio.</p>
        </div>
        <button onClick={openCreateDesignFlow} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all cursor-pointer" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #A855F7 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)' }}>
          <Plus className="w-4 h-4" /> New Design
        </button>
      </div>

      {/* All Designs */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#A8A8B8]">Your Designs ({savedDesigns.length})</h3>
        {savedDesigns.length === 0 ? (
          <div className="rounded-3xl border border-white/[0.08] py-20 text-center backdrop-blur-sm" style={{ background: 'rgba(8, 8, 13, 0.50)' }}>
            <FileText className="mx-auto mb-3 h-12 w-12 opacity-40 text-[#71717F]" />
            <p className="font-semibold text-[#F8FAFC]">No designs yet</p>
            <p className="mt-1 text-xs text-[#A8A8B8]">Create your first design to get started</p>
            <button onClick={openCreateDesignFlow} className="mt-4 rounded-xl px-4 py-2 text-xs font-semibold text-white cursor-pointer" style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)' }}>
              Create Design
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {savedDesigns.map((project) => (
              <DesignCard
                key={project.id}
                design={{
                  id: project.id,
                  name: project.name,
                  type: projectTypeLabel(project),
                  editedAt: formatRelativeDate(project.updatedAt),
                  gradient: project.design_type === 'lesson-video' ? 'from-fuchsia-500/30 to-violet-500/30' : project.id.startsWith('local_') ? 'from-cyan-500/30 to-blue-500/30' : 'from-violet-500/30 to-fuchsia-500/30',
                }}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );

  // ─── Page: Templates ────────────────────────────────────────────────────────
  const renderTemplates = () => (
    <TemplatesPage
      onCreateBlankPoster={() => handleCreateDesign('Blank Poster', 800, 1132)}
      onGenerateWithAi={(prompt) => handleCreateDesign('AI Poster', 800, 1132, 'poster', prompt || 'Create a professional poster')}
      onTemplateUsed={handleTemplateProjectCreated}
      notify={showNotification}
    />
  );

  // ─── Page: Brand Hub ────────────────────────────────────────────────────────
  const emptyBrandKitForm: BrandKitFormState = {
    name: '',
    company_name: '',
    description: '',
    industry: '',
    website: '',
  };
  const [brandKits, setBrandKits] = useState<DashboardBrandKit[]>([]);
  const [brandKitForm, setBrandKitForm] = useState<BrandKitFormState>(emptyBrandKitForm);
  const [showNewKitForm, setShowNewKitForm] = useState(false);
  const [brandKitsLoading, setBrandKitsLoading] = useState(false);
  const [brandKitsLoaded, setBrandKitsLoaded] = useState(false);
  const [brandKitError, setBrandKitError] = useState('');
  const [creatingBrandKit, setCreatingBrandKit] = useState(false);
  const [activeKitTab, setActiveKitTab] = useState<BrandHubTab>('overview');
  const [newColor, setNewColor] = useState({ name: '', hex: '#8b5cf6', role: 'primary', is_primary: true });
  const [newFont, setNewFont] = useState({ name: '', family: 'Outfit', weight: 'normal', role: 'heading' });
  const [logoRole, setLogoRole] = useState('primary');
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
  const [brandKitSearch, setBrandKitSearch] = useState('');
  const [openKitMenuId, setOpenKitMenuId] = useState<string | null>(null);

  const readApiError = async (res: Response, fallback: string) => {
    const payload = await res.json().catch(() => null);
    if (Array.isArray(payload?.detail)) {
      return payload.detail.map((item: { msg?: string; message?: string }) => item?.msg || item?.message || String(item)).join(', ');
    }
    return payload?.error || payload?.detail || fallback;
  };

  const resetBrandKitForm = () => setBrandKitForm(emptyBrandKitForm);

  const updateBrandKitInState = (updatedKit: DashboardBrandKit) => {
    setBrandKits((current) => [updatedKit, ...current.filter((kit) => kit.id !== updatedKit.id)]);
    setSelectedKitId(updatedKit.id);
  };

  const fetchBrandKits = async () => {
    const token = getAuthToken();
    if (!token) {
      setBrandKits([]);
      setBrandKitsLoaded(true);
      setBrandKitError('Your current session is not backed by a valid backend token. Please log in again to manage brand kits.');
      return;
    }
    setBrandKitsLoading(true);
    setBrandKitError('');
    try {
      const res = await apiFetch('/api/brand-kits');
      if (!res.ok) {
        throw new Error(await readApiError(res, `Failed to load brand kits (${res.status})`));
      }
      const data = await res.json();
      const kits = (data.brand_kits || []) as DashboardBrandKit[];
      setBrandKits(kits);
      setSelectedKitId((current) => current && kits.some((kit) => kit.id === current) ? current : null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load brand kits.';
      setBrandKitError(message);
      showNotification(message, 'error');
    } finally {
      setBrandKitsLoading(false);
      setBrandKitsLoaded(true);
    }
  };

  React.useEffect(() => {
    if ((activePage === 'brand-hub' || activePage === 'home') && !brandKitsLoaded && !brandKitsLoading) {
      fetchBrandKits();
    }
  }, [activePage, brandKitsLoaded, brandKitsLoading]);

  const brandKitSearchQuery = brandKitSearch.trim().toLowerCase();
  const filteredBrandKits = brandKitSearchQuery
    ? brandKits.filter((kit) => [kit.name, kit.company_name, kit.industry, kit.website]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(brandKitSearchQuery)))
    : brandKits;

  const lastUpdatedBrandKit = [...brandKits].sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())[0] || null;

  const recentBrandKit = lastUpdatedBrandKit;

  const createBrandKit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const payload = {
      name: brandKitForm.name.trim(),
      company_name: brandKitForm.company_name.trim() || undefined,
      description: brandKitForm.description.trim() || undefined,
      industry: brandKitForm.industry.trim() || undefined,
      website: brandKitForm.website.trim() || undefined,
    };
    if (!payload.name) {
      setBrandKitError('Brand kit name is required.');
      showNotification('Brand kit name is required.', 'error');
      return;
    }
    if (creatingBrandKit) return;
    const token = getAuthToken();
    if (!token) {
      const message = 'Your current session is not backed by a valid backend token. Please log in again to create brand kits.';
      setBrandKitError(message);
      showNotification(message, 'error');
      return;
    }
    setCreatingBrandKit(true);
    setBrandKitError('');
    try {
      const res = await apiFetch('/api/brand-kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, `Failed to create brand kit (${res.status})`));
      }
      const createdKit = (await res.json()) as DashboardBrandKit;
      updateBrandKitInState(createdKit);
      setBrandKitsLoaded(true);
      resetBrandKitForm();
      setShowNewKitForm(false);
      setActiveKitTab('overview');
      showNotification('Brand kit created successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create brand kit.';
      setBrandKitError(message);
      showNotification(message, 'error');
    } finally {
      setCreatingBrandKit(false);
    }
  };

  const patchBrandKit = async (kitId: string, payload: Partial<BrandKitFormState>) => {
    const res = await apiFetch(`/api/brand-kits/${kitId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await readApiError(res, `Failed to update brand kit (${res.status})`));
    const updated = (await res.json()) as DashboardBrandKit;
    updateBrandKitInState(updated);
    return updated;
  };

  const renameBrandKit = async (kit: DashboardBrandKit) => {
    const nextName = window.prompt('Rename brand kit', kit.name)?.trim();
    if (!nextName || nextName === kit.name) return;
    try {
      await patchBrandKit(kit.id, { name: nextName });
      setOpenKitMenuId(null);
      showNotification('Brand kit renamed.');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to rename brand kit.', 'error');
    }
  };

  const duplicateBrandKit = async (kitId: string) => {
    try {
      const res = await apiFetch(`/api/brand-kits/${kitId}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error(await readApiError(res, `Failed to duplicate brand kit (${res.status})`));
      const duplicated = (await res.json()) as DashboardBrandKit;
      updateBrandKitInState(duplicated);
      setOpenKitMenuId(null);
      showNotification('Brand kit duplicated.');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to duplicate brand kit.', 'error');
    }
  };

  const applyBrandKitToPoster = async (kit: DashboardBrandKit) => {
    localStorage.setItem('teckstudio_pending_brand_kit', JSON.stringify({ kit, autoApply: true, createdAt: Date.now() }));
    showNotification('Brand kit queued for the editor.');
    await handleCreateDesign(`${kit.name} Brand Poster`, 800, 1132);
  };

  const addColorToKit = async (kitId: string) => {
    if (!newColor.name.trim()) {
      showNotification('Color name is required.', 'error');
      return;
    }
    try {
      const res = await apiFetch(`/api/brand-kits/${kitId}/colors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newColor.name.trim(),
          hex_value: newColor.hex,
          role: newColor.role,
          is_primary: newColor.is_primary,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res, `Failed to add color (${res.status})`));
      setNewColor({ name: '', hex: '#8b5cf6', role: 'custom', is_primary: false });
      await fetchBrandKits();
      showNotification('Brand color added.');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to add color.', 'error');
    }
  };

  const addFontToKit = async (kitId: string) => {
    if (!newFont.name.trim()) {
      showNotification('Font name is required.', 'error');
      return;
    }
    try {
      const res = await apiFetch(`/api/brand-kits/${kitId}/fonts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFont.name.trim(), family: newFont.family, weight: newFont.weight, role: newFont.role }),
      });
      if (!res.ok) throw new Error(await readApiError(res, `Failed to add font (${res.status})`));
      setNewFont({ name: '', family: 'Outfit', weight: 'normal', role: 'body' });
      await fetchBrandKits();
      showNotification('Brand font added.');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to add font.', 'error');
    }
  };

  const uploadLogoToKit = async (kitId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      showNotification('Logo must be an image file.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification('Logo must be 5MB or smaller.', 'error');
      return;
    }
    const fileData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read logo file.'));
      reader.readAsDataURL(file);
    });
    try {
      const res = await apiFetch(`/api/brand-kits/${kitId}/logos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, file_data: fileData, file_type: file.type, role: logoRole }),
      });
      if (!res.ok) throw new Error(await readApiError(res, `Failed to upload logo (${res.status})`));
      await fetchBrandKits();
      showNotification('Brand logo uploaded.');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to upload logo.', 'error');
    }
  };

  const deleteKitItem = async (kitId: string, type: 'colors' | 'fonts' | 'logos', itemId: string) => {
    try {
      const res = await apiFetch(`/api/brand-kits/${kitId}/${type}/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readApiError(res, `Failed to delete ${type.slice(0, -1)} (${res.status})`));
      await fetchBrandKits();
      showNotification('Brand asset deleted.');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to delete brand asset.', 'error');
    }
  };

  const deleteBrandKit = async (kitId: string) => {
    if (!window.confirm('Delete this brand kit and all colors, fonts, and logos?')) return;
    try {
      const res = await apiFetch(`/api/brand-kits/${kitId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readApiError(res, `Failed to delete brand kit (${res.status})`));
      if (selectedKitId === kitId) setSelectedKitId(null);
      await fetchBrandKits();
      setOpenKitMenuId(null);
      showNotification('Brand kit deleted.');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to delete brand kit.', 'error');
    }
  };

  const selectedKit = brandKits.find((kit) => kit.id === selectedKitId) || null;

  const renderBrandHub = () => (
    <>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#F8FAFC]">Brand Hub</h2>
          <p className="mt-1 text-sm text-[#A8A8B8]">Create reusable brand identities for consistent posters and designs.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717F]" />
            <input
              type="search"
              value={brandKitSearch}
              onChange={(event) => setBrandKitSearch(event.target.value)}
              placeholder="Search brand kits..."
              className="w-full rounded-xl py-2 pl-9 pr-3 text-sm outline-none transition-all sm:w-64"
              style={{ border: '1px solid rgba(255,255,255,0.10)', background: '#12121B', color: '#F8FAFC' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.50)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
            />
          </div>
          <button
            type="button"
            onClick={() => { resetBrandKitForm(); setShowNewKitForm(true); }}
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', boxShadow: '0 8px 24px rgba(124,58,237,0.25)' }}
          >
            <Plus className="h-4 w-4" /> Create Brand Kit
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl p-4" style={{ border: '1px solid rgba(255,255,255,0.10)', background: '#12121B' }}>
          <p className="text-xs text-[#71717F]">Total Brand Kits</p>
          <p className="mt-1 text-2xl font-bold text-[#F8FAFC]">{brandKits.length}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ border: '1px solid rgba(255,255,255,0.10)', background: '#12121B' }}>
          <p className="text-xs text-[#71717F]">Last Updated Brand Kit</p>
          <p className="mt-1 truncate text-sm font-semibold text-[#F8FAFC]">{lastUpdatedBrandKit?.name || 'None yet'}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ border: '1px solid rgba(255,255,255,0.10)', background: '#12121B' }}>
          <p className="text-xs text-[#71717F]">Recently Used Brand Kit</p>
          <p className="mt-1 truncate text-sm font-semibold text-[#F8FAFC]">{recentBrandKit?.name || 'None yet'}</p>
        </div>
      </div>

      {showNewKitForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form onSubmit={createBrandKit} className="w-full max-w-2xl rounded-3xl p-6 shadow-2xl shadow-black/50" style={{ border: '1px solid rgba(139,92,246,0.20)', background: '#0E0E16' }}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-[#F8FAFC]">Create Brand Kit</h3>
                <p className="mt-1 text-sm text-[#A8A8B8]">Save your colors, fonts, and logos to create consistent posters faster.</p>
              </div>
              <button type="button" onClick={() => { setShowNewKitForm(false); resetBrandKitForm(); setBrandKitError(''); }} className="rounded-xl p-2 text-[#71717F] hover:bg-[#12121B] hover:text-white cursor-pointer transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-[#A8A8B8]">Brand Kit Name *</span>
                <input value={brandKitForm.name} onChange={(event) => setBrandKitForm({ ...brandKitForm, name: event.target.value })} disabled={creatingBrandKit} autoFocus placeholder="e.g. Laksha AI Brand" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ border: '1px solid rgba(255,255,255,0.10)', background: '#12121B', color: '#F8FAFC' }} onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.50)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }} />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-[#A8A8B8]">Company / Brand Name</span>
                <input value={brandKitForm.company_name} onChange={(event) => setBrandKitForm({ ...brandKitForm, company_name: event.target.value })} disabled={creatingBrandKit} className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ border: '1px solid rgba(255,255,255,0.10)', background: '#12121B', color: '#F8FAFC' }} onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.50)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }} />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-[#A8A8B8]">Industry</span>
                <input value={brandKitForm.industry} onChange={(event) => setBrandKitForm({ ...brandKitForm, industry: event.target.value })} disabled={creatingBrandKit} className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ border: '1px solid rgba(255,255,255,0.10)', background: '#12121B', color: '#F8FAFC' }} onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.50)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }} />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-[#A8A8B8]">Website</span>
                <input value={brandKitForm.website} onChange={(event) => setBrandKitForm({ ...brandKitForm, website: event.target.value })} disabled={creatingBrandKit} placeholder="https://example.com" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ border: '1px solid rgba(255,255,255,0.10)', background: '#12121B', color: '#F8FAFC' }} onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.50)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }} />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-[#A8A8B8]">Description</span>
                <textarea value={brandKitForm.description} onChange={(event) => setBrandKitForm({ ...brandKitForm, description: event.target.value })} disabled={creatingBrandKit} rows={3} className="w-full resize-none rounded-xl px-3 py-2 text-sm outline-none" style={{ border: '1px solid rgba(255,255,255,0.10)', background: '#12121B', color: '#F8FAFC' }} onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.50)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }} />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => { setShowNewKitForm(false); resetBrandKitForm(); setBrandKitError(''); }} disabled={creatingBrandKit} className="rounded-xl border border-white/[0.10] bg-[#171720] px-4 py-2 text-sm font-semibold text-[#A8A8B8] cursor-pointer disabled:opacity-50 transition-all hover:text-white">Cancel</button>
              <button type="submit" disabled={creatingBrandKit || !brandKitForm.name.trim()} className="rounded-xl px-4 py-2 text-sm font-semibold text-white cursor-pointer disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}>{creatingBrandKit ? 'Creating...' : 'Create Brand Kit'}</button>
            </div>
          </form>
        </div>
      )}

      {brandKitError && (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {brandKitError}
        </div>
      )}

      {!selectedKit ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {brandKitsLoading && !brandKitsLoaded ? (
            <div className="col-span-full rounded-3xl py-16 text-center backdrop-blur-sm" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(8,8,13,0.50)' }}>
              <p className="font-semibold text-[#F8FAFC]">Loading brand kits...</p>
              <p className="mt-1 text-xs text-[#A8A8B8]">Checking your saved brand assets.</p>
            </div>
          ) : brandKitsLoaded && brandKits.length === 0 ? (
            <div className="col-span-full rounded-3xl py-16 text-center backdrop-blur-sm" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(8,8,13,0.50)' }}>
              <Palette className="mx-auto mb-3 h-12 w-12 opacity-40 text-[#71717F]" />
              <p className="font-semibold text-[#F8FAFC]">Create your first Brand Kit</p>
              <p className="mt-1 text-xs text-[#A8A8B8]">Save your colors, fonts, and logos to create consistent posters faster.</p>
              <button type="button" onClick={() => { resetBrandKitForm(); setShowNewKitForm(true); }} className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white cursor-pointer" style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}>Create Brand Kit</button>
            </div>
          ) : filteredBrandKits.length === 0 ? (
            <div className="col-span-full rounded-3xl py-16 text-center backdrop-blur-sm" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(8,8,13,0.50)' }}>
              <p className="font-semibold text-[#F8FAFC]">No brand kits match your search.</p>
            </div>
          ) : (
            filteredBrandKits.map((kit) => {
              const primaryLogo = kit.logos.find((logo) => logo.role === 'primary') || kit.logos[0];
              const primaryFont = kit.fonts.find((font) => font.role === 'heading') || kit.fonts[0];
              return (
                <div key={kit.id} className="relative rounded-3xl p-5 transition-all hover:shadow-lg" style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#12121B', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <button type="button" onClick={() => { setSelectedKitId(kit.id); setActiveKitTab('overview'); }} className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.10] bg-white/95">
                        {primaryLogo ? <img src={primaryLogo.file_data} alt={primaryLogo.name} className="h-full w-full object-contain p-1" /> : <Palette className="h-5 w-5 text-[#8B5CF6]" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold tracking-tight text-[#F8FAFC]">{kit.name}</h4>
                        <p className="truncate text-xs text-[#71717F]">{kit.company_name || kit.industry || 'Reusable brand identity'}</p>
                      </div>
                    </button>
                    <div className="relative">
                      <button type="button" onClick={() => setOpenKitMenuId(openKitMenuId === kit.id ? null : kit.id)} className="rounded-lg px-2 py-1 text-lg leading-none text-[#71717F] hover:bg-[#171722] hover:text-white cursor-pointer transition-colors">•••</button>
                      {openKitMenuId === kit.id && (
                        <div className="absolute right-0 top-8 z-20 w-36 overflow-hidden rounded-xl shadow-2xl" style={{ border: '1px solid rgba(255,255,255,0.10)', background: '#0E0E16' }}>
                          <button type="button" onClick={() => renameBrandKit(kit)} className="block w-full px-3 py-2 text-left text-xs text-[#A8A8B8] hover:bg-[#171722] cursor-pointer transition-colors">Rename</button>
                          <button type="button" onClick={() => duplicateBrandKit(kit.id)} className="block w-full px-3 py-2 text-left text-xs text-[#A8A8B8] hover:bg-[#171722] cursor-pointer transition-colors">Duplicate</button>
                          <button type="button" onClick={() => deleteBrandKit(kit.id)} className="block w-full px-3 py-2 text-left text-xs text-rose-300 hover:bg-rose-950/30 cursor-pointer transition-colors">Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mb-4 flex gap-1.5">
                    {kit.colors.slice(0, 7).map((color) => (
                      <span key={color.id} className="h-7 w-7 rounded-lg" style={{ backgroundColor: color.hex_value, border: '1px solid rgba(255,255,255,0.10)' }} title={`${color.name} ${color.hex_value}`} />
                    ))}
                    {kit.colors.length === 0 && <span className="text-xs text-[#71717F]">No colors yet</span>}
                  </div>
                  <div className="mb-4 rounded-2xl p-3" style={{ border: '1px solid rgba(255,255,255,0.10)', background: '#0E0E16' }}>
                    <p className="text-xs text-[#71717F]">Primary font</p>
                    <p className="mt-1 text-sm font-semibold text-[#F8FAFC]" style={{ fontFamily: primaryFont?.family || undefined, fontWeight: primaryFont?.weight || undefined }}>{primaryFont ? `${primaryFont.family} • ${primaryFont.weight}` : 'No font yet'}</p>
                  </div>
                  <div className="mb-4 flex flex-wrap gap-3 text-[10px] text-[#A8A8B8]">
                    <span>{kit.colors.length} colors</span>
                    <span>{kit.fonts.length} fonts</span>
                    <span>{kit.logos.length} logos</span>
                    <span>Updated {formatRelativeDate(kit.updated_at || kit.created_at)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setSelectedKitId(kit.id); setActiveKitTab('overview'); }} className="flex-1 rounded-xl border border-white/[0.10] bg-[#0E0E16] px-3 py-2 text-xs font-semibold text-[#F8FAFC] hover:border-[rgba(139,92,246,0.50)] cursor-pointer transition-all">Open</button>
                    <button type="button" onClick={() => applyBrandKitToPoster(kit)} className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-white cursor-pointer" style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}>Apply</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <button type="button" onClick={() => setSelectedKitId(null)} className="mb-4 inline-flex items-center gap-2 text-sm text-[#C4B5FD] hover:text-[#E9D5FF] cursor-pointer transition-colors"><ArrowLeft className="h-4 w-4" /> Back to Brand Kits</button>
            <div className="mb-5 rounded-3xl p-5" style={{ border: '1px solid rgba(255,255,255,0.10)', background: '#12121B' }}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-[#F8FAFC]">{selectedKit.name}</h3>
                  <p className="mt-1 text-sm text-[#A8A8B8]">{selectedKit.description || 'Manage reusable colors, fonts, and logos for this brand.'}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#71717F]">
                    {selectedKit.company_name && <span>{selectedKit.company_name}</span>}
                    {selectedKit.industry && <span>• {selectedKit.industry}</span>}
                    {selectedKit.website && <span>• {selectedKit.website}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => renameBrandKit(selectedKit)} className="rounded-xl border border-white/[0.10] bg-[#171720] px-3 py-2 text-xs font-semibold text-[#F8FAFC] hover:border-[rgba(139,92,246,0.50)] cursor-pointer transition-all">Rename</button>
                  <button type="button" onClick={() => applyBrandKitToPoster(selectedKit)} className="rounded-xl px-3 py-2 text-xs font-semibold text-white cursor-pointer" style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}>Apply to Poster</button>
                </div>
              </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              {(['overview', 'colors', 'fonts', 'logos'] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setActiveKitTab(tab)} className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${activeKitTab === tab ? 'text-[#C4B5FD]' : 'text-[#A8A8B8] hover:text-white'}`} style={activeKitTab === tab ? { border: '1px solid rgba(139,92,246,0.30)', background: 'rgba(139,92,246,0.12)' } : { border: '1px solid rgba(255,255,255,0.10)', background: '#12121B' }}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
              ))}
            </div>

            {activeKitTab === 'overview' && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-3xl p-5 lg:col-span-2" style={{ border: '1px solid rgba(255,255,255,0.10)', background: '#12121B' }}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Live Preview</p>
                  <div className="rounded-3xl p-6" style={{ backgroundColor: selectedKit.colors.find((color) => color.role === 'background')?.hex_value || selectedKit.colors[0]?.hex_value || '#18181b' }}>
                    <div className="rounded-2xl bg-white/90 p-5 text-zinc-950 shadow-xl">
                      {selectedKit.logos[0] && <img src={selectedKit.logos[0].file_data} alt={selectedKit.logos[0].name} className="mb-4 h-12 w-20 object-contain" />}
                      <h4 className="text-2xl font-black" style={{ fontFamily: selectedKit.fonts.find((font) => font.role === 'heading')?.family || selectedKit.fonts[0]?.family || undefined, color: selectedKit.colors.find((color) => color.role === 'primary' || color.is_primary)?.hex_value || selectedKit.colors[0]?.hex_value || '#8B5CF6' }}>Brand Poster Title</h4>
                      <p className="mt-2 text-sm" style={{ fontFamily: selectedKit.fonts.find((font) => font.role === 'body')?.family || selectedKit.fonts[1]?.family || undefined }}>Use this kit to keep poster colors, fonts, and logos consistent.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Assets</p>
                  <div className="space-y-3 text-sm text-zinc-300">
                    <div className="flex justify-between"><span>Colors</span><strong>{selectedKit.colors.length}</strong></div>
                    <div className="flex justify-between"><span>Fonts</span><strong>{selectedKit.fonts.length}</strong></div>
                    <div className="flex justify-between"><span>Logos</span><strong>{selectedKit.logos.length}</strong></div>
                    <div className="flex justify-between"><span>Updated</span><strong>{formatRelativeDate(selectedKit.updated_at || selectedKit.created_at)}</strong></div>
                  </div>
                </div>
              </div>
            )}

            {activeKitTab === 'colors' && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-4 lg:grid-cols-[1fr_auto_120px_120px_auto_auto] lg:items-end">
                  <input type="text" placeholder="Color name" value={newColor.name} onChange={(event) => setNewColor({ ...newColor, name: event.target.value })} className="rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-violet-400" />
                  <input type="color" value={newColor.hex} onChange={(event) => setNewColor({ ...newColor, hex: event.target.value })} className="h-10 w-12 cursor-pointer rounded-xl border border-zinc-700 bg-transparent" />
                  <input type="text" value={newColor.hex} onChange={(event) => setNewColor({ ...newColor, hex: event.target.value })} className="rounded-xl border border-zinc-700 bg-zinc-950/80 px-2 py-2 text-center font-mono text-xs text-zinc-100 outline-none focus:border-violet-400" />
                  <select value={newColor.role} onChange={(event) => setNewColor({ ...newColor, role: event.target.value })} className="rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 outline-none cursor-pointer">
                    {['primary', 'secondary', 'accent', 'background', 'text', 'custom'].map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={newColor.is_primary} onChange={(event) => setNewColor({ ...newColor, is_primary: event.target.checked })} /> Primary</label>
                  <button type="button" onClick={() => addColorToKit(selectedKit.id)} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 cursor-pointer">Add</button>
                </div>
                {selectedKit.colors.map((color) => (
                  <div key={color.id} className="flex items-center gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-3">
                    <div className="h-10 w-10 rounded-lg border border-zinc-700" style={{ backgroundColor: color.hex_value }} />
                    <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-white">{color.name}</p><p className="text-[10px] text-zinc-500">{color.role || 'custom'}{color.is_primary ? ' • primary' : ''}</p></div>
                    <button type="button" onClick={() => navigator.clipboard.writeText(color.hex_value)} className="font-mono text-[10px] text-zinc-400 hover:text-white cursor-pointer">{color.hex_value}</button>
                    <button type="button" onClick={() => deleteKitItem(selectedKit.id, 'colors', color.id)} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400 cursor-pointer"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}

            {activeKitTab === 'fonts' && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-4 lg:grid-cols-[1fr_160px_120px_120px_auto] lg:items-end">
                  <input type="text" placeholder="Font name" value={newFont.name} onChange={(event) => setNewFont({ ...newFont, name: event.target.value })} className="rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-violet-400" />
                  <select value={newFont.family} onChange={(event) => setNewFont({ ...newFont, family: event.target.value })} className="rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 outline-none cursor-pointer">{['Outfit', 'Inter', 'Arial', 'Georgia', 'Courier New', 'Times New Roman', 'Verdana', 'Helvetica', 'Roboto', 'Montserrat'].map((font) => <option key={font} value={font}>{font}</option>)}</select>
                  <select value={newFont.weight} onChange={(event) => setNewFont({ ...newFont, weight: event.target.value })} className="rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 outline-none cursor-pointer"><option value="normal">Normal</option><option value="bold">Bold</option><option value="lighter">Light</option></select>
                  <select value={newFont.role} onChange={(event) => setNewFont({ ...newFont, role: event.target.value })} className="rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 outline-none cursor-pointer">{['heading', 'body', 'accent', 'caption', 'custom'].map((role) => <option key={role} value={role}>{role}</option>)}</select>
                  <button type="button" onClick={() => addFontToKit(selectedKit.id)} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 cursor-pointer">Add</button>
                </div>
                {selectedKit.fonts.map((font) => (
                  <div key={font.id} className="flex items-center gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-3">
                    <Type className="h-5 w-5 text-violet-400" />
                    <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white" style={{ fontFamily: font.family, fontWeight: font.weight }}>{font.name}</p><p className="text-[10px] text-zinc-500">{font.family} • {font.weight} • {font.role || 'body'}</p></div>
                    <button type="button" onClick={() => deleteKitItem(selectedKit.id, 'fonts', font.id)} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400 cursor-pointer"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}

            {activeKitTab === 'logos' && (
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <select value={logoRole} onChange={(event) => setLogoRole(event.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 outline-none cursor-pointer">{['primary', 'secondary', 'icon', 'watermark', 'custom'].map((role) => <option key={role} value={role}>{role}</option>)}</select>
                    <span className="text-xs text-zinc-500">PNG, JPG, WEBP, GIF, or SVG data URL up to 5MB.</span>
                  </div>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-800 py-6 text-zinc-500 transition-colors hover:border-violet-500/50 hover:text-violet-300">
                    <Upload className="h-5 w-5" />
                    <span className="text-xs font-semibold">Upload Logo</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadLogoToKit(selectedKit.id, file); event.currentTarget.value = ''; }} />
                  </label>
                </div>
                {selectedKit.logos.map((logo) => (
                  <div key={logo.id} className="flex items-center gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-3">
                    <img src={logo.file_data} alt={logo.name} className="h-12 w-12 rounded-lg bg-white object-contain p-1" />
                    <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">{logo.name}</p><p className="text-[10px] text-zinc-500">{logo.role || 'primary'} • {logo.file_type}</p></div>
                    <button type="button" onClick={() => deleteKitItem(selectedKit.id, 'logos', logo.id)} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400 cursor-pointer"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5 h-max">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Quick Preview</p>
            <div className="mb-4 flex gap-1.5">{selectedKit.colors.slice(0, 8).map((color) => <span key={color.id} className="h-8 flex-1 rounded-lg border border-zinc-700" style={{ backgroundColor: color.hex_value }} />)}</div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs text-zinc-500">Brand typography</p>
              <p className="mt-2 text-lg font-bold text-white" style={{ fontFamily: selectedKit.fonts[0]?.family || undefined, fontWeight: selectedKit.fonts[0]?.weight || undefined }}>Aa Headline</p>
              <p className="text-sm text-zinc-400" style={{ fontFamily: selectedKit.fonts[1]?.family || selectedKit.fonts[0]?.family || undefined }}>Body copy preview</p>
            </div>
            <button type="button" onClick={() => applyBrandKitToPoster(selectedKit)} className="mt-4 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 cursor-pointer">Apply to Poster</button>
          </aside>
        </div>
      )}
    </>
  );

  // ─── Page: Shared ───────────────────────────────────────────────────────────
  const [sharedDesigns, setSharedDesigns] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchShared = async () => {
      const token = localStorage.getItem('teckstudio_auth_token');
      if (!token || token.startsWith('offline_')) return;
      try {
        const res = await apiFetch('/api/shared');
        if (res.ok) {
          const data = await res.json();
          setSharedDesigns(data.shares || []);
        }
      } catch {
        return;
      }
    };
    if (activePage === 'shared') fetchShared();
  }, [activePage]);

  const renderShared = () => (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2 text-[#F8FAFC]">Shared with you</h2>
        <p className="text-[#A8A8B8] text-sm">Designs that your team members have shared with you.</p>
      </div>
      {sharedDesigns.length === 0 ? (
        <div className="text-center py-20 text-[#71717F]">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-[#F8FAFC]">No shared designs yet</p>
          <p className="text-xs mt-1 text-[#71717F]">Share a design from the editor to see it here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sharedDesigns.map((share: any) => (
            <div key={share.id} className="group cursor-pointer" onClick={() => handleOpenDesign(share.project_id)}>
              <div className="aspect-video rounded-xl border border-white/[0.10] overflow-hidden relative group-hover:border-[rgba(139,92,246,0.50)] transition-all mb-3" style={{ background: '#0E0E16' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-[rgba(139,92,246,0.30)] to-[rgba(168,85,247,0.30)]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-[#71717F]/40" />
                </div>
              </div>
              <h4 className="font-semibold text-[#F8FAFC] text-sm">{share.project_name}</h4>
              <p className="text-xs text-[#71717F] mt-0.5">Shared by {share.shared_by_name} · {share.access_level}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );

  // ─── Page: Trash ────────────────────────────────────────────────────────────
  const renderTrash = () => (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2 text-[#F8FAFC]">Trash</h2>
        <p className="text-[#A8A8B8] text-sm">Deleted designs are kept here for 30 days before being permanently removed.</p>
      </div>
      {trashError && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {trashError}
        </div>
      )}
      {trashLoading ? (
        <div className="rounded-2xl border border-white/[0.10] p-8 text-sm text-[#A8A8B8]" style={{ background: '#12121B' }}>
          Loading deleted designs...
        </div>
      ) : trashedDesigns.length === 0 ? (
        <div className="text-center py-20 text-[#71717F]">
          <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-[#F8FAFC]">Trash is empty</p>
          <p className="text-xs mt-1 text-[#71717F]">Deleted designs will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {trashedDesigns.map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/[0.10] p-4" style={{ background: '#12121B' }}>
              <div className="mb-4 flex aspect-video items-center justify-center rounded-xl border border-white/[0.10] bg-gradient-to-br from-rose-500/20 to-[#0E0E16]">
                <Trash2 className="h-8 w-8 text-rose-300/70" />
              </div>
              <h4 className="truncate text-sm font-semibold text-[#F8FAFC]">{item.name}</h4>
              <p className="mt-1 text-xs text-[#71717F]">Deleted {formatRelativeDate(item.deletedAt)}</p>
              <p className="mt-1 text-[10px] text-[#71717F]">{item.width || 800} × {item.height || 800}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleRestoreDesign(item.id)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Restore
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Permanently delete this design? This cannot be undone.')) {
                      handlePermanentDelete(item.id);
                    }
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-500/20 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  // ─── Page Router ────────────────────────────────────────────────────────────
  const renderPage = () => {
    switch (activePage) {
      case 'home': return renderHome();
      case 'projects': return renderProjects();
      case 'templates': return renderTemplates();
      case 'brand-hub': return renderBrandHub();
      case 'shared': return renderShared();
      case 'trash': return renderTrash();
      default: return renderHome();
    }
  };

  const pageTitle = () => {
    switch (activePage) {
      case 'home': return 'Home';
      case 'projects': return 'Projects';
      case 'templates': return 'Templates';
      case 'brand-hub': return 'Brand Hub';
      case 'shared': return 'Shared';
      case 'trash': return 'Trash';
      default: return 'Home';
    }
  };

  return (
    <div className="h-screen w-screen bg-[#08080D] text-zinc-100 overflow-hidden font-sans lg:flex">
      {/* ─── Notification Toast ──────────────────────────────────────────────── */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold transition-all ${
          notification.type === 'success'
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            : 'bg-red-500/20 text-red-300 border border-red-500/30'
        }`}>
          {notification.msg}
        </div>
      )}

      {showCreateDesignModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-label="Create design" className="w-full max-w-2xl rounded-3xl border border-white/[0.10] p-6 shadow-2xl shadow-black/40" style={{ background: '#0E0E16' }}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#F8FAFC]">Create Design</h2>
                <p className="mt-1 text-sm text-[#A8A8B8]">Start a Lesson Video, or choose a poster canvas size.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateDesignModal(false)}
                className="rounded-xl border border-white/[0.10] bg-[#12121B] p-2 text-[#A8A8B8] transition-colors hover:text-white cursor-pointer"
                aria-label="Close create design"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => { setShowCreateDesignModal(false); void createLessonVideo(); }}
              disabled={creatingLessonVideo}
              className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-[rgba(139,92,246,0.45)] bg-violet-500/10 p-4 text-left transition-all hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
                <Film className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#F8FAFC]">{creatingLessonVideo ? 'Creating lesson…' : 'Create Lesson Video'}</h3>
                <p className="text-xs text-[#C4B5FD]">Silent 1080p MP4 · Remotion workspace</p>
                <p className="mt-0.5 text-[10px] text-[#A8A8B8]">Not a canvas poster export. Opens the Lesson Video workspace with starter scenes.</p>
              </div>
            </button>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CREATE_DESIGN_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => createPresetDesign(preset)}
                  className="group flex items-center gap-3 rounded-2xl border border-white/[0.10] p-4 text-left transition-all hover:border-[rgba(139,92,246,0.50)] cursor-pointer"
                  style={{ background: '#12121B' }}
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${preset.accent}`}>
                    <Image className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#F8FAFC]">{preset.name}</h3>
                    <p className="text-xs text-[#71717F]">{preset.width} × {preset.height}</p>
                    <p className="mt-0.5 text-[10px] text-[#71717F]">{preset.description}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-white/[0.10] p-4" style={{ background: '#0E0E16' }}>
              <h3 className="mb-3 text-sm font-semibold text-[#F8FAFC]">Custom Size</h3>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="number"
                  min={100}
                  value={customDesignSize.width}
                  onChange={(event) => setCustomDesignSize((current) => ({ ...current, width: Number(event.target.value) || 800 }))}
                  className="w-full rounded-xl border border-white/[0.10] bg-[#12121B] px-3 py-2 text-sm text-[#F8FAFC] outline-none focus:border-[rgba(139,92,246,0.50)] sm:w-32"
                  aria-label="Custom width"
                />
                <span className="hidden text-[#71717F] sm:block">×</span>
                <input
                  type="number"
                  min={100}
                  value={customDesignSize.height}
                  onChange={(event) => setCustomDesignSize((current) => ({ ...current, height: Number(event.target.value) || 800 }))}
                  className="w-full rounded-xl border border-white/[0.10] bg-[#12121B] px-3 py-2 text-sm text-[#F8FAFC] outline-none focus:border-[rgba(139,92,246,0.50)] sm:w-32"
                  aria-label="Custom height"
                />
                <button
                  type="button"
                  onClick={createCustomDesign}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
                >
                  Create Custom
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMobileSidebar && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setShowMobileSidebar(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ─── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-white/[0.08] bg-[#101018] transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 pb-4">
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#C084FC] via-[#A855F7] to-[#8B5CF6] bg-clip-text text-transparent tracking-wide">
            ✦ TECKSTUDIO
          </h1>
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={() => { openCreateDesignFlow(); setShowMobileSidebar(false); }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl font-semibold text-white transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-400/50"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #A855F7 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)' }}
          >
            <Plus className="w-5 h-5" />
            Create a design
          </button>
        </div>

        <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActivePage(item.id); setShowMobileSidebar(false); }}
                className={`flex h-11 items-center gap-3 rounded-xl px-3 font-medium transition-all cursor-pointer text-sm border ${
                  isActive
                    ? 'text-white border-[rgba(139,92,246,0.40)]'
                    : 'text-[#A8A8B8] border-transparent hover:bg-white/[0.04] hover:text-white'
                }`}
                style={isActive ? { background: 'linear-gradient(135deg, rgba(139,92,246,0.24), rgba(168,85,247,0.12))' } : undefined}
              >
                <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-violet-400' : ''}`} />
                {item.label}
              </button>
            );
          })}

          <div className="my-3 border-t border-white/[0.06]" />

          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActivePage(item.id); setShowMobileSidebar(false); }}
                className={`flex h-11 items-center gap-3 rounded-xl px-3 font-medium transition-all cursor-pointer text-sm border ${
                  isActive
                    ? 'text-white border-[rgba(139,92,246,0.40)]'
                    : 'text-[#A8A8B8] border-transparent hover:bg-white/[0.04] hover:text-white'
                }`}
                style={isActive ? { background: 'linear-gradient(135deg, rgba(139,92,246,0.24), rgba(168,85,247,0.12))' } : undefined}
              >
                <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-violet-400' : ''}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User avatar at the bottom with logout */}
        <div className="p-4 border-t border-white/[0.06] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#A855F7] flex items-center justify-center font-bold text-sm text-white shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#F8FAFC] truncate">{user.name}</p>
                <p className="text-[10px] text-[#71717F]">Pro Creator</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-[10px] bg-[#171722] hover:bg-[#1E1E2E] border border-white/[0.10] hover:text-[#F8FAFC] text-[#A8A8B8] font-bold px-2 py-1 rounded cursor-pointer transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden relative">
        {/* Header / Search */}
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#08080D]/85 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setShowMobileSidebar(true)}
              className="rounded-xl border border-white/[0.10] bg-[#12121B] p-2 text-[#A8A8B8] transition-colors hover:text-white lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            {activePage !== 'home' && (
              <button
                onClick={() => setActivePage('home')}
                className="p-1.5 hover:bg-white/[0.06] rounded-lg text-[#A8A8B8] hover:text-white transition-colors cursor-pointer"
                title="Back to Home"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <span className="truncate text-sm font-bold text-[#F1F5F9]">{pageTitle()}</span>
          </div>
          <div className="relative mx-2 hidden w-full max-w-xl sm:block">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717F]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, templates, assets, or designs"
              className="h-10 w-full rounded-full border border-white/[0.10] bg-[#12121B] pl-10 pr-4 text-sm text-[#F8FAFC] outline-none transition-all placeholder:text-[#71717F] focus:border-[rgba(139,92,246,0.50)] focus:bg-[#171722]"
              style={{ boxShadow: 'none' }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.15)'; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
          <button
            type="button"
            onClick={openCreateDesignFlow}
            className="hidden h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-violet-400/50 sm:flex cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #A855F7 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)' }}
          >
            <Plus className="h-4 w-4" />
            Create Design
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">
            {renderPage()}
          </div>
        </div>
      </main>
    </div>
  );
};
