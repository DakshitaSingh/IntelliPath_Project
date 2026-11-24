import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ScanFace } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm card p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary-500 flex items-center justify-center mb-3">
            <Sparkles size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Welcome back</h1>
          <p className="text-sm text-slate-500">Log in to your AI Learning Assistant</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</label>
            <input
              type="email"
              required
              className="input-field mt-1"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Password</label>
            <input
              type="password"
              required
              className="input-field mt-1"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
                <Link to="/face-login" className="btn-secondary w-full mt-3 flex items-center justify-center gap-2">
          <ScanFace size={16} /> Log in with Face
        </Link>

        <p className="text-sm text-slate-500 text-center mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary-600 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
