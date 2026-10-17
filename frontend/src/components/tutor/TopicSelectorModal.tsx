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
  FileText 
} from 'lucide-react';
import { Subject, Topic } from '../../types/academic';
import { LearningMode, DifficultyLevel } from '../../types/session';
import { fetchSubjects } from '../../api/academic';

interface TopicSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTopic: (topic: Topic, mode: LearningMode, difficulty: DifficultyLevel) => void;
  isLoading?: boolean;
}

const MODES: { id: LearningMode; title: string; desc: string; icon: any; color: string }[] = [
  {
    id: 'tutor',
    title: 'Socratic Tutor',
    desc: 'Guides through step-by-step questions without revealing answers immediately.',
    icon: Compass,
    color: 'text-brand-400 bg-brand-500/10 border-brand-500/30'
  },
  {
    id: 'teach_me',
    title: 'Explanatory Masterclass',
    desc: 'Deep analogies, structured conceptual breakdowns, and code demonstrations.',
    icon: Brain,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
  },
  {
    id: 'challenge',
    title: 'Diagnostic Challenge',
    desc: 'Hands-on scenarios and micro-puzzles to test and evaluate your problem solving.',
    icon: HelpCircle,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  },
  {
    id: 'notes',
    title: 'High-Yield Notes',
    desc: 'Fast revision summaries, bullet points, core definitions, and exam cheat-sheets.',
    icon: FileText,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
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
  onSelectTopic,
  isLoading = false
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedMode, setSelectedMode] = useState<LearningMode>('tutor');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('beginner');
  const [searchQuery, setSearchQuery] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSubjects();
    }
  }, [isOpen]);

  const loadSubjects = async () => {
    setFetching(true);
    setError(null);
    try {
      const data = await fetchSubjects();
      setSubjects(data);
      if (data.length > 0 && data[0].topics.length > 0 && !selectedTopic) {
        setSelectedTopic(data[0].topics[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load curriculum subjects');
    } finally {
      setFetching(false);
    }
  };

  if (!isOpen) return null;

  const filteredSubjects = subjects.map(subject => ({
    ...subject,
    topics: subject.topics.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter(s => s.topics.length > 0);

  const handleStart = () => {
    if (selectedTopic) {
      onSelectTopic(selectedTopic, selectedMode, selectedDifficulty);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl shadow-brand-950/40 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-md shadow-brand-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Select Study Topic & AI Mode</h2>
              <p className="text-xs text-slate-400">Choose from the academic curriculum and calibrate your personal AI tutor.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Two-column layout */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* Left Column: Topics & Search (7 cols) */}
          <div className="p-6 md:col-span-7 flex flex-col h-full overflow-y-auto">
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search curriculum topics (e.g., Algorithms, SQL, OS)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
              />
            </div>

            {fetching ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading academic curriculum...
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs">
                {error}
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No topics matched your search query.
              </div>
            ) : (
              <div className="space-y-6">
                {filteredSubjects.map(subject => (
                  <div key={subject.id}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <BookOpen className="w-4 h-4 text-brand-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        {subject.name}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {subject.topics.map(topic => {
                        const isSelected = selectedTopic?.id === topic.id;
                        return (
                          <div
                            key={topic.id}
                            onClick={() => setSelectedTopic(topic)}
                            className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-brand-600/15 border-brand-500 shadow-sm shadow-brand-500/20'
                                : 'bg-slate-950/40 border-slate-800/70 hover:border-slate-700 hover:bg-slate-800/40'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className={`text-sm font-semibold ${isSelected ? 'text-brand-300' : 'text-slate-200'}`}>
                                  {topic.name}
                                </h4>
                                {topic.description && (
                                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                    {topic.description}
                                  </p>
                                )}
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
                                  <Check className="w-3 h-3 text-white" />
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
            )}
          </div>

          {/* Right Column: Mode & Difficulty Configuration (5 cols) */}
          <div className="p-6 md:col-span-5 flex flex-col justify-between bg-slate-950/20 space-y-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Learning Mode */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
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
                            ? 'bg-slate-800/90 border-brand-500 shadow-sm'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${mode.color} shrink-0`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                              <span>{mode.title}</span>
                              {isSelected && <span className="text-[10px] text-brand-400 font-semibold">Active</span>}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{mode.desc}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty Level */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
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
                            ? 'bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-600/30'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {diff.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 italic">
                  {DIFFICULTIES.find(d => d.id === selectedDifficulty)?.desc}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedTopic || isLoading}
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
