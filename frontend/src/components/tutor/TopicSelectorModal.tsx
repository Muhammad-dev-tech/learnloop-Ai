import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  BookOpen, 
  Sparkles, 
  Check, 
  HelpCircle, 
  Brain, 
  Compass, 
  FileText,
  FileCheck
} from 'lucide-react';
import { Subject, Topic } from '../../types/academic';
import { Document } from '../../types/document';
import { LearningMode, DifficultyLevel } from '../../types/session';
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
  isLoading?: boolean;
}

const MODES: { id: LearningMode; title: string; desc: string; icon: any; color: string }[] = [
  {
    id: 'tutor',
    title: 'Socratic Tutor',
    desc: 'Guides through step-by-step questions without revealing answers immediately.',
    icon: Compass,
    color: 'text-brand-500 bg-brand-500/10 border-brand-500/20'
  },
  {
    id: 'teach_me',
    title: 'Explanatory Masterclass',
    desc: 'Deep analogies, structured conceptual breakdowns, and code demonstrations.',
    icon: Brain,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20'
  },
  {
    id: 'challenge',
    title: 'Diagnostic Challenge',
    desc: 'Hands-on scenarios and micro-puzzles to test and evaluate your problem solving.',
    icon: HelpCircle,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
  },
  {
    id: 'notes',
    title: 'High-Yield Notes',
    desc: 'Fast revision summaries, bullet points, core definitions, and exam cheat-sheets.',
    icon: FileText,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
  }
];

const DIFFICULTIES: { id: DifficultyLevel; label: string; desc: string }[] = [
  { id: 'beginner', label: 'Beginner', desc: 'Intuitive analogies & plain-English foundations' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Standard academic rigor & algorithmic logic' },
  { id: 'advanced', label: 'Advanced', desc: 'Deep architectural mechanics & edge-case proofs' }
];

export const TopicSelectorModal: React.FC<TopicSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectTarget,
  isLoading = false
}) => {
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [selectedMode, setSelectedMode] = useState<LearningMode>('tutor');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('beginner');
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

      // Pre-select first document if available, or first curriculum topic
      if (docs.length > 0) {
        setSelectedDoc(docs[0]);
        setSelectedTopic(null);
      } else if (subs.length > 0 && subs[0].topics.length > 0) {
        setSelectedTopic(subs[0].topics[0]);
        setSelectedDoc(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load study curriculum');
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

  const handleSelectDoc = (doc: Document) => {
    setSelectedDoc(doc);
    setSelectedTopic(null);
  };

  const handleSelectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    setSelectedDoc(null);
  };

  const handleStart = () => {
    if (selectedDoc) {
      onSelectTarget({ document: selectedDoc }, selectedMode, selectedDifficulty);
    } else if (selectedTopic) {
      onSelectTarget({ topic: selectedTopic }, selectedMode, selectedDifficulty);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-md shadow-brand-500/20 text-white shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Select Course or Syllabus & AI Mode
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose from your uploaded syllabi or academic subjects to calibrate your Socratic tutor.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Two-column layout */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
          
          {/* Left Column: Uploaded Docs & Curriculum Courses (7 cols) */}
          <div className="p-4 sm:p-6 md:col-span-7 flex flex-col h-full overflow-y-auto space-y-5">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search uploaded notes or curriculum topics..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
              />
            </div>

            {fetching ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading your courses and documents...
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-300 text-xs">
                {error}
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* 1. MY UPLOADED SYLLABI & NOTES SECTION */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                        My Uploaded Syllabi & Notes ({documents.length})
                      </h3>
                    </div>
                    {documents.length > 0 && (
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        Verified RAG Sources
                      </span>
                    )}
                  </div>

                  {documents.length === 0 ? (
                    <div className="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/20">
                      <span>No documents uploaded yet. You can study from the curriculum below or upload notes in the Course Materials tab.</span>
                    </div>
                  ) : filteredDocs.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 italic">
                      No uploaded documents match "{searchQuery}"
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredDocs.map(doc => {
                        const isSelected = selectedDoc?.id === doc.id;
                        return (
                          <div
                            key={doc.id}
                            onClick={() => handleSelectDoc(doc)}
                            className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-brand-50 dark:bg-brand-600/15 border-brand-500 shadow-sm'
                                : 'bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 hover:border-brand-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="truncate">
                                  <h4 className={`text-xs sm:text-sm font-semibold truncate ${isSelected ? 'text-brand-600 dark:text-brand-300' : 'text-slate-900 dark:text-slate-200'}`}>
                                    {doc.filename}
                                  </h4>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    <span className="uppercase">{doc.file_type}</span>
                                    <span>•</span>
                                    <span>{doc.chunk_count} verified sections</span>
                                  </div>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center shrink-0 text-white">
                                  <Check className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. ACADEMIC CURRICULUM COURSES SECTION */}
                <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Academic Curriculum Subjects
                    </h3>
                  </div>

                  {filteredSubjects.map(subject => (
                    <div key={subject.id} className="space-y-2">
                      <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {subject.name}
                      </h4>
                      <div className="space-y-1.5">
                        {subject.topics.map(topic => {
                          const isSelected = selectedTopic?.id === topic.id;
                          return (
                            <div
                              key={topic.id}
                              onClick={() => handleSelectTopic(topic)}
                              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-brand-50 dark:bg-brand-600/15 border-brand-500 shadow-sm'
                                  : 'bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h5 className={`text-xs sm:text-sm font-semibold ${isSelected ? 'text-brand-600 dark:text-brand-300' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {topic.name}
                                  </h5>
                                  {topic.description && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                      {topic.description}
                                    </p>
                                  )}
                                </div>
                                {isSelected && (
                                  <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center shrink-0 text-white">
                                    <Check className="w-3 h-3" />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>

          {/* Right Column: Pedagogical Mode & Depth (5 cols) */}
          <div className="p-4 sm:p-6 md:col-span-5 flex flex-col justify-between bg-slate-50/50 dark:bg-slate-950/20 space-y-6 overflow-y-auto">
            <div className="space-y-6">
              
              {/* Selected Target Summary Pill */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Selected Course Focus
                </span>
                <span className="text-xs sm:text-sm font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1.5 truncate">
                  {selectedDoc ? (
                    <>
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{selectedDoc.filename}</span>
                    </>
                  ) : selectedTopic ? (
                    <>
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{selectedTopic.name}</span>
                    </>
                  ) : (
                    'None selected'
                  )}
                </span>
              </div>

              {/* Learning Mode */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-2">
                  1. Pedagogical Mode
                </label>
                <div className="space-y-2">
                  {MODES.map(mode => {
                    const isSelected = selectedMode === mode.id;
                    const Icon = mode.icon;
                    return (
                      <div
                        key={mode.id}
                        onClick={() => setSelectedMode(mode.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-white dark:bg-slate-800 border-brand-500 shadow-sm'
                            : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${mode.color} shrink-0`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                              <span>{mode.title}</span>
                              {isSelected && <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold">Active</span>}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{mode.desc}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty Level */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-2">
                  2. Academic Depth & Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTIES.map(diff => {
                    const isSelected = selectedDifficulty === diff.id;
                    return (
                      <button
                        key={diff.id}
                        type="button"
                        onClick={() => setSelectedDifficulty(diff.id)}
                        className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                          isSelected
                            ? 'bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-600/25'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {diff.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 italic">
                  {DIFFICULTIES.find(d => d.id === selectedDifficulty)?.desc}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={(!selectedDoc && !selectedTopic) || isLoading}
                onClick={handleStart}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Initializing Session...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Launch AI Tutor</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
