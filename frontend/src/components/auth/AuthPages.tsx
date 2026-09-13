import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { apiFetch } from '../../services/apiClient';

export const AuthPages: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Clear any stale offline token when visiting login page
  React.useEffect(() => {
    const token = localStorage.getItem('teckstudio_auth_token');
    if (token && token.startsWith('offline_')) {
      localStorage.removeItem('teckstudio_auth_token');
      localStorage.removeItem('teckstudio_user');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const body = isLogin
      ? { email, password }
      : { name, email, password };

    try {
      const response = await apiFetch(isLogin ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        auth: false,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Something went wrong. Please try again.');
      }

      // Store auth state
      localStorage.setItem('teckstudio_auth_token', data.token);
      localStorage.setItem('teckstudio_user', JSON.stringify(data.user));

      // Redirect to Dashboard
      navigate('/');
    } catch (err: any) {
      localStorage.removeItem('teckstudio_auth_token');
      localStorage.removeItem('teckstudio_user');
      if (err.message.includes('fetch') || err.message.includes('Failed') || err.message.includes('NetworkError')) {
        setError('Unable to reach the backend. Please start the API server and try again.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center font-sans p-6 select-none relative overflow-hidden" style={{ background: 'radial-gradient(circle at 75% 5%, rgba(139, 92, 246, 0.10), transparent 30%), radial-gradient(circle at 15% 90%, rgba(34, 211, 238, 0.05), transparent 25%), #08080D' }}>
      {/* Decorative Orbs */}
      <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12), transparent 70%)' }} />
      <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.10), transparent 70%)' }} />

      <div className="w-full max-w-md rounded-2xl p-8 shadow-2xl relative z-10" style={{ background: '#12121B', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center gap-2 text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #C084FC, #A855F7, #8B5CF6)' }}>
            <Sparkles className="w-8 h-8 animate-pulse" style={{ color: '#A855F7' }} />
            <span className="font-extrabold text-2xl tracking-wider">TECKSTUDIO</span>
          </div>
          <h2 className="text-lg font-bold mt-4" style={{ color: '#F8FAFC' }}>
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-xs mt-1" style={{ color: '#71717F' }}>
            {isLogin
              ? 'Enter your credentials to access your design workspace'
              : 'Sign up to start saving and sharing your creative layouts'}
          </p>
        </div>

        {/* Alert Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3.5 flex items-start gap-2.5 text-xs mb-6 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: '#A8A8B8' }}>Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#71717F' }} />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-[#71717F]"
                  style={{ background: 'rgba(14, 14, 22, 0.60)', border: '1px solid rgba(255, 255, 255, 0.10)', color: '#F8FAFC' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.50)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.15)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: '#A8A8B8' }}>Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#71717F' }} />
              <input
                type="email"
                required
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-[#71717F]"
                style={{ background: 'rgba(14, 14, 22, 0.60)', border: '1px solid rgba(255, 255, 255, 0.10)', color: '#F8FAFC' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.50)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: '#A8A8B8' }}>Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#71717F' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-[#71717F]"
                style={{ background: 'rgba(14, 14, 22, 0.60)', border: '1px solid rgba(255, 255, 255, 0.10)', color: '#F8FAFC' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.50)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer text-sm focus:outline-none"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #A855F7 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)' }}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isLogin ? 'Log In' : 'Create Account'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="my-6 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

        {/* Toggle Mode */}
        <div className="text-center text-xs">
          <span style={{ color: '#71717F' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
          </span>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="font-semibold transition-colors cursor-pointer focus:outline-none"
            style={{ color: '#C4B5FD' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#E9D5FF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#C4B5FD'; }}
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
};
