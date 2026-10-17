import { useState } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  GraduationCap, 
  ArrowRight, 
  UserCheck, 
  LogOut, 
  LogIn, 
  UserPlus,
  MessageSquare,
  Compass,
  FileText,
  Award,
  TrendingUp,
  Sun,
  Moon,
  Menu,
  X,
  Brain
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthModal } from './components/auth/AuthModal';
import { TutorChatWorkspace } from './components/tutor/TutorChatWorkspace';
import { DocumentLibraryModal } from './components/documents/DocumentLibraryModal';
import { QuizModal } from './components/assessment/QuizModal';
import { StudentMasteryDashboard } from './components/analytics/StudentMasteryDashboard';

function MainApp() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'tutor'>('dashboard');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [masteryModalOpen, setMasteryModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
    setMobileMenuOpen(false);
  };

  const handleLaunchTutor = () => {
    if (user) {
      setCurrentView('tutor');
    } else {
      openAuth('login');
    }
    setMobileMenuOpen(false);
  };

  // If in tutor view and user is authenticated, render the interactive Tutor Workspace
  if (currentView === 'tutor' && user) {
    return <TutorChatWorkspace onBackToDashboard={() => setCurrentView('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between selection:bg-brand-500/20 selection:text-brand-700 dark:selection:bg-brand-500/30 dark:selection:text-brand-300 transition-colors duration-150">
      
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Brand Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                LearnLoop AI
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium">
                Adaptive Student Assistant
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links & Actions */}
          <div className="hidden md:flex items-center gap-2">
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-brand-600" />
              )}
            </button>

            {/* Knowledge Tracing & Analytics */}
            <button
              onClick={() => {
                if (user) {
                  setMasteryModalOpen(true);
                } else {
                  openAuth('login');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-all"
            >
              <TrendingUp className="w-3.5 h-3.5 text-brand-500" />
              <span>Mastery Analytics</span>
            </button>

            {/* Formative Quizzes Button */}
            <button
              onClick={() => {
                if (user) {
                  setQuizModalOpen(true);
                } else {
                  openAuth('login');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-all"
            >
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Diagnostic Quizzes</span>
            </button>

            {/* Syllabus Docs Button */}
            <button
              onClick={() => {
                if (user) {
                  setDocsModalOpen(true);
                } else {
                  openAuth('login');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-brand-500" />
              <span>Course Materials</span>
            </button>

            {/* Direct Launch AI Tutor Button */}
            <button
              onClick={handleLaunchTutor}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/25 transition-all ml-1"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Launch AI Tutor</span>
            </button>

            {/* User Profile or Sign In */}
            {user ? (
              <div className="flex items-center gap-2.5 pl-2.5 border-l border-slate-200 dark:border-slate-800 ml-1">
                <div className="text-right hidden lg:block">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">{user.full_name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{user.email}</div>
                </div>
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-300 text-slate-600 dark:text-slate-400 text-xs font-medium transition-all"
                  title="Sign out of student session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 ml-1">
                <button
                  onClick={() => openAuth('login')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-all"
                >
                  <LogIn className="w-3.5 h-3.5 text-brand-500" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => openAuth('register')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Right Controls: Theme Toggle + Hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-brand-600" />
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer for Small Screen Devices */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-3 shadow-xl">
            <button
              onClick={handleLaunchTutor}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-semibold shadow-md shadow-brand-600/25"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Launch AI Tutor</span>
            </button>
            
            <button
              onClick={() => {
                if (user) setMasteryModalOpen(true);
                else openAuth('login');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-left"
            >
              <TrendingUp className="w-4 h-4 text-brand-500" />
              <span>Mastery Analytics</span>
            </button>

            <button
              onClick={() => {
                if (user) setQuizModalOpen(true);
                else openAuth('login');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-left"
            >
              <Award className="w-4 h-4 text-amber-500" />
              <span>Diagnostic Quizzes</span>
            </button>

            <button
              onClick={() => {
                if (user) setDocsModalOpen(true);
                else openAuth('login');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-left"
            >
              <FileText className="w-4 h-4 text-brand-500" />
              <span>Course Materials & Syllabus</span>
            </button>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              {user ? (
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-semibold text-slate-900 dark:text-white block">{user.full_name}</span>
                    <span className="text-slate-500 text-[11px]">{user.email}</span>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300 text-xs font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => openAuth('login')}
                    className="flex-1 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium text-center"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuth('register')}
                    className="flex-1 py-2 rounded-lg bg-brand-600 text-white text-xs font-medium text-center"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Clean Landing Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full flex flex-col justify-center">
        
        {/* Simple & Elegant Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-300 text-xs font-medium mb-5">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span>Personalized AI Study Companion</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 leading-tight">
            Master Your Courses with <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-brand-500 to-purple-400">Socratic AI Guidance</span>
          </h1>

          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto mb-8">
            Engage in step-by-step reasoning dialogues, upload course notes for verified citations, test yourself with diagnostic quizzes, and track your topic mastery in real time.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleLaunchTutor}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white text-xs font-bold shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{user ? 'Enter Study Workspace' : 'Sign In to Start Learning'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                if (user) {
                  setQuizModalOpen(true);
                } else {
                  openAuth('login');
                }
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Award className="w-4 h-4 text-amber-500" />
              <span>Take Diagnostic Quiz</span>
            </button>
          </div>
        </div>

        {/* 3 Focused Feature Cards (Simple & Responsive) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          
          {/* Card 1: Socratic Tutoring */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-4">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Socratic AI Tutoring
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Guided inquiry that helps you discover solutions through targeted questions, hints, and concept breakdowns rather than copying raw answers.
            </p>
          </div>

          {/* Card 2: Syllabus Notes & RAG */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Course Material Knowledge
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Upload your syllabus or lecture notes (PDF, DOCX, TXT) to ask specific questions with grounded page citations directly from your curriculum.
            </p>
          </div>

          {/* Card 3: Adaptive Quizzes & Tracing */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-4">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Knowledge Tracing & Quizzes
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Practice formative multiple-choice questions, detect knowledge gaps and misconceptions early, and watch your mastery score grow over time.
            </p>
          </div>
        </div>

        {/* Minimalist Student Session Status Bar */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4 text-brand-500" />
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Current Student: </span>
              {user ? (
                <span className="font-semibold text-brand-600 dark:text-brand-400">
                  {user.full_name} <span className="text-slate-500 dark:text-slate-400 font-normal">({user.email})</span>
                </span>
              ) : (
                <span className="text-slate-500 dark:text-slate-400 italic">Guest Session (Sign in to save your study history)</span>
              )}
            </div>
          </div>
          {!user && (
            <button
              onClick={() => openAuth('register')}
              className="text-brand-600 dark:text-brand-400 hover:text-brand-500 font-semibold underline underline-offset-4"
            >
              Create free student account
            </button>
          )}
        </div>
      </main>

      {/* Clean & Simple Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/60 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        LearnLoop AI — Intelligent Adaptive Student Learning Platform
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />

      {/* Document & Syllabus Library Modal */}
      <DocumentLibraryModal
        isOpen={docsModalOpen}
        onClose={() => setDocsModalOpen(false)}
        onSelectDocumentForChat={() => {
          setCurrentView('tutor');
        }}
      />

      {/* Diagnostic Quiz Modal */}
      <QuizModal
        isOpen={quizModalOpen}
        onClose={() => setQuizModalOpen(false)}
      />

      {/* Student Knowledge Tracing & Mastery Dashboard */}
      <StudentMasteryDashboard
        isOpen={masteryModalOpen}
        onClose={() => setMasteryModalOpen(false)}
        onLaunchTutor={() => {
          setMasteryModalOpen(false);
          setCurrentView('tutor');
        }}
        onLaunchQuiz={() => {
          setMasteryModalOpen(false);
          setQuizModalOpen(true);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
