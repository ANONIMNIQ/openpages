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

  // Показваме или първите 5 (за стека), или всички до visibleCount (за списъка)
  const displayedArgs = isExpanded ? args.slice(0, visibleCount) : args.slice(0, 5);

  return (
    <motion.div layout className="w-full max-w-md mb-12">
      {/* Заглавие на секцията */}
      <motion.div layout className="flex items-center justify-between mb-8">
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

      {/* Контейнер за картите */}
      <motion.div 
        layout
        className="relative flex flex-col"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AnimatePresence mode="popLayout">
          {isExpanded && (
            <motion.button 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={() => setIsExpanded(false)}
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 hover:text-black transition-colors flex items-center gap-2 self-start"
            >
              <ChevronUp size={12} /> Свий списъка
            </motion.button>
          )}
        </AnimatePresence>

        <motion.div 
          layout 
          className={`relative ${!isExpanded ? 'h-[280px] cursor-pointer' : 'space-y-4'}`}
          onClick={() => !isExpanded && setIsExpanded(true)}
        >
          {displayedArgs.map((arg, idx) => {
            const isStackMode = !isExpanded;
            
            // Динамични стилове за анимацията
            const stackY = isHovered ? idx * 25 : idx * 12;
            const stackScale = 1 - idx * 0.04;
            const stackZ = 10 - idx;
            // В стек режим показваме само първите 5 с намаляваща видимост
            const stackOpacity = idx === 0 ? 1 : (isHovered ? 1 - idx * 0.1 : 0.8 - idx * 0.2);

            return (
              <motion.div
                key={`${title}-${idx}`}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: isStackMode ? stackOpacity : 1,
                  y: isStackMode ? stackY : 0,
                  scale: isStackMode ? stackScale : 1,
                  zIndex: isStackMode ? stackZ : 1,
                  position: isStackMode ? 'absolute' : 'relative',
                  width: '100%',
                }}
                transition={{
                  type: "spring",
                  stiffness: 250,
                  damping: 25,
                  mass: 1
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

          {/* Бутон за разгръщане (само в стек режим) */}
          {!isExpanded && (
            <motion.div 
              layout
              className="absolute bottom-0 left-0 w-full flex justify-center pb-6 z-30 pointer-events-none"
            >
              <motion.div 
                animate={{ 
                  y: isHovered ? 10 : 0,
                  opacity: isHovered ? 1 : 0.9
                }}
                className="bg-black text-white text-[9px] font-bold uppercase tracking-widest px-6 py-3 rounded-full flex items-center gap-2 shadow-2xl pointer-events-auto"
              >
                Разгърни {args.length} аргумента <ChevronRight size={10} />
              </motion.div>
            </motion.div>
          )}
        </motion.div>

        {/* Бутон за зареждане на още (само в разгърнат режим) */}
        {isExpanded && visibleCount < args.length && (
          <motion.button
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={loadMore}
            className="mt-8 w-full py-4 border-2 border-dashed border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:border-black hover:text-black transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={12} /> Зареди още аргументи
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
};

export default CardStack;