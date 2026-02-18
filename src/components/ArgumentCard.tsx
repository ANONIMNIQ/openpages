"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ThumbsUp, Share2 } from 'lucide-react';

interface ArgumentCardProps {
  author: string;
  text: string;
  type: 'pro' | 'con';
  isStacked?: boolean;
  style?: React.CSSProperties;
}

const ArgumentCard: React.FC<ArgumentCardProps> = ({ author, text, type, isStacked, style }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const borderColor = type === 'pro' ? 'border-emerald-500' : 'border-rose-500';

  return (
    <motion.div
      layout
      style={style}
      onClick={(e) => {
        if (!isStacked) {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }
      }}
      className={`
        relative cursor-pointer border border-l-4 p-5 transition-all duration-500
        ${borderColor} bg-white hover:shadow-xl rounded-lg shadow-sm
        ${isStacked ? 'pointer-events-none' : 'mb-4'}
      `}
    >
      <motion.div layout className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
            A
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Анонимен</span>
        </div>
        <div className="flex gap-1">
          <div className="w-12 h-1 rounded-full bg-gray-50 overflow-hidden">
            <motion.div 
              layout
              className={`h-full ${type === 'pro' ? 'bg-emerald-500' : 'bg-rose-500'}`}
              initial={{ width: "0%" }}
              animate={{ width: "75%" }}
            />
          </div>
        </div>
      </motion.div>

      <motion.p layout className={`text-sm text-black font-medium leading-relaxed ${!isExpanded && 'line-clamp-3'}`}>
        {text}
      </motion.p>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 pt-6 border-t border-gray-50"
          >
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Този аргумент е добавен анонимно. Всички гласове и коментари в платформата са напълно частни и не изискват регистрация.
            </p>
            <div className="flex items-center gap-6">
              <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
                <MessageCircle size={14} /> Отговор
              </button>
              <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
                <ThumbsUp size={14} /> Подкрепа
              </button>
              <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
                <Share2 size={14} /> Сподели
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ArgumentCard;