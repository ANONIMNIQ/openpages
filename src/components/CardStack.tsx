"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ArgumentCard from './ArgumentCard';
import { Plus, ChevronRight, RefreshCw } from 'lucide-react';

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

  return (
    <motion.div layout className="w-full max-w-md mb-12">
      <motion.div layout className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className={`w-1 h-4 ${accentColor}`} />
          <h3 className={`text-[11px] font-black uppercase tracking-[0.25em] ${textColor}`}>
            {title}
          </h3>
        </div>
        <button className={`p-2 rounded-full text-white ${accentColor} hover:scale-110 transition-transform shadow-lg`}>
          <Plus size={14} />
        </button>
      </motion.div>

      <motion.div 
        layout
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {!isExpanded ? (
          <motion.div 
            layout
            key="stack"
            className="relative h-[240px] cursor-pointer"
            onClick={() => setIsExpanded(true)}
          >
            {args.slice(0, 3).map((arg, idx) => (
              <ArgumentCard 
                key={`stack-${idx}`}
                {...arg} 
                type={type} 
                isStacked 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  zIndex: 10 - idx,
                  transform: `translateY(${isHovered ? idx * 20 : idx * 10}px) scale(${1 - idx * 0.04})`,
                }}
              />
            ))}
            <div className="absolute bottom-0 left-0 w-full flex justify-center pb-4 z-20">
              <motion.div 
                layout
                className="bg-black text-white text-[9px] font-bold uppercase tracking-widest px-6 py-3 rounded-full flex items-center gap-2 shadow-2xl"
              >
                Разгърни {args.length} аргумента <ChevronRight size={10} />
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            layout
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col"
          >
            <button 
              onClick={() => setIsExpanded(false)}
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8 hover:text-black transition-colors flex items-center gap-2"
            >
              ← Свий списъка
            </button>
            
            <div className="space-y-1">
              {args.slice(0, visibleCount).map((arg, idx) => (
                <ArgumentCard 
                  key={`expanded-${idx}`}
                  {...arg} 
                  type={type} 
                />
              ))}
            </div>

            {visibleCount < args.length && (
              <motion.button
                layout
                onClick={loadMore}
                className="mt-6 w-full py-4 border-2 border-dashed border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:border-black hover:text-black transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={12} /> Зареди още аргументи
              </motion.button>
            )}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default CardStack;