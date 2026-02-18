"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ThumbsUp, Share2, ChevronDown } from 'lucide-react';

interface ArgumentCardProps {
  author: string;
  text: string;
  type: 'pro' | 'con';
  isStacked?: boolean;
  index?: number;
}

const ArgumentCard: React.FC<ArgumentCardProps> = ({ author, text, type, isStacked, index = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const borderColor = type === 'pro' ? 'border-emerald-500' : 'border-rose-500';
  const bgColor = type === 'pro' ? 'bg-emerald-50/30' : 'bg-rose-50/30';

  return (
    <motion.div
      layout
      onClick={() => setIsExpanded(!isExpanded)}
      className={`
        relative cursor-pointer border-l-4 p-4 mb-3 transition-all duration-300
        ${borderColor} ${bgColor} hover:shadow-md rounded-r-lg
        ${isStacked ? 'shadow-sm' : ''}
      `}
      initial={false}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${author}`} alt="avatar" />
          </div>
          <span className="text-xs font-medium text-gray-600">{author}</span>
        </div>
        <div className="flex gap-1">
          <div className={`w-12 h-1 rounded-full ${type === 'pro' ? 'bg-emerald-200' : 'bg-rose-200'}`}>
            <motion.div 
              className={`h-full rounded-full ${type === 'pro' ? 'bg-emerald-500' : 'bg-rose-500'}`}
              initial={{ width: "60%" }}
              animate={{ width: "85%" }}
            />
          </div>
        </div>
      </div>

      <p className={`text-sm text-gray-800 leading-relaxed ${!isExpanded && 'line-clamp-2'}`}>
        {text}
      </p>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-gray-100"
          >
            <p className="text-sm text-gray-600 mb-4">
              Допълнителен контекст и детайли по този аргумент. Тук се изобразява пълният текст и нужните нови елементи, както беше поискано.
            </p>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-black transition-colors">
                <MessageCircle size={14} /> Отговор
              </button>
              <button className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-black transition-colors">
                <ThumbsUp size={14} /> Подкрепа
              </button>
              <button className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-black transition-colors">
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