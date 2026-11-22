import React, { useState } from 'react';
import { X, UploadCloud } from 'lucide-react';
import api from '../api/axios';

const UploadModal = ({ onClose, onUploaded }) => {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (f) => {
    if (f && f.type === 'application/pdf') {
      if (f.size > 10 * 1024 * 1024) {
        setError('PDF must be under 10MB');
        return;
      }
      setError('');
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.pdf$/i, ''));
    } else {
      setError('Please select a PDF file');
    }
  };

  const handleSubmit = async () => {
    if (!file) return setError('Please choose a PDF file to upload');
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title || file.name);
      const { data } = await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(data.document);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Upload New Document</h3>
            <p className="text-sm text-slate-500">Add a PDF document to your library</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Document Title</label>
          <input
            className="input-field mt-1"
            placeholder="e.g., React Interview Prep"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">PDF File</label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files[0]);
            }}
            className={`mt-1 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-primary-500 bg-primary-50' : 'border-slate-200'
            }`}
            onClick={() => document.getElementById('pdf-input').click()}
          >
            <input
              id="pdf-input"
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <div className="w-10 h-10 mx-auto rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center mb-2">
              <UploadCloud size={20} />
            </div>
            {file ? (
              <p className="text-sm font-medium text-slate-700">{file.name}</p>
            ) : (
              <>
                <p className="text-sm">
                  <span className="text-primary-600 font-medium">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-400 mt-1">PDF up to 10MB</p>
              </>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button className="btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary flex-1" onClick={handleSubmit} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
