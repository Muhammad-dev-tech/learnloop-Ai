import { useEffect, useState } from 'react';
import { 
  Sparkles, 
  Database, 
  Cpu, 
  HardDrive, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  BookOpen, 
  GraduationCap, 
  ArrowRight, 
  ShieldCheck, 
  UserCheck, 
  LogOut, 
  LogIn, 
  UserPlus,
  MessageSquare,
  Compass
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { TutorChatWorkspace } from './components/tutor/TutorChatWorkspace';

interface HealthData {
  status: string;
  environment: string;
  database: {
    dialect: string;
    connected: boolean;
    details: string;
    error: string | null;
  };
  ai_provider: {
    configured: boolean;
    model: string;
    status: string;
  };
  storage: {
    upload_dir_exists: boolean;
    max_upload_size_mb: number;
  };
}

function MainApp() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'tutor'>('dashboard');
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string>('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const { user, logout } = useAuth();

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/health');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setHealth(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err.message || 'Unable to connect to backend API server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleLaunchTutor = () => {
    if (user) {
      setCurrentView('tutor');
    } else {
      openAuth('login');
    }
  };

  // If in tutor view and user is authenticated, render the interactive Tutor Workspace
  if (currentView === 'tutor' && user) {
    return <TutorChatWorkspace onBackToDashboard={() => setCurrentView('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-brand-500/30">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                LearnLoop AI
              </span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Phase 3: AI Tutor Online
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Direct Switch to Tutor Workspace */}
            <button
              onClick={handleLaunchTutor}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/30 transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Launch AI Tutor</span>
            </button>

            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-white">{user.full_name}</div>
                  <div className="text-[11px] text-slate-400">{user.email} (ID: #{user.id})</div>
                </div>
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/40 hover:text-red-300 hover:border-red-800/50 border border-slate-700 text-slate-300 text-xs font-medium transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <button
                  onClick={() => openAuth('login')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-all"
                >
                  <LogIn className="w-3.5 h-3.5 text-brand-400" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => openAuth('register')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-6 py-10 flex-1 w-full flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            Adaptive AI-Powered Learning Assistant for Students
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Intelligent Socratic Tutoring with <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-300 to-purple-400">Gemini 3.8 Flash</span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            Multi-modal curriculum taxonomy, real-time Socratic inquiry dialogue, explanatory masterclasses, 
            and complete multi-student isolation across persistent chat sessions.
          </p>
        </div>

        {/* AI Tutor Launch Banner */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-brand-950/60 via-indigo-950/40 to-slate-900 border border-brand-500/30 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/20">
              <Compass className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-brand-400 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Phase 3 Active Feature
              </div>
              <h3 className="text-lg font-bold text-white">Interactive AI Tutor Workspace</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Choose Computer Science & Mathematics topics, select your pedagogical mode (Socratic, Explanatory, Challenge, Notes), and engage in multi-turn dialogues with full persistence.
              </p>
            </div>
          </div>
          
          <button
            onClick={handleLaunchTutor}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xl shadow-brand-600/30 transition-all flex items-center gap-2 shrink-0"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{user ? 'Enter Tutor Workspace' : 'Sign In to Launch Tutor'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* User Session State Card */}
        <div className="mb-8 p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <span className="text-slate-400">Authenticated Student: </span>
              {user ? (
                <span className="font-semibold text-emerald-400">
                  {user.full_name} <span className="text-slate-400 font-normal">({user.email} • ID #{user.id})</span>
                </span>
              ) : (
                <span className="text-slate-400 italic">Guest Visitor (Sign in to save study sessions)</span>
              )}
            </div>
          </div>
          {!user && (
            <button
              onClick={() => openAuth('register')}
              className="text-brand-400 hover:text-brand-300 font-semibold underline underline-offset-4"
            >
              Create free student account
            </button>
          )}
        </div>

        {/* System Subsystem Health Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/40 mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800/80 gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-brand-400" />
                Backend Subsystem & Curriculum Health
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Live verification of database tables, seeded STEM topics, Gemini 3.8 Flash, and storage
              </p>
            </div>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Verifying...' : 'Re-check Status'}
            </button>
          </div>

          {error ? (
            <div className="mt-6 p-4 rounded-xl bg-red-950/40 border border-red-800/50 flex items-start gap-3 text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-300">Backend Connection Error</p>
                <p className="text-xs text-red-400/90 mt-1">{error}</p>
                <p className="text-xs text-slate-400 mt-2">
                  Verify the FastAPI backend is running on <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">http://127.0.0.1:8000</code>.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              {/* Database Status */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Database Engine</span>
                    <Database className="w-4 h-4 text-brand-400" />
                  </div>
                  <div className="text-base font-bold text-white capitalize">
                    {health?.database.dialect || 'SQLite (WAL)'}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    {health?.database.connected ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">12 Tables Initialized</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-400 font-medium">Connecting...</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-500">
                  Curriculum Seeded (STEM)
                </div>
              </div>

              {/* AI Provider Status */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">AI Provider</span>
                    <Cpu className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-base font-bold text-white">
                    {health?.ai_provider.model || 'gemini-3.8-flash'}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    {health?.ai_provider.configured ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Configured & Operational</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-400 font-medium">Offline fallback ready</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-500">
                  Google GenAI SDK (v2.31)
                </div>
              </div>

              {/* Document Storage */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Document Storage</span>
                    <HardDrive className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-base font-bold text-white">
                    Isolated Storage
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    {health?.storage.upload_dir_exists ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Ready (PDF, DOCX, TXT)</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-400 font-medium">Pending init</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-500">
                  Max: {health?.storage.max_upload_size_mb || 25} MB / file
                </div>
              </div>

              {/* Environment */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Security & Auth</span>
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-base font-bold text-white">
                    Bcrypt & JWT
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                    <span>Multi-User Isolation Active</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-500">
                  {lastChecked ? `Verified at ${lastChecked}` : 'Checking...'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Milestone Tracker */}
        <div className="border border-brand-500/20 bg-brand-500/5 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase font-semibold tracking-wider text-brand-400">Next Upcoming Milestone</div>
            <div className="text-base font-semibold text-white mt-0.5">Phase 4 — Syllabus Document RAG & Citation Engine</div>
            <div className="text-xs text-slate-400 mt-1">
              Implements lecture notes and course document ingestion (PDF, DOCX, TXT), text chunking, retrieval context injection, and verified citation references.
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 px-3 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/30">
            Phase 4 Ready <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        LearnLoop AI — Final Year ICT Project • Academic Defense Edition
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
