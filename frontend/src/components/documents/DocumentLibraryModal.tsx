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
  RefreshCw,
  ArrowLeft,
  Search
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
  const [searchFilter, setSearchFilter] = useState('');

  // Mobile view tab toggle: 'documents' | 'query'
  const [mobileTab, setMobileTab] = useState<'documents' | 'query'>('documents');

  const activeToken = token || localStorage.getItem('learnloop_token');

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      setRagResult(null);
      setMobileTab('documents');
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

  const filteredDocs = documents.filter(d => 
    d.filename.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl h-[94vh] sm:h-[88vh] flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/90 dark:bg-slate-950/70 backdrop-blur shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-md shadow-brand-500/20 text-white shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  Course Materials & Syllabus
                </h2>
                <span className="hidden xs:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/20 uppercase tracking-wider shrink-0">
                  Verified RAG
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Upload course syllabi and lecture notes to study with grounded citations
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

        {/* Mobile Navigation Tabs (< md) */}
        <div className="flex md:hidden border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/90 p-1 shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setMobileTab('documents')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === 'documents'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>My Documents ({documents.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('query')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === 'query'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Document Q&A {selectedDoc ? '• Ready' : ''}</span>
          </button>
        </div>

        {/* Alerts */}
        {!activeToken && (
          <div className="px-4 py-2.5 bg-brand-50 dark:bg-brand-500/10 border-b border-brand-200 dark:border-brand-500/20 text-brand-700 dark:text-brand-300 text-xs flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0 truncate">
              <AlertCircle className="w-4 h-4 text-brand-500 shrink-0" />
              <span className="truncate">Sign in to your student account to upload and save syllabus notes.</span>
            </div>
            {onOpenAuth && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="px-2.5 py-1 rounded-lg bg-brand-600 text-white font-semibold text-xs shrink-0 shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-300 text-xs flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span className="truncate">{error}</span>
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
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span className="truncate">{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 md:divide-x divide-slate-200 dark:divide-slate-800">
          
          {/* Left Column: Upload Dropzone & Document List */}
          <div className={`md:col-span-5 flex flex-col h-full overflow-hidden bg-slate-50/60 dark:bg-slate-950/30 ${
            mobileTab === 'documents' ? 'flex' : 'hidden md:flex'
          }`}>
            
            {/* Top Toolbar: Compact Upload Box & Search */}
            <div className="p-3 sm:p-4 space-y-2.5 border-b border-slate-200 dark:border-slate-800/80 shrink-0">
              {/* Compact Upload Bar */}
              <label className={`border border-dashed rounded-xl p-3 text-center flex items-center gap-3 cursor-pointer transition-all ${
                uploading
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                  : 'border-slate-300 dark:border-slate-700 hover:border-brand-500 bg-white dark:bg-slate-900 shadow-sm'
              }`}>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <UploadCloud className="w-4 h-4" />
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {uploading ? 'Parsing & Indexing...' : 'Upload Course Notes / PDF'}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    PDF, DOCX, TXT, MD (Max 25MB)
                  </div>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-200 dark:border-brand-500/20 shrink-0">
                  Browse
                </span>
              </label>

              {/* Document Search Filter */}
              {documents.length > 3 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filter uploaded documents..."
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-brand-500"
                  />
                </div>
              )}
            </div>

            {/* Document List Header */}
            <div className="px-4 py-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800/80 shrink-0">
              <span>My Course Documents ({documents.length})</span>
              {loading && <RefreshCw className="w-3 h-3 animate-spin text-brand-500" />}
            </div>

            {/* Document List Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {documents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/40">
                  <FileText className="w-7 h-7 mx-auto mb-2 text-slate-400 opacity-60" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">No documents uploaded yet</p>
                  <p className="mt-1 text-[11px]">Upload a lecture PDF or syllabus above to begin grounded learning.</p>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 italic">
                  No documents match "{searchFilter}"
                </div>
              ) : (
                filteredDocs.map(doc => {
                  const isSelected = selectedDoc?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className={`p-3 rounded-xl border transition-all text-left space-y-2 cursor-pointer ${
                        isSelected
                          ? 'bg-brand-50/80 dark:bg-brand-950/40 border-brand-500 shadow-sm ring-1 ring-brand-500/20'
                          : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* Document Top Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${
                            isSelected 
                              ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate" title={doc.filename}>
                              {doc.filename}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                              <span className="uppercase font-semibold text-brand-600 dark:text-brand-400">{doc.file_type || 'PDF'}</span>
                              <span>•</span>
                              <span>{(doc.file_size / (1024 * 1024)).toFixed(1)} MB</span>
                              <span>•</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{doc.chunk_count} Chunks</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc.id, doc.filename);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0"
                          title="Delete document"
                          aria-label="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Document Actions Row */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        {onSelectDocumentForChat && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectDocumentForChat(doc);
                              onClose();
                            }}
                            className="flex-1 py-1.5 px-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Study in Tutor</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDoc(doc);
                            setMobileTab('query');
                          }}
                          className="py-1.5 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all"
                        >
                          <span>Ask Q&A</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Grounded Study & Inquiries */}
          <div className={`md:col-span-7 flex flex-col h-full overflow-y-auto bg-white dark:bg-slate-900 ${
            mobileTab === 'query' ? 'flex' : 'hidden md:flex'
          }`}>
            {selectedDoc ? (
              <div className="p-4 sm:p-5 flex flex-col h-full space-y-4">
                
                {/* Active Document Grounding Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 block">
                          Target Grounding Source
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white break-words mt-0.5">
                          {selectedDoc.filename}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Status: <span className="text-emerald-600 dark:text-emerald-400 font-medium">Indexed</span> • {selectedDoc.chunk_count} verified segments for retrieval
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Grounding Source */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex-wrap">
                    {onSelectDocumentForChat && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectDocumentForChat(selectedDoc);
                          onClose();
                        }}
                        className="flex-1 min-w-[140px] py-2 px-3 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Launch Full Tutor Session</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMobileTab('documents')}
                      className="md:hidden py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Back to Docs</span>
                    </button>
                  </div>
                </div>

                {/* Grounded Query Box */}
                <form onSubmit={handleRunRAGQuery} className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Ask verified question against this document:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={queryInput}
                      onChange={e => setQueryInput(e.target.value)}
                      placeholder={`e.g. Core concepts or learning objectives in ${selectedDoc.filename}...`}
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={queryLoading || !queryInput.trim()}
                      className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                    >
                      {queryLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </form>

                {/* RAG Answer & Verified Citations Area */}
                <div className="flex-1 overflow-y-auto space-y-3">
                  {ragResult ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>Synthesized Grounded Answer</span>
                          </span>
                          {ragResult.model_used && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/20">
                              {ragResult.model_used}
                            </span>
                          )}
                        </div>
                        <div className="prose dark:prose-invert prose-xs max-w-none text-slate-800 dark:text-slate-200 leading-relaxed">
                          <ReactMarkdown>{ragResult.answer}</ReactMarkdown>
                        </div>
                      </div>

                      {ragResult.citations && ragResult.citations.length > 0 && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Verified Source Citations ({ragResult.citations.length})
                          </span>
                          <div className="space-y-1.5">
                            {ragResult.citations.map((c, i) => (
                              <div key={i} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                                <span className="font-semibold text-brand-600 dark:text-brand-400">[{c.page_or_section}]: </span>
                                <span className="italic">"{c.snippet}"</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-44 sm:h-56 flex flex-col items-center justify-center text-center p-6 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl">
                      <Sparkles className="w-6 h-6 mb-2 text-brand-500 opacity-60" />
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Test RAG Grounding</p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                        Enter any question above to test citation extraction, or click <strong>Launch Full Tutor Session</strong> to chat interactively with the Socratic AI.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <BookOpen className="w-10 h-10 mb-2 opacity-40 text-brand-500" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Document Selected</p>
                <p className="text-[11px] mt-1 text-slate-400 max-w-xs">
                  Select a document from the left list or upload a syllabus to test grounded queries.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
