import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RefreshCw, 
  Trophy, 
  AlertTriangle,
  Award,
  FileText,
  BookOpen
} from 'lucide-react';
import { Question, SubmitAnswerResponse, StudentAssessmentStats } from '../../types/assessment';
import { Subject } from '../../types/academic';
import { Document } from '../../types/document';
import { DifficultyLevel } from '../../types/session';
import { fetchSubjects } from '../../api/academic';
import { fetchDocuments } from '../../api/documents';
import { generateQuiz, submitQuizAnswer, fetchAssessmentStats } from '../../api/assessment';
import { useAuth } from '../../context/AuthContext';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTopicId?: number;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  isOpen,
  onClose,
  defaultTopicId
}) => {
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  
  // Selection mode: 'topic' or 'document'
  const [sourceType, setSourceType] = useState<'topic' | 'document'>('topic');
  const [selectedTopicId, setSelectedTopicId] = useState<number>(defaultTopicId || 0);
  const [selectedDocId, setSelectedDocId] = useState<number>(0);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('intermediate');
  const [questionCount, setQuestionCount] = useState<number>(5);

  // Quiz execution states
  const [stage, setStage] = useState<'setup' | 'quiz' | 'scorecard'>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [evalResult, setEvalResult] = useState<SubmitAnswerResponse | null>(null);
  const [scoreHistory, setScoreHistory] = useState<SubmitAnswerResponse[]>([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StudentAssessmentStats | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [subs, docs, st] = await Promise.all([
        fetchSubjects(),
        fetchDocuments(token).catch(() => []),
        fetchAssessmentStats(token).catch(() => null)
      ]);
      setSubjects(subs);
      setDocuments(docs);
      setStats(st);

      if (subs.length > 0 && subs[0].topics.length > 0 && !selectedTopicId) {
        setSelectedTopicId(defaultTopicId || subs[0].topics[0].id);
      }
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize curriculum');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    setLoading(true);
    setError(null);

    try {
      const qList = await generateQuiz(
        {
          topic_id: sourceType === 'topic' ? selectedTopicId : undefined,
          document_id: sourceType === 'document' ? selectedDocId : undefined,
          difficulty: selectedDifficulty,
          count: questionCount,
        },
        token
      );

      if (!qList || qList.length === 0) {
        throw new Error('No assessment questions generated. Please try again.');
      }

      setQuestions(qList);
      setCurrentIndex(0);
      setSelectedOption('');
      setEvalResult(null);
      setScoreHistory([]);
      setStage('quiz');
    } catch (err: any) {
      setError(err.message || 'Error generating quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCurrentAnswer = async () => {
    if (!selectedOption || submitting) return;
    const currentQ = questions[currentIndex];
    setSubmitting(true);
    setError(null);

    try {
      const result = await submitQuizAnswer(currentQ.id, selectedOption, undefined, token);
      setEvalResult(result);
      setScoreHistory(prev => [...prev, result]);
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption('');
      setEvalResult(null);
    } else {
      setStage('scorecard');
      // Refresh stats
      fetchAssessmentStats(token).then(st => setStats(st)).catch(() => {});
    }
  };

  const handleReset = () => {
    setStage('setup');
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedOption('');
    setEvalResult(null);
    setScoreHistory([]);
    handleStartQuiz();
  };

  if (!isOpen) return null;

  const currentQ = questions[currentIndex];
  const correctCount = scoreHistory.filter(s => s.is_correct).length;
  const percentage = scoreHistory.length > 0 ? Math.round((correctCount / scoreHistory.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20 text-white shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Dynamic Diagnostic Quizzes
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/20 uppercase tracking-wider">
                  Adaptive
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formative questions generated dynamically from your syllabus or curriculum topics.
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

        {/* Error Alert */}
        {error && (
          <div className="px-5 py-2.5 bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          
          {/* STAGE 1: SETUP */}
          {stage === 'setup' && (
            <div className="space-y-5 max-w-lg mx-auto">
              {/* Overall Stats Pill */}
              {stats && stats.total_attempts > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-around text-center text-xs">
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Attempts</div>
                    <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5">{stats.total_attempts}</div>
                  </div>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Accuracy</div>
                    <div className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.accuracy_rate}%</div>
                  </div>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Avg Score</div>
                    <div className="text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">{stats.average_score}</div>
                  </div>
                </div>
              )}

              {/* Source Type Selector Toggle */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                  Quiz Knowledge Source
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSourceType('topic')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      sourceType === 'topic'
                        ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Curriculum Topic</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType('document')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      sourceType === 'document'
                        ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Uploaded Syllabus ({documents.length})</span>
                  </button>
                </div>
              </div>

              {/* Target Selection Dropdown */}
              {sourceType === 'topic' ? (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                    Select Curriculum Topic
                  </label>
                  <select
                    value={selectedTopicId}
                    onChange={e => setSelectedTopicId(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  >
                    {subjects.map(s => (
                      <optgroup key={s.id} label={s.name}>
                        {s.topics.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                    Select Uploaded Course Document
                  </label>
                  {documents.length > 0 ? (
                    <select
                      value={selectedDocId}
                      onChange={e => setSelectedDocId(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    >
                      {documents.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.filename} ({d.chunk_count} sections)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center">
                      No documents uploaded yet. Upload a syllabus in "Course Materials" or select "Curriculum Topic".
                    </div>
                  )}
                </div>
              )}

              {/* Difficulty Level */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as DifficultyLevel[]).map(diff => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setSelectedDifficulty(diff)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border capitalize transition-all ${
                        selectedDifficulty === diff
                          ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count (3, 5, 8, 10) */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                  Question Count
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 8, 10].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuestionCount(cnt)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                        questionCount === cnt
                          ? 'bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-600/25'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {cnt} Qs
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <button
                type="button"
                disabled={loading || (sourceType === 'document' && !selectedDocId && documents.length === 0)}
                onClick={handleStartQuiz}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-brand-600 hover:from-amber-500 hover:to-brand-500 text-white text-xs font-bold shadow-xl shadow-brand-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating {questionCount} Dynamic Questions...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Launch Diagnostic Quiz ({questionCount} Questions)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* STAGE 2: ACTIVE QUIZ */}
          {stage === 'quiz' && currentQ && (
            <div className="space-y-5">
              {/* Progress & Step */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-700">
                    {currentQ.difficulty}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-brand-500 transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Text */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                  {currentQ.question_text}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {currentQ.options && currentQ.options.map((opt, idx) => {
                  const isChosen = selectedOption === opt;
                  let optStyle = "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200";

                  if (evalResult) {
                    if (opt === evalResult.correct_answer) {
                      optStyle = "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300";
                    } else if (isChosen && !evalResult.is_correct) {
                      optStyle = "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300";
                    }
                  } else if (isChosen) {
                    optStyle = "bg-brand-50 dark:bg-brand-900/30 border-brand-500 text-brand-700 dark:text-brand-300 shadow-sm";
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={evalResult !== null}
                      onClick={() => setSelectedOption(opt)}
                      className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-3 ${optStyle}`}
                    >
                      <span>{opt}</span>
                      {evalResult && opt === evalResult.correct_answer && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                      {evalResult && isChosen && !evalResult.is_correct && (
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Immediate Feedback Card */}
              {evalResult && (
                <div className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1.5 animate-in fade-in ${
                  evalResult.is_correct 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-200' 
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-200'
                }`}>
                  <div className="font-bold flex items-center gap-1.5">
                    {evalResult.is_correct ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Correct! Mastery score updated.</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-500" />
                        <span>Concept Check Needed</span>
                      </>
                    )}
                  </div>
                  <p>{evalResult.feedback}</p>
                </div>
              )}

              {/* Action: Submit or Next */}
              <div className="pt-2 flex justify-end">
                {!evalResult ? (
                  <button
                    type="button"
                    disabled={!selectedOption || submitting}
                    onClick={handleSubmitCurrentAnswer}
                    className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Evaluating...</span>
                      </>
                    ) : (
                      <span>Submit Answer</span>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-brand-600 hover:from-amber-500 hover:to-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-1.5"
                  >
                    <span>{currentIndex + 1 < questions.length ? 'Next Question' : 'View Quiz Summary'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STAGE 3: SCORECARD */}
          {stage === 'scorecard' && (
            <div className="space-y-6 max-w-lg mx-auto text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
                <Trophy className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Quiz Completed!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Your knowledge model has been updated with these results.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Score</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {correctCount} / {scoreHistory.length}
                  </div>
                </div>
                <div className="border-x border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Accuracy</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {percentage}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Performance</div>
                  <div className="text-xs font-bold text-brand-600 dark:text-brand-400 mt-2 uppercase">
                    {percentage >= 80 ? 'Mastered' : percentage >= 50 ? 'Proficient' : 'Review Needed'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/25 transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restart with Fresh Questions</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
