import React from 'react';

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="card p-5 flex items-center justify-between">
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
    </div>
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      <Icon size={22} />
    </div>
  </div>
);

export default StatCard;
