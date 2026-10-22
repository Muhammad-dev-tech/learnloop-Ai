import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Sparkles, 
  Send, 
  BookOpen, 
  Compass, 
  Brain, 
  HelpCircle, 
  FileText, 
  PlusCircle, 
  User, 
  ArrowLeft,
  Clock,
  Zap,
  Award,
  TrendingUp,
  Sun,
  Moon,
  X,
  FileCheck
} from 'lucide-react';
import { LearningSession, SessionDetail, Message, LearningMode, DifficultyLevel } from '../../types/session';
import { Document } from '../../types/document';
import { 
  createSession, 
  fetchUserSessions, 
  fetchSessionDetail, 
  sendMessageToTutor 
} from '../../api/sessions';
import { fetchSubjects } from '../../api/academic';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { TopicSelectorModal, StudyTarget } from './TopicSelectorModal';
import { DocumentLibraryModal } from '../documents/DocumentLibraryModal';
import { QuizModal } from '../assessment/QuizModal';
import { StudentMasteryDashboard } from '../analytics/StudentMasteryDashboard';

interface TutorChatWorkspaceProps {
  onBackToDashboard?: () => void;
  initialDocument?: Document | null;
}

const MODE_CONFIG: Record<LearningMode, { label: string; icon: any; color: string }> = {
  tutor: { label: 'Socratic Tutor', icon: Compass, color: 'text-brand-400 bg-brand-500/10 border-brand-500/30' },
  teach_me: { label: 'Explanatory Masterclass', icon: Brain, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
  challenge: { label: 'Diagnostic Challenge', icon: HelpCircle, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  notes: { label: 'High-Yield Notes', icon: FileText, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
};

export const TutorChatWorkspace: React.FC<TutorChatWorkspaceProps> = ({ 
  onBackToDashboard,
  initialDocument
}) => {
  const { user, token } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [activeSession, setActiveSession] = useState<SessionDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  // Modals & Navigation Drawers
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [masteryModalOpen, setMasteryModalOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  const [attachedDoc, setAttachedDoc] = useState<Document | null>(initialDocument || null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [suggestedFollowups, setSuggestedFollowups] = useState<string[]>([]);
  const [currentMode, setCurrentMode] = useState<LearningMode>('tutor');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Handle initial document or load user's learning sessions on mount
  useEffect(() => {
    loadSessions();
  }, [token]);

  useEffect(() => {
    if (initialDocument) {
      handleCreateSession({ document: initialDocument }, 'tutor', 'beginner');
    }
  }, [initialDocument]);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await fetchUserSessions(token);
      setSessions(data);
      if (initialDocument) {
        // Will be created or loaded by initialDocument effect
        return;
      }
      if (data.length > 0 && !activeSession) {
        loadSessionDetail(data[0].id);
      } else if (data.length === 0) {
        setSelectorOpen(true);
      }
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSessionDetail = async (sessionId: number) => {
    try {
      const detail = await fetchSessionDetail(sessionId, token);
      setActiveSession(detail);
      setMessages(detail.messages);
      if (detail.learning_mode) {
        setCurrentMode(detail.learning_mode as LearningMode);
      }
      setMobileDrawerOpen(false);

      // Extract last message followups
      const lastMsg = detail.messages[detail.messages.length - 1];
      if (lastMsg?.source_references && typeof lastMsg.source_references === 'object') {
        const refs = lastMsg.source_references as any;
        if (Array.isArray(refs.suggested_followups)) {
          setSuggestedFollowups(refs.suggested_followups);
        } else {
          setSuggestedFollowups([]);
        }
      } else {
        setSuggestedFollowups([]);
      }
    } catch (err) {
      console.error('Failed to load session detail:', err);
    }
  };

  const handleCreateSession = async (target: StudyTarget, mode: LearningMode, difficulty: DifficultyLevel) => {
    setCreatingSession(true);
    try {
      const newSession = await createSession(
        {
          topic_id: target.topic?.id,
          document_id: target.document?.id,
          learning_mode: mode,
          current_difficulty: difficulty,
        },
        token
      );
      setSelectorOpen(false);
      setDocsModalOpen(false);
      setMobileDrawerOpen(false);
      setActiveSession(newSession);
      setMessages(newSession.messages);
      setCurrentMode(mode);
      if (target.document) {
        setAttachedDoc(target.document);
      } else {
        setAttachedDoc(null);
      }
      setSessions(prev => [newSession, ...prev.filter(s => s.id !== newSession.id)]);
      
      const lastMsg = newSession.messages[newSession.messages.length - 1];
      if (lastMsg?.source_references && typeof lastMsg.source_references === 'object') {
        const refs = lastMsg.source_references as any;
        if (Array.isArray(refs.suggested_followups)) {
          setSuggestedFollowups(refs.suggested_followups);
        } else {
          setSuggestedFollowups([]);
        }
      } else {
        setSuggestedFollowups([]);
      }
    } catch (err) {
      console.error('Failed to create new session:', err);
    } finally {
      setCreatingSession(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isSending) return;

    let targetSession = activeSession;
    setIsSending(true);

    // If no active session yet, auto-create one so user is never blocked
    if (!targetSession) {
      try {
        if (attachedDoc) {
          targetSession = await createSession(
            { document_id: attachedDoc.id, learning_mode: currentMode, current_difficulty: 'beginner' },
            token
          );
        } else {
          const subjects = await fetchSubjects().catch(() => []);
          const firstTopic = subjects[0]?.topics[0];
          targetSession = await createSession(
            { topic_id: firstTopic?.id, learning_mode: currentMode, current_difficulty: 'beginner' },
            token
          );
        }
        setActiveSession(targetSession);
        setSessions(prev => [targetSession!, ...prev.filter(s => s.id !== targetSession!.id)]);
      } catch (err) {
        console.error('Failed to auto-create session for message:', err);
        setIsSending(false);
        setSelectorOpen(true);
        return;
      }
    }

    // Optimistic user message addition
    const optimisticUserMsg: Message = {
      id: Date.now(),
      conversation_id: targetSession.conversation_id || 0,
      role: 'user',
      content: text.trim(),
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticUserMsg]);
    setInputText('');

    try {
      const response = await sendMessageToTutor(
        targetSession.id,
        text.trim(),
        currentMode,
        token,
        attachedDoc?.id
      );

      setMessages(prev => [
        ...prev.filter(m => m.id !== optimisticUserMsg.id),
        response.user_message,
        response.assistant_message
      ]);

      if (response.suggested_followups && response.suggested_followups.length > 0) {
        setSuggestedFollowups(response.suggested_followups);
      }
    } catch (err) {
      console.error('Error sending message to tutor:', err);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          conversation_id: targetSession.conversation_id || 0,
          role: 'system',
          content: '⚠️ Failed to deliver message to AI tutor. Please check network connection.',
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleModeSwitch = (mode: LearningMode) => {
    setCurrentMode(mode);
  };

  const QuickChip = ({ text, onClick }: { text: string; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 text-xs text-slate-700 dark:text-slate-300 transition-all text-left shadow-sm shrink-0 whitespace-nowrap max-w-[280px]"
    >
      <Sparkles className="w-3 h-3 text-brand-500 shrink-0" />
      <span className="truncate">{text}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden transition-colors duration-150">
      
      {/* Sessions Sidebar (Desktop) */}
      <aside className="w-80 border-r border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/50 flex-col shrink-0 hidden md:flex">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Back to Overview"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-500" />
              <span>Study Chats</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDocsModalOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors"
              title="Manage Syllabus Documents"
            >
              <FileText className="w-3.5 h-3.5 text-brand-500" />
              <span>Syllabus</span>
            </button>
            <button
              onClick={() => setSelectorOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loadingSessions ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading chats...
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 px-4">
              No study chats yet. Click <strong>+ New</strong> to start!
            </div>
          ) : (
            sessions.map(s => {
              const isSelected = activeSession?.id === s.id;
              const modeMeta = MODE_CONFIG[s.learning_mode || 'tutor'];
              return (
                <div
                  key={s.id}
                  onClick={() => loadSessionDetail(s.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-brand-50 dark:bg-brand-600/15 border-brand-500 text-brand-700 dark:text-brand-300 shadow-sm'
                      : 'bg-white dark:bg-slate-950/30 border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-semibold line-clamp-1 truncate">{s.topic_name}</h4>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-500 shrink-0">
                      {s.current_difficulty}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(s.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="capitalize text-brand-600 dark:text-brand-400 font-medium">
                      {modeMeta ? modeMeta.label.split(' ')[0] : 'Tutor'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Student Profile Footer */}
        {user && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/40 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-300 font-bold text-xs">
              {user.full_name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user.full_name}</div>
              <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Drawer (Slide-out past chats) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileDrawerOpen(false)} />
          <div className="relative w-4/5 max-w-xs bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl p-4 z-50 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-500" />
                <span>My Study Chats</span>
              </span>
              <button onClick={() => setMobileDrawerOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 flex gap-2">
              <button
                onClick={() => {
                  setMobileDrawerOpen(false);
                  setSelectorOpen(true);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-brand-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ New Chat</span>
              </button>
              <button
                onClick={() => {
                  setMobileDrawerOpen(false);
                  setDocsModalOpen(true);
                }}
                className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700"
              >
                <FileText className="w-4 h-4 text-brand-500" />
                <span>Notes</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-2">
              {sessions.map(s => {
                const isSelected = activeSession?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => loadSessionDetail(s.id)}
                    className={`p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-600/15 border-brand-500 text-brand-600 dark:text-brand-300 font-semibold'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="truncate font-semibold">{s.topic_name}</div>
                    <div className="text-[10px] text-slate-400 mt-1 capitalize">{s.learning_mode} • {s.current_difficulty}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Workspace */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        
        {/* Workspace Top Header (Clean Mobile-Safe Padding) */}
        <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/80 backdrop-blur-md px-3 sm:px-6 pt-2 pb-2 sm:py-3 shrink-0 relative z-20">
          <div className="flex items-center justify-between gap-2">
            
            {/* Left: Back + Title + Switch Topic */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
              {onBackToDashboard && (
                <button
                  onClick={onBackToDashboard}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                  title="Return to Dashboard"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
              
              {/* Mobile Drawer Button */}
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0"
                title="View Chats"
              >
                <BookOpen className="w-4 h-4" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate whitespace-nowrap">
                    {activeSession ? activeSession.topic_name : (attachedDoc ? attachedDoc.filename : 'AI Tutor Workspace')}
                  </h1>
                  <button
                    onClick={() => setSelectorOpen(true)}
                    className="px-2 py-0.5 rounded-md bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-300 border border-brand-500/20 text-[10px] font-semibold shrink-0"
                    title="Change course topic or select uploaded syllabus"
                  >
                    Switch
                  </button>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate whitespace-nowrap">
                  {attachedDoc 
                    ? `Syllabus Grounded • ${attachedDoc.chunk_count} Chunks` 
                    : (activeSession?.subject_name || 'Adaptive Socratic Assistant')}
                </p>
              </div>
            </div>

            {/* Desktop Mode Switcher Chips */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              {(Object.keys(MODE_CONFIG) as LearningMode[]).map(modeKey => {
                const config = MODE_CONFIG[modeKey];
                const isActive = currentMode === modeKey;
                const Icon = config.icon;
                return (
                  <button
                    key={modeKey}
                    type="button"
                    onClick={() => handleModeSwitch(modeKey)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-sm font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{config.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Header Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-brand-600" />
                )}
              </button>

              {/* Quiz Shortcut (desktop only) */}
              <button
                onClick={() => setQuizModalOpen(true)}
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-600 dark:text-amber-300 border border-slate-200 dark:border-slate-700 text-xs font-medium"
              >
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>Quiz</span>
              </button>

              {/* Analytics Shortcut (desktop only) */}
              <button
                onClick={() => setMasteryModalOpen(true)}
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-brand-600 dark:text-brand-300 border border-slate-200 dark:border-slate-700 text-xs font-medium"
              >
                <TrendingUp className="w-3.5 h-3.5 text-brand-500" />
                <span>Progress</span>
              </button>

              {/* Prominent + New Button */}
              <button
                onClick={() => setSelectorOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-all shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ New</span>
              </button>
            </div>

          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3.5 sm:space-y-5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-8 sm:py-12 px-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-3 sm:mb-4 text-brand-500 shadow-xl shadow-brand-500/10">
                <Brain className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5 sm:mb-2">
                Welcome to your Socratic Study Session
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 sm:mb-6 leading-relaxed">
                Choose an academic course or select your uploaded syllabus document to begin personalized learning dialogues.
              </p>
              <button
                onClick={() => setSelectorOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Select Study Topic or Syllabus</span>
              </button>
            </div>
          ) : (
            messages.map(msg => {
              const isUser = msg.role === 'user';
              const isAssistant = msg.role === 'assistant';
              const refs = msg.source_references && typeof msg.source_references === 'object' ? (msg.source_references as any) : null;
              const citations = refs?.citations;

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 sm:gap-3 max-w-3xl ${
                    isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  {/* Avatar Icon */}
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${
                      isUser
                        ? 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                        : 'bg-gradient-to-tr from-brand-600 to-brand-400 border-brand-400/30 text-white shadow-brand-500/20'
                    }`}
                  >
                    {isUser ? <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl p-3.5 sm:p-4 text-[13px] sm:text-sm leading-relaxed border ${
                      isUser
                        ? 'bg-brand-600 text-white border-brand-500 shadow-sm shadow-brand-500/10'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-sm backdrop-blur-sm'
                    }`}
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <div className="prose dark:prose-invert prose-sm max-w-none text-slate-800 dark:text-slate-100 prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:my-1.5 sm:prose-p:my-2 prose-p:leading-relaxed">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}

                    {/* Grounded Document Citations (if present) */}
                    {citations && Array.isArray(citations) && citations.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1">
                          <FileCheck className="w-3 h-3 text-emerald-500" />
                          <span>Verified Syllabus Excerpts ({citations.length})</span>
                        </span>
                        <div className="space-y-1">
                          {citations.slice(0, 3).map((c: any, i: number) => (
                            <div key={i} className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/70 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                              <span className="font-bold text-brand-600 dark:text-brand-300">[{c.page_or_section}]: </span>
                              <span>"{c.snippet || (c.content ? c.content.slice(0, 130) : '')}..."</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-2 pt-1 border-t border-slate-200 dark:border-slate-800/40 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                      <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isAssistant && <span className="text-brand-600 dark:text-brand-400 font-medium">LearnLoop AI • Socratic Verified</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {isSending && (
            <div className="flex items-start gap-2 sm:gap-3 max-w-2xl mr-auto animate-pulse">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 border border-brand-400/30 flex items-center justify-center text-white shrink-0">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-400 flex items-center gap-2 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1.5 font-medium">LearnLoop AI is reasoning...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Follow-Up Prompts (Horizontal Scroll, never vertical boxes) */}
        {suggestedFollowups.length > 0 && !isSending && (
          <div className="px-3 sm:px-6 py-2 border-t border-slate-200 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/60 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              <span className="hidden sm:inline">Suggested:</span>
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {suggestedFollowups.map((suggestion, idx) => (
                <QuickChip
                  key={idx}
                  text={suggestion}
                  onClick={() => handleSendMessage(suggestion)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-2 sm:p-3.5 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 backdrop-blur-md shrink-0">
          
          {attachedDoc && (
            <div className="max-w-4xl mx-auto mb-1.5 px-2 flex items-center justify-between text-[11px] text-brand-600 dark:text-brand-400">
              <span className="flex items-center gap-1 truncate font-medium">
                <FileCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">Grounded in: {attachedDoc.filename}</span>
              </span>
              <button
                type="button"
                onClick={() => setAttachedDoc(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2"
              >
                Clear
              </button>
            </div>
          )}

          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            onClick={() => inputRef.current?.focus()}
            className="max-w-4xl mx-auto relative flex items-center gap-1.5 sm:gap-2 bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 rounded-2xl p-1.5 sm:p-2 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all shadow-sm cursor-text"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              placeholder="Ask a question..."
              className="flex-1 bg-transparent border-0 px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none max-h-32 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="p-2 sm:p-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-40 disabled:hover:bg-brand-600 shadow-sm transition-all shrink-0 cursor-pointer"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="hidden sm:flex max-w-4xl mx-auto items-center justify-between mt-2 text-[11px] text-slate-400 px-2">
            <span>Mode: <strong className="text-slate-700 dark:text-slate-300 capitalize">{currentMode}</strong></span>
            <span>Press <kbd className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Enter</kbd> to submit</span>
          </div>
        </div>

      </main>

      {/* Topic Selector Modal */}
      <TopicSelectorModal
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelectTarget={handleCreateSession}
        isLoading={creatingSession}
      />

      {/* Document & Syllabus Library Modal */}
      <DocumentLibraryModal
        isOpen={docsModalOpen}
        onClose={() => setDocsModalOpen(false)}
        onSelectDocumentForChat={(doc) => {
          handleCreateSession({ document: doc }, 'tutor', 'beginner');
        }}
      />

      {/* Diagnostic Practice Quiz Modal */}
      <QuizModal
        isOpen={quizModalOpen}
        onClose={() => setQuizModalOpen(false)}
        defaultTopicId={activeSession?.topic_id}
      />

      {/* Student Knowledge Tracing & Mastery Analytics */}
      <StudentMasteryDashboard
        isOpen={masteryModalOpen}
        onClose={() => setMasteryModalOpen(false)}
        onLaunchQuiz={(_topicId) => {
          setMasteryModalOpen(false);
          setQuizModalOpen(true);
        }}
      />
    </div>
  );
};
