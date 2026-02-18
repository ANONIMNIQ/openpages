"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ArgumentCard from './ArgumentCard';
import { Plus, ChevronRight } from 'lucide-react';

interface CardStackProps {
  title: string;
  type: 'pro' | 'con';
  arguments: Array<{ author: string; text: string }>;
}

const CardStack: React.FC<CardStackProps> = ({ title, type, arguments: args }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const accentColor = type === 'pro' ? 'bg-emerald-500' : 'bg-rose-500';
  const textColor = type === 'pro' ? 'text-emerald-600' : 'text-rose-600';

  return (
    <div className="w-full max-w-md mb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-1 h-4 ${accentColor}`} />
          <h3 className={`text-[11px] font-black uppercase tracking-[0.25em] ${textColor}`}>
            {title}
          </h3>
        </div>
        <button className={`p-2 rounded-full text-white ${accentColor} hover:scale-110 transition-transform shadow-lg`}>
          <Plus size={14} />
        </button>
      </div>

      <div 
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            <motion.div 
              key="stack"
              className="relative h-[220px] cursor-pointer"
              onClick={() => setIsExpanded(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {args.slice(0, 3).map((arg, idx) => (
                <motion.div
                  key={`stack-${idx}`}
                  initial={false}
                  animate={{
                    y: isHovered ? idx * 20 : idx * 10,
                    scale: 1 - idx * 0.04,
                    zIndex: 10 - idx,
                  }}
                  className="absolute top-0 left-0 w-full"
                >
                  <ArgumentCard {...arg} type={type} isStacked />
                </motion.div>
              ))}
              <div className="absolute bottom-0 left-0 w-full flex justify-center pb-4 z-20">
                <div className="bg-black text-white text-[9px] font-bold uppercase tracking-widest px-4 py-2 rounded-full flex items-center gap-2 shadow-xl">
                  Разгърни {args.length} аргумента <ChevronRight size={10} />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-1"
            >
              <button 
                onClick={() => setIsExpanded(false)}
                className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 hover:text-black transition-colors flex items-center gap-2"
              >
                ← Свий списъка
              </button>
              {args.map((arg, idx) => (
                <motion.div
                  key={`expanded-${idx}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <ArgumentCard {...arg} type={type} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CardStack;