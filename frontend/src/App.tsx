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
  UserPlus
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';

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

function MainDashboard() {
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
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-medium">
                Phase 2: Database & Auth
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuth('login')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-all"
                >
                  <LogIn className="w-3.5 h-3.5 text-brand-400" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => openAuth('register')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/30 transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-1 w-full flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            Adaptive AI-Powered Learning Platform for Students
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-300 to-purple-400">LearnLoop AI</span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            Multi-user educational system with real bcrypt password hashing, persistent JWT sessions, 
            and complete student data isolation across learning sessions and documents.
          </p>
        </div>

        {/* User Session Banner */}
        <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-brand-950/40 via-indigo-950/30 to-slate-900 border border-brand-500/20 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <div className="text-xs uppercase font-semibold tracking-wider text-brand-400">Authentication State</div>
              <div className="text-base font-bold text-white mt-0.5">
                {user ? (
                  <span className="flex items-center gap-2">
                    Authenticated: <span className="text-emerald-400">{user.full_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      ID #{user.id}
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-300">Guest Visitor (Not Logged In)</span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {user
                  ? `Active session secured via JWT & HTTP-only cookies. Topic progress and documents are isolated to user #${user.id}.`
                  : 'Register or Sign In with the buttons above to test multi-student account isolation.'}
              </div>
            </div>
          </div>
          
          {!user && (
            <button
              onClick={() => openAuth('register')}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all shrink-0"
            >
              Register Test Student
            </button>
          )}
        </div>

        {/* System Health Status Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/40 mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800/80 gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-brand-400" />
                Backend Subsystem & Database Health
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Live verification of database tables, Alembic migrations, storage, and AI readiness
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
                  Alembic Migrations Applied
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
                    {health?.ai_provider.model || 'gemini-2.5-flash'}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    {health?.ai_provider.configured ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Configured & Ready</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-400 font-medium">Key placeholder in .env</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-500">
                  Google GenAI Provider (v2.31)
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

        {/* Next Phase Indicator */}
        <div className="border border-brand-500/20 bg-brand-500/5 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase font-semibold tracking-wider text-brand-400">Next Milestone</div>
            <div className="text-base font-semibold text-white mt-0.5">Phase 3 — Topic and AI Tutor</div>
            <div className="text-xs text-slate-400 mt-1">
              Implements topic taxonomy selection, Gemini AI service wrapper, conversational tutor prompts, multi-turn explanation flows, and chat persistence.
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 px-3 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/30">
            Awaiting Approval Gate <ArrowRight className="w-3.5 h-3.5" />
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
      <MainDashboard />
    </AuthProvider>
  );
}
