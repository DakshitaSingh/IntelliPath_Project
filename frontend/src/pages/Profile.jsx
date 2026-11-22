import React from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';

const Profile = () => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-slate-800">Profile</h1>
      <p className="text-slate-500 mt-1">Your account details</p>

      <div className="card mt-6 p-6 max-w-md flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-semibold"
          style={{ backgroundColor: user.avatarColor }}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-lg">{user.name}</p>
          <p className="text-slate-500 text-sm">{user.email}</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
