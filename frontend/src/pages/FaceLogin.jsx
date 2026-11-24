import React, { lazy, Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScanFace } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
const FaceCapture = lazy(() => import('../components/FaceCapture'));

const FaceLogin = () => {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  const handleCaptured = async ([descriptor]) => {
    setScanning(false);
    try {
      const { data } = await api.post('/face/login', { email, descriptor });
      setSession(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Face login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm card p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary-500 flex items-center justify-center mb-3">
            <ScanFace size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Face Login</h1>
          <p className="text-sm text-slate-500 text-center">Enter your email, then look at the camera</p>
        </div>

        {scanning ? (
          <>
            <Suspense fallback={<p className="text-sm text-slate-500">Loading camera...</p>}><FaceCapture mode="verify" onComplete={handleCaptured} onError={(t) => { setScanning(false); setError(t); }} /></Suspense>
            <button className="btn-secondary w-full mt-3" onClick={() => setScanning(false)}>Cancel</button>
          </>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); setError(''); setScanning(true); }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</label>
              <input type="email" required className="input-field mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" className="btn-primary w-full">Scan my face</button>
          </form>
        )}

        <p className="text-sm text-slate-500 text-center mt-6">
          <Link to="/login" className="text-primary-600 font-medium">Use password instead</Link>
        </p>
      </div>
    </div>
  );
};

export default FaceLogin;