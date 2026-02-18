"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ArgumentCard from './ArgumentCard';
import { Plus } from 'lucide-react';

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
    <div className="flex-1 min-w-[300px]">
      <div className="flex items-center justify-between mb-6 px-2">
        <h3 className={`text-xs font-bold uppercase tracking-[0.2em] ${textColor}`}>
          {title}
        </h3>
        <button className={`p-1.5 rounded-md text-white ${accentColor} hover:scale-110 transition-transform`}>
          <Plus size={16} />
        </button>
      </div>

      <div 
        className="relative min-h-[400px]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AnimatePresence mode="popLayout">
          {!isExpanded ? (
            // Стек изглед
            <div 
              className="relative cursor-pointer"
              onClick={() => setIsExpanded(true)}
            >
              {args.slice(0, 3).map((arg, idx) => (
                <motion.div
                  key={`stack-${idx}`}
                  initial={false}
                  animate={{
                    y: isHovered ? idx * 15 : idx * 8,
                    scale: 1 - idx * 0.03,
                    zIndex: 10 - idx,
                    opacity: 1 - idx * 0.2,
                  }}
                  className="absolute top-0 left-0 w-full"
                ) as any}>
                  <ArgumentCard {...arg} type={type} isStacked />
                </motion.div>
              ))}
              <div className="absolute top-24 left-0 w-full text-center py-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Виж всички {args.length} аргумента
                </span>
              </div>
            </div>
          ) : (
            // Разгърнат изглед
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-2"
            >
              <button 
                onClick={() => setIsExpanded(false)}
                className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 hover:text-black transition-colors text-left px-2"
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