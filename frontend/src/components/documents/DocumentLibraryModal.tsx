import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Trash2, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  FileCheck,
  Send,
  BookOpen,
  RefreshCw
} from 'lucide-react';
import { Document, DocumentQueryResponse } from '../../types/document';
import { 
  fetchDocuments, 
  uploadDocument, 
  deleteDocument, 
  queryDocumentRAG 
} from '../../api/documents';
import { useAuth } from '../../context/AuthContext';

interface DocumentLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDocumentForChat?: (doc: Document) => void;
  onOpenAuth?: () => void;
}

export const DocumentLibraryModal: React.FC<DocumentLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectDocumentForChat,
  onOpenAuth
}) => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active document for direct RAG inquiry
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [queryInput, setQueryInput] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [ragResult, setRagResult] = useState<DocumentQueryResponse | null>(null);

  const activeToken = token || localStorage.getItem('learnloop_token');

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      setRagResult(null);
      if (activeToken) {
        loadDocs();
      } else {
        setDocuments([]);
        setSelectedDoc(null);
      }
    }
  }, [isOpen, activeToken]);

  const loadDocs = async () => {
    if (!activeToken) return;
    setLoading(true);
    try {
      const data = await fetchDocuments(activeToken);
      setDocuments(data);
      if (data.length > 0 && !selectedDoc) {
        setSelectedDoc(data[0]);
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('credentials') || err.message.includes('401'))) {
        localStorage.removeItem('learnloop_token');
        setError('Your session has expired. Please sign in again to view your documents.');
      } else {
        setError(err.message || 'Failed to load documents');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!activeToken) {
      setError('Please sign in to your student account before uploading documents.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const newDoc = await uploadDocument(file, activeToken);
      setDocuments(prev => [newDoc, ...prev]);
      setSelectedDoc(newDoc);
      setSuccessMsg(`"${newDoc.filename}" successfully parsed into ${newDoc.chunk_count} verified sections!`);
    } catch (err: any) {
      if (err.message && (err.message.includes('credentials') || err.message.includes('401'))) {
        localStorage.removeItem('learnloop_token');
        setError('Your session has expired. Please sign in again to upload documents.');
      } else {
        setError(err.message || 'Upload failed');
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (docId: number, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) return;

    try {
      await deleteDocument(docId, activeToken);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      if (selectedDoc?.id === docId) {
        const remaining = documents.filter(d => d.id !== docId);
        setSelectedDoc(remaining.length > 0 ? remaining[0] : null);
        setRagResult(null);
      }
      setSuccessMsg(`Document "${filename}" deleted.`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    }
  };

  const handleRunRAGQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !queryInput.trim() || queryLoading) return;

    setQueryLoading(true);
    setError(null);

    try {
      const res = await queryDocumentRAG(selectedDoc.id, queryInput.trim(), 4, activeToken);
      setRagResult(res);
    } catch (err: any) {
      setError(err.message || 'Error processing RAG query');
    } finally {
      setQueryLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-md shadow-brand-500/20 text-white shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Course Materials & Syllabus Knowledge Base
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/20 uppercase tracking-wider">
                  Verified RAG
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload your course materials (PDF, DOCX, TXT) to ground your AI tutor and quizzes with verified citations.
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

        {/* Alerts */}
        {!activeToken && (
          <div className="px-5 py-3 bg-brand-50 dark:bg-brand-500/10 border-b border-brand-200 dark:border-brand-500/20 text-brand-700 dark:text-brand-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-brand-500 shrink-0" />
              <span>Please sign in to your student account to upload and save course syllabus documents.</span>
            </div>
            {onOpenAuth && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="px-2.5 py-1 rounded bg-brand-600 text-white font-semibold text-xs shrink-0 shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="px-5 py-2.5 bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
            {error.includes('sign in') && onOpenAuth && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="px-2 py-0.5 rounded bg-red-600 text-white font-semibold text-[11px] shrink-0"
              >
                Sign In
              </button>
            )}
          </div>
        )}

        {successMsg && (
          <div className="px-5 py-2 bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
          
          {/* Left Column: Document List & Upload Dropzone (5 cols) */}
          <div className="p-4 sm:p-5 md:col-span-5 flex flex-col space-y-4 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20">
            {/* Upload Box */}
            <label className={`border-2 border-dashed rounded-2xl p-5 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
              uploading
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/5'
                : 'border-slate-300 dark:border-slate-700/80 hover:border-brand-500 bg-white dark:bg-slate-900/60'
            }`}>
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-2.5 text-brand-600 dark:text-brand-400">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UploadCloud className="w-5 h-5" />
                )}
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                {uploading ? 'Parsing & Chunking Syllabus...' : 'Upload Course Syllabus / Notes'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Supports PDF, DOCX, TXT, MD (Max 25MB)
              </span>
            </label>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between pb-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span>My Course Documents ({documents.length})</span>
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              </div>

              {documents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/30">
                  No documents uploaded yet. Upload lecture notes above to start grounded study.
                </div>
              ) : (
                documents.map(doc => {
                  const isSelected = selectedDoc?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-brand-50 dark:bg-brand-600/15 border-brand-500 shadow-sm'
                          : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`} />
                        <div className="truncate">
                          <span className={`font-semibold block truncate ${isSelected ? 'text-brand-600 dark:text-brand-300' : 'text-slate-800 dark:text-slate-200'}`}>
                            {doc.filename}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {doc.chunk_count} verified sections • {(doc.file_size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc.id, doc.filename);
                          }}
                          className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Grounded Study & Inquiries (7 cols) */}
          <div className="p-4 sm:p-6 md:col-span-7 flex flex-col justify-between overflow-y-auto space-y-4">
            {selectedDoc ? (
              <div className="space-y-4">
                {/* Active Document Banner */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div className="truncate">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {selectedDoc.filename}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Status: <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ready</span> • {selectedDoc.chunk_count} Grounded Chunks
                      </p>
                    </div>
                  </div>

                  {onSelectDocumentForChat && (
                    <button
                      onClick={() => {
                        onSelectDocumentForChat(selectedDoc);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Study in Tutor</span>
                    </button>
                  )}
                </div>

                {/* Grounded Query Box */}
                <form onSubmit={handleRunRAGQuery} className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Ask verified question against this document:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={queryInput}
                      onChange={e => setQueryInput(e.target.value)}
                      placeholder={`e.g., What are the key policies or grading criteria in ${selectedDoc.filename}?`}
                      className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
                    />
                    <button
                      type="submit"
                      disabled={queryLoading || !queryInput.trim()}
                      className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {queryLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </form>

                {/* RAG Answer & Verified Citations */}
                {ragResult && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 block mb-1">
                        Synthesized Verified Answer
                      </span>
                      <div className="prose dark:prose-invert prose-xs max-w-none text-slate-800 dark:text-slate-200 leading-relaxed">
                        <ReactMarkdown>{ragResult.answer}</ReactMarkdown>
                      </div>
                    </div>

                    {ragResult.citations && ragResult.citations.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Verified Document Citations ({ragResult.citations.length})
                        </span>
                        <div className="space-y-1.5">
                          {ragResult.citations.map((c, i) => (
                            <div key={i} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                              <span className="font-semibold text-brand-600 dark:text-brand-400">[{c.page_or_section}]: </span>
                              <span>"{c.snippet}"</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <BookOpen className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-xs">Select or upload a course document from the left to view verified content and run queries.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
