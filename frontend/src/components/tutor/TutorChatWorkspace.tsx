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
  Zap
} from 'lucide-react';
import { LearningSession, SessionDetail, Message, LearningMode, DifficultyLevel } from '../../types/session';
import { Topic } from '../../types/academic';
import { Document } from '../../types/document';
import { 
  createSession, 
  fetchUserSessions, 
  fetchSessionDetail, 
  sendMessageToTutor 
} from '../../api/sessions';
import { useAuth } from '../../context/AuthContext';
import { TopicSelectorModal } from './TopicSelectorModal';
import { DocumentLibraryModal } from '../documents/DocumentLibraryModal';

interface TutorChatWorkspaceProps {
  onBackToDashboard?: () => void;
}

const MODE_CONFIG: Record<LearningMode, { label: string; icon: any; color: string }> = {
  tutor: { label: 'Socratic Tutor', icon: Compass, color: 'text-brand-400 bg-brand-500/10 border-brand-500/30' },
  teach_me: { label: 'Explanatory Masterclass', icon: Brain, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
  challenge: { label: 'Diagnostic Challenge', icon: HelpCircle, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  notes: { label: 'High-Yield Notes', icon: FileText, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
};

export const TutorChatWorkspace: React.FC<TutorChatWorkspaceProps> = ({ onBackToDashboard }) => {
  const { user, token } = useAuth();
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [activeSession, setActiveSession] = useState<SessionDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [attachedDoc, setAttachedDoc] = useState<Document | null>(null);
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

  // Load user's learning sessions on mount
  useEffect(() => {
    loadSessions();
  }, [token]);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await fetchUserSessions(token);
      setSessions(data);
      if (data.length > 0 && !activeSession) {
        // Open the most recent session
        loadSessionDetail(data[0].id);
      } else if (data.length === 0) {
        // Prompt topic selector if student has no sessions
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
        setCurrentMode(detail.learning_mode);
      }
      // Extract latest suggested followups if available
      const lastAssistantMsg = [...detail.messages].reverse().find(m => m.role === 'assistant');
      if (lastAssistantMsg?.source_references?.suggested_followups) {
        setSuggestedFollowups(lastAssistantMsg.source_references.suggested_followups);
      } else {
        setSuggestedFollowups([]);
      }
    } catch (err) {
      console.error('Failed to load session detail:', err);
    }
  };

  const handleCreateSession = async (topic: Topic, mode: LearningMode, difficulty: DifficultyLevel) => {
    setCreatingSession(true);
    try {
      const newSession = await createSession(
        {
          topic_id: topic.id,
          learning_mode: mode,
          current_difficulty: difficulty,
        },
        token
      );
      setSelectorOpen(false);
      setActiveSession(newSession);
      setMessages(newSession.messages);
      setCurrentMode(mode);
      setSessions(prev => [newSession, ...prev]);
      
      const lastMsg = newSession.messages[newSession.messages.length - 1];
      if (lastMsg?.source_references?.suggested_followups) {
        setSuggestedFollowups(lastMsg.source_references.suggested_followups);
      }
    } catch (err) {
      console.error('Failed to create new session:', err);
    } finally {
      setCreatingSession(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || !activeSession || isSending) return;

    // Optimistic user message addition
    const optimisticUserMsg: Message = {
      id: Date.now(),
      conversation_id: activeSession.conversation_id || 0,
      role: 'user',
      content: text.trim(),
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticUserMsg]);
    setInputText('');
    setIsSending(true);

    try {
      const response = await sendMessageToTutor(
        activeSession.id,
        text.trim(),
        currentMode,
        token
      );

      setMessages(prev => [
        ...prev.filter(m => m.id !== optimisticUserMsg.id),
        response.user_message,
        response.assistant_message
      ]);

      if (response.suggested_followups) {
        setSuggestedFollowups(response.suggested_followups);
      }
    } catch (err) {
      console.error('Error sending message to tutor:', err);
      // Revert optimistic user message and show error note
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          conversation_id: activeSession.conversation_id || 0,
          role: 'system',
          content: '⚠️ Failed to deliver message to AI tutor. Please verify network and backend connection.',
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
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-brand-500/40 text-xs text-slate-300 transition-all text-left"
    >
      <Sparkles className="w-3 h-3 text-brand-400 shrink-0" />
      <span>{text}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sessions Sidebar (Drawer) */}
      <aside className="w-80 border-r border-slate-800/80 bg-slate-900/50 flex flex-col shrink-0 hidden md:flex">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Back to Overview"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="font-bold text-sm text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-400" />
              <span>Study Sessions</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDocsModalOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
              title="Manage Syllabus Documents"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Docs</span>
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
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 px-4">
              No sessions yet. Click <strong>+ New</strong> to launch your first topic!
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
                      ? 'bg-brand-600/15 border-brand-500 text-white shadow-sm shadow-brand-500/10'
                      : 'bg-slate-950/30 border-slate-800/60 hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-semibold line-clamp-1">{s.topic_name}</h4>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-slate-400 shrink-0">
                      {s.current_difficulty}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(s.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="capitalize text-brand-400 font-medium">
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
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-300 font-bold text-xs">
              {user.full_name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-semibold text-white truncate">{user.full_name}</div>
              <div className="text-[10px] text-slate-400 truncate">Student ID: #{user.id}</div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Chat Workspace */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        {/* Workspace Top Header */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/30 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-tight">
                  {activeSession ? activeSession.topic_name : 'AI Tutor Workspace'}
                </h1>
                {activeSession && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 uppercase tracking-wider">
                    {activeSession.current_difficulty}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {activeSession?.subject_name ? `${activeSession.subject_name} • LearnLoop Pedagogical Core` : 'Adaptive Computer Science & STEM Tutor'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Chips */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            {(Object.keys(MODE_CONFIG) as LearningMode[]).map(modeKey => {
              const config = MODE_CONFIG[modeKey];
              const isActive = currentMode === modeKey;
              const Icon = config.icon;
              return (
                <button
                  key={modeKey}
                  type="button"
                  onClick={() => handleModeSwitch(modeKey)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{config.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDocsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
              title="Course Syllabus Documents (RAG Engine)"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Syllabus RAG</span>
              {attachedDoc && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                  Grounded
                </span>
              )}
            </button>

            <button
              onClick={() => setSelectorOpen(true)}
              className="md:hidden p-2 rounded-lg bg-brand-600 text-white text-xs font-semibold"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4 text-brand-400 shadow-xl shadow-brand-500/10">
                <Brain className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Welcome to your AI Tutor Session</h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Choose a topic from the curriculum to begin personalized Socratic tutoring, code walkthroughs, or diagnostic problem solving.
              </p>
              <button
                onClick={() => setSelectorOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Select Study Topic</span>
              </button>
            </div>
          ) : (
            messages.map(msg => {
              const isUser = msg.role === 'user';
              const isAssistant = msg.role === 'assistant';

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3.5 max-w-3xl ${
                    isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  {/* Avatar Icon */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${
                      isUser
                        ? 'bg-slate-800 border-slate-700 text-slate-200'
                        : 'bg-gradient-to-tr from-brand-600 to-indigo-500 border-brand-400/30 text-white shadow-brand-500/20'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl p-4 sm:p-5 text-sm leading-relaxed border ${
                      isUser
                        ? 'bg-brand-600/20 border-brand-500/40 text-slate-100'
                        : 'bg-slate-900/80 border-slate-800 text-slate-200 shadow-xl backdrop-blur-sm'
                    }`}
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:leading-relaxed prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}

                    <div className="mt-2.5 pt-2 border-t border-slate-800/40 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isAssistant && <span className="text-brand-400 font-medium">Gemini 3.8 Flash • Socratic Verified</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {isSending && (
            <div className="flex items-start gap-3.5 max-w-2xl mr-auto animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 border border-brand-400/30 flex items-center justify-center text-white shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-2 font-medium">LearnLoop AI is reasoning...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Follow-Up Prompts */}
        {suggestedFollowups.length > 0 && !isSending && (
          <div className="px-6 py-2.5 border-t border-slate-800/60 bg-slate-950/60 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Suggested:</span>
            </span>
            <div className="flex items-center gap-2">
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
        <div className="p-4 border-t border-slate-800 bg-slate-900/40 backdrop-blur-md shrink-0">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="max-w-4xl mx-auto relative flex items-end gap-2 bg-slate-950/80 border border-slate-800 rounded-2xl p-2 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all shadow-lg"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending || !activeSession}
              placeholder={
                activeSession
                  ? `Ask your AI tutor a question about ${activeSession.topic_name}... (Shift+Enter for newline)`
                  : 'Select a topic to start asking questions...'
              }
              className="flex-1 bg-transparent border-0 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none resize-none max-h-32 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending || !activeSession}
              className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-40 disabled:hover:bg-brand-600 shadow-md shadow-brand-600/20 transition-all shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="max-w-4xl mx-auto flex items-center justify-between mt-2 text-[11px] text-slate-500 px-2">
            <span>Mode: <strong className="text-slate-300 capitalize">{currentMode}</strong></span>
            <span>Press <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Enter</kbd> to submit</span>
          </div>
        </div>
      </main>

      {/* Topic Selector Modal */}
      <TopicSelectorModal
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelectTopic={handleCreateSession}
        isLoading={creatingSession}
      />

      {/* Document & Syllabus Library Modal */}
      <DocumentLibraryModal
        isOpen={docsModalOpen}
        onClose={() => setDocsModalOpen(false)}
        onSelectDocumentForChat={(doc) => {
          setAttachedDoc(doc);
          setInputText(`Based on my uploaded course syllabus "${doc.filename}", what are the core learning objectives and concepts covered?`);
        }}
      />
    </div>
  );
};
