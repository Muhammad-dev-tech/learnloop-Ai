import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  X, 
  TrendingUp, 
  Award, 
  Brain, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw, 
  Lightbulb
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchMasterySummary, dismissRecommendation } from '../../api/progress';
import { StudentMasterySummary, TopicMasteryProgress, RecommendationItem } from '../../types/progress';

interface StudentMasteryDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchTutor?: (topicId?: number, mode?: string) => void;
  onLaunchQuiz?: (topicId?: number) => void;
}

export const StudentMasteryDashboard: React.FC<StudentMasteryDashboardProps> = ({
  isOpen,
  onClose,
  onLaunchTutor,
  onLaunchQuiz,
}) => {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<StudentMasterySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<number | null>(null);

  const activeToken = token || localStorage.getItem('learnloop_token');

  useEffect(() => {
    if (isOpen) {
      if (activeToken) {
        loadSummary();
      } else {
        setSummary(null);
      }
    }
  }, [isOpen, activeToken]);

  const loadSummary = async () => {
    if (!activeToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMasterySummary(activeToken);
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve mastery data');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (recId: number) => {
    setDismissingId(recId);
    try {
      await dismissRecommendation(recId, activeToken);
      if (summary) {
        setSummary({
          ...summary,
          active_recommendations: summary.active_recommendations.filter(r => r.id !== recId)
        });
      }
    } catch (err) {
      console.error('Error dismissing recommendation:', err);
    } finally {
      setDismissingId(null);
    }
  };

  if (!isOpen) return null;

  const getMasteryColor = (score: number) => {
    if (score >= 80) return '#10b981'; // Emerald
    if (score >= 60) return '#a855f7'; // Brand Purple
    if (score >= 40) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const chartData = summary?.topics_progress.map(tp => ({
    name: tp.topic_name.length > 15 ? tp.topic_name.slice(0, 13) + '...' : tp.topic_name,
    fullName: tp.topic_name,
    mastery: Math.round(tp.mastery_score),
    accuracy: Math.round(tp.accuracy_percentage),
    color: getMasteryColor(tp.mastery_score),
    topic_id: tp.topic_id
  })) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Simple Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                My Learning Progress & Mastery
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track topic scores, quiz accuracy, and personalized study tips.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadSummary}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-50"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-center gap-3 text-red-700 dark:text-red-200 text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 3 Core Metric Cards (Student-relevant only) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            
            {/* Overall Mastery Score */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center justify-between">
                <span>Overall Mastery</span>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                {summary ? `${Math.round(summary.overall_mastery_index)}%` : '--'}
              </div>
              <div className="mt-1 text-xs text-brand-600 dark:text-brand-400 font-medium">
                Level: {summary?.mastery_tier || 'Novice'}
              </div>
            </div>

            {/* Quizzes Completed */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center justify-between">
                <span>Quizzes Completed</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                {summary?.total_quizzes_completed ?? 0}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {summary?.total_questions_answered ?? 0} total questions answered
              </div>
            </div>

            {/* Overall Accuracy */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center justify-between">
                <span>Quiz Accuracy</span>
                <Sparkles className="w-4 h-4 text-brand-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                {summary ? `${Math.round(summary.overall_accuracy_percentage)}%` : '--'}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Correct answer average
              </div>
            </div>
          </div>

          {/* Simple Visual Mastery Chart */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2 mb-4">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-500" />
                  Topic Mastery Levels
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> &gt;=80% Mastered
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" /> 60-79% Proficient
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> &lt;60% Practicing
                </span>
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
                    <XAxis 
                      dataKey="name" 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                      domain={[0, 100]} 
                      ticks={[0, 25, 50, 75, 100]}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl text-xs space-y-1">
                              <p className="font-bold text-slate-900 dark:text-white">{data.fullName}</p>
                              <p className="text-brand-600 dark:text-brand-300">Mastery: <span className="font-bold">{data.mastery}%</span></p>
                              <p className="text-slate-600 dark:text-slate-300">Accuracy: <span className="font-bold">{data.accuracy}%</span></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="mastery" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs">
                No quiz results yet. Take a diagnostic quiz to view your topic mastery!
              </div>
            )}
          </div>

          {/* Active Study Recommendations */}
          {summary && summary.active_recommendations.length > 0 && (
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Study Recommendations ({summary.active_recommendations.length})
              </h3>

              <div className="space-y-2.5">
                {summary.active_recommendations.map((rec: RecommendationItem) => (
                  <div 
                    key={rec.id}
                    className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="space-y-0.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                          {rec.recommendation_type}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{rec.title}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {rec.message}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => {
                          onClose();
                          if (rec.suggested_action === 'review_with_tutor') {
                            onLaunchTutor?.(rec.topic_id || undefined, rec.suggested_mode);
                          } else {
                            onLaunchQuiz?.(rec.topic_id || undefined);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/25 transition-all flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Study Now</span>
                      </button>
                      <button
                        onClick={() => handleDismiss(rec.id)}
                        disabled={dismissingId === rec.id}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs border border-slate-200 dark:border-slate-700 transition-all"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Responsive Topic Breakdown Cards (Mobile-friendly, no overflowing 8-column table) */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-purple-500" />
              Course Topics Breakdown
            </h3>

            {summary && summary.topics_progress.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {summary.topics_progress.map((tp: TopicMasteryProgress) => (
                  <div
                    key={tp.topic_id}
                    className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3 shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {tp.topic_name}
                          </h4>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {tp.subject_name}
                          </span>
                        </div>
                        <span 
                          className="font-bold px-2 py-0.5 rounded-md text-xs"
                          style={{
                            backgroundColor: `${getMasteryColor(tp.mastery_score)}15`,
                            color: getMasteryColor(tp.mastery_score)
                          }}
                        >
                          {Math.round(tp.mastery_score)}%
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                        <span>Accuracy: <strong className="text-slate-800 dark:text-slate-200">{Math.round(tp.accuracy_percentage)}%</strong></span>
                        <span>Questions: <strong className="text-slate-800 dark:text-slate-200">{tp.total_questions_attempted}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 justify-end">
                      <button
                        onClick={() => {
                          onClose();
                          onLaunchQuiz?.(tp.topic_id);
                        }}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-all"
                      >
                        Quiz
                      </button>
                      <button
                        onClick={() => {
                          onClose();
                          onLaunchTutor?.(tp.topic_id, 'tutor');
                        }}
                        className="px-3 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-600 text-brand-600 hover:text-white dark:bg-brand-600/30 dark:hover:bg-brand-600 dark:text-brand-200 border border-brand-500/30 text-xs font-medium transition-all"
                      >
                        Study with AI
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs">
                Take a diagnostic quiz to track your mastery per topic!
              </div>
            )}
          </div>

        </div>

        {/* Simple Footer */}
        <div className="p-3.5 px-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Student: <strong className="text-slate-800 dark:text-slate-200">{user?.full_name || 'Student'}</strong></span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
