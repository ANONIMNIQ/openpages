"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ArgumentCard from './ArgumentCard';
import { Plus, ChevronRight, RefreshCw, ChevronUp } from 'lucide-react';

interface CardStackProps {
  title: string;
  type: 'pro' | 'con';
  arguments: Array<{ author: string; text: string }>;
}

const CardStack: React.FC<CardStackProps> = ({ title, type, arguments: args }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);

  const accentColor = type === 'pro' ? 'bg-emerald-500' : 'bg-rose-500';
  const textColor = type === 'pro' ? 'text-emerald-600' : 'text-rose-600';

  const loadMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisibleCount(prev => prev + 5);
  };

  const displayedArgs = isExpanded ? args.slice(0, visibleCount) : args.slice(0, 5);

  return (
    <motion.div layout className="w-full max-w-md mb-12">
      {/* Header */}
      <motion.div layout className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <motion.div layout className={`w-1 h-4 ${accentColor}`} />
          <motion.h3 layout className={`text-[11px] font-black uppercase tracking-[0.25em] ${textColor}`}>
            {title}
          </motion.h3>
        </div>
        <motion.button 
          layout
          className={`p-2 rounded-full text-white ${accentColor} hover:scale-110 transition-transform shadow-lg`}
        >
          <Plus size={14} />
        </motion.button>
      </motion.div>

      {/* Container */}
      <motion.div 
        layout
        className="relative flex flex-col"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AnimatePresence>
          {isExpanded && (
            <motion.button 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              onClick={() => setIsExpanded(false)}
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 hover:text-black transition-colors flex items-center gap-2 self-start"
            >
              <ChevronUp size={12} /> Свий списъка
            </motion.button>
          )}
        </AnimatePresence>

        <motion.div 
          layout 
          className={`relative flex flex-col ${!isExpanded ? 'cursor-pointer' : 'gap-4'}`}
          onClick={() => !isExpanded && setIsExpanded(true)}
        >
          {displayedArgs.map((arg, idx) => {
            const isStackMode = !isExpanded;
            
            // В стек режим картите са една върху друга с отместване
            // В разгънат режим са просто в списък (gap-4 от контейнера)
            return (
              <motion.div
                key={`${title}-${idx}`}
                layout
                initial={false}
                animate={{ 
                  y: isStackMode ? (isHovered ? idx * 28 : idx * 14) : 0,
                  scale: isStackMode ? 1 - idx * 0.03 : 1,
                  zIndex: 10 - idx,
                  opacity: isStackMode && idx > 0 ? (isHovered ? 0.9 : 0.6) : 1,
                  // Използваме absolute само в стек режим за застъпване
                  position: isStackMode ? 'absolute' : 'relative',
                  top: 0,
                  left: 0,
                  width: '100%',
                }}
                transition={{
                  type: "tween", // Преминаваме към tween за по-линейно движение
                  ease: [0.23, 1, 0.32, 1], // Quintic ease out - много гладко и без bounce
                  duration: 0.5
                }}
              >
                <ArgumentCard 
                  {...arg} 
                  type={type} 
                  isStacked={isStackMode} 
                />
              </motion.div>
            );
          })}

          {/* Spacer за запазване на мястото в стек режим */}
          {!isExpanded && (
            <div className="h-[260px] pointer-events-none" />
          )}

          {/* Button Overlay */}
          {!isExpanded && (
            <motion.div 
              layout
              className="absolute bottom-4 left-0 w-full flex justify-center z-30 pointer-events-none"
            >
              <motion.div 
                animate={{ y: isHovered ? 5 : 0 }}
                className="bg-black text-white text-[9px] font-bold uppercase tracking-widest px-6 py-3 rounded-full flex items-center gap-2 shadow-2xl pointer-events-auto"
              >
                Разгърни {args.length} аргумента <ChevronRight size={10} />
              </motion.div>
            </motion.div>
          )}
        </motion.div>

        {/* Load More */}
        {isExpanded && visibleCount < args.length && (
          <motion.button
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={loadMore}
            className="mt-4 w-full py-4 border-2 border-dashed border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:border-black hover:text-black transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={12} /> Зареди още аргументи
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
};

export default CardStack;