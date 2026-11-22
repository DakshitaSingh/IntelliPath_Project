import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Layers, HelpCircle, Trash2, Globe, ExternalLink } from 'lucide-react';
import api from '../api/axios';
import AppLayout from '../components/AppLayout';
import UploadModal from '../components/UploadModal';

const formatSize = (bytes) => {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const Documents = () => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchDocs = () => {
    setLoading(true);
    api
      .get('/documents')
      .then(({ data }) => setDocs(data.documents))
      .finally(() => setLoading(false));
  };

  useEffect(fetchDocs, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    await api.delete(`/documents/${id}`);
    setDocs((prev) => prev.filter((d) => d._id !== id));
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Documents</h1>
          <p className="text-slate-500 mt-1">Manage and organize your study materials</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Upload Document
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400 mt-8">Loading documents...</p>
      ) : docs.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <FileText size={32} className="mx-auto text-slate-300" />
          <p className="text-slate-500 mt-3">No learning resources yet. Upload a PDF or save useful web content from the Chrome extension.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {docs.map((doc) => (
            <div key={doc._id} className="card p-4 flex flex-col">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                  {doc.type === 'WEB' ? <Globe size={18} /> : <FileText size={18} />}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {doc.type === 'WEB' ? 'Web Resource' : 'PDF'}
                  </span>
                  <button onClick={() => handleDelete(doc._id)} className="text-slate-300 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <Link to={`/documents/${doc._id}`} className="mt-3 font-semibold text-slate-800 hover:text-primary-600 line-clamp-2">
                {doc.title}
              </Link>
              <p className="text-xs text-slate-400 mt-1">
                {doc.type === 'WEB'
                  ? `${doc.sourceDomain || 'Web'} · Saved ${new Date(doc.createdAt).toLocaleDateString()}`
                  : `${formatSize(doc.fileSize)} · Uploaded ${new Date(doc.createdAt).toLocaleDateString()}`}
              </p>
              {doc.type === 'WEB' && doc.sourceUrl && (
                <a
                  href={doc.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary-600 hover:underline mt-2 inline-flex items-center gap-1 truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  Visit source <ExternalLink size={12} />
                </a>
              )}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Layers size={14} /> Flashcards
                </span>
                <span className="flex items-center gap-1">
                  <HelpCircle size={14} /> Quizzes
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <UploadModal onClose={() => setShowModal(false)} onUploaded={(doc) => setDocs((prev) => [doc, ...prev])} />
      )}
    </AppLayout>
  );
};

export default Documents;
