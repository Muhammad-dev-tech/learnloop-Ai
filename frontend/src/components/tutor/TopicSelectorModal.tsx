import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  BookOpen, 
  Sparkles, 
  FileText,
  FileCheck,
  PlusCircle,
  MessageSquare,
  ArrowRight,
  UploadCloud
} from 'lucide-react';
import { Subject, Topic } from '../../types/academic';
import { Document } from '../../types/document';
import { LearningSession, LearningMode, DifficultyLevel } from '../../types/session';
import { fetchSubjects } from '../../api/academic';
import { fetchDocuments } from '../../api/documents';
import { useAuth } from '../../context/AuthContext';

export interface StudyTarget {
  topic?: Topic;
  document?: Document;
}

interface TopicSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTarget: (target: StudyTarget, mode: LearningMode, difficulty: DifficultyLevel) => void;
  onSelectExistingSession?: (sessionId: number) => void;
  existingSessions?: LearningSession[];
  onOpenUploadModal?: () => void;
  isLoading?: boolean;
}

export const TopicSelectorModal: React.FC<TopicSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectTarget,
  onSelectExistingSession,
  existingSessions = [],
  onOpenUploadModal,
  isLoading = false
}) => {
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, token]);

  const loadData = async () => {
    setFetching(true);
    setError(null);
    try {
      const [subs, docs] = await Promise.all([
        fetchSubjects(),
        fetchDocuments(token).catch(() => [])
      ]);
      setSubjects(subs);
      setDocuments(docs);
    } catch (err: any) {
      setError(err.message || 'Failed to load curriculum or documents');
    } finally {
      setFetching(false);
    }
  };

  if (!isOpen) return null;

  const filteredDocs = documents.filter(d => 
    d.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSubjects = subjects.map(subject => ({
    ...subject,
    topics: subject.topics.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter(s => s.topics.length > 0);

  // Helper to find existing session for a topic or document
  const findSessionForTopic = (topicId: number) => {
    return existingSessions.find(s => s.topic_id === topicId);
  };

  const findSessionForDocument = (docFilename: string) => {
    return existingSessions.find(s => 
      s.session_type === 'document' && 
      (s.topic_name === docFilename || s.topic_name?.toLowerCase().includes(docFilename.toLowerCase()))
    );
  };

  const handleStartNewSession = (target: StudyTarget) => {
    onSelectTarget(target, 'tutor', 'beginner');
  };

  const handleContinueExisting = (sessionId: number) => {
    if (onSelectExistingSession) {
      onSelectExistingSession(sessionId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl h-[92vh] sm:h-auto sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/90 dark:bg-slate-950/70 backdrop-blur shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-md shadow-brand-500/20 text-white shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                Select Study Topic or Document
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Choose what to learn. Each topic maintains its own separate saved conversation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search uploaded notes or curriculum topics..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
            />
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-6">
          {fetching ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading your course topics and notes...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-300 text-xs">
              {error}
            </div>
          ) : (
            <>
              {/* SECTION 1: MY UPLOADED SYLLABI & NOTES */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                      My Uploaded Documents ({documents.length})
                    </h3>
                  </div>
                  {onOpenUploadModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenUploadModal();
                      }}
                      className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload More</span>
                    </button>
                  )}
                </div>

                {documents.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-950/20">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No documents uploaded yet</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Upload your lecture notes or syllabus to ask grounded questions with verified citations.
                    </p>
                    {onOpenUploadModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenUploadModal();
                        }}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload Syllabus / Notes</span>
                      </button>
                    )}
                  </div>
                ) : filteredDocs.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400 italic">
                    No uploaded documents match "{searchQuery}"
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredDocs.map(doc => {
                      const existingSession = findSessionForDocument(doc.filename);
                      return (
                        <div
                          key={doc.id}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-brand-400 dark:hover:border-brand-500/50 transition-all shadow-sm space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <div className="p-2 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate" title={doc.filename}>
                                  {doc.filename}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                                  <span className="uppercase font-semibold text-brand-600 dark:text-brand-400">{doc.file_type || 'PDF'}</span>
                                  <span>•</span>
                                  <span>{(doc.file_size / (1024 * 1024)).toFixed(1)} MB</span>
                                  <span>•</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">{doc.chunk_count} Grounded Chunks</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons for Document */}
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                            {existingSession ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => handleContinueExisting(existingSession.id)}
                                  className="flex-1 py-1.5 px-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Continue Saved Chat</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => handleStartNewSession({ document: doc })}
                                  className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all flex items-center gap-1"
                                  title="Start fresh conversation for this document"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                  <span>+ New Chat</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleStartNewSession({ document: doc })}
                                className="w-full py-1.5 px-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Start Study Session</span>
                                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 2: ACADEMIC CURRICULUM TOPICS */}
              <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Academic Curriculum Courses
                  </h3>
                </div>

                {filteredSubjects.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400 italic">
                    No curriculum topics match "{searchQuery}"
                  </div>
                ) : (
                  filteredSubjects.map(subject => (
                    <div key={subject.id} className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                        {subject.name}
                      </div>

                      <div className="space-y-2">
                        {subject.topics.map(topic => {
                          const existingSession = findSessionForTopic(topic.id);
                          return (
                            <div
                              key={topic.id}
                              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-brand-400 dark:hover:border-brand-500/50 transition-all shadow-sm space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                    {topic.name}
                                  </h4>
                                  {topic.description && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                      {topic.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons for Topic */}
                              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                                {existingSession ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isLoading}
                                      onClick={() => handleContinueExisting(existingSession.id)}
                                      className="flex-1 py-1.5 px-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                      <span>Continue Saved Chat</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isLoading}
                                      onClick={() => handleStartNewSession({ topic })}
                                      className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all flex items-center gap-1"
                                      title="Start fresh conversation for this topic"
                                    >
                                      <PlusCircle className="w-3.5 h-3.5" />
                                      <span>+ New Chat</span>
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isLoading}
                                    onClick={() => handleStartNewSession({ topic })}
                                    className="w-full py-1.5 px-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Start Study Session</span>
                                    <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span>{existingSessions.length} total active saved topics</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 font-medium transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
