import React, { lazy, Suspense, useEffect, useState } from 'react';
import { ScanFace, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
const FaceCapture = lazy(() => import('./FaceCapture'));

const FaceRegistrationCard = () => {
  const { user, setSession } = useAuth();
  const [enrolled, setEnrolled] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/face/status').then(({ data }) => setEnrolled(data.enrolled)).catch(() => {});
  }, []);

  const syncUser = (flag) => {
    const token = localStorage.getItem('token');
    if (token && user) setSession(token, { ...user, faceEnrolled: flag });
  };

  const handleCaptured = async (descriptors) => {
    setCapturing(false);
    setBusy(true);
    try {
      await api.post('/face/register', { descriptors });
      setEnrolled(true);
      syncUser(true);
      setMsg({ type: 'ok', text: 'Face registered. You can now use "Log in with Face".' });
    } catch (err) {
      setMsg({ type: 'err', text: err.response?.data?.message || 'Face registration failed' });
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Remove your registered face data?')) return;
    setBusy(true);
    try {
      await api.delete('/face');
      setEnrolled(false);
      syncUser(false);
      setMsg({ type: 'ok', text: 'Face data removed.' });
    } catch (err) {
      setMsg({ type: 'err', text: err.response?.data?.message || 'Could not remove face data' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card mt-6 p-6 max-w-md">
      <div className="flex items-center gap-2 mb-1">
        <ScanFace size={18} className="text-primary-600" />
        <h2 className="font-semibold text-slate-800">Face Login</h2>
      </div>
      <p className="text-sm text-slate-500">
        {enrolled
          ? 'A face is registered for this account. Password login still works.'
          : 'Register your face to sign in with your camera. Your password keeps working.'}
      </p>

      {capturing ? (
        <div className="mt-4">
          <Suspense fallback={<p className="text-sm text-slate-500">Loading camera...</p>}><FaceCapture
            mode="enroll"
            samples={5}
            onComplete={handleCaptured}
            onError={(t) => { setCapturing(false); setMsg({ type: 'err', text: t }); }}
          /></Suspense>
          <button className="btn-secondary mt-3" onClick={() => setCapturing(false)}>Cancel</button>
        </div>
      ) : (
        <div className="flex gap-2 mt-4">
          <button className="btn-primary" disabled={busy} onClick={() => { setMsg({ type: '', text: '' }); setCapturing(true); }}>
            {enrolled ? 'Re-register face' : 'Register face'}
          </button>
          {enrolled && (
            <button className="btn-secondary flex items-center gap-1" disabled={busy} onClick={handleRemove}>
              <Trash2 size={14} /> Remove
            </button>
          )}
        </div>
      )}
      {msg.text && <p className={`text-sm mt-3 ${msg.type === 'ok' ? 'text-primary-600' : 'text-red-500'}`}>{msg.text}</p>}
    </div>
  );
};

export default FaceRegistrationCard;