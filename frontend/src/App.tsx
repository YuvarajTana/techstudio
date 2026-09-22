import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Dashboard } from './components/dashboard/Dashboard';
import Editor from './Editor';
import { AuthPages } from './components/auth/AuthPages';
import { apiFetch, getAuthToken } from './services/apiClient';

const LessonVideoEditor = lazy(() => import('./features/lesson-video/LessonVideoEditor'));
const CreativeStudio = lazy(() => import('./features/creative/CreativeStudio'));

class TeckstudioErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[TECKSTUDIO] React render failed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const showDetails = import.meta.env.DEV;
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08080D] p-6 text-zinc-100">
        <div className="w-full max-w-xl rounded-2xl border border-rose-500/30 bg-[#12121B] p-6 shadow-2xl shadow-black/40">
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-rose-300">TECKSTUDIO</div>
          <h1 className="mt-3 text-xl font-black text-white">TECKSTUDIO failed to render</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            A runtime error stopped the interface from rendering. Retry after the fix or reload the page.
          </p>
          {showDetails && (
            <pre className="mt-4 max-h-56 overflow-auto rounded-xl border border-zinc-800 bg-black/40 p-3 text-xs text-rose-100">
              {this.state.error.message}
              {this.state.error.stack ? `\n\n${this.state.error.stack}` : ''}
            </pre>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = typeof window !== 'undefined' && window.localStorage ? getAuthToken() : null;
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Public view page for shared designs
const SharedViewPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [projectData, setProjectData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchShared = async () => {
      try {
        const res = await apiFetch(`/api/shared/by-token/${token}`, { auth: false });
        if (res.ok) {
          const data = await res.json();
          setProjectData(data);
        } else {
          setError('Design not found or link has expired');
        }
      } catch {
        setError('Unable to load design');
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchShared();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#08080D' }}>
        <div className="text-sm" style={{ color: '#A8A8B8' }}>Loading design...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#08080D' }}>
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: '#A8A8B8' }}>{error}</p>
          <a href="/" className="text-sm hover:underline" style={{ color: '#C4B5FD' }}>Go to TECKSTUDIO</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: '#08080D' }}>
      <h1 className="text-xl font-bold mb-2" style={{ color: '#F8FAFC' }}>{projectData?.project_name}</h1>
      <p className="text-sm mb-6" style={{ color: '#71717F' }}>Shared via TECKSTUDIO</p>
      <div className="rounded-xl p-8 text-center max-w-md" style={{ background: '#12121B', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
        <p className="text-sm" style={{ color: '#A8A8B8' }}>This design can be viewed in the editor.</p>
        <a href={`/editor/${projectData?.project_id}`} className="mt-4 inline-block text-white px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}>
          Open in Editor
        </a>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <TeckstudioErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPages />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><Suspense fallback={<p style={{padding:40}}>Loading Creative Studio…</p>}><CreativeStudio /></Suspense></ProtectedRoute>} />
          <Route path="/lesson-video/:projectId" element={<ProtectedRoute><Suspense fallback={<p style={{padding:40}}>Loading lesson workspace…</p>}><LessonVideoEditor /></Suspense></ProtectedRoute>} />
          <Route path="/video/:projectId" element={<ProtectedRoute><Suspense fallback={<p style={{padding:40}}>Loading video workspace…</p>}><LessonVideoEditor /></Suspense></ProtectedRoute>} />
          <Route path="/editor/:id" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
          <Route path="/view/:token" element={<SharedViewPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TeckstudioErrorBoundary>
  );
};

export default App;
