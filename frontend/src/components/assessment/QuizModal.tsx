import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RefreshCw, 
  Trophy, 
  AlertTriangle,
  Award
} from 'lucide-react';
import { Question, SubmitAnswerResponse, StudentAssessmentStats } from '../../types/assessment';
import { Subject } from '../../types/academic';
import { DifficultyLevel } from '../../types/session';
import { fetchSubjects } from '../../api/academic';
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
  const [selectedTopicId, setSelectedTopicId] = useState<number>(defaultTopicId || 0);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('intermediate');
  const [questionCount, setQuestionCount] = useState<number>(3);

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
      const [subs, st] = await Promise.all([
        fetchSubjects(),
        fetchAssessmentStats(token).catch(() => null)
      ]);
      setSubjects(subs);
      setStats(st);

      if (subs.length > 0 && subs[0].topics.length > 0 && !selectedTopicId) {
        setSelectedTopicId(defaultTopicId || subs[0].topics[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize curriculum');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!selectedTopicId) return;
    setLoading(true);
    setError(null);

    try {
      const qList = await generateQuiz(
        {
          topic_id: selectedTopicId,
          difficulty: selectedDifficulty,
          count: questionCount,
        },
        token
      );

      if (qList.length === 0) {
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
  };

  if (!isOpen) return null;

  const currentQ = questions[currentIndex];
  const correctCount = scoreHistory.filter(s => s.is_correct).length;
  const percentage = scoreHistory.length > 0 ? Math.round((correctCount / scoreHistory.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl shadow-brand-950/40 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Adaptive Diagnostic Quizzing</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                  Phase 5 Formative
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated concept evaluation, dynamic difficulty, and real-time misconception feedback.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="px-6 py-2.5 bg-red-950/50 border-b border-red-800/40 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* STAGE 1: SETUP */}
          {stage === 'setup' && (
            <div className="space-y-6 max-w-lg mx-auto">
              {/* Overall Stats Pill */}
              {stats && stats.total_attempts > 0 && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-around text-center text-xs">
                  <div>
                    <div className="text-slate-400">Attempts</div>
                    <div className="text-base font-bold text-white mt-0.5">{stats.total_attempts}</div>
                  </div>
                  <div className="h-8 w-px bg-slate-800" />
                  <div>
                    <div className="text-slate-400">Accuracy</div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">{stats.accuracy_rate}%</div>
                  </div>
                  <div className="h-8 w-px bg-slate-800" />
                  <div>
                    <div className="text-slate-400">Avg Score</div>
                    <div className="text-base font-bold text-amber-400 mt-0.5">{stats.average_score}</div>
                  </div>
                </div>
              )}

              {/* Topic Select */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Select Curriculum Topic
                </label>
                <select
                  value={selectedTopicId}
                  onChange={e => setSelectedTopicId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
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

              {/* Difficulty Level */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
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
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Question Count
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 4, 5].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuestionCount(cnt)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        questionCount === cnt
                          ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {cnt} Questions
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={loading || !selectedTopicId}
                onClick={handleStartQuiz}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-xl shadow-amber-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating Questions with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Launch Diagnostic Quiz</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* STAGE 2: ACTIVE QUIZ */}
          {stage === 'quiz' && currentQ && (
            <div className="space-y-6">
              {/* Progress & Step */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold text-white">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                    {currentQ.difficulty}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Text */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-sm font-semibold text-slate-100 leading-relaxed">
                {currentQ.question_text}
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {currentQ.options.map((opt, idx) => {
                  const isSelected = selectedOption === opt;
                  let borderClass = 'border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-300';

                  if (evalResult) {
                    if (opt === evalResult.correct_answer) {
                      borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-300 shadow-sm shadow-emerald-500/20';
                    } else if (isSelected && !evalResult.is_correct) {
                      borderClass = 'border-red-500 bg-red-950/40 text-red-300';
                    } else {
                      borderClass = 'opacity-50 border-slate-800 bg-slate-950/20 text-slate-500';
                    }
                  } else if (isSelected) {
                    borderClass = 'border-amber-500 bg-amber-600/15 text-white shadow-sm shadow-amber-500/20';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={evalResult !== null}
                      onClick={() => setSelectedOption(opt)}
                      className={`w-full p-3.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between gap-3 ${borderClass}`}
                    >
                      <span>{opt}</span>
                      {evalResult && opt === evalResult.correct_answer && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      {evalResult && isSelected && !evalResult.is_correct && (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Real-time Feedback & Explanation */}
              {evalResult && (
                <div className={`p-4 rounded-xl border text-xs leading-relaxed animate-in fade-in duration-200 ${
                  evalResult.is_correct 
                    ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200' 
                    : 'bg-red-950/30 border-red-800/40 text-red-200'
                }`}>
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {evalResult.is_correct ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300">Correct!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-red-300">Incorrect</span>
                      </>
                    )}
                  </div>
                  <div className="mt-1 text-slate-300">
                    <ReactMarkdown>{evalResult.feedback}</ReactMarkdown>
                  </div>
                  {evalResult.misconception_tag && (
                    <div className="mt-2 text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Diagnostic: {evalResult.misconception_tag.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                {!evalResult ? (
                  <button
                    type="button"
                    disabled={!selectedOption || submitting}
                    onClick={handleSubmitCurrentAnswer}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-600/30 transition-all flex items-center gap-2 disabled:opacity-40"
                  >
                    {submitting ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Submit Answer</span>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/30 transition-all flex items-center gap-2"
                  >
                    <span>{currentIndex + 1 < questions.length ? 'Next Question' : 'View Scorecard'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STAGE 3: SCORECARD */}
          {stage === 'scorecard' && (
            <div className="py-6 text-center space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-500/10">
                <Trophy className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Quiz Completed!</h3>
                <p className="text-xs text-slate-400 mt-1">Formative Assessment Evaluation Results</p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                  {percentage}%
                </div>
                <div className="text-xs font-semibold text-slate-300 mt-1">
                  {correctCount} out of {scoreHistory.length} correct
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
                  {percentage >= 80 ? (
                    <span className="text-emerald-400 font-semibold">🎉 Exceptional Mastery! Ready to advance topic difficulty.</span>
                  ) : percentage >= 50 ? (
                    <span className="text-amber-400 font-semibold">👍 Good Foundation! Review weak concepts with the AI tutor.</span>
                  ) : (
                    <span className="text-red-400 font-semibold">⚠️ Remediation Recommended. Try Socratic Mode with your tutor.</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Take Another Quiz</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/30 transition-all"
                >
                  <span>Return to Learning</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
