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
  Layers, 
  FileCheck,
  Send,
  BookOpen
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
}

export const DocumentLibraryModal: React.FC<DocumentLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectDocumentForChat
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

  useEffect(() => {
    if (isOpen) {
      loadDocs();
      setRagResult(null);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const data = await fetchDocuments(token);
      setDocuments(data);
      if (data.length > 0 && !selectedDoc) {
        setSelectedDoc(data[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const newDoc = await uploadDocument(file, token);
      setDocuments(prev => [newDoc, ...prev]);
      setSelectedDoc(newDoc);
      setSuccessMsg(`"${newDoc.filename}" successfully parsed into ${newDoc.chunk_count} grounded chunks!`);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (docId: number, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) return;

    try {
      await deleteDocument(docId, token);
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
      const res = await queryDocumentRAG(selectedDoc.id, queryInput.trim(), 4, token);
      setRagResult(res);
    } catch (err: any) {
      setError(err.message || 'Error processing RAG query');
    } finally {
      setQueryLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl shadow-brand-950/40 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-brand-500 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Syllabus & Lecture Notes RAG Engine</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 uppercase tracking-wider">
                  Course Knowledge Base
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Upload your course materials (PDF, DOCX, TXT) to ask questions with verified syllabus citations.
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

        {/* Alerts */}
        {error && (
          <div className="px-6 py-2.5 bg-red-950/50 border-b border-red-800/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="px-6 py-2 bg-emerald-950/50 border-b border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* Left Column: Document List & Upload Dropzone (5 cols) */}
          <div className="p-6 md:col-span-5 flex flex-col space-y-4 overflow-y-auto bg-slate-950/20">
            {/* Upload Box */}
            <label className={`border-2 border-dashed rounded-2xl p-5 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
              uploading
                ? 'border-brand-500 bg-brand-500/5'
                : 'border-slate-700/80 hover:border-brand-500/60 bg-slate-900/60 hover:bg-slate-800/30'
            }`}>
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-2.5 text-brand-400">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UploadCloud className="w-5 h-5" />
                )}
              </div>
              <span className="text-xs font-bold text-white">
                {uploading ? 'Parsing & Chunking Document...' : 'Upload Course Syllabus / Notes'}
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                Supports PDF, DOCX, TXT, MD (Max 25MB)
              </span>
            </label>

            {/* Document List */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                <span>My Course Documents ({documents.length})</span>
                {loading && <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />}
              </div>

              {documents.length === 0 && !loading ? (
                <div className="py-8 text-center text-xs text-slate-500 border border-slate-800/60 rounded-xl p-4">
                  No documents uploaded yet. Upload lecture notes above to test retrieval.
                </div>
              ) : (
                documents.map(doc => {
                  const isSelected = selectedDoc?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setSelectedDoc(doc);
                        setRagResult(null);
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-brand-600/15 border-brand-500 shadow-sm shadow-brand-500/20'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 overflow-hidden">
                          <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-brand-400' : 'text-slate-400'}`} />
                          <div className="overflow-hidden">
                            <h4 className={`text-xs font-semibold truncate ${isSelected ? 'text-brand-300' : 'text-slate-200'}`}>
                              {doc.filename}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                              <span className="uppercase font-bold text-brand-400">{doc.file_type}</span>
                              <span>•</span>
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Layers className="w-3 h-3 text-cyan-400" />
                                {doc.chunk_count} chunks
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc.id, doc.filename);
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
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

          {/* Right Column: Direct Grounded Query & Citations Inspector (7 cols) */}
          <div className="p-6 md:col-span-7 flex flex-col justify-between overflow-y-auto space-y-4">
            {selectedDoc ? (
              <>
                <div className="space-y-4 flex-1">
                  {/* Selected Doc Banner */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">Target Grounding Source</div>
                      <div className="text-sm font-bold text-white mt-0.5">{selectedDoc.filename}</div>
                      <div className="text-[11px] text-slate-400">
                        {selectedDoc.chunk_count} extracted segments indexed for retrieval
                      </div>
                    </div>
                    {onSelectDocumentForChat && (
                      <button
                        onClick={() => {
                          onSelectDocumentForChat(selectedDoc);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/30 transition-all shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Chat in Tutor</span>
                      </button>
                    )}
                  </div>

                  {/* Grounded Query Form */}
                  <form onSubmit={handleRunRAGQuery} className="relative flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Ask anything grounded in ${selectedDoc.filename}...`}
                      value={queryInput}
                      onChange={e => setQueryInput(e.target.value)}
                      disabled={queryLoading}
                      className="w-full pl-4 pr-12 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!queryInput.trim() || queryLoading}
                      className="absolute right-1.5 p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs disabled:opacity-40 transition-all"
                    >
                      {queryLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </form>

                  {/* RAG Answer Display */}
                  {ragResult && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      {/* Answer Card */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 shadow-xl">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800/80">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-bold text-white">Grounded Syllabus Answer</span>
                          <span className="text-[10px] text-cyan-400 ml-auto bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                            {ragResult.model_used}
                          </span>
                        </div>
                        <div className="prose prose-invert prose-xs text-slate-200 leading-relaxed max-w-none">
                          <ReactMarkdown>{ragResult.answer}</ReactMarkdown>
                        </div>
                      </div>

                      {/* Citations List */}
                      {ragResult.citations.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                            <FileCheck className="w-4 h-4 text-emerald-400" />
                            <span>Retrieved Source Passages ({ragResult.citations.length})</span>
                          </h4>
                          <div className="space-y-2">
                            {ragResult.citations.map((c, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                              >
                                <div className="flex items-center justify-between font-semibold text-emerald-400 mb-1">
                                  <span>{c.page_or_section}</span>
                                  <span className="text-[10px] text-slate-500">Relevance: {c.score}</span>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-normal line-clamp-3 italic">
                                  "{c.snippet}"
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!ragResult && !queryLoading && (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      Enter a question above to test RAG retrieval and verified citations against this document.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs py-12">
                <BookOpen className="w-8 h-8 text-slate-600 mb-2" />
                <span>Select a document from the left to start grounded RAG queries.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
