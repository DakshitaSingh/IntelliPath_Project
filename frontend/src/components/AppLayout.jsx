import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-slate-50">

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Mobile Header */}
        <header className="flex items-center gap-3 border-b bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>

          <span className="font-semibold text-slate-800">
            AI Learning Assistant
          </span>
        </header>

        {/* Page Content */}
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-5 md:p-8">
          {children}
        </main>

      </div>
    </div>
  );
};

export default AppLayout;
