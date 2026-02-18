"use client";

import React from 'react';
import { MessageSquare, TrendingUp, Users, Settings, Home } from 'lucide-react';

const Sidebar = () => {
  const icons = [
    { icon: Home, label: 'Начало' },
    { icon: MessageSquare, label: 'Дебати' },
    { icon: TrendingUp, label: 'Трендове' },
    { icon: Users, label: 'Общност' },
    { icon: Settings, label: 'Настройки' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 border-r border-gray-100 bg-white flex flex-col items-center py-8 z-50">
      <div className="w-8 h-8 bg-black rounded-full mb-12 flex items-center justify-center text-white font-bold text-xs">
        D
      </div>
      <nav className="flex flex-col gap-8">
        {icons.map((item, idx) => (
          <button key={idx} className="text-gray-400 hover:text-black transition-colors group relative">
            <item.icon size={20} strokeWidth={1.5} />
            <span className="absolute left-14 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;