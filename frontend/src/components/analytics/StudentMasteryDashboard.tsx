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
  Target, 
  Flame, 
  Brain, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw, 
  Lightbulb, 
  ShieldCheck, 
  Compass
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
  const [activeTab, setActiveTab] = useState<'analytics' | 'defense'>('analytics');
  const [dismissingId, setDismissingId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && token) {
      loadSummary();
    }
  }, [isOpen, token]);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMasterySummary(token);
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
      await dismissRecommendation(recId, token);
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

  // Color mapping based on mastery score
  const getMasteryColor = (score: number) => {
    if (score >= 80) return '#10b981'; // Emerald
    if (score >= 60) return '#6366f1'; // Indigo
    if (score >= 40) return '#f59e0b'; // Amber
    return '#ef4444'; // Rose / Red
  };

  const chartData = summary?.topics_progress.map(tp => ({
    name: tp.topic_name.length > 16 ? tp.topic_name.slice(0, 14) + '...' : tp.topic_name,
    fullName: tp.topic_name,
    mastery: Math.round(tp.mastery_score),
    accuracy: Math.round(tp.accuracy_percentage),
    color: getMasteryColor(tp.mastery_score),
    topic_id: tp.topic_id
  })) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Student Knowledge Tracing & Analytics
                </h2>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  Phase 6 Defense Edition
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Longitudinal Bayesian-inspired mastery tracking, automated misconception tagging, and defense rationale.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadSummary}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all disabled:opacity-50"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center px-6 pt-3 border-b border-slate-800/80 bg-slate-950/40 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'analytics'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Mastery Scorecard & Topic Tracing</span>
          </button>
          <button
            onClick={() => setActiveTab('defense')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'defense'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Academic Defense Rationale & Methodology</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 flex items-center gap-3 text-red-200 text-sm">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'analytics' ? (
            <>
              {/* High-Level Scorecards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Overall Mastery */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 relative overflow-hidden">
                  <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
                    <span>Overall Mastery</span>
                    <Award className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white mt-2">
                    {summary ? `${Math.round(summary.overall_mastery_index)}%` : '--'}
                  </div>
                  <div className="mt-2 text-[11px] font-medium text-brand-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-400" />
                    Tier: {summary?.mastery_tier || 'Novice'}
                  </div>
                </div>

                {/* Quizzes Completed */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 relative overflow-hidden">
                  <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
                    <span>Quizzes Done</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white mt-2">
                    {summary?.total_quizzes_completed ?? 0}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    {summary?.total_questions_answered ?? 0} questions evaluated
                  </div>
                </div>

                {/* Overall Accuracy */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 relative overflow-hidden">
                  <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
                    <span>Overall Accuracy</span>
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white mt-2">
                    {summary ? `${Math.round(summary.overall_accuracy_percentage)}%` : '--'}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    Formative assessment accuracy
                  </div>
                </div>

                {/* Topics Tracked */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 relative overflow-hidden">
                  <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
                    <span>Topics Tracked</span>
                    <Brain className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white mt-2">
                    {summary?.topics_tracked_count ?? 0}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    Longitudinal curriculum nodes
                  </div>
                </div>
              </div>

              {/* Mastery Distribution Chart */}
              <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-2 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-brand-400" />
                      Topic Mastery Breakdown (BKT-Calibrated)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Calculated from historical accuracy, sliding-window recency (60% weight), and consecutive streaks.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> &gt;=80% Mastered
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" /> 60-79% Proficient
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> &lt;60% Remediation
                    </span>
                  </div>
                </div>

                {chartData.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <XAxis 
                          dataKey="name" 
                          stroke="#64748b" 
                          fontSize={11} 
                          tickLine={false} 
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                        />
                        <YAxis 
                          stroke="#64748b" 
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
                                <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-xl text-xs space-y-1">
                                  <p className="font-bold text-white">{data.fullName}</p>
                                  <p className="text-brand-300">Mastery Index: <span className="font-bold">{data.mastery}%</span></p>
                                  <p className="text-slate-300">Raw Accuracy: <span className="font-bold">{data.accuracy}%</span></p>
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
                  <div className="text-center py-12 text-slate-500 text-xs">
                    No topic evaluations logged yet. Take a diagnostic quiz to generate your mastery baseline!
                  </div>
                )}
              </div>

              {/* Active Pedagogical Recommendations */}
              <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    Adaptive Pedagogical Recommendations ({summary?.active_recommendations.length ?? 0})
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Generated automatically when misconceptions or mastery thresholds trigger
                  </span>
                </div>

                {summary && summary.active_recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {summary.active_recommendations.map((rec: RecommendationItem) => (
                      <div 
                        key={rec.id}
                        className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1 max-w-2xl">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              rec.recommendation_type === 'remediation'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : rec.recommendation_type === 'advancement'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                            }`}>
                              {rec.recommendation_type}
                            </span>
                            <span className="text-xs font-bold text-white">{rec.title}</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
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
                            className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/30 transition-all flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Act Now</span>
                          </button>
                          <button
                            onClick={() => handleDismiss(rec.id)}
                            disabled={dismissingId === rec.id}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs border border-slate-700 transition-all"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    No active remediation alerts. All evaluated topics are currently within optimal pacing!
                  </div>
                )}
              </div>

              {/* Granular Topic Progress Table */}
              <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                  <Brain className="w-4 h-4 text-purple-400" />
                  Detailed Topic Mastery Matrix
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-3 font-semibold">Curriculum Topic</th>
                        <th className="pb-3 font-semibold">Subject</th>
                        <th className="pb-3 font-semibold text-center">Mastery Index</th>
                        <th className="pb-3 font-semibold text-center">Accuracy</th>
                        <th className="pb-3 font-semibold text-center">Streak</th>
                        <th className="pb-3 font-semibold text-center">Difficulty Pacing</th>
                        <th className="pb-3 font-semibold">Detected Misconceptions</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {summary && summary.topics_progress.length > 0 ? (
                        summary.topics_progress.map((tp: TopicMasteryProgress) => (
                          <tr key={tp.topic_id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="py-3 font-semibold text-white">
                              {tp.topic_name}
                            </td>
                            <td className="py-3 text-slate-400">
                              {tp.subject_name}
                            </td>
                            <td className="py-3 text-center">
                              <span 
                                className="font-bold px-2 py-0.5 rounded-md text-[11px]"
                                style={{
                                  backgroundColor: `${getMasteryColor(tp.mastery_score)}15`,
                                  color: getMasteryColor(tp.mastery_score)
                                }}
                              >
                                {Math.round(tp.mastery_score)}%
                              </span>
                            </td>
                            <td className="py-3 text-center text-slate-300">
                              {Math.round(tp.accuracy_percentage)}% <span className="text-slate-500 text-[10px]">({tp.total_correct}/{tp.total_questions_attempted})</span>
                            </td>
                            <td className="py-3 text-center">
                              <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                                <Flame className="w-3.5 h-3.5 fill-amber-400/20" />
                                {tp.streak_count}
                              </span>
                            </td>
                            <td className="py-3 text-center">
                              <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                {tp.recommended_difficulty}
                              </span>
                            </td>
                            <td className="py-3">
                              {tp.misconceptions_detected.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {tp.misconceptions_detected.map((misc, idx) => (
                                    <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                      {misc}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-500 text-[11px] italic">None logged</span>
                              )}
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    onClose();
                                    onLaunchQuiz?.(tp.topic_id);
                                  }}
                                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] transition-all"
                                  title="Take diagnostic quiz"
                                >
                                  Quiz
                                </button>
                                <button
                                  onClick={() => {
                                    onClose();
                                    onLaunchTutor?.(tp.topic_id, 'tutor');
                                  }}
                                  className="px-2 py-1 rounded bg-brand-600/30 hover:bg-brand-600 text-brand-200 border border-brand-500/40 text-[11px] transition-all"
                                  title="Study with Socratic Tutor"
                                >
                                  Tutor
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-slate-500 text-xs">
                            No topics evaluated yet. Take a quiz from the top header to begin tracking your mastery!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            /* Defense Presentation View */
            <div className="space-y-6">
              {/* Defense Hero */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-brand-950/60 via-slate-900 to-indigo-950/40 border border-brand-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-brand-400" />
                  </div>
                  <h3 className="text-base font-bold text-white">
                    Theoretical Foundation & Defense Architecture
                  </h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                  LearnLoop AI operationalizes Benjamin Bloom’s classic <strong className="text-white">2 Sigma Problem (Bloom, 1984)</strong> by providing 
                  accessible one-on-one mastery learning with Gemini 3.8 Flash, strict grounded Retrieval-Augmented Generation (Lewis et al., 2020), 
                  and automated Bayesian-inspired Knowledge Tracing (Corbett &amp; Anderson, 1995).
                </p>
              </div>

              {/* 3 Pillars Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-brand-400 text-xs font-bold uppercase tracking-wider">
                    <Compass className="w-4 h-4" />
                    <span>1. Socratic Inquiry</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">VanLehn (2011) Pedagogy</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Rather than providing direct code solutions, the system asks guided sub-questions, activates student prior knowledge, and scaffolds problem solving according to Bloom&apos;s Revised Taxonomy.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>2. Grounded RAG</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">Lewis et al. (2020)</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Overcoming LLM hallucination through deterministic BM25 passage chunking, syllabus retrieval, and bracketed page/line source attribution for guaranteed academic truth.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <Target className="w-4 h-4" />
                    <span>3. Knowledge Tracing</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">Corbett &amp; Anderson (1995)</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Continuous mastery estimation balancing cumulative success with recent sliding windows (60% weight) and automated remediation recommendation loops.
                  </p>
                </div>
              </div>

              {/* Research Citations Card */}
              <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Scholarly References Integrated in Dissertation
                </h4>
                <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-400 font-bold">•</span>
                    <span><strong>Bloom, B. S. (1984).</strong> The 2 Sigma Problem: The Search for Methods of Group Instruction as Effective as One-to-One Tutoring. <em>Educational Researcher</em>, 13(6), 4–16.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-400 font-bold">•</span>
                    <span><strong>Corbett, A. T., &amp; Anderson, J. R. (1995).</strong> Knowledge tracing: Modeling the acquisition of procedural knowledge. <em>User Modeling and User-Adapted Interaction</em>, 4(4), 253–278.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-400 font-bold">•</span>
                    <span><strong>Lewis, P., et al. (2020).</strong> Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. <em>NeurIPS 2020</em>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-400 font-bold">•</span>
                    <span><strong>Kasneci, E., et al. (2023).</strong> ChatGPT for good? On opportunities and challenges of large language models for education. <em>Learning and Individual Differences</em>, 103, 102274.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-400 font-bold">•</span>
                    <span><strong>VanLehn, K. (2011).</strong> The relative effectiveness of human tutoring, intelligent tutoring systems, and other tutoring systems. <em>Educational Psychologist</em>, 46(4), 197–221.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-500">
          <div>
            Authenticated as: <span className="text-slate-300 font-semibold">{user?.full_name || 'Student'}</span> ({user?.email})
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-all"
          >
            Close Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};
